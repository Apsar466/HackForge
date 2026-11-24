/**
 * ==============================================================================
 * GOOGLE CLOUD SERVICE ACCOUNT & GOOGLE SHEETS SETUP INSTRUCTIONS
 * ==============================================================================
 * 
 * To connect HackForge to your Google Forms / Google Sheets:
 * 
 * 1. CREATE A GOOGLE CLOUD PROJECT & SERVICE ACCOUNT:
 *    a. Go to Google Cloud Console: https://console.cloud.google.com/
 *    b. Create a new project (e.g., "HackForge-Integration").
 *    c. Go to "APIs & Services" > "Library".
 *    d. Search for "Google Sheets API" and click "Enable".
 *    e. Go to "APIs & Services" > "Credentials".
 *    f. Click "+ CREATE CREDENTIALS" -> "Service Account".
 *    g. Enter a Service account name (e.g. "hackforge-sheets-reader").
 *    h. Click "CREATE AND CONTINUE", then click "DONE".
 * 
 * 2. GENERATE SERVICE ACCOUNT JSON KEY:
 *    a. Click on your newly created Service Account email in the list.
 *    b. Navigate to the "KEYS" tab at the top.
 *    c. Click "ADD KEY" -> "Create new key".
 *    d. Choose "JSON" as the key type and click "CREATE".
 *    e. Save the downloaded JSON file into your backend directory (e.g. at `./credentials/google-service-account.json`).
 *       Make sure NOT to commit this file to public git repositories!
 * 
 * 3. SHARE GOOGLE SHEETS WITH SERVICE ACCOUNT EMAIL:
 *    a. Copy the service account email address (looks like:
 *       hackforge-sheets-reader@your-project-id.iam.gserviceaccount.com).
 *    b. Open your Google Sheet(s) (Form Responses 1 for Participant Registration & Pitch Submission).
 *    c. Click the "Share" button at the top-right corner of the sheet.
 *    d. Paste the service account email, select "Viewer" access, and click "Send".
 * 
 * 4. UPDATE YOUR BACKEND `.env` FILE:
 *    Add the following environment variables to `backend/.env`:
 * 
 *    GOOGLE_SERVICE_ACCOUNT_KEY=./credentials/google-service-account.json
 *    SPREADSHEET_ID_REGISTRATION=your_registration_spreadsheet_id_here
 *    SPREADSHEET_ID_SUBMISSION=your_submission_spreadsheet_id_here
 * 
 *    Note: The Spreadsheet ID is found in the Sheet URL:
 *    https://docs.google.com/spreadsheets/d/<THIS_IS_THE_SPREADSHEET_ID>/edit
 * 
 * ==============================================================================
 */

const { google } = require('googleapis')
const path = require('path')
const fs = require('fs')
const sheetsConfig = require('../config/sheetsConfig')

/**
 * Helper to initialize Google Auth using Service Account key file or raw JSON content.
 */
