/**
 * backend/scripts/test-backend.js
 * Comprehensive integration test script verifying:
 * 1. User Registration & Authentication (bcrypt + JWT)
 * 2. Event Creation (CRUD)
 * 3. Team Auto-Formation (POST /api/teams/auto-form calling AI microservice & saving Team docs)
 * 4. Project Submission & AI Evaluation
 * 5. Leaderboard (GET /api/leaderboard/:eventId)
 */
const axios = require('axios')

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:4000/api'

async function runIntegrationTest() {
  console.log('🚀 Starting HackForge Backend Integration Verification...\n')

  try {
    // 1. Health check
    console.log('1️⃣  Checking Health Endpoints...')
    const health = await axios.get(`${BASE_URL}/health`)
    console.log('   Backend Health:', health.data.message)

    const aiHealth = await axios.get(`${BASE_URL}/ai/health`)
    console.log('   AI Proxy Health:', aiHealth.data.message)

    // 2. Register Admin User
    console.log('\n2️⃣  Registering Admin User...')
    const adminEmail = `admin_${Date.now()}@hackforge.io`
    const adminRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Hackathon Admin',
      email: adminEmail,
      password: 'password123',
      role: 'admin',
    })
    const adminToken = adminRes.data.token
    console.log(`   Admin Registered: ${adminRes.data.user.email} (ID: ${adminRes.data.user.id})`)

    // 3. Register Participants with diverse skills
    console.log('\n3️⃣  Registering Unassigned Participants...')
    const participantsData = [
      { name: 'Alice Tech', skills: ['React', 'Node.js', 'Tailwind'], experienceLevel: 'advanced' },
      { name: 'Bob Data', skills: ['Python', 'FastAPI', 'PyTorch'], experienceLevel: 'intermediate' },
      { name: 'Charlie Design', skills: ['Figma', 'UI/UX', 'CSS'], experienceLevel: 'beginner' },
      { name: 'Diana Fullstack', skills: ['MongoDB', 'Express', 'Vue'], experienceLevel: 'advanced' },
    ]

    const registeredParticipants = []
    for (const p of participantsData) {
      const email = `part_${Date.now()}_${Math.floor(Math.random() * 1000)}@hackforge.io`
      const res = await axios.post(`${BASE_URL}/auth/register`, {
        name: p.name,
        email,
        password: 'password123',
        skills: p.skills,
        experienceLevel: p.experienceLevel,
        role: 'participant',
      })
      registeredParticipants.push(res.data.user)
      console.log(`   Participant Registered: ${res.data.user.name} (${res.data.user.skills.join(', ')})`)
    }

    // 4. Create Hackathon Event
    console.log('\n4️⃣  Creating Event...')
    const eventRes = await axios.post(
      `${BASE_URL}/events`,
      {
        name: `AI Buildathon ${Date.now()}`,
        description: 'Build cutting edge AI agentic tools and platforms.',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        teamSize: 2,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    )
    const event = eventRes.data.event
    console.log(`   Event Created: "${event.name}" (ID: ${event._id})`)

    // 5. AUTO-FORM TEAMS using AI microservice!
    console.log('\n5️⃣  Calling POST /api/teams/auto-form (AI Team Formation)...')
    const autoFormRes = await axios.post(
      `${BASE_URL}/teams/auto-form`,
      {
        eventId: event._id,
        teamSize: 2,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    )

    console.log(`   AI Rationale: "${autoFormRes.data.aiRationale}"`)
    console.log(`   Created Teams Count: ${autoFormRes.data.teams.length}`)

    const createdTeams = autoFormRes.data.teams
    createdTeams.forEach((team, idx) => {
      const memberNames = team.members.map((m) => m.name).join(', ')
      console.log(`   Team ${idx + 1}: "${team.name}" | Members: [${memberNames}] | CreatedBy: ${team.createdBy}`)
    })

    // 6. Submit Projects for Created Teams
    console.log('\n6️⃣  Submitting Projects...')
    const submittedProjects = []
    for (let i = 0; i < createdTeams.length; i++) {
      const team = createdTeams[i]
      const projRes = await axios.post(
        `${BASE_URL}/projects`,
        {
          teamId: team._id,
          eventId: event._id,
          githubRepoUrl: `https://github.com/hackforge-teams/team-${i + 1}-project`,
          pitchDescription: `Revolutionary AI solution created by ${team.name}`,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )
      submittedProjects.push(projRes.data.project)
      console.log(`   Project Submitted for "${team.name}": ID ${projRes.data.project._id}`)
    }

    // 7. Trigger AI Project Evaluation
    console.log('\n7️⃣  Evaluating Projects via AI Service...')
    for (const proj of submittedProjects) {
      const evalRes = await axios.post(
        `${BASE_URL}/projects/${proj._id}/evaluate`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )
      console.log(`   Project ID ${proj._id} Evaluated — Overall Score: ${evalRes.data.project.score}/10`)
    }

    // 8. Fetch Leaderboard
    console.log('\n8️⃣  Fetching Leaderboard...')
    const leaderboardRes = await axios.get(`${BASE_URL}/leaderboard/${event._id}`)
    console.log(`   Leaderboard Entries Count: ${leaderboardRes.data.count}`)
    leaderboardRes.data.leaderboard.forEach((entry) => {
      console.log(`   Rank ${entry.rank} | Team: "${entry.team.name}" | Score: ${entry.score}/10 | Repo: ${entry.githubRepoUrl}`)
    })

    console.log('\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n')
  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.response?.data || err.message)
    process.exit(1)
  }
}

runIntegrationTest()
