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
      if (!user.isVerified) {
        return res.status(200).json({ message: "Account created previously. Please check your email to verify your account before logging in.", requireVerification: true });
      }
      return res.status(400).json({ message: "User already exists." });
    }

    // Create user in MongoDB
    user = await User.create({ 
      email, 
      name, 
      mobile, 
      address, 
      isVerified: false, // Must be verified via email link
      password: "firebase_user_no_password"
    });

    res.status(200).json({ 
      message: "Registration successful. Please verify your email.",
      requireVerification: true
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

    // Check if email is verified in Firebase
    if (!decodedToken.email_verified) {
      return res.status(403).json({ message: "Please verify your email before logging in. Check your inbox for the verification link." });
    }

    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found. Please register first." });

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

exports.clearUnverifiedUser = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      if (userRecord.emailVerified === false) {
        // Delete from Firebase
        await admin.auth().deleteUser(userRecord.uid);
        // Delete from MongoDB if exists
        await User.deleteOne({ email });
        return res.status(200).json({ message: "Unverified account cleared." });
      } else {
        return res.status(400).json({ message: "Email is already in use by a verified account." });
      }
    } catch (firebaseErr) {
      if (firebaseErr.code === 'auth/user-not-found') {
        // User not in firebase, clean up mongodb just in case
        await User.deleteOne({ email });
        return res.status(200).json({ message: "Cleared." });
      }
      throw firebaseErr;
    }
  } catch (error) {
    console.error("Clear unverified error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
