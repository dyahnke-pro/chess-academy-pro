import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  seeGain,
  findHangingBySee,
  findPawnBreaks,
  findPieceQuality,
  samplePositionsFromGame,
  buildReadingQuestions,
  gradeReadingAnswerDeterministic,
} from './positionReadingService';
import type { TacticsLiveContext } from '../coach/types';

describe('seeGain (static exchange evaluation)', () => {
  it('flags a defended piece that loses the exchange to a cheaper attacker (the "iff" case)', () => {
    // White queen d5, defended by pawn e4, attacked by black knight f6.
    const c = new Chess('4k3/8/5n2/3Q4/4P3/8/8/4K3 w - - 0 1');
    expect(seeGain(c, 'd5')).toBe(6); // NxQ, pxN → Black +6, the queen hangs despite the defender
  });

  it('returns 0 for an unattacked piece', () => {
    const c = new Chess('4k3/8/8/8/8/5N2/8/4K3 w - - 0 1');
    expect(seeGain(c, 'f3')).toBe(0);
  });

  it('flags a knight attacked by a pawn even when defended (pawn-for-knight wins)', () => {
    const c = new Chess('4k3/8/3p4/4N3/3P4/8/8/4K3 w - - 0 1');
    expect(seeGain(c, 'e5')).toBe(2);
  });

  it('does not flag an adequately defended piece attacked by an equal-or-greater piece', () => {
    // White knight e5 defended by a pawn d4, attacked only by a black rook e8
    // (rook-for-knight LOSES material for Black) → not hanging.
    const c = new Chess('4r3/8/8/4N3/3P4/8/8/4K2k b - - 0 1');
    expect(seeGain(c, 'e5')).toBeLessThanOrEqual(0);
  });
});

describe('findHangingBySee', () => {
  it('lists the hanging piece with its gain, biggest first', () => {
    const hanging = findHangingBySee('4k3/8/5n2/3Q4/4P3/8/8/4K3 w - - 0 1');
    const q = hanging.find((h) => h.square === 'd5');
    expect(q).toBeDefined();
    expect(q?.piece).toBe('q');
    expect(q?.gain).toBe(6);
  });

  it('returns [] on a quiet position with nothing winnable', () => {
    expect(findHangingBySee('4k3/8/8/8/8/8/8/4K3 w - - 0 1')).toEqual([]);
  });

  it('returns [] on an invalid FEN', () => {
    expect(findHangingBySee('not a fen')).toEqual([]);
  });
});

describe('findPawnBreaks', () => {
  it('finds a pawn push that makes contact with an enemy pawn', () => {
    // White c-pawn on c4 can push c4-c5? No — pick d4 vs black c5/e5: white pawn d4,
    // black pawns c5 and e5 → d4 is already in contact; instead test a real lever:
    // White pawn e4, black pawn d5 → exd5 (capture of a pawn = a break) is listed.
    const breaks = findPawnBreaks('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1');
    expect(breaks).toContain('d5'); // exd5 captures the black pawn
  });

  it('returns [] when no pawn lever exists', () => {
    expect(findPawnBreaks('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1')).toEqual([]);
  });
});

describe('findPieceQuality', () => {
  it('flags a knight outpost (enemy half, pawn-defended, unchallengeable)', () => {
    const notes = findPieceQuality('4k3/8/8/3N4/4P3/8/8/4K3 w - - 0 1');
    const outpost = notes.find((n) => n.square === 'd5');
    expect(outpost?.quality).toBe('good');
    expect(outpost?.reason).toContain('outpost');
  });

  it('does NOT flag a knight as an outpost when an enemy pawn can challenge it', () => {
    // Black c-pawn on c6 can play …c6-? no — put a black pawn on c7 that can advance to c6 and hit d5.
    const notes = findPieceQuality('4k3/2p5/8/3N4/4P3/8/8/4K3 w - - 0 1');
    expect(notes.find((n) => n.square === 'd5' && n.reason.includes('outpost'))).toBeUndefined();
  });

  it('flags a bad bishop hemmed in by ≥4 of its own pawns on its colour', () => {
    const notes = findPieceQuality('4k3/8/8/8/4P3/8/P1P1B1P1/4K3 w - - 0 1');
    const bishop = notes.find((n) => n.square === 'e2');
    expect(bishop?.quality).toBe('bad');
    expect(bishop?.reason).toContain('bishop');
  });

  it('flags a rook on an open file', () => {
    const notes = findPieceQuality('4k3/8/8/8/8/8/8/3RK3 w - - 0 1');
    const rook = notes.find((n) => n.square === 'd1');
    expect(rook?.quality).toBe('good');
    expect(rook?.reason).toContain('open');
  });

  it('returns [] on an invalid FEN', () => {
    expect(findPieceQuality('garbage')).toEqual([]);
  });
});

