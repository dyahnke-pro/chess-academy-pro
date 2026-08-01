#!/usr/bin/env node
/**
 * extend-punish-gems — play every gem's refutation OUT until the advantage is
 * actually ON THE BOARD.
 *
 * THE DEFECT (David 2026-08-01: "can you extend the trap lines until the full
 * advantage has played out? Some of the gems stopped short and didn't really
 * explain or show the advantage"). The miner's playout loop is
 * `for (let k = 0; k < 7; k++)` — a FIXED seven plies, despite its comment
 * claiming "best play both sides until the advantage is shown". Nothing in it
 * looks at the board. So 318 of 344 gems are exactly 8 plies long: the line
 * stops wherever the counter ran out, which is routinely mid-recapture — the
 * student is told they won something they never see land.
 *
 * THE TERMINUS (what "played out" means, checked on the board, not counted):
 *   1. QUIET — the side to move is not in check and the engine's best move is
 *      neither a capture nor a check. Nothing is hanging mid-air.
 *   2. SETTLED — that has held for two consecutive plies, so we are not
 *      stopping inside a trade that is still resolving.
 *   3. SHOWN — the student is up real material, or it is mate. An eval alone
 *      is not "shown"; material on the board is what the student can see.
 * Mate ends it immediately. A hard cap bounds the walk.
 *
 * HONESTY RULES (empty > invented, per CLAUDE.md):
 *   - The extension is best-play for BOTH sides. The opponent is never made to
 *     cooperate — if best play dissolves the advantage, that is the truth about
 *     the gem, and we KEEP THE ORIGINAL line rather than ship a longer one that
 *     ends worse. A gem is a weapon; walking it into equality teaches the
 *     opposite of what it claims.
 *   - Every appended move comes from the engine and is chess.js-legal (G3).
 *   - `playLine` is regenerated so the continuity invariant
 *     (playLine === lineMoves + inaccuracy + punishSeq) still holds.
 *
 * Usage:
 *   node scripts/extend-punish-gems.mjs [--dry] [--limit N] [--depth 14]
 *   --dry  report what WOULD change (and why) without writing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

// The masterclass lane by default; `--file` reaches the SEPARATE gambit lane
// (gambit-punish-gems.json), which is never touched by the masterclass path.
const GEMS = process.argv.includes('--file')
  ? process.argv[process.argv.indexOf('--file') + 1]
  : 'src/data/punish-gems.json';
const ENGINE = 'node_modules/stockfish/bin/stockfish-18-lite-single.js';
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const LIMIT = Number(arg('limit', '100000'));
const DEPTH = Number(arg('depth', '14'));
const MAX_EXTRA = Number(arg('maxExtra', '16'));

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function materialDelta(chess, studentChar) {
  let d = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq) continue;
      d += (sq.color === studentChar ? 1 : -1) * (VALUE[sq.type] ?? 0);
    }
  }
  return d;
}

// ── ENGINE ────────────────────────────────────────────────────────────────
function startEngine() {
  const sf = spawn('node', [ENGINE]);
  let buf = '', lastCp = null, lastMate = null, resolve = null;
  sf.stdout.on('data', (d) => {
    buf += d.toString();
    const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const l of lines) {
      const cp = l.match(/score cp (-?\d+)/);
      const mt = l.match(/score mate (-?\d+)/);
      if (cp) { lastCp = Number(cp[1]); lastMate = null; }
      if (mt) { lastMate = Number(mt[1]); lastCp = null; }
      const bm = l.match(/^bestmove (\S+)/);
      if (bm && resolve) {
        const r = { best: bm[1] === '(none)' ? null : bm[1], cp: lastCp, mate: lastMate };
        const f = resolve; resolve = null; lastCp = null; lastMate = null; f(r);
      }
    }
  });
  const send = (s) => sf.stdin.write(`${s}\n`);
  send('uci');
  return {
    eval: (fen) => new Promise((res) => {
      resolve = res;
      send(`position fen ${fen}`);
      send(`go depth ${DEPTH}`);
    }),
    quit: () => { try { sf.kill(); } catch { /* already gone */ } },
  };
}

const applyUci = (chess, uci) => chess.move({
  from: uci.slice(0, 2), to: uci.slice(2, 4),
  promotion: uci.length > 4 ? uci[4] : undefined,
});

