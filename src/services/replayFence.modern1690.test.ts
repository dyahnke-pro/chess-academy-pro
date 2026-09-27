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
  });
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
