/**
 * src/routes/health.js
 * Health-check endpoints — used by load balancers, Docker, and the frontend
 * status page to verify all services are reachable.
 */
const express = require('express')
const axios   = require('axios')
const mongoose = require('mongoose')

const router = express.Router()

// GET /api/health
router.get('/health', async (_req, res) => {
  const dbState = mongoose.connection.readyState
  const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }

  res.json({
    success:   true,
    service:   'hackforge-backend',
    message:   'Backend is healthy 🟢',
    timestamp: new Date().toISOString(),
    database:  dbStatusMap[dbState] ?? 'unknown',
    env:       process.env.NODE_ENV || 'development',
  })
})

// GET /api/ai/health  — proxy check: backend → AI service
router.get('/ai/health', async (_req, res) => {
  const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'

  try {
    const { data } = await axios.get(`${aiUrl}/health`, { timeout: 4_000 })
    res.json({
      success:  true,
      message:  'AI service reachable 🟢',
      aiStatus: data,
    })
  } catch (err) {
    res.status(502).json({
      success:  false,
      message:  'AI service unreachable 🔴',
      error:    err.message,
      aiUrl,
    })
  }
})

module.exports = router
