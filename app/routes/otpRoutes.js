const express = require('express');
const otpController = require('../controllers/otpController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Protected routes (require authentication)
router.post('/send', authMiddleware.verifyAccessToken, otpController.sendOTP);
router.post('/verify', authMiddleware.verifyAccessToken, otpController.verifyOTP);
router.post('/resend', authMiddleware.verifyAccessToken, otpController.resendOTP);
router.get('/check-status/:userId', authMiddleware.verifyAccessToken, otpController.checkOTPStatus);

// Public routes (for testing/development)
router.post('/test-send', otpController.testSendOTP);
router.post('/test-verify', otpController.testVerifyOTP);

module.exports = router;