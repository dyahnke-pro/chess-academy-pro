#!/usr/bin/env node
/**
 * audit-learn-escalating-questions — PLAY A GAME, ASK HARDER AND HARDER
 * (David 2026-10-17: "play a game and ask escalating questions. Progressively
 * harder and deeper").
 *
 * A real Learn game: the student's moves are the engine's (depth 8 — a sound
 * club player), the coach plays its own replies. Every second move the next
 * rung of a question ladder is asked in the chat — from "what did their move
 * do?" up to "what is THE reason, not a reason?" and "calculate it six moves
 * deep" — and every answer is CHECKED, not only read:
 *   • every "<piece> on <square>" it names stands there (or stood there before
 *     the last move — an answer about the move just played);
 *   • "best move?" names the engine's move or one within 30cp of it;
 *   • a forced mate is claimed only where the engine sees one, and named where
 *     it does;
 *   • nothing is silent: every question gets an answer.
 *
 * Muted (hand driver). Native Stockfish (/usr/games/stockfish) is the oracle.
 *
 *   npm run dev   (or AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app)
 *   AUDIT_SANDBOX=1 node scripts/audit-learn-escalating-questions.mjs [--moves=24]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PORT = Number(process.env.HAND_PORT ?? 7793);
const MOVES = Number((process.argv.find((a) => a.startsWith('--moves=')) ?? '--moves=24').slice(8));
const base = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sanRe = (san) => new RegExp(`(?:^|[^A-Za-z0-9])${esc(san.replace(/[+#]$/, ''))}(?![A-Za-z0-9])`);

/** The engine, native: MultiPV 3 at `depth`. Lines in the MOVER's view. */
function sf(fen, depth) {
  return new Promise((resolve) => {
    const p = spawn('/usr/games/stockfish'); let buf = ''; const lines = new Map();
    p.stdout.on('data', (d) => {
      buf += String(d); let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const l = buf.slice(0, i); buf = buf.slice(i + 1);
        const mpv = /multipv (\d+)/.exec(l);
        if (l.startsWith('info') && mpv && / pv /.test(l)) {
          const cp = /score cp (-?\d+)/.exec(l); const mate = /score mate (-?\d+)/.exec(l);
          lines.set(+mpv[1], { cp: cp ? +cp[1] : null, mate: mate ? +mate[1] : null, pv: l.slice(l.indexOf(' pv ') + 4).trim().split(/\s+/) });
        }
        if (l.startsWith('bestmove')) { p.kill(); resolve([...lines.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1])); }
      }
    });
    p.stdin.write(`uci\nsetoption name MultiPV value 3\nisready\nposition fen ${fen}\ngo depth ${depth}\n`);
  });
}
const sanOf = (fen, uci) => { try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return null; } };
const score = (l) => (l.mate != null ? (l.mate > 0 ? 100000 - l.mate : -100000 - l.mate) : l.cp);

const driver = spawn(process.execPath, ['scripts/audit-lib/hand-driver.mjs'], { env: { ...process.env, HAND_PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('hand driver did not start in 90s')), 90_000);
  driver.stdout.on('data', (b) => { if (String(b).includes('hand-driver on')) { clearTimeout(t); resolve(); } });
  driver.on('exit', (code) => reject(new Error(`hand driver exited ${code}`)));
});
const get = async (p, body) => (await fetch(`${base}${p}`, body === undefined ? {} : { method: 'POST', body })).json();
const js = (code) => get('/js', code);
const pageLines = async () => { const t = await js('return document.body.innerText'); return typeof t === 'string' ? t.split('\n').map((l) => l.trim()).filter(Boolean) : []; };
const newLines = (before, now) => {
  const seen = new Map(); for (const l of before) seen.set(l, (seen.get(l) ?? 0) + 1);
  const out = []; for (const l of now) { const n = seen.get(l) ?? 0; if (n > 0) seen.set(l, n - 1); else out.push(l); }
  return out;
};
const usable = () => js('return [...document.querySelectorAll("[data-testid=chat-text-input]")].some((e) => e.getClientRects().length > 0 && !e.disabled)');

async function ask(text) {
  const before = await pageLines();
  const t0 = Date.now();
  await get('/type', text);
  let last = ''; let stable = 0;
  for (let i = 0; i < 90; i += 1) {
    await sleep(1000);
    const cur = newLines(before, await pageLines()).filter((l) => l !== text && !/^(Coach is thinking|Analysing position|Thinking…)/i.test(l)).join(' ⏎ ');
    if (cur && cur === last && (await usable())) stable += 1; else stable = 0;
    last = cur;
    if (stable >= 2) break;
  }
  return { answer: last, secs: Math.round((Date.now() - t0) / 100) / 10 };
}

