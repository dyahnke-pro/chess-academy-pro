// BOTH WAYS (David 2026-11-19: "Make sure all computers work both ways").
// Each registry read that TEACHES a danger or a chance on the board the
// student moves on also POSES that skill to the record: the move answers it
// (held), or misses it (broken), and the hold rate reads the tag — green after
// holds, red after misses. Real boards from each detector's own tests.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { positionPosed, registryPosedFacts } from './moveInsight';
import { capabilityOutcomes, type CapabilityEvidenceRecord } from './capabilityEvidence';
import { studentRecordFrom } from './studentRecord';
import { HOLD_MIN_POSED } from './holdRate';
import type { MisconceptionTagId } from '../data/misconceptionTags';

interface Case {
  computer: string;
  tag: MisconceptionTagId;
  fen: string;
  /** A clean move on that board (the question held). */
  held: string;
  /** The move that misses it (filed under the skill it was about). */
  missed: string;
  /** The engine's line from the board (UCI), where the read needs it. */
  line?: readonly string[];
}

const CASES: Case[] = [
  // Their queen went to h4: a knight fork on c7 two moves out for White.
  { computer: 'detectLatentFork', tag: 'missed-your-fork', fen: 'r1b1kb1r/pp2pppp/2np1n2/8/3NP2q/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 7', held: 'Ndb5', missed: 'h3' },
  // Rook e8 behind the knight e5: move the knight and the bishop on e3 is pinned.
  { computer: 'detectLatentDanger', tag: 'missed-their-pin', fen: '4r1k1/8/8/4N3/8/4B3/8/4K3 w - - 0 1', held: 'Kd2', missed: 'Nc6' },
  // The same line from Black's seat: their bishop on e3 is the one to pin.
  { computer: 'detectLatentDanger', tag: 'missed-your-pin', fen: '4r1k1/8/8/4N3/8/4B3/8/4K3 b - - 0 1', held: 'Kh7', missed: 'Rd8' },
  // Bxe5 lines the bishop up in front of the king on the e-file.
  { computer: 'detectTradeCreatesPin', tag: 'bad-trade', fen: '4r1k1/8/8/4n3/3B4/8/8/4K3 w - - 0 1', held: 'Kd2', missed: 'Bxe5' },
  // King in the centre, a rook on e8 and the e-file about to open.
  { computer: 'detectCentralKingDanger', tag: 'king-stuck-center', fen: '4r1k1/8/8/3p4/4P3/8/8/4K2R w K - 0 12', held: 'O-O', missed: 'Rh2' },
  // Kg1 with only h2 left in front of it, their rook and queen bearing in.
  { computer: 'detectKingExposure', tag: 'weakened-king-safety', fen: '5rk1/8/8/8/7q/8/7P/5RK1 w - - 0 1', held: 'Kg2', missed: 'Rf2' },
  // Qxb7 is met by Nc5 and the queen has no square.
  // David's game: their queen on f6 is trapped (…Qg6 Nf4 Qxd3 cxd3), seen
  // from White's seat the move before — here Black to move must get out.
  { computer: 'findTrappedPiece', tag: 'hung-material', fen: 'r1b1r1k1/1ppn1ppp/p2npq2/3p2B1/3P2PP/2PBPP2/P1P1N1Q1/2KR3R b - - 0 13', held: 'Qg6', missed: 'h6', line: ['f6g6', 'e2f4', 'g6d3', 'c2d3'] },
  // The same board with White to move: their trapped queen is the student's to win.
  { computer: 'findTrappedPiece', tag: 'missed-your-trapped-piece', fen: 'r1b1r1k1/1ppn1ppp/p2npq2/3p2B1/3P2PP/2PBPP2/P1P1N1Q1/2KR3R w - - 0 13', held: 'Bxf6', missed: 'a3', line: ['g5f6'] },
  // A rook up, nothing left but the win to convert.
  { computer: 'readConversion', tag: 'botched-conversion', fen: '6k1/8/8/8/8/8/5PPP/R5K1 w - - 0 40', held: 'Kf1', missed: 'Ra8+' },
  // Carlsen's game: every check of White's gives the piece away, Black has …Bh5+.
  { computer: 'noSafeChecks', tag: 'missed-opponents-threat', fen: '3k4/2p2b2/2PpR3/3P1pP1/3P4/p4KNr/P7/8 w - - 0 54', held: 'Kf2', missed: 'Re8+' },
  // The study: both kings race to g7, the h-pawn's escort square.
  { computer: 'kingRace', tag: 'passive-king-endgame', fen: 'k7/8/4p3/7P/8/3P4/1Bb4P/K7 w - - 0 1', held: 'h6', missed: 'd4' },
  // Danya, beginner chess strategy: your king on h7 three steps from the centre, theirs on d3.
  { computer: 'kingActivityGap', tag: 'passive-king-endgame', fen: '8/5ppk/3P3p/8/8/2pK3P/5PP1/8 b - - 0 2', held: 'Kg6', missed: 'f5' },
  // In pursuit of zugzwang: with Black to move every move drops a pawn, so lose a tempo.
  { computer: 'zugzwangIfPassed', tag: 'passive-king-endgame', fen: '2k5/8/p1P5/P2K4/8/8/8/8 w - - 0 1', held: 'Kc4', missed: 'Kd6' },
  // Doubled rooks on the d-file against the back rank: Rd8+ Rxd8 Rxd8 is mate.
  { computer: 'mateLine', tag: 'missed-your-mate', fen: 'r5k1/5ppp/8/8/8/8/3R1PPP/3R2K1 w - - 0 1', held: 'Rd8+', missed: 'h3', line: ['d2d8', 'a8d8', 'd1d8'] },
  // A king on e1 that can no longer castle, one pawn in front of it, their queen's checks on it.
  { computer: 'kingInOpen', tag: 'weakened-king-safety', fen: '3qk3/8/8/8/8/8/3P4/R3K2R w - - 0 30', held: 'Kf2', missed: 'Ra2' },
  { computer: 'findQueenGrabTraps', tag: 'poisoned-pawn', fen: 'r2q1r1k/pppnn1p1/3p3p/1P1Qp3/8/P1N2N1P/5PP1/R1B1R1K1 w - - 1 17', held: 'Qb3', missed: 'Qxb7' },
];

