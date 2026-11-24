/**
 * src/services/sheetSyncWorker.js
 * Automated background worker that syncs Google Sheets data into MongoDB.
 */

const { User, Event, Team, Project } = require('../models')
const googleSheetsService = require('./googleSheetsService')

let syncIntervalTimer = null
let isSyncRunning = false
let lastSyncStatus = {
  lastRunAt: null,
  status: 'idle',
  newUsersCount: 0,
  updatedUsersCount: 0,
  newProjectsCount: 0,
  updatedProjectsCount: 0,
  errors: [],
}

/**
 * Sync registration rows from Google Sheets into User documents in MongoDB.
 */
async function syncRegistrationsToDb() {
  const registrations = await googleSheetsService.getRegistrations()
  let newUsersCount = 0
  let updatedUsersCount = 0

  for (const reg of registrations) {
    if (!reg.email) continue

    let normalizedEmail = reg.email.toLowerCase().trim()
    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(normalizedEmail)) {
      // If the email field doesn't look like an email (e.g. sample column mismatch), synthesize a valid unique email
      const safeSlug = (reg.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '') || 'participant'
      normalizedEmail = `${safeSlug}.${Math.random().toString(36).substring(2, 7)}@hackforge.dev`
    }

    let user = await User.findOne({ email: normalizedEmail })

    // Normalize experience level to match enum ['beginner', 'intermediate', 'advanced', 'expert']
    let expLevel = (reg.experienceLevel || 'intermediate').toLowerCase().trim()
    if (!['beginner', 'intermediate', 'advanced', 'expert'].includes(expLevel)) {
      if (expLevel.includes('begin')) expLevel = 'beginner'
      else if (expLevel.includes('expert')) expLevel = 'expert'
      else if (expLevel.includes('adv')) expLevel = 'advanced'
      else expLevel = 'intermediate'
    }

    if (!user) {
      // Create new participant user
      await User.create({
        name: reg.name || 'Anonymous Participant',
        email: normalizedEmail,
        password: 'Password123!', // Default temporary password
        skills: reg.skills || [],
        experienceLevel: expLevel,
        role: 'participant',
      })
      newUsersCount++
    } else {
      // Update existing participant skills and experience level if modified
      let modified = false
      if (reg.skills && reg.skills.length > 0) {
        const mergedSkills = Array.from(new Set([...(user.skills || []), ...reg.skills]))
        if (mergedSkills.length !== (user.skills || []).length) {
          user.skills = mergedSkills
          modified = true
        }
      }
      if (user.experienceLevel !== expLevel) {
        user.experienceLevel = expLevel
        modified = true
      }
      if (modified) {
        await user.save()
        updatedUsersCount++
      }
    }
  }

  return { newUsersCount, updatedUsersCount, totalRegistrations: registrations.length }
}

/**
 * Sync submission rows from Google Sheets into Team & Project documents in MongoDB.
 */
async function syncSubmissionsToDb() {
  const submissions = await googleSheetsService.getSubmissions()
  let newProjectsCount = 0
  let updatedProjectsCount = 0

  if (submissions.length === 0) {
    return { newProjectsCount, updatedProjectsCount, totalSubmissions: 0 }
  }

  // Find or use default active event
  let event = await Event.findOne().sort({ createdAt: -1 })
  if (!event) {
    let admin = await User.findOne({ role: 'admin' })
    if (!admin) {
      admin = await User.create({
        name: 'System Admin',
        email: 'admin@hackforge.io',
        password: 'AdminPassword123!',
        role: 'admin',
      })
    }
    event = await Event.create({
      name: 'HackForge Auto-Synced Event',
      description: 'Default event for submissions synced from Google Sheets',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      teamSize: 4,
      createdBy: admin._id,
      status: 'active',
    })
  }

  for (const sub of submissions) {
    if (!sub.githubRepoUrl && !sub.teamName) continue

    const teamName = sub.teamName || 'Sheet Team'
    let team = await Team.findOne({ eventId: event._id, name: teamName })

    if (!team) {
      team = await Team.create({
        name: teamName,
        eventId: event._id,
        members: [],
        createdBy: 'auto',
      })
    }

    let project = await Project.findOne({ eventId: event._id, teamId: team._id })
    if (!project && sub.githubRepoUrl) {
      project = await Project.findOne({ eventId: event._id, githubRepoUrl: sub.githubRepoUrl })
    }

    const parsedDate = sub.submittedAt ? new Date(sub.submittedAt) : new Date()
    const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate

    if (!project) {
      await Project.create({
        teamId: team._id,
        eventId: event._id,
        githubRepoUrl: sub.githubRepoUrl || 'https://github.com/hackforge/project',
        pitchDescription: sub.pitchDescription || 'Submitted project pitch from Google Sheets.',
        submittedAt: validDate,
      })
      newProjectsCount++
    } else {
      let modified = false
      if (sub.pitchDescription && project.pitchDescription !== sub.pitchDescription) {
        project.pitchDescription = sub.pitchDescription
        modified = true
      }
      if (sub.githubRepoUrl && project.githubRepoUrl !== sub.githubRepoUrl) {
        project.githubRepoUrl = sub.githubRepoUrl
        modified = true
      }
      if (modified) {
        await project.save()
        updatedProjectsCount++
      }
    }
  }

  return { newProjectsCount, updatedProjectsCount, totalSubmissions: submissions.length }
}

