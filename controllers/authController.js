const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebaseAdmin');

// Helper to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Generate Access and Refresh Tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secret_access_123', { expiresIn: '15m' }); // 15 mins
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || 'secret_refresh_456', { expiresIn: '7d' }); // 7 days
  return { accessToken, refreshToken };
};

exports.registerFirebase = async (req, res) => {
  try {
    const { name, mobile, address, idToken } = req.body;
    
    if (!idToken) return res.status(400).json({ message: "Firebase ID token is required." });

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Create user in MongoDB
    user = await User.create({ 
      email, 
      name, 
      mobile, 
      address, 
      isVerified: true, // Firebase handled verification (or handles it via email link)
      password: "firebase_user_no_password" // Placeholder since Firebase handles password
    });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({ 
      message: "Registration successful.", 
      accessToken, 
      user: { id: user._id, email: user.email } 
    });
  } catch (error) {
    console.error("Firebase register error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
};

exports.loginFirebase = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "Firebase ID token is required." });

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found. Please register first." });

    // Assuming if they logged in with Firebase, they own the email
    if (!user.isVerified) {
      user.isVerified = true;
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ message: "Login successful", accessToken, user: { id: user._id, email: user.email } });
  } catch (error) {
    console.error("Firebase login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    // In Express, you need cookie-parser to read req.cookies
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "No refresh token provided." });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'secret_refresh_456');
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token." });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ accessToken: tokens.accessToken });
  } catch (error) {
    console.error(error);
    res.status(403).json({ message: "Refresh token expired or invalid." });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const user = await User.findOne({ refreshToken });
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }
    res.clearCookie('refreshToken');
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during logout." });
  }
};
