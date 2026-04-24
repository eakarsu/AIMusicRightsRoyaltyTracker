const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Contract = sequelize.define('Contract', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  contractName: { type: DataTypes.STRING, allowNull: false },
  partyA: { type: DataTypes.STRING, allowNull: false },
  partyB: { type: DataTypes.STRING, allowNull: false },
  contractType: { type: DataTypes.STRING },
  startDate: { type: DataTypes.DATEONLY },
  endDate: { type: DataTypes.DATEONLY },
  value: { type: DataTypes.DECIMAL(12, 2) },
  royaltyRate: { type: DataTypes.DECIMAL(5, 2) },
  territory: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'active' },
  terms: { type: DataTypes.TEXT },
  autoRenew: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'contracts', timestamps: true });

module.exports = Contract;
