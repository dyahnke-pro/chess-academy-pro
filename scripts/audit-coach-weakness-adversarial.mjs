// ADVERSARIAL "break it" audit for the grounded training/weakness-recommendation
// path + the coach brain around it (David 2026-07-04: "hit it harder again").
// Per the G7 / 2026-06-12 doctrine: push it until it breaks, capture the exact
// input + break class, discriminate real breaks from load/harness artifacts.
//
// The FRAGILE seam is the classification boundary — the same word ("tactics",
// "Sicilian", "weak") must route differently by phrasing:
//   • DIAGNOSIS  ("what tactics am I weak in")        → grounded weakness reply
//   • IMPERATIVE ("drill my tactics")                 → a drill
//   • TEACH      ("teach me the Sicilian")            → an opening lesson/picker
//   • CONCEPT    ("what is a fork")                   → a definition
//   • SINGLE-GAME("why did I lose that game")         → not a weakness dump
// Plus messy human chaos: typos, British, emoji, rambles, multi-intent,
// contradictions, rapid double-submit, out-of-order, mid-flight hijack.
//
// Break classes: pageerror, React key/update warning, silent-hang,
// error-fallback reply, stuck-input, and MISROUTE (diagnosis hijacked into a
// drill, or a drill/teach mis-answered as a weakness dump).
import { chromium } from 'playwright';
import { attachProxyInterception } from './audit-lib/proxy-intercept.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET || '';
const PASSES = Number(process.env.AUDIT_PASSES || 3);
const breaks = [];
let PASS = 0, current = 'boot';
const push = (kind, detail) => breaks.push({ pass: PASS, input: current, kind, detail: (detail || '').slice(0, 160) });

