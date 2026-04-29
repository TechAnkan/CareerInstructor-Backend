const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/aiController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/chat', chat);

module.exports = router;
