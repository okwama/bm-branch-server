const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get requests for a specific date
router.get('/', requestController.getRequests);

// Create a new request
router.post('/', requestController.createRequest);

// Update a request
router.put('/:id', requestController.updateRequest);

// Delete a request
router.delete('/:id', requestController.deleteRequest);

// Update request status
router.patch('/:id/status', requestController.updateStatus);

module.exports = router; 