const side = (fen: string): 'white' | 'black' => (fen.split(' ')[1] === 'w' ? 'white' : 'black');

function row(c: Case, outcome: 'held' | 'broken', i: number): CapabilityEvidenceRecord {
  return { id: `${c.tag}:${outcome}:${i}`, tag: c.tag, outcome, fen: c.fen, playedSan: outcome === 'held' ? c.held : c.missed, posedImportance: 70,
    recordedAt: 1_700_000_000_000 + i * 60_000, origin: 'game', prompted: false, sourceGameId: `g${i}` };
}

describe('the registry reads pose their skill to the record (both ways)', () => {
  it.each(CASES)('$computer teaches the board and carries its skill ($tag)', (c) => {
    const f = registryPosedFacts(c.fen, c.fen.split(' ')[1] as 'w' | 'b', c.line ?? []).find((x) => x.computer === c.computer && x.skill === c.tag);
    expect(f, c.computer).toBeDefined();
    expect(f!.skill).toBe(c.tag);
  });

  it.each(CASES)('$computer: the board posed $tag — held on a clean move, broken on the miss', (c) => {
    // The moves are legal on the board (the test's own check).
    for (const san of [c.held, c.missed]) expect(new Chess(c.fen).move(san), san).toBeTruthy();
    const alsoPosed = positionPosed(c.fen, c.line ? { bestLine: c.line } : {});
    expect(alsoPosed.map((p) => p.tag)).toContain(c.tag);
    const held = capabilityOutcomes({ fenBefore: c.fen, playedSan: c.held, moverColor: side(c.fen), cpLoss: 0, alsoPosed });
    expect(held.find((r) => r.tag === c.tag)?.outcome).toBe('held');
    const missed = capabilityOutcomes({ fenBefore: c.fen, playedSan: c.missed, moverColor: side(c.fen), cpLoss: 300, alsoPosed, slipTag: c.tag });
    expect(missed.find((r) => r.tag === c.tag)?.outcome).toBe('broken');
  });

  it.each(CASES)('$computer: the hold rate reads $tag — green after holds, red after misses', (c) => {
    const n = HOLD_MIN_POSED + 2;
    const green = studentRecordFrom([], Array.from({ length: n }, (_, i) => row(c, 'held', i)), [], 1_800_000_000_000);
    expect(green.heat.get(c.tag)?.state).toBe('green');
    const red = studentRecordFrom([], Array.from({ length: n }, (_, i) => row(c, i < 2 ? 'held' : 'broken', i)), [], 1_800_000_000_000);
    expect(red.heat.get(c.tag)?.state).toBe('red');
  });

  it('a quiet opening board poses none of them', () => {
    expect(registryPosedFacts(new Chess().fen(), 'w', [])).toEqual([]);
  });
});

