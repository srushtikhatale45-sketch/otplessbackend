const { User, OTPVerification } = require('../models');
const { generateOTP } = require('../utils/generateOTP');
const { Op } = require('sequelize');

const userController = {
  // Register new user
  async register(req, res) {
    try {
      const { name, mobileNumber } = req.body;

      console.log('📝 Registration attempt for mobile:', mobileNumber);

      if (!name || !mobileNumber) {
        return res.status(400).json({
          success: false,
          message: 'Name and mobile number are required'
        });
      }

      const mobileRegex = /^[0-9]{10}$/;
      if (!mobileRegex.test(mobileNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mobile number. Please enter a valid 10-digit mobile number'
        });
      }

      const existingUser = await User.findOne({ where: { mobileNumber } });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this mobile number',
          user: {
            id: existingUser.id,
            name: existingUser.name,
            mobileNumber: existingUser.mobileNumber,
            isVerified: existingUser.isVerified
          }
        });
      }

      const user = await User.create({
        name,
        mobileNumber,
        isVerified: false
      });

      console.log('✅ User registered:', user.id);

      const otpResult = await userController.sendOTPInternal(user.id);

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please verify OTP.',
        userId: user.id,
        mobileNumber: user.mobileNumber,
        name: user.name
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed: ' + error.message
      });
    }
  },

  // Internal method to send OTP
  async sendOTPInternal(userId) {
    try {
      await OTPVerification.destroy({
        where: {
          userId,
          isUsed: false
        }
      });

      const otpCode = generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      await OTPVerification.create({
        userId,
        otpCode,
        purpose: 'verification',
        expiresAt,
        isUsed: false,
        attempts: 0
      });

      console.log(`📱 OTP generated for user ${userId}: ${otpCode}`);
      
      return {
        success: true,
        message: 'OTP sent successfully'
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP'
      };
    }
  },

  // Send OTP endpoint
  async sendOTP(req, res) {
    try {
      const { mobileNumber } = req.body;

      console.log('📱 Send OTP request for mobile:', mobileNumber);

      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number is required'
        });
      }

      const user = await User.findOne({ where: { mobileNumber } });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this mobile number'
        });
      }

      const result = await userController.sendOTPInternal(user.id);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'OTP sent successfully',
          userId: user.id
        });
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP: ' + error.message
      });
    }
  },

  // Verify OTP
  async verifyOTP(req, res) {
    try {
      const { mobileNumber, otpCode } = req.body;

      console.log('🔐 Verifying OTP for mobile:', mobileNumber);

      if (!mobileNumber || !otpCode) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'Mobile number and OTP code are required'
        });
      }

      const user = await User.findOne({ where: { mobileNumber } });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          verified: false,
          message: 'User not found with this mobile number'
        });
      }

      const otpRecord = await OTPVerification.findOne({
        where: {
          userId: user.id,
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date()
          }
        },
        order: [['createdAt', 'DESC']]
      });

      if (!otpRecord) {
        return res.json({
          success: false,
          verified: false,
          message: 'No valid OTP found. Please request a new OTP.'
        });
      }

      if (otpRecord.attempts >= 3) {
        await otpRecord.destroy();
        return res.json({
          success: false,
          verified: false,
          message: 'Maximum attempts exceeded. Please request a new OTP.'
        });
      }

      if (otpRecord.otpCode !== otpCode) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        
        const remainingAttempts = 3 - otpRecord.attempts;
        return res.json({
          success: true,
          verified: false,
          message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
        });
      }

      otpRecord.isUsed = true;
      await otpRecord.save();

      user.isVerified = true;
      await user.save();

      console.log('✅ User verified successfully:', user.mobileNumber);

      res.json({
        success: true,
        verified: true,
        message: 'Mobile number verified successfully!',
        user: {
          id: user.id,
          name: user.name,
          mobileNumber: user.mobileNumber,
          isVerified: user.isVerified,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('❌ OTP verification error:', error);
      res.status(500).json({
        success: false,
        verified: false,
        message: 'OTP verification failed: ' + error.message
      });
    }
  },

  // Get user profile
  async getProfile(req, res) {
    try {
      const { mobileNumber } = req.params;

      console.log('👤 Fetching profile for mobile:', mobileNumber);

      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number is required'
        });
      }

      const user = await User.findOne({ 
        where: { mobileNumber },
        attributes: ['id', 'name', 'mobileNumber', 'isVerified', 'createdAt', 'updatedAt']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this mobile number'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('❌ Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile: ' + error.message
      });
    }
  },

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { mobileNumber } = req.params;
      const { name } = req.body;

      console.log('✏️ Updating profile for mobile:', mobileNumber);

      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number is required'
        });
      }

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required for update'
        });
      }

      const user = await User.findOne({ where: { mobileNumber } });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this mobile number'
        });
      }

      user.name = name;
      await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          name: user.name,
          mobileNumber: user.mobileNumber,
          isVerified: user.isVerified,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      console.error('❌ Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile: ' + error.message
      });
    }
  },

  // Get all users
  async getAllUsers(req, res) {
    try {
      console.log('📋 Fetching all users');

      const users = await User.findAll({
        attributes: ['id', 'name', 'mobileNumber', 'isVerified', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        count: users.length,
        users
      });
    } catch (error) {
      console.error('❌ Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users: ' + error.message
      });
    }
  },

  // Delete user
  async deleteUser(req, res) {
    try {
      const { mobileNumber } = req.params;

      console.log('🗑️ Deleting user with mobile:', mobileNumber);

      const user = await User.findOne({ where: { mobileNumber } });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await OTPVerification.destroy({ where: { userId: user.id } });
      await user.destroy();

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user: ' + error.message
      });
    }
  },

  // Check if user exists
  async checkUserExists(req, res) {
    try {
      const { mobileNumber } = req.params;

      const user = await User.findOne({ 
        where: { mobileNumber },
        attributes: ['id', 'name', 'mobileNumber', 'isVerified']
      });

      res.json({
        success: true,
        exists: !!user,
        user: user || null
      });
    } catch (error) {
      console.error('❌ Check user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check user: ' + error.message
      });
    }
  },

  // Resend OTP
  async resendOTP(req, res) {
    try {
      const { mobileNumber } = req.body;

      console.log('🔄 Resend OTP request for mobile:', mobileNumber);

      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number is required'
        });
      }

      const user = await User.findOne({ where: { mobileNumber } });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this mobile number'
        });
      }

      const recentOTP = await OTPVerification.findOne({
        where: {
          userId: user.id,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 1000)
          }
        }
      });

      if (recentOTP) {
        return res.status(429).json({
          success: false,
          message: 'Please wait 30 seconds before requesting a new OTP'
        });
      }

      const result = await userController.sendOTPInternal(user.id);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'OTP resent successfully',
          userId: user.id
        });
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('❌ Resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP: ' + error.message
      });
    }
  }
};

module.exports = userController;