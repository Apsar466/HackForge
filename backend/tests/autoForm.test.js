/**
 * tests/autoForm.test.js
 * Jest / Supertest suite verifying /api/teams/auto-form calls the AI microservice
 * and creates corresponding Team documents in MongoDB.
 */
const request  = require('supertest')
const mongoose = require('mongoose')
const app      = require('../app')
const { User, Event, Team, Project } = require('../src/models')

describe('POST /api/teams/auto-form Integration Tests', () => {
  let adminToken
  let testEvent

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/hackforge_test'
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri)
    }

    // Clear test collections
    await User.deleteMany({})
    await Event.deleteMany({})
    await Team.deleteMany({})
    await Project.deleteMany({})

    // 1. Create Admin & Token
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Test Admin',
      email: 'admin_test@hackforge.io',
      password: 'password123',
      role: 'admin',
    })
    adminToken = adminRes.body.token

    // 2. Create Test Event
    const eventRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Jest Hackathon 2026',
        description: 'Testing team auto-formation with real AI service.',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        teamSize: 2,
      })
    testEvent = eventRes.body.event

    // 3. Register Participants
    await request(app).post('/api/auth/register').send({
      name: 'Participant One',
      email: 'p1@hackforge.io',
      password: 'password123',
      skills: ['React', 'TypeScript'],
      role: 'participant',
    })

    await request(app).post('/api/auth/register').send({
      name: 'Participant Two',
      email: 'p2@hackforge.io',
      password: 'password123',
      skills: ['Python', 'FastAPI'],
      role: 'participant',
    })
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it('should auto-form teams via AI service and store Team documents in MongoDB', async () => {
    const res = await request(app)
      .post('/api/teams/auto-form')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        eventId: testEvent._id,
        teamSize: 2,
      })

    expect(res.statusCode).toEqual(201)
    expect(res.body.success).toBe(true)
    expect(res.body.teams).toBeDefined()
    expect(res.body.teams.length).toBeGreaterThan(0)

    const firstTeam = res.body.teams[0]
    expect(firstTeam.createdBy).toBe('auto')
    expect(firstTeam.members.length).toBe(2)

    // Verify team was persisted in MongoDB
    const teamInDb = await Team.findById(firstTeam._id)
    expect(teamInDb).not.toBeNull()
    expect(teamInDb.createdBy).toBe('auto')
    expect(teamInDb.eventId.toString()).toBe(testEvent._id.toString())
  })
})
