const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mobileNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'mobile_number'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified'
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'refresh_token'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Hash refresh token before saving
User.prototype.hashRefreshToken = async function(token) {
  const salt = await bcrypt.genSalt(10);
  this.refreshToken = await bcrypt.hash(token, salt);
  await this.save();
};

// Verify refresh token
User.prototype.verifyRefreshToken = async function(token) {
  if (!this.refreshToken) return false;
  return await bcrypt.compare(token, this.refreshToken);
};

module.exports = User;