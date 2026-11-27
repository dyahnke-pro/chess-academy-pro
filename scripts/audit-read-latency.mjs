#!/usr/bin/env node
/**
 * audit-read-latency — "Read this position": how long from the tap to the
 * first spoken word, and whether the read then runs without a gap
 * (Coach Build Board, "Read this position": first word in about half a
 * second, the deep line following with no gap).
 *
 * Eleven real boards (Danya's videos, `danya-havecheck` — the first eleven),
 * each opened fresh on /coach/play?fen=… with the student on the side to move,
 * so no engine read is cached. Muted (G1: `muteTtsForAudit` — the listener
 * reads every line off the app's own `coach-narration-spoken` event, nothing
 * is synthesised). Per board it reports:
 *   - firstMs: tap → first spoken line (the listener's receive time);
 *   - lastMs: tap → last spoken line;
 *   - worstGapMs: the longest silence between one line's (simulated) end and
 *     the next line's start;
 *   - watchFor: whether the read said their likeliest try ("watch for …",
 *     the `their-refuted` lane);
 *   - the lines, in order.
 *
 * Usage (local preview):
 *   npx vite build && npx vite preview --port 4173 &
 *   AUDIT_SMOKE_URL=http://localhost:4173 node scripts/audit-read-latency.mjs
 *   AUDIT_OUT=<file> to keep the JSON somewhere else.
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { until } from './audit-lib/wedge-watch.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:4173';
const N = Number(process.env.AUDIT_BOARDS ?? 11);
const OUT = process.env.AUDIT_OUT ?? `audit-reports/read-latency-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
const boards = readFileSync('audit-reports/danya-havecheck/board-facts-2026-11-19-unlocked.jsonl', 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l))
  // A board in check opens no read on /coach/play (nothing to read but the
  // escape): the next real board takes its place.
  .filter((b) => !new Chess(b.fen).inCheck()).slice(0, N);

/** The muted line's simulated length (voiceService.simulateSpeechDuration). */
const spokenMs = (t) => { const w = t.trim().split(/\s+/).filter(Boolean).length; return Math.min(12000, Math.max(400, Math.round((w / 150) * 60000))); };

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(false), args: sandboxLaunchArgs() });
  const listener = await startAuditListener();
  const rows = [];
  try {
    for (const b of boards) {
      const ctx = await browser.newContext(sandboxContextOptions());
      await ctx.addInitScript(({ url, secret }) => {
        try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
      }, { url: listener.url, secret: listener.secret });
      await ctx.addInitScript(autoDismissCalibration);
      await ctx.addInitScript(muteTtsForAudit);
      const page = await ctx.newPage();
      const side = b.fen.split(' ')[1] === 'w' ? 'white' : 'black';
      const row = { id: b.id, fen: b.fen };
      try {
        await page.goto(`${BASE}/coach/play?fen=${encodeURIComponent(b.fen)}&side=${side}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const btn = page.locator('[data-testid="read-position-btn"]').first();
        await btn.waitFor({ state: 'visible', timeout: 60000 });
        // Let the page settle (engine worker up, first renders done) so the
        // tap measures the read, not the boot.
        await page.waitForTimeout(6000);
        const t0 = Date.now();
        await btn.click({ timeout: 5000 });
        const spoken = () => listener.getCapturedEvents()
          .filter((e) => e.kind === 'coach-narration-spoken' && e.receivedAt >= t0 && e.narrationText)
          .sort((x, y) => x.receivedAt - y.receivedAt);
        // Until the read is over: 4 s of silence after the last line's
        // (simulated) end, or 180 s.
        await until(() => {
          const last = spoken().at(-1);
          return !!last && Date.now() > last.receivedAt + spokenMs(last.narrationText) + 4000;
        }, 180000, 150);
        const s = spoken();
        row.firstMs = s[0] ? s[0].receivedAt - t0 : null;
        row.lastMs = s.at(-1) ? s.at(-1).receivedAt - t0 : null;
        let worst = 0;
        for (let k = 1; k < s.length; k++) worst = Math.max(worst, s[k].receivedAt - (s[k - 1].receivedAt + spokenMs(s[k - 1].narrationText)));
        row.worstGapMs = worst;
        row.lines = s.map((e) => `+${e.receivedAt - t0}ms ${e.narrationText}`);
        // The read's own row: the kinds each part said. The "watch for" is
        // their likeliest try after the best move (the their-try step).
        const composed = listener.getCapturedEvents().filter((e) => e.kind === 'position-read-composed' && e.receivedAt >= t0).at(-1);
        const kinds = composed ? JSON.parse(composed.details ?? '{}') : null;
        row.kinds = kinds;
        row.watchFor = !!kinds && (kinds.deep ?? []).includes('watch-for');
      } catch (err) {
        row.error = String(err).slice(0, 200);
      }
      console.log(`${row.id.padEnd(42)} parts ${JSON.stringify(row.kinds?.ms ?? null)} first ${row.firstMs ?? '-'}ms  last ${row.lastMs ?? '-'}ms  gap ${row.worstGapMs ?? '-'}ms  watchFor ${row.watchFor ? 'yes' : 'no'}${row.error ? `  ERR ${row.error}` : ''}`);
      rows.push(row);
      await ctx.close();
    }
  } finally {
    await browser.close();
    await listener.close?.();
  }
  const firsts = rows.map((r) => r.firstMs).filter((x) => typeof x === 'number').sort((a, b) => a - b);
  const median = firsts.length ? firsts[Math.floor(firsts.length / 2)] : null;
  const summary = { base: BASE, boards: rows.length, spoke: firsts.length, medianFirstMs: median, worstFirstMs: firsts.at(-1) ?? null, watchFor: rows.filter((r) => r.watchFor).length, worstGapMs: Math.max(0, ...rows.map((r) => r.worstGapMs ?? 0)) };
  console.log(JSON.stringify(summary));
  mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ summary, rows }, null, 2));
}

// An open handle (the listener's socket, a browser pipe) can keep node alive
// after the report is written: exit once it is.
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
