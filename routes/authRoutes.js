const express = require('express');
const router = express.Router();
const { register, verifyOTP, login, refreshToken, logout } = require('../controllers/authController');

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

module.exports = router;
