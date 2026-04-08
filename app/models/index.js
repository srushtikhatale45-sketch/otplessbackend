const { sequelize } = require('../config/database');
const User = require('./User');
const OTP = require('./OTP');

const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ All models synced successfully');
  } catch (error) {
    console.error('❌ Error syncing models:', error);
  }
};

module.exports = { User, OTP, syncDatabase };