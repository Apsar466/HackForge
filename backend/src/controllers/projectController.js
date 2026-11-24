const { Project, Team, Event } = require('../models')
const aiService = require('../services/aiService')
const sseService = require('../services/sseService')

/**
 * Submit a project
 * POST /api/projects
 */
async function submitProject(req, res) {
  const { teamId, eventId, githubRepoUrl, pitchDescription } = req.body

  let targetTeamId = teamId

  if (!targetTeamId) {
    // Find if user is already a member of a team in this event
    let userTeam = await Team.findOne({ eventId, members: req.user._id })
    if (!userTeam) {
      // Auto-create a team for this participant
      userTeam = await Team.create({
        name: `${req.user.name}'s Project Team`,
        eventId,
        members: [req.user._id],
        leader: req.user._id,
        createdBy: 'manual',
      })
    }
    targetTeamId = userTeam._id
  }

  const team = await Team.findById(targetTeamId)
  if (!team) {
    return res.status(404).json({ success: false, message: 'Team not found' })
  }

  const event = await Event.findById(eventId)
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' })
  }

  const existingProject = await Project.findOne({ teamId: targetTeamId })
  if (existingProject) {
    return res.status(400).json({
      success: false,
      message: 'A project has already been submitted for this team',
    })
  }

  const project = await Project.create({
    teamId: targetTeamId,
    eventId,
    githubRepoUrl,
    pitchDescription,
    submittedAt: new Date(),
  })

  const populated = await Project.findById(project._id)
    .populate({
      path: 'teamId',
      select: 'name members',
      populate: { path: 'members', select: 'name email' },
    })
    .populate('eventId', 'name')

  res.status(201).json({
    success: true,
    message: 'Project submitted successfully',
    project: populated,
  })
}

/**
 * Get projects (filterable by eventId or teamId)
 * GET /api/projects
 */
async function getProjects(req, res) {
  const filter = {}
  if (req.query.eventId) filter.eventId = req.query.eventId
  if (req.query.teamId) filter.teamId = req.query.teamId

  const projects = await Project.find(filter)
    .populate({
      path: 'teamId',
      select: 'name members',
      populate: { path: 'members', select: 'name email' },
    })
    .populate('eventId', 'name')
    .sort({ submittedAt: -1 })

  res.json({
    success: true,
    count: projects.length,
    projects,
  })
}

/**
 * Get project by ID
 * GET /api/projects/:id
 */
async function getProjectById(req, res) {
  const project = await Project.findById(req.params.id)
    .populate({
      path: 'teamId',
      select: 'name members',
      populate: { path: 'members', select: 'name email' },
    })
    .populate('eventId', 'name')

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' })
  }

  res.json({
    success: true,
    project,
  })
}

/**
 * Update project
 * PUT /api/projects/:id
 */
async function updateProject(req, res) {
  let project = await Project.findById(req.params.id)
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' })
  }

  project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('teamId', 'name')

  // Broadcast score/leaderboard update if judgeScore changed
  if (req.body.judgeScore !== undefined || req.body.score !== undefined) {
    sseService.broadcastEvent('score_updated', {
      projectId: project._id,
      teamName: project.teamId?.name,
      judgeScore: project.judgeScore,
      score: project.score,
    })
    sseService.broadcastEvent('leaderboard_updated', {
      projectId: project._id,
    })
  }

  res.json({
    success: true,
    message: 'Project updated successfully',
    project,
  })
}

/**
 * Delete project
 * DELETE /api/projects/:id
 */
async function deleteProject(req, res) {
  const project = await Project.findById(req.params.id)
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' })
  }

  await project.deleteOne()

  res.json({
    success: true,
    message: 'Project deleted successfully',
  })
}

/**
 * Trigger AI Evaluation for a project
 * POST /api/projects/:id/evaluate
 */
async function evaluateProject(req, res) {
  const project = await Project.findById(req.params.id)
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' })
  }

  const criteria = req.body.criteria || ['Innovation', 'Technical Complexity', 'UI/UX', 'Practical Utility']

  // Call AI microservice
  const aiEval = await aiService.evaluateProject(project, criteria)

  project.score = aiEval.overall_score || 0
  project.evaluationDetails = aiEval
  await project.save()

  // Broadcast real-time events to all connected dashboards
  sseService.broadcastEvent('project_evaluated', {
    projectId: project._id,
    teamId: project.teamId,
    score: project.score,
    criteria,
  })
  sseService.broadcastEvent('leaderboard_updated', {
    projectId: project._id,
  })

  res.json({
    success: true,
    message: 'Project evaluated successfully by AI service',
    project,
  })
}

module.exports = {
  submitProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  evaluateProject,
}
