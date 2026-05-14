import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function SeverityBadge({ level }) {
  const colors = {
    high: { bg: 'rgba(231,76,60,0.15)', border: 'rgba(231,76,60,0.4)', color: '#e74c3c' },
    medium: { bg: 'rgba(243,156,18,0.15)', border: 'rgba(243,156,18,0.4)', color: '#f39c12' },
    low: { bg: 'rgba(39,174,96,0.15)', border: 'rgba(39,174,96,0.4)', color: '#27ae60' },
  };
  const l = (level || 'medium').toLowerCase();
  const style = colors[l] || colors.medium;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      background: style.bg, border: `1px solid ${style.border}`, color: style.color, fontSize: 11
    }}>
      {level}
    </span>
  );
}

function ScoreBar({ score, label }) {
  const color = score >= 70 ? '#27ae60' : score >= 40 ? '#f39c12' : '#e74c3c';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
        <span style={{ color: '#e2e8f0' }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{score}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, score)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

function RoyaltyForecastChart({ structured }) {
  const q = structured.projected_revenue;
  if (!q) return null;
  const data = [
    { name: 'Q1', value: parseFloat(q.q1) || 0 },
    { name: 'Q2', value: parseFloat(q.q2) || 0 },
    { name: 'Q3', value: parseFloat(q.q3) || 0 },
    { name: 'Q4', value: parseFloat(q.q4) || 0 },
  ];
  return (
    <div style={{ marginBottom: 20 }}>
      <h4 style={{ color: '#a29bfe', marginBottom: 12, fontSize: 14 }}>Quarterly Revenue Forecast</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `$${v.toLocaleString()}`} />
          <Tooltip formatter={v => [`$${parseFloat(v).toLocaleString()}`, 'Revenue']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'][i]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {structured.growth_rate_pct !== undefined && (
        <div style={{ textAlign: 'center', color: structured.growth_rate_pct >= 0 ? '#27ae60' : '#e74c3c', fontSize: 14, marginTop: 8 }}>
          {structured.growth_rate_pct >= 0 ? '↑' : '↓'} {Math.abs(structured.growth_rate_pct)}% growth rate
        </div>
      )}
    </div>
  );
}

