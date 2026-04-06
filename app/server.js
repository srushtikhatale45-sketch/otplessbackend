const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const otpRoutes = require('./routes/otpRoutes');
const tokenService = require('./services/tokenService');

const app = express();

// CORS configuration - MUST be before routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true, // MUST be true for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Cookies:`, req.cookies ? 'Present' : 'None');
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/otp', otpRoutes);

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', cookies: req.cookies ? 'present' : 'none' });
});

app.get('/api/debug-cookies', (req, res) => {
  console.log('🍪 Debug Cookies:', req.cookies);
  res.json({
    cookies: req.cookies,
    hasAccessToken: !!req.cookies?.accessToken,
    hasRefreshToken: !!req.cookies?.refreshToken,
    accessTokenValue: req.cookies?.accessToken ? req.cookies.accessToken.substring(0, 50) + '...' : null,
    refreshTokenValue: req.cookies?.refreshToken ? req.cookies.refreshToken.substring(0, 50) + '...' : null
  });
});

// Cleanup expired tokens every hour
setInterval(async () => {
  const deleted = await tokenService.cleanupExpiredTokens();
  if (deleted > 0) {
    console.log(`Cleaned up ${deleted} expired refresh tokens`);
  }
}, 60 * 60 * 1000);

// Database connection and server start
const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('Database connected successfully');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`CORS enabled for origins with credentials`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to database:', err);
  });