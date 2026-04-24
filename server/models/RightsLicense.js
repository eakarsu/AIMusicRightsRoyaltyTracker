const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RightsLicense = sequelize.define('RightsLicense', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  songTitle: { type: DataTypes.STRING, allowNull: false },
  licenseType: { type: DataTypes.STRING, allowNull: false },
  licensee: { type: DataTypes.STRING, allowNull: false },
  licensor: { type: DataTypes.STRING, allowNull: false },
  territory: { type: DataTypes.STRING },
  startDate: { type: DataTypes.DATEONLY },
  endDate: { type: DataTypes.DATEONLY },
  fee: { type: DataTypes.DECIMAL(12, 2) },
  royaltyRate: { type: DataTypes.DECIMAL(5, 2) },
  status: { type: DataTypes.STRING, defaultValue: 'active' },
  terms: { type: DataTypes.TEXT },
  exclusivity: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'rights_licenses', timestamps: true });

module.exports = RightsLicense;
