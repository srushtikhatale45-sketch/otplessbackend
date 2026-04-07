const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

// Public routes - no authentication needed
router.post('/register', userController.register);
router.post('/send-otp', userController.sendOTP);
router.post('/verify-otp', userController.verifyOTP);
router.post('/resend-otp', userController.resendOTP);
router.get('/profile/:mobileNumber', userController.getProfile);
router.put('/update/:mobileNumber', userController.updateProfile);
router.get('/all', userController.getAllUsers);
router.get('/check/:mobileNumber', userController.checkUserExists);
router.delete('/delete/:mobileNumber', userController.deleteUser);

module.exports = router;