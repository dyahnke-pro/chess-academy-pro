import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  seeGain,
  seeSequence,
  findHangingBySee,
  findPawnBreaks,
  findPieceQuality,
  samplePositionsFromGame,
  findMistakePositions,
  buildReadingQuestions,
  gradeReadingAnswerDeterministic,
  formatReadingFacts,
  findWeakSquares,
  strongestWeakestPiece,
  findWeakPawns,
  findAttackTargets,
  kingSafetyRead,
  developmentRead,
  findPawnGrabs,
} from './positionReadingService';
import type { WeaknessCategory } from '../types';
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

describe('findMistakePositions', () => {
  const PGN = '1. e4 e5 2. Qh5 Nc6 3. Bc4 g6 4. Qf3 Nf6';

  it('returns the position BEFORE a student-side flagged move (fenBefore)', () => {
    const positions = findMistakePositions(
      PGN,
      [{ moveNumber: 2, color: 'white', classification: 'inaccuracy' }],
      'white',
    );
    expect(positions.length).toBe(1);
    expect(positions[0].playedNext).toBe('Qh5');
    // The position before 2.Qh5 is after 1.e4 e5 — White to move.
    expect(new Chess(positions[0].fen).turn()).toBe('w');
  });

  it('ignores flags on the opponent\'s side', () => {
    const positions = findMistakePositions(
      PGN,
      [{ moveNumber: 2, color: 'black', classification: 'blunder' }],
      'white',
    );
    expect(positions).toEqual([]);
  });

  it('returns [] when the student made no flagged moves', () => {
    expect(findMistakePositions(PGN, [{ moveNumber: 3, color: 'white', classification: 'good' }], 'white')).toEqual([]);
  });

  it('returns [] for an unparseable PGN', () => {
    expect(findMistakePositions('1. zz9', [{ moveNumber: 1, color: 'white', classification: 'blunder' }], 'white')).toEqual([]);
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
    id: 'hanging', type: 'hanging' as const, bucket: 'tactics' as const,
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

describe('formatReadingFacts (grounded read-this-position block)', () => {
  it('flags the student\'s own at-risk material as a WARNING (SEE, value-aware)', () => {
    // White (student) queen d5 loses the exchange to the black knight on f6.
    const block = formatReadingFacts('4k3/8/5n2/3Q4/4P3/8/8/4K3 w - - 0 1', 'white');
    expect(block).toContain('MATERIAL AT RISK');
    expect(block).toContain('YOUR material at risk');
    expect(block).toContain('queen on d5');
    // Frames the risk as an EXCHANGE loss, not as "undefended" (the piece may
    // well be defended — the instruction tells the coach to say so).
    expect(block).toContain('loses the exchange');
  });

  it('flags enemy material the student can win as an OPPORTUNITY', () => {
    // Same board read from Black's seat: the d5 queen is now THEIRS to win.
    const block = formatReadingFacts('4k3/8/5n2/3Q4/4P3/8/8/4K3 w - - 0 1', 'black');
    expect(block).toContain('material YOU can win');
    expect(block).toContain('white queen on d5');
  });

  it('names pawn breaks and good/bad pieces when present', () => {
    // White knight outpost on d5 (pawn-supported, unchallengeable) + an e4/d5
    // pawn-break tension.
    const block = formatReadingFacts('4k3/8/8/3N4/4P3/8/8/4K3 w - - 0 1', 'white');
    expect(block).toContain('GOOD PIECES');
    expect(block).toContain('knight outpost');
  });

  it('returns an empty string when there is nothing notable to add', () => {
    expect(formatReadingFacts('4k3/8/8/8/8/8/8/4K3 w - - 0 1', 'white')).toBe('');
  });

  it('returns an empty string on an invalid FEN (never throws)', () => {
    expect(formatReadingFacts('not a fen', 'white')).toBe('');
  });
});

describe('positional computers (David 2026-06-28 — weak squares / piece activity / targets)', () => {
  it('findWeakSquares flags a hole no pawn can guard (black has no c/e pawns → d5 hole)', () => {
    // Black pawns a7 b7 d7 f7 g7 h7 (no c-, no e-pawn) → d5 is unguardable by black.
    const w = findWeakSquares('4k3/pp1p1ppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1');
    expect(w.black).toContain('d5');
  });

  it('findWeakSquares returns nothing absurd on the start position (full pawn shields)', () => {
    const w = findWeakSquares('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(w.white.length).toBe(0);
    expect(w.black.length).toBe(0);
  });

  it('findWeakSquares is safe on a bad FEN', () => {
    expect(findWeakSquares('garbage')).toEqual({ white: [], black: [] });
  });

  it('strongestWeakestPiece ranks by board scope; a rook on an open file beats a boxed-in bishop', () => {
    // White rook d1 (open d-file, wide scope) + bishop a1 hemmed by own b2 pawn.
    const { strongest, weakest } = strongestWeakestPiece('4k3/8/8/8/8/8/1P6/B2RK3 w - - 0 1', 'w');
    expect(strongest).not.toBeNull();
    expect(weakest).not.toBeNull();
    expect(strongest!.scope).toBeGreaterThanOrEqual(weakest!.scope);
    expect(strongest!.piece).toBe('r'); // the rook is the most active
  });

  it('findWeakPawns flags an isolated pawn', () => {
    // White pawns a4 (isolated — no b-pawn) + e2,f2.
    const wp = findWeakPawns('4k3/8/8/8/P7/8/4PP2/4K3 w - - 0 1', 'w');
    expect(wp.isolated).toContain('a4');
  });

  it('findAttackTargets surfaces a loose enemy piece', () => {
    // Black knight e5 is undefended and attacked by the white d4 pawn (dxe5 wins it).
    const t = findAttackTargets('4k3/8/8/4n3/3P4/8/8/4K3 w - - 0 1', 'w');
    expect(t).toContain('e5');
  });
});

describe('buildReadingQuestions — bucket coverage (David 2026-06-28: all buckets grounded)', () => {
  const VALID: WeaknessCategory[] = ['tactics', 'openings', 'opening_weakspots', 'endgame', 'calculation', 'positional', 'time_management'];

  it('tags every question with a valid weakness bucket', () => {
    const qs = buildReadingQuestions('r2qkbnr/ppp2ppp/2np4/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 0 1', emptyTactics({ boardFacts: { ...emptyTactics().boardFacts!, sideToMove: 'black' } }));
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) expect(VALID).toContain(q.bucket);
  });

  it('covers the positional bucket with click-gradable answer squares', () => {
    const qs = buildReadingQuestions('r2qkbnr/ppp2ppp/2np4/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 0 1', emptyTactics({ boardFacts: { ...emptyTactics().boardFacts!, sideToMove: 'black' } }));
    const positional = qs.filter((q) => q.bucket === 'positional');
    expect(positional.length).toBeGreaterThan(0);
    // at least one positional question carries answerSquares for click-to-ID
    expect(positional.some((q) => (q.answerSquares?.length ?? 0) > 0)).toBe(true);
  });

  it('covers the tactics bucket', () => {
    const qs = buildReadingQuestions('4k3/8/5n2/3Q4/4P3/8/8/4K3 w - - 0 1', emptyTactics());
    expect(qs.some((q) => q.bucket === 'tactics')).toBe(true);
  });
})

describe('buildReadingQuestions — calculation bucket (engine eval + PV grounded)', () => {
  it('asks who-is-winning from the engine eval (White winning on a big +eval)', () => {
    const qs = buildReadingQuestions('4k3/8/8/8/8/8/8/4K3 w - - 0 1', emptyTactics(), { evalCp: 600 });
    const win = qs.find((q) => q.type === 'who-is-winning');
    expect(win).toBeDefined();
    expect(win?.bucket).toBe('calculation');
    expect(win?.answer.toLowerCase()).toContain('white');
    expect(win?.acceptTokens).toContain('white');
  });

  it('calls it roughly equal near 0 and Black better on a -eval', () => {
    const eq = buildReadingQuestions('4k3/8/8/8/8/8/8/4K3 w - - 0 1', emptyTactics(), { evalCp: 15 }).find((q) => q.type === 'who-is-winning');
    expect(eq?.acceptTokens).toContain('equal');
    const blk = buildReadingQuestions('4k3/8/8/8/8/8/8/4K3 w - - 0 1', emptyTactics(), { evalCp: -250 }).find((q) => q.type === 'who-is-winning');
    expect(blk?.answer.toLowerCase()).toContain('black');
  });

  it('does NOT ask who-is-winning when no eval is supplied (never a guess)', () => {
    const qs = buildReadingQuestions('4k3/8/8/8/8/8/8/4K3 w - - 0 1', emptyTactics());
    expect(qs.find((q) => q.type === 'who-is-winning')).toBeUndefined();
  });

  it('asks a plan question grounded in the engine PV, with the first move playable', () => {
    const qs = buildReadingQuestions('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', emptyTactics(), { pvSan: ['e4', 'e5', 'Nf3'] });
    const plan = qs.find((q) => q.type === 'plan');
    expect(plan).toBeDefined();
    expect(plan?.answerMoves).toContain('e4');
    expect(plan?.answerSquares).toContain('e4');
  });

  it('tags the plan as the endgame bucket when isEndgame is set', () => {
    const qs = buildReadingQuestions('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', emptyTactics(), { pvSan: ['Kd2'], isEndgame: true });
    const plan = qs.find((q) => q.type === 'plan');
    expect(plan?.bucket).toBe('endgame');
  });
})

describe('king safety + development computers (17-tag buckets)', () => {
  it('kingSafetyRead: a castled king with an intact shield is NOT exposed', () => {
    const ks = kingSafetyRead('4k3/8/8/8/8/8/5PPP/6K1 w - - 0 1', 'w');
    expect(ks?.castled).toBe(true);
    expect(ks?.exposed).toBe(false);
    expect(ks?.shieldPawns).toBe(3);
  });

  it('kingSafetyRead: a king with no pawn shield IS exposed (open files toward it)', () => {
    const ks = kingSafetyRead('4k3/8/8/8/8/8/8/6K1 w - - 0 1', 'w');
    expect(ks?.exposed).toBe(true);
    expect(ks?.openFilesNearKing.length).toBeGreaterThanOrEqual(2);
  });

  it('kingSafetyRead: a king on its home centre square reads as in-center', () => {
    const ks = kingSafetyRead('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w');
    expect(ks?.inCenter).toBe(true);
  });

  it('developmentRead: start position has 0 developed minors of 4', () => {
    const d = developmentRead('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w');
    expect(d?.developedMinors).toBe(0);
    expect(d?.totalMinors).toBe(4);
  });

  it('developmentRead: counts developed minors off their home squares', () => {
    // White Nf3 + Bc4 developed, Nb1 + Bc1 still home → 2 of 4 developed.
    const d = developmentRead('rnbqkbnr/pppp1ppp/8/4p3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', 'w');
    expect(d?.developedMinors).toBe(2);
    expect(d?.totalMinors).toBe(4);
  });
});

describe('buildReadingQuestions — questions carry their misconception tag (1:1 with weakness data)', () => {
  it('tags the hanging question hung-material and the plan question no-plan', () => {
    const hang = buildReadingQuestions('4k3/8/5n2/3Q4/4P3/8/8/4K3 w - - 0 1', emptyTactics()).find((q) => q.type === 'hanging');
    expect(hang?.misconceptionTag).toBe('hung-material');
    const plan = buildReadingQuestions('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', emptyTactics(), { pvSan: ['e4'] }).find((q) => q.type === 'plan');
    expect(plan?.misconceptionTag).toBe('no-plan');
  });

  it('asks a development question tagged neglected-development when minors are home', () => {
    const qs = buildReadingQuestions('rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', emptyTactics());
    const dev = qs.find((q) => q.type === 'development');
    expect(dev?.misconceptionTag).toBe('neglected-development');
  });
})

describe('findPawnGrabs — greedy-pawn-grab grounded by SEE (David 2026-06-28)', () => {
  it('marks a clean free pawn as SAFE to grab', () => {
    // White rook on a1, undefended black pawn on a7 → Rxa7 wins a clean pawn.
    const grabs = findPawnGrabs('4k3/p7/8/8/8/8/8/R3K3 w - - 0 1');
    const a7 = grabs.find((g) => g.square === 'a7');
    expect(a7).toBeDefined();
    expect(a7?.safe).toBe(true);
    expect(a7?.see).toBeGreaterThan(0);
  });

  it('marks a POISONED pawn as unsafe (winning it loses material in the swap)', () => {
    // White queen can take b7 pawn, but it's defended by the a8 rook AND c8
    // bishop → Qxb7 wins a pawn then drops the queen. seeGain ≤ 0.
    const grabs = findPawnGrabs('2b1k3/1p6/8/8/8/1Q6/8/4K3 w - - 0 1');
    const b7 = grabs.find((g) => g.square === 'b7');
    expect(b7).toBeDefined();
    expect(b7?.safe).toBe(false);
    expect(b7?.see).toBeLessThanOrEqual(0);
  });

  it('asks a COUNTING question (not greedy) on a poisoned pawn — calculate the recapture', () => {
    const qs = buildReadingQuestions('2b1k3/1p6/8/8/8/1Q6/8/4K3 w - - 0 1', emptyTactics());
    const counting = qs.find((q) => q.id === 'counting-recapture');
    expect(counting).toBeDefined();
    expect(counting?.misconceptionTag).toBeUndefined(); // counting isn't one of the 17 (yet)
    expect(counting?.answer.toLowerCase()).toContain('loses material');
  });

  it('asks the TRUE greedy-pawn-grab only when the grab is SAFE but the engine prefers another move', () => {
    // White Ra1 can safely take a7 (clean pawn), but pass a PV that prefers a
    // developing/positional move instead → grabbing is greedy.
    const qs = buildReadingQuestions('4k3/p7/8/8/8/8/8/R3K3 w - - 0 1', emptyTactics(), { pvSan: ['Kd2'] });
    const greedy = qs.find((q) => q.misconceptionTag === 'greedy-pawn-grab');
    expect(greedy).toBeDefined();
    expect(greedy?.answer.toLowerCase()).toContain('greedy');
  });
})

describe('seeSequence — the swap-off line to PLAY OUT on the board (tell AND show)', () => {
  it('returns the poisoned-pawn exchange as real legal moves', () => {
    // Qb3 grabs b7, Bc8 takes back → ['Qxb7','Bxb7'].
    const seq = seeSequence('2b1k3/1p6/8/8/8/1Q6/8/4K3 w - - 0 1', 'b7');
    expect(seq[0]).toBe('Qxb7');
    expect(seq[1]).toBe('Bxb7');
  });

  it('returns the clean grab as a single capture (no recapture)', () => {
    const seq = seeSequence('4k3/p7/8/8/8/8/8/R3K3 w - - 0 1', 'a7');
    expect(seq).toEqual(['Rxa7']);
  });

  it('the greedy-grab question carries the demo line', () => {
    const q = buildReadingQuestions('2b1k3/1p6/8/8/8/1Q6/8/4K3 w - - 0 1', emptyTactics()).find((x) => x.id === 'counting-recapture');
    expect(q?.demoLine?.[0]).toBe('Qxb7');
    expect(q?.demoLine?.[1]).toBe('Bxb7');
  });
})

describe('calculation practice — forcing sequence, last move first, plays out (David 2026-06-28)', () => {
  it('asks for the START of a forcing line, reveals the LAST move, and carries the demo', () => {
    // White e4 pawn can take the black queen on d5; black recaptures cxd5 →
    // forcing 2-ply line ['exd5','cxd5'] that nets White ~8 (queen for pawn).
    const qs = buildReadingQuestions('4k3/8/2p5/3q4/4P3/8/8/4K3 w - - 0 1', emptyTactics());
    const calc = qs.find((q) => q.id === 'calculation');
    expect(calc).toBeDefined();
    expect(calc?.bucket).toBe('calculation');
    expect(calc?.demoLine && calc.demoLine.length).toBeGreaterThanOrEqual(2);
    // the prompt reveals the LAST move of the line
    expect(calc?.prompt).toContain(calc!.demoLine![calc!.demoLine!.length - 1]);
    // the answer/start move is the first of the line
    expect(calc?.answerMoves?.[0]).toBe(calc!.demoLine![0]);
  });

  it('uses the engine PV as the forcing line when supplied', () => {
    const qs = buildReadingQuestions('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', emptyTactics(), { pvSan: ['e4', 'e5', 'Nf3', 'Nc6'] });
    const calc = qs.find((q) => q.id === 'calculation');
    expect(calc?.demoLine?.[0]).toBe('e4');
    expect(calc?.answerMoves?.[0]).toBe('e4');
  });
})
