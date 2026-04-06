const jwt = require('jsonwebtoken');

const authMiddleware = {
  verifyAccessToken: (req, res, next) => {
    const token = req.cookies?.accessToken;

    console.log('Verifying access token:', token ? 'Present' : 'Missing');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = decoded;
      console.log('Access token verified for user:', decoded.email);
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(403).json({
        success: false,
        message: 'Invalid access token'
      });
    }
  },

  verifyRefreshTokenFromCookie: (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    req.refreshToken = refreshToken;
    next();
  }
};

module.exports = authMiddleware;