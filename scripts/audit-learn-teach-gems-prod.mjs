#!/usr/bin/env node
/**
 * CAN LEARN TEACH THE GEMS WHEN ASKED? (David 2026-08-16: "Make sure the coach
 * can teach the gems when asked under learn. Ask it to teach you the traps in
 * the Vienna opening.")
 *
 * The gems are DATA — 21 weapon-tier traps for the Vienna in punish-gems.json,
 * every one with hand-authored narration. The question is whether asking the
 * coach for them reaches that data, or whether it answers from the model's own
 * idea of what a Vienna trap looks like.
 *
 * So the answer is graded AGAINST THE DATA, not for plausibility:
 *
 *   A. it answers at all (not the stock "I can only speak to what I can verify")
 *   B. it names REAL gem content — the slip or the punish of an actual Vienna
 *      gem. A fluent paragraph about the Frankenstein-Dracula that cites no
 *      gem in the file is a FAILURE, not a nice answer.
 *   C. every chess move it names is legal in a real Vienna gem line. This is
 *      the invention check: a move that appears in no gem line is the model
 *      making chess up, which is the one thing G0 exists to prevent.
 *   D. the student can DO something with it — a trap/gem affordance appears,
 *      or the coach offers to play one out. Prose alone is a lecture.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-learn-teach-gems-prod.mjs
 */
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

  // The ground truth: every weapon gem for this opening, and every move in it.
  const GEMS = JSON.parse(await readFile('src/data/punish-gems.json', 'utf-8'));
  const WEAPON = new Set(['confirmed', 'positional']);
  const gems = GEMS.filter((g) => g.openingId === OPENING && WEAPON.has(g.tier));
  const slips = new Set(gems.map((g) => g.inaccuracy));
  const punishes = new Set(gems.map((g) => g.punish));
  const everyGemMove = new Set(gems.flatMap((g) => g.playLine.trim().split(/\s+/)));
  console.log(`[gems] ${OPENING}: ${gems.length} weapon gem(s) · ${slips.size} distinct slips · ${punishes.size} distinct punishes\n`);
  if (!gems.length) { fail('the opening has gems to teach', `no weapon gems for ${OPENING}`); process.exit(1); }

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

  // ── B. it names REAL gem content.
  const joined = answers.map((a) => a.text).join('\n');
  const namedSlips = [...slips].filter((s) => new RegExp(`(^|[^A-Za-z0-9])${s.replace(/[+#]/g, '\\$&')}([^A-Za-z0-9]|$)`).test(joined));
  const namedPunishes = [...punishes].filter((p) => new RegExp(`(^|[^A-Za-z0-9])${p.replace(/[+#]/g, '\\$&')}([^A-Za-z0-9]|$)`).test(joined));
  if (!joined.trim()) unproven('the answer cites REAL gems from the data', 'nothing was answered, so there is nothing to check');
  else if (namedSlips.length || namedPunishes.length) pass('the answer cites REAL gems from the data', `slips {${namedSlips.join(', ')}} punishes {${namedPunishes.join(', ')}}`);
  else fail('the answer cites REAL gems from the data', `${gems.length} gems exist and the answer named none of them — it is teaching from somewhere other than the file`);

  // ── C. no invented chess. Every SAN-shaped token must live in a gem line.
  const SAN = /\b(?:O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;
  const cited = [...new Set((joined.match(SAN) ?? []))]
    // Bare coordinates ("the d5 square") are talk about squares, not move claims.
    .filter((t) => !/^[a-h][1-8]$/.test(t));
  const invented = cited.filter((t) => !everyGemMove.has(t));
  if (!cited.length) unproven('every move it names is a real move in a gem line', 'the answer named no moves');
  else if (!invented.length) pass('every move it names is a real move in a gem line', `${cited.length} move(s) cited, all present in ${OPENING} gem lines`);
  else fail('every move it names is a real move in a gem line', `${invented.length} invented: ${invented.slice(0, 8).join(', ')}`);

  // ── D. the student can act on it.
  const affordances = [];
  for (const sel of ['[data-testid^="gem-watch-"]', '[data-testid^="gem-learn-"]', '[data-testid^="trap-"]', '[data-testid^="message-choice-chip-"]', '[data-testid^="coach-choice-chip-"]']) {
    const n = await page.locator(sel).count().catch(() => 0);
    if (n) affordances.push(`${sel}×${n}`);
  }
  const offersPlay = /\b(play it out|walk (?:you )?through|shall we|want to (?:see|try)|let's play|I can show you)\b/i.test(joined);
  if (affordances.length || offersPlay) pass('the student can DO something with the answer', affordances.join(', ') || 'the coach offers to play it out');
  else fail('the student can DO something with the answer', 'prose only — no trap/gem affordance, no offer to play a line out');

  // ── Instruments.
  const spoken = listener.getCapturedEvents().filter((e) => (e.kind ?? '') === 'coach-narration-spoken').map(spokenTextOf).filter(Boolean);
  if (listener.getCapturedEvents().length) pass('the listener heard the app', `${listener.getCapturedEvents().length} event(s), ${spoken.length} spoken`);
  else fail('the listener heard the app', '0 events — the instrument is blind, nothing above is trustworthy');

  const NOISE = /favicon|api\/tts|audit-stream|ResizeObserver/i;
  const real = pageErrors.filter((e) => !NOISE.test(e));
  if (real.length) fail('no page errors', real.slice(0, 2).join(' | ')); else pass('no page errors');

  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ opening: OPENING, gems: gems.length, answers, namedSlips, namedPunishes, cited, invented, results }, null, 2));
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
