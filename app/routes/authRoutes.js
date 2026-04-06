const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTPAndGenerateTokens);
router.post('/resend-otp', authController.resendOTP);
router.post('/refresh-token', authController.refreshAccessToken);
router.post('/logout', authController.logout);
router.get('/check-auth', authController.checkAuth);

// Protected routes
router.post('/logout-all', authMiddleware.verifyAccessToken, authController.logoutAllDevices);
router.get('/me', authMiddleware.verifyAccessToken, authController.getMe);

module.exports = router;