// PostHog error watch — pulls new `$exception` events from PostHog Error
// Tracking since a cursor and surfaces them as a grouped digest. Driven by
// the `posthog-error-watch` cron workflow (every ~15 min). The point: the
// moment a beta tester crashes the app, a Claude session gets a notification
// (a comment on the tracking issue) with the exact error + how many users it
// hit — so it can be triaged and fixed without David copy-pasting a stack.
//
// The app already mirrors every crash path (window.onerror,
// unhandledrejection, React error boundary, continuity-error) into PostHog
// Error Tracking as a `$exception` event (see src/services/analytics.ts).
// This watcher reads them back out.
//
// Env:
//   POSTHOG_API_KEY      (required) personal read key, `phx_…`
//                        (scopes: query:read / project:read). Set ONCE in the
//                        Claude Code env-var config AND as a repo Action secret.
//   POSTHOG_PROJECT_ID   (optional) numeric project id; auto-resolved if unset.
//   POSTHOG_HOST         (optional) default https://us.posthog.com (US cloud).
//   SINCE_MS             only exceptions newer than this epoch-ms
//                        (default: 24h ago — the first-run lookback).
//   OUT_FILE             path to write the digest JSON (default /tmp/posthog-errors.json).
//   GITHUB_OUTPUT        when set, writes count / maxTs / hasErrors outputs.
//
// Exit behavior mirrors watch-voice-failures.mjs: NEVER hard-fail the cron on
// a missing key / transient API error — log, emit hasErrors=false, return.

import { writeFile, appendFile } from 'node:fs/promises';

const HOST = (process.env.POSTHOG_HOST || 'https://us.posthog.com').replace(/\/+$/, '');
const SINCE_MS = Number(process.env.SINCE_MS ?? Date.now() - 24 * 60 * 60_000);
const OUT_FILE = process.env.OUT_FILE ?? '/tmp/posthog-errors.json';

// Resolve the personal read key robustly (matches scripts/posthog-query.mjs):
// canonical name first, then common aliases, then any `phx_…` value in env.
function resolvePostHogKey() {
  const direct = process.env.POSTHOG_API_KEY
    || process.env.POSTHOG_PERSONAL_API_KEY
    || process.env.Read_key_PostHog
    || process.env.POSTHOG_READ_API_KEY;
  if (direct) return direct;
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string' && /^phx_[A-Za-z0-9]/.test(v)) {
      console.error(`# (using PostHog key from env var "${k}")`);
      return v;
    }
  }
  return undefined;
}

async function setOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

// Multiline GITHUB_OUTPUT (heredoc form) — used for the human-readable
// digest the auto-fix workflow interpolates into Claude's prompt.
async function setMultilineOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    const delim = `__EOF_${key}_${Date.now()}__`;
    await appendFile(process.env.GITHUB_OUTPUT, `${key}<<${delim}\n${value}\n${delim}\n`);
  }
}

async function emitEmpty(reason) {
  if (reason) console.log(`[posthog-watch] ${reason}`);
  await setOutput('count', '0');
  await setOutput('hasErrors', 'false');
}

