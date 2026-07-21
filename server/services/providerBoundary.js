'use strict';

const PROVIDERS = Object.freeze(['LEDGER', 'BANKING', 'BILLING', 'CRM', 'MARKET_DATA', 'DOCUMENTS', 'FILINGS']);

function providerReadiness(env = process.env) {
  const providers = PROVIDERS.map((name) => {
    const enabled = env[`${name}_PROVIDER_ENABLED`] === 'true';
    const endpoint = String(env[`${name}_PROVIDER_URL`] || '');
    const credential = String(env[`${name}_PROVIDER_TOKEN`] || '');
    const secureEndpoint = /^https:\/\//.test(endpoint);
    return { name: name.toLowerCase(), enabled, ready: enabled && secureEndpoint && Boolean(credential), reason: enabled && secureEndpoint && credential ? null : 'disabled or missing HTTPS endpoint/runtime credential' };
  });
  return { ready: providers.every((item) => item.ready), providers };
}

function requireProviders(names, env = process.env) {
  const readiness = providerReadiness(env);
  const requested = names.map((name) => String(name).toLowerCase());
  const known = new Set(readiness.providers.map((item) => item.name));
  const unknown = requested.filter((name) => !known.has(name));
  if (unknown.length) throw Object.assign(new Error(`unknown providers: ${unknown.join(', ')}`), { code: 'PROVIDER_NOT_READY' });
  const unavailable = readiness.providers.filter((item) => requested.includes(item.name) && !item.ready);
  if (unavailable.length) throw Object.assign(new Error(`providers not ready: ${unavailable.map((item) => item.name).join(', ')}`), { code: 'PROVIDER_NOT_READY' });
  return readiness.providers.filter((item) => requested.includes(item.name));
}

module.exports = { PROVIDERS, providerReadiness, requireProviders };
