const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, resendOTP, getSMSBalance } = require('../controllers/otpController');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.get('/balance', getSMSBalance);  // New route to check SMS balance

module.exports = router;