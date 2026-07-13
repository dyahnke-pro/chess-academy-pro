#!/usr/bin/env node
// Pull App Store Connect App Analytics — impressions, product-page views,
// downloads, sales/proceeds — via Apple's Analytics Reports API, print a
// human summary, and save the raw report CSVs.
//
// WHY THIS IS A SEPARATE THING FROM THE OTHER asc-*.mjs SCRIPTS: the metadata
// API (apps, subscriptions, pricing, builds) is synchronous. App Analytics is
// NOT — it is async + request-based:
//   1. You create ONE analyticsReportRequest per app (ONE_TIME_SNAPSHOT for a
//      one-off backfill, or ONGOING for a feed that refreshes daily forever).
//   2. Apple generates the report instances over the following hours/days.
//   3. You walk analyticsReportRequests → reports → instances → segments and
//      download each segment (a gzipped CSV) from its signed URL.
// So the FIRST run typically just REGISTERS the request and finds no data
// ready yet; the numbers land on a later run. This script is idempotent: it
// reuses an existing request of the chosen access type and pulls whatever
// instances Apple has made ready.
//
// Env:
//   ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID   ASC API key (same as sibling scripts)
//   APP_BUNDLE_ID           default com.chessacademy.pro
//   ANALYTICS_ACCESS_TYPE   ONGOING | ONE_TIME_SNAPSHOT   (default ONGOING)
//   ANALYTICS_GRANULARITY   DAILY | WEEKLY | MONTHLY       (default DAILY)
//   OUT_DIR                 where to save CSVs (default analytics-reports)
//   REPORT_FILTER           case-insensitive substring; only pull reports whose
//                           name matches (default: engagement+downloads+purchase)

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const ACCESS_TYPE = (process.env.ANALYTICS_ACCESS_TYPE || 'ONGOING').toUpperCase();
const GRANULARITY = (process.env.ANALYTICS_GRANULARITY || 'DAILY').toUpperCase();
const OUT_DIR = process.env.OUT_DIR || 'analytics-reports';
// Which reports to actually download. Apple exposes ~156 report types; these
// specific names carry what matters — store funnel (impressions/page views),
// downloads, and the subscription trial/paid/churn feed. Precise substrings so
// loose words ("install", "engagement") don't drag in AirPlay/Widget noise.
// Empty REPORT_FILTER pulls everything.
const DEFAULT_REPORTS = [
  'app store discovery and engagement', // impressions + product page views (the funnel top)
  'app downloads',                      // first-time downloads / redownloads / total
  'app store purchases',                // units + proceeds
  'app store subscription',             // Event + State reports: trials, paid conversions, churn
  'app store installation and deletion',
  'app store web preview engagement',
];
const REPORT_FILTER = (process.env.REPORT_FILTER ?? DEFAULT_REPORTS.join('|'))
  .split('|').map((s) => s.trim().toLowerCase()).filter(Boolean);

