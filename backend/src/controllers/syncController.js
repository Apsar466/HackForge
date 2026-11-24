/**
 * src/controllers/syncController.js
 * Controller for Google Sheets synchronization endpoints.
 */
const googleSheetsService = require('../services/googleSheetsService')
const sheetSyncWorker = require('../services/sheetSyncWorker')

/**
 * GET or POST /sync/registrations
 * Fetches live participant registrations from Google Sheets.
 */
async function syncRegistrations(req, res) {
  try {
    const override = req.body?.sheetUrl || req.body?.spreadsheetId || req.query?.spreadsheetId
    if (override) {
      googleSheetsService.setRegistrationSheetId(override)
    }
    const data = await googleSheetsService.getRegistrations(override)
    return res.json({
      success: true,
      message: `Successfully fetched ${data.length} registration(s) from Google Sheets.`,
      count: data.length,
      data,
    })
  } catch (err) {
    console.error('[Sync Error] Failed to fetch registrations:', err.message)
    return res.status(500).json({
      success: false,
      message: `Google Sheets registration sync failed: ${err.message}`,
      error: err.message,
    })
  }
}

/**
 * GET or POST /sync/submissions
 * Fetches live project submissions from Google Sheets.
 */
async function syncSubmissions(req, res) {
  try {
    const override = req.body?.sheetUrl || req.body?.spreadsheetId || req.query?.spreadsheetId
    if (override) {
      googleSheetsService.setSubmissionSheetId(override)
    }
    const data = await googleSheetsService.getSubmissions(override)
    return res.json({
      success: true,
      message: `Successfully fetched ${data.length} submission(s) from Google Sheets.`,
      count: data.length,
      data,
    })
  } catch (err) {
    console.error('[Sync Error] Failed to fetch submissions:', err.message)
    return res.status(500).json({
      success: false,
      message: `Google Sheets submission sync failed: ${err.message}`,
      error: err.message,
    })
  }
}

/**
 * POST /sync/config
 * Updates the active registration and submission spreadsheet IDs.
 */
function updateSyncConfig(req, res) {
  const { registrationSheetUrl, registrationSheetId, submissionSheetUrl, submissionSheetId } = req.body || {}
  
  let regId = null
  let subId = null

  if (registrationSheetUrl || registrationSheetId) {
    regId = googleSheetsService.setRegistrationSheetId(registrationSheetUrl || registrationSheetId)
  }
  if (submissionSheetUrl || submissionSheetId) {
    subId = googleSheetsService.setSubmissionSheetId(submissionSheetUrl || submissionSheetId)
  }

  return res.json({
    success: true,
    message: 'Google Sheets sync configuration updated successfully.',
    config: {
      registrationSheetId: regId,
      submissionSheetId: subId,
    }
  })
}

/**
 * POST /sync/run
 * Manually triggers an immediate background sync cycle to MongoDB.
 */
async function triggerSyncRun(req, res) {
  try {
    const status = await sheetSyncWorker.performFullSync()
    return res.json({
      success: status.status === 'success',
      message: status.status === 'success'
        ? 'Google Sheets background sync completed successfully'
        : 'Google Sheets sync finished with status: ' + status.status,
      status,
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger sync run: ' + err.message,
    })
  }
}

/**
 * GET /sync/status
 * Returns background sync status and last run metrics.
 */
function getSyncStatus(req, res) {
  return res.json({
    success: true,
    status: sheetSyncWorker.getSyncStatus(),
  })
}

module.exports = {
  syncRegistrations,
  syncSubmissions,
  updateSyncConfig,
  triggerSyncRun,
  getSyncStatus,
}
