// @route   POST /api/ai/chat
// @desc    Simulate AI Mentor response
// @access  Private
exports.chat = async (req, res) => {
  try {
    const { message, history } = req.body;
    
    // In the future, this is where you'd call OpenAI or Gemini API:
    // const response = await openai.createChatCompletion({ ... });
    
    // Simulated AI Intelligence (Keyword based)
    let reply = "That's interesting! Tell me more about what you enjoy doing.";
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('math') || lowerMsg.includes('logic') || lowerMsg.includes('numbers')) {
      reply = "Since you like logic and numbers, Data Science or Software Engineering might be a great fit for you! Would you like me to add a basic 'Learn Python' roadmap to your profile?";
    } else if (lowerMsg.includes('art') || lowerMsg.includes('design') || lowerMsg.includes('drawing')) {
      reply = "A creative mind! UX/UI Design blends creativity with technology perfectly. Should we explore a design roadmap?";
    } else if (lowerMsg.includes('yes') || lowerMsg.includes('sure') || lowerMsg.includes('ok')) {
      reply = "Awesome! You can head over to the 3D Explore map to view these paths and start them, or I can answer more specific questions about them.";
    } else if (lowerMsg.includes('hack') || lowerMsg.includes('security') || lowerMsg.includes('protect')) {
      reply = "Cybersecurity is a booming field! It requires a solid understanding of networks and operating systems. Want to see the steps to get started?";
    } else if (history && history.length === 0) {
      reply = "Hello! I'm your AI Career Mentor. I'm here to help you discover your perfect career path. To get started, what are some of your favorite subjects in school?";
    }

    // Simulate API delay
    setTimeout(() => {
      res.status(200).json({ reply });
    }, 1500);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "AI Server error." });
  }
};