/**
 * Perform a full sync cycle: Registrations + Submissions
 */
async function performFullSync() {
  if (isSyncRunning) {
    console.log('[SheetSyncWorker] Sync cycle skipped — sync is already in progress.')
    return lastSyncStatus
  }

  isSyncRunning = true
  lastSyncStatus.status = 'syncing'
  lastSyncStatus.errors = []

  console.log('[SheetSyncWorker] Starting Google Sheets background sync cycle...')

  try {
    const regResult = await syncRegistrationsToDb()
    const subResult = await syncSubmissionsToDb()

    lastSyncStatus.lastRunAt = new Date()
    lastSyncStatus.status = 'success'
    lastSyncStatus.newUsersCount = regResult.newUsersCount
    lastSyncStatus.updatedUsersCount = regResult.updatedUsersCount
    lastSyncStatus.newProjectsCount = subResult.newProjectsCount
    lastSyncStatus.updatedProjectsCount = subResult.updatedProjectsCount

    console.log(
      `[SheetSyncWorker] Sync complete! Users (+${regResult.newUsersCount}, ~${regResult.updatedUsersCount}), Projects (+${subResult.newProjectsCount}, ~${subResult.updatedProjectsCount})`
    )

    // Broadcast real-time SSE event to all open frontend dashboards
    const sseService = require('./sseService')
    sseService.broadcastEvent('sync_update', {
      usersSynced: regResult.newUsersCount + regResult.updatedUsersCount,
      projectsSynced: subResult.newProjectsCount + subResult.updatedProjectsCount,
      timestamp: lastSyncStatus.lastRunAt.toISOString(),
    })
  } catch (err) {
    console.error('[SheetSyncWorker] Sync error:', err.message)
    lastSyncStatus.status = 'error'
    lastSyncStatus.errors.push(err.message)
  } finally {
    isSyncRunning = false
  }

  return lastSyncStatus
}

/**
 * Start the background cron worker interval.
 * Configured via env: ENABLE_SHEET_SYNC_CRON (default: true) & SHEET_SYNC_INTERVAL_MS (default: 60000)
 */
function startWorker() {
  const enabled = process.env.ENABLE_SHEET_SYNC_CRON !== 'false'
  const intervalMs = parseInt(process.env.SHEET_SYNC_INTERVAL_MS || '60000', 10)

  if (!enabled) {
    console.log('[SheetSyncWorker] Background sync cron is disabled (ENABLE_SHEET_SYNC_CRON=false)')
    return
  }

  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer)
  }

  console.log(`[SheetSyncWorker] Background sync cron started. Interval: ${intervalMs / 1000}s`)

  // Initial sync run on boot (delayed slightly to allow DB connect)
  setTimeout(() => {
    performFullSync().catch((err) => console.error('[SheetSyncWorker] Initial sync error:', err.message))
  }, 5000)

  // Periodic interval
  syncIntervalTimer = setInterval(() => {
    performFullSync().catch((err) => console.error('[SheetSyncWorker] Periodic sync error:', err.message))
  }, intervalMs)
}

function stopWorker() {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer)
    syncIntervalTimer = null
    console.log('[SheetSyncWorker] Background sync cron stopped.')
  }
}

function getSyncStatus() {
  return lastSyncStatus
}

module.exports = {
  performFullSync,
  syncRegistrationsToDb,
  syncSubmissionsToDb,
  startWorker,
  stopWorker,
  getSyncStatus,
}
