// posthog-query — let a Claude Code session read PostHog product analytics
// without ever asking David for a key.
//
// Durable access (set ONCE, then every session has it):
//   Add a PostHog PERSONAL API key to the Claude Code environment env-var
//   config (web UI) as POSTHOG_API_KEY. It's injected into process.env for
//   every session — the session-secrets hook reports its presence so a
//   session knows it can query without asking. The project's public `phc_`
//   ingestion key (in Vercel) is for the APP to SEND events; THIS read key
//   (`phx_…`, personal, scopes: query:read / insight:read / project:read)
//   is for Claude to PULL data back out.
//
// Env:
//   POSTHOG_API_KEY     (required) personal API key, `phx_…`
//   POSTHOG_PROJECT_ID  (optional) numeric project id; auto-resolved if unset
//   POSTHOG_HOST        (optional) default https://us.posthog.com (US cloud)
//
// Usage:
//   node scripts/posthog-query.mjs                 # top events, last 7 days
//   node scripts/posthog-query.mjs "<HogQL SQL>"   # arbitrary HogQL query
//   node scripts/posthog-query.mjs --events 14     # top events, last N days
//
// HogQL is ClickHouse-flavored SQL over the `events` table. Examples:
//   SELECT event, count() AS c FROM events
//     WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY event ORDER BY c DESC
//   SELECT count(DISTINCT person_id) FROM events
//     WHERE timestamp > now() - INTERVAL 1 DAY

const HOST = (process.env.POSTHOG_HOST || 'https://us.posthog.com').replace(/\/+$/, '');
// Resolve the personal read key robustly. It's SUPPOSED to be POSTHOG_API_KEY,
// but it's been set under other names in the env config (e.g. Read_key_PostHog).
// So: prefer the canonical name, then any common alias, then ANY env var whose
// value looks like a PostHog personal key (`phx_…`). This makes the script work
// no matter what the var was named — never burn a session on a name mismatch
// again (2026-06-10).
function resolvePostHogKey() {
  const direct = process.env.POSTHOG_API_KEY
    || process.env.POSTHOG_PERSONAL_API_KEY
    || process.env.Read_key_PostHog
    || process.env.POSTHOG_READ_API_KEY;
  if (direct) return direct;
  // Last resort: scan every env var for a `phx_` value (the personal-key
  // prefix). The public project key is `phc_`, so this won't grab that.
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string' && /^phx_[A-Za-z0-9]/.test(v)) {
      console.error(`# (using PostHog key from env var "${k}")`);
      return v;
    }
  }
  return undefined;
}
const KEY = resolvePostHogKey();

function die(msg) {
  console.error(msg);
  process.exit(1);
}

if (!KEY) {
  die(
    [
      'POSTHOG_API_KEY is not set — Claude can\'t read PostHog yet.',
      '',
      'Fix it ONCE (then every session has it):',
      '  1. PostHog → Settings → Personal API Keys → create a key',
      '     (scopes: query:read, insight:read, project:read). It starts `phx_`.',
      '  2. Claude Code web UI → environment env-var config → add',
      '     POSTHOG_API_KEY = phx_…   (optionally POSTHOG_PROJECT_ID = <id>).',
      '',
      'The `phc_` key in Vercel is the app\'s WRITE key — not this one.',
    ].join('\n'),
  );
}

async function api(path, init = {}) {
  const res = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    die(`PostHog API ${res.status} ${res.statusText} for ${path}\n${body.slice(0, 500)}`);
  }
  return res.json();
}

async function resolveProjectId() {
  if (process.env.POSTHOG_PROJECT_ID) return process.env.POSTHOG_PROJECT_ID;
  const data = await api('/api/projects/');
  const results = data.results || [];
  if (!results.length) die('No PostHog projects visible to this key.');
  if (results.length > 1) {
    console.error(
      `[posthog] ${results.length} projects visible; using "${results[0].name}" (id ${results[0].id}). ` +
        'Set POSTHOG_PROJECT_ID to pin one.',
    );
  }
  return String(results[0].id);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args[0] === '--events') {
    const days = Number(args[1] || '7');
    return `SELECT event, count() AS count FROM events
      WHERE timestamp > now() - INTERVAL ${Number.isFinite(days) ? days : 7} DAY
      GROUP BY event ORDER BY count DESC LIMIT 50`;
  }
  if (args[0] && !args[0].startsWith('--')) return args.join(' ');
  // Default: top events last 7 days — a quick "is data flowing?" check.
  return `SELECT event, count() AS count FROM events
    WHERE timestamp > now() - INTERVAL 7 DAY
    GROUP BY event ORDER BY count DESC LIMIT 50`;
}

function printTable(columns, rows) {
  if (!rows.length) {
    console.log('(no rows — either no events in range, or the app hasn\'t sent any yet)');
    return;
  }
  const widths = columns.map((c, i) =>
    Math.max(String(c).length, ...rows.map((r) => String(r[i] ?? '').length)),
  );
  const fmt = (cells) => cells.map((v, i) => String(v ?? '').padEnd(widths[i])).join('  ');
  console.log(fmt(columns));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(fmt(r));
}

async function main() {
  const query = parseArgs(process.argv);
  const projectId = await resolveProjectId();
  const data = await api(`/api/projects/${projectId}/query/`, {
    method: 'POST',
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  });
  const columns = data.columns || (data.types || []).map((_, i) => `col${i}`);
  const rows = data.results || [];
  console.log(`# PostHog project ${projectId} — ${rows.length} row(s)\n`);
  printTable(columns, rows);
}

main().catch((e) => die(String(e?.stack || e)));
