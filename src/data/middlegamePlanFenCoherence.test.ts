// FEN Side-to-Move Coherence Gate (David 2026-05-29, locked).
//
// Catches a fast-feedback failure mode hit on the Caro Advance c5
// endgame: I typo'd `b` (Black to move) into a FEN where the
// playable line's first move was a White move. chess.js caught it
// as "illegal move," but the actual root cause (FEN's side-to-move
// field wrong) was opaque. This gate diagnoses it directly:
//
//   "Plan X's FEN says 'w' to move but moves[0] = '<black move>'."
//
// Fast diagnostics + faster pre-merge feedback than chess.js's
// "illegal SAN" error.

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import middlegamePlans from './middlegame-plans.json' assert { type: 'json' };

interface PlanLine {
  fen?: string;
  moves?: string[];
}
interface Plan {
  id: string;
  criticalPositionFen?: string;
  playableLines?: PlanLine[];
}

const PLANS = middlegamePlans as unknown as Plan[];

function expectedSideFromMove(fen: string, san: string): 'w' | 'b' | null {
  try {
    const c = new Chess(fen);
    const move = c.move(san);
    return move?.color === 'w' ? 'w' : move?.color === 'b' ? 'b' : null;
  } catch {
    return null;
  }
}

function fenSide(fen: string): 'w' | 'b' | null {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 2) return null;
  if (parts[1] === 'w') return 'w';
  if (parts[1] === 'b') return 'b';
  return null;
}

describe('middlegame-plan FEN side-to-move coherence gate', () => {
  it('every playableLine FEN side-to-move agrees with the chess.js color of moves[0]', () => {
    const mismatches: string[] = [];
    for (const plan of PLANS) {
      for (const [i, line] of (plan.playableLines ?? []).entries()) {
        if (!line.fen || !line.moves || line.moves.length === 0) continue;
        const side = fenSide(line.fen);
        const expected = expectedSideFromMove(line.fen, line.moves[0]);
        if (side === null) {
          mismatches.push(`${plan.id} line[${i}] :: FEN missing side-to-move field`);
        } else if (expected === null) {
          // chess.js will catch the illegal move elsewhere; this gate
          // only diagnoses side mismatches.
          continue;
        } else if (side !== expected) {
          const sideLabel = side === 'w' ? 'White' : 'Black';
          const expectedLabel = expected === 'w' ? 'White' : 'Black';
          mismatches.push(
            `${plan.id} line[${i}] :: FEN says '${side}' (${sideLabel} to move) but moves[0]='${line.moves[0]}' is a ${expectedLabel} move. Flip the FEN's side-to-move field.`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
