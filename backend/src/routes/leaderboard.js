const express = require('express')
const router = express.Router()
const leaderboardController = require('../controllers/leaderboardController')

router.get('/:eventId', leaderboardController.getLeaderboard)

module.exports = router
