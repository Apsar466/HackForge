/**
 * server.js — entry point
 * Connects to MongoDB then starts the HTTP server.
 */
require('dotenv').config()
const app = require('./app')
const connectDB = require('./src/config/db')
const sheetSyncWorker = require('./src/services/sheetSyncWorker')

const PORT = process.env.PORT || 4000

async function start() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`🔥 HackForge backend running on http://localhost:${PORT}`)
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`)
    console.log(`   AI Service  : ${process.env.AI_SERVICE_URL || 'http://localhost:8000'}`)
    
    // Start Google Sheets background sync worker
    sheetSyncWorker.startWorker()
  })
}

start().catch((err) => {
  console.error('❌ Failed to start server:', err.message)
  process.exit(1)
})
