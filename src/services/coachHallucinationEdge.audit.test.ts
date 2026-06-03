/**
 * HALLUCINATION AUDIT — EDGE-CASE BOARD STATES (pass 13)
 * =====================================================
 * The gate has been proven on normal middlegames. Real coaching also covers
 * unusual boards: kings in check, sparse endgames, promotion races, en-passant
 * setups, all-on-one-file pin geometry. A regex/geometry bug could surface
 * only there. Each position gets a TRUE claim (must survive) and a matching
 * FALSE claim (must be caught).
 */
import { describe, it, expect } from 'vitest';
import { validateBoardClaims } from './boardClaimValidator';

interface Case { name: string; fen: string; truths: string[]; lies: string[]; }

const CASES: Case[] = [
  {
    name: 'king in check',
    // White king on e1 in check from a black queen on e7 down the e-file (e-file open).
    fen: '4k3/4q3/8/8/8/8/8/4K3 w - - 0 1',
    truths: ['The queen on e7 checks the king on e1.', 'The king on e1 is in check.', 'The king on e8 is exposed.'],
    lies: ['The rook on e7 delivers the check.', 'The bishop on e1 guards the back rank.'], // e7=queen, e1=king
  },
  {
    name: 'sparse K+P endgame',
    fen: '8/8/8/4k3/8/4P3/4K3/8 w - - 0 1',
    truths: ['The pawn on e3 is defended by the king on e2.', 'The king on e5 blockades.'],
    lies: ['The knight on e3 supports the push.', 'The rook on e2 shields the pawn.'],
  },
  {
    name: 'promotion race',
    fen: '8/P6k/8/8/8/8/6Kp/8 w - - 0 1',
    truths: ['The pawn on a7 is one step from queening.', 'The pawn on h2 threatens to promote.'],
    lies: ['The queen on a7 dominates.', 'The bishop on h2 controls the diagonal.'],
  },
  {
    name: 'en-passant setup (black pawn just pushed to d5)',
    fen: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3',
    truths: ['The pawn on e5 can capture en passant.', 'The pawn on d5 just advanced.'],
    lies: ['The knight on d5 blocks the centre.', 'The pawn on d6 is passed.'],
  },
  {
    name: 'all-on-one-file pin (real)',
    // White rook e1, black knight e5, black king e8 — a real pin down the e-file.
    fen: '4k3/8/8/4n3/8/8/8/4R1K1 w - - 0 1',
    truths: ['The rook on e1 pins the knight on e5 to the king on e8.'],
    lies: ['The rook on e1 pins the knight on e5 to the king on a8.'], // a8 empty + not collinear
  },
];

describe('HALLUCINATION AUDIT pass 13 — edge-case board states', () => {
  for (const c of CASES) {
    it(`${c.name}: true claims survive`, () => {
      for (const t of c.truths) {
        const r = validateBoardClaims(t, c.fen);
        expect(r.ok, `wrongly flagged TRUE: "${t}" :: ${r.violations.map((v) => v.reason).join('; ')}`).toBe(true);
      }
    });
    it(`${c.name}: false claims are caught`, () => {
      for (const l of c.lies) {
        const r = validateBoardClaims(l, c.fen);
        expect(r.ok, `MISSED lie: "${l}"`).toBe(false);
      }
    });
  }

  it('never throws on a malformed or empty FEN (fails open)', () => {
    expect(validateBoardClaims('The knight on f6 is strong.', 'not-a-fen').ok).toBe(true);
    expect(validateBoardClaims('The knight on f6 is strong.', '').ok).toBe(true);
  });
});
