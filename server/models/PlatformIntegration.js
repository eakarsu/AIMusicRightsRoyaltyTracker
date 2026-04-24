const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlatformIntegration = sequelize.define('PlatformIntegration', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  platformName: { type: DataTypes.STRING, allowNull: false },
  songTitle: { type: DataTypes.STRING, allowNull: false },
  externalId: { type: DataTypes.STRING },
  totalStreams: { type: DataTypes.BIGINT, defaultValue: 0 },
  totalRevenue: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  lastSyncDate: { type: DataTypes.DATE },
  status: { type: DataTypes.STRING, defaultValue: 'connected' },
  region: { type: DataTypes.STRING },
  apiEndpoint: { type: DataTypes.STRING },
  monthlyListeners: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'platform_integrations', timestamps: true });

module.exports = PlatformIntegration;
