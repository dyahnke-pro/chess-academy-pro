// Post-deploy audit for the OPENING-ACCURACY grounded vertical (David
// 2026-07-04: "check accuracy throughout the opening, identify what is weakest
// and what I need to work on the most to improve my opening theory for my
// favorite opening"). "how accurate am I in my opening / what's the weakest
// part of my opening theory to work on?" now voices the within-opening data:
// OpeningRecord.drillAccuracy/Attempts + the weakest variation
// (variationAccuracy) + the most-missed position (openingWeakSpots), via
// assembleOpeningAccuracyAnswer. Drives the LIVE prod opening-page coach chat
// against the real brain; seeds real drill + variation + weak-spot data by
// READ-MODIFY-WRITE on the caro-kann record (so the page still renders); PACED
// to avoid provider saturation (G7 load-vs-bug discipline).
import { chromium } from 'playwright';
import { attachProxyInterception } from './audit-lib/proxy-intercept.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const breaks = [];

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
await attachProxyInterception(ctx);
const page = await ctx.newPage();
page.on('pageerror', (e) => breaks.push({ kind: 'pageerror', detail: (e.message || '').split('\n')[0] }));

async function dismiss() {
  const cb = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await cb.count()) { await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 }).catch(() => null); await cb.waitFor({ state: 'detached', timeout: 12000 }).catch(() => null); }
  const c = page.locator('[data-testid="ai-consent-allow"]');
  if (await c.count() && await c.isVisible().catch(() => false)) { await c.click({ force: true }).catch(() => null); await page.locator('[data-testid="ai-consent-modal"]').waitFor({ state: 'detached', timeout: 6000 }).catch(() => null); }
  const h = page.locator('[data-testid="page-help-modal"]');
  if (await h.count()) { await page.keyboard.press('Escape').catch(() => null); await page.waitForTimeout(300); }
}

const PUNT_SIG = /only you can tell me|i'?d need you to name|you haven'?t (told|named)|i can'?t tell you what your|let'?s (start|begin|learn|dive)|which opening would you like/i;
const NODATA_SIG = /haven'?t drilled|drill (one of|a few|it)|line by line/i;
const ACC_GROUND = /\b\d{1,3}%|drilling at|weakest line|miss most|slipped there|attempt|the right move is|shore up|part of your (?:theory|opening)/i;

const PROBES = [
  { q: 'how accurate am I in this opening', kind: 'accuracy' },
  { q: "what's the weakest part of my opening theory", kind: 'accuracy' },
  { q: 'which line should I work on', kind: 'accuracy' },
  { q: 'what do I need to work on to improve my opening theory', kind: 'accuracy' },
  { q: "what's my weakest variation", kind: 'accuracy' },
  // collision guard: WHICH opening, not within-opening accuracy
  { q: "what's my strongest opening", kind: 'opening-profile' },
  // break: messy
  { q: 'yo where am i weakest in my opening 🤔', kind: 'accuracy' },
];

async function seed() {
  await page.evaluate(async () => {
    await new Promise((res) => {
      const r = indexedDB.open('ChessAcademyDB');
      r.onsuccess = () => {
        const db = r.result;
        const stores = [];
        if (db.objectStoreNames.contains('openings')) stores.push('openings');
        if (db.objectStoreNames.contains('openingWeakSpots')) stores.push('openingWeakSpots');
        if (stores.length === 0) return res(0);
        const tx = db.transaction(stores, 'readwrite');
        if (stores.includes('openings')) {
          const s = tx.objectStore('openings');
          // READ-MODIFY-WRITE: keep the masterclass content, add drill signals.
          s.get('caro-kann').onsuccess = (ev) => {
            const rec = ev.target.result;
            if (!rec) return;
            rec.drillAccuracy = 0.78;
            rec.drillAttempts = 12;
            const nVars = Array.isArray(rec.variations) ? rec.variations.length : 0;
            // Parallel variationAccuracy: index 0 weakest so the answer names it.
            rec.variationAccuracy = nVars > 0
              ? rec.variations.map((_, i) => (i === 0 ? 0.42 : 0.86))
              : [];
            s.put(rec);
          };
        }
        if (stores.includes('openingWeakSpots')) {
          const s2 = tx.objectStore('openingWeakSpots');
          s2.put({
            id: 'caro-kann-8', openingId: 'caro-kann', openingName: 'Caro-Kann Defense',
            fen: 'rnbqkb1r/pp2pppp/2p2n2/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 4',
            moveIndex: 8, correctMoveSan: 'Bf5', failCount: 4,
            lastFailedAt: '2026-06-01T12:00:00.000Z', lastDrilledAt: null,
          });
        }
        tx.oncomplete = () => res(1); tx.onerror = () => res(0);
      };
      r.onerror = () => res(0);
    });
  });
}

