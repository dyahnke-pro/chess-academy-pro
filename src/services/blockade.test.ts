import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { blockade, blockadeLine } from './blockade';
import { findBlockade, findBlockades } from './positionReadingService';
import { readBoard } from './boardComputers';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';

// Every board is a real game board from Danya's speedruns
// (public/data/voiced-teachings.json: the note's `lineSan` played from the
// start, its last move the move read). The note id is named on each.
const split = (line: string): { san: string; fenBefore: string; fenAfter: string } => {
  const sans = line.split(' ');
  const c = new Chess();
  for (const s of sans.slice(0, -1)) c.move(s);
  const fenBefore = c.fen();
  c.move(sans[sans.length - 1]);
  return { san: sans[sans.length - 1], fenBefore, fenAfter: c.fen() };
};
const say = (line: string, own: 'your' | 'their'): string => {
  const b = split(line);
  const r = blockade(b.fenBefore, b.san);
  if (!r) throw new Error(`no blockade for ${b.san}`);
  return blockadeLine(r, own, b.fenAfter);
};

// vc-kWk-UW7GdnY-10, "you already have the dream: a blockading knight on d5"
// (the student is Black, against the isolated pawn on d4).
const NXD5 = 'e4 c5 c3 d5 exd5 Nf6 d4 cxd4 cxd4 Nxd5';
// vc-n5BL4u1QpfY-26, "Black throws the rook to b8 to blockade the pawn" (the
// student is White, the passed pawn on b7 is theirs).
const RB8 = 'e4 c5 c3 d5 exd5 Qxd5 d4 cxd4 cxd4 Nc6 Nf3 Bg4 Be2 e6 Nc3 Bb4 O-O Qd7 d5 Bxc3 dxc6 Qxd1 Rxd1 Ba5 cxb7 Rb8';
// vc-yAF1Bpa4m5Q-54, "The knight centralizes on d5, a commanding blockading
// square" — and White has no light-squared bishop left to challenge it.
const ND5 = 'd4 g6 e4 Bg7 Nf3 d6 Nc3 a6 Bg5 b5 Bd3 Bb7 Qe2 Nf6 e5 Nd5 exd6 Qxd6 Ne4 Qe6 O-O Nd7 Rfe1 O-O Qd2 Qb6 b3 b4 Bh6 Rfe8 Bxg7 Kxg7 h4 N5f6 c4 bxc3 Qxc3 Bxe4 Bc4 Nb8 Bxa6 Nxa6 Rxe4 Rad8 Re5 Rd7 Rc1 Nc5 Qb4 Na6 Qc5 Qxc5 Rexc5 Nd5';
// vc-VeHyQWutHPQ-45, "You bring the rook to a1" — off a6, the square in
// front of their passed pawn on a7.
const RAA1 = 'd4 Nf6 c4 g6 Nc3 Bg7 Be3 O-O h3 c5 dxc5 Na6 g3 Qa5 a3 Ne4 Bd2 Nxc3 bxc3 Nxc5 Nf3 Ne4 Rc1 Qxa3 Bg2 d6 O-O Nxd2 Qxd2 Be6 Nd4 Bxc4 Bxb7 Rab8 Ra1 Qc5 Ba6 Bxa6 Rxa6 Rfc8 Rc1 Bxd4 e3 Qc4 Raa1';

describe('the blockade set', () => {
  it('the knight takes on d5 and blockades the isolated pawn on d4 (exact sentence)', () => {
    const b = split(NXD5);
    expect(blockade(b.fenBefore, b.san)).toMatchObject({ kind: 'set', side: 'b', piece: 'n', square: 'd5', pawn: 'd4', passed: false, unkickable: true, knightSquares: 8 });
    expect(say(NXD5, 'your')).toBe('Your knight on d5 blockades their isolated pawn on d4. The pawn can\'t move, and no pawn of theirs can ever come to kick the knight off. From there the knight still covers eight squares, so it blocks without going passive. The isolated pawn is stuck where it stands.');
    // …and from the seat of the side whose pawn it is.
    expect(say(NXD5, 'their')).toMatch(/^Their knight on d5 blockades your isolated pawn on d4\. .*no pawn of yours/);
  });
  it('the rook to b8 stops their passed pawn on b7 — no praise a rook has not earned', () => {
    expect(say(RB8, 'their')).toBe('Their rook on b8 blockades your passed pawn on b7. The pawn can\'t move while the rook stays there. While the blockade holds, the passed pawn goes nowhere.');
  });
  it('the knight on d5, and no bishop of theirs for the light squares', () => {
    expect(say(ND5, 'your')).toMatch(/They have no bishop for the light squares to challenge it\./);
  });
});

