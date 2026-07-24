const fetch = require('node-fetch');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function callOpenRouter(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    const err = new Error('AI not configured. Set OPENROUTER_API_KEY to enable AI features.');
    err.status = 503;
    err.missing = 'OPENROUTER_API_KEY';
    throw err;
  }
  const baseUrl = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Music Rights & Royalty Tracker'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `OpenRouter HTTP ${response.status}`);
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) throw new Error('OpenRouter returned empty content');
  return { content, model: data.model, usage: data.usage };
}

module.exports = { callOpenRouter };
