// B6 + B11 (2026-09-22): the review hands the door and the method beat the
// REAL mover-POV cost of a move — never a bucket keyed off the classification
// label, and never `Math.abs(evaluation - preMoveEval)`, which turned a GAIN
// into a cost. The failure that was live: the student wins material, the eval
// jumps their way, and the forcing-scan beat says "the move you wanted was a
// forcing one, so start there" on the best move of the game.
//
// Negative control: put `Math.abs(...)` back at `realCpLossCp` → the GAIN ply
// grows a method beat and the first test fails.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';

// 1.e4 c5 2.c3 Nf6 3.e5 Nd5 4.d4 cxd4 5.cxd4 Nc6 6.Nc3 — Black to move at ply
// 12. The engine's move is the CAPTURE Nxd4 (c6d4), so the forcing-scan beat is
// armed on this ply; whether it fires must depend on the SIGN of the cost.
const SANS = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6', 'Nf3'];

function inputs(ply12: { preMoveEval: number; evaluation: number; classification: ReviewMoveInput['classification'] }): ReviewMoveInput[] {
  const chess = new Chess();
  return SANS.map((san, i) => {
    chess.move(san);
    const isBlack = i % 2 === 1;
    const here = i === 11;
    return {
      ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: !isBlack,
      classification: here ? ply12.classification : 'book',
      preMoveEval: here ? ply12.preMoveEval : 0,
      evaluation: here ? ply12.evaluation : 0,
      bestMove: here ? 'c6d4' : null,
    } as unknown as ReviewMoveInput;
  });
}

const FORCING_BEAT = /checks and the captures|checks and captures|every check, every capture/i;

describe('review — the cost handed to the door and the method beat is SIGNED, mover-POV', () => {
  it('a move that GAINED three pawns for the student earns NO forcing-scan correction', () => {
    // White-POV +300 → 0 on BLACK's move: Black gained 300. Cost = 0.
    const segs = buildReviewSegments(inputs({ preMoveEval: 300, evaluation: 0, classification: 'good' }), 'black', null, true, 1400, [], undefined, 'this-game');
    const text = segs[11].narration ?? '';
    expect(text).not.toMatch(FORCING_BEAT);
  });

  it('…while the SAME magnitude the other way — a real 300cp loss — still earns it (non-vacuity)', () => {
    // White-POV 0 → +300 on BLACK's move: Black lost 300 with a capture available.
    const segs = buildReviewSegments(inputs({ preMoveEval: 0, evaluation: 300, classification: 'blunder' }), 'black', null, true, 1400, [], undefined, 'this-game');
    const text = segs[11].narration ?? '';
    expect(text).toMatch(FORCING_BEAT);
  });

  it('BLAMES BY STATEMENT: one real cost, no absolute value, no label bucket', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const door = src.slice(src.indexOf('const decision = decide('), src.indexOf('const decision = decide(') + 4000);
    expect(door).toMatch(/cpLossCp: realCpLossCp,[\s\S]*cpLossCp: realCpLossCp,/);
    expect(door).not.toMatch(/Math\.abs\(m\.evaluation - m\.preMoveEval\)/);
    expect(door).not.toMatch(/classification === 'blunder' \? 300/);
  });
});
