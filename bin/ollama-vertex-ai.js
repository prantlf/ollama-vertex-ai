#!/usr/bin/env bun

import handleChat from '../lib/handlers/chat.js'
import handleEmbeddings from '../lib/handlers/embeddings.js'
import handleGenerate from '../lib/handlers/generate.js'
import { log, srv } from '../lib/util/log.js'
import { version } from '../package.json'

function respond(req, url, status, json) {
  srv('respond %d: %s %s', status, req.method, url.pathname)
  return Response.json(json, { status })
}

function fail(req, url, status, text, headers) {
  log('fail %d: %s %s', status, req.method, url.pathname)
  return new Response(text, { status, headers })
}

function disallowMethod(req, url) {
  return fail(req, url, 405, 'Not Allowed', { Allow: 'POST' })
}

const server = Bun.serve({
  port: +(process.env.PORT || 22434),
  async fetch(req) {
    let url
    try {
      url = new URL(req.url)
      srv('request %s %s', req.method, url.pathname)
      if (url.pathname === '/api/chat') {
        if (req.method === 'POST') {
          return respond(req, url, 200, await handleChat(req, url))
        }
        return disallowMethod(req, url)
      }
      if (url.pathname === '/api/generate') {
        if (req.method === 'POST') {
          return respond(req, url, 200, await handleGenerate(req, url))
        }
        return disallowMethod(req, url)
      }
      if (url.pathname === '/api/embeddings') {
        if (req.method === 'POST') {
          return respond(req, url, 200, await handleEmbeddings(req, url))
        }
        return disallowMethod(req, url)
      }
      if (url.pathname === '/api/ping') {
        if (req.method === 'GET' || req.method === 'HEAD') {
          log(': ping')
          return respond(req, url, 204)
        }
        return disallowMethod(req, url)
      }
      if (url.pathname === '/api/shutdown') {
        if (req.method === 'POST') {
          setTimeout(() => server.stop(), 100)
          log(': shutdown')
          return respond(req, url, 204)
        }
        return disallowMethod(req, url)
      }
      return fail(req, url, 404, 'Not Found')
    } catch (err) {
      err.req = req
      err.url = url
      throw err
    }
  },
  error(err) {
    const status = err.status || 500
    const json = err.status && {
      error: err.responseJSON?.error?.message || err.text || err.responseText
    }
    if (err.req && err.url) {
      if (json) {
        log('fail %d: %s %s\n%O', status, err.req.method, err.url.pathname, json)
      } else {
        log('fail %d: %s %s\n%s', status, err.req.method, err.url.pathname, err.stack)
      }
    } else {
      log('fail: %s', err.stack)
    }
    if (json) {
      return new Response(JSON.stringify(json), {
        status,
        statusText: err.statusText,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response('Internal error', { status })
  }
})

process.on('SIGTERM', () => {
  if (log.enabled) {
    log('stop the server')
  } else {
    process.stderr.write('Stopping …\n')
  }
  server.stop()
  process.exit(0)
})

if (log.enabled) {
  log('version %s runs in %s', version, process.cwd())
  log('listen on http://localhost:%d', server.port)
} else {
  process.stderr.write(`Listening on http://localhost:${server.port} …\n`)
}
