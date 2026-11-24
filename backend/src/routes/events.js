const express = require('express')
const router = express.Router()
const eventController = require('../controllers/eventController')
const validate = require('../middleware/validate')
const { protect, restrictTo } = require('../middleware/auth')
const { createEventSchema, updateEventSchema } = require('../validation/schemas')

router
  .route('/')
  .get(eventController.getEvents)
  .post(protect, restrictTo('admin', 'judge', 'participant'), validate(createEventSchema), eventController.createEvent)

router
  .route('/:id')
  .get(eventController.getEventById)
  .put(protect, validate(updateEventSchema), eventController.updateEvent)
  .delete(protect, eventController.deleteEvent)

module.exports = router
