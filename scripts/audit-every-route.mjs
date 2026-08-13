// Walk EVERY route in App.tsx against live prod. Mount, look for content,
// collect console + page errors, screenshot. The catch-all redirects unknown
// paths to the dashboard, so a route whose component is broken OR missing
// shows up here as either an error or an immediate bounce to "/".
//
// Parameterized routes get a real parameter (an opening id, a kid level) so
// the page renders content, not an empty-params edge case.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const OUT = `audit-reports/every-route-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

// ── Route inventory straight from the source of truth ─────────────────────
const app = readFileSync('src/App.tsx', 'utf8');
const all = [...app.matchAll(/path="([^"]+)"(\s+element={<Navigate)?/g)]
  .map((m) => ({ path: m[1], redirect: !!m[2] }));
const PARAMS = {
  ':id': 'caro-kann-defense', ':playerId': 'naroditsky', ':gameId': '1',
  ':kind': 'walkthrough', ':chapterId': '1', ':level': '1',
  ':piece': 'rook', ':game': 'maze', ':gameId2': '1',
};
const fill = (p) => p.replace(/:[a-zA-Z]+/g, (t) => PARAMS[t] ?? '1');
const routes = all.filter((r) => !r.redirect && r.path !== '*').map((r) => ({ raw: r.path, url: fill(r.path) }));

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`[routes] ${routes.length} real routes to walk on ${BASE}`);
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  const page = await ctx.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));

  // Boot once so the deferred seed + profile exist before the walk.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await sleep(8000);

  const rows = [];
  for (const r of routes) {
    const errsBefore = pageErrors.length;
    const consBefore = consoleErrors.length;
    let status = 'ok';
    let note = '';
    try {
      await page.goto(`${BASE}${r.url}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      // Every goto is a FULL SPA re-boot, and on this proxied container a boot
      // runs 8-25s. The first cut slept a fixed 3.5s and declared 74 routes
      // "empty" on the strength of their loading splash — one instrument bug
      // manufacturing 74 findings. Wait for actual content, up to a real boot.
      await page.waitForFunction(
        () => (document.body?.innerText ?? '').trim().length > 40,
        { timeout: 40_000 },
      ).catch(() => {});
      await sleep(1200);
      const finalPath = new URL(page.url()).pathname;
      // Bounced straight back to the dashboard = the route died or redirected
      // unexpectedly. Legal for guarded routes; a finding everywhere else.
      if (finalPath === '/' && r.url !== '/') { status = 'bounced'; note = 'landed on dashboard'; }
      else if (finalPath !== r.url && !finalPath.startsWith(r.url)) { status = 'redirected'; note = `→ ${finalPath}`; }
      // A mounted page has SOMETHING interactive or textual.
      const text = (await page.locator('body').innerText().catch(() => '')).trim();
      if (status === 'ok' && text.length < 40) { status = 'empty'; note = `body says: "${text.slice(0, 60)}"`; }
    } catch (e) {
      status = 'error'; note = String(e).slice(0, 120);
    }
    const newPage = pageErrors.length - errsBefore;
    const newCons = consoleErrors.length - consBefore;
    if (newPage > 0) { status = 'pageerror'; note = pageErrors[pageErrors.length - 1]; }
    rows.push({ route: r.raw, url: r.url, status, note, newPage, newCons });
    const mark = status === 'ok' ? '✓' : '✗';
    console.log(`  ${mark} ${r.url.padEnd(44)} ${status}${note ? ` — ${note}` : ''}${newCons ? ` [${newCons} console err]` : ''}`);
    if (status !== 'ok') await page.screenshot({ path: `${OUT}/${r.url.replace(/\//g, '_')}.png` }).catch(() => {});
  }

  await browser.close();
  const bad = rows.filter((x) => x.status !== 'ok');
  writeFileSync(`${OUT}/report.json`, JSON.stringify({ base: BASE, rows, consoleErrors: consoleErrors.slice(0, 80) }, null, 2));
  console.log(`\n──────── EVERY ROUTE ────────`);
  console.log(`walked ${rows.length}   ok ${rows.length - bad.length}   not-ok ${bad.length}`);
  for (const b of bad) console.log(`  ✗ ${b.url} — ${b.status} ${b.note}`);
  console.log(`report ${OUT}/report.json`);
  process.exit(bad.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error('ERROR', e); process.exit(1); });