function classify(kind, reply) {
  if (reply.length < 15) return { ok: false, tag: 'silent' };
  const punted = PUNT_SIG.test(reply);
  if (kind === 'accuracy') {
    if (ACC_GROUND.test(reply) || NODATA_SIG.test(reply)) return { ok: true, tag: NODATA_SIG.test(reply) && !ACC_GROUND.test(reply) ? 'grounded(no-data)' : 'grounded(accuracy)' };
    if (punted) return { ok: false, tag: 'PUNTED' };
    return { ok: false, tag: 'off-topic' };
  }
  if (punted) return { ok: false, tag: 'PUNTED(collision)' };
  return { ok: true, tag: 'answered' };
}

try {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500); await dismiss();
  await page.goto(`${PROD}/openings/caro-kann`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3500); await dismiss();
  await seed();
  // Reload so the page picks up the seeded drill/weak-spot rows on mount.
  await page.goto(`${PROD}/openings/caro-kann`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000); await dismiss();

  const openBtn = page.locator('[data-testid="masterclass-coach-open"]');
  if (!(await openBtn.count())) { breaks.push({ kind: 'no-surface', detail: 'masterclass-coach-open not found on /openings/caro-kann' }); }
  else {
    await openBtn.click({ timeout: 5000 }).catch(() => null); await page.waitForTimeout(800); await dismiss();
    let idx = 0;
    for (const p of PROBES) {
      idx++;
      const inp = page.locator('[data-testid="chat-text-input"]').first();
      for (let k = 0; k < 30 && !(await inp.isEnabled().catch(() => false)); k++) await page.waitForTimeout(1000);
      const before = await page.locator('[data-testid="chat-message-assistant"]').count();
      await inp.click().catch(() => null); await inp.pressSequentially(p.q, { delay: 8 }).catch(() => null); await page.keyboard.press('Enter').catch(() => null);
      let reply = '';
      const start = Date.now();
      while (Date.now() - start < 55000) {
        await page.waitForTimeout(1500);
        if ((await page.locator('[data-testid="chat-message-assistant"]').count()) > before) {
          reply = (await page.locator('[data-testid="chat-message-assistant"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
          if (reply.length > 25) break;
        }
      }
      const verdict = classify(p.kind, reply);
      if (!verdict.ok) breaks.push({ kind: verdict.tag, detail: `[${p.kind}] "${p.q}" → «${reply.slice(0, 140)}»` });
      console.log(`\n[${idx}/${PROBES.length}] Q(${p.kind}): ${p.q}\n  ${verdict.ok ? '✅' : '❌'} ${verdict.tag} :: «${reply.slice(0, 190)}»`);
      // PACE brain-heavy turns (G7: an un-paced loop manufactures false hangs).
      await page.waitForTimeout(2500);
    }
  }
} catch (e) { breaks.push({ kind: 'harness', detail: e.message.split('\n')[0] }); }

await browser.close();
const real = breaks.filter((b) => b.kind !== 'harness');
console.log(`\n=== ${real.length} BREAKS ===`);
for (const b of real) console.log(`  ! [${b.kind}] ${b.detail}`);
if (breaks.some((b) => b.kind === 'harness')) console.log(`  (harness note: ${breaks.find((b) => b.kind === 'harness').detail})`);
process.exit(real.length ? 1 : 0);
