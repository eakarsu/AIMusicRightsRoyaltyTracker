const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ArtistWriter = sequelize.define('ArtistWriter', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  ipi: { type: DataTypes.STRING },
  pro: { type: DataTypes.STRING },
  publisher: { type: DataTypes.STRING },
  defaultSplit: { type: DataTypes.DECIMAL(5, 2) },
  totalEarnings: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  catalogCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.STRING, defaultValue: 'active' }
}, { tableName: 'artist_writers', timestamps: true });

module.exports = ArtistWriter;
