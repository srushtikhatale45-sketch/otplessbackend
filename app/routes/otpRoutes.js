const express = require('express');
const router = express.Router();
const { 
  sendOTP, 
  verifyOTP, 
  resendOTP, 
  getSMSBalance, 
  testSMS 
} = require('../controllers/otpController');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.get('/balance', getSMSBalance);
router.post('/test-sms', testSMS);

module.exports = router;