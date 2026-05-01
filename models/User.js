const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    default: ""
  },
  mobile: {
    type: String,
    default: ""
  },
  address: {
    type: String,
    default: ""
  },
  password: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String,
    default: null
  },
  otpExpiresAt: {
    type: Date,
    default: null
  },
  refreshToken: {
    type: String,
    default: null
  },
  grade: {
    type: String,
    default: ""
  },
  interests: {
    type: [String],
    default: []
  },
  academicProfile: {
    extractedMarks: [{ subject: String, score: String }],
    evaluationSummary: { type: String, default: "" }
  },
  gamification: {
    streak: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null },
    dailyChallenge: {
      text: { type: String, default: "" },
      isCompleted: { type: Boolean, default: false },
      dateAssigned: { type: String, default: "" } // YYYY-MM-DD
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