function req(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env ${n}`); return v; }
function loadKey() { let p = req('ASC_KEY_P8'); if (!p.includes('BEGIN')) p = Buffer.from(p, 'base64').toString('utf8'); return createPrivateKey({ key: p, format: 'pem' }); }
const PK = loadKey();
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function jwt() {
  const h = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const p = { iss: ISSUER_ID, iat: now, exp: now + 19 * 60, aud: 'appstoreconnect-v1' };
  const si = `${b64url(JSON.stringify(h))}.${b64url(JSON.stringify(p))}`;
  return `${si}.${b64url(cryptoSign('sha256', Buffer.from(si), { key: PK, dsaEncoding: 'ieee-p1363' }))}`;
}

async function api(method, path, body, { soft = false } = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${ASC}${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  if (!res.ok) {
    if (soft) return { __error: res.status, __body: t };
    throw new Error(`${method} ${path} → ${res.status}\n${t}`);
  }
  return t ? JSON.parse(t) : {};
}

// Walk a paginated ASC collection, following links.next.
async function all(path) {
  const out = [];
  let url = path;
  for (let page = 0; page < 50 && url; page++) {
    const r = await api('GET', url);
    out.push(...(r.data || []));
    url = r.links?.next ? r.links.next.replace(ASC, '') : null;
  }
  return out;
}

// Parse Apple's tab-separated report body and sum the metric columns we care
// about, so the log carries an at-a-glance headline without a spreadsheet.
function summariseTsv(name, text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  if (lines.length < 2) return { name, rows: 0 };
  const header = lines[0].split('\t');
  const idx = (needle) => header.findIndex((h) => h.toLowerCase() === needle.toLowerCase());
  const dateCol = idx('Date');
  const sums = {};
  const WANT = ['Impressions', 'Impressions Unique Device', 'Product Page Views',
    'Product Page Views Unique Device', 'Total Downloads', 'First Time Downloads',
    'Redownloads', 'Units', 'Installs', 'Proceeds', 'Sales'];
  const cols = WANT.map((w) => ({ w, i: idx(w) })).filter((c) => c.i >= 0);
  let minDate = null; let maxDate = null;
  for (let r = 1; r < lines.length; r++) {
    const cells = lines[r].split('\t');
    if (dateCol >= 0) {
      const d = cells[dateCol];
      if (d && (!minDate || d < minDate)) minDate = d;
      if (d && (!maxDate || d > maxDate)) maxDate = d;
    }
    for (const c of cols) {
      const n = Number(cells[c.i]);
      if (Number.isFinite(n)) sums[c.w] = (sums[c.w] || 0) + n;
    }
  }
  return { name, rows: lines.length - 1, dateRange: minDate && maxDate ? `${minDate} … ${maxDate}` : null, sums };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // 1. Resolve the app.
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  if (!app) throw new Error(`app not found for bundleId ${BUNDLE_ID}`);
  console.log(`app=${app.id} (${app.attributes?.name || BUNDLE_ID})  accessType=${ACCESS_TYPE}  granularity=${GRANULARITY}`);

  // 2. Reuse an existing request of this access type, else create one.
  const existing = await all(`/v1/apps/${app.id}/analyticsReportRequests?limit=200`);
  let request = existing.find((r) => r.attributes?.accessType === ACCESS_TYPE && !r.attributes?.stoppedDueToInactivity);
  if (!request) {
    console.log(`no active ${ACCESS_TYPE} request — creating one…`);
    const created = await api('POST', '/v1/analyticsReportRequests', {
      data: {
        type: 'analyticsReportRequests',
        attributes: { accessType: ACCESS_TYPE },
        relationships: { app: { data: { type: 'apps', id: app.id } } },
      },
    }, { soft: true });
    if (created.__error) {
      console.error(`::error::could not create analyticsReportRequest (${created.__error})`);
      console.error(created.__body?.slice(0, 500));
      if (created.__error === 403) {
        console.error('::error::403 — the ASC API key likely lacks the role needed for App Analytics (Admin/Finance/Sales). Grant it in App Store Connect → Users and Access → Integrations.');
      }
      process.exit(1);
    }
    request = created.data;
    console.log(`created request ${request.id}. Apple now generates the reports; data usually lands within 24-48h. Re-run then.`);
  } else {
    console.log(`reusing existing ${ACCESS_TYPE} request ${request.id}`);
  }

  // 3. Enumerate the reports in this request.
  const reports = await all(`/v1/analyticsReportRequests/${request.id}/reports?limit=200`);
  console.log(`\nreports available: ${reports.length}`);
  if (reports.length === 0) {
    console.log('No reports generated yet. This is normal on the first run — Apple is still preparing them. Re-run in ~24-48h.');
    return;
  }

  const wanted = reports.filter((rep) => {
    const nm = (rep.attributes?.name || '').toLowerCase();
    return REPORT_FILTER.length === 0 || REPORT_FILTER.some((f) => nm.includes(f));
  });
  console.log(`matching filter [${REPORT_FILTER.join(', ') || 'ALL'}]: ${wanted.length}`);
  for (const rep of reports) console.log(`  - ${rep.attributes?.category}: ${rep.attributes?.name}${wanted.includes(rep) ? '  ✔' : ''}`);

  // 4. For each wanted report, pull the newest instance's segments.
  const summaries = [];
  let downloaded = 0;
  for (const rep of wanted) {
    const name = rep.attributes?.name || rep.id;
    const instances = await all(`/v1/analyticsReports/${rep.id}/instances?filter[granularity]=${GRANULARITY}&limit=200`);
    if (instances.length === 0) { console.log(`\n[${name}] no ${GRANULARITY} instances ready yet`); continue; }
    // Newest processingDate first.
    instances.sort((a, b) => (b.attributes?.processingDate || '').localeCompare(a.attributes?.processingDate || ''));
    const inst = instances[0];
    const segments = await all(`/v1/analyticsReportInstances/${inst.id}/segments?limit=200`);
    console.log(`\n[${name}] newest ${GRANULARITY} instance ${inst.attributes?.processingDate} — ${segments.length} segment(s)`);
    for (let s = 0; s < segments.length; s++) {
      const url = segments[s].attributes?.url;
      if (!url) continue;
      const raw = Buffer.from(await (await fetch(url)).arrayBuffer());
      let text;
      try { text = gunzipSync(raw).toString('utf8'); } catch { text = raw.toString('utf8'); }
      const safe = `${name}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const file = join(OUT_DIR, `${safe}-${inst.attributes?.processingDate}-${s}.tsv`);
      writeFileSync(file, text);
      downloaded++;
      const sum = summariseTsv(name, text);
      summaries.push(sum);
      console.log(`   saved ${file}  (${sum.rows} rows${sum.dateRange ? `, ${sum.dateRange}` : ''})`);
    }
  }

  // 5. Headline.
  console.log('\n══════════ APP ANALYTICS SUMMARY ══════════');
  if (summaries.length === 0) {
    console.log('Reports are registered but no downloadable data is ready yet. Re-run in ~24-48h.');
  } else {
    for (const s of summaries) {
      const metrics = Object.entries(s.sums || {}).filter(([, v]) => v > 0);
      console.log(`\n${s.name}  [${s.dateRange || 'n/a'}]`);
      if (metrics.length === 0) { console.log('  (no recognised metric columns)'); continue; }
      for (const [k, v] of metrics) console.log(`  ${k}: ${Math.round(v).toLocaleString()}`);
    }
  }
  console.log(`\n════════════════════════════════════════`);
  console.log(`downloaded ${downloaded} segment file(s) → ${OUT_DIR}/`);
  writeFileSync(join(OUT_DIR, 'summary.json'), JSON.stringify({ app: app.id, accessType: ACCESS_TYPE, granularity: GRANULARITY, summaries }, null, 2));
}

main().catch((e) => { console.error('\n❌ asc-analytics failed:\n', e.message); process.exit(1); });
