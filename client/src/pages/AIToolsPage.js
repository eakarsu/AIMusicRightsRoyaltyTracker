import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AIResultDisplay from '../components/AIResultDisplay';
import StructuredAIDisplay from '../components/StructuredAIDisplay';
import { toast } from 'react-toastify';

const TOOLS = {
  sampling: {
    title: 'AI Sampling Detection',
    icon: '🎚️',
    description: 'Detect potential uncleared samples in a track and recommend clearance paths',
    endpoint: '/ai/sampling-detection',
    fields: [
      { key: 'songTitle', label: 'Song Title', required: true, placeholder: 'Track to analyze' },
      { key: 'lyrics', label: 'Lyrics', type: 'textarea', placeholder: 'Optional — paste lyrics...' },
      { key: 'audioFingerprint', label: 'Audio Fingerprint / ID', placeholder: 'e.g., AcoustID or a ChromaPrint' },
      { key: 'knownInfluences', label: 'Known Influences (comma separated)', placeholder: 'e.g., James Brown - Funky Drummer' },
    ],
  },
  metadata: {
    title: 'AI Metadata Cleaner',
    icon: '🧹',
    description: 'Standardize names, ISRCs, capitalization and detect duplicate records',
    endpoint: '/ai/metadata-cleaner',
    fields: [
      { key: 'records_text', label: 'Records (JSON array)', type: 'textarea', required: true,
        placeholder: '[{"id":1,"title":"hello","artist":"adele","isrc":"GBBKS1500214"}]' },
    ],
  },
  licensing: {
    title: 'AI Licensing Recommender',
    icon: '📜',
    description: 'Get recommended license type, fee estimate, term and negotiation points',
    endpoint: '/ai/licensing-recommender',
    fields: [
      { key: 'trackId', label: 'Track ID (optional)', type: 'number', placeholder: 'Existing catalog id' },
      { key: 'useCase', label: 'Use Case', required: true, placeholder: 'e.g., TV ad, indie film, podcast' },
      { key: 'territory', label: 'Territory', placeholder: 'e.g., Worldwide, North America' },
      { key: 'budget', label: 'Budget USD', type: 'number', placeholder: 'e.g., 5000' },
      { key: 'exclusivity', label: 'Exclusivity', type: 'select', options: ['non-exclusive', 'exclusive', 'limited-exclusive'] },
    ],
  },
  revenue: {
    title: 'AI Revenue Optimizer',
    icon: '💰',
    description: 'Identify concrete actions to maximize revenue across streaming, sync, performance, and brand channels',
    endpoint: '/ai/revenue-optimizer',
    fields: [
      { key: 'catalogId', label: 'Catalog Track ID (optional)', type: 'number', placeholder: 'Focus on a specific catalog entry' },
      { key: 'focusGenre', label: 'Focus Genre (optional)', placeholder: 'e.g., pop, hip-hop, ambient' },
      { key: 'target', label: 'Target', type: 'select', options: ['streaming-revenue', 'sync-revenue', 'performance-revenue', 'overall'] },
      { key: 'timeframeMonths', label: 'Timeframe (months)', type: 'number', placeholder: 'e.g., 12' },
    ],
  },
  // Apply pass 5 — creds-gated integrations and product-decision advisor
  acquisition: {
    title: 'AI Catalog Acquisition Advisor',
    icon: '🎯',
    description: 'Buy/pass/negotiate recommendation with fair-value band for a target catalog',
    endpoint: '/ai/catalog-acquisition-advisor',
    fields: [
      { key: 'target_catalog_id', label: 'Target Catalog ID (optional)', type: 'number', placeholder: 'Existing catalog id to compare' },
      { key: 'asking_price_usd', label: 'Asking Price USD', type: 'number', placeholder: 'e.g., 5000000' },
      { key: 'strategic_objective', label: 'Strategic Objective', placeholder: 'e.g., expand into Latin urban' },
    ],
  },
  settlement: {
    title: 'Royalty Settlement (Streaming)',
    icon: '🏦',
    description: 'Queue platform settlement-statement fetch (NEEDS-CREDS: SPOTIFY_FOR_ARTISTS_TOKEN or APPLE_MUSIC_TOKEN)',
    endpoint: '/ai/royalty-settlement',
    fields: [
      { key: 'platform', label: 'Platform', type: 'select', required: true, options: ['spotify', 'apple'] },
    ],
  },
  copyright: {
    title: 'Copyright Tracking (USCO)',
    icon: '©️',
    description: 'Queue USCO registration lookup (NEEDS-CREDS: USCO_API_KEY)',
    endpoint: '/ai/copyright-tracking',
    fields: [
      { key: 'song_title', label: 'Song Title', placeholder: 'optional' },
      { key: 'registration_number', label: 'Registration Number', placeholder: 'optional' },
    ],
  },
  mechanical: {
    title: 'Mechanical Licensing (MLC/HFA)',
    icon: '⚙️',
    description: 'Queue mechanical license request (NEEDS-CREDS: MLC_API_KEY)',
    endpoint: '/ai/mechanical-licensing',
    fields: [
      { key: 'song_title', label: 'Song Title', required: true, placeholder: 'Cover/distribution song' },
      { key: 'configuration', label: 'Configuration', placeholder: 'e.g., physical, digital, ringtone' },
      { key: 'units', label: 'Units', type: 'number', placeholder: 'e.g., 10000' },
    ],
  },
  pro: {
    title: 'PRO Performance Tracking',
    icon: '🎤',
    description: 'Queue performance report to ASCAP/BMI/SESAC (NEEDS-CREDS per PRO)',
    endpoint: '/ai/pro-tracking',
    fields: [
      { key: 'pro', label: 'PRO', type: 'select', required: true, options: ['ascap', 'bmi', 'sesac'] },
      { key: 'song_title', label: 'Song Title', required: true, placeholder: 'Performed work' },
      { key: 'performance_count', label: 'Performance Count', type: 'number', placeholder: 'e.g., 1' },
      { key: 'venue', label: 'Venue', placeholder: 'e.g., The Fillmore, SF' },
      { key: 'performance_date', label: 'Performance Date (YYYY-MM-DD)', placeholder: '2026-05-08' },
    ],
  },
};