function ContractAnalysis({ structured }) {
  const healthColors = { good: '#27ae60', fair: '#f39c12', poor: '#e74c3c' };
  const health = structured.contract_health || 'fair';
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
        padding: '16px 20px', borderRadius: 10,
        background: `${healthColors[health] || '#64748b'}15`,
        border: `1px solid ${healthColors[health] || '#64748b'}40`
      }}>
        <div style={{ fontSize: 32 }}>{health === 'good' ? '✅' : health === 'poor' ? '❌' : '⚠️'}</div>
        <div>
          <div style={{ color: healthColors[health] || '#fff', fontWeight: 700, fontSize: 18, textTransform: 'capitalize' }}>
            Contract Health: {health}
          </div>
          {structured.compliance_score !== undefined && (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Compliance Score: {structured.compliance_score}/100</div>
          )}
        </div>
      </div>
      {structured.compliance_score !== undefined && (
        <ScoreBar score={structured.compliance_score} label="Compliance Score" />
      )}
      {structured.red_flags?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: '#e74c3c', marginBottom: 8, fontSize: 14 }}>🚩 Red Flags</h4>
          {structured.red_flags.map((flag, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'rgba(231,76,60,0.08)', borderLeft: '3px solid #e74c3c', borderRadius: '0 6px 6px 0', marginBottom: 6, fontSize: 13, color: '#e2e8f0' }}>
              {typeof flag === 'string' ? flag : JSON.stringify(flag)}
            </div>
          ))}
        </div>
      )}
      {structured.negotiation_opportunities?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: '#27ae60', marginBottom: 8, fontSize: 14 }}>💡 Negotiation Opportunities</h4>
          {structured.negotiation_opportunities.map((op, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'rgba(39,174,96,0.08)', borderLeft: '3px solid #27ae60', borderRadius: '0 6px 6px 0', marginBottom: 6, fontSize: 13, color: '#e2e8f0' }}>
              {typeof op === 'string' ? op : JSON.stringify(op)}
            </div>
          ))}
        </div>
      )}
      {structured.key_terms?.length > 0 && (
        <div>
          <h4 style={{ color: '#a29bfe', marginBottom: 8, fontSize: 14 }}>📋 Key Terms</h4>
          {structured.key_terms.map((term, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginBottom: 6, fontSize: 13, color: '#e2e8f0' }}>
              {typeof term === 'string' ? term : Object.entries(term).map(([k, v]) => `${k}: ${v}`).join(' | ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogValuation({ structured }) {
  const confidence = structured.confidence_level || 'medium';
  const confColors = { low: '#e74c3c', medium: '#f39c12', high: '#27ae60' };
  return (
    <div>
      <div style={{
        textAlign: 'center', padding: '24px', marginBottom: 20,
        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12
      }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>Estimated Catalog Value</div>
        <div style={{ color: '#6366f1', fontSize: 36, fontWeight: 700 }}>
          ${parseFloat(structured.estimated_value_usd || 0).toLocaleString()}
        </div>
        <div style={{
          display: 'inline-block', marginTop: 8, padding: '3px 10px', borderRadius: 12,
          background: `${confColors[confidence]}15`, border: `1px solid ${confColors[confidence]}40`,
          color: confColors[confidence], fontSize: 12
        }}>
          {confidence} confidence
        </div>
      </div>
      {structured.valuation_methodology && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: '#a29bfe', marginBottom: 6, fontSize: 14 }}>Methodology</h4>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>{structured.valuation_methodology}</p>
        </div>
      )}
      {structured.value_drivers?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: '#a29bfe', marginBottom: 8, fontSize: 14 }}>Value Drivers</h4>
          <ul style={{ paddingLeft: 20, color: '#e2e8f0', fontSize: 13 }}>
            {structured.value_drivers.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function StructuredAIDisplay({ result, feature, loading }) {
  if (loading) return null;
  if (!result) return null;

  const { structured, analysis, model, usage } = result;

  return (
    <div className="ai-result-container">
      <div className="ai-result-header">
        <span className="ai-icon">🤖</span>
        <h4>AI Analysis Result</h4>
        {model && <span className="model-badge">{model}</span>}
      </div>
      <div className="ai-result-body">
        {feature === 'forecasting' && structured && <RoyaltyForecastChart structured={structured} />}
        {feature === 'contract-analysis' && structured && <ContractAnalysis structured={structured} />}
        {feature === 'valuation' && structured && <CatalogValuation structured={structured} />}

        {/* Plagiarism score display */}
        {feature === 'plagiarism' && structured && (
          <div style={{ marginBottom: 20 }}>
            <ScoreBar score={structured.similarity_score || 0} label="Similarity Score" />
            <div style={{ marginTop: 12 }}>
              <span style={{
                padding: '4px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600,
                background: structured.plagiarism_detected ? 'rgba(231,76,60,0.15)' : 'rgba(39,174,96,0.15)',
                color: structured.plagiarism_detected ? '#e74c3c' : '#27ae60',
                border: `1px solid ${structured.plagiarism_detected ? 'rgba(231,76,60,0.3)' : 'rgba(39,174,96,0.3)'}`
              }}>
                {structured.plagiarism_detected ? '⚠ Plagiarism Detected' : '✅ Original'}
              </span>
            </div>
            {structured.originality_verdict && <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>{structured.originality_verdict}</p>}
            {structured.problematic_elements?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ color: '#e74c3c', marginBottom: 6, fontSize: 14 }}>Problematic Elements</h4>
                <ul style={{ paddingLeft: 20, color: '#e2e8f0', fontSize: 13 }}>
                  {structured.problematic_elements.map((el, i) => <li key={i}>{el}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Generic structured display */}
        {!['forecasting', 'contract-analysis', 'valuation', 'plagiarism'].includes(feature) && structured && (
          <pre style={{ color: '#94a3b8', fontSize: 12, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8, overflow: 'auto' }}>
            {JSON.stringify(structured, null, 2)}
          </pre>
        )}
      </div>
      {usage && (
        <div className="ai-usage">
          <span>Prompt tokens: {usage.prompt_tokens}</span>
          <span>Completion tokens: {usage.completion_tokens}</span>
          <span>Total tokens: {usage.total_tokens}</span>
        </div>
      )}
    </div>
  );
}
