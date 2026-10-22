import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { capabilityPliesFromAnnotations, plyScoringArgs } from './autoAnalyzeGame';
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

// COUNT BOTH (David 2026-10-22, WO-MOTIFS-01 M3d), on the record path. Lichess
// 0Dao0: …Ne5 (the game's move), then Rxh7+ Kxh7 Qh5# — a decoy that sets up a
// mate. fens[0] is a stand-in for the move before; only plies 1 and 2 are read.
describe('capabilityPliesFromAnnotations — the shot is named off its line', () => {
  const START = 'r6k/pp1nq1pp/2p2p2/8/2B1P2R/2P5/PP4PP/3Q2K1 b - - 2 20';
  const before = new Chess(START);
  const ne5 = before.move('Ne5').san;
  const SOLVER = before.fen();
  const ann = (moveNumber: number, color: 'white' | 'black', san: string, extra: Partial<MoveAnnotation> = {}): MoveAnnotation => ({
    moveNumber, color, san, evaluation: 0, bestMove: null, bestMoveEval: null, classification: 'good', comment: null, ...extra,
  } as MoveAnnotation);
  const gameAfter = (sans: string[]): string[] => { const c = new Chess(SOLVER); return [SOLVER, ...sans.map((san) => { c.move(san); return c.fen(); })]; };
  // fens[0] stand-in (white to move), fens[1] the puzzle's start, fens[2] the solver's board.
  const STAND_IN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

  it('a costly ply rides with the engine line FROM the best move, and breaks the mate AND the decoy', () => {
    const fens = [STAND_IN, START, ...gameAfter(['b3'])];
    const annotations = [
      ann(1, 'white', 'Kd1'), ann(1, 'black', ne5),
      ann(2, 'white', 'b3', { classification: 'blunder', evaluation: -200, bestMove: 'h4h7', bestMoveEval: mateEvalFor(2), pv: { afterBest: ['h8h7', 'd1h5'], afterPlayed: ['e5c4'] } }),
    ];
    const ply = capabilityPliesFromAnnotations(annotations, 'white', fens).find((p) => p.playedSan === 'b3');
    expect(ply?.shotLine).toEqual(['h4h7', 'h8h7', 'd1h5']);
    if (!ply) return;
    const broken = capabilityOutcomes(plyScoringArgs(ply, 'white')).filter((o) => o.outcome === 'broken').map((o) => o.tag);
    expect(broken).toEqual(expect.arrayContaining(['missed-your-mate', 'missed-your-deflection']));
  });

  it('a clean ply is named off what the game then did: the decoy found, the mate given', () => {
    const fens = [STAND_IN, START, ...gameAfter(['Rxh7+', 'Kxh7', 'Qh5#'])];
    const annotations = [
      ann(1, 'white', 'Kd1'), ann(1, 'black', ne5), ann(2, 'white', 'Rxh7+'), ann(2, 'black', 'Kxh7'), ann(3, 'white', 'Qh5#'),
    ];
    const ply = capabilityPliesFromAnnotations(annotations, 'white', fens).find((p) => p.playedSan === 'Rxh7+');
    expect(ply?.shotLine).toEqual(['h4h7', 'h8h7', 'd1h5']);
  });
});
