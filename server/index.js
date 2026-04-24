require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/catalog', require('./routes/catalog'));
app.use('/api/licenses', require('./routes/licenses'));
app.use('/api/royalties', require('./routes/royalties'));
app.use('/api/platforms', require('./routes/platforms'));
app.use('/api/artists', require('./routes/artists'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/ai', require('./routes/ai'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard stats
const auth = require('./middleware/auth');
const { MusicCatalog, RightsLicense, RoyaltyCalculation, PlatformIntegration, ArtistWriter, Contract, Payment } = require('./models');

app.get('/api/dashboard/stats', auth, async (req, res) => {
  try {
    const [catalogCount, licenseCount, artistCount, contractCount] = await Promise.all([
      MusicCatalog.count(),
      RightsLicense.count(),
      ArtistWriter.count(),
      Contract.count()
    ]);
    const royalties = await RoyaltyCalculation.findAll();
    const totalRevenue = royalties.reduce((sum, r) => sum + parseFloat(r.totalRoyalty || 0), 0);
    const payments = await Payment.findAll();
    const totalPaid = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const platforms = await PlatformIntegration.findAll();
    const totalStreams = platforms.reduce((sum, p) => sum + parseInt(p.totalStreams || 0), 0);

    res.json({
      catalogCount, licenseCount, artistCount, contractCount,
      totalRevenue, totalPaid, pendingPayments, totalStreams,
      activeLicenses: await RightsLicense.count({ where: { status: 'active' } }),
      activeContracts: await Contract.count({ where: { status: 'active' } })
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

sequelize.authenticate()
  .then(() => {
    console.log('Database connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
