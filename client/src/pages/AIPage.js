import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aiAPI } from '../services/api';
import AIResultDisplay from '../components/AIResultDisplay';
import StructuredAIDisplay from '../components/StructuredAIDisplay';
import { toast } from 'react-toastify';

const aiFeatures = {
  plagiarism: {
    title: 'AI Plagiarism Detection',
    icon: '🔍',
    description: 'Analyze songs for potential plagiarism using AI-powered similarity detection',
    apiCall: aiAPI.plagiarismDetection,
    fields: [
      { key: 'songTitle', label: 'Song Title', required: true, placeholder: 'Enter the song title to analyze' },
      { key: 'artist', label: 'Artist Name', placeholder: 'Artist or band name' },
      { key: 'lyrics', label: 'Lyrics', type: 'textarea', placeholder: 'Paste song lyrics here for analysis...' },
      { key: 'melody', label: 'Melody Description', type: 'textarea', placeholder: 'Describe the melody, chord progression, rhythm patterns...' },
    ]
  },
  valuation: {
    title: 'AI Catalog Valuation',
    icon: '📈',
    description: 'Get AI-driven valuations of your music catalog based on performance and market data',
    apiCall: aiAPI.catalogValuation,
    fields: [
      { key: 'catalogId', label: 'Catalog Item ID (optional)', type: 'number', placeholder: 'Enter specific catalog ID or leave blank for full catalog' },
    ]
  },
  clearance: {
    title: 'AI Rights Clearance',
    icon: '✅',
    description: 'Automated rights clearance analysis with conflict detection',
    apiCall: aiAPI.rightsClearance,
    fields: [
      { key: 'songTitle', label: 'Song Title', required: true, placeholder: 'Song to clear rights for' },
      { key: 'usageType', label: 'Usage Type', type: 'select', options: ['Commercial', 'Film/TV Sync', 'Streaming', 'Radio Broadcast', 'Live Performance', 'Sampling', 'Cover Version', 'Remix'] },
      { key: 'territory', label: 'Territory', placeholder: 'e.g., Worldwide, North America, Europe' },
      { key: 'licensee', label: 'Licensee', placeholder: 'Who wants to use the song?' },
    ]
  },
  forecasting: {
    title: 'AI Royalty Forecasting',
    icon: '🔮',
    description: 'Predict future royalty earnings with AI-powered trend analysis',
    apiCall: aiAPI.royaltyForecasting,
    fields: [
      { key: 'songTitle', label: 'Song Title (optional)', placeholder: 'Specific song or leave blank for all' },
      { key: 'platform', label: 'Platform', type: 'select', options: ['All platforms', 'Spotify', 'Apple Music', 'YouTube Music', 'Tidal', 'Amazon Music', 'Deezer'] },
      { key: 'period', label: 'Forecast Period', type: 'select', options: ['3 months', '6 months', '12 months', '24 months', '36 months'] },
    ]
  },
  'contract-analysis': {
    title: 'AI Contract Analysis',
    icon: '🤖',
    description: 'AI analysis of music contracts for fairness, red flags, and negotiation points',
    apiCall: aiAPI.contractAnalysis,
    fields: [
      { key: 'contractId', label: 'Contract ID (optional)', type: 'number', placeholder: 'Enter existing contract ID' },
      { key: 'contractText', label: 'Contract Text', type: 'textarea', placeholder: 'Paste contract text or key terms here for AI analysis...' },
    ]
  },
  'market-trends': {
    title: 'AI Market Trends',
    icon: '📉',
    description: 'AI-powered music industry market analysis with genre trends and insights',
    apiCall: aiAPI.marketTrends,
    fields: [
      { key: 'genre', label: 'Genre Focus', type: 'select', options: ['All genres', 'Pop', 'Rock', 'R&B', 'Hip-Hop', 'Electronic', 'EDM', 'Jazz', 'Country', 'Indie', 'Classical', 'Latin'] },
      { key: 'region', label: 'Region', type: 'select', options: ['Global', 'North America', 'Europe', 'Asia Pacific', 'Latin America', 'Africa', 'Middle East'] },
      { key: 'timeframe', label: 'Timeframe', type: 'select', options: ['Current year', 'Last 6 months', 'Last 12 months', 'Next year forecast'] },
    ]
  }
};

export default function AIPage() {
  const { feature } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const config = aiFeatures[feature];
  if (!config) {
    return (
      <div className="empty-state">
        <div className="icon">🤖</div>
        <h3>AI Feature Not Found</h3>
        <p>This AI feature doesn't exist.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: 16 }}>Go to Dashboard</button>
      </div>
    );
  }

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const { data } = await config.apiCall(formData);
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI analysis failed. Check your OpenRouter API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1>{config.icon} {config.title}</h1>
          <p>{config.description}</p>
        </div>
        <span className="card-badge badge-ai">🤖 AI Powered</span>
      </div>

      <div className="detail-panel">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: config.fields.length > 2 ? '1fr 1fr' : '1fr', gap: 16 }}>
            {config.fields.map(field => (
              <div className="form-group" key={field.key} style={field.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
                <label>{field.label}</label>
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
                    rows={4}
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
        <StructuredAIDisplay result={result} feature={feature} loading={loading} />
      ) : (
        <AIResultDisplay result={result} loading={loading} />
      )}
    </div>
  );
}