// ── MAIN ──────────────────────────────────────────────────────────────────
const gems = JSON.parse(readFileSync(GEMS, 'utf8'));
const list = Array.isArray(gems) ? gems : gems.gems;
const eng = startEngine();
await new Promise((r) => setTimeout(r, 2000)); // uci handshake

const report = { extended: 0, alreadyShown: 0, keptOriginal: 0, illegal: 0, addedPlies: 0 };
const examples = [];

for (const gem of list.slice(0, LIMIT)) {
  const sans = gem.playLine.split(/\s+/).filter(Boolean);
  const c = new Chess();
  let ok = true;
  for (const s of sans) { try { c.move(s); } catch { ok = false; break; } }
  if (!ok) { report.illegal += 1; continue; }

  // The student is the side that PLAYED the punish — i.e. the side to move at
  // the inaccuracy. playLine = lineMoves + inaccuracy + punishSeq, so the
  // punish is at index lineMoves.length + 1; its mover is the student.
  const lineLen = gem.lineMoves.split(/\s+/).filter(Boolean).length;
  const studentChar = (lineLen + 1) % 2 === 0 ? 'w' : 'b';

  const startMat = materialDelta(c, studentChar);
  const added = [];
  let quietRun = 0;
  let terminus = 'cap';

  for (let k = 0; k < MAX_EXTRA; k += 1) {
    if (c.isGameOver()) { terminus = 'gameover'; break; }
    const e = await eng.eval(c.fen());
    if (!e.best) { terminus = 'nobest'; break; }

    // Is THIS position already the terminus? Quiet + settled + shown.
    const inCheck = c.inCheck();
    let forcing = false;
    try {
      const probe = new Chess(c.fen());
      const mv = applyUci(probe, e.best);
      forcing = !!mv.captured || probe.inCheck();
    } catch { forcing = false; }
    const mat = materialDelta(c, studentChar);
    const quiet = !inCheck && !forcing;
    quietRun = quiet ? quietRun + 1 : 0;
    const shown = mat >= 1;
    if (quietRun >= 2 && shown) { terminus = 'shown'; break; }

    let mv;
    try { mv = applyUci(c, e.best); } catch { terminus = 'illegal'; break; }
    added.push(mv.san);
    if (c.isCheckmate()) { terminus = 'mate'; break; }
  }

  const endMat = materialDelta(c, studentChar);
  // NEVER ship a longer line that ends worse than the one we had. Best play
  // dissolving the edge is the truth about the gem, not a reason to hide it —
  // but the shipped weapon stays the shorter, honest one.
  if (added.length === 0) { report.alreadyShown += 1; continue; }
  if (endMat < startMat) {
    report.keptOriginal += 1;
    examples.push({ id: `${gem.openingId}:${gem.inaccuracy}`, why: `advantage fell ${startMat}→${endMat}, kept original` });
    continue;
  }

  report.extended += 1;
  report.addedPlies += added.length;
  if (examples.length < 8) {
    examples.push({
      id: `${gem.openingId}:${gem.inaccuracy}`,
      why: `+${added.length} plies → ${terminus}, material ${startMat}→${endMat}`,
      tail: added.join(' '),
    });
  }
  if (!DRY) {
    gem.punishSeq = [...gem.punishSeq, ...added];
    gem.playLine = `${gem.lineMoves} ${gem.inaccuracy} ${gem.punishSeq.join(' ')}`;
    gem.demonstrationPlies = added.length; // authored narration covers the rest
  }
}

eng.quit();

console.log(`\n── extend-punish-gems ${DRY ? '(DRY)' : ''} ──`);
console.log(`  extended            : ${report.extended}`);
console.log(`  already showed it   : ${report.alreadyShown}`);
console.log(`  kept original (fell): ${report.keptOriginal}`);
console.log(`  illegal playLine    : ${report.illegal}`);
console.log(`  mean plies added    : ${report.extended ? (report.addedPlies / report.extended).toFixed(1) : 0}`);
console.log('\n  examples:');
for (const e of examples) console.log(`   • ${e.id} — ${e.why}${e.tail ? `\n       ${e.tail}` : ''}`);

if (!DRY) {
  writeFileSync(GEMS, `${JSON.stringify(gems, null, 2)}\n`);
  console.log(`\n  wrote ${GEMS}`);
}
