const express = require('express');
const router = express.Router();
const { registerFirebase, loginFirebase, refreshToken, logout } = require('../controllers/authController');

router.post('/register-firebase', registerFirebase);
router.post('/login-firebase', loginFirebase);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

module.exports = router;
