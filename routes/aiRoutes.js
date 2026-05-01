const express = require('express');
const router = express.Router();
const { chat, generateRoadmap, generateSubtopics } = require('../controllers/aiController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect these routes so only logged in users can use the AI
router.use(authMiddleware);

router.post('/chat', chat);
router.post('/generate-roadmap', generateRoadmap);
router.post('/subtopics', generateSubtopics);

module.exports = router;
