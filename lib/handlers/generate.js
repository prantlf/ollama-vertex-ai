import { forwardRequest } from '../net/forwarder.js'
import { wrongInput } from '../net/request.js'
import { log } from '../util/log.js'
import { geminiDefaults, bisonDefaults } from '../util/defaults.js'

function convertOptions(defaults, options = {}) {
  return {
    maxOutputTokens: options.num_predict ?? defaults.maxOutputTokens,
    temperature: options.temperature ?? defaults.temperature,
    topP: options.top_p ?? defaults.topP,
    topK: options.top_k ?? defaults.topK
  }
}

const geminiHandler = {
  prepareBody(model, prompt, options) {
    return {
      urlSuffix: `${model}:generateContent`,
      body: {
        ...geminiDefaults,
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: convertOptions(geminiDefaults.generationConfig, options),
        safetySettings: geminiDefaults.safetySettings
      }
    }
  },
  extractResponse(data) {
    const { promptTokenCount, candidatesTokenCount } = data.usageMetadata
    return {
      content: data.candidates?.[0]?.content.parts?.[0]?.text,
      promptTokens: promptTokenCount,
      contentTokens: candidatesTokenCount
    }
  }
}

const bisonHandler = {
  prepareBody(model, prompt, options) {
    return {
      urlSuffix: `${model}:predict`,
      body: {
        ...bisonDefaults,
        instances: [{ prompt }],
        parameters: convertOptions(bisonDefaults.parameters, options)
      }
    }
  },
  extractResponse(data) {
    const { inputTokenCount, outputTokenCount } = data.metadata.tokenMetadata
    return {
      content: data.predictions?.[0]?.content,
      promptTokens: inputTokenCount.totalTokens,
      contentTokens: outputTokenCount.totalTokens
    }
  }
}

export default async function handleGenerate(req) {
  const inputText = await req.text()
  const input = JSON.parse(inputText) // await req.json()
  if (!(input && typeof input === 'object')) {
    wrongInput(`Invalid chat payload "${typeof input}"`)
  }
  const { model, prompt, stream, options } = input
  if (typeof model !== 'string') {
    wrongInput(`Invalid chat model "${model}"`)
  }
  if (!prompt) {
    wrongInput('Prompt missing')
  }
  const modelHandler = model.startsWith('gemini')
    ? geminiHandler
    : model.startsWith('text-bison')
      ? bisonHandler
      : wrongInput(`Unrecognised model "${model}"`)
  if (stream !== false) {
    wrongInput('Streaming not supported')
  }
  if (!(options === undefined || (options && typeof options === 'object' && !Array.isArray(options)))) {
    wrongInput('Invalid options')
  }
  log('> generate from %d character%s using %s', prompt.length,
    prompt.length === 1 ? '' : 's', model)

  const { urlSuffix, body } = modelHandler.prepareBody(model, prompt, options)
  const { data, duration } = await forwardRequest(urlSuffix, body)
  const { content, promptTokens, contentTokens } = modelHandler.extractResponse(data)
  const tokens = promptTokens + contentTokens
  log('< result by %s with %d character%s and %d token%s', model, content.length,
    content.length === 1 ? '' : 's', tokens, tokens === 1 ? '' : 's')
  const promptDuration = Math.round(duration / 4)
  return {
    model,
    created_at: new Date().toISOString(),
    response: content,
    done: true,
    total_duration: duration,
    load_duration: 0,
    prompt_eval_count: promptTokens,
    prompt_eval_duration: promptDuration,
    eval_count: contentTokens,
    eval_duration: duration - promptDuration
  }
}
