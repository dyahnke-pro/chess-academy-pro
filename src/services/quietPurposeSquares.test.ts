import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { quietPurposePhrase } from './groundedAnswer';

// Prod Learn audit 2026-11-11, ply 44: "Queen to d2 was the move — it would
// reposition the queen to d2, aiming at d4, d5, f4, d3, e3 and f2" (David
// 2026-11-05: "naming a bunch of squares … sounds too robotic").
const BOARDS = [
  '2kr3r/ppp2ppp/2q1p3/8/P5N1/R7/5PP1/2Q2RK1 b - - 7 23',
  '2kr3r/ppp2ppp/4p3/q7/P5N1/R7/5PP1/2Q2RK1 b - - 7 23',
  'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7',
];

describe('a quiet move\'s aim is said like a person, never as a square list', () => {
  it('no reason reads out three squares in a row', () => {
    let read = 0;
    for (const fen of BOARDS) {
      const c = new Chess(fen);
      const color = c.turn() === 'w' ? 'white' : 'black';
      for (const m of c.moves({ verbose: true })) {
        if (m.piece === 'p') continue;
        const t = quietPurposePhrase(fen, m.san, color, 'mover');
        if (!t) continue;
        read += 1;
        expect(t, `${fen} ${m.san}: ${t}`).not.toMatch(/\b[a-h][1-8], [a-h][1-8], [a-h][1-8]\b/);
        expect(t, `${fen} ${m.san}: ${t}`).not.toMatch(/\b[a-h][1-8], [a-h][1-8] and [a-h][1-8]\b/);
      }
    }
    expect(read).toBeGreaterThan(5);
  });
});
