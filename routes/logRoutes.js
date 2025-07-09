const express = require('express');
const router = express.Router();
const { receiveLog } = require('../controllers/logController');

// POST /api/logs - Receive log data from frontend
router.post('/', receiveLog);

module.exports = router; 