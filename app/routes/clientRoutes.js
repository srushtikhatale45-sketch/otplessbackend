const express = require('express');
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Public route - no authentication needed
router.post('/create', clientController.createClient);

// Protected routes
router.get('/list', authMiddleware.verifyAccessToken, clientController.getClients);

module.exports = router;