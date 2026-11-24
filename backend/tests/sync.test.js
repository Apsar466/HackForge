/**
 * tests/sync.test.js
 * Unit and integration tests for Google Sheets synchronization service and routes.
 */
const request = require('supertest')
const app = require('../app')
const googleSheetsService = require('../src/services/googleSheetsService')
const { google } = require('googleapis')

// Mock googleapis
jest.mock('googleapis', () => {
  const mockValuesGet = jest.fn()
  return {
    google: {
      auth: {
        GoogleAuth: jest.fn().mockImplementation(() => ({})),
      },
      sheets: jest.fn().mockReturnValue({
        spreadsheets: {
          values: {
            get: mockValuesGet,
          },
        },
      }),
    },
    __mockValuesGet: mockValuesGet,
  }
})

const { __mockValuesGet } = require('googleapis')

describe('Google Sheets Synchronization Module', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = '{"type":"service_account","project_id":"test"}'
    process.env.SPREADSHEET_ID_REGISTRATION = 'test_reg_sheet_id'
    process.env.SPREADSHEET_ID_SUBMISSION = 'test_sub_sheet_id'
  })

  describe('getRegistrations()', () => {
    it('should correctly parse registration sheet rows into array of participant objects', async () => {
      __mockValuesGet.mockResolvedValueOnce({
        data: {
          values: [
            ['Timestamp', 'Full Name', 'Email Address', 'Skills', 'Experience Level'],
            ['2026-08-12 10:00:00', 'Alice Smith', 'alice@example.com', 'React, Node.js, TypeScript', 'Advanced'],
            ['2026-08-12 10:05:00', 'Bob Jones', 'bob@example.com', 'Python, FastAPI, TensorFlow', 'Intermediate'],
          ],
        },
      })

      const registrations = await googleSheetsService.getRegistrations()

      expect(registrations).toHaveLength(2)
      expect(registrations[0]).toEqual({
        name: 'Alice Smith',
        email: 'alice@example.com',
        skills: ['React', 'Node.js', 'TypeScript'],
        experienceLevel: 'Advanced',
      })
      expect(registrations[1]).toEqual({
        name: 'Bob Jones',
        email: 'bob@example.com',
        skills: ['Python', 'FastAPI', 'TensorFlow'],
        experienceLevel: 'Intermediate',
      })
    })

    it('should return empty array if sheet has only header or no rows', async () => {
      __mockValuesGet.mockResolvedValueOnce({ data: { values: [] } })
      const registrations = await googleSheetsService.getRegistrations()
      expect(registrations).toEqual([])
    })

    it('should fallback to default column positions if headers do not match', async () => {
      __mockValuesGet.mockResolvedValueOnce({
        data: {
          values: [
            ['Col0', 'Col1', 'Col2', 'Col3', 'Col4'],
            ['T', 'Charlie', 'charlie@example.com', 'Go, Docker', 'Expert'],
          ],
        },
      })

      const registrations = await googleSheetsService.getRegistrations()
      expect(registrations).toHaveLength(1)
      expect(registrations[0].name).toBe('Charlie')
      expect(registrations[0].email).toBe('charlie@example.com')
      expect(registrations[0].skills).toEqual(['Go', 'Docker'])
      expect(registrations[0].experienceLevel).toBe('Expert')
    })
  })

  describe('getSubmissions()', () => {
    it('should correctly parse submission sheet rows into array of submission objects', async () => {
      __mockValuesGet.mockResolvedValueOnce({
        data: {
          values: [
            ['Timestamp', 'Team Name', 'GitHub Repo URL', 'Pitch Description'],
            ['2026-08-12 11:00:00', 'Neural Forge', 'https://github.com/test/neural-forge', 'AI-powered code optimizer.'],
          ],
        },
      })

      const submissions = await googleSheetsService.getSubmissions()

      expect(submissions).toHaveLength(1)
      expect(submissions[0]).toEqual({
        teamName: 'Neural Forge',
        githubRepoUrl: 'https://github.com/test/neural-forge',
        pitchDescription: 'AI-powered code optimizer.',
        submittedAt: '2026-08-12 11:00:00',
      })
    })
  })

  describe('HTTP Endpoints GET /sync/registrations & GET /sync/submissions', () => {
    it('GET /sync/registrations should return 200 and JSON payload', async () => {
      __mockValuesGet.mockResolvedValueOnce({
        data: {
          values: [
            ['Timestamp', 'Name', 'Email', 'Skills', 'Level'],
            ['2026-08-12', 'Eve', 'eve@example.com', 'Rust', 'Beginner'],
          ],
        },
      })

      const res = await request(app).get('/sync/registrations')
      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].name).toBe('Eve')
    })

    it('GET /sync/submissions should return 200 and JSON payload', async () => {
      __mockValuesGet.mockResolvedValueOnce({
        data: {
          values: [
            ['Timestamp', 'Team', 'GitHub', 'Pitch'],
            ['2026-08-12', 'CyberDevs', 'https://github.com/cyber/devs', 'Cybersecurity dashboard.'],
          ],
        },
      })

      const res = await request(app).get('/sync/submissions')
      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].teamName).toBe('CyberDevs')
    })

    it('GET /api/sync/registrations should also work (mounted alias)', async () => {
      __mockValuesGet.mockResolvedValueOnce({
        data: {
          values: [
            ['Timestamp', 'Name', 'Email', 'Skills', 'Level'],
            ['2026-08-12', 'Alice', 'alice@example.com', 'Java', 'Intermediate'],
          ],
        },
      })

      const res = await request(app).get('/api/sync/registrations')
      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('GET /sync/status should return status object', async () => {
      const res = await request(app).get('/sync/status')
      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.status).toBeDefined()
    })

    it('POST /sync/run should trigger manual sync cycle', async () => {
      __mockValuesGet
        .mockResolvedValueOnce({ data: { values: [] } })
        .mockResolvedValueOnce({ data: { values: [] } })

      const res = await request(app).post('/sync/run')
      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })
})
