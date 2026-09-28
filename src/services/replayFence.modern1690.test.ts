// Hand walk 2026-09-27 — Modern / 150 attack, student White at 1690, a game
// Naroditsky teaches move by move (vc-woqgGKERnps). Each flag pinned on the
// real board it was heard on.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { detectBehaviors } from './danyaBehaviors';

const GAME = 'd4 g6 e4 Bg7 Nc3 d6 Be3 Nf6 f3 O-O Qd2 Nbd7 Bh6 c5 d5 a6 h4 b5 h5 b4 Bxg7 Kxg7 hxg6 fxg6 Qh6+ Kg8 Nd1 Rf7 Ne3 Rg7 Nh3 Qf8 Ng5 Ne5 O-O-O Nf7 Nxf7 Qxf7 Bc4 Nh5 Rh4 Qf6 Rdh1 Bd7 f4 Rf8 e5 dxe5 d6+ e6 Ng4 Qxf4+ Qxf4 exf4 Ne5 Ng3 Nxd7 Nxh1 Bxe6+ Kh8 Nxf8 Ng3 d7 Rxd7 Bxd7 Kg7 Nxh7 g5 Nxg5 Kg6 Nh3 Kg7 Ng5 Kg6 Nh3 Kg7 Nxf4 Kf6 Kd2 Ke5 Rg4 Ne4+ Ke3 Nd6 Nd3+ Kd5 Rg5+ Nf5+ Rxf5+ Kd6 Rxc5 Kxd7 Nxb4'.split(' ');
const fenAt = (n: number): string => { const c = new Chess(); for (const s of GAME.slice(0, n)) c.move(s); return c.fen(); };

describe('Modern 1690 hand walk — the flags stay fixed', () => {
  it('h6 covered by the g7 bishop is no hole to plant a piece on (ply 4)', () => {
    const hit = detectBehaviors({ fen: fenAt(4), studentColor: 'white' }).find((h) => h.id === 'weak-square');
    expect(hit?.fact ?? '').not.toMatch(/h6/);
  });
});

describe('a piece sent to trade is not offside (ply 13)', () => {
  it('7.Bh6 hitting the g7 bishop is no "long way from your king"', async () => {
    const { findStudentDrawback } = await import('./concessionBeat');
    for (const best of ['O-O-O', 'Nge2', 'g4', 'Nh3']) {
      const d = findStudentDrawback({ fen: fenAt(12), playedSan: 'Bh6', bestSan: best, studentColor: 'white' });
      expect(d?.kind).not.toBe('piece-offside');
    }
  });
});

describe('an even trade is not an overvalued attack (ply 21)', () => {
  it('11.Bxg7 — bishop for bishop, the knight on c3 was the loss', async () => {
    const { attributePrinciples } = await import('./principleAttribution');
    const ids = attributePrinciples({
      historySans: GAME.slice(0, 21), bestSan: 'Nd1', classification: 'blunder',
      evalBefore: 92, evalAfterPlayed: -249,
      pvAfterPlayed: ['bxc3', 'Qh6', 'cxb2', 'Rd1', 'Qa5'], pvAfterBest: ['Ne5', 'Bxg7', 'Kxg7', 'Be2'],
      replySan: 'Kxg7',
    }).map((a) => a.id);
    expect(ids).not.toContain('overvalued-attack');
  }, 20_000);
});

describe('the engine\'s best capture is never "keep pieces on" (ply 57)', () => {
  it('29.Nxd7 (best by 2.6) — no "trades pieces while you\'re behind"', async () => {
    const { readTrade } = await import('./tradeQuality');
    expect(readTrade(fenAt(56), 'Nxd7', 'w', 0)?.call).not.toBe('behind');
    expect(readTrade(fenAt(56), 'Nxd7', 'w', null)?.call).not.toBe('behind');
  });
});

