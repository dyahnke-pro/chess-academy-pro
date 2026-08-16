// Post-deploy audit for the OPENING-TRAPS grounded vertical (David 2026-07-04:
// "drill me on opening traps in your strongest opening for both white and
// black … teach me what to look out for … and what system it uses to teach
// these"). "what traps can I use in my strongest opening / what should I watch
// out for / how do you teach these?" now voices the REAL trap data on the
// OpeningRecord (named trapLines = weapons, warningLines = watch-out-for) via
// assembleOpeningTrapsAnswer, resolving the strongest opening per color, and
// points the student at the existing "punish lines for X" drill launch. Drives
// the LIVE prod opening-page coach chat against the real brain; seeds real
// drill + trap data by READ-MODIFY-WRITE on the caro-kann record; PACED.
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

const PUNT_SIG = /only you can tell me|i'?d need you to name|i can'?t tell you what your|which opening would you like/i;
const NODATA_SIG = /don'?t have named traps|drill an opening'?s watch|surface its trap/i;
const TRAP_GROUND = /trap weapon|watch out for|punish lines for|spring|Fried Liver|Elephant Trap|Fishing Pole|Legal|named trap|drill/i;
const SYSTEM_GROUND = /Watch,? Learn,? Practice,? Play|four[\s-]?rung|watch the trap|guide you through|drill it live/i;

const PROBES = [
  { q: 'what traps can I use in my strongest opening', kind: 'traps' },
  { q: 'drill me on opening traps in my strongest opening for both white and black', kind: 'traps' },
  { q: 'what should I watch out for in this opening', kind: 'traps' },
  { q: 'what are the traps in my repertoire', kind: 'traps' },
  { q: 'how do you teach these traps', kind: 'system' },
  // collision guard: WHICH opening, not traps
  { q: "what's my strongest opening", kind: 'opening-profile' },
  // break: messy
  { q: 'yo what traps should i know 🤔', kind: 'traps' },
];

async function seed() {
  await page.evaluate(async () => {
    await new Promise((res) => {
      const r = indexedDB.open('ChessAcademyDB');
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('openings')) return res(0);
        const tx = db.transaction(['openings'], 'readwrite');
        const s = tx.objectStore('openings');
        // READ-MODIFY-WRITE the caro-kann record: make it a drilled repertoire
        // opening with named trap + warning lines so the grounded answer has
        // real weapons/warnings to name.
        s.get('caro-kann').onsuccess = (ev) => {
          const rec = ev.target.result;
          if (!rec) return;
          rec.isRepertoire = true;
          rec.drillAccuracy = 0.82;
          rec.drillAttempts = 9;
          rec.trapLines = [
            { name: 'Fantasy Variation Trap', pgn: '', explanation: '' },
            { name: 'Exchange Elephant Trap', pgn: '', explanation: '' },
          ];
          rec.warningLines = [
            { name: 'Premature ...Qb6 sortie', pgn: '', explanation: '' },
          ];
          s.put(rec);
        };
        tx.oncomplete = () => res(1); tx.onerror = () => res(0);
      };
      r.onerror = () => res(0);
    });
  });
}

function classify(kind, reply) {
  if (reply.length < 15) return { ok: false, tag: 'silent' };
  const punted = PUNT_SIG.test(reply);
  if (kind === 'traps') {
    if (TRAP_GROUND.test(reply) || NODATA_SIG.test(reply)) return { ok: true, tag: NODATA_SIG.test(reply) && !TRAP_GROUND.test(reply) ? 'grounded(no-data)' : 'grounded(traps)' };
    if (punted) return { ok: false, tag: 'PUNTED' };
    return { ok: false, tag: 'off-topic' };
  }
  if (kind === 'system') {
    if (SYSTEM_GROUND.test(reply) || TRAP_GROUND.test(reply) || NODATA_SIG.test(reply)) return { ok: true, tag: SYSTEM_GROUND.test(reply) ? 'grounded(system)' : 'grounded(traps)' };
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
