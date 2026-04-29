const express = require('express');
const router = express.Router();
const { saveRoadmap, getRoadmaps, toggleStep, deleteRoadmap } = require('../controllers/roadmapController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/', saveRoadmap);
router.get('/', getRoadmaps);
router.put('/:id/step', toggleStep);
router.delete('/:id', deleteRoadmap);

module.exports = router;