export default function AIToolsPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState('sampling');
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const config = TOOLS[active];

  const handleChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const switchTool = (key) => {
    setActive(key);
    setFormData({});
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const body = { ...formData };

      if (active === 'sampling' && body.knownInfluences) {
        body.knownInfluences = body.knownInfluences.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (active === 'metadata') {
        try {
          body.records = JSON.parse(body.records_text || '[]');
        } catch {
          toast.error('records must be valid JSON array');
          setLoading(false);
          return;
        }
        delete body.records_text;
      }
      if (active === 'licensing') {
        if (body.trackId) body.trackId = parseInt(body.trackId);
        if (body.budget) body.budget = parseFloat(body.budget);
      }
      if (active === 'revenue') {
        if (body.catalogId) body.catalogId = parseInt(body.catalogId);
        if (body.timeframeMonths) body.timeframeMonths = parseInt(body.timeframeMonths);
      }
      if (active === 'acquisition') {
        if (body.target_catalog_id) body.target_catalog_id = parseInt(body.target_catalog_id);
        if (body.asking_price_usd) body.asking_price_usd = parseFloat(body.asking_price_usd);
      }
      if (active === 'mechanical' && body.units) body.units = parseInt(body.units);
      if (active === 'pro' && body.performance_count) body.performance_count = parseInt(body.performance_count);

      const { data } = await api.post(config.endpoint, body);
      setResult(data);
    } catch (err) {
      if (err.response?.status === 503) {
        const missing = err.response?.data?.missing;
        toast.error(missing ? `Service not configured. Missing env: ${missing}` : 'AI not configured. Set OPENROUTER_API_KEY.');
      } else {
        toast.error(err.response?.data?.error || 'Request failed. Check your API keys.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>

      <div className="page-header">
        <div>
          <h1>🤖 AI Tools</h1>
          <p>Sampling detection, metadata cleaning, and licensing recommendations</p>
        </div>
        <span className="card-badge badge-ai">🤖 AI Powered</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(TOOLS).map(([k, t]) => (
          <button key={k} type="button" onClick={() => switchTool(k)}
            className={active === k ? 'btn btn-primary' : 'btn btn-secondary'}>
            {t.icon} {t.title}
          </button>
        ))}
      </div>

      <div className="detail-panel">
        <h2 style={{ marginTop: 0 }}>{config.icon} {config.title}</h2>
        <p style={{ color: '#aaa' }}>{config.description}</p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: config.fields.length > 2 ? '1fr 1fr' : '1fr', gap: 16 }}>
            {config.fields.map(field => (
              <div className="form-group" key={field.key} style={field.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
                <label>{field.label}{field.required ? ' *' : ''}</label>
                {field.type === 'select' ? (
                  <select value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)}>
                    <option value="">Select...</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={6}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={formData[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? '🔄 Analyzing...' : '🤖 Run AI Analysis'}
            </button>
            {result && (
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => { setResult(null); setFormData({}); }}>
                Clear Results
              </button>
            )}
          </div>
        </form>
      </div>

      {result?.structured ? (
        <StructuredAIDisplay result={result} feature={active} loading={loading} />
      ) : (
        <AIResultDisplay result={result} loading={loading} />
      )}
    </div>
  );
}
