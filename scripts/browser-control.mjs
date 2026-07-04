/**
 * browser-control — a persistent, interactive Chromium driver. Keeps the app
 * open and executes commands one at a time from a control file, screenshotting
 * after each so a human (or an agent that can SEE images) can drive the real
 * app step by step: look → decide → act → look again.
 *
 *   node scripts/browser-control.mjs   (backgrounded)
 * Control file: $CTRL (default scratchpad/ctrl.txt) — append one command/line:
 *   goto <path>            e.g. goto /coach/teach
 *   click <selector>
 *   type <selector> :: <text>
 *   press <key>            e.g. press Enter
 *   wait <ms>
 *   shot                   (force a screenshot now)
 *   text <selector>        (dump element innerText to log)
 *   quit
 * After each command it overwrites $OUT/current.png and appends to $OUT/log.txt.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { readFile, appendFile, writeFile } from 'node:fs/promises';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://127.0.0.1:8099';
const OUT = process.env.OUT_DIR ?? '/tmp/claude-0/-home-user-chess-academy-pro/6de4ef69-cc4b-534e-93a6-f0a6f1ae2424/scratchpad';
const CTRL = process.env.CTRL ?? `${OUT}/ctrl.txt`;
const CUR = `${OUT}/current.png`;
const LOG = `${OUT}/log.txt`;

await writeFile(CTRL, '');
await writeFile(LOG, `[control] started ${new Date().toISOString()} base=${BASE}\n`);

const exe = await resolveChromiumExecutable(false);
const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent: 'AuditManualDrive/1.0 (chromium)' });
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(() => { const s=()=>{const a=document.querySelector('[data-testid="ai-consent-allow"]'); if(a instanceof HTMLElement)a.click();}; const st=()=>{if(!document.body){setTimeout(st,50);return;} new MutationObserver(s).observe(document.body,{childList:true,subtree:true}); s();}; st(); setInterval(s,300); });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (/Uncaught|TypeError|ReferenceError|same key|Minified React|Maximum update/i.test(t)) errs.push(t.slice(0,120)); } });
page.on('pageerror', (e) => errs.push('PAGEERR ' + String(e).slice(0,120)));

async function log(s) { await appendFile(LOG, s + '\n'); console.log(s); }
async function shot() { try { await page.screenshot({ path: CUR }); } catch (e) { await log('  (screenshot failed: ' + String(e).slice(0,60) + ')'); } }

await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => log('goto err ' + String(e).slice(0,60)));
await page.waitForTimeout(4000);

// Optional: seed the user's real games into IndexedDB so grounded verticals
// return REAL data (David's knight_mare_01 games). SEED_GAMES=<json path>.
if (process.env.SEED_GAMES) {
  try {
    const games = JSON.parse(await readFile(process.env.SEED_GAMES, 'utf8'));
    const user = process.env.SEED_USER ?? 'knight_mare_01';
    const res = await page.evaluate(async ({ games, user }) => {
      const open = () => new Promise((resolve, reject) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      const db = await open();
      const putAll = (store, rows) => new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); const os = tx.objectStore(store); for (const row of rows) os.put(row); tx.oncomplete = () => resolve(true); tx.onerror = () => reject(tx.error); });
      let wroteGames = 0, profileMsg = 'no-profile';
      if (db.objectStoreNames.contains('games')) { await putAll('games', games); wroteGames = games.length; }
      // set chessComUsername on every profile so username-matching works
      if (db.objectStoreNames.contains('profiles')) {
        const profs = await new Promise((resolve) => { const tx = db.transaction('profiles', 'readonly'); const req = tx.objectStore('profiles').getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => resolve([]); });
        for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = user; }
        if (profs.length) { await putAll('profiles', profs); profileMsg = `set username on ${profs.length} profile(s)`; }
      }
      return { wroteGames, profileMsg, stores: [...db.objectStoreNames] };
    }, { games, user });
    await log(`[seed] wrote ${res.wroteGames} games · ${res.profileMsg}`);
    await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);
  } catch (e) { await log('[seed] FAILED: ' + String(e).slice(0, 160)); }
}

await shot();
await log('[ready] loaded /coach/teach — issue commands to ' + CTRL);

let processed = 0;
async function loop() {
  let lines = [];
  try { lines = (await readFile(CTRL, 'utf8')).split('\n').filter((l) => l.trim()); } catch { /* */ }
  while (processed < lines.length) {
    const cmd = lines[processed++].trim();
    const errBefore = errs.length;
    await log(`\n>>> ${cmd}`);
    try {
      if (cmd === 'quit') { await shot(); await log('[quit]'); await browser.close(); process.exit(0); }
      else if (cmd === 'shot') { /* just screenshot */ }
      else if (cmd.startsWith('goto ')) { await page.goto(`${BASE}${cmd.slice(5).trim()}`, { waitUntil: 'domcontentloaded', timeout: 45000 }); await page.waitForTimeout(1500); }
      else if (cmd.startsWith('wait ')) { await page.waitForTimeout(Number(cmd.slice(5).trim()) || 1000); }
      else if (cmd.startsWith('click ')) { await page.locator(cmd.slice(6).trim()).first().click({ timeout: 10000 }); await page.waitForTimeout(800); }
      else if (cmd.startsWith('type ')) { const [sel, txt] = cmd.slice(5).split('::').map((x) => x.trim()); const inp = page.locator(sel).first(); await inp.click(); await inp.pressSequentially(txt ?? '', { delay: 15 }); await page.waitForTimeout(300); }
      else if (cmd.startsWith('press ')) { await page.keyboard.press(cmd.slice(6).trim()); await page.waitForTimeout(800); }
      else if (cmd.startsWith('text ')) { const t = await page.locator(cmd.slice(5).trim()).first().innerText().catch(() => '(not found)'); await log('  text: ' + t.replace(/\n+/g,' ').slice(0,300)); }
      else await log('  (unknown command)');
    } catch (e) { await log('  ERROR: ' + String(e).slice(0, 140)); }
    if (errs.length > errBefore) await log('  ⚠ console/page errors: ' + errs.slice(errBefore).join(' | '));
    await shot();
    await log('  [shot updated]');
  }
  setTimeout(loop, 500);
}
loop();