describe('taking the forking piece is not "guarding" (ply 37)', () => {
  it('18.Nxf7 takes the knight that forked the queen on h6', async () => {
    const { threatAnswerWhy } = await import('./deliberation');
    const why = threatAnswerWhy(fenAt(36), 'Nxf7', 'w') ?? '';
    expect(why).not.toMatch(/guards the queen/);
    expect(why).toMatch(/takes the knight that was hitting the queen on h6/);
  });
});

describe('a fork the student just trades off is no threat (ply 39)', () => {
  it('…Qf4 "forking" h6 and e3 is met by Qxf4', async () => {
    const { opponentIntentRead } = await import('./positionReadingService');
    const i = opponentIntentRead(fenAt(40), 'w');
    expect(i?.kind === 'fork' && i.target === 'f4').toBe(false);
  });
});

describe('an alignment with their rook between is not "a line your queen moves along" (ply 25)', () => {
  it('queen d8 / rook f8 / king g8 after 13.Qh6+ Kg8', async () => {
    const { buildPlayCommentary } = await import('./playCommentary');
    const beat = buildPlayCommentary({ fen: fenAt(26), studentColor: 'white', saidExplainers: new Set<string>(), skipSquares: new Set<string>() });
    expect(beat?.spoken ?? '').not.toMatch(/line up on the same 8th rank/);
  });
});

describe('a tactic aim reads as English (ply 51)', () => {
  it('never "land a overloaded defender"', async () => {
    const { tacticAim } = await import('./lookaheadPlan');
    expect(tacticAim('overload')).toBe('overload a defender');
    for (const k of ['fork', 'pin', 'skewer', 'discovery', 'back_rank', 'mate_threat', 'removal_of_guard', 'trapped_piece', 'double_check', 'overload']) {
      expect(tacticAim(k) ?? '').not.toMatch(/\ba [aeiou]/);
    }
  });
});

describe('a won position after the move is not a blunder (ply 91)', () => {
  it('46.Rxc5 at +9 with a mate seen before it: "still wins", never "a blunder"', async () => {
    const { callInaccuracy } = await import('./inaccuracyCall');
    const c = callInaccuracy({
      fenBefore: fenAt(90), playedSan: 'Rxc5', bestSan: 'Nxc5', bestLineUci: ['d3c5', 'd6c7', 'd7a4'],
      cpLoss: 0, missedMate: 12, moverEvalAfterCp: 915, side: 'student', moverColor: 'white',
      replyLineUci: ['d6d7'], replySan: 'Kxd7',
    });
    expect(c?.said ?? '').not.toMatch(/blunder/);
  });
  it('Learn hands the verdict the after-move eval even when the read before was a mate', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).not.toMatch(/moverEvalAfterCp: bothCp \? mid\.evaluation \* sign : null/);
  });
});

