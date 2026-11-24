const { Event } = require('../models')

/**
 * Create a new event
 * POST /api/events
 */
async function createEvent(req, res) {
  const { name, description, startDate, endDate, teamSize } = req.body

  const event = await Event.create({
    name,
    description,
    startDate,
    endDate,
    teamSize: teamSize || 4,
    createdBy: req.user._id,
  })

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    event,
  })
}

/**
 * Get all events
 * GET /api/events
 */
async function getEvents(_req, res) {
  const events = await Event.find()
    .populate('createdBy', 'name email')
    .sort({ startDate: 1 })

  res.json({
    success: true,
    count: events.length,
    events,
  })
}

/**
 * Get single event by ID
 * GET /api/events/:id
 */
async function getEventById(req, res) {
  const event = await Event.findById(req.params.id).populate('createdBy', 'name email')
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' })
  }

  res.json({
    success: true,
    event,
  })
}

/**
 * Update event
 * PUT /api/events/:id
 */
async function updateEvent(req, res) {
  let event = await Event.findById(req.params.id)
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' })
  }

  // Only creator or admin can update
  if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to update this event' })
  }

  event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })

  res.json({
    success: true,
    message: 'Event updated successfully',
    event,
  })
}

/**
 * Delete event
 * DELETE /api/events/:id
 */
async function deleteEvent(req, res) {
  const event = await Event.findById(req.params.id)
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' })
  }

  if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this event' })
  }

  await event.deleteOne()

  res.json({
    success: true,
    message: 'Event deleted successfully',
  })
}

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
}
