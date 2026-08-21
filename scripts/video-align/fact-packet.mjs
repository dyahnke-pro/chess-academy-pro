#!/usr/bin/env node
/**
 * fact-packet — the deterministic facts at each ply of a line, so a note is
 * COMPUTED FIRST and only then phrased (CLAUDE.md G0.1).
 *
 * David 2026-08-21: *"the same goes for you… have access to the same
 * deterministic computations so you fully understand the mathematical
 * complexities and then phrase them in his teaching style."*
 *
 * The rule binds the runtime model and Claude identically. The model gets its
 * facts in a packet; before this existed, Claude got them by looking at the
 * board and reaching for something plausible — which is the same failure with a
 * slower author. This prints, per ply:
 *
 *   eval (STUDENT POV — negated from the engine's side-to-move view, always,
 *        because the sign convention is the single commonest error here)
 *   best move, and how much better it is than the rest
 *   THE TEMPTING MOVE + its refutation — the fact the but-turn needs, and the
 *        one that cannot be authored without inventing a line (G0.1 GAP 1)
 *   the close alternative, if any — the honest-uncertainty signal: hedge only
 *        where this is non-null, state plainly everywhere else
 *
 * Every square in a note must trace to something printed here or to chess.js.
 * If the fact you want is not printed, that is a GAP: say so and it gets
 * computed — never phrase around it.
 *
 * Usage: node scripts/video-align/fact-packet.mjs "e4 c5 c3 Nf6" [depth]
 *        node scripts/video-align/fact-packet.mjs --fen "<fen>" [depth]
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { Chess } from 'chess.js';

const resolveStockfish = () => {
  for (const p of [process.env.STOCKFISH_PATH, '/usr/games/stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish']) {
    if (p && existsSync(p)) return p;
  }
  return null;
};

const BIN = resolveStockfish();
if (!BIN) { console.error('no stockfish — this tool refuses to guess'); process.exit(2); }

/** One engine process, queried sequentially. `multipv` gives the runner-up
 *  lines, which is what makes the tempting move and the uncertainty signal
 *  computable rather than imagined. */
function startEngine(bin, multipv) {
  const sf = spawn(bin);
  let buf = '';
  let lines = new Map();
  let resolver = null;
  sf.stdout.on('data', (d) => {
    buf += d.toString();
    const rows = buf.split('\n'); buf = rows.pop() ?? '';
    for (const l of rows) {
      const pv = l.match(/multipv (\d+)/);
      const cp = l.match(/score cp (-?\d+)/);
      const mt = l.match(/score mate (-?\d+)/);
      const mv = l.match(/ pv (\S+)/);
      if (pv && mv) {
        const n = Number(pv[1]);
        const score = mt ? (Number(mt[1]) > 0 ? 100000 : -100000) : cp ? Number(cp[1]) : null;
        if (score !== null) lines.set(n, { cp: score, uci: mv[1], mate: mt ? Number(mt[1]) : null });
      }
      if (/^bestmove /.test(l) && resolver) { const r = resolver; resolver = null; r([...lines.entries()].sort((a,b)=>a[0]-b[0]).map(([,v])=>v)); }
    }
  });
  sf.stdin.write(`uci\nsetoption name MultiPV value ${multipv}\nisready\n`);
  return {
    eval: (fen, depth) => new Promise((res) => {
      lines = new Map(); resolver = res;
      sf.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
    }),
    quit: () => { try { sf.stdin.write('quit\n'); sf.kill(); } catch { /* already gone */ } },
  };
}

const args = process.argv.slice(2);
const fenMode = args[0] === '--fen';
const input = fenMode ? args[1] : args[0];
const depth = Number((fenMode ? args[2] : args[1]) ?? 16);
if (!input) { console.error('usage: fact-packet.mjs "<san line>" [depth] | --fen "<fen>" [depth]'); process.exit(2); }

const eng = startEngine(BIN, 4);
const uciToSan = (fen, uci) => {
  const g = new Chess(fen);
  const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return m ? m.san : uci;
};
/** The engine reports from the SIDE TO MOVE's view. The student POV flip is the
 *  error this project has made repeatedly, so it happens in exactly one place. */
const studentCp = (cp, sideToMove, student) => (sideToMove === student ? cp : -cp);

const positions = [];
if (fenMode) {
  positions.push({ label: '(given fen)', fen: input, san: null });
} else {
  const g = new Chess();
  positions.push({ label: 'start', fen: g.fen(), san: null });
  for (const san of input.split(/\s+/).filter(Boolean)) {
    const m = g.move(san);
    if (!m) { console.error(`illegal move: ${san}`); process.exit(2); }
    positions.push({ label: `${m.color === 'w' ? 'W' : 'B'} ${m.san}`, fen: g.fen(), san: m.san });
  }
}

for (const [i, pos] of positions.entries()) {
  const stm = pos.fen.split(' ')[1] === 'w' ? 'white' : 'black';
  const pv = await eng.eval(pos.fen, depth);
  if (!pv.length) { console.log(`${String(i).padStart(2)} ${pos.label}  (no engine lines — terminal?)`); continue; }
  const best = pv[0];
  const bestSan = uciToSan(pos.fen, best.uci);
  const bestStudent = studentCp(best.cp, stm, stm); // best is always from stm's own view
  const rest = pv.slice(1).map((c) => ({ ...c, san: uciToSan(pos.fen, c.uci), drop: bestStudent - studentCp(c.cp, stm, stm) }));

  // TEMPTING = the highest-appeal move that is clearly inferior. Appeal is what
  // draws a human eye — a capture, a check, a promotion, a central knight or
  // bishop — mirroring tacticalRead.appealScore so hand-written and computed
  // notes pick the same move.
  const appeal = (san) => {
    let s = 0;
    if (san.includes('#')) return 100;
    if (san.includes('x')) s += 5;
    if (san.includes('+')) s += 4;
    if (san.includes('=')) s += 6;
    if (/^[NB][a-h]?[cdef][3456]$/.test(san)) s += 2;
    return s;
  };
  const tempting = rest.filter((c) => c.drop >= 120).sort((a, b) => appeal(b.san) - appeal(a.san) || a.drop - b.drop)[0];
  const close = rest.filter((c) => c.drop > 0 && c.drop <= 40).sort((a, b) => a.drop - b.drop)[0];

  const evalTxt = Math.abs(best.cp) >= 100000
    ? `MATE in ${Math.abs(best.mate ?? 0)} for ${stm}`
    : `${bestStudent > 0 ? '+' : ''}${(bestStudent / 100).toFixed(2)} (${stm} to move, ${stm} POV)`;
  console.log(`\n${String(i).padStart(2)} ${pos.label}`);
  console.log(`   fen      ${pos.fen}`);
  console.log(`   eval     ${evalTxt}`);
  console.log(`   best     ${bestSan}`);
  if (tempting) {
    const g = new Chess(pos.fen); g.move(tempting.san);
    const refPv = await eng.eval(g.fen(), Math.max(12, depth - 4));
    const refSan = refPv.length ? uciToSan(g.fen(), refPv[0].uci) : '(none)';
    console.log(`   TEMPTING ${tempting.san}  (−${(tempting.drop / 100).toFixed(2)}) → refuted by ${refSan}`);
  } else {
    console.log(`   TEMPTING (none clearly inferior — NO but-turn is available here)`);
  }
  console.log(`   close    ${close ? `${close.san} within ${close.drop}cp — genuinely murky, hedging is honest here` : 'none — state the verdict plainly, do NOT hedge'}`);
}
eng.quit();
