import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { pawnBreak, isPawnBreak } from './pawnBreak';
import { isPawnBreak as planIsPawnBreak } from './computedPlan';
import { readBoard } from './boardComputers';
import { isProof } from './proof';
import { TEACHING_MOVES } from './teachingMoves';
import { FACT_GROUP } from './coachFact';

/** The board after `sans`, and where the last move landed. */
function at(sans: readonly string[]): { fen: string; lastTo: string | null } {
  const c = new Chess();
  let lastTo: string | null = null;
  for (const s of sans) lastTo = c.move(s).to;
  return { fen: c.fen(), lastTo };
}

// The French Advance: …c5 strikes d4, which holds e5 and no pawn holds.
const FRENCH = ['e4', 'e6', 'd4', 'd5', 'e5', 'Ne7', 'Nf3', 'Nf5', 'Bd3', 'Be7', 'O-O'];
// A King's Gambit Declined shape, both kings castled short: the f-pawn can
// take on e5, a pawn that has stood its ground.
const KINGSIDE = 'r1bq1rk1/ppp1bppp/2np1n2/4p3/2B1PP2/2NP1N2/PPP3PP/R1BQ1RK1 w - - 0 7';

describe('pawnBreak — the break and what it is for', () => {
  it('names the base of the chain it strikes and the file the trade opens', () => {
    const { fen, lastTo } = at(FRENCH);
    const r = pawnBreak(fen, 'c5', 'your', lastTo);
    expect(r?.text).toBe('…c5 is a pawn break: it attacks their pawn on d4, the base of the pawn chain, and if they take, it half-opens the c-file for your rooks.');
    expect(r?.squares).toEqual(expect.arrayContaining(['c7', 'c5', 'd4']));
    // The proof is the break and the capture that trades, played from the board.
    expect(r?.proof?.line?.sans).toEqual(['c5', 'dxc5']);
  });

  it('a capture that opens a file beside their castled king says so', () => {
    const r = pawnBreak(KINGSIDE, 'fxe5', 'your', 'e7');
    // The SAN says the capture; the line says it once (captureSaidOnce.gate).
    expect(r?.text).toBe('fxe5 is a pawn break in the centre, and it half-opens the f-file for your rook already on it, toward their king.');
    expect(r?.squares).toContain('e5');
    // The rook's square is on the board, not read out.
    expect(r?.squares).toContain('f1');
  });

  it('a push that strikes a pawn that cannot take back still says what it attacks', () => {
    // e5 is the base of the e5-f6 chain and pinned to its king by the rook on
    // e8, so it cannot take …d6: the break takes nothing, it attacks.
    const r = pawnBreak('4r1k1/3p4/5P2/4P3/8/8/8/4K3 b - - 0 20', 'd6', 'your', null);
    expect(r?.text).toContain('it attacks their pawn on e5, the base of the pawn chain');
  });

  it('their break is said from the student\'s seat', () => {
    const { fen, lastTo } = at(FRENCH);
    expect(pawnBreak(fen, 'c5', 'their', lastTo)?.text).toBe('…c5 is a pawn break: it attacks your pawn on d4, the base of the pawn chain, and if you take, it half-opens the c-file for their rooks.');
  });

  it('is silent where there is no break, or nothing it is for', () => {
    const { fen, lastTo } = at(FRENCH);
    // A pawn move that touches no pawn.
    expect(pawnBreak(fen, 'a6', 'your', lastTo)).toBeNull();
    // Before move 6 the opening's own pawn moves are its story's (the French's …c5 on move 3).
    const early = at(['e4', 'e6', 'd4', 'd5', 'e5']);
    expect(pawnBreak(early.fen, 'c5', 'your', early.lastTo)).toBeNull();
    // A recapture answers their break; it is not one.
    const recap = new Chess(KINGSIDE);
    recap.move('fxe5');
    expect(pawnBreak(recap.fen(), 'dxe5', 'your', 'e5')).toBeNull();
  });

  it('a pawn that takes a piece is a capture, not a break', () => {
    // A white pawn on b5 takes the knight that has stood on c6: it lands
    // touching b7, and still it is a capture of a piece.
    const { fen, lastTo } = at(['e4', 'e5', 'Nf3', 'Nc6', 'c3', 'Nf6', 'd3', 'd6', 'b4', 'Be7', 'b5', 'O-O']);
    expect(isPawnBreak(fen, 'bxc6', lastTo)).toBe(true);
    expect(pawnBreak(fen, 'bxc6', 'your', lastTo)).toBeNull();
  });

  it('names a square only when it is the point, and every square it names is on the board', () => {
    for (const [fen, san, lastTo] of [[at(FRENCH).fen, 'c5', at(FRENCH).lastTo], [KINGSIDE, 'fxe5', 'e7']] as const) {
      const r = pawnBreak(fen, san, 'your', lastTo)!;
      const named = r.text.match(/\b[a-h][1-8]\b/g) ?? [];
      expect(new Set(named).size).toBeLessThanOrEqual(2);
      for (const sq of named) expect(r.squares).toContain(sq);
    }
  });

  it('is the one definition of a break the games\' plans read', () => {
    expect(planIsPawnBreak).toBe(isPawnBreak);
  });

  it('reaches every surface through the one registry, as the S-BREAK teaching move', () => {
    const { fen, lastTo } = at(FRENCH);
    const f = readBoard('pawnBreak', { fenBefore: fen, san: 'c5', student: 'b', lastTo });
    expect(f?.kind).toBe('pawn-break');
    expect(f?.seat).toBe('student');
    expect(f?.namesStudentMove).toBe(false);
    expect(isProof(f!.proof)).toBe(true);
    // Said on the board the move reached.
    const reached = new Chess(fen);
    reached.move('c5');
    expect(f?.fen).toBe(reached.fen());
    expect(readBoard('pawnBreak', { fenBefore: fen, san: 'c5', student: 'w', lastTo })?.seat).toBe('opponent');
    expect(TEACHING_MOVES['pawn-break']).toContain('S-BREAK');
    expect(FACT_GROUP['pawn-break']).toBe('move');
  });
});