describe('the blockade lifted', () => {
  it('the rook leaves a6, and their passed pawn on a7 can push again', () => {
    const b = split(RAA1);
    expect(blockade(b.fenBefore, b.san)).toMatchObject({ kind: 'lifted', side: 'w', piece: 'r', square: 'a6', pawn: 'a7' });
    expect(say(RAA1, 'your')).toMatch(/your rook .*their passed pawn on a7/);
  });
});

describe('negative controls', () => {
  // vc-IEnsliJAt3U-10, "The queen recaptures on d5 … an isolated-queen's-pawn
  // position" — a queen in front of the pawn is not the blockade lesson.
  it('a queen in front of the isolated pawn says nothing', () => {
    const b = split('e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5');
    expect(blockade(b.fenBefore, b.san)).toBeNull();
  });
  // vc-1rcEbI44WqE-85, "the knight takes, capturing on d7" — the knight leaves
  // e5 with a capture: the fork is the move's reason, and e6 is no passer.
  it('a blockader leaving with a capture, off an isolated pawn, says nothing', () => {
    const b = split('e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 Qd7 Nf3 Bg4 Be2 O-O-O c5 Nd5 Nxd5 Qxd5 Kf2 e6 h3 Bf5 Qa4 Qe4 Qa3 Qc2 b4 Be7 b5 Nb8 Qxa7 Bd3 Rhe1 Bxb5 Rab1 Qa4 Qxa4 Bxa4 Nd2 f6 Nc4 Bc6 Bf3 fxe5 Nxe5 Rhf8 Kg3 Bxf3 Nxf3 Nc6 Bf2 Rf6 Re4 Rd5 Rbe1 Kd7 Kh2 h6 Bg3 g5 Be5 Nxe5 Nxe5+ Kd8 Ng4 Rg6 Rf1 h5 Ne3 Rd7 Rb1 Kc8 Nc4 g4 Ne5 g3+ Kg1 Rf6 Nxd7');
    expect(blockade(b.fenBefore, b.san)).toBeNull();
  });
  it('the opening board has no blockade', () => {
    expect(blockade('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'Nf3')).toBeNull();
  });
});

describe('the one blockade read', () => {
  it('findBlockades lists the isolated pawn; findBlockade (knight or bishop on a passer) does not', () => {
    const b = split(NXD5);
    expect(findBlockades(b.fenAfter, 'b')).toEqual([{ blocker: 'd5', piece: 'n', pawn: 'd4', passed: false, isolated: true }]);
    expect(findBlockade(b.fenAfter, 'b')).toBeNull();
  });
});

describe('the registry read and its readers', () => {
  it('both seats through the registry', () => {
    const b = split(NXD5);
    const f = readBoard('blockade', { fenBefore: b.fenBefore, san: b.san, student: 'b' });
    expect(f?.computer).toBe('blockade');
    expect(f?.seat).toBe('student');
    expect(f?.squares).toEqual(['d5', 'd4']);
    const g = readBoard('blockade', { fenBefore: b.fenBefore, san: b.san, student: 'w' });
    expect(g?.seat).toBe('opponent');
    expect(g?.text).toMatch(/^Their knight on d5/);
  });
  it('the lesson / chat composer reads it', () => {
    const b = split(NXD5);
    const facts = moveThoughtFacts({
      plainThreatsSeen: false, story: false, theory: false, tense: 'past', fenBefore: b.fenBefore, san: b.san, moverIsStudent: true,
      prev: NO_PREV_CAPTURE, line: null, history: [], theirLast: null, phrases: null, costCp: 0, reads: null,
    } as never);
    expect(facts.some((x) => x.computer === 'blockade' && x.squares.includes('d5'))).toBe(true);
  });
});
