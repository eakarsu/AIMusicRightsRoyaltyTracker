import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';

const features = [
  { path: '/catalog', icon: '🎵', title: 'Music Catalog', desc: 'Manage your complete song library, track metadata, ISRCs, and catalog organization', badge: 'feature' },
  { path: '/licenses', icon: '📄', title: 'Rights & Licenses', desc: 'Track mechanical, sync, performance, and master use licenses across territories', badge: 'feature' },
  { path: '/royalties', icon: '💰', title: 'Royalty Calculations', desc: 'Calculate and track streaming royalties across all platforms with split management', badge: 'feature' },
  { path: '/platforms', icon: '🔗', title: 'Platform Tracking', desc: 'Monitor integrations with Spotify, Apple Music, Tidal, and more streaming services', badge: 'feature' },
  { path: '/artists', icon: '🎤', title: 'Artists & Writers', desc: 'Manage artists, songwriters, producers, IPI numbers, PRO affiliations and splits', badge: 'feature' },
  { path: '/contracts', icon: '📋', title: 'Contracts', desc: 'Track recording deals, publishing agreements, sync licenses, and brand partnerships', badge: 'feature' },
  { path: '/payments', icon: '💳', title: 'Payments', desc: 'Monitor royalty payments, wire transfers, pending payments, and payment history', badge: 'feature' },
  { path: '/ai/plagiarism', icon: '🔍', title: 'AI Plagiarism Detection', desc: 'AI-powered analysis of songs for potential plagiarism with risk scoring and similarity detection', badge: 'ai' },
  { path: '/ai/valuation', icon: '📈', title: 'AI Catalog Valuation', desc: 'Get AI-driven valuations of your music catalog based on performance and market data', badge: 'ai' },
  { path: '/ai/clearance', icon: '✅', title: 'AI Rights Clearance', desc: 'Automated rights clearance analysis with conflict detection and permission requirements', badge: 'ai' },
  { path: '/ai/forecasting', icon: '🔮', title: 'AI Royalty Forecasting', desc: 'Predict future royalty earnings with AI-powered forecasting and trend analysis', badge: 'ai' },
  { path: '/ai/contract-analysis', icon: '🤖', title: 'AI Contract Analysis', desc: 'AI analysis of music contracts for fairness, red flags, and negotiation opportunities', badge: 'ai' },
  { path: '/ai/market-trends', icon: '📉', title: 'AI Market Trends', desc: 'AI-powered music industry market analysis with genre trends and platform insights', badge: 'ai' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    dashboardAPI.getStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome to AI Music Rights & Royalty Tracker</p>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🎵</div>
            <div className="stat-value">{stats.catalogCount}</div>
            <div className="stat-label">Songs in Catalog</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-value">${(stats.totalRevenue || 0).toLocaleString()}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📡</div>
            <div className="stat-value">{((stats.totalStreams || 0) / 1000000).toFixed(1)}M</div>
            <div className="stat-label">Total Streams</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎤</div>
            <div className="stat-value">{stats.artistCount}</div>
            <div className="stat-label">Artists & Writers</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📄</div>
            <div className="stat-value">{stats.activeLicenses}</div>
            <div className="stat-label">Active Licenses</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-value">{stats.activeContracts}</div>
            <div className="stat-label">Active Contracts</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">${(stats.totalPaid || 0).toLocaleString()}</div>
            <div className="stat-label">Total Paid</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">${(stats.pendingPayments || 0).toLocaleString()}</div>
            <div className="stat-label">Pending Payments</div>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 20, marginBottom: 20 }}>All Features</h2>
      <div className="features-grid">
        {features.map(f => (
          <div key={f.path} className="feature-card" onClick={() => navigate(f.path)}>
            <div className="card-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            <span className={`card-badge badge-${f.badge}`}>
              {f.badge === 'ai' ? '🤖 AI Powered' : '⚙️ Core Feature'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
