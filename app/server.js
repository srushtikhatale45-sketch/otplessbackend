const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');

// Load environment variables from the correct location
dotenv.config({ path: path.join(__dirname, '../.env') });

const { connectDB } = require('./config/database');
const { syncDatabase } = require('./models');
const otpRoutes = require('./routes/otpRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;



const allowedOrigins = [
  'http://localhost:5173',
  'https://otplessfrontendfinal.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow Postman

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/otp', otpRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    await syncDatabase();
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
      console.log(`\n📝 Available Routes:`);
      console.log(`   POST   /api/otp/send-otp`);
      console.log(`   POST   /api/otp/verify-otp`);
      console.log(`   POST   /api/otp/resend-otp`);
      console.log(`   POST   /api/auth/login`);
      console.log(`   POST   /api/auth/refresh-token`);
      console.log(`   POST   /api/auth/logout`);
      console.log(`   GET    /api/auth/me`);
      console.log(`   GET    /api/auth/check\n`);
    });
  } catch (error) {
    console.error('Failed to start server try again :', error);
    process.exit(1);
  }
};

startServer();