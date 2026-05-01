const express = require('express');
const router = express.Router();
const { getGamificationData, completeChallenge } = require('../controllers/gamificationController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', getGamificationData);
router.post('/complete', completeChallenge);

module.exports = router;
