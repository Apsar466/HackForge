/**
 * src/services/aiService.js
 * Internal client for calling the AI microservice from the backend.
 */
const axios = require('axios')

const getAiBaseUrl = () => process.env.AI_SERVICE_URL || 'http://localhost:8000'

const getAiClient = () =>
  axios.create({
    baseURL: getAiBaseUrl(),
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json' },
  })

/**
 * Call AI service to form teams based on participant skills and target team size.
 * Tries /ai/team-formation and falls back to /ai/match-teams.
 *
 * @param {Array<{id: string, name: string, skills: string[]}>} participants
 * @param {number} teamSize
 * @returns {Promise<{success: boolean, teams: Array<{team_id: number, members: Array<any>, rationale: string}>}>}
 */
async function suggestTeams(participants, teamSize = 4) {
  const client = getAiClient()
  const payload = {
    participants: participants.map((p) => ({
      id: String(p._id || p.id),
      name: p.name,
      skills: p.skills || [],
      meta: { experienceLevel: p.experienceLevel || 'intermediate' },
    })),
    team_size: teamSize,
  }

  try {
    const { data } = await client.post('/ai/team-formation', payload)
    return data
  } catch (err) {
    // Try fallback alias path if endpoint route changed
    try {
      const { data } = await client.post('/ai/match-teams', payload)
      return data
    } catch (fallbackErr) {
      console.error('[AiService Error] suggestTeams failed:', err.message, fallbackErr.message)
      throw new Error(`AI Service team formation failed: ${err.response?.data?.message || err.message}`)
    }
  }
}

/**
 * Call AI service to evaluate a project submission.
 * @param {object} project
 * @param {string[]} criteria
 * @returns {Promise<object>}
 */
async function evaluateProject(project, criteria = ['Innovation', 'Technical Complexity', 'UI/UX', 'Practical Utility']) {
  const client = getAiClient()
  const payload = {
    project: {
      id: String(project._id || project.id),
      title: project.title || 'Submitted Project',
      githubRepoUrl: project.githubRepoUrl,
      pitchDescription: project.pitchDescription,
    },
    criteria,
  }

  try {
    const { data } = await client.post('/ai/evaluate', payload)
    return data
  } catch (err) {
    console.error('[AiService Error] evaluateProject failed:', err.message)
    throw new Error(`AI Service project evaluation failed: ${err.response?.data?.message || err.message}`)
  }
}

/**
 * Call AI service to compare algorithmic vs LLM team formation.
 * @param {Array<{id: string, name: string, skills: string[], experienceLevel: string}>} participants
 * @param {number} teamSize
 * @returns {Promise<{algorithmic, llm, winner}>}
 */
async function compareTeams(participants, teamSize = 4) {
  const client = getAiClient()
  const payload = {
    participants: participants.map((p) => ({
      id: String(p._id || p.id),
      name: p.name,
      skills: p.skills || [],
      experienceLevel: p.experienceLevel || 'intermediate',
    })),
    team_size: teamSize,
  }

  try {
    const { data } = await client.post('/compare-team-formation', payload, { timeout: 90_000 })
    return data
  } catch (err) {
    console.error('[AiService Error] compareTeams failed:', err.message)
    throw new Error(`AI Service comparison failed: ${err.response?.data?.detail || err.message}`)
  }
}

module.exports = { suggestTeams, evaluateProject, compareTeams }
