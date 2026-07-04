// ADVERSARIAL grounding-intent audit for the LIVE /coach/play surface
// (David 2026-07-04: "keep going on this line of work"). Continues the
// content-classification boundary hunt onto the play surface, where the coach
// has a live board and the richest set of grounding intents (best-move /
// tactics / position-assessment / master-play / concept / progress).
//
// THE DISEASE (found on /coach/teach, then confirmed here): a router runs
// BEFORE the grounded brain and hijacks a grounded-Q&A question. On /coach/play
// the hijacker is matchTrainingAidRoute (via tryRouteIntent) — asking "is there
// a tactic here?" during a LIVE game used to NAVIGATE the student OUT to
// /coach/teach?drill=puzzle. The tell here is a URL change off /coach/play.
//
// Verdicts per probe:
//   want='ground'  → must STAY on /coach/play with a chat reply (NOT navigate
//                    to a drill/teach surface, NOT silent).
//   want='drill'   → an explicit trainer request MAY navigate to a drill.
import { chromium } from 'playwright';
import { attachProxyInterception } from './audit-lib/proxy-intercept.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const breaks = [];
let current = 'boot';
const push = (kind, detail) => breaks.push({ input: current, kind, detail: (detail || '').slice(0, 160) });

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await attachProxyInterception(ctx);
const page = await ctx.newPage();
const isReactWarn = (t) => /same key|unique "?key|Each child in a list|Maximum update depth|Cannot update a component|Encountered two children/i.test(t);
page.on('pageerror', (e) => push('pageerror', (e.message || '').split('\n')[0]));
page.on('console', (m) => { const t = m.text(); if (isReactWarn(t)) push('react-warning', t); });

const onPlay = () => /\/coach\/play/.test(page.url());
const inputEnabled = () => page.locator('[data-testid="chat-text-input"]').first().isEnabled().catch(() => false);
const lastAssistant = () => page.locator('[data-testid="chat-message-assistant"]').first().innerText().catch(() => '');
async function clearOverlays() {
  const calib = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await calib.count()) { await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 }).catch(() => null); await calib.waitFor({ state: 'detached', timeout: 20000 }).catch(() => null); }
  const consent = page.locator('[data-testid="ai-consent-allow"]');
  if (await consent.count() && await consent.isVisible().catch(() => false)) { await consent.click({ force: true, timeout: 4000 }).catch(() => null); await page.locator('[data-testid="ai-consent-modal"]').waitFor({ state: 'detached', timeout: 6000 }).catch(() => null); }
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.count()) { await page.keyboard.press('Escape').catch(() => null); await help.waitFor({ state: 'detached', timeout: 8000 }).catch(() => null); }
}
async function move(from, to) {
  const f = page.locator(`[data-square="${from}"]`).first(), t = page.locator(`[data-square="${to}"]`).first();
  if ((await f.count()) === 0 || (await t.count()) === 0) return false;
  await f.click({ timeout: 3000 }).catch(() => null); await page.waitForTimeout(200); await t.click({ timeout: 3000 }).catch(() => null); return true;
}
async function submit(q) {
  const inp = page.locator('[data-testid="chat-text-input"]').first();
  await inp.click().catch(() => null); await inp.pressSequentially(q, { delay: 10 }).catch(() => null); await page.keyboard.press('Enter').catch(() => null);
  await page.waitForTimeout(700); await clearOverlays();
}

