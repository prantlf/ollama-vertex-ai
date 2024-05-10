import { useAccessToken, refreshAccessToken } from './login.js'
import { sendJSON } from './request.js'
import { account, apiLocation, apiEndpoint } from '../util/defaults.js'

// function formatDuration(duration) {
//   let unit
//   if (duration >= 1000000000) {
//     duration /= 1000000000
//     unit = 's'
//   } else if (duration >= 1000000) {
//     duration /= 1000000
//     unit = 'ms'
//   } else if (duration >= 1000) {
//     duration /= 1000
//     unit = 'us'
//   } else {
//     unit = 'ns'
//   }
//   return +duration.toFixed(3) + unit
// }

export function convertOptions(defaults, options = {}) {
  return {
    maxOutputTokens: options.num_predict ?? defaults.maxOutputTokens,
    temperature: options.temperature ?? defaults.temperature,
    topP: options.top_p ?? defaults.topP,
    topK: options.top_k ?? defaults.topK
  }
}

export async function forwardRequest(urlSuffix, body) {
  const url = `https://${apiEndpoint}/v1/projects/${account.project_id}/locations/${apiLocation}/publishers/google/models/${urlSuffix}`
  let { accessToken, accessType } = await useAccessToken(account)

  let data
  let duration
  const forwardRequest = async () => {
    const start = performance.now()
    data = await sendJSON('POST', url, body, {
      Authorization: `${accessType} ${accessToken}`
    })
    duration = Math.round((performance.now() - start) * 1000000)
  }

  try {
    await forwardRequest()
  } catch (err) {
    if (err.status === 401) {
      ({ accessToken, accessType } = await refreshAccessToken(account))
      await forwardRequest()
    } else {
      throw err
    }
  }

  return { data, duration }
}
