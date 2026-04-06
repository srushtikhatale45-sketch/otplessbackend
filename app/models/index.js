const sequelize = require('../config/database');
const User = require('./User');
const Client = require('./Client');
const OTPVerification = require('./OTPVerification');
const RefreshToken = require('./RefreshToken');

// Define associations
User.belongsTo(Client, { foreignKey: 'clientId' });
Client.hasMany(User, { foreignKey: 'clientId' });

User.hasMany(OTPVerification, { foreignKey: 'userId' });
OTPVerification.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(RefreshToken, { foreignKey: 'userId' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Client,
  OTPVerification,
  RefreshToken
};