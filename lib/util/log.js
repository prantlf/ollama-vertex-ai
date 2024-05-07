import debug from 'debug'

const logSpace = 'ovai'
const srvSpace = 'ovai:srv'
const netSpace = 'ovai:net'
const log = debug(logSpace)
const srv = debug(srvSpace)
const net = debug(netSpace)

log.inspectOpts.depth = srv.inspectOpts.depth = net.inspectOpts.depth = null
if (!process.env.DEBUG) debug.enable(logSpace)

log.enabled = debug.enabled(logSpace)
srv.enabled = debug.enabled(srvSpace)
net.enabled = debug.enabled(netSpace)

export { log, srv, net }