const streamPull = async (since) => {
  if (!SECRET) return [];
  try { const r = await fetch(`${PROD}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': SECRET } }); return (await r.json()).entries || []; } catch { return []; }
};

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await attachProxyInterception(ctx);
const page = await ctx.newPage();
const isReactWarn = (t) => /same key|unique "?key|Each child in a list|Maximum update depth|Cannot update a component|Encountered two children/i.test(t);
page.on('pageerror', (e) => push('pageerror', (e.message || '').split('\n')[0]));
page.on('console', (m) => { const t = m.text(); if (isReactWarn(t)) push('react-warning', t); else if (m.type() === 'error' && !/favicon|Failed to load resource|ERR_|net::|manifest|404|status of [45]/i.test(t)) push('console-error', t); });

const transcript = () => page.locator('[data-testid="teach-transcript"]').innerText().catch(() => '');
const lastAssistant = () => page.locator('[data-testid="chat-message-assistant"]').first().innerText().catch(() => '');
const inputEnabled = () => page.locator('[data-testid="chat-text-input"]').isEnabled().catch(() => false);
async function dismissBlockers() {
  const c = page.locator('[data-testid="ai-consent-allow"]');
  if (await c.count() && await c.isVisible().catch(() => false)) { await c.click({ force: true, timeout: 4000 }).catch(() => null); await page.locator('[data-testid="ai-consent-modal"]').waitFor({ state: 'detached', timeout: 6000 }).catch(() => null); }
  const h = page.locator('[data-testid="page-help-modal"]');
  if (await h.count() && await h.isVisible().catch(() => false)) { await page.keyboard.press('Escape').catch(() => null); await page.waitForTimeout(300); }
}
async function submit(q) {
  const inp = page.locator('[data-testid="chat-text-input"]');
  await inp.click().catch(() => null);
  await inp.pressSequentially(q, { delay: 8 }).catch(() => null);
  await page.keyboard.press('Enter').catch(() => null);
  await page.waitForTimeout(500);
  if (await page.locator('[data-testid="ai-consent-modal"]').count()) { await dismissBlockers(); await inp.click().catch(() => null); await inp.pressSequentially(q, { delay: 8 }).catch(() => null); await page.keyboard.press('Enter').catch(() => null); }
}

// Seed a weakness profile so the grounded path has real data to voice.
function seedRows() {
  const now = new Date().toISOString();
  const mk = (i, type) => ({ id: `adv-ct-${type}-${i}`, sourceGameId: `adv-g-${i}`, moveIndex: 10 + i, fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4', bestMoveUci: 'f3g5', bestMoveSan: 'Ng5', playerMoveUci: 'd2d3', playerMoveSan: 'd3', playerColor: 'white', tacticType: type, evalSwing: 300, explanation: 'x', opponentName: null, gameDate: null, openingName: 'Italian Game', puzzleAttempts: 0, puzzleSuccesses: 0, createdAt: now });
  return [mk(1, 'fork'), mk(2, 'fork'), mk(3, 'hanging_piece'), mk(4, 'back_rank'), mk(5, 'pin')];
}

// voiceFacts is the SHARED G0 chokepoint (progress AND concept/tactics/best-
// move all emit intent=grounded_voice), so the stream can't tell them apart —
// we classify by REPLY CONTENT. The weakness/recommendation reply has a
// signature unique to assembleWeaknessRecommendation (never a concept answer).
const WEAKNESS_SIG = /\b(to train|drill (your|those|these|the) mistakes|practice (these|all of these|those)|these patterns|most frequent|areas? to (train|work)|your (biggest |top )?weakness|analyze your weakness|patterns to work on|weaknesses you have|(don'?t|haven'?t) (have|played).{0,30}(games?|enough)|not enough games|analyze your (weakness|play|games))/i;

// Each case: input + expected route class. We verify the OUTCOME matches.
//   grounded = MUST produce the weakness/recommendation reply (WEAKNESS_SIG)
//   drill    = MUST NOT weakness-dump (ideally a drill; router unit-tested)
//   other    = teach/concept/single-game — MUST NOT weakness-dump
//   any/noop = must not crash/hang
const CASES = [
  // — diagnosis variants (grounded) —
  { q: 'what tactics am I weak in?', want: 'grounded' },
  { q: 'whats my biggest weakness', want: 'grounded' },
  { q: 'where do I keep losing games', want: 'grounded' },
  { q: 'what should I train', want: 'grounded' },
  { q: 'what should I grind next lol', want: 'grounded' },
  { q: 'wat am i bad at', want: 'grounded' }, // typo
  { q: 'what are my weaknesses in the endgame', want: 'grounded' },
  { q: "what's my kryptonite", want: 'grounded' },
  { q: 'diagnose my chess pls', want: 'grounded' },
  { q: 'where am I hemorrhaging rating 😤', want: 'grounded' }, // emoji + idiom
  // — imperatives (drill, must NOT be diagnosed) —
  { q: 'drill my weaknesses', want: 'not-weakness' },
  { q: 'give me a tactics puzzle', want: 'not-weakness' },
  { q: 'practice my mistakes', want: 'not-weakness' },
  // — teach (opening, must NOT weakness-dump) —
  { q: 'teach me the Sicilian', want: 'other' },
  { q: 'I want to learn the Caro-Kann', want: 'other' },
  // — concept (must NOT weakness-dump) —
  { q: 'what is a fork', want: 'other' },
  { q: 'explain zugzwang', want: 'other' },
  // — single-game review (must NOT aggregate weakness-dump) —
  { q: 'why did I lose that game', want: 'other' },
  // — boundary: weakness + named opening (ambiguous, must not crash) —
  { q: "what's my weakness in the Sicilian?", want: 'any' },
  // — multi-intent / contradiction / chaos —
  { q: 'teach me the najdorf AND what am I weak in AND drill me', want: 'any' },
  { q: 'what am I weak in, no actually teach me the french', want: 'any' },
  { q: 'weaknesses????', want: 'grounded' },
  { q: '🙂 what should i work on 🔥🔥', want: 'grounded' },
  { q: 'a'.repeat(800) + ' what am I weak at', want: 'any' }, // long ramble
  { q: '   ', want: 'noop' }, // empty — correct no-op
  { q: 'weak', want: 'any' }, // single word
  // — harder boundary probes (David: "keep asking this line of questioning") —
  { q: 'am I any good at chess', want: 'any' },
  { q: "what's my worst opening", want: 'grounded' }, // opening-weakness → grounded
  { q: 'I keep hanging my queen', want: 'grounded' }, // self weakness statement
  { q: 'should I study openings or tactics', want: 'any' }, // choice
  { q: 'what do grandmasters do that I dont', want: 'any' }, // comparison
  { q: 'help me get better at chess', want: 'grounded' },
  { q: 'whats my weakest phase', want: 'grounded' },
  { q: 'am i improving', want: 'grounded' }, // progress-over-time
  { q: 'what are my strengths', want: 'any' }, // inverse polarity — not a weakness-dump crash
  { q: 'Najdorff', want: 'other' }, // typo opening → NOT weakness
  { q: 'what should i learn, the KID or the Grunfeld', want: 'any' }, // teach-choice
  { q: 'tell me where im losing rating', want: 'grounded' },
  { q: 'brush up on what exactly', want: 'any' },
  { q: 'i suck at endgames what do i do', want: 'grounded' },
];

async function boot() {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500);
  const bub = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await bub.count()) { await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 4000 }).catch(() => null); await bub.waitFor({ state: 'detached', timeout: 12000 }).catch(() => null); }
  const seeded = await page.evaluate(async (rows) => new Promise((resolve) => {
    const req = indexedDB.open('ChessAcademyDB');
    req.onsuccess = () => { const db = req.result; if (!db.objectStoreNames.contains('classifiedTactics')) return resolve('no-store'); const tx = db.transaction('classifiedTactics', 'readwrite'); const s = tx.objectStore('classifiedTactics'); for (const r of rows) s.put(r); tx.oncomplete = () => resolve('ok'); tx.onerror = () => resolve('tx-err'); };
    req.onerror = () => resolve('open-err');
  }), seedRows());
  console.log(`[seed] ${seeded}`);
  await page.goto(`${PROD}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  await dismissBlockers();
}

// classify the outcome after a submit. Strict per-question attribution:
// qSince = exact submit time; we wait until a terminal surface appears
// (drill panel / line-picker / a new assistant reply) or the budget expires.
async function outcome(qSince, beforeAssistantCount) {
  const start = Date.now();
  let drill = false, picker = false, grounded = 0, replied = false, pickerName = '';
  // 60s budget — under the 40-question sequential load a brain-heavy turn can
  // exceed 40s (proven load, not a bug: the same input answers in ~3s in
  // isolation). A shorter window manufactures false silent-hangs.
  while (Date.now() - start < 60000) {
    await page.waitForTimeout(1400);
    if (await page.locator('[data-testid="walkthrough-drill-active"],[data-testid="walkthrough-drill-picker"]').count()) { drill = true; break; }
    if (await page.locator('[data-testid="line-picker"]').count()) { picker = true; pickerName = await page.locator('[data-testid="line-picker"]').innerText().catch(() => ''); break; }
    const ac = await page.locator('[data-testid="chat-message-assistant"]').count();
    if (ac > beforeAssistantCount) replied = true;
    const ev = await streamPull(qSince);
    grounded = ev.filter((e) => /grounded=true|grounded_voice/i.test(JSON.stringify(e))).length;
    if (replied && (grounded > 0 || Date.now() - start > 8000)) break;
  }
  // give the reply text a moment to finish streaming, then read the newest bubble
  await page.waitForTimeout(1200);
  const reply = (await lastAssistant()).replace(/\s+/g, ' ').trim();
  const isWeaknessDump = WEAKNESS_SIG.test(reply);
  return { drill, picker, grounded, replied, reply, isWeaknessDump, pickerName: pickerName.replace(/\s+/g, ' ').trim() };
}

try {
  await boot();
  for (PASS = 1; PASS <= PASSES; PASS++) {
    console.log(`\n=== PASS ${PASS} ===`);
    // shuffle deterministically by pass so a break can't hide behind order
    const order = CASES.map((c, i) => [(i * 7 + PASS * 13) % CASES.length, c]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    for (let i = 0; i < order.length; i++) {
      const c = order[i];
      current = c.q.slice(0, 44);
      for (let k = 0; k < 40 && !(await inputEnabled()); k++) await page.waitForTimeout(1000);
      await dismissBlockers();
      // pass 2+: every 3rd input is a rapid DOUBLE submit (state chaos)
      const doubleFire = PASS >= 2 && i % 3 === 2;
      const beforeAC = await page.locator('[data-testid="chat-message-assistant"]').count();
      const qSince = Date.now();
      await submit(c.q);
      if (doubleFire) { current = `rapid2:${current}`; await page.waitForTimeout(120); await submit(c.q); }
      if (c.want === 'noop') { await page.waitForTimeout(800); if (!(await page.evaluate(() => document.querySelector('#root')?.children.length > 0).catch(() => false))) push('pageerror', 'dead after empty submit'); continue; }
      const o = await outcome(qSince, beforeAC);
      // ── verdicts ──
      // A grounded diagnosis case is a REAL misroute only when it lands on a
      // KNOWN-WRONG surface — the LLM paraphrases the weakness reply too freely
      // to positively pattern-match, but the WRONG surfaces are unmistakable:
      //   fuzzy "did you mean" · teach picker-welcome · a board best-move answer.
      const MISROUTE_SIG = /don'?t have an exact match|did you mean one of these|welcome to my classroom|the board says|you'?re (about to|staring at)|forced mate|mate in one with/i;
      if (/hit a snag|something went wrong|couldn'?t (generate|process)|try that again/i.test(o.reply)) push('error-fallback', `on "${current}"`);
      const terminal = o.drill || o.picker || o.replied;
      if (!terminal) push('silent-hang', `no reply/drill/picker in 40s for "${current}"`);
      if (c.want === 'grounded') {
        if (o.drill) push('misroute', `DIAGNOSIS hijacked into a DRILL: "${current}"`);
        else if (o.picker) push('misroute', `DIAGNOSIS surfaced an OPENING PICKER: "${current}"`);
        else if (MISROUTE_SIG.test(o.reply)) push('misroute', `DIAGNOSIS hit a WRONG SURFACE: "${current}" → «${o.reply.slice(0, 90)}»`);
      }
      // teach/concept/single-game/imperative MUST NOT produce a weakness-dump.
      if ((c.want === 'other' || c.want === 'not-weakness') && o.isWeaknessDump && !o.drill && !o.picker) {
        push('misroute', `${c.want.toUpperCase()} got a WEAKNESS-DUMP: "${current}" → «${o.reply.slice(0, 90)}»`);
      }
      console.log(`  [${i + 1}/${order.length}] "${c.q.slice(0, 38)}" want=${c.want} → drill=${o.drill} picker=${o.picker}${o.pickerName ? `(${o.pickerName.slice(0, 40)})` : ''} wDump=${o.isWeaknessDump} · breaks ${breaks.length}`);
      console.log(`        reply: «${o.reply.slice(0, 140)}»`);
      // Reset transient state (a line-picker / drill panel persists across
      // turns) so the NEXT case starts clean — reload the surface.
      if (o.picker || o.drill) {
        await page.goto(`${PROD}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
        await page.waitForTimeout(2000); await dismissBlockers();
      }
      await page.waitForTimeout(900); // pace brain-heavy inputs
    }
    // out-of-order chaos: stop with nothing running, then a diagnosis
    current = 'oo:stop+diagnose';
    await submit('stop'); await page.waitForTimeout(700); await submit('what am I weak in');
    await page.waitForTimeout(3000);
    if (!(await page.evaluate(() => document.querySelector('#root')?.children.length > 0).catch(() => false))) push('pageerror', 'dead after out-of-order');
  }
} catch (e) { push('harness', e.message.split('\n')[0]); }

await browser.close();
const real = breaks.filter((b) => b.kind !== 'harness');
console.log(`\n=== ${real.length} REAL BREAKS across ${PASSES} passes ===`);
const byKind = {}; for (const b of real) byKind[b.kind] = (byKind[b.kind] || 0) + 1;
console.log('by kind:', JSON.stringify(byKind));
for (const b of real.slice(0, 40)) console.log(`  ! pass${b.pass} [${b.kind}] input="${b.input}" — ${b.detail}`);
process.exit(real.length ? 1 : 0);
