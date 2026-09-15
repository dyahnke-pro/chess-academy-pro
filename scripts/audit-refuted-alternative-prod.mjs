/**
 * audit-refuted-alternative-prod — proves N3 (unified-coach, 2026-09-15) on the
 * live bundle: a DB-generated Learn lesson BAKES the refuted alternative ("most
 * people play X here … it costs / walks into …") on the student's opening plies,
 * and the coach SPEAKS it mid-lesson. Also proves the N2/N1 package rides the
 * tree (thesis + need plies) and that a plan is never re-announced verbatim.
 *
 * Instruments (G1, MUTED): Playwright drives the ask like a student · the
 * narration listener sidecar captures every spoken line · the cached tree is
 * read from Dexie (the app's own artifact) — never a fixture handed to the UI.
 *
 * The ask must be a DB-GENERATED opening (Tier 3): a static / voiced tree is not
 * generated, so it carries no baked refuted beat by design. "Ponziani Opening"
 * is in the Lichess DB and has no static/voiced walkthrough.
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-refuted-alternative-prod.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ASK = process.env.AUDIT_REFUTED_ASK ?? 'Teach me the Ponziani Opening';
const GEN_BUDGET_MS = Number(process.env.AUDIT_GEN_BUDGET_MS ?? 240_000);
const PLAY_BUDGET_MS = Number(process.env.AUDIT_PLAY_BUDGET_MS ?? 150_000);
const REFUTED_RE = /Most people play [A-Za-z0-9+#=-]+ here/;

const results = [];
const record = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`); };

async function readNewestTree(page, since) {
  return page.evaluate(({ since }) => new Promise((resolve) => {
    setTimeout(() => resolve({ ok: false, reason: 'open-timeout' }), 10000);
    const req = indexedDB.open('ChessAcademyDB');
    req.onerror = () => resolve({ ok: false, reason: 'open-error' });
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('cachedOpenings')) { db.close(); return resolve({ ok: false, reason: 'no-store' }); }
      const all = db.transaction('cachedOpenings', 'readonly').objectStore('cachedOpenings').getAll();
      all.onsuccess = () => {
        db.close();
        const rows = (all.result ?? []).filter((r) => r.tree && (r.generatedAt ?? 0) >= since).sort((a, b) => (b.generatedAt ?? 0) - (a.generatedAt ?? 0));
        const r = rows[0];
        resolve(r ? { ok: true, name: r.displayName ?? r.normalizedName, teaching: r.tree.teaching ?? null, genRev: r.genRev ?? null } : { ok: false, reason: 'no-tree-generated-this-run' });
      };
      all.onerror = () => { db.close(); resolve({ ok: false, reason: 'read-error' }); };
    };
  }), { since });
}

async function main() {
  const listener = await startAuditListener();
  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(({ url, secret }) => {
    try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* no storage */ }
  }, { url: listener.url, secret: listener.secret });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  let ttsRequests = 0;
  page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) ttsRequests += 1; });

  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded' });
  const consent = page.locator('[data-testid="ai-consent-allow"]').first();
  if (await consent.count()) await consent.click({ timeout: 4000 }).catch(() => undefined);
  const box = page.locator('textarea, input[type="text"]').first();
  await box.waitFor({ state: 'visible', timeout: 60000 });
  const runStart = Date.now();
  await box.click();
  await box.pressSequentially(ASK, { delay: 12 });
  await page.keyboard.press('Enter');

  // Wait for the lesson to MOUNT (generation is real — allow the cold budget).
  let mounted = false;
  const t0 = Date.now();
  while (Date.now() - t0 < GEN_BUDGET_MS) {
    if (await page.locator('[data-testid="walkthrough-step-back"], [data-testid="walkthrough-skip"]').first().count()) { mounted = true; break; }
    // A line picker for a broad family — pick the first line like a student.
    const chip = page.locator('[data-testid^="message-choice-chip"], [data-testid^="walkthrough-fork-option"]').first();
    if (await chip.count()) await chip.click({ timeout: 2000, force: true }).catch(() => undefined);
    await page.waitForTimeout(3000);
  }
  record('A. the ask STARTS a generated walkthrough', mounted, `ask="${ASK}" after ${Math.round((Date.now() - t0) / 1000)}s`);
  if (!mounted) { await browser.close(); await listener.stop(); finish(); return; }

  // Let it play; answer forks like a student.
  const p0 = Date.now();
  while (Date.now() - p0 < PLAY_BUDGET_MS) {
    const fork = page.locator('[data-testid^="walkthrough-fork-option"]').first();
    if (await fork.count()) await fork.click({ timeout: 2000, force: true }).catch(() => undefined);
    if ((await page.locator('body').innerText()).includes('Watch the middlegame and endgame')) break;
    await page.waitForTimeout(4000);
  }

  const tree = await readNewestTree(page, runStart);
  const t = tree.teaching;
  record('B. the generated tree carries the selector package (thesis + need plies)',
    tree.ok && !!t && typeof t.thesis?.kind === 'string' && Array.isArray(t.needPlies),
    tree.ok ? `${tree.name} genRev=${tree.genRev} thesis=${t?.thesis?.kind ?? 'MISSING'} needPlies=[${(t?.needPlies ?? []).join(',')}]` : `no tree (${tree.reason})`);
  const refuted = t?.refuted ?? null;
  record('C. a refuted alternative is BAKED on a student opening ply',
    Array.isArray(refuted) && refuted.length > 0,
    refuted ? refuted.map((r) => `ply${r.ply}:${r.alt}(${r.pct ?? '?'}%)-${r.costCp}cp/${r.concept ?? 'positional'}`).join(' ') : 'none');
  const spoken = listener.getCapturedEvents().filter((e) => e.kind === 'coach-narration-spoken' && (e.timestamp ?? 0) >= runStart).map((e) => String(e.text ?? e.summary ?? ''));
  const heard = spoken.filter((l) => REFUTED_RE.test(l));
  record('D. the coach SPOKE the refuted alternative mid-lesson (listener)', heard.length > 0, heard[0] ? heard[0].replace(/\s+/g, ' ').slice(0, 200) : `none of ${spoken.length} spoken lines`);
  const dupes = spoken.filter((l, i) => l.length > 40 && spoken.indexOf(l) !== i);
  record('E. no spoken line repeated verbatim (plan memory / no re-announcement)', dupes.length === 0, dupes.length ? `"${dupes[0].slice(0, 80)}"` : `${spoken.length} lines distinct`);
  record('F1. vacuity guard: the listener heard the lesson', spoken.length >= 3, `${spoken.length}`);
  record('F2. the run stayed MUTED (zero /api/tts requests)', ttsRequests === 0, `${ttsRequests}`);
  record('F3. no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  await browser.close();
  await listener.stop();
  finish();
}

function finish() {
  const passed = results.filter((r) => r.pass).length;
  const dir = `audit-reports/refuted-alternative-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, ask: ASK, results }, null, 2));
  console.log(`\n${passed}/${results.length} passed — ${dir}/report.json`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => { console.error('FATAL', err); process.exit(2); });