function getGoogleAuth() {
  const keyPathOrJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || sheetsConfig.GOOGLE_SERVICE_ACCOUNT_KEY

  if (!keyPathOrJson) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY is not defined. Set path to key file or JSON string in .env file.'
    )
  }

  const authOptions = {
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  }

  const trimmedKey = keyPathOrJson.trim()
  if (trimmedKey.startsWith('{')) {
    authOptions.credentials = JSON.parse(trimmedKey)
  } else {
    const resolvedPath = path.isAbsolute(trimmedKey)
      ? trimmedKey
      : path.resolve(process.cwd(), trimmedKey)

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Google Service Account key file not found at path: ${resolvedPath}`)
    }
    authOptions.keyFile = resolvedPath
  }

  return new google.auth.GoogleAuth(authOptions)
}

/**
 * Parses simple CSV content into an array of row arrays.
 */
function parseCsvRows(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0)
  return lines.map((line) => {
    const values = []
    let inQuotes = false
    let currentVal = ''
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(currentVal.trim())
        currentVal = ''
      } else {
        currentVal += char
      }
    }
    values.push(currentVal.trim())
    return values
  })
}

/**
 * Fallback loader for sample registration data CSV.
 */
function getSampleRegistrationsFallback() {
  const samplePath = path.resolve(process.cwd(), 'credentials/sample_registrations.csv')
  if (fs.existsSync(samplePath)) {
    console.log('[GoogleSheetsService] Using local sample_registrations.csv fallback for testing')
    const content = fs.readFileSync(samplePath, 'utf8')
    const rows = parseCsvRows(content)
    if (rows.length <= 1) return []

    const dataRows = rows.slice(1)
    return dataRows.map((row) => ({
      name: (row[1] || row[0] || '').trim(),
      email: (row[2] || row[1] || '').trim(),
      skills: (row[3] || '').split(',').map((s) => s.trim()).filter(Boolean),
      experienceLevel: (row[4] || 'intermediate').trim(),
    })).filter((r) => r.name || r.email)
  }
  return []
}

/**
 * Fallback loader for sample submission data CSV.
 * Expected columns (Google Form output order):
 *   0: Timestamp | 1: Team Name | 2: Team Members | 3: Team Leader Email
 *   4: GitHub Repo URL | 5: Pitch Description
 */
function getSampleSubmissionsFallback() {
  const samplePath = path.resolve(process.cwd(), 'credentials/sample_submissions.csv')
  if (fs.existsSync(samplePath)) {
    console.log('[GoogleSheetsService] Using local sample_submissions.csv fallback for testing')
    const content = fs.readFileSync(samplePath, 'utf8')
    const rows = parseCsvRows(content)
    if (rows.length <= 1) return []

    const dataRows = rows.slice(1)
    return dataRows
      .map((row) => {
        const rawMembers = (row[2] || '').trim()
        return {
          submittedAt: (row[0] || new Date().toISOString()).trim(),
          teamName: (row[1] || '').trim(),
          teamMembers: rawMembers ? rawMembers.split(',').map((m) => m.trim()).filter(Boolean) : [],
          teamLeaderEmail: (row[3] || '').trim(),
          githubRepoUrl: (row[4] || '').trim(),
          pitchDescription: (row[5] || '').trim(),
        }
      })
      .filter((s) => s.teamName || s.githubRepoUrl || s.pitchDescription)
  }
  return []
}

/**
 * Helper to extract raw Spreadsheet ID from either a full Google Sheet URL or raw ID string.
 */
function extractSpreadsheetId(idOrUrl) {
  if (!idOrUrl) return ''
  const match = idOrUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
  if (match) return match[1]
  return idOrUrl.trim()
}

let runtimeRegistrationSheetId = null
let runtimeSubmissionSheetId = null

function setRegistrationSheetId(idOrUrl) {
  runtimeRegistrationSheetId = extractSpreadsheetId(idOrUrl)
  return runtimeRegistrationSheetId
}

function setSubmissionSheetId(idOrUrl) {
  runtimeSubmissionSheetId = extractSpreadsheetId(idOrUrl)
  return runtimeSubmissionSheetId
}

/**
 * Attempts to fetch a public Google Sheet via direct CSV export endpoint.
 */
async function fetchPublicSheetCsv(spreadsheetId) {
  const axios = require('axios')
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`
  const res = await axios.get(csvUrl, { timeout: 10000 })
  return parseCsvRows(res.data)
}

/**
 * Fetch all participant registrations from Google Sheet (or local sample fallback).
 * Reads rows and maps them to: { name, email, skills: [string], experienceLevel }
 *
 * @param {string} [spreadsheetIdOverride]
 * @returns {Promise<Array<{name: string, email: string, skills: string[], experienceLevel: string}>>}
 */
async function getRegistrations(spreadsheetIdOverride) {
  const rawId = spreadsheetIdOverride || runtimeRegistrationSheetId || process.env.SPREADSHEET_ID_REGISTRATION || sheetsConfig.SPREADSHEET_ID_REGISTRATION
  const spreadsheetId = extractSpreadsheetId(rawId)

  // Use local CSV fallback if spreadsheet ID is placeholder or missing
  if (!spreadsheetId || spreadsheetId.includes('your_registration_spreadsheet_id')) {
    return getSampleRegistrationsFallback()
  }

  let rows = null

  // 1. Try official Service Account API first
  try {
    const auth = getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:Z',
    })
    rows = response.data.values
  } catch (apiErr) {
    console.warn(`[GoogleSheetsService] Service Account API fetch failed (${apiErr.message}). Trying public CSV fetch...`)
    // 2. Fallback to public CSV export endpoint
    try {
      rows = await fetchPublicSheetCsv(spreadsheetId)
    } catch (csvErr) {
      console.warn(`[GoogleSheetsService] Public CSV fetch failed (${csvErr.message}). Falling back to sample CSV.`)
      return getSampleRegistrationsFallback()
    }
  }

  if (!rows || rows.length <= 1) {
    return []
  }

  const headers = rows[0].map((h) => String(h).trim().toLowerCase())

  let nameIdx = headers.findIndex((h) => h.includes('name'))
  let emailIdx = headers.findIndex((h) => h.includes('email'))
  let skillsIdx = headers.findIndex((h) => h.includes('skill'))
  let expIdx = headers.findIndex((h) => h.includes('experience') || h.includes('level'))

  if (nameIdx === -1) nameIdx = 1
  if (emailIdx === -1) emailIdx = 2
  if (skillsIdx === -1) skillsIdx = 3
  if (expIdx === -1) expIdx = 4

  const dataRows = rows.slice(1)

  return dataRows
    .map((row) => {
      const name = (row[nameIdx] || row[0] || '').trim()
      const email = (row[emailIdx] || row[1] || '').trim()

      const rawSkills = (row[skillsIdx] || '').trim()
      const skills = rawSkills
        ? rawSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : []

      const experienceLevel = (row[expIdx] || 'intermediate').trim()

      return {
        name,
        email,
        skills,
        experienceLevel,
      }
    })
    .filter((entry) => entry.name || entry.email)
}

