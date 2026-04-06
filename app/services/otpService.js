const { Op } = require('sequelize');
const { OTPVerification, User } = require('../models');
const { generateOTP } = require('../utils/generateOTP');

class OTPService {
  async sendOTP(userId, purpose = 'login') {
    try {
      console.log(`Sending OTP for user ${userId}, purpose: ${purpose}`);
      
      // Delete existing unused OTPs for this user and purpose
      await OTPVerification.destroy({
        where: {
          userId,
          purpose,
          isUsed: false
        }
      });

      const otpCode = generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      const otpRecord = await OTPVerification.create({
        userId,
        otpCode,
        purpose,
        expiresAt,
        isUsed: false,
        attempts: 0
      });

      console.log(`OTP generated for user ${userId}: ${otpCode}`);
      
      return {
        success: true,
        message: 'OTP sent successfully',
        otpId: otpRecord.id,
        otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP'
      };
    }
  }

  async verifyOTP(userId, otpCode, purpose = 'login') {
    try {
      console.log(`Verifying OTP for user ${userId}: ${otpCode}`);
      
      const otpRecord = await OTPVerification.findOne({
        where: {
          userId,
          purpose,
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date()
          }
        },
        order: [['createdAt', 'DESC']]
      });

      if (!otpRecord) {
        console.log('No valid OTP found');
        return {
          success: false,
          verified: false,
          message: 'No valid OTP found. Please request a new OTP.'
        };
      }

      if (otpRecord.attempts >= 3) {
        await otpRecord.destroy();
        console.log('Max attempts exceeded');
        return {
          success: false,
          verified: false,
          message: 'Maximum attempts exceeded. Please request a new OTP.'
        };
      }

      if (otpRecord.otpCode !== otpCode) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        console.log(`Invalid OTP. Attempts: ${otpRecord.attempts}`);
        
        return {
          success: true,
          verified: false,
          message: `Invalid OTP. ${3 - otpRecord.attempts} attempts remaining.`
        };
      }

      // Mark OTP as used
      otpRecord.isUsed = true;
      await otpRecord.save();

      // Update user verification status if purpose is registration
      if (purpose === 'registration') {
        await User.update({ isVerified: true }, { where: { id: userId } });
        console.log('User verified successfully');
      }

      console.log('OTP verified successfully');
      return {
        success: true,
        verified: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        verified: false,
        message: 'Failed to verify OTP'
      };
    }
  }
}

module.exports = new OTPService();