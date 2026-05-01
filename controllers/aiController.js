const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/User');

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
    
    const dbUser = await User.findById(req.user.id);
    let profileContext = "";
    if (dbUser && (dbUser.grade || dbUser.interests?.length > 0 || dbUser.academicProfile?.evaluationSummary)) {
      profileContext = `\n\nUser Profile Context: The student is in ${dbUser.grade || 'an unspecified grade'}. `;
      if (dbUser.interests?.length > 0) profileContext += `Interests: ${dbUser.interests.join(', ')}. `;
      if (dbUser.academicProfile?.evaluationSummary) profileContext += `\nAcademic Strengths (based on their marks sheet): ${dbUser.academicProfile.evaluationSummary}`;
      profileContext += "\nAlways try to weave these strengths and interests into your advice to make it highly personalized!";
    }

    // System instruction injected into the context implicitly
    formattedHistory.push({
      role: "user",
      parts: [{ text: "You are an expert, encouraging career guidance mentor for class 10 and 12 students. Keep your responses concise, helpful, and directly related to career paths, skills, colleges, and studying." + profileContext }]
    });
    formattedHistory.push({
      role: "model",
      parts: [{ text: "Understood! I am ready to help guide students towards their dream careers with highly personalized advice." }]
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

// @route   POST /api/ai/generate-roadmap
// @desc    Generate a custom career roadmap using Gemini
// @access  Private
exports.generateRoadmap = async (req, res) => {
  try {
    const { career } = req.body;
    if (!career) {
      return res.status(400).json({ message: "Career title is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey || apiKey === 'your_api_key_here') {
      // Fallback
      return setTimeout(() => {
        res.status(200).json({
          title: career,
          desc: `A simulated path for ${career}. Please add your API key for a real roadmap!`,
          color: "#3b82f6",
          steps: ["Learn the basics", "Gain practical experience", "Build a portfolio", "Apply for jobs"]
        });
      }, 1500);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const dbUser = await User.findById(req.user.id);
    let profileContext = "";
    if (dbUser && (dbUser.grade || dbUser.interests?.length > 0 || dbUser.academicProfile?.evaluationSummary)) {
      profileContext = `\nThe user is in ${dbUser.grade || 'an unspecified grade'}. Interests: ${dbUser.interests?.join(', ') || 'None specified'}. `;
      if (dbUser.academicProfile?.evaluationSummary) profileContext += `Academic Strengths: ${dbUser.academicProfile.evaluationSummary}. `;
      profileContext += "Tailor the roadmap specifically for this user's profile and strengths.";
    }

    const prompt = `Generate a career roadmap for '${career}'. ${profileContext} 
Respond strictly in valid JSON format with the following structure:
{
  "title": "A properly formatted title for the career",
  "desc": "A short, engaging description of what this career entails (max 2 sentences)",
  "color": "A hex color code that fits the vibe of this career",
  "steps": [
    "Step 1 description",
    "Step 2 description",
    "Step 3 description",
    "Step 4 description",
    "Step 5 description"
  ]
}
Do not include any markdown formatting like \`\`\`json. Just return the raw JSON object. Ensure the JSON is valid and parsable.`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    // Clean up potentially wrapped markdown (just in case)
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    const roadmapData = JSON.parse(responseText);

    res.status(200).json(roadmapData);

  } catch (error) {
    console.error("Gemini API Error during roadmap generation:", error);
    res.status(500).json({ message: "Failed to generate roadmap." });
  }
};

// @route   POST /api/ai/subtopics
// @desc    Generate subtopics/subjects for a specific roadmap step
// @access  Private
exports.generateSubtopics = async (req, res) => {
  try {
    const { careerTitle, stepTitle } = req.body;
    if (!careerTitle || !stepTitle) {
      return res.status(400).json({ message: "careerTitle and stepTitle are required." });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey || apiKey === 'your_api_key_here') {
      return setTimeout(() => {
        res.status(200).json(["Simulated Subject 1", "Simulated Subject 2", "Simulated Subject 3"]);
      }, 1000);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Generate a list of 3-5 core subjects, skills, or subtopics required for the step '${stepTitle}' in the career path of '${careerTitle}'. 
Respond strictly in valid JSON format as a flat array of strings. 
Example: ["Accounting", "Mercantile Law", "General Economics"]
Do not include any markdown formatting like \`\`\`json. Just return the raw JSON array.`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const subtopics = JSON.parse(responseText);

    res.status(200).json(subtopics);

  } catch (error) {
    console.error("Gemini API Error generating subtopics:", error);
    res.status(500).json({ message: "Failed to generate subtopics." });
  }
};
