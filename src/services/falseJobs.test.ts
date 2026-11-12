// FALSE JOBS AND FALSE WAITS (task 172, 2026-11-11) — the smaller causes the
// fact-sheet writers logged, each on its exact board and each failing on the
// code before the fix.
import { describe, it, expect } from 'vitest';
import { moveJob, THEIRS } from './bookMoveWhy';
import { inBetweenMove } from './inBetweenMove';
import { Chess } from 'chess.js';
import { branchClause, type ReplyBranch, type ReplyTree } from './ifTheyPlay';
import { deriveNarrationArrows } from './narrationArrows';
import { buildReviewMoveTeachingFact } from './reviewMoveTeaching';
import { readTrade } from './tradeQuality';
import { computeMoveFundamentals } from './moveFundamentals';

describe('the move’s job', () => {
  it('Nd2 keeps no bishop off g4 "where it would pin their knight on f3": that knight just left f3 (Philidor)', () => {
    const job = moveJob('r1b2rk1/1pq2ppp/2pp1b2/p1nPp3/P1B1P3/2N2N2/1PP2PPP/R2QR1K1 w - - 0 12', 'Nd2', 'w', THEIRS, null, []);
    expect(job?.clause ?? '').not.toMatch(/pin their knight on f3/);
  });

  it('…Nbd7 clears no "way to castle": short castling was already legal (London)', () => {
    const job = moveJob('rn2k2r/pp3ppp/2pqpn2/3p4/2PP4/2NQPN2/PP3PPP/R3K2R b KQkq - 0 9', 'Nbd7', 'b', THEIRS, null, []);
    expect(job?.clause ?? '').not.toMatch(/castle/);
  });

  it('…Be7 does clear the way to castle when the line castles short next, long castling being legal already', () => {
    const fen = 'r3kb1r/pp1q1ppp/2nppn2/8/Q2PP3/2N1BB2/PP3PPP/R3K2R b KQkq - 3 10';
    expect(moveJob(fen, 'Be7', 'b', THEIRS, null, [['O-O', 'O-O']])?.clause ?? '').toMatch(/castle/);
    // …and with no line known, a wing that was open already is all the board shows.
    expect(moveJob(fen, 'Be7', 'b', THEIRS, null, [])?.clause ?? '').not.toMatch(/castle/);
  });

  it('a move that does clear the last piece still says so (Bc4 in the Italian)', () => {
    const job = moveJob('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 'Bc4', 'w', THEIRS, null, []);
    expect(job?.clause ?? '').toMatch(/clears the way to castle/);
  });
});

describe('the in-between move', () => {
  it('"taking on d5 can wait" is not said of a capture that loses the knight where it stands (Benko …Qa5+)', () => {
    const fen = 'rnbqkb1r/3ppppp/5n2/1BpP4/8/4P3/PP3PPP/RNBQK1NR b KQkq - 0 6';
    expect(inBetweenMove(fen, ['d8a5', 'b1c3', 'c8b7', 'c1d2', 'f6d5'])).toBeNull();
  });

  it('a bishop stepping back along its line makes no new threat (Bh4 after …h6)', () => {
    const fen = 'rnbq1rk1/ppp1bpp1/4pn1p/3p2B1/2PP4/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 7';
    expect(inBetweenMove(fen, ['g5h4', 'b7b6', 'c4d5', 'e6d5'])).toBeNull();
  });

  it('a check first, then a capture that was sound all along, is still one', () => {
    // White can take the loose pawn on a7 at once, or check first and take after.
    const ib = inBetweenMove('4k3/p7/8/8/8/8/8/R3K2R w - - 0 1', ['h1h8', 'e8d7', 'a1a7']);
    expect(ib?.captureSquare).toBe('a7');
    expect(ib?.check).toBe(true);
  });
});

describe('the reply tree tells two of a kind apart', () => {
  it('"with the knight" names which knight when both can take (…Bxd2+ in the Queen’s Indian)', () => {
    const fen = 'rn1qk2r/pbpp1ppp/1p2pn2/8/2PP4/5NP1/PP1bPPBP/RN1QK2R w KQkq - 0 7';
    const tree: ReplyTree = { fen, replier: 'w', branches: [], held: [], bestCp: 20 };
    const branch: ReplyBranch = {
      reply: { uci: 'f3d2', san: 'Nfxd2', from: 'f3', to: 'd2', capture: true, check: false, castle: false },
      p: 0.1, engineBest: false, played: false, answer: { uci: 'b7g2', san: 'Bxg2', to: 'g2', piece: 'b' }, kind: 'job',
      sans: ['Nfxd2', 'Bxg2'], uci: ['f3d2', 'b7g2'], blowPlies: 1, win: null, winPawns: null, motif: null,
      job: 'wins a bishop, and nothing can take back', trust: { name: true, why: 'near', forcing: true, agreed: false },
    };
    expect(branchClause(tree, branch, 'b', 'live')).toBe('if they take on d2 with the knight from f3, …Bxg2 wins a bishop, and nothing can take back');
  });
});

describe('the arrow resolver reads the Black-move marker', () => {
  it('"…b4" draws Black’s pawn, not the White pawn that could also reach b4', () => {
    const c = new Chess();
    for (const m of ['d4', 'Nf6', 'Nf3', 'b5']) c.move(m);
    const arrows = deriveNarrationArrows('They go on with …b4 next.', c.fen(), [], { marking: 'strict', student: 'white' }).arrows;
    expect(arrows.map((a) => `${a.from}${a.to}`)).toEqual(['b5b4']);
  });
});

describe('a rook presses down a file only where it sees', () => {
  it('Re1 presses on nothing with its own bishop on e2 in front of it (London)', () => {
    expect(buildReviewMoveTeachingFact('2r2rk1/pp2ppbp/1qnpbnp1/8/3P1B2/2P2N1P/PP1NBPP1/R1Q2RK1 w - - 1 12', 'Re1', true, null)?.text ?? '').not.toMatch(/presses down/);
  });

  it('a rook that does see the pawn still says so (…Rfb8 at b2 in the Benko)', () => {
    expect(buildReviewMoveTeachingFact('r4rk1/3nppbp/3p1np1/q1pP4/4P3/2N2NP1/PPQ2PKP/R1B1R3 b - - 8 13', 'Rfb8', true, null)?.text ?? '').toMatch(/presses down the half-open b-file at their pawn on b2/);
  });
});

describe('a defender of the king guards a square that is attacked', () => {
  it('…Nxc3 removes no "defender of their king": the knight on c3 covered d1 and e2, which nothing hit (Queen’s Indian)', () => {
    const r = readTrade('rn1q1rk1/pbpp1ppp/1p2p3/8/2PPn3/2N2NP1/PPQ1PPBP/R3K2R b KQ - 4 9', 'Nxc3', 'b', 0, null, true);
    expect(r?.text ?? '').not.toMatch(/defender of/);
  });

  it('a guard of a square another piece attacks is still one: Bxg7 takes off the bishop covering f8, which the queen on a3 hits', () => {
    const r = readTrade('r2q1rk1/ppp2pb1/6pB/8/8/Q7/PPP2PP1/2KR3R w - - 0 1', 'Bxg7', 'w', 0, null, true);
    expect(r?.text).toBe('Bxg7 is a good trade — it removes a defender of their king.');
  });
});

describe('a kick needs a pawn that stays to do the kicking', () => {
  it('d6 kicks no knight off e7: …cxd6 takes the pawn and the queen, not a pawn, takes back (Ponziani)', () => {
    const fen = 'r1bqk1nr/ppppnppp/1b6/3P4/4P3/5N2/PP3PPP/RNBQKB1R w KQkq - 1 7';
    expect(computeMoveFundamentals(fen, 'd6', 'white').map((f) => f.id)).not.toContain('tempo');
    expect(buildReviewMoveTeachingFact(fen, 'd6', true, null)?.text ?? '').not.toMatch(/kicks/i);
  });

  it('a pawn they cannot take still kicks (h3 against the knight on g4)', () => {
    const fen = 'r2qk2r/ppp1bpp1/2p5/4Pb1p/2BP2n1/2P5/PP3PPP/RNBQK2R w KQkq - 3 11';
    expect(computeMoveFundamentals(fen, 'h3', 'white').map((f) => f.id)).toContain('tempo');
  });

  it('a pawn they can trade off still kicks when a pawn takes back onto the square (e5 against the knight on f6, …dxe5 dxe5)', () => {
    const fen = 'rnbqkb1r/ppp1pppp/3p1n2/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3';
    expect(computeMoveFundamentals(fen, 'e5', 'white').map((f) => f.id)).toContain('tempo');
  });
});
