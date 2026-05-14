require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.SERVER_PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

app.use(helmet());
app.use(cors({ origin: CLIENT_URL, credentials: true }));
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

// === BATCH 05 AUTO-MOUNT (custom feature suggestions) ===
app.use('/api/rights-clearance-agent', require('./routes/rights-clearance-agent'));
app.use('/api/royalty-optimizer-stream', require('./routes/royalty-optimizer-stream'));
app.use('/api/plagiarism-sampling-detect', require('./routes/plagiarism-sampling-detect'));
app.use('/api/artist-earnings-intel', require('./routes/artist-earnings-intel'));
app.use('/api/catalog-acquisition-advisor', require('./routes/catalog-acquisition-advisor'));

// === Batch 05 Gaps & Frontend Mounts ===
try { const _gap_sampling_detection = require('./routes/gap-sampling-detection'); app.use('/api/gap-sampling-detection', _gap_sampling_detection); } catch(e) { console.error('gap mount fail sampling-detection:', e.message); }
try { const _gap_metadata_cleaner = require('./routes/gap-metadata-cleaner'); app.use('/api/gap-metadata-cleaner', _gap_metadata_cleaner); } catch(e) { console.error('gap mount fail metadata-cleaner:', e.message); }
try { const _gap_licensing_recommender = require('./routes/gap-licensing-recommender'); app.use('/api/gap-licensing-recommender', _gap_licensing_recommender); } catch(e) { console.error('gap mount fail licensing-recommender:', e.message); }
try { const _gap_revenue_optimizer = require('./routes/gap-revenue-optimizer'); app.use('/api/gap-revenue-optimizer', _gap_revenue_optimizer); } catch(e) { console.error('gap mount fail revenue-optimizer:', e.message); }
try { const _gap_real_time = require('./routes/gap-real-time'); app.use('/api/gap-real-time', _gap_real_time); } catch(e) { console.error('gap mount fail real-time:', e.message); }
try { const _gap_copyright = require('./routes/gap-copyright'); app.use('/api/gap-copyright', _gap_copyright); } catch(e) { console.error('gap mount fail copyright:', e.message); }
try { const _gap_mechanical = require('./routes/gap-mechanical'); app.use('/api/gap-mechanical', _gap_mechanical); } catch(e) { console.error('gap mount fail mechanical:', e.message); }
try { const _gap_performance = require('./routes/gap-performance'); app.use('/api/gap-performance', _gap_performance); } catch(e) { console.error('gap mount fail performance:', e.message); }
try { const _gap_dispute = require('./routes/gap-dispute'); app.use('/api/gap-dispute', _gap_dispute); } catch(e) { console.error('gap mount fail dispute:', e.message); }
try { const _gap_artist = require('./routes/gap-artist'); app.use('/api/gap-artist', _gap_artist); } catch(e) { console.error('gap mount fail artist:', e.message); }
try { const _gap_webhooks = require('./routes/gap-webhooks'); app.use('/api/gap-webhooks', _gap_webhooks); } catch(e) { console.error('gap mount fail webhooks:', e.message); }
try { const _gap_tax = require('./routes/gap-tax'); app.use('/api/gap-tax', _gap_tax); } catch(e) { console.error('gap mount fail tax:', e.message); }
// === End Batch 05 Mounts ===
