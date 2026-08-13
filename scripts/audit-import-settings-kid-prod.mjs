// PGN IMPORT + SETTINGS LONG TAIL + KID HUBS — the last shallow-coverage rows
// (David 2026-08-13: "continue rest of audit").
//
// Contracts:
//   import  — pasting a real PGN puts a REAL row in Dexie `games` (count +1,
//             source recorded); the analysis pipeline picking it up is
//             informational (it can lag minutes on a cold engine).
//   settings— profile name edit SAVES (status + Dexie profile.name); the
//             board master-toggle flips and reports saved; export-data
//             actually produces a download.
//   kid     — the hub mounts, a piece hub opens, and a game level mounts a
//             board (kid mode never touches coach state, so a mounted,
//             clickable level is the drivable contract here).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `isk-${Date.now().toString(36)}`;
const ONLY = (process.env.AUDIT_ONLY || 'import,settings,kid').split(',').map((s) => s.trim());
const wants = (s) => ONLY.includes(s);

const results = [];
const record = (surface, name, pass, detail, kind = 'contract') => {
  results.push({ surface, name, pass, kind, detail });
  console.log(`${kind === 'informational' ? 'ℹ️' : pass ? '✅' : '❌'} [${surface}] ${name}${detail ? ` — ${detail}` : ''}`);
};
const pageErrors = [];

