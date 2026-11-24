const { Team, Event, User } = require('../models')
const aiService = require('../services/aiService')
const sseService = require('../services/sseService')

/**
 * Create a team manually
 * POST /api/teams
 */
async function createTeam(req, res) {
  const { name, eventId, members } = req.body

  const event = await Event.findById(eventId)
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' })
  }

  // Include current user in members if not already included
  const memberList = members || []
  if (!memberList.includes(req.user._id.toString())) {
    memberList.push(req.user._id)
  }

  const team = await Team.create({
    name,
    eventId,
    members: memberList,
    leader: req.user._id,
    createdBy: 'manual',
  })

  const populatedTeam = await Team.findById(team._id).populate('members', 'name email skills experienceLevel')

  res.status(201).json({
    success: true,
    message: 'Team created successfully',
    team: populatedTeam,
  })
}

/**
 * Get teams (optionally filter by eventId)
 * GET /api/teams?eventId=xxx
 */
async function getTeams(req, res) {
  const filter = {}
  if (req.query.eventId) {
    filter.eventId = req.query.eventId
  }

  const teams = await Team.find(filter)
    .populate('members', 'name email skills experienceLevel')
    .populate('eventId', 'name teamSize')
    .populate('leader', 'name email')
    .sort({ createdAt: -1 })

  res.json({
    success: true,
    count: teams.length,
    teams,
  })
}

/**
 * Get team by ID
 * GET /api/teams/:id
 */
async function getTeamById(req, res) {
  const team = await Team.findById(req.params.id)
    .populate('members', 'name email skills experienceLevel')
    .populate('eventId', 'name teamSize')
    .populate('leader', 'name email')

  if (!team) {
    return res.status(404).json({ success: false, message: 'Team not found' })
  }

  res.json({
    success: true,
    team,
  })
}

/**
 * Auto-form teams using AI microservice
 * POST /api/teams/auto-form
 */
async function autoFormTeams(req, res) {
  const { eventId, teamSize: requestedTeamSize, targetTeamSize } = req.body

  // Accept either teamSize or targetTeamSize from the frontend
  const resolvedTeamSize = requestedTeamSize || targetTeamSize

  console.log(`[Auto-Form Teams] eventId=${eventId}, resolvedTeamSize=${resolvedTeamSize}`)

  const event = await Event.findById(eventId)
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' })
  }

  const targetTeamSizeFinal = resolvedTeamSize || event.teamSize || 4

  // Find all existing teams for this event to identify already assigned members
  const existingTeams = await Team.find({ eventId })
  const assignedUserIds = existingTeams.flatMap((t) => t.members.map((m) => m.toString()))

  // Find all participants not yet assigned to a team in this event
  const unassignedParticipants = await User.find({
    role: 'participant',
    _id: { $nin: assignedUserIds },
  }).select('name email skills experienceLevel')

  console.log(`[Auto-Form Teams] Found ${unassignedParticipants.length} unassigned participants`)

  if (unassignedParticipants.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No unassigned participants found for this event to form teams. Register participants first.',
    })
  }

  // Call AI microservice to match teams
  console.log(`[Auto-Form Teams] Calling AI service suggestTeams with ${unassignedParticipants.length} participants, teamSize=${targetTeamSizeFinal}`)
  let aiResult
  try {
    aiResult = await aiService.suggestTeams(unassignedParticipants, targetTeamSizeFinal)
  } catch (aiErr) {
    console.error('[Auto-Form Teams] AI Service call failed:', aiErr.message)
    return res.status(502).json({
      success: false,
      message: `AI service failed to form teams: ${aiErr.message}. Ensure the AI service is running at http://localhost:8000.`,
    })
  }

  console.log(`[Auto-Form Teams] AI service result:`, JSON.stringify(aiResult).slice(0, 200))

  if (!aiResult.success || !aiResult.teams || aiResult.teams.length === 0) {
    return res.status(500).json({
      success: false,
      message: 'AI Service did not return valid team groupings',
      aiResult,
    })
  }

  // Save the AI-generated teams as Team documents in MongoDB
  const createdTeams = []
  for (let idx = 0; idx < aiResult.teams.length; idx++) {
    const aiTeam = aiResult.teams[idx]
    const memberIds = aiTeam.members.map((m) => m.id || m._id)

    const teamDoc = await Team.create({
      name: `AI Team ${idx + 1} (${event.name})`,
      eventId: event._id,
      members: memberIds,
      leader: memberIds[0] || null,
      createdBy: 'auto',
    })

    const populated = await Team.findById(teamDoc._id).populate('members', 'name email skills experienceLevel')
    createdTeams.push(populated)
  }

  console.log(`[Auto-Form Teams] Successfully created ${createdTeams.length} team(s)`)

  // Broadcast real-time event to all connected dashboards
  sseService.broadcastEvent('teams_updated', {
    eventId,
    teamsCount: createdTeams.length,
    method: 'auto',
  })

  res.status(201).json({
    success: true,
    message: `Successfully auto-formed ${createdTeams.length} team(s) using AI service`,
    teamsCount: createdTeams.length,
    aiRationale: aiResult.message,
    teams: createdTeams,
  })
}

