/**
 * src/routes/realtime.js
 * Express router for real-time Server-Sent Events stream & status.
 */
const express = require('express')
const sseService = require('../services/sseService')

const router = express.Router()

// GET /api/realtime/stream — SSE endpoint for real-time live events
router.get('/stream', (req, res) => {
  sseService.addClient(req, res)
})

// GET /api/realtime/status — Check active real-time client count
router.get('/status', (_req, res) => {
  res.json({
    success: true,
    activeClients: sseService.getConnectedClientsCount(),
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
