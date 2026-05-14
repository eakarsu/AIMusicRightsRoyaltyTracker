import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const menuItems = [
  { section: 'Management', items: [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/catalog', label: 'Music Catalog', icon: '🎵' },
    { path: '/licenses', label: 'Rights & Licenses', icon: '📄' },
    { path: '/royalties', label: 'Royalty Calculations', icon: '💰' },
    { path: '/platforms', label: 'Platform Tracking', icon: '🔗' },
    { path: '/artists', label: 'Artists & Writers', icon: '🎤' },
    { path: '/contracts', label: 'Contracts', icon: '📋' },
    { path: '/payments', label: 'Payments', icon: '💳' },
  ]},
  { section: 'AI Features', items: [
    { path: '/ai/plagiarism', label: 'Plagiarism Detection', icon: '🔍' },
    { path: '/ai/valuation', label: 'Catalog Valuation', icon: '📈' },
    { path: '/ai/clearance', label: 'Rights Clearance', icon: '✅' },
    { path: '/ai/forecasting', label: 'Royalty Forecasting', icon: '🔮' },
    { path: '/ai/contract-analysis', label: 'Contract Analysis', icon: '🤖' },
    { path: '/ai/market-trends', label: 'Market Trends', icon: '📉' },
    { path: '/ai-tools', label: 'AI Tools (Sampling/Metadata/Licensing)', icon: '🛠️' },
  ]}
];

export default function Layout({ children, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>🎶 Music Rights AI</h2>
          <p>Royalty & Rights Tracker</p>
        </div>
        {menuItems.map(section => (
          <div className="sidebar-section" key={section.section}>
            <div className="sidebar-section-title">{section.section}</div>
            {section.items.map(item => (
              <div
                key={item.path}
                className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        ))}
        <div className="sidebar-footer">
          <div className="sidebar-item" style={{ marginBottom: 8 }}>
            <span className="icon">👤</span>
            {user.name || 'User'}
          </div>
          <div className="sidebar-item" onClick={onLogout}>
            <span className="icon">🚪</span>
            Sign Out
          </div>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
