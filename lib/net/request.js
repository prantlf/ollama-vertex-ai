import { net } from '../util/log.js'

export function wrongInput(message) {
  const err = new Error(message)
  err.status = 400
  err.text = message
  throw err
}

export function sendForm(method, url, body, headers) {
  return sendRequest(method, url, new URLSearchParams(body).toString(), {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...headers
  })
}

export function sendJSON(method, url, body, headers) {
  return sendRequest(method, url, JSON.stringify(body), {
    'Content-Type': 'application/json',
    ...headers
  })
}

export async function sendRequest(method, url, body, headers) {
  if (body) {
    net('send %s %s\n with body %O', method, url, body)
  } else {
    net('send %s %s', method, url)
  }
  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...headers
    },
    body
  })
  const { status, statusText } = res
  const text = await res.text()
  const createError = json => {
    const err = new Error(`${method} ${url}\n${status}: ${text || statusText}`)
    err.status = method
    err.url = url
    err.status = status
    err.statusText = statusText
    err.responseText = text
    err.responseJSON = json
    return err
  }
  if (!res.ok) {
    let json
    if (text) {
      try {
        json = await JSON.parse(text)
      } catch {}
    }
    if (json) {
      net('receive %d: %s %s\n and body %O', status, method, url, json)
    } else if (text) {
      net('receive %d: %s %s\n and body %s', status, method, url, text)
    } else {
      net('receive %d: %s %s', status, method, url)
    }
    throw createError(json)
  }
  if (!text) {
    net('receive %d: %s %s', status, method, url)
    const size = +(res.headers.get('content-length') || '0')
    if (!size && status >= 201 && status <= 204) return null
    throw createError()
  }
  try {
    const json = await JSON.parse(text)
    net('receive %d: %s %s\n with response %O', status, method, url, json)
    return json
  } catch ({ message }) {
    net('receive %d: %s %s\n with response %s', status, method, url, text)
    throw createError()
  }
}
