import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { capabilityPliesFromAnnotations } from './autoAnalyzeGame';
import { capabilityOutcomes } from './capabilityEvidence';
import { mateEvalFor } from './engineConstants';
import type { MoveAnnotation } from '../types';

// THE REASON, BOTH WAYS (2026-10-17): on a flagged ply that kept the best line
// and the played line, the reason the best move was better is posed for the
// record — here a mate in one the student did not play.
describe('capabilityPliesFromAnnotations — the decisive reason is posed', () => {
  const c = new Chess();
  const fens = [c.fen()];
  for (const san of ['f3', 'e5', 'g4', 'd6']) { c.move(san); fens.push(c.fen()); }
  const ann = (moveNumber: number, color: 'white' | 'black', san: string, extra: Partial<MoveAnnotation> = {}): MoveAnnotation => ({
    moveNumber, color, san, evaluation: 0, bestMove: null, bestMoveEval: null, classification: 'good', comment: null, ...extra,
  } as MoveAnnotation);

  it('a missed mate in one poses missed-tactic on that ply', () => {
    const annotations = [
      ann(1, 'white', 'f3'), ann(1, 'black', 'e5'), ann(2, 'white', 'g4'),
      ann(2, 'black', 'd6', { classification: 'inaccuracy', evaluation: 80, bestMove: 'd8h4', bestMoveEval: mateEvalFor(-1), pv: { afterBest: [], afterPlayed: ['f1g2'] } }),
    ];
    const ply = capabilityPliesFromAnnotations(annotations, 'black', fens).find((p) => p.playedSan === 'd6');
    expect(ply?.alsoPosed?.some((p) => p.tag === 'missed-tactic')).toBe(true);
  });

  // WHAT THIS BOARD ASKED, WHATEVER THE MOVE COST (2026-10-22): a costly ply
  // rode without the position's questions, so a missed shot could break its
  // skill as an inaccuracy and never as a blunder — the population refit read
  // "your fork" as held 100% at every rating.
  it('the same missed mate as a BLUNDER is posed, and breaks the shot it was', () => {
    const annotations = [
      ann(1, 'white', 'f3'), ann(1, 'black', 'e5'), ann(2, 'white', 'g4'),
      ann(2, 'black', 'd6', { classification: 'blunder', evaluation: 80, bestMove: 'd8h4', bestMoveEval: mateEvalFor(-1), pv: { afterBest: [], afterPlayed: ['f1g2'] } }),
    ];
    const ply = capabilityPliesFromAnnotations(annotations, 'black', fens).find((p) => p.playedSan === 'd6');
    expect(ply?.alsoPosed?.some((p) => p.tag === 'missed-tactic')).toBe(true);
    if (!ply) return;
    const out = capabilityOutcomes({
      fenBefore: ply.fenBefore, playedSan: ply.playedSan, moverColor: 'black', cpLoss: ply.cpLoss,
      ...(ply.alsoPosed ? { alsoPosed: ply.alsoPosed } : {}), ...(ply.bestSan ? { bestSan: ply.bestSan } : {}), ...(ply.historySans ? { historySans: ply.historySans } : {}),
    });
    expect(out).toContainEqual(expect.objectContaining({ tag: 'missed-your-mate', outcome: 'broken' }));
  });

  it('a ply with no kept lines poses no reason (negative control)', () => {
    const annotations = [ann(1, 'white', 'f3'), ann(1, 'black', 'e5'), ann(2, 'white', 'g4'), ann(2, 'black', 'd6', { classification: 'inaccuracy', evaluation: 80, bestMove: 'd8h4', bestMoveEval: mateEvalFor(-1) })];
    const ply = capabilityPliesFromAnnotations(annotations, 'black', fens).find((p) => p.playedSan === 'd6');
    expect(ply?.alsoPosed?.some((p) => p.tag === 'missed-tactic') ?? false).toBe(false);
  });
});
