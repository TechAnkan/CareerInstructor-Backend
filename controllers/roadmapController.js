const Roadmap = require('../models/Roadmap');

// @route   POST /api/roadmaps
// @desc    Save a new roadmap for the user
// @access  Private
exports.saveRoadmap = async (req, res) => {
  try {
    const { careerTitle, careerId, color, steps } = req.body;
    
    // Check if user already has this roadmap
    let existingRoadmap = await Roadmap.findOne({ user: req.user.id, careerId });
    if (existingRoadmap) {
      return res.status(400).json({ message: "You have already saved this roadmap." });
    }

    const formattedSteps = steps.map(step => ({ title: step, completed: false }));

    const roadmap = await Roadmap.create({
      user: req.user.id,
      careerTitle,
      careerId,
      color,
      steps: formattedSteps
    });

    res.status(201).json(roadmap);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error saving roadmap." });
  }
};

// @route   GET /api/roadmaps
// @desc    Get all roadmaps for the logged-in user
// @access  Private
exports.getRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(roadmaps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching roadmaps." });
  }
};

// @route   PUT /api/roadmaps/:id/step
// @desc    Toggle a step's completion status
// @access  Private
exports.toggleStep = async (req, res) => {
  try {
    const { stepId } = req.body;
    const roadmap = await Roadmap.findOne({ _id: req.params.id, user: req.user.id });

    if (!roadmap) {
      return res.status(404).json({ message: "Roadmap not found." });
    }

    const step = roadmap.steps.id(stepId);
    if (!step) {
      return res.status(404).json({ message: "Step not found." });
    }

    step.completed = !step.completed;
    await roadmap.save(); // This will trigger the pre-save hook to recalculate progress

    res.status(200).json(roadmap);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating step." });
  }
};

// @route   DELETE /api/roadmaps/:id
// @desc    Delete a roadmap
// @access  Private
exports.deleteRoadmap = async (req, res) => {
  try {
    const roadmap = await Roadmap.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!roadmap) {
      return res.status(404).json({ message: "Roadmap not found." });
    }
    res.status(200).json({ message: "Roadmap deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error deleting roadmap." });
  }
};
