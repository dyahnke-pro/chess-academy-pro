// Gate: every structural board claim in the Openings tab's narration is true
// on the board it is spoken over (2026-10-08). The checker reads isolated,
// doubled, half-open/open files, the bishop pair, pins, castling, material
// counts and "no pawn can chase" squares; narrationBoardClaims.ts says how.
// Zero violations, no baseline: a false claim is fixed in the sentence.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { checkBoardClaims } from './narrationBoardClaims';
import { collectBoardClaimViolations } from './narrationBoardClaims.sources';

describe('narration board claims', () => {
  it('every structural claim in lessons, plans and gems is true on its board', { timeout: 300000 }, () => {
    const rows = collectBoardClaimViolations();
    expect(rows.map((r) => `${r.source} ${r.unit}: "${r.claim}" — ${r.why}`)).toEqual([]);
  });

  // Negative controls: each check must still fire on a board where the claim
  // is false, so a green run cannot come from a checker that stopped reading.
  const start = (moves: string): Chess[] => {
    const c = new Chess();
    for (const m of moves.split(' ')) c.move(m);
    return [c];
  };
  it.each([
    ['e4 e5 Nf3 Nc6 Bb5', 'Bb5 pins the c6-knight'],
    ['d4 Nf6 Bg5', 'Bg5 pins the f6-knight'],
    ['e4 c5 Nf3 d6 d4 cxd4 Nxd4', 'the open c-file'],
    ['e4 e5', 'White has the bishop pair'],
    ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'leaves White with doubled c-pawns'],
    ['e4 e5 Nf3 Nc6', 'Black castles'],
    ['e4 d5 exd5 Qxd5', 'Black is a pawn up'],
    ['d4 d5 c4 e6', 'an isolated d-pawn on d4 — the isolated pawn on d4'],
  ])('flags a false claim: %s / %s', (moves, text) => {
    expect(checkBoardClaims(start(moves), text).length).toBeGreaterThan(0);
  });
  it.each([
    ['e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6', 'leaves Black with doubled c-pawns'],
    ['e4 d5 exd5 Qxd5', 'the half-open d-file'],
    ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'if Black ever castles'],
  ])('passes a true or conditional claim: %s / %s', (moves, text) => {
    expect(checkBoardClaims(start(moves), text)).toEqual([]);
  });
});
