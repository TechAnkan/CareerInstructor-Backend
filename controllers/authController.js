const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Helper to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Generate Access and Refresh Tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secret_access_123', { expiresIn: '15m' }); // 15 mins
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || 'secret_refresh_456', { expiresIn: '7d' }); // 7 days
  return { accessToken, refreshToken };
};

// Simulated email sending (Ethereal Email)
const sendOTPEmail = async (email, otp) => {
  try {
    // Generate test SMTP service account from ethereal.email
    let testAccount = await nodemailer.createTestAccount();

    let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    let info = await transporter.sendMail({
      from: '"CareerGuider AI" <noreply@careerguider.com>',
      to: email,
      subject: "Your Registration OTP",
      text: `Your OTP for registration is ${otp}. It will expire in 10 minutes.`,
      html: `<b>Your OTP for registration is <span style="font-size:20px; color:indigo;">${otp}</span>.</b> <p>It will expire in 10 minutes.</p>`,
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // In development, return the preview URL so the user can easily click it
    return nodemailer.getTestMessageUrl(info);
  } catch (error) {
    console.error("Error sending OTP email:", error);
  }
};

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    let user = await User.findOne({ email });
    if (user && user.isVerified) {
      return res.status(400).json({ message: "User already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    if (user) {
      // Unverified user trying again
      user.password = hashedPassword;
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();
    } else {
      user = await User.create({ email, password: hashedPassword, otp, otpExpiresAt });
    }

    const previewUrl = await sendOTPEmail(email, otp);

    res.status(200).json({ 
      message: "OTP sent to email.", 
      email: user.email,
      previewUrl // ONLY FOR DEVELOPMENT
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during registration." });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found." });
    if (user.isVerified) return res.status(400).json({ message: "User already verified." });
    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP." });
    if (new Date() > user.otpExpiresAt) return res.status(400).json({ message: "OTP expired." });

    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;

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

    res.status(200).json({ message: "Verification successful.", accessToken, user: { id: user._id, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during OTP verification." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid credentials." });
    if (!user.isVerified) return res.status(400).json({ message: "Please verify your email first." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

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
    console.error(error);
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
