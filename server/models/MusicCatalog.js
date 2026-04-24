const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MusicCatalog = sequelize.define('MusicCatalog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  artist: { type: DataTypes.STRING, allowNull: false },
  album: { type: DataTypes.STRING },
  genre: { type: DataTypes.STRING },
  releaseDate: { type: DataTypes.DATEONLY },
  isrc: { type: DataTypes.STRING },
  duration: { type: DataTypes.INTEGER },
  bpm: { type: DataTypes.INTEGER },
  key: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'active' },
  estimatedValue: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 }
}, { tableName: 'music_catalog', timestamps: true });

module.exports = MusicCatalog;
