const express = require('express')
const router = express.Router()
const projectController = require('../controllers/projectController')
const validate = require('../middleware/validate')
const { protect } = require('../middleware/auth')
const { submitProjectSchema, updateProjectSchema } = require('../validation/schemas')

router
  .route('/')
  .get(projectController.getProjects)
  .post(protect, validate(submitProjectSchema), projectController.submitProject)

router
  .route('/:id')
  .get(projectController.getProjectById)
  .put(protect, validate(updateProjectSchema), projectController.updateProject)
  .delete(protect, projectController.deleteProject)

router.post('/:id/evaluate', protect, projectController.evaluateProject)

module.exports = router