describe('a gambit file is named as it is (ply 47)', () => {
  it('24.e5 dxe5 — never "the e-file is open" with their pawns on it', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).not.toMatch(/-file is open for your rook\.`/);
    expect(src).toMatch(/theirPawnOnFile \? 'half-open' : 'open'/);
  });
});

describe('one passer, one idea key, every lane (plies 49 and 61)', () => {
  it('the behaviour, the structure plan and the positional read share student-passer-d', async () => {
    const { structurePlanFact } = await import('./boardPlan');
    const hit = detectBehaviors({ fen: fenAt(60), studentColor: 'white' }).find((h) => h.id === 'passed-pawn');
    expect(hit?.keys).toContain('student-passer-d');
    expect(structurePlanFact(fenAt(50), 'w')?.ideaKey).toBe('student-passer-d');
  });
});

describe('an outpost they already held is not "handed" over (ply 73)', () => {
  it('37.Ng5 does not hand over g3', async () => {
    const { findStudentDrawback } = await import('./concessionBeat');
    for (const best of ['Rxf4', 'Rg4', 'Nxf4']) {
      const d = findStudentDrawback({ fen: fenAt(72), playedSan: 'Ng5', bestSan: best, studentColor: 'white' });
      expect(d?.kind === 'outpost-conceded' && d.square === 'g3').toBe(false);
    }
  });
});

describe('claim check 2026-09-27 — castling "one move away" must be legal', () => {
  it('in check (Qe2+) or through an attacked square is not one move away', async () => {
    const { castleIsOneMoveAway } = await import('./positionalRead');
    expect(castleIsOneMoveAway('rnb1kb1r/ppp2pp1/4pn1p/8/3Np3/1BP5/PP1PqPPP/RNB1K2R w KQkq - 0 10', 'w')).toBe(false);
    expect(castleIsOneMoveAway('r4rk1/1p1b1ppp/2pq1n2/4p3/1QB1P3/2Pn1P1P/PB1N2P1/R3K1R1 w Q - 1 17', 'w')).toBe(false);
    expect(castleIsOneMoveAway('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', 'w')).toBe(true);
  });
});

describe('claim check 2026-09-27 — no plans while in check', () => {
  it('no "lift the rook" (or any behaviour) with the student in check', () => {
    expect(detectBehaviors({ fen: 'r4rk1/pp1q2pp/3p2n1/4p3/4b3/1Q6/PPP2PPP/2KR1B1R b - - 1 17', studentColor: 'black' })).toEqual([]);
  });
});

describe('claim check 2026-09-27 — "no pawn can ever chase it" means ever', () => {
  it('a4→c5 with …b6 available is no reroute', async () => {
    const { findKnightReroute } = await import('./positionReadingService');
    expect(findKnightReroute('1r2k2r/1p1b1p2/p1n1p3/3pPn2/N2P4/1Q3P2/PP4Pq/3R1RK1 w k - 3 21', 'w')?.to).not.toBe('c5');
  });
  it('a rook and a bishop up is not "a rook up"', async () => {
    const { readConversion } = await import('./conversionMethod');
    const r = readConversion('8/6k1/8/R6p/7P/p7/B5P1/6K1 w - - 0 36', 'w');
    expect(r?.text ?? '').not.toMatch(/a rook up/);
  });
});

describe('claim check 2026-09-27 — a threatened piece is one the exchange loses', () => {
  it('…Qxa8 is met by Rxa8 from behind: the a8 rook is not "threatened"', async () => {
    const { computeMustDefend } = await import('./threatOut');
    const m = computeMustDefend('r2Qr1k1/pp1n3p/2p1b1p1/4p3/2P1Pp2/2N2P2/PPN3PP/R4BK1 b - - 0 21', 'b');
    expect(m.pieces.some((p) => p.square === 'a8')).toBe(false);
  });
  it('a genuinely loose piece still is', async () => {
    const { computeMustDefend } = await import('./threatOut');
    expect(computeMustDefend('4k3/8/8/3n4/8/8/8/3RK3 b - - 0 1', 'b').net).toBe(3);
  });
});

describe('claim check 2026-09-27 — a mating capture is named as mate', () => {
  it('Nxg3# is "threatening mate", never "would win your bishop"', () => {
    const facts = detectBehaviors({ fen: 'r4rk1/pp3ppp/6n1/2bN3q/2B1P1b1/3P2B1/PPPQn1PP/R4R1K w - - 13 18', studentColor: 'white' }).map((h) => h.fact).join(' ');
    expect(facts).not.toMatch(/Nxg3# — it would win/);
  });
});

describe('claim check 2026-09-27 — material and the king walk', () => {
  it('a queen up with a rook attacked on your own move is not "a piece up"', async () => {
    const { readConversion } = await import('./conversionMethod');
    expect(readConversion('r5k1/p1p2p2/2pq3p/2b5/4r3/6B1/PPP2P1P/R3R1K1 b - - 1 19', 'b')?.text ?? '').not.toMatch(/a piece up/);
  });
  it('no "walk your king to the centre" with queens on', () => {
    const facts = detectBehaviors({ fen: '8/5pk1/6p1/8/3Q4/6P1/5PK1/3q4 w - - 0 40', studentColor: 'white' }).map((h) => h.id);
    expect(facts).not.toContain('king-activity');
  });
});
