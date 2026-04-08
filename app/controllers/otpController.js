const { Op } = require('sequelize');
const OTP = require('../models/OTP');
const User = require('../models/User');
const { sendOTPviaSMS } = require('../services/smsService');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Set cookies with tokens
const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000
  });
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

const sendOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || phoneNumber.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Valid phone number is required'
      });
    }

    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    const otpCode = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    
    await OTP.destroy({
      where: {
        phoneNumber: cleanPhoneNumber,
        isVerified: false
      }
    });
    
    const otpRecord = await OTP.create({
      phoneNumber: cleanPhoneNumber,
      otpCode: otpCode,
      expiresAt: expiresAt,
      attempts: 0
    });
    
    await sendOTPviaSMS(cleanPhoneNumber, otpCode);
    
    const responseData = {
      success: true,
      message: 'OTP sent successfully',
      otpId: otpRecord.id
    };
    
    if (process.env.NODE_ENV === 'development') {
      responseData.devOtp = otpCode;
    }
    
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otpCode, name } = req.body;
    
    if (!phoneNumber || !otpCode) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Phone number and OTP code are required'
      });
    }
    
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    
    const otpRecord = await OTP.findOne({
      where: {
        phoneNumber: cleanPhoneNumber,
        isVerified: false,
        expiresAt: {
          [Op.gt]: new Date()
        }
      },
      order: [['createdAt', 'DESC']]
    });
    
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'No valid OTP found. Please request a new OTP.'
      });
    }
    
    if (otpRecord.attempts >= 5) {
      await otpRecord.destroy();
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }
    
    if (otpRecord.otpCode === otpCode) {
      await otpRecord.update({ isVerified: true });
      
      // Find or create user
      let user = await User.findOne({
        where: { mobileNumber: cleanPhoneNumber }
      });
      
      if (!user) {
        user = await User.create({
          name: name || 'User',
          mobileNumber: cleanPhoneNumber,
          isVerified: true
        });
      } else {
        await user.update({ isVerified: true });
      }
      
      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      
      // Store refresh token
      await user.hashRefreshToken(refreshToken);
      await user.update({ lastLogin: new Date() });
      
      // Set cookies
      setTokenCookies(res, accessToken, refreshToken);
      
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'Phone number verified successfully',
        user: {
          id: user.id,
          name: user.name,
          mobileNumber: user.mobileNumber,
          isVerified: true
        }
      });
    } else {
      await otpRecord.update({
        attempts: otpRecord.attempts + 1
      });
      
      return res.status(400).json({
        success: false,
        verified: false,
        message: `Invalid OTP. ${5 - (otpRecord.attempts + 1)} attempts remaining.`
      });
    }
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      verified: false,
      message: 'Failed to verify OTP',
      error: error.message
    });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    
    const recentOTP = await OTP.findOne({
      where: {
        phoneNumber: cleanPhoneNumber,
        createdAt: {
          [Op.gt]: new Date(Date.now() - 30000)
        }
      }
    });
    
    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 30 seconds before requesting another OTP'
      });
    }
    
    const otpCode = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    
    await OTP.destroy({
      where: {
        phoneNumber: cleanPhoneNumber,
        isVerified: false
      }
    });
    
    const otpRecord = await OTP.create({
      phoneNumber: cleanPhoneNumber,
      otpCode: otpCode,
      expiresAt: expiresAt,
      attempts: 0
    });
    
    await sendOTPviaSMS(cleanPhoneNumber, otpCode);
    
    const responseData = {
      success: true,
      message: 'OTP resent successfully',
      otpId: otpRecord.id
    };
    
    if (process.env.NODE_ENV === 'development') {
      responseData.devOtp = otpCode;
    }
    
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: error.message
    });
  }
};

module.exports = { sendOTP, verifyOTP, resendOTP };