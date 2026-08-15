// NO DEAD LANES — every narration lane must be able to fire.
//
// This session found five lanes that were computed correctly and reached nobody:
// the gem (an event the coach never produced), the plan (a ref that could never
// match), the mate branch (a guard that nullified its own inputs), the corpus
// tiers below the bake (never asked), and — caught by probing a real position
// minutes before it shipped — the material/positional split, whose threshold
// required a term to be near zero when NNUE never puts one there.
//
// Every one passed its own unit tests. Handed the right inputs each produced the
// right sentence; nothing asserted the inputs ever arrive, or that the condition
// gating them is reachable at all. A threshold that cannot be met is a dead lane
// wearing a condition, and it is invisible to a test that only ever calls the
// function directly with values chosen to satisfy it.
//
// So this gate asks the opposite question of every lane: given a position that
// SHOULD trigger it, does anything come out? It cannot prove a lane fires often
// enough — `computedVoiceAudit` measures that with a real engine — but it fails
// the build the moment a lane becomes structurally unable to speak.
//
// Engine-free and fast, so it can sit in ship-check: every input below is a
// fixture or a chess.js computation, never a search.
import { describe, it, expect } from 'vitest';
import { engineReadLines } from './engineReadNarration';
import { parseEvalTable, pieceQualityLines, parseEvalSplit, evalSplitLine } from './pieceValueRead';
import { buildPlayCommentary } from './playCommentary';
import { buildTacticsLiveContext } from './liveTacticsContext';
import { backwardLook } from './backwardLook';
import { callInaccuracy } from './inaccuracyCall';
import { findLivePunishment } from './gemCrushLines';
import { getAllPunishGems, isSurfaceableGem } from '../data/lessons/punishGems';
import { buildVoicePackage, type VoiceFactKind } from './voicePackage';
import type { StockfishAnalysis } from '../types';
import { Chess } from 'chess.js';

const EVAL_FIXTURE = `
+-------+-------+-------+-------+-------+-------+-------+-------+
|   r   |       |   b   |   q   |   k   |   b   |       |   r   |
| -4.45 |       | -4.21 | -6.22 | -0.00 | -4.15 |       | -4.40 |
+-------+-------+-------+-------+-------+-------+-------+-------+
|   p   |   p   |   p   |   p   |       |   p   |   p   |   p   |
| -0.71 | -0.95 | -1.13 | -0.61 |       | -0.99 | -1.19 | -0.73 |
+-------+-------+-------+-------+-------+-------+-------+-------+
|       |       |   n   |       |       |   n   |       |       |
|       |       | -3.55 |       |       | -3.72 |       |       |
+-------+-------+-------+-------+-------+-------+-------+-------+
|       |       |       |       |   p   |       |       |       |
|       |       |       |       | -1.05 |       |       |       |
+-------+-------+-------+-------+-------+-------+-------+-------+
|       |       |   B   |       |   P   |       |       |       |
|       |       | +3.99 |       | +1.11 |       |       |       |
+-------+-------+-------+-------+-------+-------+-------+-------+
|       |       |       |       |       |   N   |       |       |
|       |       |       |       |       | +3.80 |       |       |
+-------+-------+-------+-------+-------+-------+-------+-------+
|   P   |   P   |   P   |   P   |       |   P   |   P   |   P   |
| +0.57 | +0.91 | +1.11 | +0.59 |       | +0.97 | +1.21 | +0.71 |
+-------+-------+-------+-------+-------+-------+-------+-------+
|   R   |   N   |   B   |   Q   |   K   |       |       |   R   |
| +3.88 | +3.48 | +3.99 | +5.81 | +0.00 |       |       | +4.05 |
+-------+-------+-------+-------+-------+-------+-------+-------+

 NNUE network contributions (White to move)
+------------+------------+------------+------------+
|  7         |  -  2.83   |  -  1.30   |  -  4.13   | <-- this bucket is used
+------------+------------+------------+------------+

Final evaluation       -0.15 (white side)
`;

const analysis = (o: Partial<StockfishAnalysis> = {}): StockfishAnalysis => ({
  bestMove: 'e2e4', evaluation: 0, isMate: false, mateIn: null, depth: 14,
  topLines: [{ rank: 1, evaluation: 0, moves: ['e2e4'], mate: null, wdl: null, seldepth: 20, bound: null }],
  nodesPerSecond: 0, wdl: null, seldepth: 20, nodes: 1, timeMs: 1, hashfull: 1, ...o,
});

