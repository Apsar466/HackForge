/**
 * app.js — Express application factory.
 */
require('express-async-errors')
const express = require('express')
const cors    = require('cors')
const helmet  = require('helmet')
const morgan  = require('morgan')

const healthRouter      = require('./src/routes/health')
const authRouter        = require('./src/routes/auth')
const eventRouter       = require('./src/routes/events')
const teamRouter        = require('./src/routes/teams')
const projectRouter     = require('./src/routes/projects')
const leaderboardRouter = require('./src/routes/leaderboard')
const syncRouter        = require('./src/routes/sync')
const realtimeRouter    = require('./src/routes/realtime')
const errorHandler      = require('./src/middleware/errorHandler')

const app = express()

// ── Security & Utilities ──────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/events', eventRouter)
app.use('/api/teams', teamRouter)
app.use('/api/projects', projectRouter)
app.use('/api/leaderboard', leaderboardRouter)
app.use('/sync', syncRouter)
app.use('/api/sync', syncRouter)
app.use('/api/realtime', realtimeRouter)
app.use('/realtime', realtimeRouter)

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler)

module.exports = app