/**
 * Compare algorithmic vs LLM team formation using live registrations.
 * POST /api/teams/compare
 *
 * 1. Pulls live participant registrations from Google Sheets (or sample CSV fallback).
 * 2. Maps them to User documents (upserts if missing).
 * 3. Calls AI service /compare-team-formation with the full participant list.
 * 4. Saves the WINNING method's teams as official Team documents in MongoDB.
 * 5. Returns the full comparison result plus the saved teams.
 */
async function compareTeamFormation(req, res) {
  const { eventId, teamSize } = req.body

  if (!eventId) {
    return res.status(400).json({ success: false, message: 'eventId is required in request body.' })
  }

  const event = await Event.findById(eventId)
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found.' })
  }

  const resolvedTeamSize = teamSize || event.teamSize || 4

  // Pull registrations from Google Sheets (live or sample CSV fallback)
  const googleSheetsService = require('../services/googleSheetsService')
  let registrations = []
  try {
    registrations = await googleSheetsService.getRegistrations()
  } catch (sheetErr) {
    console.warn('[Compare Teams] Google Sheets fetch failed, falling back to DB participants:', sheetErr.message)
  }

  // Build participant list — prefer Google Sheets data, fall back to DB participants
  let participants = []
  if (registrations.length > 0) {
    // Upsert User records from sheet registrations
    for (const reg of registrations) {
      if (!reg.email) continue
      const existing = await User.findOne({ email: reg.email.toLowerCase() })
      if (!existing) {
        try {
          const newUser = await User.create({
            name: reg.name || 'Anonymous',
            email: reg.email.toLowerCase(),
            password: 'SheetImported123!',
            skills: reg.skills || [],
            experienceLevel: reg.experienceLevel || 'intermediate',
            role: 'participant',
          })
          participants.push({ id: String(newUser._id), name: newUser.name, skills: newUser.skills, experienceLevel: newUser.experienceLevel })
        } catch (_) {
          // Duplicate email — skip
        }
      } else {
        participants.push({ id: String(existing._id), name: existing.name, skills: existing.skills || reg.skills || [], experienceLevel: existing.experienceLevel })
      }
    }
  }

  // If Sheets returned nothing, fall back to DB participants
  if (participants.length === 0) {
    const dbParticipants = await User.find({ role: 'participant' }).select('name email skills experienceLevel')
    participants = dbParticipants.map((p) => ({
      id: String(p._id),
      name: p.name,
      skills: p.skills || [],
      experienceLevel: p.experienceLevel || 'intermediate',
    }))
  }

  if (participants.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Not enough participants to compare (need at least 2). Check Google Sheets or register participants.',
    })
  }

  console.log(`[Compare Teams] Running comparison on ${participants.length} participants, teamSize=${resolvedTeamSize}`)

  // Call AI comparison endpoint
  let compareResult
  try {
    compareResult = await aiService.compareTeams(participants, resolvedTeamSize)
  } catch (aiErr) {
    console.error('[Compare Teams] AI compare failed:', aiErr.message)
    return res.status(502).json({
      success: false,
      message: `AI comparison failed: ${aiErr.message}. Ensure the AI service is running at http://localhost:8000.`,
    })
  }

  const { winner, algorithmic, llm } = compareResult

  // Save winning teams as official Team records
  const winningTeams = winner === 'llm' ? llm.teams : algorithmic.teams
  const methodLabel = winner === 'tie' ? 'algorithmic (tie)' : winner

  // Remove previously auto-formed teams for this event to avoid duplicates
  await Team.deleteMany({ eventId: event._id, createdBy: 'auto' })

  const savedTeams = []
  for (let idx = 0; idx < winningTeams.length; idx++) {
    const t = winningTeams[idx]
    const memberMongoIds = t.members || t.member_ids || []

    const teamDoc = await Team.create({
      name: `${methodLabel} Team ${idx + 1} (${event.name})`,
      eventId: event._id,
      members: memberMongoIds,
      leader: memberMongoIds[0] || null,
      createdBy: 'auto',
    })

    const populated = await Team.findById(teamDoc._id).populate('members', 'name email skills experienceLevel')
    savedTeams.push(populated)
  }

  console.log(`[Compare Teams] Saved ${savedTeams.length} ${methodLabel} team(s) to MongoDB.`)

  // Broadcast real-time event to all connected dashboards
  sseService.broadcastEvent('teams_updated', {
    eventId,
    teamsCount: savedTeams.length,
    method: methodLabel,
    winner,
  })

  return res.status(201).json({
    success: true,
    message: `Comparison complete. Winner: "${winner}". Saved ${savedTeams.length} ${methodLabel} team(s) to MongoDB.`,
    winner,
    comparison: compareResult,
    savedTeams,
  })
}

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  autoFormTeams,
  compareTeamFormation,
}
