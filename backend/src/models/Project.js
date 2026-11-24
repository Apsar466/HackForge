const mongoose = require('mongoose')

const projectSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team ID is required'],
      unique: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
    },
    githubRepoUrl: {
      type: String,
      required: [true, 'GitHub repository URL is required'],
      trim: true,
    },
    pitchDescription: {
      type: String,
      required: [true, 'Pitch description is required'],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    score: {
      type: Number,
      default: 0,
    },
    judgeScore: {
      type: Number,
      default: null,
    },
    feedback: {
      type: String,
      default: '',
    },
    aiEvaluation: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    evaluationDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Project', projectSchema)