describe('no dead lanes — every lane can fire', () => {
  it('engine WDL read', () => {
    const out = engineReadLines(analysis({ wdl: { win: 750, draw: 150, loss: 100 } }), 'white');
    expect(out.length, 'WDL lane produced nothing on a 75% win read').toBeGreaterThan(0);
  });

  it('engine sharpness read', () => {
    const out = engineReadLines(analysis({
      topLines: [
        { rank: 1, evaluation: 300, moves: ['e2e4'], mate: null, wdl: null, seldepth: 20, bound: null },
        { rank: 2, evaluation: 20, moves: ['d2d4'], mate: null, wdl: null, seldepth: 20, bound: null },
      ],
    }), 'white');
    expect(out.some((l) => l.kind === 'sharpness'), 'sharpness lane silent on a 280cp gap').toBe(true);
  });

  it('piece quality — their best / your worst', () => {
    const out = pieceQualityLines(parseEvalTable(EVAL_FIXTURE), 'white');
    expect(out.length, 'piece-quality lane produced nothing on a real eval table').toBeGreaterThan(0);
  });

  it('🔒 material/positional split — the lane that nearly shipped dead', () => {
    // Its first threshold required one term near zero. NNUE never puts one
    // there, so on a position a ROOK up it said nothing. This is the assertion
    // that would have caught it before it reached David.
    const split = parseEvalSplit(EVAL_FIXTURE);
    expect(split, 'the marked NNUE bucket did not parse').not.toBeNull();
    expect(evalSplitLine(split!, 'black', new Set()), 'split lane silent while a rook up').not.toBeNull();
  });

  it('play commentary', () => {
    // Black knight on e5: ATTACKED by Nf3 and defended by nothing. The first
    // fixture here put a knight on e4 and called it loose — nothing on the
    // board attacked e4, so it was merely unattacked, and the detectors were
    // right to say nothing. A reachability gate is only as good as its trigger.
    const out = buildPlayCommentary({
      fen: 'r1bqkbnr/pppp1ppp/8/4n3/8/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
      studentColor: 'white',
    });
    expect(out, 'playCommentary produced nothing on a loose enemy piece').not.toBeNull();
  });

  it('tactics + threat detection', () => {
    const ctx = buildTacticsLiveContext(
      'r1bqkbnr/pppp1ppp/8/4n3/8/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4', null, 'w', 1200,
    );
    expect(ctx.hanging.length + ctx.immediate.length, 'detectors found nothing on a loose piece').toBeGreaterThan(0);
  });

  it('the backward look — mistake lane', () => {
    const board = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5']) board.move(m);
    const before = board.fen();
    board.move('Bxd1');
    const look = backwardLook({
      fenBefore: before, fenAfter: board.fen(), playedSan: 'Bxd1', bestSan: 'dxe5',
      bestPvUci: ['d6e5', 'g1f3', 'b8c6', 'd2d4'], cpLoss: 400, studentColor: 'black', allowedMate: 2,
    });
    expect(look, 'backwardLook silent on a queen-grab blunder that allows mate').not.toBeNull();
  });

  it('the inaccuracy callout — coach side', () => {
    const call = callInaccuracy({
      fenBefore: new Chess().fen(), playedSan: 'a3', bestSan: 'e4',
      bestLineUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6'], cpLoss: 150,
      side: 'coach', moverColor: 'white',
    });
    expect(call, 'coach never owns its own 150cp mistake').not.toBeNull();
  });

  it('the gem lane', () => {
    const gem = getAllPunishGems().filter(isSurfaceableGem)[0];
    expect(gem, 'no surfaceable gems ship at all').toBeTruthy();
    const sans = gem.lineMoves.trim().split(/\s+/).filter(Boolean);
    expect(findLivePunishment(null, [...sans, gem.inaccuracy]), 'gem lookup misses its own line').not.toBeNull();
  });

  it('EVERY package rank can carry a fact to speech', () => {
    // The package is the last gate every lane passes through. A rank that
    // cannot survive assembly is a lane that can never be heard however well it
    // computes — so each is walked through `buildVoicePackage` itself.
    const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const kinds: VoiceFactKind[] = [
      'gem', 'note', 'mistake', 'coachMistake', 'drawback', 'plan',
      'borrowed', 'threat', 'tactic', 'fork', 'opening', 'computed', 'observation',
    ];
    for (const kind of kinds) {
      const pkg = buildVoicePackage([{ kind, text: 'The knight on f3 is doing real work here.', fen: FEN }]);
      expect(pkg.spoken, `rank '${kind}' cannot reach speech: ${JSON.stringify(pkg.dropped)}`).not.toBe('');
    }
  });
});