// The probes. want='ground' MUST stay on /coach/play; want='drill' may leave.
const PROBES = [
  // #1 tactics QUESTIONS about the live board — must NOT be yanked to a drill
  { q: 'is there a tactic here?', want: 'ground' },
  { q: 'any tactics in this position?', want: 'ground' },
  { q: 'what tactics should I look for?', want: 'ground' },
  { q: 'do I have a tactic?', want: 'ground' },
  { q: 'show me the tactic here', want: 'ground' },
  { q: "what's the threat?", want: 'ground' },
  { q: 'anything hanging?', want: 'ground' },
  // best-move / position / master-play / concept questions
  { q: 'what should I play here?', want: 'ground' },
  { q: "what's the best move?", want: 'ground' },
  { q: "who's winning?", want: 'ground' },
  { q: 'how do I stand?', want: 'ground' },
  { q: 'how do masters play this?', want: 'ground' },
  { q: 'what is a fork?', want: 'ground' },
  { q: 'am I improving?', want: 'ground' },
  // explicit trainer IMPERATIVES — OK to navigate to a drill
  { q: 'give me a tactics puzzle', want: 'drill' },
  { q: 'drill my mistakes', want: 'drill' },
];

try {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500); await clearOverlays();
  await page.goto(`${PROD}/coach/play?opening=${encodeURIComponent('Italian Game')}&side=black`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('[data-testid="coach-game-page"]').waitFor({ timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(3000); await clearOverlays();
  console.log(`[boot] on /coach/play: ${onPlay()}`);
  // drive a few book moves so there's a real mid-game position
  for (const [f, t] of [['e7', 'e5'], ['b8', 'c6'], ['g8', 'f6']]) { await page.waitForTimeout(6000); await move(f, t); }
  await page.waitForTimeout(6000); await clearOverlays();

  for (let i = 0; i < PROBES.length; i++) {
    const p = PROBES[i];
    current = p.q;
    for (let k = 0; k < 30 && !(await inputEnabled()); k++) await page.waitForTimeout(1000);
    const urlBefore = page.url();
    const beforeAC = await page.locator('[data-testid="chat-message-assistant"]').count();
    await submit(p.q);
    // wait for a terminal outcome: navigation away, or a chat reply
    const start = Date.now(); let navigated = false, replied = false;
    while (Date.now() - start < 45000) {
      await page.waitForTimeout(1200);
      if (!onPlay()) { navigated = true; break; }
      if ((await page.locator('[data-testid="chat-message-assistant"]').count()) > beforeAC) { replied = true; break; }
    }
    const navTarget = navigated ? page.url() : '';
    const reply = replied ? (await lastAssistant()).replace(/\s+/g, ' ').trim() : '';
    // ── verdicts ──
    if (p.want === 'ground') {
      if (navigated) push('misroute', `GROUND question NAVIGATED AWAY to ${navTarget.replace(PROD, '')}: "${p.q}"`);
      else if (!replied) push('silent-hang', `no reply in 45s for "${p.q}"`);
      else if (/hit a snag|something went wrong|couldn'?t (generate|process)/i.test(reply)) push('error-fallback', `on "${p.q}"`);
    }
    console.log(`  [${i + 1}/${PROBES.length}] "${p.q}" want=${p.want} → ${navigated ? `NAV→${navTarget.replace(PROD, '')}` : replied ? 'replied(stayed)' : 'silent'} · breaks ${breaks.length}`);
    if (reply) console.log(`        reply: «${reply.slice(0, 130)}»`);
    // if we navigated away (drill), go back to the game for the next probe
    if (navigated) { await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => null); await page.waitForTimeout(2500); await clearOverlays(); if (!onPlay()) { await page.goto(`${PROD}/coach/play?opening=${encodeURIComponent('Italian Game')}&side=black`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null); await page.waitForTimeout(3000); await clearOverlays(); } }
    await page.waitForTimeout(900);
  }
} catch (e) { push('harness', e.message.split('\n')[0]); }

await browser.close();
const real = breaks.filter((b) => b.kind !== 'harness');
console.log(`\n=== ${real.length} REAL BREAKS ===`);
const byKind = {}; for (const b of real) byKind[b.kind] = (byKind[b.kind] || 0) + 1;
console.log('by kind:', JSON.stringify(byKind));
for (const b of real) console.log(`  ! [${b.kind}] "${b.input}" — ${b.detail}`);
process.exit(real.length ? 1 : 0);
