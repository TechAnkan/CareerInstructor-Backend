const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, evaluateMarksSheet } = require('../controllers/profileController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/evaluate-marks', evaluateMarksSheet);

module.exports = router;
