// THE STUDENT'S OWN MOVE HAS A WHY (re-walk 1380, 2026-09-25). Two causes of
// silence, both fixed at the root:
//  1. a BOOK move is never graded (cpLoss null) and the principle lane wanted a
//     graded clean move — so 1.e4, 2.Nf3, 3.d4 said nothing. `inBook` is now a
//     required field and theory counts as clean.
//  2. a principle spoke once a game and then went silent — Bc4, Be3 and every
//     later developing move had nothing. Now: full the first time, a short stem
//     after (`principleLine`), the shape the negative side already had.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computePositionFacts } from './positionFacts';
import { principleLine, computeMoveFundamentals } from './moveFundamentals';

const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
const flat = { topLines: [line(1, 30), line(2, 20), line(3, 10)], evaluation: 30, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 400, draw: 450, loss: 150 } };

async function ruleAt(sans: string[], i: number, taught: Set<string>, inBook: boolean, cpLoss: number | null) {
  const c = new Chess();
  for (const s of sans.slice(0, i)) c.move(s);
  const fenBefore = c.fen(); c.move(sans[i]); const mid = c.fen(); c.move(sans[i + 1]);
  const r = await computePositionFacts({ posture: 'walk', fen: c.fen(), moverColor: 'w', studentColor: 'w', analysis: flat,
    opponentLastMove: { fenBefore: mid, san: sans[i + 1] },
    lastMove: { fenBefore, san: sans[i], cpLoss, inBook, reads: null }, taughtPrinciples: taught } as never);
  return r.clauses.find((x) => x.kind === 'rule')?.text ?? null;
}

const PHILIDOR = 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O'.split(' ');

describe('the student\'s own move has a why', () => {
  it('a BOOK move (ungraded) teaches its principle', async () => {
    expect(await ruleAt(PHILIDOR, 0, new Set(), true, null)).toMatch(/stake out the center/);
  });
  it('negative control: an ungraded move that is NOT theory stays silent (no grade, no praise)', async () => {
    expect(await ruleAt(PHILIDOR, 0, new Set(), false, null)).toBeNull();
  });
  it('a principle already taught returns as a short stem about THIS move', async () => {
    expect(await ruleAt(PHILIDOR, 10, new Set(['development', 'center']), true, null)).toMatch(/^Bc4 develops into the game/);
  });
  it('a pawn pushed into contact OPENS the center — true after the exchange', async () => {
    expect(await ruleAt(PHILIDOR, 4, new Set(['center', 'development']), true, null)).toBe('d4 opens up the center.');
    // …and a pawn nothing attacks still stakes it out (non-vacuous).
    const start = new Chess().fen();
    expect(computeMoveFundamentals(start, 'e4', 'white')[0].led).toBe('stakes out the center and grabs space');
  });
  it('principleLine: full the first time, a stem after', () => {
    const c = new Chess(); for (const s of PHILIDOR.slice(0, 10)) c.move(s);
    const first = principleLine(c.fen(), 'Bc4', 'white', new Set(), 1);
    const again = principleLine(c.fen(), 'Bc4', 'white', new Set([first?.id ?? '']), 1);
    expect(first?.first).toBe(true);
    expect(again?.first).toBe(false);
    expect(again?.text).toMatch(/^Bc4 /);
  });
});
