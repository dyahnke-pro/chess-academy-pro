#!/usr/bin/env node
/**
 * audit-course-progress-prod — a boot keeps the student's progress on the
 * gambit and anti-opening (Counter-Weapons) courses (2026-10-30).
 *
 * THE BUG. Every boot rebuilt each anti-opening record from
 * `anti-openings.json` with zeroed progress and PUT it over the stored one, so
 * the ladder (Watch → Play), drill stats, favourite and review state on those
 * courses were wiped at each launch; and `gambits.json` loaded on the first
 * install only, so a fixed gambit line never reached a seeded device. One
 * reconciler (`reconcileCourseFiles`) now lays the file's content over the
 * stored record and keeps the progress, every boot.
 *
 *   P0  the app mounted (a page that is not the app fails in 30s, never hangs)
 *   P1  the device seeds the course files (the reconciler's id list is in meta)
 *   P2  progress written on an anti-opening survives a reload (ladder, favourite)
 *   P3  progress written on a gambit course survives a reload
 *   P4  the reload ran the reconciler (a stale course field written before it
 *       is back to the file's value — without this, P2/P3 could pass on a boot
 *       that never touched the records)
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-course-progress-prod.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ANTI = 'anti-latvian';
const GAMBIT = 'scotch-gambit';
const rows = [];
const check = (id, pass, detail) => {
  rows.push({ id, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${id} — ${detail}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Run `fn(store)` against the app's own IndexedDB, in the page. */
const idb = (page, mode, body) => page.evaluate(
  ({ mode, body }) => new Promise((resolve) => {
    const open = indexedDB.open('ChessAcademyDB');
    open.onerror = () => resolve({ error: 'open failed' });
    open.onsuccess = () => {
      // A page that is not the app has no such stores: report it, never hang.
      try {
        const tx = open.result.transaction(['openings', 'meta'], mode);
        const openings = tx.objectStore('openings');
        const meta = tx.objectStore('meta');
        const run = new Function('openings', 'meta', 'done', body);
        run(openings, meta, (v) => { tx.oncomplete = () => resolve(v); tx.onerror = () => resolve({ error: 'tx failed' }); });
      } catch (err) {
        resolve({ error: String(err) });
      }
    };
  }),
  { mode, body },
);

const read = (page) => idb(page, 'readonly', `
  const out = {};
  const a = openings.get('${ANTI}');
  const g = openings.get('${GAMBIT}');
  const m = meta.get('anti_course_ids');
  let left = 3;
  const fin = () => { if (--left === 0) done(out); };
  a.onsuccess = () => { out.anti = a.result ?? null; fin(); };
  g.onsuccess = () => { out.gambit = g.result ?? null; fin(); };
  m.onsuccess = () => { out.ids = m.result?.value ?? null; fin(); };
`);

async function main() {
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const context = await browser.newContext(sandboxContextOptions());
  await context.addInitScript(muteTtsForAudit);
  await context.addInitScript(autoDismissCalibration);
  const page = await context.newPage();
  await page.goto(`${BASE}/openings`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const mounted = await page.locator('[data-testid="app-layout"]').waitFor({ timeout: 30_000 }).then(() => true, () => false);
  check('P0 the app mounted', mounted, mounted ? 'app-layout present' : 'no app-layout in 30s');
  if (!mounted) throw new Error('the app did not mount');

  // P1 — the first install seeds both course files (the deferred seed).
  let state = null;
  for (let i = 0; i < 60; i += 1) {
    state = await read(page);
    if (state?.anti && state?.gambit && state?.ids) break;
    await sleep(2000);
  }
  check('P1 the course files are seeded and the reconciler keeps their ids', !!(state?.anti && state?.gambit && state?.ids), `anti=${!!state?.anti} gambit=${!!state?.gambit} ids=${state?.ids ? JSON.parse(state.ids).length : 0}`);
  if (!state?.anti || !state?.gambit) throw new Error('courses never seeded');
  const fileStyle = state.anti.style;

  // The student's progress, plus one stale course field P4 reads back.
  await idb(page, 'readwrite', `
    const a = openings.get('${ANTI}');
    a.onsuccess = () => {
      openings.put({ ...a.result, linesDiscovered: [-1, 0], linesLearned: [-1], isFavorite: true, drillAttempts: 7, style: 'AUDIT-STALE' });
      const g = openings.get('${GAMBIT}');
      g.onsuccess = () => { openings.put({ ...g.result, linesDiscovered: [1], isFavorite: true }); done(true); };
    };
  `);

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
  let after = null;
  for (let i = 0; i < 45; i += 1) {
    after = await read(page);
    if (after?.anti && after.anti.style !== 'AUDIT-STALE') break;
    await sleep(2000);
  }
  check('P4 the reload ran the reconciler (the stale course field is back to the file)', after?.anti?.style === fileStyle, `style=${after?.anti?.style}`);
  check('P2 an anti-opening keeps its ladder and favourite across a boot', JSON.stringify(after?.anti?.linesDiscovered) === '[-1,0]' && JSON.stringify(after?.anti?.linesLearned) === '[-1]' && after?.anti?.isFavorite === true && after?.anti?.drillAttempts === 7,
    `discovered=${JSON.stringify(after?.anti?.linesDiscovered)} learned=${JSON.stringify(after?.anti?.linesLearned)} favourite=${after?.anti?.isFavorite} attempts=${after?.anti?.drillAttempts}`);
  check('P3 a gambit course keeps its progress across a boot', JSON.stringify(after?.gambit?.linesDiscovered) === '[1]' && after?.gambit?.isFavorite === true,
    `discovered=${JSON.stringify(after?.gambit?.linesDiscovered)} favourite=${after?.gambit?.isFavorite}`);

  await browser.close();
}

try {
  await main();
} catch (err) {
  check('run', false, String(err?.message ?? err));
}
const dir = `audit-reports/course-progress-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, rows }, null, 1));
const green = rows.filter((r) => r.pass).length;
console.log(`\n${green}/${rows.length} green — report ${dir}/report.json`);
process.exit(green === rows.length && rows.length >= 5 ? 0 : 1);
