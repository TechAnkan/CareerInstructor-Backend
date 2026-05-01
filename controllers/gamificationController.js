const User = require('../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

exports.getGamificationData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const todayStr = getTodayDateString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streakUpdated = false;
    let challengeUpdated = false;

    // 1. STREAK LOGIC
    if (!user.gamification.lastActiveDate) {
      // First time active
      user.gamification.streak = 1;
      user.gamification.lastActiveDate = new Date();
      streakUpdated = true;
    } else {
      const lastActive = new Date(user.gamification.lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);
      
      const diffTime = Math.abs(today - lastActive);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Logged in consecutive days
        user.gamification.streak += 1;
        user.gamification.lastActiveDate = new Date();
        streakUpdated = true;
      } else if (diffDays > 1) {
        // Streak broken
        user.gamification.streak = 1;
        user.gamification.lastActiveDate = new Date();
        streakUpdated = true;
      }
      // If diffDays === 0, it means they are active multiple times today, streak remains the same.
    }

    // 2. DAILY CHALLENGE LOGIC
    if (user.gamification.dailyChallenge.dateAssigned !== todayStr) {
      // Need a new challenge
      let newChallengeText = "Read one article about emerging tech in your field of interest."; // Fallback
      
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (apiKey && apiKey !== 'your_api_key_here') {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          
          let profileContext = "Generate a short, actionable daily learning challenge (max 1 sentence) for a student.";
          if (user.interests && user.interests.length > 0) {
            profileContext = `Generate a short, actionable daily learning challenge (max 1 sentence) for a student interested in: ${user.interests.join(', ')}.`;
          }

          const prompt = `${profileContext} The challenge should take less than 15 minutes to complete. Just return the text of the challenge directly, no quotes or formatting.`;
          
          const result = await model.generateContent(prompt);
          newChallengeText = result.response.text().trim();
        } catch (aiError) {
          console.error("Gemini failed to generate challenge:", aiError);
          // Keep fallback
        }
      }

      user.gamification.dailyChallenge = {
        text: newChallengeText,
        isCompleted: false,
        dateAssigned: todayStr
      };
      challengeUpdated = true;
    }

    if (streakUpdated || challengeUpdated) {
      await user.save();
    }

    res.status(200).json(user.gamification);

  } catch (error) {
    console.error("Error in getGamificationData:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.completeChallenge = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.gamification.dailyChallenge.isCompleted = true;
    await user.save();

    res.status(200).json(user.gamification);
  } catch (error) {
    console.error("Error in completeChallenge:", error);
    res.status(500).json({ message: "Server error" });
  }
};
