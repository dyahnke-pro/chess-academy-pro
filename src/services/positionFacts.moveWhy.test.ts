// THE STUDENT'S OWN MOVE HAS A WHY (re-walk 1380, 2026-09-25). Two causes of
// silence, both fixed at the root:
//  1. a BOOK move is never graded (cpLoss null) and the principle lane wanted a
//     graded clean move — so 1.e4, 2.Nf3, 3.d4 said nothing. `historySans` (the composer tests it with isBookLine) is now a
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
    lastMove: { fenBefore, san: sans[i], cpLoss, historySans: inBook ? sans.slice(0, i + 1) : null, reads: null }, taughtPrinciples: taught } as never);
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
    expect(await ruleAt(PHILIDOR, 10, new Set(['development', 'center']), false, 0)).toMatch(/^Bc4 develops into the game/);
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

describe('the opening window is the board, not the move number (re-walk 1380, 14.Be3)', () => {
  it('open while a minor is home; closed once developed and castled', async () => {
    const { openingWindowOpen } = await import('./moveFundamentals');
    const c = new Chess();
    for (const s of 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5'.split(' ')) c.move(s);
    // Move 14, ply 27 — past both old caps; the c1 bishop is still home.
    expect(openingWindowOpen(c.fen(), 'white')).toBe(true);
    c.move('Be3');
    // Every white minor out, castled: the opening is over for White.
    expect(openingWindowOpen(c.fen(), 'white')).toBe(false);
  });
});

describe('the queen steps off the file before it opens (re-walk 1380, 11.Qe1)', () => {
  const PRE = 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5'.split(' ');
  it('Qe1 leaves the d-file the queens share, with only the d6 pawn between', () => {
    const c = new Chess(); for (const s of PRE) c.move(s);
    const f = computeMoveFundamentals(c.fen(), 'Qe1', 'white').find((x) => x.id === 'queen-off-file');
    expect(f?.led).toMatch(/off the d-file/);
  });
  it('the Learn composer speaks it on 11.Qe1', async () => {
    expect(await ruleAt([...PRE, 'Qe1', 'Bg4'], 20, new Set(['development', 'center', 'king-safety', 'tempo', 'open-diagonal']), false, 0)).toMatch(/d-file opens with the queens facing/);
  });
  it('negative control: a queen move that stays in line says nothing', () => {
    const c = new Chess(); for (const s of 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6'.split(' ')) c.move(s);
    // Qd3 stays on the d-file with their queen.
    expect(computeMoveFundamentals(c.fen(), 'Qd3', 'white').some((x) => x.id === 'queen-off-file')).toBe(false);
  });
});

describe('past the opening a clean move still has a why (re-walk 1380, 15.Rd1 / 20.g4)', () => {
  it('Rd1 takes the open d-file; g4 goes after the knight on h5', () => {
    const c = new Chess();
    for (const s of 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6'.split(' ')) c.move(s);
    expect(principleLine(c.fen(), 'Rd1', 'white', new Set(), 0)?.text).toBe('Rd1 takes the open d-file, where the rook belongs.');
    for (const s of 'Rd1 Qe8 Nd5 c6 Nc3 Bb4 h3 Bxf3 Rxf3 Rd8'.split(' ')) c.move(s);
    expect(principleLine(c.fen(), 'g4', 'white', new Set(), 0)?.text).toMatch(/^g4 kicks their knight off h5/);
  });
});

describe('middlegame stems: said once, never on a capture, honest about the queen', () => {
  const PRE = 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6'.split(' ');
  const board = (extra: string[]): Chess => { const c = new Chess(); for (const s of [...PRE, ...extra]) c.move(s); return c; };
  it('the same idea is heard once a game', () => {
    const first = principleLine(board([]).fen(), 'Rd1', 'white', new Set(), 0);
    expect(first?.first).toBe(true);
    expect(principleLine(board([]).fen(), 'Rd1', 'white', new Set([first?.id ?? '']), 0)).toBeNull();
  });
  it('a capture is never credited with a file (Rxf3 is a recapture)', () => {
    expect(principleLine(board('Rd1 Qe8 Nd5 c6 Nc3 Bb4 h3 Bxf3'.split(' ')).fen(), 'Rxf3', 'white', new Set(), 0)).toBeNull();
  });
});
