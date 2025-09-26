const express = require('express');
const auth = require('../middleware/auth');
const Meeting = require('../models/Meeting');

const router = express.Router();

/**
 * @route   GET /api/meetings
 * @desc    Get user meetings
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const meetings = await Meeting.find({ user: req.user.userId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: { meetings }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/meetings
 * @desc    Create new meeting
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const meeting = new Meeting({
      ...req.body,
      user: req.user.userId
    });
    
    await meeting.save();
    
    res.status(201).json({
      success: true,
      data: meeting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;