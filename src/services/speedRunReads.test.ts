import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  keepTension, anyMoveFine, uglyButRight, castleSide, provokes, threatStronger, heldByTactic,
  secureFirst, mutualPins, overprotect, positionOpened, awkwardBlock, speedRunReads,
  playAnyway, skipMiddleman, usefulWaiting, keepSquareForKnight, rightPieceForHole,
  finishStarted, goodInEveryBranch, takeTheSting, retreatKeepsBreak, bestCasePlan, rejectedMoveLater,
  forceConcession, flexibleFirst, queenGlue,
} from './speedRunReads';

const fenAt = (sans: string): string => { const c = new Chess(); for (const m of sans.split(' ')) c.move(m); return c.fen(); };
const line = (moves: string[], evaluation: number) => ({ moves, evaluation, mate: null });

describe('his habits of thought, computed (each checked against the existing computers)', () => {
  it('keep the tension: exd5 is there, the engine develops instead', () => {
    const fen = fenAt('e4 e5 Nf3 d5');
    // the student could take on d5; the engine prefers a quiet move
    expect(keepTension(fen, 'w', 'Nc3')?.text).toMatch(/Keep the tension/);
    expect(keepTension(fen, 'w', 'exd5')).toBeNull();
    // en passant is not tension
    expect(keepTension('3r1rk1/1pp3pp/p7/4Pp1n/5P2/2N5/PP4PP/2R2R1K w - f6 0 20', 'w', 'Rcd1')).toBeNull();
  });
  it('any move is fine: three moves inside an inaccuracy of each other', () => {
    const fen = 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 0 8';
    expect(anyMoveFine(fen, [line(['c1g5'], 30), line(['b1c3'], 25), line(['c2c3'], 20)])?.text).toMatch(/Several moves are equally good/);
    expect(anyMoveFine(fen, [line(['c1g5'], 120), line(['b1c3'], 25), line(['c2c3'], 20)])).toBeNull();
  });
  it('the ugly move that is correct: the engine doubles your own pawns', () => {
    // bxc3 doubles the c-pawns (c3 and c2)
    const fen = '4k3/8/8/8/8/2n5/1PP5/4K3 w - - 0 1';
    expect(uglyButRight(fen, 'bxc3')?.text).toMatch(/looks ugly — it doubles your own pawns/);
    expect(uglyButRight(fen, 'Kd1')).toBeNull();
  });
  it('which side to castle: the intact wing', () => {
    expect(castleSide('r3k2r/pppppppp/8/8/8/8/P4PPP/R3K2R w KQkq - 0 1', 'w')?.text).toMatch(/[Cc]astle short/);
    expect(castleSide('r3k2r/pppppppp/8/8/8/8/PPP2PPP/R3K2R w KQkq - 0 1', 'w')).toBeNull();
  });
  it('provoke the commitment: the reply is a pawn advance into your half', () => {
    const fen = '4k3/8/8/2p5/8/8/8/4KB2 w - - 0 1';
    expect(provokes(fen, [line(['f1e2', 'c5c4'], 10)])?.text).toMatch(/invites .* fixed/);
    expect(provokes(fen, [line(['f1e2', 'e8d7'], 10)])).toBeNull();
  });
  it('the threat is stronger than the execution', () => {
    // Nxd5 wins a pawn now, but the engine prefers Bc4 by a margin
    const fen = '4k3/8/8/3p4/8/2N5/8/4KB2 w - - 0 1';
    expect(threatStronger(fen, 'w', [line(['f1c4'], 200), line(['c3d5'], 100)])?.text).toMatch(/threat is stronger|threat is the stronger|Don't cash in/);
    expect(threatStronger(fen, 'w', [line(['c3d5'], 200)])).toBeNull();
  });
  it('a piece held only by a tactic: outnumbered, yet taking it loses', () => {
    // the knight on e5 is hit by the rook on a5 and the queen on e7, guarded once by d4 — and Rxe5 dxe5 loses for them
    expect(heldByTactic('6k1/4q3/8/r3N3/3P4/8/8/6K1 w - - 0 1', 'w')?.text).toMatch(/safe only because of a tactic|survives on a tactic|only a tactic holds it/);
    // one attacker, one defender: not outnumbered
    expect(heldByTactic('6k1/4q3/8/4N3/3P4/8/8/6K1 w - - 0 1', 'w')).toBeNull();
  });
  it('secure the loose piece before collecting', () => {
    // Rxa7 is there, but the bishop on c4 is loose and hit by the queen on c8; the engine retreats it first
    const fen = '2q1k3/p7/8/8/2B5/8/8/R3K3 w - - 0 1';
    expect(secureFirst(fen, 'w', [line(['c4b3'], 50)])?.text).toMatch(/loose and under fire — (secure it first|tidy that up|safety first)/);
    expect(secureFirst(fen, 'w', [line(['a1a7'], 50)])).toBeNull();
    // Scandinavian 3.Nc3: the queen is hit, but every capture on offer loses — nothing to collect
    expect(secureFirst('rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3', 'b', [line(['d5a5'], 0)])).toBeNull();
  });
  it('mutual pins', () => {
    // Bb5 pins the d7 knight to e8; …Bb4 pins the d2 knight to e1
    expect(mutualPins('4k3/3n4/8/1B6/1b6/8/3N4/4K3 w - - 0 1')?.text).toMatch(/Both sides are pinned/);
    // only one side pinned
    expect(mutualPins('4k3/3n4/8/1B6/8/8/3N4/2bK4 w - - 0 1')).toBeNull();
  });
  it('overprotection: the outpost knight with a single guard', () => {
    const fen = '4k3/8/8/4N3/3P4/8/8/4K3 w - - 0 1';
    expect(overprotect(fen, 'w')?.text).toMatch(/overprotect it|second guard/);
  });
  it('the position opened: their knight steps off your bishop\'s diagonal, and you have a capture', () => {
    // …Nf5 opens the a1 bishop onto their queen on f6
    const r = positionOpened({ fenBefore: '6k1/8/5q2/8/3n4/8/8/B5K1 b - - 0 1', san: 'Nf5' }, 'w', 'Bxf6');
    expect(r?.text).toMatch(/hit the gas/);
    expect(positionOpened({ fenBefore: '6k1/8/5q2/8/3n4/8/8/B5K1 b - - 0 1', san: 'Nf5' }, 'w', 'Kg2')).toBeNull();
  });
  it('the awkward block: Bb5+ forces …Bd7, pinned with almost nowhere to go', () => {
    const fen = 'rnbqkbnr/ppp1pppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
    expect(awkwardBlock(fen, [line(['f1b5', 'c8d7'], 30)])?.text).toMatch(/stuck/);
    expect(awkwardBlock(fen, [line(['g1f3', 'g8f6'], 30)])).toBeNull();
  });
  it('play it anyway: Bc4 allows …Nxe4 and the line still holds', () => {
    const fen = fenAt('e4 e5 Nf3 Nf6');
    expect(playAnyway(fen, [line(['f1c4', 'f6e4'], 40)])?.text).toMatch(/allows a capture .* play it anyway/);
    expect(playAnyway(fen, [line(['f1c4', 'f6e4'], -80)])).toBeNull();
    expect(playAnyway(fen, [line(['f1c4', 'f8c5'], 40)])).toBeNull();
    // a plain recapture is not scary: Nxe5 Nxe5 trades evenly
    expect(playAnyway(fenAt('e4 e5 Nf3 Nc6 d4 Nxd4'), [line(['f3d4', 'e5d4'], 40)])).toBeNull();
  });
  it('skip the middleman: c4 hits d5 now (and survives the exchange) — no need to prepare it', () => {
    const fen = fenAt('d4 d5 Nf3 Nf6 e3 e6 Bd3 c5');
    expect(skipMiddleman(fen, 'c4')?.text).toMatch(/break is ready now/);
    expect(skipMiddleman(fen, 'c4')?.idea).toMatch(/c-pawn break against their pawn on d5/);
    expect(skipMiddleman(fen, 'O-O')).toBeNull();
  });
  it('the useful waiting move: nothing matters much and the engine plays h3', () => {
    const fen = 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 0 8';
    expect(usefulWaiting(fen, [line(['h2h3'], 30), line(['b1c3'], 25), line(['c2c3'], 20)])?.text).toMatch(/useful waiting move/);
    expect(usefulWaiting(fen, [line(['b1c3'], 30), line(['h2h3'], 25), line(['c2c3'], 20)])).toBeNull();
  });
  it('keep a square vacant: the knight on b1 goes through c3, and the c-pawn could block it', () => {
    const fen = '4k3/8/8/2p1p3/3pP3/3P4/2P5/1NB1K3 w - - 0 1';
    expect(keepSquareForKnight(fen, 'w', 'Ke2')?.text).toMatch(/Keep c3 empty — your knight on b1 goes b1–c3–d5|Don't park a piece on c3 — it's the first stop for your knight on b1 on the way to d5/);
    expect(keepSquareForKnight(fen, 'w', 'c3')).toBeNull();
  });
  it('the right piece for the hole: the bishop on d5 sits where the knight belongs', () => {
    const fen = '4k3/8/3p4/3B4/4P3/8/8/4KN2 w - - 0 1';
    expect(rightPieceForHole(fen, 'w')?.text).toMatch(/belongs to a knight/);
    expect(rightPieceForHole('4k3/8/3p4/3B4/4P3/8/8/4K3 w - - 0 1', 'w')).toBeNull();
  });
  it('finish what you started: c4 began the break, cxd5 carries it on', () => {
    const before = fenAt('d4 d5 Nf3 Nf6 e3 e6 Bd3 c5');
    const fen = fenAt('d4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c4 Nc6');
    expect(finishStarted({ fenBefore: before, san: 'c4' }, fen, 'cxd5')?.text).toMatch(/finish it/);
    expect(finishStarted({ fenBefore: before, san: 'c4' }, fen, 'O-O')).toBeNull();
  });
  it('good in every branch: Ke2 leaves nothing to take, Ne4 drops the knight to …dxe4', () => {
    const fen = '4k3/8/8/3p4/8/2N5/8/4K3 w - - 0 1';
    expect(goodInEveryBranch(fen, 'w', [line(['e1e2'], 0), line(['c3e4'], -300)])?.text).toMatch(/works whatever they answer.*e4/);
    expect(goodInEveryBranch(fen, 'w', [line(['e1e2'], 0), line(['e1d2'], 0)])).toBeNull();
  });
  it('take the sting out: Ne5 blocks the rook — the bishop is neither moved nor guarded', () => {
    const fen = '4r1k1/8/8/8/4B3/5N2/8/6K1 w - - 0 1';
    expect(takeTheSting(fen, 'w', 'Ne5')?.text).toMatch(/takes the sting out/);
    expect(takeTheSting(fen, 'w', 'Bd3')).toBeNull();
  });
  it('the retreat that keeps your break: Nf3 clears d4 for the d-pawn', () => {
    const fen = '4k3/8/8/2p5/3N4/3PP3/8/4K3 w - - 0 1';
    expect(retreatKeepsBreak(fen, 'w', 'Nf3')?.text).toMatch(/clears d4 so your pawn on d3/);
    expect(retreatKeepsBreak(fen, 'w', 'Nb5')).toBeNull();
  });
  it('the best-case plan test: the slow a3–b3–c3 plan ends level at best', () => {
    const fen = fenAt('e4 e5');
    expect(bestCasePlan(fen, [line(['g1f3'], 200), line(['a2a3', 'a7a6', 'b2b3', 'b7b6', 'c2c3'], 0)])?.text).toMatch(/best case/);
    expect(bestCasePlan(fen, [line(['g1f3'], 200), line(['d2d4', 'e5d4'], 0)])).toBeNull();
  });
  it('the rejected move works later: exd5 now is worse, and it comes back in the main line after Nc3', () => {
    const fen = fenAt('e4 d5');
    expect(rejectedMoveLater(fen, [line(['b1c3', 'g8f6', 'e4d5'], 50), line(['e4d5'], -100)])?.text).toMatch(/exd5 doesn't work yet — but it does after Nc3/);
    // a quiet move is not a temptation: silent
    expect(rejectedMoveLater(fenAt('e4 e5'), [line(['g1f3', 'b8c6', 'f1c4'], 50), line(['f1c4'], -100)])).toBeNull();
  });
  it('force a concession: Bb5+ Ke7 costs them castling', () => {
    const fen = 'rnbqkbnr/pp3ppp/8/2ppp3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
    expect(forceConcession(fen, [line(['f1b5', 'e8e7'], 50)])?.text).toMatch(/loses the right to castle/);
    expect(forceConcession(fen, [line(['f1b5', 'c8d7'], 50)])).toBeNull();
  });
  it('flexible moves first: Nf3 and d4 are equal — the knight first', () => {
    const fen = fenAt('e4 e5');
    expect(flexibleFirst(fen, [line(['g1f3'], 30), line(['d2d4'], 20)])?.text).toMatch(/flexible move first/);
    expect(flexibleFirst(fen, [line(['d2d4'], 30), line(['g1f3'], 20)])).toBeNull();
  });
  it('the queen as the glue: the d2 queen alone holds c3 and e3', () => {
    expect(queenGlue('4k3/8/8/8/1b4n1/2N1B3/3Q4/4K3 w - - 0 1', 'w')?.text).toMatch(/queen on d2 is the glue/);
    expect(queenGlue('4k3/8/8/8/1b4n1/2N1B3/1P1Q4/4K3 w - - 0 1', 'w')).toBeNull();
  });
  it('every read the list returns carries a stake for the ranker', () => {
    const glue = speedRunReads({ fen: '4k3/8/8/8/1b4n1/2N1B3/3Q4/4K3 w - - 0 1', me: 'w', lines: [] });
    expect(glue.find((r) => /glue/.test(r.text))?.stakes).toEqual({ points: 3, plies: 2 });
    const quiet = speedRunReads({ fen: fenAt('e4 e5'), me: 'w', lines: [line(['g1f3'], 30), line(['d2d4'], 20)] });
    expect(quiet.length).toBeGreaterThan(0);
    for (const r of quiet) expect(r.stakes?.points).toBeGreaterThan(0);
    const sting = takeTheSting('4r1k1/8/8/8/4B3/5N2/8/6K1 w - - 0 1', 'w', 'Ne5');
    expect(sting?.stakes).toEqual({ points: 3, plies: 1 });
  });
  it('a move-naming read carries its idea, spoken where the move is held', () => {
    const r = anyMoveFine('r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 0 8', [line(['c1g5'], 30), line(['b1c3'], 25), line(['c2c3'], 20)]);
    expect(r?.idea).toMatch(/big decision|not a critical moment|Nothing hinges/);
    expect(r?.idea).not.toMatch(/Bg5|Nc3|c3/);
    expect(anyMoveFine(fenAt('e4 e5'), [line(['g1f3'], 30), line(['b1c3'], 25), line(['f1c4'], 20)])).toBeNull();
  });
  it('each idea names the piece, never the square it goes to (the guided-find rule)', () => {
    const fc = forceConcession('rnbqkbnr/pp3ppp/8/2ppp3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', [line(['f1b5', 'e8e7'], 50)]);
    expect(fc?.idea).toMatch(/Your bishop has a forcing move that costs their king the right to castle/);
    expect(fc?.idea).not.toMatch(/b5|Bb5/);
    const pa = playAnyway(fenAt('e4 e5 Nf3 Nf6'), [line(['f1c4', 'f6e4'], 40)]);
    expect(pa?.idea).toMatch(/strongest bishop move lets them take your pawn on e4/);
    expect(pa?.idea).not.toMatch(/c4/);
    const ff = flexibleFirst(fenAt('e4 e5'), [line(['g1f3'], 30), line(['d2d4'], 20)]);
    expect(ff?.idea).toMatch(/a knight move/);
    expect(ff?.idea).not.toMatch(/f3/);
    expect(ff?.idea).toMatch(/d4/);
    const castle = flexibleFirst('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', [line(['e1g1'], 30), line(['d2d3'], 20)]);
    expect(castle?.idea).toMatch(/castling/);
  });
  it('scale-replay defects stay fixed (20 of his games)', () => {
    // play it anyway: the knight lands where they take it — never name that square
    const pa = playAnyway('r3rbk1/p4ppp/P1q1p3/1p1n2B1/4N3/2P3Q1/1P3PPP/R3R1K1 w - - 2 23', [line(['e4f6', 'g7f6'], 300)]);
    if (pa) expect(pa.idea).not.toMatch(/f6/);
    // forcing concession: no "weak pawn on d5" on move one
    expect(forceConcession('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', [line(['c7c5', 'g1f3'], 30)])).toBeNull();
    // 1…d5 2.exd5 doubles the d-pawns — and …Qxd5 takes one back: no concession
    expect(forceConcession('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', [line(['d7d5', 'e4d5', 'd8d5'], 30)])).toBeNull();
  });
  it('phrasing rotates on the move number, never at random', () => {
    const at = (n: number) => `r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 0 ${n}`;
    const L = [line(['c1g5'], 30), line(['b1c3'], 25), line(['c2c3'], 20)];
    expect(anyMoveFine(at(9), L)?.idea).toBe(anyMoveFine(at(9), L)?.idea);
    expect(anyMoveFine(at(9), L)?.idea).not.toBe(anyMoveFine(at(10), L)?.idea);
  });
  it('the reads list never throws on any opening position (smoke over a real game)', () => {
    const c = new Chess();
    for (const m of 'e4 e5 Nf3 Nc6 Bb5 Nd4 Nxd4 exd4 O-O Bc5 d3 Qh4 Nd2 c6 Bc4 d6 Nf3 Qh5'.split(' ')) {
      c.move(m);
      expect(() => speedRunReads({ fen: c.fen(), me: 'w', lines: [] })).not.toThrow();
    }
  });
});

describe('the reads go quiet on strategy while a piece hangs (relevance)', () => {
  it('a hanging knight: no slow-plan or threat-is-stronger read, only safety', () => {
    // their bishop on b4 hits your undefended knight on c3; a pawn grab on d5 is also there
    const fen = '4k3/8/8/3p4/1b6/2N5/8/4KB2 w - - 0 1';
    const reads = speedRunReads({ fen, me: 'w', lines: [{ moves: ['f1c4'], evaluation: 200, mate: null }, { moves: ['c3d5'], evaluation: 100, mate: null }] });
    expect(reads.some((r) => /threat is stronger|cash in|isn't going anywhere/.test(r.text))).toBe(false);
  });
});