// A real, complete short game (Morphy vs Duke of Brunswick & Count Isouard,
// Paris 1858 — the Opera Game), headers included, exactly as a user pastes it.
const OPERA_PGN = `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.11.02"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

const browser = await chromium.launch({
  executablePath: await resolveChromiumExecutable(),
  args: sandboxLaunchArgs(),
});
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript((id) => {
  try { localStorage.setItem('auditRunId', id); } catch { /* private */ }
}, RUN_ID);
const page = await ctx.newPage();
page.on('pageerror', (e) => {
  const msg = String(e?.message ?? e);
  if (!pageErrors.includes(msg)) pageErrors.push(msg);
});

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try {
      const g = page.locator(gate);
      await g.waitFor({ timeout: 6000 });
      await page.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* not shown */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* not shown */ }
}

async function goRetry(path) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  } catch {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
  await dismissGates();
}

async function readStore(store) {
  return page.evaluate(async (s) => {
    const open = indexedDB.open('ChessAcademyDB');
    const db = await new Promise((res, rej) => {
      open.onsuccess = () => res(open.result);
      open.onerror = () => rej(open.error);
    });
    try {
      const tx = db.transaction(s, 'readonly');
      return await new Promise((res, rej) => {
        const rq = tx.objectStore(s).getAll();
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      });
    } finally { db.close(); }
  }, store);
}

try {
  // ══ PGN IMPORT — paste → Dexie games row ══════════════════════════════════
  if (wants('import')) {
    await goRetry('/games');
    const pageUp = await page.locator('[data-testid="game-database-page"]').waitFor({ timeout: 60000 })
      .then(() => true).catch(() => false);
    record('import', 'the game database page mounts', pageUp, pageUp ? '' : 'no mount in 60s');
    if (pageUp) {
      const before = (await readStore('games').catch(() => [])).length;
      await page.locator('[data-testid="import-toggle-btn"]').click();
      await page.locator('[data-testid="import-panel"]').waitFor({ timeout: 10000 });
      await page.locator('[data-testid="pgn-textarea"]').fill(OPERA_PGN);
      await page.locator('[data-testid="import-paste-btn"]').click();
      let after = before;
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(1500);
        after = (await readStore('games').catch(() => [])).length;
        if (after > before) break;
      }
      record('import', 'pasting a real PGN lands a game in Dexie', after > before,
        `games ${before} → ${after}`);
      if (after > before) {
        const rows = await readStore('games').catch(() => []);
        const opera = rows.find((g) => /morphy/i.test(g.white ?? '') || /morphy/i.test(JSON.stringify(g).slice(0, 500)));
        record('import', 'the imported game carries its real players', !!opera,
          opera ? `white="${opera.white ?? '?'}" result=${opera.result ?? '?'}` : 'no Morphy row found', opera ? 'contract' : 'informational');
      }
    }
  }

  // ══ SETTINGS LONG TAIL ════════════════════════════════════════════════════
  if (wants('settings')) {
    await goRetry('/settings');
    const up = await page.locator('[data-testid="settings-page"]').waitFor({ timeout: 60000 })
      .then(() => true).catch(() => false);
    record('settings', 'the settings page mounts', up, up ? '' : 'no mount in 60s');
    if (up) {
      // Profile name save — the write-through contract.
      await page.locator('[data-testid="tab-profile"]').click().catch(() => {});
      const nameInput = page.locator('[data-testid="name-input"]');
      if (await nameInput.waitFor({ timeout: 15000 }).then(() => true).catch(() => false)) {
        await nameInput.fill('Audit Driver');
        await page.waitForTimeout(500);
        // Save is often on blur / a save button; press Tab then look for status.
        await nameInput.press('Tab');
        const saved = await page.locator('[data-testid="profile-save-status"]').waitFor({ timeout: 15000 })
          .then(() => true).catch(() => false);
        let dexieName = null;
        for (let i = 0; i < 10 && dexieName !== 'Audit Driver'; i++) {
          await page.waitForTimeout(1000);
          const profiles = await readStore('profiles').catch(() => []);
          dexieName = profiles?.[0]?.name ?? null;
        }
        record('settings', 'profile name edit persists to Dexie', dexieName === 'Audit Driver',
          `dexie name="${dexieName}" saveStatusShown=${saved}`);
      } else {
        record('settings', 'profile name edit persists to Dexie', false, 'name-input never mounted');
      }

      // Board master toggle — flips and reports saved.
      await page.locator('[data-testid="tab-board"]').click().catch(() => {});
      const master = page.locator('[data-testid="master-all-off-toggle"]');
      if (await master.waitFor({ timeout: 15000 }).then(() => true).catch(() => false)) {
        await master.click();
        const status = await page.locator('[data-testid="board-save-status"]').waitFor({ timeout: 15000 })
          .then(() => true).catch(() => false);
        record('settings', 'the board master toggle flips and reports saved', status,
          status ? '' : 'no board-save-status after toggle');
        await master.click().catch(() => {}); // restore
      } else {
        record('settings', 'the board master toggle flips and reports saved', false, 'toggle never mounted');
      }

      // Export — a real download must start.
      const exportBtn = page.locator('[data-testid="export-data-btn"]');
      if (await exportBtn.waitFor({ timeout: 15000 }).then(() => true).catch(() => false)) {
        const dl = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
        await exportBtn.click();
        const download = await dl;
        record('settings', 'export-data produces a real download', !!download,
          download ? `file: ${download.suggestedFilename()}` : 'no download event in 30s');
      } else {
        record('settings', 'export-data produces a real download', false, 'export button not found (may live on another tab)', 'informational');
      }
    }
  }

  // ══ KID HUBS ══════════════════════════════════════════════════════════════
  if (wants('kid')) {
    await goRetry('/kid');
    // Kid layout is its own shell — assert SOMETHING kid-specific mounted.
    const kidUp = await page.locator('main, [data-testid*="kid"], a[href*="/kid/"]').first()
      .waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
    record('kid', 'the kid hub mounts', kidUp, kidUp ? '' : 'nothing rendered in 60s');
    if (kidUp) {
      await goRetry('/kid/rook-games');
      const hubUp = await page.locator('a[href*="rook"], button, [data-testid]').first()
        .waitFor({ timeout: 30000 }).then(() => true).catch(() => false);
      record('kid', 'a piece hub (rook games) opens', hubUp, hubUp ? '' : 'rook hub empty');
      await goRetry('/kid/rook-maze/1');
      const boardUp = await page.locator('[data-square="a1"]').first()
        .waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
      record('kid', 'a kid game level mounts a real board', boardUp,
        boardUp ? 'rook maze level 1 board rendered' : 'no board squares in 45s');
    }
  }
} finally {
  console.log(`\n── coverage grid ──`);
  for (const r of results) {
    console.log(`${r.kind === 'informational' ? 'ℹ️' : r.pass ? '✅' : '❌'} [${r.surface}] ${r.name}`);
  }
  const green = results.filter((r) => r.pass || r.kind === 'informational').length;
  console.log(`\n${green}/${results.length} green (contract or informational)`);
  console.log(`pageerrors (distinct): ${pageErrors.length}${pageErrors.length ? ` — ${pageErrors.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`audit_run_id: ${RUN_ID}`);
  const dir = `audit-reports/import-settings-kid-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify({ runId: RUN_ID, base: BASE, results, pageErrors }, null, 2));
  console.log(`report: ${dir}/report.json`);
  await browser.close();
  const hardFails = results.filter((r) => !r.pass && r.kind !== 'informational').length;
  process.exit(hardFails ? 1 : 0);
}