describe('samplePositionsFromGame', () => {
  const SCHOLAR = '1. e4 e5 2. Qh5 Nc6 3. Bc4 g6 4. Qf3 Nf6 5. Qb3 Nd4 6. Bxf7+ Ke7 7. Qc4 b5 8. Qd3 Nxe4';

  it('samples middlegame FENs from a PGN (positions before each ply)', () => {
    const positions = samplePositionsFromGame(SCHOLAR, { count: 3, minPly: 6, maxPly: 16 });
    expect(positions.length).toBeGreaterThan(0);
    for (const p of positions) {
      expect(() => new Chess(p.fen)).not.toThrow();
      expect(p.ply).toBeGreaterThanOrEqual(6);
    }
  });

  it('returns [] for a too-short game', () => {
    expect(samplePositionsFromGame('1. e4 e5', { minPly: 12 })).toEqual([]);
  });

  it('returns [] for an unparseable PGN', () => {
    expect(samplePositionsFromGame('1. zz9 qq8')).toEqual([]);
  });
});

// ── Question builder + grader ───────────────────────────────────────────────

function emptyTactics(overrides: Partial<TacticsLiveContext> = {}): TacticsLiveContext {
  return {
    immediate: [],
    hanging: [],
    threats: [],
    opportunities: [],
    lookaheadDepth: 4,
    boardFacts: {
      sideToMove: 'white',
      whiteKing: 'e1',
      blackKing: 'e8',
      inCheck: null,
      mateInOne: null,
      whitePieces: '',
      blackPieces: '',
      attackMap: [],
      material: 'Material is even',
    },
    ...overrides,
  };
}

describe('buildReadingQuestions', () => {
  it('always asks a material question grounded in the computed balance', () => {
    const qs = buildReadingQuestions('4k3/8/8/8/8/8/8/4K3 w - - 0 1', emptyTactics());
    const mat = qs.find((q) => q.type === 'material');
    expect(mat).toBeDefined();
    expect(mat?.answer).toBe('Material is even');
    expect(mat?.acceptTokens).toContain('even');
  });

  it('asks a mate question when mateInOne is set, with the move as an accept token', () => {
    const t = emptyTactics({
      boardFacts: { ...emptyTactics().boardFacts!, mateInOne: 'Qf7#' },
    });
    const qs = buildReadingQuestions('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2', t);
    const mate = qs.find((q) => q.type === 'mate');
    expect(mate).toBeDefined();
    expect(mate?.acceptTokens).toContain('qf7#');
  });

  it('builds a SEE-grounded hanging question naming the real square', () => {
    const fen = '4k3/8/5n2/3Q4/4P3/8/8/4K3 w - - 0 1';
    const qs = buildReadingQuestions(fen, emptyTactics());
    const hang = qs.find((q) => q.type === 'hanging');
    expect(hang?.negative).toBe(false);
    expect(hang?.acceptTokens).toContain('d5');
  });

  it('makes the hanging question NEGATIVE when nothing is winnable', () => {
    const qs = buildReadingQuestions('4k3/8/8/8/8/8/8/4K3 w - - 0 1', emptyTactics());
    const hang = qs.find((q) => q.type === 'hanging');
    expect(hang?.negative).toBe(true);
  });
});

describe('gradeReadingAnswerDeterministic', () => {
  const hangingQ = {
    id: 'hanging', type: 'hanging' as const,
    prompt: 'Is anything hanging?', answer: 'Yes — the queen on d5 is hanging.',
    acceptTokens: ['d5', 'queen', 'hanging', 'yes'], negative: false,
  };

  it('marks a correct read when the student names the square', () => {
    const g = gradeReadingAnswerDeterministic(hangingQ, 'the queen on d5 is hanging to the knight');
    expect(g.verdict).toBe('correct');
  });

  it('marks wrong when the student says nothing on a live position, and surfaces the answer', () => {
    const g = gradeReadingAnswerDeterministic(hangingQ, 'nothing, looks safe to me');
    expect(g.verdict).toBe('wrong');
    expect(g.correctAnswer).toContain('d5');
  });

  it('marks partial when on-topic but nothing concrete is named', () => {
    const g = gradeReadingAnswerDeterministic(hangingQ, 'I think one of the pieces might be loose');
    expect(g.verdict).toBe('partial');
  });

  it('rewards "nothing" on a negative question', () => {
    const negQ = { ...hangingQ, answer: 'No — nothing is hanging.', acceptTokens: [], negative: true };
    expect(gradeReadingAnswerDeterministic(negQ, 'nothing, everything is defended').verdict).toBe('correct');
    expect(gradeReadingAnswerDeterministic(negQ, 'the rook on a1').verdict).toBe('wrong');
  });
});
