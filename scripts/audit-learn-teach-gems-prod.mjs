#!/usr/bin/env node
/**
 * LEARN NEVER TEACHES A GEM — IT POINTS AT THE OPENING'S PAGE (David
 * 2026-10-29: "it's not good to teach them in learn because that's free and I
 * want a reason for ppl to buy the openings" → "Remove").
 *
 * The gems are part of the opening the student buys: the opening page's trap
 * cards and the Play rung's punish callout teach them. Asking the free coach
 * for an opening's traps must answer, stay on the topic, name NO gem's slip or
 * punish, offer NO gem to play, and hand the student the opening's page.
 *
 *   A. it answers at all (not the stock "I can only speak to what I can verify")
 *   B0. the answers are about traps at all
 *   B. it names NO real gem — not a gem's slip with its punish, nor a punish
 *      that is a piece move, capture or check (a bare pawn push is a square)
 *   D. the student can act: the opening-page chip (`action-drill_opening`),
 *      and no gem chip ("after …, punish with …") in the chat
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-learn-teach-gems-prod.mjs
 */
import { isTrapGem } from './audit-lib/trap-bar.mjs';
import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { sleep } from './audit-lib/board-drive.mjs';
import { STOCK, isGrounded, spokenTextOf } from './audit-lib/coach-tab-graders.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const OPENING = process.env.AUDIT_OPENING ?? 'vienna-game';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/learn-teach-gems-${stamp}`;

const results = [];
const pass = (n, d) => { results.push({ name: n, ok: true, detail: d }); console.log(`  ✓ ${n}${d ? ` — ${d}` : ''}`); };
const fail = (n, d) => { results.push({ name: n, ok: false, detail: d }); console.log(`  ✗ ${n} — ${d}`); };
const unproven = (n, d) => { results.push({ name: n, ok: null, detail: d }); console.log(`  · ${n} — ${d}  ← NOT EXERCISED`); };

/** The ways a student actually asks for this. Three phrasings, because one
 *  lucky match proves nothing about the lane (the question-matrix rule). */
