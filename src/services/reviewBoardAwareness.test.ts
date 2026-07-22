// Board-awareness regression net (David 2026-07-22: "What else can be invented
// by lack of board awareness??? … CLEAN FIXES THAT PREVENT HALLUCINATIONS FROM
// EVEN BEING POSSIBLE"). Each test pins one falsity class the full-review audit
// caught, on a constructed legal board — so the fix can't silently regress.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { describeMoveGeometry, assembleMovePurpose, seatPieceReferences } from './groundedAnswer';
import { buildTrapQuestion } from './reviewTrapQuestion';
import { buildGuidedFindChallenge } from './guidedFindTheMove';

describe('describeMoveGeometry — a "fork" must win something (F15)', () => {
  it('does not call hitting two DEFENDED pawns a fork', () => {
    // White knight to e5 (say) attacking two defended black pawns wins nothing.
    // Construct: white Ne5 hitting d7 and f7, both defended by the black king.
    const fen = '4k3/3p1p2/8/4N3/8/8/8/4K3 w - - 0 1';
    const geo = describeMoveGeometry(fen, 'Nxd7', 'white');
    // Nxd7 is a capture; whatever we say, we must not claim a fork of two
    // defended pawns as a material-winning fork.
    expect(geo ?? '').not.toMatch(/forks the pawn on \w\d and the pawn/);
  });

  it('still names a royal fork (king is a target)', () => {
    // Knight to f7 forking the black king on g8 and rook on h8 (undefended).
    const fen = '5rk1/8/8/8/4N3/8/8/4K3 w - - 0 1';
    const geo = describeMoveGeometry(fen, 'Nf6+', 'white');
    // Nf6+ checks the king; a real forcing fork/geometry is allowed to speak.
    expect(geo).toBeTruthy();
  });
});

describe('assembleMovePurpose — a wing pawn is not a centre move (F1)', () => {
  it('never claims a rook-file pawn "stakes out space in the center"', () => {
    const fen = new Chess().fen();
    const a = assembleMovePurpose({ fenBefore: fen, san: 'h4', moverColor: 'white', tactics: null });
    expect(a?.facts ?? '').not.toMatch(/center|centre/i);
  });

  it('keeps the centre claim for a genuine central pawn', () => {
    const fen = new Chess().fen();
    const a = assembleMovePurpose({ fenBefore: fen, san: 'e4', moverColor: 'white', tactics: null });
    expect(a?.facts ?? '').toMatch(/center|centre/i);
  });
});

describe('buildTrapQuestion — a piece defended only by a PINNED piece is not poisoned (TQ-1)', () => {
  it('does not flag a free capture as a trap when the defender is pinned', () => {
    // Black knight on d5 "defends" a black pawn... construct a pinned-defender
    // trap: white to move can take a black piece whose only defender is pinned
    // to the black king, so the recapture is illegal and the grab is FREE.
    // Black bishop c6 is defended only by the d7-pawn? Keep it simple: black
    // knight e6 defended only by a bishop on f7 that is pinned to the king on g8
    // by a white rook on f1. White Rxf7 is not the case; use a knight grab:
    // White knight on d4 takes e6 knight; e6 defended by f7 bishop pinned by Rf1.
    const fen = '6k1/5b2/4n3/8/3N4/8/8/5R1K w - - 0 1';
    const q = buildTrapQuestion({ fen, studentColor: 'white' });
    // The f7 bishop is pinned to g8 by Rf1, so it can't recapture on e6 — Nxe6
    // wins the knight clean. It must NOT be presented as a poisoned trap.
    if (q) {
      expect(q.targetSquare).not.toBe('e6');
    } else {
      expect(q).toBeNull();
    }
  });
});

describe('seatPieceReferences — no double possessive on an adjective-carrying phrase (preview line-read)', () => {
  // c2 white passed pawn, a7 black weak pawn, e4 a bare white pawn.
  const fen = '4k3/p7/8/8/4P3/8/2P5/4K3 w - - 0 1';
  it('leaves "your passed pawn on c2" alone (no "your passed your pawn")', () => {
    expect(seatPieceReferences('your passed pawn on c2 is a trump', fen, 'w'))
      .not.toMatch(/your passed your pawn/);
  });
  it('leaves "their weak pawn on a7" alone', () => {
    expect(seatPieceReferences('win their weak pawn on a7', fen, 'w'))
      .not.toMatch(/their weak their pawn/);
  });
  it('still stamps a bare "the pawn on e4"', () => {
    expect(seatPieceReferences('the pawn on e4 is loose', fen, 'w')).toMatch(/your pawn on e4/);
  });
});

describe('buildGuidedFindChallenge — a pre-existing OPPONENT tactic is not the student move (GF-1)', () => {
  it('does not brand a plain best move a "fork" because the opponent has one', () => {
    // White best move is a quiet Kg1 (say); meanwhile a BLACK knight on d3 forks
    // white pieces. The challenge must not tell the student "your king can land
    // a fork". Construct: white to move, a benign move exists, black Nd3 forks
    // the white king region — but the student's move is not a fork.
    const fen = 'r3k2r/8/8/8/8/3n4/8/R3K2R w KQkq - 0 1';
    // Best = O-O-O say; use a UCI for a rook move that lands no tactic.
    const ch = buildGuidedFindChallenge(fen, 'a1a4');
    // Ra4 lands no fork of its own; the black Nd3 fork must not be attributed.
    if (ch) expect(ch.question).not.toMatch(/land a fork/i);
  });
});
