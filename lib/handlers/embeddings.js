import { forwardRequest } from '../net/forwarder.js'
import { wrongInput } from '../net/request.js'
import { log } from '../util/log.js'

// {
//   "instances": [
//     {
//       "task_type": "RETRIEVAL_DOCUMENT", // QUESTION_ANSWERING
//       "title": "document title",
//       "content": "I would like embeddings for this text!"
//     },
//   ]
// }

export default async function handleEmbeddings(req) {
  const input = await req.json()
  if (!(input && typeof input === 'object')) {
    wrongInput(`Invalid chat payload "${typeof input}"`)
  }
  const { model, prompt } = input
  if (typeof model !== 'string') {
    wrongInput(`Invalid chat model "${model}"`)
  }
  if (!prompt) {
    wrongInput('Prompt missing')
  }
  log('> vectorise %d character%s using %s', prompt.length,
    prompt.length === 1 ? '' : 's', model)

  const body = {
    instances: [{ content: prompt }]
  }
  const { data } = await forwardRequest(`${model}:predict`, body)
  const embeddings = data?.predictions?.[0]?.embeddings || {}
  const { values = [], statistics = {} } = embeddings
  const { token_count: tokens } = statistics
  log('< embedding by %s with %d float%s from %d token%s', model, values.length,
    values.length === 1 ? '' : 's', tokens, tokens === 1 ? '' : 's')
  return { embedding: values }
}
