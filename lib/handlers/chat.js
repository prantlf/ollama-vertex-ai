import forwardRequest from '../net/forwarder.js'
import { log } from '../util/log.js'
import { geminiDefaults, bisonDefaults } from '../util/defaults.js'

function convertOptions(options = {}) {
  return {
    maxOutputTokens: options.num_predict,
    temperature: options.temperature,
    topP: options.top_p,
    topK: options.top_k
  }
}

const geminiRoles = {
  user: 'user',
  assistant: 'model'
}

const geminiHandler = {
  prepareBody(model, messages, options) {
    const systemMessages = []; const chatMessages = []
    for (const message of messages) {
      if (!(message && typeof message === 'object')) {
        wrongInput(`Invalid chat message "${typeof input}"`)
      }
      const { role, content } = message
      if (typeof content !== 'string') {
        wrongInput(`Invalid chat message content "${content}"`)
      }
      if (role === 'system') {
        systemMessages.push({ text: content })
      } else {
        const newRole = geminiRoles[role]
        if (!newRole) {
          wrongInput(`Invalid chat message role "${role}"`)
        }
        chatMessages.push({
          role: newRole,
          parts: [{ text: content }]
        })
      }
    }
    chatMessages[0].parts.unshift(...systemMessages)
    const generationConfig = convertOptions(options)
    return {
      urlSuffix: `${model}:generateContent`,
      body: {
        ...geminiDefaults,
        contents: chatMessages,
        generationConfig: {
          ...bisonDefaults.generationConfig,
          ...generationConfig
        }
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

const bisonAuthors = {
  user: 'user',
  assistant: 'bot'
}

const bisonHandler = {
  prepareBody(model, messages, options) {
    const systemMessages = []; const chatMessages = []
    for (const message of messages) {
      if (!(message && typeof message === 'object')) {
        wrongInput(`Invalid chat message "${typeof input}"`)
      }
      const { role, content } = message
      if (typeof content !== 'string') {
        wrongInput(`Invalid chat message content "${content}"`)
      }
      if (role === 'system') {
        systemMessages.push(content)
      } else {
        const author = bisonAuthors[role]
        if (!author) {
          wrongInput(`Invalid chat message role "${role}"`)
        }
        chatMessages.push({ author, content })
      }
    }
    const parameters = convertOptions(options)
    return {
      urlSuffix: `${model}:predict`,
      body: {
        ...bisonDefaults,
        instances: [
          {
            context: systemMessages.join('\n'),
            examples: [],
            messages: chatMessages
          }
        ],
        parameters: {
          ...bisonDefaults.parameters,
          ...parameters
        }
      }
    }
  },
  extractResponse(data) {
    const { inputTokenCount, outputTokenCount } = data.metadata.tokenMetadata
    return {
      content: data.predictions?.[0]?.candidates?.[0]?.content,
      promptTokens: inputTokenCount.totalTokens,
      contentTokens: outputTokenCount.totalTokens
    }
  }
}

function wrongInput(message) {
  const err = new Error(message)
  err.status = 400
  throw err
}

export default async function handleChat(req) {
  const input = await req.json()
  if (!(input && typeof input === 'object')) {
    wrongInput(`Invalid chat payload "${typeof input}"`)
  }
  const { model, messages, stream, options } = input
  if (typeof model !== 'string') {
    wrongInput(`Invalid chat model "${model}"`)
  }
  const modelHandler = model.startsWith('gemini')
    ? geminiHandler
    : model.startsWith('chat-bison')
      ? bisonHandler
      : wrongInput(`Unrecognised model "${model}"`)
  if (!messages?.length) {
    wrongInput('Chat messages missing')
  }
  if (stream !== false) {
    wrongInput('Streaming not supported')
  }
  if (!(options === undefined || (options && typeof options === 'object' && !Array.isArray(options)))) {
    wrongInput('Invalid options')
  }
  const { urlSuffix, body } = modelHandler.prepareBody(model, messages, options)
  log('> ask with %d message%s using %s%s', messages.length,
    messages.length === 1 ? '' : 's', model, options ? ' customised' : '')

  const { data, duration } = await forwardRequest(urlSuffix, body)
  const { content, promptTokens, contentTokens } = modelHandler.extractResponse(data)
  const tokens = promptTokens + contentTokens
  log('< answer by %s with %d character%s and %d token%s', model, content.length,
    content.length === 1 ? '' : 's', tokens, tokens === 1 ? '' : 's')
  const promptDuration = Math.round(duration / 4)
  return {
    model,
    created_at: new Date().toISOString(),
    message: {
      role: 'assistant',
      content
    },
    done: true,
    total_duration: duration,
    load_duration: 0,
    prompt_eval_count: promptTokens,
    prompt_eval_duration: promptDuration,
    eval_count: contentTokens,
    eval_duration: duration - promptDuration
  }
}
