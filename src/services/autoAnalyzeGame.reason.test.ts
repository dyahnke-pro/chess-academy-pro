import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { capabilityPliesFromAnnotations } from './autoAnalyzeGame';
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

  it('a ply with no kept lines poses no reason (negative control)', () => {
    const annotations = [ann(1, 'white', 'f3'), ann(1, 'black', 'e5'), ann(2, 'white', 'g4'), ann(2, 'black', 'd6', { classification: 'inaccuracy', evaluation: 80, bestMove: 'd8h4', bestMoveEval: mateEvalFor(-1) })];
    const ply = capabilityPliesFromAnnotations(annotations, 'black', fens).find((p) => p.playedSan === 'd6');
    expect(ply?.alsoPosed?.some((p) => p.tag === 'missed-tactic') ?? false).toBe(false);
  });
});
