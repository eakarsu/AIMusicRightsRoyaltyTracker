# Audit Apply Note — AIMusicRightsRoyaltyTracker

Source: `_AUDIT/reports/batch_05.md` section 32.

## Original Recommendations
### Missing AI counterparts
- `/sampling-detection`
- `/metadata-cleaner`
- `/licensing-recommender`
- `/revenue-optimizer`

### Missing non-AI
- Real-time royalty settlement, copyright registration tracking, mechanical licensing, PRO performance royalty tracking, dispute resolution, artist portal

### Custom suggestions
- Agentic rights clearance; real-time royalty optimization; plagiarism/sampling continuous monitoring; artist earnings intelligence; mechanical licensing automation; catalog acquisition advisor

## Implemented
Added three endpoints in `server/routes/ai.js`:
- `POST /api/ai/sampling-detection`
- `POST /api/ai/metadata-cleaner`
- `POST /api/ai/licensing-recommender`

Reused `callOpenRouter`, `parseAIJson`, `persistAnalysis`, `auth`, `rateLimiter`.

## Backlog
| Item | Tag |
|---|---|
| `/revenue-optimizer` | MECHANICAL |
| Real-time royalty settlement | NEEDS-CREDS (Spotify/Apple APIs) |
| Copyright registration tracking | NEEDS-CREDS (USCO API) |
| Mechanical licensing automation | NEEDS-CREDS (HFA/MLC) |
| PRO performance royalty tracking | NEEDS-CREDS (ASCAP/BMI/SESAC) |
| Dispute resolution workflow | NEEDS-PRODUCT-DECISION |
| Artist portal | NEEDS-PRODUCT-DECISION |
| Catalog acquisition advisor | NEEDS-PRODUCT-DECISION |

## Apply pass 3 (frontend)

- Verified: `client/src/pages/AIToolsPage.js` is a tabbed UI that already surfaces the three new endpoints (`sampling-detection`, `metadata-cleaner`, `licensing-recommender`). `AIPage.js` covers the older endpoints (`contract-analysis`, `market-trends`, etc.).
- The `App.js` route table includes `/ai-tools` and `/ai/:feature` paths for both pages.
- **Action: LEFT-AS-IS** — frontend is fully wired for all backend AI endpoints, including the ones added in pass 2.

## Apply pass 4 (mechanical backlog)

Implemented `revenue-optimizer` (the only remaining MECHANICAL backlog item):

- BE (`server/routes/ai.js`): `POST /api/ai/revenue-optimizer` — pulls catalog, royalties, and active licenses; system prompt asks for top_opportunities, underperforming_assets, pricing_actions, channel_mix_recommendation, risk_flags. Persists via existing `persistAnalysis`. Explicit 503 when `OPENROUTER_API_KEY` is unset.
- FE (`client/src/pages/AIToolsPage.js`): added 4th tab `revenue` with form (catalogId optional, focusGenre, target select, timeframeMonths). Reuses existing axios `api` (bearer auth via interceptor) and `StructuredAIDisplay`/`AIResultDisplay`. Added 503 toast handling.
- Syntax: `node --check` PASS on `ai.js`; `@babel/parser` PASS on `AIToolsPage.js`.

Remaining items are NEEDS-CREDS (Spotify/Apple/USCO/HFA/MLC/ASCAP/BMI/SESAC) or NEEDS-PRODUCT-DECISION (dispute resolution workflow, artist portal, catalog acquisition advisor).

## Apply pass 5 (all backlog)

Added 5 backlog endpoints (mix of MECHANICAL and NEEDS-CREDS).

- BE (`server/routes/ai.js`, `server/services/openRouterService.js`):
  - Hardened `callOpenRouter` to throw 503+`missing: OPENROUTER_API_KEY` when key absent; all routes now map this to a 503 response.
  - `POST /api/ai/royalty-settlement` (NEEDS-CREDS: SPOTIFY_FOR_ARTISTS_TOKEN | APPLE_MUSIC_TOKEN) — queues into new `royalty_settlement_jobs` table.
  - `POST /api/ai/copyright-tracking` (NEEDS-CREDS: USCO_API_KEY) — queues into new `copyright_lookups` table.
  - `POST /api/ai/mechanical-licensing` (NEEDS-CREDS: MLC_API_KEY) — queues into new `mechanical_license_requests` table.
  - `POST /api/ai/pro-tracking` (NEEDS-CREDS: ASCAP_API_KEY | BMI_API_KEY | SESAC_API_KEY) — queues into new `pro_performance_reports` table.
  - `POST /api/ai/catalog-acquisition-advisor` — AI-only advisor (PRODUCT-DECISION: no external comp-sales DB; AI estimate flagged).
- FE (`client/src/services/api.js`, `client/src/pages/AIToolsPage.js`):
  - 5 new wrappers; 5 new tabs in AI Tools page (Acquisition Advisor, Settlement, Copyright, Mechanical, PRO).
  - 503 toast now surfaces the `missing` env name returned by backend.
- Syntax: `node --check` PASS on `ai.js`/`openRouterService.js`; `@babel/parser` PASS on JSX/JS.

Items still skipped: dispute resolution workflow, artist portal (both NEEDS-PRODUCT-DECISION; need RBAC + public surface design).
