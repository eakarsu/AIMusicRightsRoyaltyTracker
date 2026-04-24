const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RoyaltyCalculation = sequelize.define('RoyaltyCalculation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  songTitle: { type: DataTypes.STRING, allowNull: false },
  platform: { type: DataTypes.STRING, allowNull: false },
  streams: { type: DataTypes.BIGINT, defaultValue: 0 },
  downloads: { type: DataTypes.INTEGER, defaultValue: 0 },
  period: { type: DataTypes.STRING },
  ratePerStream: { type: DataTypes.DECIMAL(8, 6) },
  totalRoyalty: { type: DataTypes.DECIMAL(12, 2) },
  artistShare: { type: DataTypes.DECIMAL(12, 2) },
  labelShare: { type: DataTypes.DECIMAL(12, 2) },
  publisherShare: { type: DataTypes.DECIMAL(12, 2) },
  status: { type: DataTypes.STRING, defaultValue: 'calculated' },
  paymentDate: { type: DataTypes.DATEONLY }
}, { tableName: 'royalty_calculations', timestamps: true });

module.exports = RoyaltyCalculation;
