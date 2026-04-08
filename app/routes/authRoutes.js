const express = require('express');
const router = express.Router();
const { 
  loginUser, 
  refreshAccessToken, 
  logoutUser, 
  getCurrentUser, 
  checkAuth 
} = require('../controllers/authController');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', authenticateToken, logoutUser);
router.get('/me', authenticateToken, getCurrentUser);
router.get('/check', optionalAuth, checkAuth);

module.exports = router;