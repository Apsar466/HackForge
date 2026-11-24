/**
 * src/services/sseService.js
 * Server-Sent Events (SSE) real-time event broadcaster for HackForge.
 * Enables zero-dependency live updates across Admin, Leaderboard, Judge, and Participant UIs.
 */

let clients = []

/**
 * Register a new client SSE HTTP connection.
 */
function addClient(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  const clientId = Date.now() + '_' + Math.random().toString(36).substring(2, 9)

  // Send initial heartbeat handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clientId, timestamp: new Date().toISOString() })}\n\n`)

  const newClient = { id: clientId, res }
  clients.push(newClient)

  console.log(`[Realtime SSE] Client connected (${clientId}). Active listeners: ${clients.length}`)

  // Heartbeat to keep connection alive every 25 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(`:ping ${new Date().toISOString()}\n\n`)
    } catch {
      clearInterval(heartbeat)
    }
  }, 25000)

  req.on('close', () => {
    clearInterval(heartbeat)
    clients = clients.filter((c) => c.id !== clientId)
    console.log(`[Realtime SSE] Client disconnected (${clientId}). Active listeners: ${clients.length}`)
  })
}

/**
 * Broadcast an event to all connected clients.
 * @param {string} eventType - e.g. 'sync_update', 'teams_updated', 'score_updated', 'project_evaluated'
 * @param {object} payload - Data payload sent to clients
 */
function broadcastEvent(eventType, payload = {}) {
  const data = JSON.stringify({
    eventType,
    timestamp: new Date().toISOString(),
    ...payload,
  })
  const sseMessage = `event: ${eventType}\ndata: ${data}\n\n`

  let activeCount = 0
  clients.forEach((client) => {
    try {
      client.res.write(sseMessage)
      activeCount++
    } catch (err) {
      // client disconnected
    }
  })

  if (activeCount > 0) {
    console.log(`[Realtime SSE] Broadcast event '${eventType}' to ${activeCount} client(s).`)
  }
}

/**
 * Returns current connected client count.
 */
function getConnectedClientsCount() {
  return clients.length
}

module.exports = {
  addClient,
  broadcastEvent,
  getConnectedClientsCount,
}
