import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * 🔒 NO AUDIT RUNS THROUGH REDIS (David 2026-09-11: "make sure no audit runs
 * through redis anymore").
 *
 * The audit-stream's backing store is the SHARED Upstash budget that also holds
 * the LLM/TTS spend guard, the bell's messages and the referral credits — one
 * 500k commands/month between them. Audits driving prod used to stream every
 * event into it at ~1 POST/sec per page; with ~279 browser-driving scripts and
 * an 8-shard post-deploy matrix, that was the dominant consumer. It exhausted
 * the budget in July (stranding ~60% of OTA update checks) and again in
 * September (silently switching the spend guard OFF — it fails open).
 *
 * Streaming is opt-in and off by default now, so a script has to go out of its
 * way to reach prod. This gate stops it going out of its way: an audit may
 * point `auditStreamUrl` at its own loopback sidecar and nowhere else.
 */
const SCRIPTS_DIR = join(process.cwd(), 'scripts');
const PROD_STREAM = 'chess-academy-pro.vercel.app/api/audit-stream';

/**
 * The ONE sanctioned exception: the script whose whole purpose is proving the
 * opt-in contract on prod. It points at prod deliberately and authenticates
 * with a knowingly-INVALID secret, so `api/audit-stream` 401s at the auth check
 * (before `appendEntries`) and no Redis command is ever issued. Verified by
 * reading that handler: the 401 precedes every Redis call.
 */
const ALLOWLIST = new Set(['audit-stream-optin-prod.mjs']);

function scriptFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...scriptFiles(join(dir, e.name)));
    else if (e.name.endsWith('.mjs')) out.push(join(dir, e.name));
  }
  return out;
}

describe('no audit streams into Redis', () => {
  const files = scriptFiles(SCRIPTS_DIR);

  it('finds the audit scripts (gate is not vacuous)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no script sets auditStreamUrl to a non-loopback host', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const name = f.split('/').pop() ?? f;
      if (ALLOWLIST.has(name)) continue;
      const src = readFileSync(f, 'utf-8');
      if (!src.includes('auditStreamUrl')) continue;
      // Any string literal assigned alongside auditStreamUrl must be loopback.
      for (const m of src.matchAll(/auditStreamUrl'\s*,\s*'([^']+)'/g)) {
        const url = m[1];
        if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url)) {
          offenders.push(`${name}: auditStreamUrl -> ${url}`);
        }
      }
    }
    expect(offenders, `these audits would bill the shared Redis budget:\n${offenders.join('\n')}`)
      .toEqual([]);
  });

  it('no script POSTs the prod audit-stream with a real secret', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const name = f.split('/').pop() ?? f;
      if (ALLOWLIST.has(name)) continue;
      const src = readFileSync(f, 'utf-8');
      if (!src.includes(PROD_STREAM)) continue;
      // A GET pull (?since=) is a single LRANGE a human may ask for explicitly;
      // what must never be automatic is a script POSTing events into it.
      if (/method:\s*'POST'/.test(src) || /\.post\(/.test(src)) {
        offenders.push(`${name}: POSTs to the prod audit-stream`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
