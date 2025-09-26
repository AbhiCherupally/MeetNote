const express = require('express');
const router = express.Router();

router.get('/settings', (req, res) => {
  res.json({ success: true, message: 'Extension settings' });
});

module.exports = router;