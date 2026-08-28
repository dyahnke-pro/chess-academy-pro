// HAND-WALK A FULL GAME, asking many board questions every move (David
// 2026-08-28: "play a full game asking questions every step of the way, even
// ask multiple questions each move … exhausted all questions you can think of,
// then we see which it could answer and which it could not").
//
// Drives /coach/play vs Stockfish as White, plays a real game move by move, and
// at each of my turns asks a rotating batch from a big battery of board
// questions — every question the coach should be able to field. Captures each
// REAL reply (assistant-bubble count + text-stability, badge stripped) and
// classifies: answered / canned / idle / off-target / empty. Writes a full log
// + a per-question verdict tally to the scratchpad.
import fs from 'node:fs';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from '../audit-lib/chromium.mjs';
import { muteTtsForAudit } from '../audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const OUT = '/tmp/claude-0/-home-user-chess-academy-pro/4ce43189-b910-54d0-aa42-ce3f047e0b1b/scratchpad';
const LOG = `${OUT}/fullgame-qa.log`;
const CANNED = "i can't verify that precisely";
const IDLE = /name an?y? opening|what are we working on|back at the board|what can i help/i;

const log = (s) => { fs.appendFileSync(LOG, s + '\n'); console.log(s); };
fs.writeFileSync(LOG, `FULL-GAME Q&A HAND-WALK — ${new Date().toISOString()}\n`);

// My White moves, a natural Italian → middlegame line, one per turn.
const MY_MOVES = [['e2','e4'],['g1','f3'],['f1','c4'],['e1','g1'],['d2','d3'],['b1','c3'],['c1','g5'],['a2','a3'],['d1','e2'],['f1','e1'],['c3','d5'],['h2','h3'],['g5','f6'],['e2','e3'],['a1','d1']];

// The full battery of board questions a real player asks. Grouped; the
// classifier knows which are best-move questions (an eval readout is fine) vs
// which want something else (an eval readout there = off-target / ignored).
const BATTERY = [
  { q: "What's the best move here?", kind: 'best' },
  { q: 'Why is that the best move?', kind: 'why-best' },
  { q: 'What are my candidate moves?', kind: 'best' },
  { q: "What's the most forcing move?", kind: 'best' },
  { q: "What's my plan?", kind: 'plan' },
  { q: 'What is the plan for white and black?', kind: 'plan' },
  { q: 'What should my pieces be doing?', kind: 'plan' },
  { q: 'Is anything hanging?', kind: 'hanging' },
  { q: "What's the threat?", kind: 'threat' },
  { q: 'What should I be worried about?', kind: 'threat' },
  { q: 'Am I better or worse right now?', kind: 'assess' },
  { q: 'Who is winning?', kind: 'assess' },
  { q: 'What is my worst piece?', kind: 'piece' },
  { q: 'What is my best piece?', kind: 'piece' },
  { q: 'Where should my knight go?', kind: 'piece' },
  { q: 'Where should my rooks go?', kind: 'piece' },
  { q: 'Was my last move good?', kind: 'movequality' },
  { q: 'Did I make a mistake?', kind: 'movequality' },
  { q: 'Why did they play that?', kind: 'opp-why' },
  { q: 'What is my opponent trying to do?', kind: 'opp-why' },
  { q: 'Should I castle here?', kind: 'decision' },
  { q: 'Should I trade queens?', kind: 'decision' },
  { q: 'Should I trade pieces?', kind: 'decision' },
  { q: 'Is my king safe?', kind: 'king' },
  { q: 'How do I attack the king?', kind: 'attack' },
  { q: 'Can I win material?', kind: 'tactic' },
  { q: 'What tactics are in the position?', kind: 'tactic' },
  { q: 'Are there any tactics for me?', kind: 'tactic' },
  { q: 'What file should my rook go on?', kind: 'piece' },
  { q: 'What are the weaknesses in my position?', kind: 'weakness' },
  { q: "What are my opponent's weaknesses?", kind: 'weakness' },
  { q: 'How is the pawn structure?', kind: 'structure' },
  { q: 'What pawn break should I play?', kind: 'structure' },
  { q: 'What does Bxe7 mean?', kind: 'notation' },
  { q: 'What does O-O mean?', kind: 'notation' },
  { q: 'What is the idea in this position?', kind: 'plan' },
  { q: 'How should I finish the game from here?', kind: 'plan' },
  { q: 'What opening is this?', kind: 'opening' },
];

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
const page = await ctx.newPage();

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-beginner"]'],
  ]) {
    try { await page.locator(gate).waitFor({ timeout: 8000 }); await page.locator(btn).click(); await page.locator(gate).waitFor({ state: 'detached', timeout: 15000 }); } catch { /**/ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /**/ }
}

