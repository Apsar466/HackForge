const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const validate = require('../middleware/validate')
const { protect } = require('../middleware/auth')
const { registerSchema, loginSchema } = require('../validation/schemas')

router.post('/register', validate(registerSchema), authController.register)
router.post('/login', validate(loginSchema), authController.login)
router.get('/me', protect, authController.getMe)
router.put('/profile', protect, authController.updateProfile)

module.exports = router