const ASKS = [
  'teach me the traps in the Vienna',
  'what traps can I play in the Vienna Game?',
  'show me a Vienna trap where my opponent goes wrong',
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // The ground truth: every weapon gem for this opening — what must NOT be said.
  const GEMS = JSON.parse(await readFile('src/data/punish-gems.json', 'utf-8'));
  // Traps only (F04) — the app's own bar, one shared copy for audits.
  const gems = GEMS.filter((g) => g.openingId === OPENING && isTrapGem(g));
  const slips = new Set(gems.map((g) => g.inaccuracy));
  const punishes = new Set(gems.map((g) => g.punish));
  console.log(`[gems] ${OPENING}: ${gems.length} weapon gem(s) · ${slips.size} distinct slips · ${punishes.size} distinct punishes\n`);
  if (!gems.length) { fail('the opening has gems to withhold', `no weapon gems for ${OPENING} — the check below would pass vacuously`); process.exit(1); }

  const listener = await startAuditListener();
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: true, executablePath: await resolveChromiumExecutable(false) });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(([u, s]) => { localStorage.setItem('auditStreamUrl', u); localStorage.setItem('auditStreamSecret', s); }, [listener.url, listener.secret]);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e?.message ?? e)));

  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(4000);
  for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="page-help-modal-close"]']) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) { await el.click({ force: true }).catch(() => {}); await sleep(400); }
  }

  const box = page.locator('[data-testid="chat-text-input"] textarea, [data-testid="chat-text-input"]').first();
  const all = page.locator('[data-testid="chat-message-user"], [data-testid="chat-message-assistant"]');
  const roles = () => all.evaluateAll((els) => els.map((e) => ({
    role: e.getAttribute('data-testid')?.endsWith('user') ? 'user' : 'assistant',
    text: (e.textContent ?? '').replace(/^\s*C\s+/, '').trim(),
  })));
  const tally = (l) => { const m = new Map(); for (const x of l) if (x.role === 'assistant' && x.text) m.set(x.text, (m.get(x.text) ?? 0) + 1); return m; };

  const answers = [];
  for (const question of ASKS) {
    for (let i = 0; i < 60 && await box.isDisabled().catch(() => false); i++) await sleep(1000);
    const before = tally(await roles().catch(() => []));
    await box.click({ force: true }).catch(() => {});
    await box.fill('').catch(() => {});
    await box.pressSequentially(question, { delay: 12 });
    await page.keyboard.press('Enter');
    const consent = page.locator('[data-testid="ai-consent-allow"]').first();
    if (await consent.isVisible().catch(() => false)) { await consent.click({ force: true }).catch(() => {}); await sleep(500); await page.locator('[data-testid="chat-send-btn"]').first().click({ force: true }).catch(() => {}); }

    let text = '', stable = 0;
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      await sleep(1500);
      const after = tally(await roles().catch(() => []));
      const fresh = [...after.entries()].filter(([t, n]) => n > (before.get(t) ?? 0)).map(([t]) => t);
      if (!fresh.length) continue;
      const now = fresh.reduce((a, b) => (b.length > a.length ? b : a));
      if (now === text) { if (++stable >= 2) break; } else { stable = 0; text = now; }
    }
    answers.push({ question, text });
    console.log(`   asked: "${question}"\n     → ${text ? `${text.slice(0, 160)}${text.length > 160 ? '…' : ''}` : '(no reply)'}\n`);
  }

  // ── A. it answers.
  const answered = answers.filter((a) => isGrounded({ ok: !!a.text, text: a.text }));
  if (answered.length === ASKS.length) pass('Learn answers a request for the traps', `${answered.length}/${ASKS.length} phrasings`);
  else if (answered.length) fail('Learn answers a request for the traps', `only ${answered.length}/${ASKS.length} — e.g. "${(answers.find((a) => !isGrounded({ ok: !!a.text, text: a.text }))?.text || '(silence)').slice(0, 110)}"`);
  else fail('Learn answers a request for the traps', `every phrasing came back stock or empty: "${(answers[0]?.text || '(silence)').slice(0, 140)}"`);

  // ── B0. IS IT EVEN ABOUT TRAPS? Asked "show me a Vienna trap where my
  //    opponent goes wrong", the coach replied "The best move is e4. It stakes
  //    out the centre..." — a fluent, correct, entirely unrelated answer. A
  //    lane that answers a different question is not a lane that works, and
  //    every content check below would happily grade that prose.
  const joined = answers.map((a) => a.text).join('\n');
  const TRAP_TALK = /\btrap|punish|refut|blunder|mistake|goes wrong|slip|falls? for|pitfall|weapon\b/i;
  const onTopic = answers.filter((a) => TRAP_TALK.test(a.text));
  if (!joined.trim()) unproven('the answers are about traps at all', 'nothing was answered');
  else if (onTopic.length === answers.length) pass('the answers are about traps at all', `${onTopic.length}/${answers.length}`);
  else fail('the answers are about traps at all', `${onTopic.length}/${answers.length} — e.g. "${(answers.find((a) => !TRAP_TALK.test(a.text))?.text || '').slice(0, 110)}"`);

  // ── B. it names NO gem. A bare coordinate is not a citation ("e4" is the
  //    first move of most of chess), and neither is a bare pawn push: the
  //    Vienna's own warning "be careful about the d4 push timing" is not the
  //    gem whose punish is d4 (2026-10-29). A gem is named when the answer
  //    says its slip AND its punish, or a punish that is a piece move, a
  //    capture or a check — words only that gem's line would put there.
  const says = (mv) => new RegExp(`(^|[^A-Za-z0-9])${mv.replace(/[+#]/g, '\\$&')}([^A-Za-z0-9]|$)`).test(joined);
  const barePawn = (mv) => /^[a-h][1-8]$/.test(mv);
  const named = (set) => [...set].filter(says);
  const namedSlips = named(slips);
  const namedPunishes = named(punishes);
  const distinct = new Set([...namedSlips, ...namedPunishes]);
  const namedGems = gems.filter((g) => says(g.punish) && (says(g.inaccuracy) || !barePawn(g.punish)));
  const citesGem = namedGems.length > 0;
  if (!joined.trim()) unproven('the answer names no gem', 'nothing was answered, so there is nothing to check');
  else if (!citesGem) pass('the answer names no gem', `${gems.length} gems withheld${distinct.size ? ` (incidental {${[...distinct].join(', ')}})` : ''}`);
  else fail('the answer names no gem', namedGems.map((g) => `${g.inaccuracy}? ${g.punish}!`).join('; '));

  // ── D. the student can act — on the opening's page, never a gem chip.
  const pageChips = await page.locator('[data-testid="action-drill_opening"]').count().catch(() => 0);
  const chipTexts = await page.locator('[data-testid^="message-choice-chip-"]').allTextContents().catch(() => []);
  const gemChips = chipTexts.filter((t) => /punish with/i.test(t));
  if (gemChips.length) fail('no gem chip in the chat', `${gemChips.length}: ${gemChips.slice(0, 3).join(' | ')}`);
  else pass('no gem chip in the chat', `${chipTexts.length} chip(s), none a gem`);
  if (pageChips) pass('the student is pointed at the opening page', `action-drill_opening×${pageChips}`);
  else fail('the student is pointed at the opening page', 'no opening-page chip — the answer leaves nowhere to go');

  // ── Instruments.
  const spoken = listener.getCapturedEvents().filter((e) => (e.kind ?? '') === 'coach-narration-spoken').map(spokenTextOf).filter(Boolean);
  if (listener.getCapturedEvents().length) pass('the listener heard the app', `${listener.getCapturedEvents().length} event(s), ${spoken.length} spoken`);
  else fail('the listener heard the app', '0 events — the instrument is blind, nothing above is trustworthy');

  const NOISE = /favicon|api\/tts|audit-stream|ResizeObserver/i;
  const real = pageErrors.filter((e) => !NOISE.test(e));
  if (real.length) fail('no page errors', real.slice(0, 2).join(' | ')); else pass('no page errors');

  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ opening: OPENING, gems: gems.length, answers, namedSlips, namedPunishes, gemChips, results }, null, 2));
  const ok = results.filter((r) => r.ok === true).length;
  const bad = results.filter((r) => r.ok === false).length;
  const un = results.filter((r) => r.ok === null).length;
  console.log(`\n[teach-gems] ${ok} passed · ${bad} failed · ${un} not exercised · ${OUT_DIR}`);
  if (bad) console.log(`[teach-gems] FAILED: ${results.filter((r) => r.ok === false).map((r) => r.name).join('; ')}`);
  await listener.stop();
  await browser.close();
  process.exit(bad ? 1 : 0);
}

main().catch((e) => { console.error('[teach-gems] threw:', e); process.exit(1); });
