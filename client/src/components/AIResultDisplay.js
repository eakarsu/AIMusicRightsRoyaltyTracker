import React from 'react';
import ReactMarkdown from 'react-markdown';

function tryParseJSON(text) {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1].trim());
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function renderValue(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (value >= 1000) return value.toLocaleString();
    return value.toString();
  }
  return String(value);
}

function getScoreClass(score) {
  if (score >= 70) return 'ai-score-high';
  if (score >= 40) return 'ai-score-medium';
  return 'ai-score-low';
}

function renderArrayItems(arr) {
  if (!Array.isArray(arr)) return null;
  return (
    <ul className="ai-list">
      {arr.map((item, i) => (
        <li key={i}>
          {typeof item === 'object' ? (
            <div>
              {Object.entries(item).map(([k, v]) => (
                <div key={k}><strong style={{ textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}:</strong> {renderValue(v)}</div>
              ))}
            </div>
          ) : renderValue(item)}
        </li>
      ))}
    </ul>
  );
}

function renderJSONBeautifully(data, depth = 0) {
  if (!data || typeof data !== 'object') return <p className="ai-text">{renderValue(data)}</p>;

  return Object.entries(data).map(([key, value]) => {
    const title = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');

    // Score fields
    if ((key.toLowerCase().includes('score') || key.toLowerCase().includes('rating')) && typeof value === 'number') {
      return (
        <div className="ai-section" key={key}>
          <div className="ai-section-title">{title}</div>
          <div className={`ai-score ${getScoreClass(value)}`}>{value}</div>
        </div>
      );
    }

    // Arrays
    if (Array.isArray(value)) {
      return (
        <div className="ai-section" key={key}>
          <div className="ai-section-title">{title}</div>
          {renderArrayItems(value)}
        </div>
      );
    }

    // Nested objects
    if (typeof value === 'object' && value !== null) {
      return (
        <div className="ai-section" key={key}>
          <div className="ai-section-title">{title}</div>
          <div className="ai-kv-grid">
            {Object.entries(value).map(([k, v]) => (
              <div className="ai-kv-item" key={k}>
                <div className="kv-label">{k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</div>
                <div className="kv-value">{typeof v === 'object' ? JSON.stringify(v) : renderValue(v)}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Simple values
    return (
      <div className="ai-section" key={key}>
        <div className="ai-section-title">{title}</div>
        <p className="ai-text">{renderValue(value)}</p>
      </div>
    );
  });
}

export default function AIResultDisplay({ result, loading }) {
  if (loading) {
    return (
      <div className="ai-result-container">
        <div className="ai-loading">
          <div className="spinner"></div>
          <p>AI is analyzing your data...</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const { analysis, model, usage } = result;
  const parsed = tryParseJSON(analysis);

  return (
    <div className="ai-result-container">
      <div className="ai-result-header">
        <span className="ai-icon">🤖</span>
        <h4>AI Analysis Result</h4>
        {model && <span className="model-badge">{model}</span>}
      </div>
      <div className="ai-result-body">
        {parsed ? (
          renderJSONBeautifully(parsed)
        ) : (
          <div className="ai-text">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
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
