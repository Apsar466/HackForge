/**
 * scripts/seedGoogleSheetsSampleData.js
 * CLI script to trigger immediate sync of sample participant & submission data into MongoDB.
 *
 * Usage:
 *   node scripts/seedGoogleSheetsSampleData.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const connectDB = require('../src/config/db')
const sheetSyncWorker = require('../src/services/sheetSyncWorker')

async function main() {
  console.log('🚀 Connecting to MongoDB to seed sample Google Sheets data...')
  await connectDB()

  console.log('🔄 Executing full Google Sheets sync run...')
  const status = await sheetSyncWorker.performFullSync()

  console.log('\n======================================================')
  console.log('✅ Google Sheets Sync Run Completed!')
  console.log('------------------------------------------------------')
  console.log(`Status            : ${status.status}`)
  console.log(`New Users Added   : ${status.newUsersCount}`)
  console.log(`Users Updated     : ${status.updatedUsersCount}`)
  console.log(`New Projects Added: ${status.newProjectsCount}`)
  console.log(`Projects Updated  : ${status.updatedProjectsCount}`)
  if (status.errors && status.errors.length > 0) {
    console.log(`Errors            : ${status.errors.join(', ')}`)
  }
  console.log('======================================================\n')

  await mongoose.connection.close()
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Seeder script failed:', err.message)
  process.exit(1)
})
