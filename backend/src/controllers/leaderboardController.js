const { Project, Event } = require('../models')

/**
 * Get leaderboard for a specific event
 * GET /api/leaderboard/:eventId
 */
async function getLeaderboard(req, res) {
  const { eventId } = req.params
  const judgeWeight = parseFloat(req.query.judgeWeight) || 0.6
  const aiWeight = parseFloat(req.query.aiWeight) || 0.4

  const event = await Event.findById(eventId)
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' })
  }

  const projects = await Project.find({ eventId })
    .populate({
      path: 'teamId',
      select: 'name members leader createdBy',
      populate: { path: 'members', select: 'name email skills experienceLevel' },
    })

  // Compute weighted composite score for each project
  const mapped = projects.map((proj) => {
    const judgeVal = proj.judgeScore ?? proj.score ?? 70
    // AI Score can come from evaluationDetails or aiEvaluation or score
    const aiDetails = proj.aiEvaluation || proj.evaluationDetails || {}
    const aiVal = aiDetails.originality_score ?? aiDetails.originalityScore ?? aiDetails.overall_score ?? proj.score ?? 70

    const compositeScore = Math.round((judgeWeight * judgeVal) + (aiWeight * aiVal))

    return {
      _id: proj._id,
      projectId: proj._id,
      teamId: proj.teamId?._id,
      teamName: proj.teamId?.name || 'Unnamed Team',
      team: proj.teamId,
      githubRepoUrl: proj.githubRepoUrl,
      pitchDescription: proj.pitchDescription,
      score: compositeScore,
      finalScore: compositeScore,
      judgeScore: judgeVal,
      aiScore: aiVal,
      aiEvaluation: proj.aiEvaluation,
      evaluationDetails: proj.evaluationDetails,
      feedback: proj.feedback,
      submittedAt: proj.submittedAt,
    }
  })

  // Sort descending by finalScore, then ascending by submittedAt
  mapped.sort((a, b) => b.finalScore - a.finalScore || new Date(a.submittedAt) - new Date(b.submittedAt))

  const leaderboard = mapped.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }))

  res.json({
    success: true,
    eventId: event._id,
    eventName: event.name,
    count: leaderboard.length,
    weights: { judgeWeight, aiWeight },
    leaderboard,
  })
}

module.exports = {
  getLeaderboard,
}
