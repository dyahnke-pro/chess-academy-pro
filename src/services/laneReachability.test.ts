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
import { pieceQualityLines } from './pieceValueRead';
import { buildPlayCommentary } from './playCommentary';
import { buildTacticsLiveContext } from './liveTacticsContext';
import { backwardLook } from './backwardLook';
import { callInaccuracy } from './inaccuracyCall';
import { buildVoicePackage, type VoiceFactKind } from './voicePackage';
import { Chess } from 'chess.js';
import { withOneSearch } from '../test/oneSearchScores';

describe('no dead lanes — every lane can fire', () => {
  it('piece quality — their best / your worst', () => {
    // The worst piece is read off a BOARD — the table proves the one finder's
    // piece (WO-DEPTH-01, 2026-11-08). David's game chesscom-1015773958 after
    // 15…O-O: the bishop on d2 is hemmed in behind its own pawns, and the
    // table scores it well under its kind.
    const board = 'r4rk1/pp3pbp/1q1p1np1/2p1p3/4PP2/2PP2P1/PP1BK2P/R4B1R w - - 1 16';
    const out = pieceQualityLines([
      { square: 'd2', piece: 'B', color: 'w', value: 1.0 },
      { square: 'g7', piece: 'b', color: 'b', value: -4.5 },
    ], 'white', undefined, { fen: board });
    expect(out.length, 'piece-quality lane produced nothing on a real board').toBeGreaterThan(0);
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
    const look = backwardLook(withOneSearch({ priorMove: null, replySan: null,
      fenBefore: before, fenAfter: board.fen(), playedSan: 'Bxd1', bestSan: 'dxe5',
      bestPvUci: ['d6e5', 'g1f3', 'b8c6', 'd2d4'], cpLoss: 400, studentColor: 'black', allowedMate: 2,
    }));
    expect(look, 'backwardLook silent on a queen-grab blunder that allows mate').not.toBeNull();
  });

  it('the inaccuracy callout — coach side', () => {
    const call = callInaccuracy(withOneSearch({ namesBetterMove: true, priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: new Chess().fen(), playedSan: 'a3', bestSan: 'e4',
      bestLineUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6'], cpLoss: 150,
      side: 'coach', moverColor: 'white',
    }));
    expect(call, 'coach never owns its own 150cp mistake').not.toBeNull();
  });

  it('EVERY package rank can carry a fact to speech', () => {
    // The package is the last gate every lane passes through. A rank that
    // cannot survive assembly is a lane that can never be heard however well it
    // computes — so each is walked through `buildVoicePackage` itself.
    const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const kinds: VoiceFactKind[] = [
      'note', 'mistake', 'coachMistake', 'drawback', 'plan',
      'threat', 'tactic', 'opening', 'computed', 'observation',
    ];
    for (const kind of kinds) {
      const pkg = buildVoicePackage([{ kind, text: 'The knight on f3 is doing real work here.', fen: FEN }]);
      expect(pkg.spoken, `rank '${kind}' cannot reach speech: ${JSON.stringify(pkg.dropped)}`).not.toBe('');
    }
  });
});