/**
 * Fetch all project/pitch submissions from Google Sheet (or local sample fallback).
 * Reads rows and maps them to:
 *   { teamName, teamMembers: [string], teamLeaderEmail, githubRepoUrl, pitchDescription, submittedAt }
 *
 * The header detection is flexible — it matches Google Forms default column names:
 *   "Timestamp", "Team Name", "Team Members", "Team Leader Email",
 *   "GitHub Repo URL", "Pitch Description"
 *
 * @param {string} [spreadsheetIdOverride]
 * @returns {Promise<Array<{
 *   teamName: string,
 *   teamMembers: string[],
 *   teamLeaderEmail: string,
 *   githubRepoUrl: string,
 *   pitchDescription: string,
 *   submittedAt: string
 * }>>}
 */
async function getSubmissions(spreadsheetIdOverride) {
  const rawId = spreadsheetIdOverride || runtimeSubmissionSheetId || process.env.SPREADSHEET_ID_SUBMISSION || sheetsConfig.SPREADSHEET_ID_SUBMISSION
  const spreadsheetId = extractSpreadsheetId(rawId)

  if (!spreadsheetId || spreadsheetId.includes('your_submission_spreadsheet_id')) {
    return getSampleSubmissionsFallback()
  }

  let rows = null

  try {
    const auth = getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:Z',
    })
    rows = response.data.values
  } catch (apiErr) {
    console.warn(`[GoogleSheetsService] API fetch failed (${apiErr.message}). Trying public CSV fetch...`)
    try {
      rows = await fetchPublicSheetCsv(spreadsheetId)
    } catch (csvErr) {
      console.warn(`[GoogleSheetsService] Public CSV fetch failed (${csvErr.message}). Falling back to sample data.`)
      return getSampleSubmissionsFallback()
    }
  }

  if (!rows || rows.length <= 1) {
    return []
  }

  const headers = rows[0].map((h) => String(h).trim().toLowerCase())

  // Flexible header resolution — matches Google Forms default field names
  let timeIdx = headers.findIndex((h) => h.includes('timestamp') || h.includes('date') || h.includes('time') || h.includes('submitted'))
  let teamIdx = headers.findIndex((h) => h.includes('team name') || h.includes('project name') || h.includes('team'))
  let membersIdx = headers.findIndex((h) => h.includes('member') || h.includes('teammates'))
  let leaderIdx = headers.findIndex((h) => h.includes('leader') || h.includes('contact email') || h.includes('leader email'))
  let repoIdx = headers.findIndex((h) => h.includes('github') || h.includes('repo') || h.includes('url') || h.includes('link'))
  let pitchIdx = headers.findIndex((h) => h.includes('pitch') || h.includes('description') || h.includes('summary') || h.includes('details'))

  // Positional fallbacks matching expected Google Form column order
  if (timeIdx === -1) timeIdx = 0
  if (teamIdx === -1) teamIdx = 1
  if (membersIdx === -1) membersIdx = 2
  if (leaderIdx === -1) leaderIdx = 3
  if (repoIdx === -1) repoIdx = 4
  if (pitchIdx === -1) pitchIdx = 5

  const dataRows = rows.slice(1)

  return dataRows
    .map((row) => {
      const submittedAt = (row[timeIdx] || new Date().toISOString()).trim()
      const teamName = (row[teamIdx] || '').trim()

      const rawMembers = (row[membersIdx] || '').trim()
      const teamMembers = rawMembers
        ? rawMembers.split(',').map((m) => m.trim()).filter(Boolean)
        : []

      const teamLeaderEmail = (row[leaderIdx] || '').trim()
      const githubRepoUrl = (row[repoIdx] || '').trim()
      const pitchDescription = (row[pitchIdx] || '').trim()

      return {
        teamName,
        teamMembers,
        teamLeaderEmail,
        githubRepoUrl,
        pitchDescription,
        submittedAt,
      }
    })
    .filter((entry) => entry.teamName || entry.githubRepoUrl || entry.pitchDescription)
}

module.exports = {
  getRegistrations,
  getSubmissions,
  extractSpreadsheetId,
  setRegistrationSheetId,
  setSubmissionSheetId,
}
