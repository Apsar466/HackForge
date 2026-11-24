/**
 * src/routes/sync.js
 * Routes for Google Sheets data synchronization.
 */
const express = require('express')
const {
  syncRegistrations,
  syncSubmissions,
  triggerSyncRun,
  getSyncStatus,
} = require('../controllers/syncController')

const router = express.Router()

// GET & POST /sync/registrations & /sync/submissions
router.get('/registrations', syncRegistrations)
router.post('/registrations', syncRegistrations)
router.get('/submissions', syncSubmissions)
router.post('/submissions', syncSubmissions)

// POST /sync/config
const { updateSyncConfig } = require('../controllers/syncController')
router.post('/config', updateSyncConfig)

// POST /sync/run & GET /sync/status
router.post('/run', triggerSyncRun)
router.get('/status', getSyncStatus)

module.exports = router
