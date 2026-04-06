const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { RefreshToken } = require('../models');
const { Op } = require('sequelize');

class TokenService {
  generateAccessToken(user) {
    const payload = { 
      userId: user.id, 
      mobileNumber: user.mobileNumber,
      name: user.name,
      isVerified: user.isVerified
    };
    
    const token = jwt.sign(
      payload,
      process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_key_please_change',
      { expiresIn: '15m' }
    );
    
    console.log('✅ Access token generated for user:', user.mobileNumber);
    console.log('   Token expires in: 15 minutes');
    return token;
  }

  generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  async createRefreshToken(userId, deviceInfo = null, ipAddress = null) {
    try {
      const refreshToken = this.generateRefreshToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const token = await RefreshToken.create({
        token: refreshToken,
        userId,
        expiresAt,
        deviceInfo: deviceInfo ? { userAgent: deviceInfo } : null,
        ipAddress,
        isRevoked: false
      });

      console.log('✅ Refresh token created for user:', userId);
      console.log('   Expires in: 7 days');
      return token;
    } catch (error) {
      console.error('❌ Error creating refresh token:', error);
      throw error;
    }
  }

  async verifyRefreshToken(token) {
    try {
      console.log('🔍 Verifying refresh token...');
      
      const refreshToken = await RefreshToken.findOne({
        where: {
          token: token,
          isRevoked: false,
          expiresAt: {
            [Op.gt]: new Date()
          }
        }
      });

      if (!refreshToken) {
        console.log('❌ Refresh token not found or expired');
        return { valid: false, message: 'Invalid or expired refresh token' };
      }

      const User = require('../models').User;
      const user = await User.findByPk(refreshToken.userId);
      
      if (!user) {
        console.log('❌ User not found for refresh token');
        return { valid: false, message: 'User not found' };
      }

      console.log('✅ Refresh token verified for user:', user.mobileNumber);
      return { valid: true, user: user, refreshToken: refreshToken };
    } catch (error) {
      console.error('❌ Refresh token verification error:', error);
      return { valid: false, message: 'Token verification failed' };
    }
  }

  async revokeRefreshToken(token) {
    try {
      const refreshToken = await RefreshToken.findOne({ where: { token } });
      if (refreshToken) {
        refreshToken.isRevoked = true;
        await refreshToken.save();
        console.log('✅ Refresh token revoked');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Revoke refresh token error:', error);
      return false;
    }
  }

  async revokeAllUserTokens(userId) {
    try {
      const result = await RefreshToken.update(
        { isRevoked: true },
        { where: { userId, isRevoked: false } }
      );
      console.log(`✅ Revoked ${result[0]} tokens for user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Revoke all tokens error:', error);
      return false;
    }
  }

  async cleanupExpiredTokens() {
    try {
      const deleted = await RefreshToken.destroy({
        where: {
          expiresAt: {
            [Op.lt]: new Date()
          }
        }
      });
      if (deleted > 0) {
        console.log(`🧹 Cleaned up ${deleted} expired refresh tokens`);
      }
      return deleted;
    } catch (error) {
      console.error('❌ Cleanup tokens error:', error);
      return 0;
    }
  }
}

module.exports = new TokenService();