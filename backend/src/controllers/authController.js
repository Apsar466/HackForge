const { User } = require('../models')

/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res) {
  const { name, email, password, skills, experienceLevel, role } = req.body

  const existingUser = await User.findOne({ email })
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email address',
    })
  }

  const user = await User.create({
    name,
    email,
    password,
    skills: skills || [],
    experienceLevel: experienceLevel || 'intermediate',
    role: role || 'participant',
  })

  const token = user.generateToken()

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      skills: user.skills,
      experienceLevel: user.experienceLevel,
      role: user.role,
    },
  })
}

/**
 * Login user
 * POST /api/auth/login
 */
async function login(req, res) {
  const { email, password } = req.body

  const user = await User.findOne({ email }).select('+password')
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    })
  }

  const isMatch = await user.matchPassword(password)
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    })
  }

  const token = user.generateToken()

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      skills: user.skills,
      experienceLevel: user.experienceLevel,
      role: user.role,
    },
  })
}

/**
 * Get current logged in user profile
 * GET /api/auth/me
 */
async function getMe(req, res) {
  res.json({
    success: true,
    user: req.user,
  })
}

/**
 * Update current logged in user profile
 * PUT /api/auth/profile
 */
async function updateProfile(req, res) {
  const { name, skills, experienceLevel } = req.body

  const updates = {}
  if (name !== undefined) updates.name = name
  if (skills !== undefined) updates.skills = skills
  if (experienceLevel !== undefined) updates.experienceLevel = experienceLevel

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  })

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: updatedUser,
  })
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
}