/** Every "<piece> on <square>" named must stand on one of the boards. */
const NAME = { king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n', pawn: 'p' };
function pieceClaimsFalse(text, fens) {
  const bad = [];
  // Only a definite claim ("your/their/the knight on c4"); "plant a knight on
  // c4" names a destination, not where a piece stands.
  // "plant / put / bring your knight on e3" names where it should GO.
  for (const m of text.matchAll(/(?<!\b(?:plant|put|place|bring|get|post|land|station|set)\s)\b(?:your|their|the|my)\s+(king|queen|rook|bishop|knight|pawn)s? on ([a-h][1-8])\b/gi)) {
    const ok = fens.some((f) => { const p = new Chess(f).get(m[2]); return p && p.type === NAME[m[1].toLowerCase()]; });
    if (!ok) bad.push(`${m[1]} on ${m[2]}`);
  }
  return bad;
}

// THE LADDER — each rung harder and deeper than the last; the check its truth allows.
const LADDER = [
  { q: 'What did their last move do?' },
  { q: 'Is anything of mine hanging right now?' },
  { q: 'What are they threatening?' },
  { q: "What's the best move here?", check: 'best' },
  { q: 'Why is that the best move?' },
  { q: 'What happens if I play {second} instead?', check: 'second' },
  { q: "What's the plan for both sides from here?" },
  { q: 'Is there a forced mate or a winning combination for either side?', check: 'mate' },
  { q: 'Calculate the main line six moves deep — where does it end up?' },
  { q: 'Why did they play their last move — what is THE reason, not just a reason?' },
];

const results = [];
await get('/open');
const playerColor = 'w';
let asked = 0;
for (let n = 0; n < MOVES; n += 1) {
  // The live board, mirrored by the driver: wait for our turn.
  let st = await get('/state');
  for (let t = Date.now(); st.turn !== playerColor && Date.now() - t < 60_000; await sleep(1500)) st = await get('/state');
  const c = new Chess(); for (const m of st.moves.split(/\s+/).filter(Boolean)) c.move(m);
  if (c.isGameOver()) break;
  const fen = c.fen();
  const prevFen = (() => { const d = new Chess(); const h = c.history(); for (const m of h.slice(0, -1)) d.move(m); return d.fen(); })();
  if (n % 2 === 1 && asked < LADDER.length * 2) {
    const rung = LADDER[asked % LADDER.length];
    const deep = await sf(fen, 16);
    const best = deep[0] ? sanOf(fen, deep[0].pv[0]) : null;
    const second = deep[1] ? sanOf(fen, deep[1].pv[0]) : null;
    const q = rung.q.replace('{second}', second ?? 'a quiet move');
    const { answer, secs } = await ask(q);
    const issues = [];
    if (!answer) issues.push('no answer');
    issues.push(...pieceClaimsFalse(answer, [fen, prevFen]).map((b) => `false piece claim: ${b}`));
    if (rung.check === 'best' && best) {
      const okMoves = deep.filter((l) => score(deep[0]) - score(l) <= 30).map((l) => sanOf(fen, l.pv[0])).filter(Boolean);
      if (!okMoves.some((s) => sanRe(s).test(answer))) issues.push(`best move: engine ${okMoves.join('/')} — not named`);
    }
    if (rung.check === 'mate') {
      const mates = deep[0]?.mate != null;
      const says = /\bmate\b/i.test(answer) && !/\bno (?:forced )?mate\b|not a mate|isn't a mate|no mating/i.test(answer);
      if (mates && !says) issues.push(`engine sees mate in ${deep[0].mate} — answer does not`);
      if (!mates && says && /forced mate|mate in \d/i.test(answer)) issues.push('claims a forced mate the engine does not see');
    }
    results.push({ move: c.history().length, history: c.history().join(' '), tier: (asked % LADDER.length) + 1, round: Math.floor(asked / LADDER.length) + 1, q, answer, secs, best, issues });
    console.log(`\n[${results.length}] tier ${(asked % LADDER.length) + 1} · move ${Math.ceil(c.history().length / 2)} · ${secs}s\n  Q: ${q}\n  A: ${answer.slice(0, 600)}${issues.length ? `\n  ✗ ${issues.join(' | ')}` : '\n  ✓'}`);
    asked += 1;
  }
  // The student's move: the engine at depth 8.
  const lines = await sf(fen, 8);
  const san = lines[0] ? sanOf(fen, lines[0].pv[0]) : null;
  if (!san) break;
  // An answer can leave its line on the board, or the board locked while the
  // reply settles: give the move a few patient tries before calling it.
  let r = await get(`/move?san=${encodeURIComponent(san)}`);
  for (let k = 0; r.error && k < 4; k += 1) { await sleep(5000); r = await get(`/move?san=${encodeURIComponent(san)}`); }
  if (r.error) { console.log(`move error: ${r.error}`); results.push({ move: c.history().length, tier: 0, round: 0, q: '(move)', answer: '', secs: 0, best: san, issues: [`board would not take ${san}`] }); break; }
}

const bad = results.filter((r) => r.issues.length);
console.log(`\nESCALATING QUESTIONS: ${results.length} asked · ${results.length - bad.length} clean · ${bad.length} with issues`);
fs.mkdirSync('audit-reports', { recursive: true });
fs.writeFileSync(`audit-reports/escalating-questions-${Date.now()}.json`, JSON.stringify(results, null, 1));
await get('/quit').catch(() => {});
process.exit(bad.length ? 1 : 0);
