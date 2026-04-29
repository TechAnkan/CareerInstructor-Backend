const mongoose = require('mongoose');

const roadmapStepSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false }
});

const roadmapSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  careerTitle: {
    type: String,
    required: true
  },
  careerId: {
    type: Number,
    required: true
  },
  color: {
    type: String,
    default: "#6366f1"
  },
  steps: [roadmapStepSchema],
  progress: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Pre-save hook to calculate progress percentage
roadmapSchema.pre('save', function(next) {
  if (this.steps && this.steps.length > 0) {
    const completedSteps = this.steps.filter(step => step.completed).length;
    this.progress = Math.round((completedSteps / this.steps.length) * 100);
  } else {
    this.progress = 0;
  }
  next();
});

module.exports = mongoose.model('Roadmap', roadmapSchema);
