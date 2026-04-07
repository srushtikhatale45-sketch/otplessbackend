const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const otpService = require('../services/otpService');
const tokenService = require('../services/tokenService');
const { Op } = require('sequelize');

const authController = {
  async register(req, res) {
    try {
      const { name, mobileNumber, password } = req.body;

      console.log('📝 Registration attempt for mobile:', mobileNumber);

      // Validation
      if (!name || !mobileNumber || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, mobile number and password are required'
        });
      }

      // Mobile number validation
      const mobileRegex = /^[0-9]{10}$/;
      if (!mobileRegex.test(mobileNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mobile number. Please enter a valid 10-digit mobile number'
        });
      }

      // Check if user exists
      const existingUser = await User.findOne({ where: { mobileNumber } });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this mobile number'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        mobileNumber,
        password: hashedPassword,
        isVerified: false
      });

      console.log('✅ User registered:', user.id);

      // Send OTP
      const otpResult = await otpService.sendOTP(user.id, 'registration');

      if (!otpResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP'
        });
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please verify OTP.',
        userId: user.id,
        otpId: otpResult.otpId,
  
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed: ' + error.message
      });
    }
  },

  async verifyOTPAndGenerateTokens(req, res) {
    try {
      const { userId, otpCode, purpose, deviceInfo, ipAddress } = req.body;

      console.log('🔐 Verifying OTP for user:', userId);

      const result = await otpService.verifyOTP(userId, otpCode, purpose);

      if (!result.verified) {
        return res.json({
          success: false,
          verified: false,
          message: result.message
        });
      }

      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Generate tokens
      const accessToken = tokenService.generateAccessToken(user);
      const refreshTokenObj = await tokenService.createRefreshToken(
        userId, 
        deviceInfo || req.headers['user-agent'] || 'unknown',
        ipAddress || req.ip || req.connection.remoteAddress
      );

      console.log('🎫 Tokens generated for user:', user.mobileNumber);
      console.log('   Access Token:', accessToken.substring(0, 50) + '...');
      console.log('   Refresh Token:', refreshTokenObj.token.substring(0, 50) + '...');

      // Set Access Token in HTTP-only cookie
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: false, // Set to false for development (HTTP)
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/',
        domain: 'localhost'
      });

      // Set Refresh Token in HTTP-only cookie
      res.cookie('refreshToken', refreshTokenObj.token, {
        httpOnly: true,
        secure: false, // Set to false for development (HTTP)
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
        domain: 'localhost'
      });

      console.log('🍪 Cookies set successfully');

      return res.json({
        success: true,
        verified: true,
        message: result.message,
        user: {
          id: user.id,
          name: user.name,
          mobileNumber: user.mobileNumber,
          isVerified: user.isVerified
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

  async login(req, res) {
    try {
      const { mobileNumber, password } = req.body;

      console.log('🔑 Login attempt for mobile:', mobileNumber);

      if (!mobileNumber || !password) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number and password are required'
        });
      }

      const user = await User.findOne({ where: { mobileNumber } });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Send OTP
      const otpResult = await otpService.sendOTP(user.id, 'login');

      if (!otpResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP'
        });
      }

      res.json({
        success: true,
        message: 'OTP sent successfully',
        userId: user.id,
        otpId: otpResult.otpId,
        otpCode: otpResult.otpCode // Only in development
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed: ' + error.message
      });
    }
  },

  async refreshAccessToken(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      console.log('🔄 Refresh token request received');
      console.log('   Cookie present:', !!refreshToken);

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token not found'
        });
      }

      const result = await tokenService.verifyRefreshToken(refreshToken);

      if (!result.valid) {
        return res.status(401).json({
          success: false,
          message: result.message
        });
      }

      // Generate new access token
      const newAccessToken = tokenService.generateAccessToken(result.user);

      console.log('✅ New access token generated for user:', result.user.mobileNumber);

      // Set new access token in cookie
      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/',
        domain: 'localhost'
      });

      res.json({
        success: true,
        message: 'Access token refreshed successfully'
      });
    } catch (error) {
      console.error('❌ Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token: ' + error.message
      });
    }
  },

  async logout(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      
      if (refreshToken) {
        await tokenService.revokeRefreshToken(refreshToken);
      }
      
      // Clear cookies
      res.clearCookie('accessToken', { path: '/', domain: 'localhost' });
      res.clearCookie('refreshToken', { path: '/', domain: 'localhost' });

      console.log('✅ User logged out successfully');

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  },

  async logoutAllDevices(req, res) {
    try {
      const userId = req.user.userId;
      
      await tokenService.revokeAllUserTokens(userId);
      
      res.clearCookie('accessToken', { path: '/', domain: 'localhost' });
      res.clearCookie('refreshToken', { path: '/', domain: 'localhost' });

      console.log('✅ User logged out from all devices:', userId);

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });
    } catch (error) {
      console.error('❌ Logout all devices error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout from all devices failed'
      });
    }
  },

  async getMe(req, res) {
    try {
      const user = await User.findByPk(req.user.userId, {
        attributes: ['id', 'name', 'mobileNumber', 'isVerified', 'createdAt']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('❌ Get me error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user information'
      });
    }
  },

  async resendOTP(req, res) {
    try {
      const { userId, purpose } = req.body;
      const result = await otpService.sendOTP(userId, purpose);
      res.json(result);
    } catch (error) {
      console.error('❌ Resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP'
      });
    }
  },

  async checkAuth(req, res) {
    try {
      const accessToken = req.cookies?.accessToken;
      const refreshToken = req.cookies?.refreshToken;
      
      console.log('🔍 Check auth - Access token:', !!accessToken);
      console.log('🔍 Check auth - Refresh token:', !!refreshToken);
      
      if (!accessToken) {
        return res.json({
          success: true,
          isAuthenticated: false,
          message: 'No access token found'
        });
      }

      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_key_please_change');
        const user = await User.findByPk(decoded.userId, {
          attributes: ['id', 'name', 'mobileNumber', 'isVerified']
        });
        
        if (user) {
          console.log('✅ User authenticated:', user.mobileNumber);
          res.json({
            success: true,
            isAuthenticated: true,
            user
          });
        } else {
          res.json({
            success: true,
            isAuthenticated: false,
            message: 'User not found'
          });
        }
      } catch (error) {
        console.log('❌ Token verification failed:', error.message);
        
        // Try to refresh token if available
        if (refreshToken) {
          console.log('🔄 Attempting to refresh token...');
          // You can implement auto-refresh here
        }
        
        res.json({
          success: true,
          isAuthenticated: false,
          message: 'Token expired or invalid'
        });
      }
    } catch (error) {
      console.error('❌ Check auth error:', error);
      res.status(500).json({
        success: false,
        isAuthenticated: false
      });
    }
  }
};

module.exports = authController;