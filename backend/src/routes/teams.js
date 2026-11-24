const express = require('express')
const router = express.Router()
const teamController = require('../controllers/teamController')
const validate = require('../middleware/validate')
const { protect } = require('../middleware/auth')
const { createTeamSchema, autoFormTeamsSchema } = require('../validation/schemas')

router.post('/auto-form', protect, validate(autoFormTeamsSchema), teamController.autoFormTeams)
router.post('/compare', protect, teamController.compareTeamFormation)

router
  .route('/')
  .get(teamController.getTeams)
  .post(protect, validate(createTeamSchema), teamController.createTeam)

router.get('/:id', teamController.getTeamById)

module.exports = router
