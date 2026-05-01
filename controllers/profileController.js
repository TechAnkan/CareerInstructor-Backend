const User = require('../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp -otpExpiresAt -refreshToken');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { grade, interests } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { grade, interests },
      { new: true }
    ).select('-password');
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};

exports.evaluateMarksSheet = async (req, res) => {
  try {
    const { imageBase64 } = req.body; // Expecting data:image/jpeg;base64,...
    
    if (!imageBase64) {
      return res.status(400).json({ message: "No image provided" });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'your_api_key_here') {
      // Simulation mode
      const user = await User.findById(req.user.id);
      user.academicProfile = {
        extractedMarks: [{ subject: "Simulation Science", score: "95/100" }, { subject: "Mock Math", score: "88/100" }],
        evaluationSummary: "Simulated evaluation: You show strong analytical skills based on your simulated math and science scores! (Add an API key for real evaluation)."
      };
      await user.save();
      return setTimeout(() => {
        res.status(200).json(user);
      }, 1500);
    }

    // Prepare image for Gemini
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const mimeType = imageBase64.substring(imageBase64.indexOf(":") + 1, imageBase64.indexOf(";"));

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use flash as it's fast and supports multimodal
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze this marks sheet/report card.
Extract the subjects and scores. Then, write a short 2-3 sentence evaluation summarizing the student's academic strengths and potential career inclinations based on these marks.
Respond strictly in valid JSON format with this exact structure:
{
  "extractedMarks": [
    { "subject": "Subject Name", "score": "Score/Max (e.g. 85/100)" }
  ],
  "evaluationSummary": "Your short summary of their strengths."
}
Do not include any markdown formatting like \`\`\`json.`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    const evaluationData = JSON.parse(responseText);

    const user = await User.findById(req.user.id);
    user.academicProfile = evaluationData;
    await user.save();

    res.status(200).json(user);

  } catch (error) {
    console.error("Error evaluating marks sheet:", error);
    res.status(500).json({ message: "Failed to evaluate marks sheet. Make sure the image is clear." });
  }
};
