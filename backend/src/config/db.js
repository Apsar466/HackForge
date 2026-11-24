/**
 * src/config/db.js
 * Mongoose connection helper — called once at startup.
 */
const mongoose = require('mongoose')

async function connectDB() {
  const uri = process.env.MONGO_URI

  if (!uri) {
    console.warn('⚠️  MONGO_URI not set — skipping database connection (scaffold mode)')
    return
  }

  try {
    await mongoose.connect(uri, {
      // These are the recommended options for Mongoose 7+
      serverSelectionTimeoutMS: 5_000,
    })
    console.log('✅ MongoDB connected:', mongoose.connection.host)
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message)
    // In production, exit so the process manager restarts the service.
    // In development, allow the app to start without a DB for UI work.
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}

module.exports = connectDB
