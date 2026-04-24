const sequelize = require('../config/database');
const User = require('./User');
const MusicCatalog = require('./MusicCatalog');
const RightsLicense = require('./RightsLicense');
const RoyaltyCalculation = require('./RoyaltyCalculation');
const PlatformIntegration = require('./PlatformIntegration');
const ArtistWriter = require('./ArtistWriter');
const Contract = require('./Contract');
const Payment = require('./Payment');

module.exports = {
  sequelize,
  User,
  MusicCatalog,
  RightsLicense,
  RoyaltyCalculation,
  PlatformIntegration,
  ArtistWriter,
  Contract,
  Payment
};