async function tryMove(from, to) {
  try {
    await page.locator(`[data-square="${from}"]`).click({ timeout: 4000 });
    await page.waitForTimeout(400);
    await page.locator(`[data-square="${to}"]`).click({ timeout: 4000 });
    await page.waitForTimeout(3000); // let the bot reply
    return true;
  } catch { return false; }
}

const bubbles = () => page.locator('[data-testid="chat-message-assistant"]');
async function ask(q) {
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 15000 });
  for (let i = 0; i < 40 && !(await box.isEditable().catch(() => false)); i++) await page.waitForTimeout(1000);
  const n0 = await bubbles().count();
  await box.click(); await box.fill(''); await box.pressSequentially(q, { delay: 6 });
  try { await page.locator('[data-testid="chat-send-btn"]').click({ timeout: 4000 }); } catch { await box.press('Enter'); }
  let last = '';
  for (let i = 0; i < 75; i++) {
    await page.waitForTimeout(1000);
    if (await bubbles().count() > n0) {
      const t = (await bubbles().last().innerText().catch(() => '')).replace(/^C\s+/, '').trim();
      if (t && t === last && t.length >= 12) return t;
      last = t;
    }
  }
  return last || '';
}

const results = []; // {q, kind, move, reply, verdict}
function classify(kind, reply) {
  const r = reply.toLowerCase();
  if (!reply || reply.length < 12) return 'empty';
  if (r.includes(CANNED)) return 'canned';
  if (IDLE.test(reply)) return 'idle';
  const bestReadout = /the best move is|stakes out the centre|clearly better|slightly better|about \d/i.test(reply);
  if (bestReadout && !['best', 'why-best', 'assess'].includes(kind)) return 'off-target';
  return 'answered';
}

try {
  await page.goto(`${BASE}/coach/play`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();
  await page.waitForTimeout(2500);
  // Ensure a fresh game as White.
  try { await page.locator('[data-testid="color-white-btn"]').click({ timeout: 3000 }); await page.waitForTimeout(1500); } catch { /**/ }

  let qi = 0;
  for (let m = 0; m < MY_MOVES.length; m++) {
    // Ask a batch of 3 questions BEFORE moving (real board context).
    log(`\n───────── MOVE ${m + 1} (before ${MY_MOVES[m][0]}${MY_MOVES[m][1]}) ─────────`);
    for (let b = 0; b < 3; b++) {
      const item = BATTERY[qi % BATTERY.length]; qi++;
      let reply = '';
      try { reply = await ask(item.q); } catch (e) { reply = `(error: ${e.message})`; }
      const verdict = classify(item.kind, reply);
      results.push({ q: item.q, kind: item.kind, move: m + 1, reply, verdict });
      log(`\n[${verdict.toUpperCase()}] (${item.kind}) Q: ${item.q}\n  A: ${reply.slice(0, 260) || '(none)'}`);
    }
    const ok = await tryMove(...MY_MOVES[m]);
    if (!ok) { log(`  (could not play ${MY_MOVES[m].join('')}; game may be over — stopping move loop)`); break; }
  }
} catch (e) {
  log(`\nAUDIT ERROR: ${e.message}`);
} finally {
  // Tally per verdict + list what it could NOT answer.
  const by = (v) => results.filter((r) => r.verdict === v);
  log(`\n\n════════ TALLY (${results.length} questions asked) ════════`);
  for (const v of ['answered', 'off-target', 'canned', 'idle', 'empty']) log(`  ${v}: ${by(v).length}`);
  log(`\n──── COULD NOT ANSWER (canned/idle/empty/off-target), unique questions ────`);
  const bad = results.filter((r) => r.verdict !== 'answered');
  const seen = new Set();
  for (const r of bad) { if (seen.has(r.q)) continue; seen.add(r.q); log(`  [${r.verdict}] ${r.q}  →  ${r.reply.slice(0, 90)}`); }
  fs.writeFileSync(`${OUT}/fullgame-qa.json`, JSON.stringify(results, null, 2));
  log(`\nfull results: ${OUT}/fullgame-qa.json`);
  await page.screenshot({ path: `${OUT}/fullgame-final.png` }).catch(() => {});
  await browser.close();
}