describe('the quiet stop, both ways (prophylaxis)', () => {
  // 1.e4 e5 2.Nf3 d6 3.d4 Nf6 4.Nc3 Nc6: the engine wants h3 first, stopping …Bg4.
  const c = new Chess();
  for (const san of ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Nf6', 'Nc3', 'Nc6']) c.move(san);
  const fen = c.fen();
  it('the stop played is held; a move that lets the pin land is broken', async () => {
    const { prophylaxisAnswer } = await import('./moveInsight');
    expect(prophylaxisAnswer(fen, 'h3', 'h2h3')).toBe('held');
    expect(prophylaxisAnswer(fen, 'Bc4', 'h2h3')).toBe('broken');
    // The engine wanted something else: the board posed no stop.
    expect(prophylaxisAnswer(fen, 'Bc4', 'f1e2')).toBeNull();
  });
  it('the record files it under missed-opponents-threat, held and broken', () => {
    const held = capabilityOutcomes({ fenBefore: fen, playedSan: 'h3', moverColor: 'white', cpLoss: 0, bestSan: 'h3' });
    expect(held.find((r) => r.tag === 'missed-opponents-threat')?.outcome).toBe('held');
    const missed = capabilityOutcomes({ fenBefore: fen, playedSan: 'Bc4', moverColor: 'white', cpLoss: 20, bestSan: 'h3' });
    expect(missed.find((r) => r.tag === 'missed-opponents-threat')?.outcome).toBe('broken');
  });
});

describe('the structure judgements of the move, both ways (studentMoveStructure)', () => {
  // d5 trades off the isolated d4: the break that gets rid of the weak pawn.
  const fen = '6k1/pp3ppp/4p3/8/3P4/8/PP3PPP/6K1 w - - 0 20';
  it('a clean move the judgement says answered the question is held under its own tag', () => {
    const held = capabilityOutcomes({ fenBefore: fen, playedSan: 'd5', moverColor: 'white', cpLoss: 10, bestSan: 'd5' });
    expect(held.find((r) => r.tag === 'mistimed-pawn-break')?.outcome).toBe('held');
  });
  it('a costly move files no structure green (the slip names its own skill)', () => {
    const costly = capabilityOutcomes({ fenBefore: fen, playedSan: 'd5', moverColor: 'white', cpLoss: 300, bestSan: 'Kf1', slipTag: 'hung-material' });
    expect(costly.find((r) => r.tag === 'mistimed-pawn-break' && r.outcome === 'held')).toBeUndefined();
  });
});

describe('the move that ignored the idea, both ways (tension, the lever without pieces)', () => {
  it('the tension released at a cost is broken under its tag; a cheap one files nothing', () => {
    // Spassky's board: axb5 releases the tension the engine wanted kept.
    const fen = 'r3rq2/1b3pbk/p2p1np1/1pnPp1Bp/P1p1P3/2P2PNP/1PBQ2PN/R4RK1 w - - 0 24';
    const costly = capabilityOutcomes({ fenBefore: fen, playedSan: 'axb5', moverColor: 'white', cpLoss: 120, bestSan: 'Bxf6', slipTag: 'other' });
    // The engine's best here is a capture, so no tension was posed against it.
    expect(costly.find((r) => r.tag === 'mistimed-pawn-break' && r.outcome === 'broken')).toBeUndefined();
    const quietBest = capabilityOutcomes({ fenBefore: fen, playedSan: 'axb5', moverColor: 'white', cpLoss: 120, bestSan: 'Kh1', slipTag: 'other' });
    expect(quietBest.find((r) => r.tag === 'mistimed-pawn-break')?.outcome).toBe('broken');
    const cheap = capabilityOutcomes({ fenBefore: fen, playedSan: 'axb5', moverColor: 'white', cpLoss: 10, bestSan: 'Kh1' });
    expect(cheap.find((r) => r.tag === 'mistimed-pawn-break' && r.outcome === 'broken')).toBeUndefined();
  });
  it('the lever pushed with no pieces near it, at a cost, is broken', () => {
    const fen = '5rk1/pp1q1rpp/4b3/3pPp1Q/P1pP3P/2P3P1/1P3RB1/5RK1 w - - 0 26';
    const r = capabilityOutcomes({ fenBefore: fen, playedSan: 'a5', moverColor: 'white', cpLoss: 80, bestSan: 'Qd1', slipTag: 'other' });
    expect(r.find((x) => x.tag === 'mistimed-pawn-break')?.outcome).toBe('broken');
  });
});
