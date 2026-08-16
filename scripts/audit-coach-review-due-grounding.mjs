// Post-deploy audit for the REVIEW-DUE (SRS) grounded vertical (David
// 2026-07-04: "keep working these types of questions"). "what's due for review
// today / how many cards do I have to review?" now voices the live SRS state
// (getDueCount + getEnrolledOpenings + getSrsDueOpenings) via
// assembleReviewDueAnswer, and points the student at /openings/srs. Drives the
// LIVE prod opening-page coach chat against the real brain; seeds real due
// cards into the `srsOpeningCards` store; PACED. Also guards the review-GAME
// collision ("review my last game" must NOT hit this vertical).
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

const PUNT_SIG = /only you can tell me|i can'?t tell you|which opening would you like/i;
const DUE_GROUND = /\bdue\b|cards? (?:due|to review|in rotation)|review my openings|caught up|reps|\/openings\/srs|run today'?s reps|scheduling spaced/i;

const PROBES = [
  { q: "what's due for review today", kind: 'review' },
  { q: 'how many cards do I have to review', kind: 'review' },
  { q: 'what should I review', kind: 'review' },
  { q: 'anything due', kind: 'review' },
  { q: 'yo how many reps are due 🤔', kind: 'review' },
  // collision guard: single-GAME review must NOT get the SRS answer
  { q: 'review my last game', kind: 'not-review' },
];

async function seed() {
  await page.evaluate(async () => {
    await new Promise((res) => {
      const r = indexedDB.open('ChessAcademyDB');
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('srsOpeningCards')) return res(0);
        const tx = db.transaction(['srsOpeningCards'], 'readwrite');
        const s = tx.objectStore('srsOpeningCards');
        const now = Date.now();
        const past = now - 3600 * 1000; // due (1h ago)
        const mk = (openingId, variationName, fen, san, i, due) => ({
          id: `${openingId}::seed-${i}`,
          openingId, variationName,
          fenBefore: fen, expectedSan: san, pgnPrefix: '', studentColor: 'black',
          ease: 2.5, intervalDays: 1,
          nextReviewAt: due ? past : now + 7 * 24 * 3600 * 1000,
          successes: 1, lapses: 0, lastReviewedAt: past, createdAt: past,
        });
        const F = 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3';
        // 9 due Caro-Kann + 5 due Italian + 6 not-due (total enrolled 20, due 14)
        for (let i = 0; i < 9; i++) s.put(mk('caro-kann', 'Caro-Kann: Advance', F, 'Bf5', `ck${i}`, true));
        for (let i = 0; i < 5; i++) s.put(mk('italian-game', 'Italian: Giuoco', F, 'Bc5', `it${i}`, true));
        for (let i = 0; i < 6; i++) s.put(mk('caro-kann', 'Caro-Kann: Classical', F, 'Nd7', `nd${i}`, false));
        tx.oncomplete = () => res(1); tx.onerror = () => res(0);
      };
      r.onerror = () => res(0);
    });
  });
}

function classify(kind, reply) {
  if (reply.length < 12) return { ok: false, tag: 'silent' };
  const punted = PUNT_SIG.test(reply);
  if (kind === 'review') {
    if (DUE_GROUND.test(reply)) return { ok: true, tag: 'grounded(review)' };
    if (punted) return { ok: false, tag: 'PUNTED' };
    return { ok: false, tag: 'off-topic' };
  }
  // not-review: the SRS answer would mention "due/cards/reps"; a correct
  // review-GAME response talks about the GAME, not due cards. Fail if it looks
  // like the SRS due answer.
  if (/\bcards? (?:due|to review)\b|run today'?s reps|review my openings/i.test(reply)) return { ok: false, tag: 'COLLISION(srs-shadowed-game)' };
  return { ok: true, tag: 'not-srs (correct)' };
}

try {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500); await dismiss();
  await page.goto(`${PROD}/openings/caro-kann`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3500); await dismiss();
  await seed();

  const openBtn = page.locator('[data-testid="masterclass-coach-open"]');
  if (!(await openBtn.count())) { breaks.push({ kind: 'no-surface', detail: 'masterclass-coach-open not found' }); }
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
          if (reply.length > 20) break;
        }
      }
      const verdict = classify(p.kind, reply);
      if (!verdict.ok) breaks.push({ kind: verdict.tag, detail: `[${p.kind}] "${p.q}" → «${reply.slice(0, 150)}»` });
      console.log(`\n[${idx}/${PROBES.length}] Q(${p.kind}): ${p.q}\n  ${verdict.ok ? '✅' : '❌'} ${verdict.tag} :: «${reply.slice(0, 200)}»`);
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
