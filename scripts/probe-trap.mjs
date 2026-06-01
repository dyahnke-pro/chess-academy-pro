#!/usr/bin/env node
// HAND-CURATION PROBE (David 2026-06-01: "find traps by hand. no more bots").
// NOT the retired auto-miner — this is a READ-ONLY research instrument the human
// drives at ONE position at a time. It prints the amateur-explorer's common
// replies (real game frequencies — a DB query, not a bot) and Stockfish's verdict
// on the best refutation of each (the engine = a verification tool, sanctioned).
// It WRITES NOTHING. You read the table, judge by hand, then author the gem.
//
// Usage:
//   node scripts/probe-trap.mjs "e4 e5 Nc3 Nf6 f4" b      # student=Black, probe White-to-move? no:
//   node scripts/probe-trap.mjs "<SAN line>" <studentChar w|b>
// The line ends at the position where it is the OPPONENT's turn to move (the
// student just moved). The probe shows the opponent's choices there; for each
// it plays the engine's best line for BOTH sides and reports the eval at a quiet
// leaf from the STUDENT's perspective. A real trap = a common opponent move the
// engine refutes into a clear student edge.
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const RATINGS = '1600,1800,2000';
const SPEEDS = 'blitz,rapid,classical';
const SF_DEPTH = 20;
const PLAYOUT = 8; // half-moves of best-play before grading at the quiet leaf

const STOCKFISH = [process.env.STOCKFISH_PATH, '/usr/games/stockfish', '/usr/bin/stockfish']
  .filter(Boolean).find((p) => existsSync(p));
if (!STOCKFISH) { console.error('no stockfish'); process.exit(2); }

function startEngine(bin) {
  const sf = spawn(bin);
  let buf = '', lastCp = null, resolver = null;
  sf.stdout.on('data', (d) => {
    buf += d.toString(); const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const l of lines) {
      const cp = l.match(/score cp (-?\d+)/), mt = l.match(/score mate (-?\d+)/);
      if (mt) lastCp = parseInt(mt[1], 10) > 0 ? 100000 : -100000; else if (cp) lastCp = parseInt(cp[1], 10);
      const bm = l.match(/^bestmove (\S+)/);
      if (bm && resolver) { const r = resolver; resolver = null; r({ cp: lastCp, best: bm[1] === '(none)' ? null : bm[1] }); }
    }
  });
  sf.stdin.write('uci\nisready\n');
  return {
    eval(fen) {
      return new Promise((res) => {
        lastCp = null; resolver = res;
        sf.stdin.write(`position fen ${fen}\ngo depth ${SF_DEPTH}\n`);
        setTimeout(() => { if (resolver === res) { resolver = null; res({ cp: lastCp, best: null }); } }, 25000);
      });
    },
    quit() { try { sf.stdin.write('quit\n'); sf.kill(); } catch { /* ignore */ } },
  };
}
function toUci(sans) { const c = new Chess(); return sans.map((m) => { const mv = c.move(m); return mv.from + mv.to + (mv.promotion ?? ''); }); }
async function explorer(sans) {
  const play = toUci(sans).join(',');
  const r = await fetch(`${PROXY}?source=lichess&play=${play}&ratings=${RATINGS}&speeds=${SPEEDS}`);
  return r.ok ? r.json() : null;
}
const games = (m) => m.white + m.draws + m.black;
function applyUci(c, uci) { return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined }); }

// Grade: from `fen` (student to move), play engine-best for PLAYOUT plies, return
// eval in centipawns from the STUDENT's perspective (+ = student better).
async function gradeStudentEdge(eng, fen, studentChar) {
  const c = new Chess(fen);
  let punishUci = null, punishSan = null;
  for (let i = 0; i < PLAYOUT; i++) {
    const { best } = await eng.eval(c.fen());
    if (!best) break;
    const mv = applyUci(c, best);
    if (i === 0) { punishUci = best; punishSan = mv.san; }
    if (c.isGameOver()) break;
  }
  const { cp } = await eng.eval(c.fen());
  // cp is from side-to-move perspective at the quiet leaf; convert to student.
  const stm = c.turn(); // 'w' | 'b'
  const studentPersp = stm === studentChar ? cp : -cp;
  return { studentCp: studentPersp, punishSan };
}

(async () => {
  const line = (process.argv[2] || '').trim();
  const studentChar = (process.argv[3] || 'w').trim();
  const sans = line.split(/\s+/).filter(Boolean);
  const eng = startEngine(STOCKFISH);
  const c = new Chess();
  for (const m of sans) c.move(m);
  const oppToMove = c.turn();
  console.log(`\nLINE: ${line}`);
  console.log(`FEN:  ${c.fen()}`);
  console.log(`student=${studentChar}  opponent-to-move=${oppToMove}\n`);

  // Baseline: engine eval of the position (best opponent move) from student persp.
  const base = await eng.eval(c.fen());
  const baseStudent = oppToMove === studentChar ? base.cp : -base.cp;
  console.log(`baseline (engine best opp move ${base.best ? new Chess(c.fen()).move({from:base.best.slice(0,2),to:base.best.slice(2,4),promotion:base.best[4]}).san : '?'}): student ${(baseStudent/100).toFixed(2)}\n`);

  const data = await explorer(sans);
  if (!data) { console.error('explorer failed'); eng.quit(); return; }
  const total = games({ white: data.white, draws: data.draws, black: data.black });
  console.log(`total games at node: ${total}\n`);
  console.log('move    freq%   games   studentEdgeAfter  punish');
  console.log('-----   -----   -----   ----------------  ------');
  for (const m of data.moves.slice(0, 10)) {
    const g = games(m);
    const freq = total ? (100 * g / total) : 0;
    const c2 = new Chess(c.fen());
    c2.move(m.san);
    const { studentCp, punishSan } = await gradeStudentEdge(eng, c2.fen(), studentChar);
    const flag = studentCp >= 100 ? '  <== CRUSH' : studentCp >= 50 ? '  <- edge' : '';
    console.log(`${m.san.padEnd(7)} ${freq.toFixed(1).padStart(5)} ${String(g).padStart(7)}   ${(studentCp/100).toFixed(2).padStart(15)}  ${punishSan}${flag}`);
  }
  eng.quit();
})();
