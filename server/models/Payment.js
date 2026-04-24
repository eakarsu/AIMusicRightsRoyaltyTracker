const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payee: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING, defaultValue: 'USD' },
  paymentMethod: { type: DataTypes.STRING },
  reference: { type: DataTypes.STRING },
  songTitle: { type: DataTypes.STRING },
  period: { type: DataTypes.STRING },
  platform: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  paymentDate: { type: DataTypes.DATEONLY },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'payments', timestamps: true });

module.exports = Payment;
