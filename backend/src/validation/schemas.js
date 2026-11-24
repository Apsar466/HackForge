const Joi = require('joi')

const registerSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(100),
  email: Joi.string().email().required().trim().lowercase(),
  password: Joi.string().min(6).required(),
  skills: Joi.array().items(Joi.string().trim()).default([]),
  experienceLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').default('intermediate'),
  role: Joi.string().valid('participant', 'admin', 'judge').default('participant'),
})

const loginSchema = Joi.object({
  email: Joi.string().email().required().trim().lowercase(),
  password: Joi.string().required(),
})

const createEventSchema = Joi.object({
  name: Joi.string().required().trim().min(3).max(120),
  description: Joi.string().required().trim().min(10),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
    'date.greater': 'endDate must be after startDate',
  }),
  teamSize: Joi.number().integer().min(2).max(10).default(4),
})

const updateEventSchema = Joi.object({
  name: Joi.string().trim().min(3).max(120),
  description: Joi.string().trim().min(10),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  teamSize: Joi.number().integer().min(2).max(10),
  status: Joi.string().valid('upcoming', 'active', 'ended'),
})

const createTeamSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(80),
  eventId: Joi.string().hex().length(24).required(),
  members: Joi.array().items(Joi.string().hex().length(24)).default([]),
})

const autoFormTeamsSchema = Joi.object({
  eventId: Joi.string().hex().length(24).required(),
  teamSize: Joi.number().integer().min(2).max(10),
  targetTeamSize: Joi.number().integer().min(2).max(10),
})

const submitProjectSchema = Joi.object({
  teamId: Joi.string().hex().length(24),
  eventId: Joi.string().hex().length(24).required(),
  githubRepoUrl: Joi.string().uri().required().trim(),
  pitchDescription: Joi.string().required().trim().min(10),
})

const updateProjectSchema = Joi.object({
  githubRepoUrl: Joi.string().uri().trim(),
  pitchDescription: Joi.string().trim().min(10),
  score: Joi.number().min(0).max(100),
  judgeScore: Joi.number().min(0).max(100),
  feedback: Joi.string().allow('', null),
  aiEvaluation: Joi.object().unknown(true),
}).unknown(true)

module.exports = {
  registerSchema,
  loginSchema,
  createEventSchema,
  updateEventSchema,
  createTeamSchema,
  autoFormTeamsSchema,
  submitProjectSchema,
  updateProjectSchema,
}
