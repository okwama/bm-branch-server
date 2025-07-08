const express = require('express');
const router = express.Router();
const runController = require('../controllers/runController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get date summaries
router.get('/summaries', runController.getDateSummaries);

// Get runs for a specific date
router.get('/', runController.getRuns);

// Create a new run
router.post('/', runController.createRun);

// Update a run
router.put('/:id', runController.updateRun);

// Delete a run
router.delete('/:id', runController.deleteRun);

// Update run status
router.patch('/:id/status', runController.updateStatus);

module.exports = router; 