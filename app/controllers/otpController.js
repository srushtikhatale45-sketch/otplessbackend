const { OTPVerification, User } = require('../models');
const otpService = require('../services/otpService');
const { Op } = require('sequelize');

const otpController = {
  async sendOTP(req, res) {
    try {
      const { userId, purpose = 'login' } = req.body;
      
      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const result = await otpService.sendOTP(userId, purpose);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP'
      });
    }
  },

  async verifyOTP(req, res) {
    try {
      const { userId, otpCode, purpose = 'login' } = req.body;

      if (!userId || !otpCode) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'User ID and OTP code are required'
        });
      }

      const result = await otpService.verifyOTP(userId, otpCode, purpose);
      
      if (result.verified && purpose === 'registration') {
        await User.update(
          { isVerified: true },
          { where: { id: userId } }
        );
      }

      res.json(result);
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        verified: false,
        message: 'Failed to verify OTP'
      });
    }
  },

  async resendOTP(req, res) {
    try {
      const { userId, purpose = 'login' } = req.body;

      const recentOTP = await OTPVerification.findOne({
        where: {
          userId,
          purpose,
          isUsed: false,
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

      const result = await otpService.sendOTP(userId, purpose);
      res.json(result);
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP'
      });
    }
  },

  async checkOTPStatus(req, res) {
    try {
      const { userId } = req.params;

      const validOTP = await OTPVerification.findOne({
        where: {
          userId,
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date()
          }
        },
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        hasValidOTP: !!validOTP,
        expiresAt: validOTP ? validOTP.expiresAt : null,
        attempts: validOTP ? validOTP.attempts : 0
      });
    } catch (error) {
      console.error('Check OTP status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check OTP status'
      });
    }
  },

  async testSendOTP(req, res) {
    try {
      const { email, phone } = req.body;
      
      let user = await User.findOne({
        where: {
          [Op.or]: [
            { email: email || 'test@example.com' },
            { phone: phone || '1234567890' }
          ]
        }
      });

      if (!user) {
        const client = await Client.findOne();
        if (!client) {
          return res.status(400).json({
            success: false,
            message: 'No client found. Please create a client first.'
          });
        }

        user = await User.create({
          name: 'Test User',
          email: email || 'test@example.com',
          phone: phone || '1234567890',
          password: await bcrypt.hash('test123', 10),
          clientId: client.id,
          isVerified: false
        });
      }

      const result = await otpService.sendOTP(user.id, 'login');
      res.json({
        ...result,
        testUserId: user.id,
        note: 'This is a test endpoint. In production, OTP would be sent via email/SMS.'
      });
    } catch (error) {
      console.error('Test send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test OTP'
      });
    }
  },

  async testVerifyOTP(req, res) {
    try {
      const { userId, otpCode } = req.body;

      if (!userId || !otpCode) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'User ID and OTP code are required for testing'
        });
      }

      const result = await otpService.verifyOTP(userId, otpCode, 'login');
      res.json(result);
    } catch (error) {
      console.error('Test verify OTP error:', error);
      res.status(500).json({
        success: false,
        verified: false,
        message: 'Failed to verify test OTP'
      });
    }
  }
};

module.exports = otpController;