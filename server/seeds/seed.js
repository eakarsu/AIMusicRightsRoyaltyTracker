require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const sequelize = require('../config/database');
const { User, MusicCatalog, RightsLicense, RoyaltyCalculation, PlatformIntegration, ArtistWriter, Contract, Payment } = require('../models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    await sequelize.sync({ force: true });
    console.log('Tables created.');

    // Users
    await User.create({ email: 'admin@musicrights.com', password: 'password123', name: 'Admin User', role: 'admin' });
    await User.create({ email: 'manager@musicrights.com', password: 'password123', name: 'Sarah Johnson', role: 'manager' });
    console.log('Users seeded.');

    // Music Catalog (15 items)
    const catalogData = [
      { title: 'Midnight Dreams', artist: 'Luna Eclipse', album: 'Starlight Sessions', genre: 'Pop', releaseDate: '2024-01-15', isrc: 'US-ABC-24-00001', duration: 234, bpm: 120, key: 'C Major', status: 'active', estimatedValue: 15000.00 },
      { title: 'Electric Soul', artist: 'The Voltage', album: 'Current Affairs', genre: 'Rock', releaseDate: '2023-06-20', isrc: 'US-ABC-23-00012', duration: 287, bpm: 140, key: 'E Minor', status: 'active', estimatedValue: 22000.00 },
      { title: 'Rhythm of Rain', artist: 'Aqua Beats', album: 'Weather Patterns', genre: 'R&B', releaseDate: '2024-03-10', isrc: 'US-ABC-24-00005', duration: 198, bpm: 95, key: 'G Major', status: 'active', estimatedValue: 18500.00 },
      { title: 'Golden Hour', artist: 'Sunset Drive', album: 'Pacific Coast', genre: 'Indie', releaseDate: '2023-09-05', isrc: 'US-ABC-23-00034', duration: 256, bpm: 110, key: 'D Major', status: 'active', estimatedValue: 12000.00 },
      { title: 'Neon Lights', artist: 'City Pulse', album: 'Urban Jungle', genre: 'Electronic', releaseDate: '2024-02-28', isrc: 'US-ABC-24-00008', duration: 312, bpm: 128, key: 'A Minor', status: 'active', estimatedValue: 28000.00 },
      { title: 'Whispers in the Wind', artist: 'Luna Eclipse', album: 'Starlight Sessions', genre: 'Pop', releaseDate: '2024-01-15', isrc: 'US-ABC-24-00002', duration: 210, bpm: 100, key: 'F Major', status: 'active', estimatedValue: 13000.00 },
      { title: 'Thunderstruck Love', artist: 'The Voltage', album: 'Current Affairs', genre: 'Rock', releaseDate: '2023-06-20', isrc: 'US-ABC-23-00013', duration: 295, bpm: 150, key: 'B Minor', status: 'active', estimatedValue: 19500.00 },
      { title: 'Velvet Skies', artist: 'Aqua Beats', album: 'Weather Patterns', genre: 'R&B', releaseDate: '2024-03-10', isrc: 'US-ABC-24-00006', duration: 225, bpm: 90, key: 'Eb Major', status: 'active', estimatedValue: 16000.00 },
      { title: 'Highway Serenade', artist: 'Sunset Drive', album: 'Pacific Coast', genre: 'Country', releaseDate: '2023-09-05', isrc: 'US-ABC-23-00035', duration: 240, bpm: 105, key: 'G Major', status: 'active', estimatedValue: 11000.00 },
      { title: 'Digital Hearts', artist: 'City Pulse', album: 'Urban Jungle', genre: 'Electronic', releaseDate: '2024-02-28', isrc: 'US-ABC-24-00009', duration: 340, bpm: 135, key: 'C Minor', status: 'active', estimatedValue: 25000.00 },
      { title: 'Autumn Leaves Fall', artist: 'Jazz Collective', album: 'Seasonal Moods', genre: 'Jazz', releaseDate: '2023-11-12', isrc: 'US-ABC-23-00050', duration: 380, bpm: 80, key: 'Bb Major', status: 'active', estimatedValue: 9000.00 },
      { title: 'Bass Drop Symphony', artist: 'DJ Nexus', album: 'Club Anthems', genre: 'EDM', releaseDate: '2024-04-01', isrc: 'US-ABC-24-00015', duration: 270, bpm: 145, key: 'F Minor', status: 'active', estimatedValue: 35000.00 },
      { title: 'Broken Chains', artist: 'Iron Will', album: 'Freedom Road', genre: 'Metal', releaseDate: '2023-08-18', isrc: 'US-ABC-23-00042', duration: 310, bpm: 170, key: 'D Minor', status: 'active', estimatedValue: 14000.00 },
      { title: 'Lullaby for Stars', artist: 'Dream Weaver', album: 'Cosmic Tales', genre: 'Ambient', releaseDate: '2024-05-20', isrc: 'US-ABC-24-00022', duration: 420, bpm: 60, key: 'Ab Major', status: 'active', estimatedValue: 7500.00 },
      { title: 'Fire and Ice', artist: 'Dual Nature', album: 'Contrasts', genre: 'Hip-Hop', releaseDate: '2024-06-15', isrc: 'US-ABC-24-00030', duration: 195, bpm: 88, key: 'E Minor', status: 'active', estimatedValue: 42000.00 }
    ];
    await MusicCatalog.bulkCreate(catalogData);
    console.log('Music catalog seeded (15 items).');

    // Rights & Licenses (15 items)
    const licensesData = [
      { songTitle: 'Midnight Dreams', licenseType: 'Mechanical', licensee: 'Spotify AB', licensor: 'Luna Eclipse Music LLC', territory: 'Worldwide', startDate: '2024-01-01', endDate: '2026-12-31', fee: 5000, royaltyRate: 12.5, status: 'active', terms: 'Standard mechanical license for streaming distribution', exclusivity: false },
      { songTitle: 'Electric Soul', licenseType: 'Sync', licensee: 'Netflix Inc', licensor: 'Voltage Records', territory: 'North America', startDate: '2024-03-01', endDate: '2025-03-01', fee: 25000, royaltyRate: 0, status: 'active', terms: 'One-time sync license for documentary series', exclusivity: true },
      { songTitle: 'Rhythm of Rain', licenseType: 'Performance', licensee: 'iHeartMedia', licensor: 'Aqua Music Group', territory: 'United States', startDate: '2024-02-15', endDate: '2025-02-15', fee: 3000, royaltyRate: 8.0, status: 'active', terms: 'Radio broadcast performance license', exclusivity: false },
      { songTitle: 'Golden Hour', licenseType: 'Master Use', licensee: 'Apple Inc', licensor: 'Sunset Records', territory: 'Worldwide', startDate: '2023-10-01', endDate: '2024-10-01', fee: 15000, royaltyRate: 5.0, status: 'expired', terms: 'Commercial advertisement usage', exclusivity: true },
      { songTitle: 'Neon Lights', licenseType: 'Mechanical', licensee: 'Apple Music', licensor: 'City Pulse Entertainment', territory: 'Worldwide', startDate: '2024-03-01', endDate: '2027-03-01', fee: 8000, royaltyRate: 15.0, status: 'active', terms: 'Digital distribution mechanical license', exclusivity: false },
      { songTitle: 'Whispers in the Wind', licenseType: 'Sync', licensee: 'Warner Bros Pictures', licensor: 'Luna Eclipse Music LLC', territory: 'Worldwide', startDate: '2024-06-01', endDate: '2029-06-01', fee: 50000, royaltyRate: 2.5, status: 'active', terms: 'Feature film sync license', exclusivity: true },
      { songTitle: 'Bass Drop Symphony', licenseType: 'Performance', licensee: 'SiriusXM', licensor: 'Nexus Entertainment', territory: 'North America', startDate: '2024-04-15', endDate: '2025-04-15', fee: 4500, royaltyRate: 10.0, status: 'active', terms: 'Satellite radio performance', exclusivity: false },
      { songTitle: 'Fire and Ice', licenseType: 'Mechanical', licensee: 'Tidal', licensor: 'Dual Nature Records', territory: 'Worldwide', startDate: '2024-06-15', endDate: '2026-06-15', fee: 6000, royaltyRate: 14.0, status: 'active', terms: 'Hi-fi streaming distribution', exclusivity: false },
      { songTitle: 'Thunderstruck Love', licenseType: 'Sync', licensee: 'EA Games', licensor: 'Voltage Records', territory: 'Worldwide', startDate: '2024-01-10', endDate: '2027-01-10', fee: 35000, royaltyRate: 3.0, status: 'active', terms: 'Video game soundtrack license', exclusivity: false },
      { songTitle: 'Velvet Skies', licenseType: 'Performance', licensee: 'BBC Radio', licensor: 'Aqua Music Group', territory: 'United Kingdom', startDate: '2024-04-01', endDate: '2025-04-01', fee: 2500, royaltyRate: 7.5, status: 'active', terms: 'UK radio broadcast license', exclusivity: false },
      { songTitle: 'Highway Serenade', licenseType: 'Mechanical', licensee: 'Amazon Music', licensor: 'Sunset Records', territory: 'Worldwide', startDate: '2023-10-01', endDate: '2025-10-01', fee: 4000, royaltyRate: 11.0, status: 'active', terms: 'Streaming platform mechanical', exclusivity: false },
      { songTitle: 'Autumn Leaves Fall', licenseType: 'Sync', licensee: 'Starbucks Corp', licensor: 'Jazz Collective Publishing', territory: 'Worldwide', startDate: '2024-01-01', endDate: '2024-12-31', fee: 18000, royaltyRate: 0, status: 'active', terms: 'In-store ambiance playlist', exclusivity: false },
      { songTitle: 'Digital Hearts', licenseType: 'Master Use', licensee: 'Samsung Electronics', licensor: 'City Pulse Entertainment', territory: 'Asia Pacific', startDate: '2024-05-01', endDate: '2025-05-01', fee: 40000, royaltyRate: 0, status: 'active', terms: 'Product launch commercial', exclusivity: true },
      { songTitle: 'Broken Chains', licenseType: 'Performance', licensee: 'Pandora', licensor: 'Iron Will Productions', territory: 'United States', startDate: '2023-09-01', endDate: '2025-09-01', fee: 3500, royaltyRate: 9.0, status: 'active', terms: 'Internet radio streaming', exclusivity: false },
      { songTitle: 'Lullaby for Stars', licenseType: 'Sync', licensee: 'Calm App Inc', licensor: 'Dream Weaver Studios', territory: 'Worldwide', startDate: '2024-06-01', endDate: '2026-06-01', fee: 12000, royaltyRate: 5.0, status: 'active', terms: 'Meditation app background music', exclusivity: true }
    ];
    await RightsLicense.bulkCreate(licensesData);
    console.log('Rights & Licenses seeded (15 items).');

    // Royalty Calculations (15 items)
    const royaltiesData = [
      { songTitle: 'Midnight Dreams', platform: 'Spotify', streams: 2500000, downloads: 15000, period: '2024-Q1', ratePerStream: 0.003500, totalRoyalty: 8750.00, artistShare: 3500.00, labelShare: 3062.50, publisherShare: 2187.50, status: 'paid', paymentDate: '2024-04-15' },
      { songTitle: 'Electric Soul', platform: 'Apple Music', streams: 1800000, downloads: 22000, period: '2024-Q1', ratePerStream: 0.005000, totalRoyalty: 9000.00, artistShare: 3600.00, labelShare: 3150.00, publisherShare: 2250.00, status: 'paid', paymentDate: '2024-04-15' },
      { songTitle: 'Neon Lights', platform: 'Spotify', streams: 5200000, downloads: 8000, period: '2024-Q1', ratePerStream: 0.003500, totalRoyalty: 18200.00, artistShare: 7280.00, labelShare: 6370.00, publisherShare: 4550.00, status: 'paid', paymentDate: '2024-04-15' },
      { songTitle: 'Fire and Ice', platform: 'Tidal', streams: 800000, downloads: 5000, period: '2024-Q1', ratePerStream: 0.012500, totalRoyalty: 10000.00, artistShare: 5000.00, labelShare: 3000.00, publisherShare: 2000.00, status: 'paid', paymentDate: '2024-04-20' },
      { songTitle: 'Bass Drop Symphony', platform: 'Spotify', streams: 8500000, downloads: 30000, period: '2024-Q1', ratePerStream: 0.003500, totalRoyalty: 29750.00, artistShare: 11900.00, labelShare: 10412.50, publisherShare: 7437.50, status: 'paid', paymentDate: '2024-04-15' },
      { songTitle: 'Midnight Dreams', platform: 'Apple Music', streams: 1200000, downloads: 8000, period: '2024-Q2', ratePerStream: 0.005000, totalRoyalty: 6000.00, artistShare: 2400.00, labelShare: 2100.00, publisherShare: 1500.00, status: 'calculated', paymentDate: '2024-07-15' },
      { songTitle: 'Rhythm of Rain', platform: 'Spotify', streams: 3100000, downloads: 12000, period: '2024-Q2', ratePerStream: 0.003500, totalRoyalty: 10850.00, artistShare: 4340.00, labelShare: 3797.50, publisherShare: 2712.50, status: 'calculated', paymentDate: '2024-07-15' },
      { songTitle: 'Golden Hour', platform: 'Amazon Music', streams: 950000, downloads: 6000, period: '2024-Q1', ratePerStream: 0.004000, totalRoyalty: 3800.00, artistShare: 1520.00, labelShare: 1330.00, publisherShare: 950.00, status: 'paid', paymentDate: '2024-04-30' },
      { songTitle: 'Digital Hearts', platform: 'YouTube Music', streams: 12000000, downloads: 2000, period: '2024-Q1', ratePerStream: 0.002000, totalRoyalty: 24000.00, artistShare: 9600.00, labelShare: 8400.00, publisherShare: 6000.00, status: 'paid', paymentDate: '2024-05-01' },
      { songTitle: 'Whispers in the Wind', platform: 'Spotify', streams: 1500000, downloads: 9000, period: '2024-Q2', ratePerStream: 0.003500, totalRoyalty: 5250.00, artistShare: 2100.00, labelShare: 1837.50, publisherShare: 1312.50, status: 'pending', paymentDate: '2024-07-15' },
      { songTitle: 'Thunderstruck Love', platform: 'Deezer', streams: 600000, downloads: 3500, period: '2024-Q1', ratePerStream: 0.004500, totalRoyalty: 2700.00, artistShare: 1080.00, labelShare: 945.00, publisherShare: 675.00, status: 'paid', paymentDate: '2024-04-20' },
      { songTitle: 'Velvet Skies', platform: 'Apple Music', streams: 2200000, downloads: 14000, period: '2024-Q2', ratePerStream: 0.005000, totalRoyalty: 11000.00, artistShare: 4400.00, labelShare: 3850.00, publisherShare: 2750.00, status: 'calculated', paymentDate: '2024-07-15' },
      { songTitle: 'Autumn Leaves Fall', platform: 'Spotify', streams: 750000, downloads: 4000, period: '2024-Q1', ratePerStream: 0.003500, totalRoyalty: 2625.00, artistShare: 1050.00, labelShare: 918.75, publisherShare: 656.25, status: 'paid', paymentDate: '2024-04-15' },
      { songTitle: 'Broken Chains', platform: 'Pandora', streams: 420000, downloads: 2000, period: '2024-Q1', ratePerStream: 0.006000, totalRoyalty: 2520.00, artistShare: 1008.00, labelShare: 882.00, publisherShare: 630.00, status: 'paid', paymentDate: '2024-04-25' },
      { songTitle: 'Lullaby for Stars', platform: 'Spotify', streams: 3800000, downloads: 18000, period: '2024-Q2', ratePerStream: 0.003500, totalRoyalty: 13300.00, artistShare: 5320.00, labelShare: 4655.00, publisherShare: 3325.00, status: 'pending', paymentDate: '2024-07-15' }
    ];
    await RoyaltyCalculation.bulkCreate(royaltiesData);
    console.log('Royalty calculations seeded (15 items).');

    // Platform Integrations (15 items)
    const platformsData = [
      { platformName: 'Spotify', songTitle: 'Midnight Dreams', externalId: 'SPT-2024-001', totalStreams: 3700000, totalRevenue: 14750.00, lastSyncDate: '2024-06-01', status: 'connected', region: 'Global', apiEndpoint: 'api.spotify.com/v1', monthlyListeners: 125000 },
      { platformName: 'Apple Music', songTitle: 'Electric Soul', externalId: 'APL-2023-012', totalStreams: 1800000, totalRevenue: 9000.00, lastSyncDate: '2024-06-01', status: 'connected', region: 'Global', apiEndpoint: 'api.music.apple.com/v1', monthlyListeners: 89000 },
      { platformName: 'Tidal', songTitle: 'Fire and Ice', externalId: 'TDL-2024-030', totalStreams: 800000, totalRevenue: 10000.00, lastSyncDate: '2024-06-01', status: 'connected', region: 'Global', apiEndpoint: 'api.tidal.com/v1', monthlyListeners: 45000 },
      { platformName: 'Amazon Music', songTitle: 'Golden Hour', externalId: 'AMZ-2023-035', totalStreams: 950000, totalRevenue: 3800.00, lastSyncDate: '2024-05-28', status: 'connected', region: 'North America', apiEndpoint: 'music.amazon.com/api', monthlyListeners: 67000 },
      { platformName: 'YouTube Music', songTitle: 'Digital Hearts', externalId: 'YTM-2024-009', totalStreams: 12000000, totalRevenue: 24000.00, lastSyncDate: '2024-06-01', status: 'connected', region: 'Global', apiEndpoint: 'music.youtube.com/api', monthlyListeners: 340000 },
      { platformName: 'Deezer', songTitle: 'Thunderstruck Love', externalId: 'DZR-2023-013', totalStreams: 600000, totalRevenue: 2700.00, lastSyncDate: '2024-05-30', status: 'connected', region: 'Europe', apiEndpoint: 'api.deezer.com/v1', monthlyListeners: 32000 },
      { platformName: 'Pandora', songTitle: 'Broken Chains', externalId: 'PND-2023-042', totalStreams: 420000, totalRevenue: 2520.00, lastSyncDate: '2024-05-25', status: 'connected', region: 'United States', apiEndpoint: 'api.pandora.com/v1', monthlyListeners: 28000 },
      { platformName: 'SoundCloud', songTitle: 'Bass Drop Symphony', externalId: 'SC-2024-015', totalStreams: 4200000, totalRevenue: 8400.00, lastSyncDate: '2024-06-01', status: 'connected', region: 'Global', apiEndpoint: 'api.soundcloud.com/v2', monthlyListeners: 195000 },
      { platformName: 'Spotify', songTitle: 'Neon Lights', externalId: 'SPT-2024-008', totalStreams: 5200000, totalRevenue: 18200.00, lastSyncDate: '2024-06-01', status: 'connected', region: 'Global', apiEndpoint: 'api.spotify.com/v1', monthlyListeners: 210000 },
      { platformName: 'Apple Music', songTitle: 'Velvet Skies', externalId: 'APL-2024-006', totalStreams: 2200000, totalRevenue: 11000.00, lastSyncDate: '2024-06-01', status: 'connected', region: 'Global', apiEndpoint: 'api.music.apple.com/v1', monthlyListeners: 98000 },
      { platformName: 'Spotify', songTitle: 'Rhythm of Rain', externalId: 'SPT-2024-005', totalStreams: 3100000, totalRevenue: 10850.00, lastSyncDate: '2024-06-01', status: 'connected', region: 'Global', apiEndpoint: 'api.spotify.com/v1', monthlyListeners: 145000 },
      { platformName: 'YouTube Music', songTitle: 'Neon Lights', externalId: 'YTM-2024-008', totalStreams: 8500000, totalRevenue: 17000.00, lastSyncDate: '2024-06-01', status: 'syncing', region: 'Global', apiEndpoint: 'music.youtube.com/api', monthlyListeners: 280000 },
      { platformName: 'Spotify', songTitle: 'Lullaby for Stars', externalId: 'SPT-2024-022', totalStreams: 3800000, totalRevenue: 13300.00, lastSyncDate: '2024-06-01', status: 'connected', region: 'Global', apiEndpoint: 'api.spotify.com/v1', monthlyListeners: 175000 },
      { platformName: 'Tidal', songTitle: 'Electric Soul', externalId: 'TDL-2023-012', totalStreams: 350000, totalRevenue: 4375.00, lastSyncDate: '2024-05-28', status: 'connected', region: 'Global', apiEndpoint: 'api.tidal.com/v1', monthlyListeners: 22000 },
      { platformName: 'Amazon Music', songTitle: 'Whispers in the Wind', externalId: 'AMZ-2024-002', totalStreams: 680000, totalRevenue: 2720.00, lastSyncDate: '2024-05-30', status: 'error', region: 'North America', apiEndpoint: 'music.amazon.com/api', monthlyListeners: 41000 }
    ];
    await PlatformIntegration.bulkCreate(platformsData);
    console.log('Platform integrations seeded (15 items).');

    // Artist/Writers (15 items)
    const artistsData = [
      { name: 'Luna Eclipse', role: 'Artist/Songwriter', email: 'luna@eclipse.com', phone: '+1-555-0101', ipi: '00123456789', pro: 'ASCAP', publisher: 'Luna Eclipse Music LLC', defaultSplit: 40.00, totalEarnings: 45000.00, catalogCount: 12, status: 'active' },
      { name: 'Marcus Chen', role: 'Songwriter/Producer', email: 'marcus@voltage.com', phone: '+1-555-0102', ipi: '00234567890', pro: 'BMI', publisher: 'Voltage Records', defaultSplit: 25.00, totalEarnings: 38000.00, catalogCount: 8, status: 'active' },
      { name: 'DJ Nexus', role: 'Artist/Producer', email: 'nexus@beats.com', phone: '+1-555-0103', ipi: '00345678901', pro: 'SESAC', publisher: 'Nexus Entertainment', defaultSplit: 50.00, totalEarnings: 62000.00, catalogCount: 15, status: 'active' },
      { name: 'Sarah Waters', role: 'Songwriter', email: 'sarah@aqua.com', phone: '+1-555-0104', ipi: '00456789012', pro: 'ASCAP', publisher: 'Aqua Music Group', defaultSplit: 30.00, totalEarnings: 28000.00, catalogCount: 6, status: 'active' },
      { name: 'Jake Morrison', role: 'Artist/Songwriter', email: 'jake@sunset.com', phone: '+1-555-0105', ipi: '00567890123', pro: 'BMI', publisher: 'Sunset Records', defaultSplit: 35.00, totalEarnings: 19000.00, catalogCount: 5, status: 'active' },
      { name: 'City Pulse', role: 'Artist/Producer', email: 'info@citypulse.com', phone: '+1-555-0106', ipi: '00678901234', pro: 'ASCAP', publisher: 'City Pulse Entertainment', defaultSplit: 45.00, totalEarnings: 78000.00, catalogCount: 20, status: 'active' },
      { name: 'Elena Rodriguez', role: 'Songwriter', email: 'elena@songcraft.com', phone: '+1-555-0107', ipi: '00789012345', pro: 'BMI', publisher: 'Songcraft Publishing', defaultSplit: 20.00, totalEarnings: 22000.00, catalogCount: 18, status: 'active' },
      { name: 'Iron Will', role: 'Artist', email: 'ironwill@metal.com', phone: '+1-555-0108', ipi: '00890123456', pro: 'SESAC', publisher: 'Iron Will Productions', defaultSplit: 40.00, totalEarnings: 15000.00, catalogCount: 4, status: 'active' },
      { name: 'Dream Weaver', role: 'Artist/Producer', email: 'dream@weaver.com', phone: '+1-555-0109', ipi: '00901234567', pro: 'ASCAP', publisher: 'Dream Weaver Studios', defaultSplit: 50.00, totalEarnings: 12000.00, catalogCount: 7, status: 'active' },
      { name: 'Dual Nature', role: 'Artist', email: 'dual@nature.com', phone: '+1-555-0110', ipi: '01012345678', pro: 'BMI', publisher: 'Dual Nature Records', defaultSplit: 35.00, totalEarnings: 55000.00, catalogCount: 3, status: 'active' },
      { name: 'Tommy Jazz', role: 'Songwriter/Arranger', email: 'tommy@jazz.com', phone: '+1-555-0111', ipi: '01123456789', pro: 'ASCAP', publisher: 'Jazz Collective Publishing', defaultSplit: 25.00, totalEarnings: 9500.00, catalogCount: 10, status: 'active' },
      { name: 'Aria Kim', role: 'Songwriter/Vocalist', email: 'aria@kim.com', phone: '+1-555-0112', ipi: '01234567890', pro: 'BMI', publisher: 'Independent', defaultSplit: 50.00, totalEarnings: 31000.00, catalogCount: 9, status: 'active' },
      { name: 'Rex Thunder', role: 'Producer', email: 'rex@thunder.com', phone: '+1-555-0113', ipi: '01345678901', pro: 'SESAC', publisher: 'Thunder Productions', defaultSplit: 15.00, totalEarnings: 42000.00, catalogCount: 25, status: 'active' },
      { name: 'Maya Sterling', role: 'Songwriter', email: 'maya@sterling.com', phone: '+1-555-0114', ipi: '01456789012', pro: 'ASCAP', publisher: 'Sterling Songs', defaultSplit: 30.00, totalEarnings: 18500.00, catalogCount: 11, status: 'inactive' },
      { name: 'The Voltage', role: 'Artist', email: 'band@voltage.com', phone: '+1-555-0115', ipi: '01567890123', pro: 'BMI', publisher: 'Voltage Records', defaultSplit: 40.00, totalEarnings: 34000.00, catalogCount: 8, status: 'active' }
    ];
    await ArtistWriter.bulkCreate(artistsData);
    console.log('Artists/Writers seeded (15 items).');

    // Contracts (15 items)
    const contractsData = [
      { contractName: 'Luna Eclipse Recording Agreement', partyA: 'Luna Eclipse Music LLC', partyB: 'Universal Music Group', contractType: 'Recording', startDate: '2023-01-01', endDate: '2026-12-31', value: 500000, royaltyRate: 18.00, territory: 'Worldwide', status: 'active', terms: '4-album deal with option for 2 additional', autoRenew: false },
      { contractName: 'Voltage Publishing Deal', partyA: 'Voltage Records', partyB: 'Sony Music Publishing', contractType: 'Publishing', startDate: '2023-06-01', endDate: '2028-05-31', value: 350000, royaltyRate: 22.00, territory: 'Worldwide', status: 'active', terms: '5-year exclusive publishing agreement', autoRenew: true },
      { contractName: 'Nexus Distribution Agreement', partyA: 'Nexus Entertainment', partyB: 'DistroKid', contractType: 'Distribution', startDate: '2024-01-01', endDate: '2025-12-31', value: 0, royaltyRate: 100.00, territory: 'Worldwide', status: 'active', terms: 'Digital distribution, 100% royalty pass-through', autoRenew: true },
      { contractName: 'Spotify Featured Playlist', partyA: 'City Pulse Entertainment', partyB: 'Spotify AB', contractType: 'Promotion', startDate: '2024-03-01', endDate: '2024-09-01', value: 15000, royaltyRate: 0, territory: 'Worldwide', status: 'active', terms: 'Featured placement on curated playlists', autoRenew: false },
      { contractName: 'Netflix Sync License Master', partyA: 'Voltage Records', partyB: 'Netflix Inc', contractType: 'Sync', startDate: '2024-03-01', endDate: '2025-03-01', value: 25000, royaltyRate: 0, territory: 'North America', status: 'active', terms: 'One-time sync for documentary series', autoRenew: false },
      { contractName: 'Aqua Beats Management', partyA: 'Aqua Music Group', partyB: 'Talent First Management', contractType: 'Management', startDate: '2023-04-01', endDate: '2026-03-31', value: 0, royaltyRate: 15.00, territory: 'Worldwide', status: 'active', terms: 'Full management services, 15% commission', autoRenew: false },
      { contractName: 'Dream Weaver Label Deal', partyA: 'Dream Weaver Studios', partyB: 'Ambient Records', contractType: 'Recording', startDate: '2024-01-15', endDate: '2027-01-14', value: 120000, royaltyRate: 20.00, territory: 'Worldwide', status: 'active', terms: '3-album deal, 20% royalty rate', autoRenew: false },
      { contractName: 'Iron Will Merch License', partyA: 'Iron Will Productions', partyB: 'Merch Masters Inc', contractType: 'Merchandise', startDate: '2024-02-01', endDate: '2025-01-31', value: 8000, royaltyRate: 25.00, territory: 'North America', status: 'active', terms: 'Apparel and accessories merchandise', autoRenew: true },
      { contractName: 'Jazz Collective Venue Agreement', partyA: 'Jazz Collective Publishing', partyB: 'Blue Note Jazz Club', contractType: 'Performance', startDate: '2024-01-01', endDate: '2024-12-31', value: 48000, royaltyRate: 0, territory: 'New York', status: 'active', terms: 'Monthly residency, 12 shows', autoRenew: false },
      { contractName: 'Dual Nature Brand Partnership', partyA: 'Dual Nature Records', partyB: 'Nike Inc', contractType: 'Brand Partnership', startDate: '2024-06-01', endDate: '2025-05-31', value: 200000, royaltyRate: 5.00, territory: 'Worldwide', status: 'active', terms: 'Exclusive brand ambassador deal', autoRenew: false },
      { contractName: 'Luna Eclipse Tour Sponsorship', partyA: 'Luna Eclipse Music LLC', partyB: 'Live Nation', contractType: 'Touring', startDate: '2024-09-01', endDate: '2025-03-31', value: 1500000, royaltyRate: 70.00, territory: 'North America', status: 'pending', terms: 'National tour, 30 cities, 70/30 split', autoRenew: false },
      { contractName: 'City Pulse Sample Clearance', partyA: 'City Pulse Entertainment', partyB: 'Vintage Sounds Archive', contractType: 'Sample Clearance', startDate: '2024-04-01', endDate: '2029-03-31', value: 10000, royaltyRate: 2.00, territory: 'Worldwide', status: 'active', terms: 'Sample clearance for 3 vintage recordings', autoRenew: false },
      { contractName: 'Sunset Drive Film Score', partyA: 'Sunset Records', partyB: 'A24 Films', contractType: 'Sync', startDate: '2024-07-01', endDate: '2025-12-31', value: 75000, royaltyRate: 3.00, territory: 'Worldwide', status: 'pending', terms: 'Original score for indie feature film', autoRenew: false },
      { contractName: 'Rex Thunder Production Deal', partyA: 'Thunder Productions', partyB: 'Atlantic Records', contractType: 'Production', startDate: '2023-09-01', endDate: '2026-08-31', value: 250000, royaltyRate: 4.00, territory: 'Worldwide', status: 'active', terms: 'Exclusive production for 10 tracks/year', autoRenew: true },
      { contractName: 'Sterling Songs Admin', partyA: 'Sterling Songs', partyB: 'Kobalt Music', contractType: 'Administration', startDate: '2023-07-01', endDate: '2026-06-30', value: 0, royaltyRate: 10.00, territory: 'Worldwide', status: 'active', terms: 'Publishing admin, 10% admin fee', autoRenew: true }
    ];
    await Contract.bulkCreate(contractsData);
    console.log('Contracts seeded (15 items).');

    // Payments (15 items)
    const paymentsData = [
      { payee: 'Luna Eclipse', amount: 8750.00, currency: 'USD', paymentMethod: 'Wire Transfer', reference: 'PAY-2024-001', songTitle: 'Midnight Dreams', period: '2024-Q1', platform: 'Spotify', status: 'completed', paymentDate: '2024-04-15', notes: 'Q1 streaming royalties' },
      { payee: 'The Voltage', amount: 9000.00, currency: 'USD', paymentMethod: 'Wire Transfer', reference: 'PAY-2024-002', songTitle: 'Electric Soul', period: '2024-Q1', platform: 'Apple Music', status: 'completed', paymentDate: '2024-04-15', notes: 'Q1 streaming royalties' },
      { payee: 'City Pulse', amount: 18200.00, currency: 'USD', paymentMethod: 'ACH', reference: 'PAY-2024-003', songTitle: 'Neon Lights', period: '2024-Q1', platform: 'Spotify', status: 'completed', paymentDate: '2024-04-15', notes: 'Q1 streaming royalties - highest earner' },
      { payee: 'Dual Nature', amount: 10000.00, currency: 'USD', paymentMethod: 'Wire Transfer', reference: 'PAY-2024-004', songTitle: 'Fire and Ice', period: '2024-Q1', platform: 'Tidal', status: 'completed', paymentDate: '2024-04-20', notes: 'Q1 HiFi streaming royalties' },
      { payee: 'DJ Nexus', amount: 29750.00, currency: 'USD', paymentMethod: 'ACH', reference: 'PAY-2024-005', songTitle: 'Bass Drop Symphony', period: '2024-Q1', platform: 'Spotify', status: 'completed', paymentDate: '2024-04-15', notes: 'Q1 club anthem streaming royalties' },
      { payee: 'Luna Eclipse', amount: 50000.00, currency: 'USD', paymentMethod: 'Wire Transfer', reference: 'PAY-2024-006', songTitle: 'Whispers in the Wind', period: 'One-time', platform: 'Sync', status: 'completed', paymentDate: '2024-06-15', notes: 'Warner Bros film sync fee' },
      { payee: 'Sunset Drive', amount: 3800.00, currency: 'USD', paymentMethod: 'Check', reference: 'PAY-2024-007', songTitle: 'Golden Hour', period: '2024-Q1', platform: 'Amazon Music', status: 'completed', paymentDate: '2024-04-30', notes: 'Q1 streaming royalties' },
      { payee: 'City Pulse', amount: 24000.00, currency: 'USD', paymentMethod: 'Wire Transfer', reference: 'PAY-2024-008', songTitle: 'Digital Hearts', period: '2024-Q1', platform: 'YouTube Music', status: 'completed', paymentDate: '2024-05-01', notes: 'Q1 YouTube Music streaming' },
      { payee: 'Aqua Beats', amount: 10850.00, currency: 'USD', paymentMethod: 'ACH', reference: 'PAY-2024-009', songTitle: 'Rhythm of Rain', period: '2024-Q2', platform: 'Spotify', status: 'pending', paymentDate: '2024-07-15', notes: 'Q2 streaming royalties - pending' },
      { payee: 'The Voltage', amount: 35000.00, currency: 'USD', paymentMethod: 'Wire Transfer', reference: 'PAY-2024-010', songTitle: 'Thunderstruck Love', period: 'One-time', platform: 'Sync', status: 'completed', paymentDate: '2024-02-01', notes: 'EA Games video game sync fee' },
      { payee: 'Jazz Collective', amount: 2625.00, currency: 'USD', paymentMethod: 'Check', reference: 'PAY-2024-011', songTitle: 'Autumn Leaves Fall', period: '2024-Q1', platform: 'Spotify', status: 'completed', paymentDate: '2024-04-15', notes: 'Q1 jazz streaming royalties' },
      { payee: 'Iron Will', amount: 2520.00, currency: 'USD', paymentMethod: 'ACH', reference: 'PAY-2024-012', songTitle: 'Broken Chains', period: '2024-Q1', platform: 'Pandora', status: 'completed', paymentDate: '2024-04-25', notes: 'Q1 internet radio royalties' },
      { payee: 'Dream Weaver', amount: 12000.00, currency: 'USD', paymentMethod: 'Wire Transfer', reference: 'PAY-2024-013', songTitle: 'Lullaby for Stars', period: 'One-time', platform: 'Sync', status: 'processing', paymentDate: '2024-07-01', notes: 'Calm App sync license fee' },
      { payee: 'City Pulse', amount: 40000.00, currency: 'USD', paymentMethod: 'Wire Transfer', reference: 'PAY-2024-014', songTitle: 'Digital Hearts', period: 'One-time', platform: 'Sync', status: 'completed', paymentDate: '2024-05-15', notes: 'Samsung commercial master use fee' },
      { payee: 'DJ Nexus', amount: 4500.00, currency: 'USD', paymentMethod: 'ACH', reference: 'PAY-2024-015', songTitle: 'Bass Drop Symphony', period: '2024-Q2', platform: 'SiriusXM', status: 'pending', paymentDate: '2024-07-15', notes: 'Q2 satellite radio performance royalty' }
    ];
    await Payment.bulkCreate(paymentsData);
    console.log('Payments seeded (15 items).');

    console.log('\n✅ All data seeded successfully!');
    console.log('Login credentials:');
    console.log('  Email: admin@musicrights.com');
    console.log('  Password: password123');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
