const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');

// Set cookies with tokens
const setTokenCookies = (res, accessToken, refreshToken) => {
  // Cookie options
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// Clear cookies
const clearTokenCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

// Login/Sync user after OTP verification
const loginUser = async (req, res) => {
  try {
    const { user } = req.body;
    
    if (!user || !user.id) {
      return res.status(400).json({
        success: false,
        message: 'User data required'
      });
    }
    
    const dbUser = await User.findByPk(user.id);
    
    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(dbUser);
    const refreshToken = generateRefreshToken(dbUser);
    
    // Hash and store refresh token in database
    await dbUser.hashRefreshToken(refreshToken);
    
    // Update last login
    await dbUser.update({ lastLogin: new Date() });
    
    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: dbUser.id,
        name: dbUser.name,
        mobileNumber: dbUser.mobileNumber,
        isVerified: dbUser.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message
    });
  }
};

// Refresh access token using refresh token
const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
        error: 'NO_REFRESH_TOKEN'
      });
    }
    
    const decoded = verifyRefreshToken(refreshToken);
    
    if (!decoded) {
      clearTokenCookies(res);
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired refresh token',
        error: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      clearTokenCookies(res);
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }
    
    // Verify refresh token matches stored hash
    const isValidToken = await user.verifyRefreshToken(refreshToken);
    
    if (!isValidToken) {
      clearTokenCookies(res);
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token',
        error: 'INVALID_TOKEN'
      });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(user);
    
    // Generate new refresh token (optional - for better security)
    const newRefreshToken = generateRefreshToken(user);
    await user.hashRefreshToken(newRefreshToken);
    
    // Set new cookies
    setTokenCookies(res, newAccessToken, newRefreshToken);
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    clearTokenCookies(res);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message
    });
  }
};

// Logout user
const logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (refreshToken && req.user) {
      // Clear refresh token from database
      await req.user.update({ refreshToken: null });
    }
    
    clearTokenCookies(res);
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    clearTokenCookies(res);
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
      error: error.message
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        mobileNumber: req.user.mobileNumber,
        isVerified: req.user.isVerified,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
};

// Check if user is authenticated
const checkAuth = async (req, res) => {
  try {
    if (req.user) {
      res.status(200).json({
        success: true,
        authenticated: true,
        user: {
          id: req.user.id,
          name: req.user.name,
          mobileNumber: req.user.mobileNumber,
          isVerified: req.user.isVerified
        }
      });
    } else {
      res.status(200).json({
        success: true,
        authenticated: false
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      authenticated: false,
      error: error.message
    });
  }
};

module.exports = {
  loginUser,
  refreshAccessToken,
  logoutUser,
  getCurrentUser,
  checkAuth,
  setTokenCookies,
  clearTokenCookies
};