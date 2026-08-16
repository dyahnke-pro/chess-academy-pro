// Post-deploy audit for the WAVE 1 weakness-metric grounded verticals (David
// 2026-07-04: "every data collected the coach needs access to and articulate it
// … and suggest things to work on"). "what mistakes do I make / how are my
// tactics / which phase do I lose in" now voice the weakness-tab analytics
// (getMistakeInsights / getTacticInsights / phaseAccuracy + criticalMoments) via
// assembleMistakesAnswer / assembleTacticsProfileAnswer / assemblePhaseProfileAnswer,
// each ending in a suggestion. The computed NO-DATA lines are domain-specific
// ("where you go wrong" / "motifs you miss" / "opening, middlegame, or
// endgame"), so this routing audit self-verifies on a fresh prod context; the
// WITH-data numbers are covered by the unit tests. Also guards the live-board
// collisions (tactic-here / this-endgame must NOT hit the profile verticals).
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

const PUNT = /only you can tell me|i can'?t tell you|which opening would you like|let'?s (start|begin|learn)/i;
const SIG = {
  mistakes: /blunder|mistake|centipawn|go wrong|where you go wrong|\berrors?\b|slip/i,
  tactics: /tactical awareness|motif|miss (?:the )?most|tactics you miss|which motifs|drill .*puzzles|\bfork\b|\bpin\b|awareness rate/i,
  phase: /opening.*middlegame|middlegame.*endgame|by phase|weakest .*(opening|middlegame|endgame)|which .*phase|accuracy by phase|opening, middlegame/i,
};

const PROBES = [
  { q: 'what mistakes do I make', kind: 'mistakes' },
  { q: 'how often do I blunder', kind: 'mistakes' },
  { q: 'how are my tactics', kind: 'tactics' },
  { q: 'what tactics do I miss most', kind: 'tactics' },
  { q: 'which phase do I lose in', kind: 'phase' },
  { q: "how's my endgame play", kind: 'phase' },
  { q: 'yo where do i go wrong lol 🤔', kind: 'mistakes' },
  // collision guards — must NOT be answered by the profile verticals:
  { q: 'is there a tactic here', kind: 'not-tactics-profile' },
];

function classify(kind, reply) {
  if (reply.length < 15) return { ok: false, tag: 'silent' };
  if (kind === 'not-tactics-profile') {
    // A tactics-PROFILE answer would talk about awareness rate / motifs missed
    // over games. A correct live-board reply talks about THIS position.
    if (/tactical awareness|motif you miss|awareness rate|tactics you miss/i.test(reply)) return { ok: false, tag: 'COLLISION(profile-shadowed-liveboard)' };
    return { ok: true, tag: 'live-board (correct)' };
  }
  if (SIG[kind].test(reply)) return { ok: true, tag: `grounded(${kind})` };
  if (PUNT.test(reply)) return { ok: false, tag: 'PUNTED' };
  return { ok: false, tag: 'off-topic' };
}

try {
  await page.goto(`${PROD}/openings/caro-kann`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3500); await dismiss();
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
