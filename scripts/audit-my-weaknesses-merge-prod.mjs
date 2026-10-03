#!/usr/bin/env node
/**
 * audit-my-weaknesses-merge-prod — the merged My Weaknesses page (David
 * 2026-10-02: "those puzzle tabs can combine. My weaknesses should come from in
 * game mistakes first. Then databases.").
 *
 * Muted, 3-instrument (Playwright + the narration-listener sidecar; the stream
 * is opt-in and audits never write to it). Seeds REAL mistake rows through
 * `seedWeaknessProfile`, then drives the page like a person:
 *   A  the Tactics hub has ONE My Weaknesses row (no second tile)
 *   B  the page opens on GROUPS, worst first, no flat list
 *   C  opening a group lists exactly its own game positions
 *   D  Practice plays the group's positions on a board
 *   E  "More like this" continues on the puzzle database (a puzzle board)
 *   F  the retired /tactics/weakness-themes URL lands on the merged page
 *   G  "See all positions" still gives the flat list
 *   H  health: zero pageerrors, listener captured events
 *
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-my-weaknesses-merge-prod.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { seedWeaknessProfile } from './audit-lib/seed-weakness-profile.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 420, height: 900 } });
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(stampAuditRunId(`my-weak-${Math.random().toString(36).slice(2, 8)}`));
await ctx.addInitScript(({ url, secret }) => {
  try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* */ }
}, { url: listener.url, secret: LOCAL_LISTENER_SECRET });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

async function dismissModals() {
  try { const g = page.locator('[data-testid="ai-consent-modal"]'); await g.waitFor({ timeout: 4000 }); await page.locator('[data-testid="ai-consent-allow"]').click(); await g.waitFor({ state: 'detached', timeout: 10000 }); } catch { /* not shown */ }
}
const tid = (id) => page.locator(`[data-testid="${id}"]`);

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  await page.waitForTimeout(4000);
  const seeded = await seedWeaknessProfile(page);
  console.log('[seed]', JSON.stringify(seeded));

  // A — one row on the hub.
  await page.goto(`${BASE}/tactics`, { waitUntil: 'domcontentloaded' });
  await tid('section-my mistakes').waitFor({ timeout: 30000 });
  const rowText = await tid('section-my mistakes').innerText();
  check('A the Tactics hub has ONE My Weaknesses row', /My Weaknesses/.test(rowText) && (await tid('section-my-weaknesses').count()) === 0, rowText.split('\n')[0]);

  // B — opens on groups, worst first.
  await tid('section-my mistakes').click();
  await tid('weakness-groups').waitFor({ timeout: 30000 });
  const groupIds = await page.locator('[data-testid^="weakness-group-tactic:"], [data-testid^="weakness-group-phase:"], [data-testid^="weakness-group-endgame"], [data-testid^="weakness-group-transform"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  check('B opens on GROUPS, worst first (forks ×4 lead pins ×2), no flat list',
    groupIds[0] === 'weakness-group-tactic:fork' && groupIds.includes('weakness-group-tactic:pin') && (await tid('puzzle-card').count()) === 0,
    JSON.stringify(groupIds));

  // C — open a group: exactly its own positions.
  await tid('weakness-group-open-tactic:fork').click();
  await tid('weakness-group-open').waitFor({ timeout: 10000 });
  const cards = await tid('puzzle-card').count();
  const header = await tid('weakness-group-open').innerText();
  check('C a group lists exactly its own game positions', cards === 4 && /(4 unsolved|of 4 solved|all mastered)/.test(header), `${cards} cards · ${header.replace(/\n/g, ' | ')}`);

  // D — Practice plays them on a board.
  await tid('weakness-group-practice').click();
  await tid('solving-mode').waitFor({ timeout: 15000 });
  const boardUp = await page.locator('[data-testid="solving-mode"] [data-square]').count();
  check('D Practice plays the group\'s positions on a board', boardUp > 0, `${boardUp} squares`);
  await tid('back-to-list').click();

  // E — More like this → the puzzle database.
  await tid('weakness-group-more').waitFor({ timeout: 10000 });
  await tid('weakness-group-more').click();
  await page.waitForURL(/\/tactics\/adaptive/, { timeout: 15000 });
  const dbBoard = await tid('puzzle-board').waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
  check('E "More like this" continues on the puzzle database', dbBoard, page.url());

  // F — the retired URL.
  await page.goto(`${BASE}/tactics/weakness-themes`, { waitUntil: 'domcontentloaded' });
  await tid('my-mistakes-page').waitFor({ timeout: 30000 }).catch(() => {});
  check('F the retired /tactics/weakness-themes lands on the merged page', page.url().includes('/tactics/mistakes') && (await tid('my-mistakes-page').count()) === 1, page.url());

  // G — the flat list is one tap away.
  await tid('show-all-positions').waitFor({ timeout: 15000 });
  await tid('show-all-positions').click();
  const flat = await tid('puzzle-card').count();
  check('G "See all positions" gives the flat list of every position', flat >= 6, `${flat} cards`);
} catch (e) {
  check('RUN completed without a harness exception', false, String(e).slice(0, 200));
}

check('H1 listener captured events', listener.getCapturedEvents().length > 0, String(listener.getCapturedEvents().length));
check('H2 zero pageerrors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

const dir = path.join('audit-reports', `my-weaknesses-merge-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ base: BASE, results, pageErrors }, null, 2));
const green = results.filter((r) => r.ok).length;
console.log(`\n${green}/${results.length} checks green — report at ${dir}/report.json`);
await browser.close();
await listener.stop?.();
process.exit(green === results.length ? 0 : 1);
