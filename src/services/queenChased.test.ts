import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { queenChased, queenChasedLine } from './queenChased';
import { readBoard } from './boardComputers';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';

// Every board is a real game board from Danya's speedruns
// (public/data/voiced-teachings.json: the note's `lineSan` played from the
// start, its last move the move read). The note id is named on each.
const split = (line: string): { history: string[]; san: string; fenBefore: string; fenAfter: string } => {
  const sans = line.split(' ');
  const c = new Chess();
  for (const s of sans.slice(0, -1)) c.move(s);
  const fenBefore = c.fen();
  c.move(sans[sans.length - 1]);
  return { history: sans.slice(0, -1), san: sans[sans.length - 1], fenBefore, fenAfter: c.fen() };
};
const say = (line: string, own: 'your' | 'their'): string => {
  const b = split(line);
  const q = queenChased(b.history, b.san);
  if (!q) throw new Error(`no chase for ${b.san}`);
  return queenChasedLine(q, own, b.fenAfter);
};

// vc-26ZXZEiudhA-5, "You develop the knight to c3 with tempo, hitting the
// queen on d5 and gaining a free move." — the Scandinavian.
const SCANDI = 'e4 d5 exd5 Qxd5 Nc3';
// vc-NnQmNvrOmCI-11, "Ng5 … hits the queen … a lead in development buys you
// that liberty" — the queen's fourth move is coming, no Black piece out.
const NG5 = 'e4 e5 d4 c6 dxe5 Qa5+ Nc3 Qxe5 Nf3 Qe6 Ng5';
// vc-WSEAjQgHpYs-10, "You play a knight to c6, hitting the queen." — Black
// chases White's queen (the student is Black).
const NC6 = 'e4 c5 d4 cxd4 c3 d5 Qxd4 Nf6 e5 Nc6';
// vc-hv0P9kotpJw-13, "You answer with the rook to b1, kicking the queen" —
// a rook hits it: no piece developed with the hit.
const RB1 = 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Nc3 Bb4 Rb1';

describe('the early queen chased with tempo', () => {
  it('Scandinavian: the knight to c3 hits the queen on d5, one queen move against no piece out', () => {
    const b = split(SCANDI);
    expect(queenChased(b.history, b.san)).toMatchObject({ queenSide: 'b', queen: 'd5', hitter: { piece: 'n', square: 'c3' }, queenMoves: 1, developed: 0, develops: true });
    // Exact sentence for the student who chases (rotation keyed on the board).
    expect(say(SCANDI, 'their')).toBe('Their queen is out on d5 already, with no pieces developed behind it. Your knight on c3 attacks it, and it must move again. Every move the queen spends running is one you spend developing.');
    // …and the warning, the same board from the queen's seat.
    expect(say(SCANDI, 'your')).toBe('Your queen is out on d5 already, with no pieces developed behind it. Their knight on c3 attacks it, and it must move again. Every move your queen spends running is one they spend developing.');
  });
  it('the count: their queen on e6 has moved three times with no piece out, the knight on g5 hits it', () => {
    const b = split(NG5);
    expect(queenChased(b.history, b.san)).toMatchObject({ queen: 'e6', queenMoves: 3, developed: 0, develops: false });
    expect(say(NG5, 'their')).toBe('Their queen on e6 has moved three times, and they have no pieces out. Your knight on g5 hits it, so it has to move again.');
  });
  it('Black chases White\'s queen: the knight to c6 hits the queen on d4', () => {
    expect(say(NC6, 'their')).toMatch(/^Their queen .*d4.*Your knight on c6/);
    expect(say(NC6, 'your')).toMatch(/^Your queen .*d4.*Their knight on c6/);
  });
  it('a rook hits it: the count is said, the developing gain is not', () => {
    expect(say(RB1, 'their')).toBe('Their queen on b2 has moved three times, and they have two pieces out. Your rook on b1 hits it, so it has to move again.');
  });
});

describe('negative controls', () => {
  // vc-1PI3xfMiUE4-22, "Black pins with the bishop to g4. You must move the
  // queen" — the queen on d1 never left home: no early queen.
  it('a queen still on its home square is no early queen', () => {
    const b = split('e4 e5 Nf3 Nc6 Nc3 Bc5 Bc4 d6 Nxe5 dxe5 d3 Qf6 O-O Nge7 Kh1 O-O f4 exf4 Bxf4 Qg6 Bxc7 Bg4');
    expect(queenChased(b.history, b.san)).toBeNull();
  });
  // vc-NQQnQ9X9dL8-17, "the knight to a4, jabbing at the black queen on c5" —
  // Black already has three pieces out: the queen is not behind.
  it('three knights and bishops out: the queen is not behind', () => {
    const b = split('d4 Nf6 Nc3 d5 Bf4 c5 e3 Nc6 dxc5 Qa5 Nf3 Qxc5 a3 e6 Qd2 Be7 Na4');
    expect(queenChased(b.history, b.san)).toBeNull();
  });
  it('a move that does not hit the queen (Scandinavian, Nf3 instead)', () => {
    expect(queenChased(['e4', 'd5', 'exd5', 'Qxd5'], 'Nf3')).toBeNull();
  });
});

describe('the registry read and its readers', () => {
  it('both seats through the registry, with the history checked against the board', () => {
    const b = split(SCANDI);
    const f = readBoard('queenChased', { history: b.history, fenBefore: b.fenBefore, san: b.san, student: 'w' });
    expect(f?.computer).toBe('queenChased');
    expect(f?.seat).toBe('student');
    expect(f?.squares).toEqual(['d5', 'c3']);
    const g = readBoard('queenChased', { history: b.history, fenBefore: b.fenBefore, san: b.san, student: 'b' });
    expect(g?.seat).toBe('opponent');
    expect(g?.text).toMatch(/^Your queen/);
    // Another game's moves: the count would be of another queen.
    expect(readBoard('queenChased', { history: [], fenBefore: b.fenBefore, san: b.san, student: 'w' })).toBeNull();
  });
  it('the lesson / chat composer reads it', () => {
    const b = split(SCANDI);
    const facts = moveThoughtFacts({
      plainThreatsSeen: false, story: false, theory: false, tense: 'past', fenBefore: b.fenBefore, san: b.san, moverIsStudent: true,
      prev: NO_PREV_CAPTURE, line: null, history: b.history, theirLast: null, phrases: null, costCp: 0, reads: null,
    } as never);
    expect(facts.some((x) => x.computer === 'queenChased' && x.squares.includes('d5'))).toBe(true);
  });
});
