// Verify candidate pitfalls with Stockfish. studentEval = -rawEval (after the
// student's move it's the opponent to move). Keep a pitfall when
// (correctStudentEval - wrongStudentEval) >= 50cp. Pure analysis, no network.
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const BIN = '/usr/games/stockfish';
const DEPTH = 22;

function engine() {
  const sf = spawn(BIN);
  let buf = '', lastCp = null, resolver = null;
  sf.stdout.on('data', (d) => {
    buf += d.toString(); const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const l of lines) {
      const cp = l.match(/score cp (-?\d+)/), mt = l.match(/score mate (-?\d+)/);
      if (mt) lastCp = parseInt(mt[1], 10) > 0 ? 100000 : -100000; else if (cp) lastCp = parseInt(cp[1], 10);
      const bm = l.match(/^bestmove (\S+)/);
      if (bm && resolver) { const r = resolver; resolver = null; r(lastCp); }
    }
  });
  sf.stdin.write('uci\nisready\n');
  return {
    eval(fen) {
      return new Promise((res) => { lastCp = null; resolver = res; sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`); });
    },
    quit() { try { sf.stdin.write('quit\n'); sf.kill(); } catch { /* ignore */ } },
  };
}

// Each case: { label, setup: SAN[], student: 'b'|'w', moves: SAN[] }.
const CASES = [
  { label: 'Nimzo: Rubinstein release the tension', setup: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3', 'd5', 'Nf3'], student: 'b', moves: ['dxc4', 'c5', 'b6'] },
  { label: 'Nimzo: Classical early Bxc3', setup: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2'], student: 'b', moves: ['Bxc3+', 'O-O', 'd5', 'c5'] },
  { label: 'French: Advance premature ...c4', setup: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'a3'], student: 'b', moves: ['c4', 'Nh6', 'Bd7'] },
  { label: 'French: Tarrasch passive exd5 vs Qxd5', setup: ['e4', 'e6', 'd4', 'd5', 'Nd2', 'c5', 'exd5'], student: 'b', moves: ['exd5', 'Qxd5'] },
  { label: 'KID: classical exd4 release', setup: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O'], student: 'b', moves: ['exd4', 'Nc6', 'Na6'] },
];

const eng = engine();
for (const cs of CASES) {
  const base = new Chess();
  for (const m of cs.setup) base.move(m);
  console.log('\n=== ' + cs.label + '  (' + (cs.student === 'b' ? 'Black' : 'White') + ' to move)');
  const results = [];
  for (const san of cs.moves) {
    const c = new Chess(base.fen());
    let mv; try { mv = c.move(san); } catch { console.log('  ' + san + ' ILLEGAL'); continue; }
    const raw = await eng.eval(c.fen());
    const studentEval = -raw; // opponent to move after student's move
    results.push({ san: mv.san, studentEval });
    console.log('  ' + mv.san.padEnd(7) + ' studentEval ' + (studentEval >= 0 ? '+' : '') + studentEval + 'cp');
  }
  results.sort((a, b) => b.studentEval - a.studentEval);
  if (results.length >= 2) {
    const best = results[0], worst = results[results.length - 1];
    const gap = best.studentEval - worst.studentEval;
    console.log('  → best ' + best.san + ' (' + best.studentEval + ') vs worst ' + worst.san + ' (' + worst.studentEval + ') | gap ' + gap + 'cp ' + (gap >= 50 ? 'KEEP ✓' : 'too small'));
  }
}
eng.quit();