async function api(key, path, init = {}) {
  const res = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PostHog API ${res.status} ${res.statusText} for ${path}\n${body.slice(0, 300)}`);
  }
  return res.json();
}

async function resolveProjectId(key) {
  if (process.env.POSTHOG_PROJECT_ID) return process.env.POSTHOG_PROJECT_ID;
  const data = await api(key, '/api/projects/');
  const results = data.results || [];
  if (!results.length) throw new Error('No PostHog projects visible to this key.');
  return String(results[0].id);
}

async function main() {
  const key = resolvePostHogKey();
  if (!key) {
    await emitEmpty('POSTHOG_API_KEY not set — skipping (add it as a repo secret + env var).');
    return;
  }

  const sinceIso = new Date(SINCE_MS).toISOString().replace('T', ' ').replace('Z', '');
  // Group recent `$exception` events into issues. `$exception_fingerprint`
  // is PostHog's stable grouping key; fall back to the issue id, then the
  // raw value, so an ungrouped crash still surfaces as its own row.
  const query = `
    SELECT
      toUnixTimestamp(max(timestamp)) * 1000 AS lastTs,
      count() AS occurrences,
      count(DISTINCT person_id) AS users,
      any(properties.$exception_types) AS excType,
      any(properties.$exception_values) AS excValue,
      coalesce(
        toString(properties.$exception_fingerprint),
        toString(properties.$exception_issue_id),
        toString(properties.$exception_values),
        'unknown'
      ) AS groupKey
    FROM events
    WHERE event = '$exception' AND timestamp > toDateTime('${sinceIso}')
    GROUP BY groupKey
    ORDER BY lastTs DESC
    LIMIT 50`;

  let projectId;
  let data;
  try {
    projectId = await resolveProjectId(key);
    data = await api(key, `/api/projects/${projectId}/query/`, {
      method: 'POST',
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    });
  } catch (err) {
    // Transient API / auth / query error — never break the cron.
    await emitEmpty(`query failed: ${err.message}`);
    return;
  }

  const rows = Array.isArray(data.results) ? data.results : [];
  const errors = rows.map((r) => ({
    lastTs: Number(r[0]) || SINCE_MS,
    occurrences: Number(r[1]) || 0,
    users: Number(r[2]) || 0,
    type: cleanStr(r[3]),
    value: cleanStr(r[4]),
    groupKey: cleanStr(r[5]),
  }));
  errors.sort((a, b) => a.lastTs - b.lastTs);

  // Also pull coach NON-ANSWERS (David 2026-06-14): the coach connected but
  // didn't address the question (canned fallback / re-ask / empty). These are
  // emitted by the app as `coach_non_answer` (src/services/coachNonAnswer.ts);
  // surface them alongside crashes so the autofix pipeline triages them too.
  const naQuery = `
    SELECT
      toUnixTimestamp(max(timestamp)) * 1000 AS lastTs,
      count() AS occurrences,
      count(DISTINCT person_id) AS users,
      any(properties.reason) AS reason,
      any(properties.question) AS question,
      any(properties.surface) AS surface
    FROM events
    WHERE event = 'coach_non_answer' AND timestamp > toDateTime('${sinceIso}')
    GROUP BY properties.reason, properties.question
    ORDER BY lastTs DESC
    LIMIT 25`;
  try {
    const naData = await api(key, `/api/projects/${projectId}/query/`, {
      method: 'POST',
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: naQuery } }),
    });
    for (const r of Array.isArray(naData.results) ? naData.results : []) {
      const reason = cleanStr(r[3]) || 'non-answer';
      const question = cleanStr(r[4]);
      const surface = cleanStr(r[5]);
      errors.push({
        lastTs: Number(r[0]) || SINCE_MS,
        occurrences: Number(r[1]) || 0,
        users: Number(r[2]) || 0,
        type: 'coach non-answer',
        value: `${reason}${surface ? ` [${surface}]` : ''}: "${question}"`,
        groupKey: `coach_non_answer:${reason}:${question}`,
      });
    }
  } catch (err) {
    // Non-fatal — a non-answer query hiccup must not break crash watching.
    console.log(`[posthog-watch] coach_non_answer query skipped: ${err.message}`);
  }
  errors.sort((a, b) => a.lastTs - b.lastTs);

  const maxTs = errors.length ? errors[errors.length - 1].lastTs : SINCE_MS;
  console.log(
    `[posthog-watch] project=${projectId} window-since=${new Date(SINCE_MS).toISOString()} ` +
      `issues=${errors.length}`,
  );
  for (const e of errors) {
    console.log(
      `    ${new Date(e.lastTs).toISOString()}  ${e.type || '(no type)'}: ${e.value || '(no message)'} ` +
        `— ${e.occurrences}x / ${e.users} user(s)`,
    );
  }

  await writeFile(OUT_FILE, JSON.stringify({ since: SINCE_MS, maxTs, errors }, null, 2));
  await setOutput('count', String(errors.length));
  await setOutput('maxTs', String(maxTs));
  await setOutput('hasErrors', errors.length > 0 ? 'true' : 'false');

  // A compact plain-text digest for the auto-fix prompt (newest first).
  const digest = [...errors]
    .reverse()
    .map((e) => `- ${e.type || '(no type)'}: ${e.value || '(no message)'} — ${e.occurrences}x / ${e.users} user(s), last ${new Date(e.lastTs).toISOString()}`)
    .join('\n');
  await setMultilineOutput('digest', digest || '(none)');
}

// PostHog returns array properties (`$exception_types`/`$exception_values`)
// JSON-encoded like `["TypeError"]`; unwrap a single-element array to its
// value and trim quotes/brackets for a clean one-line digest.
function cleanStr(v) {
  if (v === null || v === undefined) return '';
  let s = String(v).trim();
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) s = arr.map((x) => String(x)).join(', ');
    } catch {
      s = s.slice(1, -1);
    }
  }
  return s.replace(/^"|"$/g, '').slice(0, 300);
}

main();
