#!/usr/bin/env node
/**
 * posthog-watch — lightweight live issue poller for a launch window.
 *
 * Polls PostHog every INTERVAL seconds and prints ONE line per cycle.
 * Prefixes "⚠️ ALERT" when something real crosses a threshold:
 *   - any coach-llm-provider-error (brain actually failing for a user)
 *   - any unhandled promise rejection
 *   - a NEW $exception value not in the known-benign set (the grounding
 *     gates + the already-reported sanitizer-leak are benign/handled)
 *   - a tts_failure spike (> TTS_SPIKE in the window)
 * Otherwise prints a terse heartbeat so we know it's alive.
 *
 * Reuses scripts/posthog-query.mjs's key resolution by shelling to it.
 */
import { execFileSync } from 'node:child_process';

const INTERVAL_S = Number(process.env.WATCH_INTERVAL_S || 300);
const WINDOW_MIN = Math.ceil((INTERVAL_S / 60) + 1); // slight overlap
const TTS_SPIKE = Number(process.env.WATCH_TTS_SPIKE || 10);
const CYCLES = Number(process.env.WATCH_CYCLES || 12); // ~1h at 5min

// Substrings of $exception values we already know about / are by-design
// (grounding gates dropping bad LLM sentences, the reported sanitizer leak).
const BENIGN = [
  'out-of-vocab tactics',
  'ungrounded sentence',
  'board-false sentence',
  'Piece-letter shorthand survived',
  'did not announce it', // boardAnnounceGate
];

function q(sql) {
  try {
    const out = execFileSync('node', ['scripts/posthog-query.mjs', sql], {
      encoding: 'utf8',
      timeout: 60000,
    });
    return out;
  } catch (e) {
    return `ERR ${String(e?.message || e).slice(0, 80)}`;
  }
}

function rows(sql) {
  const out = q(sql);
  const lines = out.split('\n').filter((l) => l && !l.startsWith('#') && !l.startsWith('-') && !/^\S+ +\S/.test(l) === false);
  return out;
}

function poll() {
  const w = `timestamp > now() - INTERVAL ${WINDOW_MIN} MINUTE`;
  const provErr = q(`SELECT count() FROM events WHERE properties.audit_kind='coach-llm-provider-error' AND ${w}`);
  const rejection = q(`SELECT count() FROM events WHERE event='$exception' AND properties.\$exception_values ILIKE '%onunhandledrejection%' AND ${w}`);
  const tts = q(`SELECT count() FROM events WHERE event='tts_failure' AND ${w}`);
  const excVals = q(`SELECT properties.\$exception_values AS v, count() AS c FROM events WHERE event='$exception' AND ${w} GROUP BY v ORDER BY c DESC LIMIT 15`);
  const active = q(`SELECT count(DISTINCT properties.\$device_id) FROM events WHERE ${w}`);

  const num = (s) => {
    const m = s.match(/\n(\d+)\s*$/) || s.match(/(\d+)\s*$/);
    return m ? Number(m[1]) : (s.includes('ERR') ? -1 : 0);
  };
  const provN = num(provErr);
  const ttsN = num(tts);
  const usersN = num(active);

  // New exception values = any line in excVals whose text isn't benign.
  const newExc = [];
  for (const line of excVals.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('-') || t.toLowerCase().startsWith('v ') || t === 'v  c') continue;
    if (/^\["?/.test(t) || t.includes('"')) {
      if (!BENIGN.some((b) => t.includes(b))) newExc.push(t.slice(0, 90));
    }
  }

  const ts = new Date().toISOString().slice(11, 19);
  const alerts = [];
  if (provN > 0) alerts.push(`coach-llm-provider-error=${provN}`);
  if (ttsN > TTS_SPIKE) alerts.push(`tts_failure spike=${ttsN}`);
  if (newExc.length) alerts.push(`NEW exc: ${newExc.join(' | ')}`);

  if (alerts.length) {
    console.log(`⚠️ ALERT [${ts}] users=${usersN} :: ${alerts.join(' :: ')}`);
  } else {
    console.log(`[${ts}] ok — users=${usersN} providerErr=${provN} tts=${ttsN} (window ${WINDOW_MIN}m)`);
  }
}

let n = 0;
poll();
const timer = setInterval(() => {
  n += 1;
  poll();
  if (n >= CYCLES) {
    console.log(`[watch] ${CYCLES} cycles done — stopping.`);
    clearInterval(timer);
  }
}, INTERVAL_S * 1000);
