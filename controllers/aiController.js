const { GoogleGenerativeAI } = require('@google/generative-ai');

// @route   POST /api/ai/chat
// @desc    Generate AI Mentor response using Gemini
// @access  Private
exports.chat = async (req, res) => {
  try {
    const { message, history } = req.body;
    
    // Check if the user has provided the API key in the backend .env
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey || apiKey === 'your_api_key_here') {
      // Fallback if no API key is provided
      let reply = "I am currently running in Simulation Mode! 🤖\n\nTo unlock my real intelligence, please get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey), add `GEMINI_API_KEY=your_key` to the `backend/.env` file, and restart the backend server!";
      
      // Basic simulated response just in case they want to test the UI
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('science') || lowerMsg.includes('tech') || lowerMsg.includes('wbjee')) {
        reply = "Since you have a strong science background and interest in tech, fields like Software Engineering, Data Science, or Artificial Intelligence would be perfect for you! But seriously, add the API key so we can really talk! 😉";
      }

      return setTimeout(() => {
        res.status(200).json({ reply });
      }, 1000);
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We use gemini-2.5-flash as it is fast and efficient for text chat
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Format the conversation history for Gemini
    // Gemini expects an array of objects with { role: "user" | "model", parts: [{ text: "..." }] }
    const formattedHistory = [];
    
    // System instruction injected into the context implicitly
    formattedHistory.push({
      role: "user",
      parts: [{ text: "You are an expert, encouraging career guidance mentor for class 10 and 12 students. Keep your responses concise, helpful, and directly related to career paths, skills, colleges, and studying." }]
    });
    formattedHistory.push({
      role: "model",
      parts: [{ text: "Understood! I am ready to help guide students towards their dream careers." }]
    });

    if (history && history.length > 0) {
      history.forEach(msg => {
        formattedHistory.push({
          role: msg.sender === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        });
      });
    }

    // Start a chat session with the formatted history
    const chatSession = model.startChat({
      history: formattedHistory,
      generationConfig: {
        maxOutputTokens: 500, // Keep responses reasonably short
      },
    });

    // Send the user's message
    const result = await chatSession.sendMessage(message);
    const responseText = result.response.text();

    res.status(200).json({ reply: responseText });

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ message: "AI Server error.", reply: "Sorry, my neural networks are tangled up right now. Please try again later!" });
  }
};
