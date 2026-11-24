/**
 * src/config/sheetsConfig.js
 * Configuration for Google Sheets Integration.
 */

module.exports = {
  SPREADSHEET_ID_REGISTRATION: process.env.SPREADSHEET_ID_REGISTRATION || '',
  SPREADSHEET_ID_SUBMISSION: process.env.SPREADSHEET_ID_SUBMISSION || '',
  GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
}
