import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { intoTheirCamp, intoTheirCampLine, campIdea } from './intoTheirCamp';
import { readBoard } from './boardComputers';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';

// Every board is a real game board from Danya's speedruns
// (public/data/voiced-teachings.json: the note's `lineSan` played from the
// start, its last move the move read). The note id is named on each.
const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
const line = (fen: string, san: string, own: 'your' | 'their'): string => {
  const x = intoTheirCamp(fen, san);
  if (!x) throw new Error(`no camp idea for ${san}`);
  return intoTheirCampLine(x, own, after(fen, san));
};

describe('infiltration: a piece gets into their half and hits what they cannot keep', () => {
  // vc-k9lpwbZ1Cyw-49, "You infiltrate with the rook to d7."
  const RD7 = '1r3r1k/4p2p/p1p3pq/8/P1N1P3/2P3QP/1P3PP1/3RR1K1 w - - 2 25';
  it('the rook gets in on d7 through the open d-file and hits the pawn on e7', () => {
    const x = intoTheirCamp(RD7, 'Rd7');
    expect(x).toMatchObject({ kind: 'infiltration', moved: { piece: 'r', from: 'd1', to: 'd7' }, route: { kind: 'open-file', file: 'd' } });
    expect(x!.targets.map((t) => t.square)).toEqual(['e7']);
    expect(line(RD7, 'Rd7', 'your')).toMatch(/Your rook .*through the open d-file.*their pawn on e7/);
  });
  it('a rook that can simply be taken on the entry square says nothing (Rd8, the b8 rook takes it)', () => {
    expect(intoTheirCamp(RD7, 'Rd8')).toBeNull();
  });
  // vc-pXBR9CxK3lQ-44, "Black plants the rook on d3, deep in your position" — their seat.
  it('their rook on d3, said from the student\'s seat', () => {
    const FEN = '3r1rk1/pp3ppp/2n1b3/4P3/8/1BP2N1P/P4PP1/R3R1K1 b - - 10 22';
    expect(intoTheirCamp(FEN, 'Rd3')).toMatchObject({ kind: 'infiltration', targets: [{ square: 'c3' }] });
    expect(line(FEN, 'Rd3', 'their')).toMatch(/^Their rook .*your half|^Their rook .*your camp/);
    expect(line(FEN, 'Rd3', 'their')).toMatch(/your pawn on c3/);
  });
  // vc-3UqPa5eV2e0-41, "The knight jumps into the c6 outpost, deep in their position."
  it('the knight jumps into the hole on c6 and hits the queen on b8', () => {
    const FEN = 'rq2k1r1/3nbp2/p2p4/N2npBpp/2R5/4B3/1PP2PPP/Q3R1K1 w q - 2 21';
    expect(intoTheirCamp(FEN, 'Nc6')).toMatchObject({ kind: 'infiltration', route: { kind: 'hole' } });
    expect(line(FEN, 'Nc6', 'your')).toMatch(/knight .*their queen on b8/);
  });
  // vc-3nyxVHwDCTY-74, "your rook infiltrates to c2 with check" — a check is the sharper fact's.
  it('a rook that comes in with check is left to the check', () => {
    expect(intoTheirCamp('2r3k1/1p3p1p/3p2p1/3P4/1P1p4/5PP1/P4K1P/8 b - - 1 35', 'Rc2+')).toBeNull();
  });
});

describe('the seventh rank', () => {
  // vc-1rcEbI44WqE-89, "You reach the seventh rank with the rook to f7."
  it('the rook reaches the seventh on f7 and presses the bishop on e7 (guarded: pressed, not won)', () => {
    const FEN = '8/1ppkb3/4p1r1/2P4p/3PR3/6pP/P5P1/5RK1 w - - 2 45';
    const x = intoTheirCamp(FEN, 'Rf7');
    expect(x).toMatchObject({ kind: 'infiltration', targets: [{ square: 'e7', won: false }] });
    expect(line(FEN, 'Rf7', 'your')).toMatch(/Your rook .*seventh .*f7 through the open f-file\. It presses their bishop on e7 from the side\./);
  });
  // vc-1rcEbI44WqE-99, "you double on the seventh with the rook to f7" — the
  // existing `rooksOnSeventh` read, called as it stands.
  it('both rooks on the seventh: the structure read\'s own sentence for the student, theirs for the opponent', () => {
    const FEN = '4k3/1pp4R/4p1r1/2P3b1/3P1R1p/6pP/P5P1/6K1 w - - 6 50';
    const x = intoTheirCamp(FEN, 'Rff7');
    expect(x).toMatchObject({ kind: 'seventh-doubled', rooks: ['f7', 'h7'], key: 'rooks-on-seventh' });
    expect(line(FEN, 'Rff7', 'your')).toMatch(/^Both your rooks are on the seventh now/);
    expect(line(FEN, 'Rff7', 'their')).toMatch(/^Both their rooks are on the seventh now, on f7 and h7\. They hit your pawns on b7 and c7 from the side\. Your king/);
  });
});

describe('the rook lift and the swing', () => {
  // vc-jwFOi039eeg-39, "You lift the rook to f3." — the move `findRookLift` finds.
  it('the rook lifts to f3, toward their king on g8', () => {
    const FEN = '3r2k1/ppp1q3/1nn1pp1p/8/2PP4/4B3/PP1QB1PP/5RK1 w - - 0 20';
    expect(intoTheirCamp(FEN, 'Rf3')).toMatchObject({ kind: 'lift', moved: { from: 'f1', to: 'f3' } });
    expect(line(FEN, 'Rf3', 'your')).toMatch(/f3.*their king on g8/);
  });
  // vc-WSEAjQgHpYs-41, "White plays a rook to f3" — the opponent's lift.
  it('their lift, from the student\'s seat', () => {
    const FEN = '2r2rk1/1b2qppp/p3p3/1p1pN3/3BnP2/1PP5/P1B3PP/R4RK1 w - - 8 21';
    expect(line(FEN, 'Rf3', 'their')).toMatch(/your king on g8/);
  });
  // vc-hw9tEjYabd8-31, "You lift the rook to e3" — but the bishop on f4 and the
  // knight on g5 block every file toward the king, so the lift reader refuses.
  it('a lift with no file toward their king stays quiet', () => {
    expect(intoTheirCamp('r4rk1/pp1b1pp1/1q1Pp1p1/3p2N1/1n3B2/8/PPP2PPP/R2QR1K1 w - - 4 16', 'Re3')).toBeNull();
  });
  // vc-mIzJ3LYZvKw-41, "You lift the rook to g3" — the rook already up on a3 swings across.
  it('the rook on a3 swings to g3 and looks up the g-file at the pawn on g7', () => {
    const FEN = 'r3r1k1/pb3ppp/8/2p1N3/3pPB2/R7/2q2PPP/4R1K1 w - - 6 21';
    expect(intoTheirCamp(FEN, 'Rg3')).toMatchObject({ kind: 'swing', targets: [{ square: 'g7' }] });
    expect(line(FEN, 'Rg3', 'your')).toMatch(/g3.*their pawn on g7.*king on g8|g3, toward their king on g8\. Up the g-file it hits their pawn on g7/);
  });
});

describe('connecting the rooks', () => {
  // vc-38QzSkFRn4E-28, "So Bd7, the only clean developing move, connecting the rooks."
  it('the bishop leaves c8, the last piece between the rooks on a8 and h8', () => {
    const FEN = 'r1b4r/1pk2ppp/p3pn2/4b3/4N3/3B4/PPP3PP/R1B2RK1 b - - 1 14';
    expect(intoTheirCamp(FEN, 'Bd7')).toMatchObject({ kind: 'connect', rooks: ['a8', 'h8'] });
    expect(line(FEN, 'Bd7', 'your')).toMatch(/your rooks|rooks on a8 and h8/i);
  });
  // vc-_zT8aWZh2x0-29, "The queen to d2, connecting the rooks" — their move in that game.
  it('their queen off d1 connects their rooks on a1 and f1', () => {
    const FEN = '2rq1rk1/1p1nppbp/p2p1np1/P2P4/3B4/2N5/1PP1BPPP/R2Q1RK1 w - - 2 15';
    expect(line(FEN, 'Qd2', 'their')).toMatch(/their rooks on a1 and f1/);
  });
  // vc-1rcEbI44WqE-25, "the king to f2 … connecting the rooks" — but the queen
  // on d1 still stands between them, so the board says no.
  it('the king steps off but the queen is still in the way: quiet', () => {
    expect(intoTheirCamp('2kr1b1r/ppp1pppp/2n5/2PqP3/3P2b1/4BN2/PP2B1PP/R2QK2R w KQ - 0 13', 'Kf2')).toBeNull();
  });
  // vc-1zfJ7ABoh8k-23, move 12, "You keep the storm rolling with a4": the
  // bishop on c1 and the queen on d1 still sit between the rooks.
  it('on move 12, rooks still cut off: the pieces in the way are named, once', () => {
    const FEN = '2kr1b1r/ppqnpppp/5n2/1Pp4b/8/2NP2PP/P1P1NPB1/R1BQ1RK1 w - - 0 12';
    expect(intoTheirCamp(FEN, 'a4')).toMatchObject({ kind: 'cut-off', rooks: ['a1', 'f1'], between: [{ square: 'c1' }, { square: 'd1' }] });
    expect(line(FEN, 'a4', 'your')).toMatch(/the bishop on c1 and the queen on d1/);
    // The same board a move later says nothing: once a game.
    const later = FEN.replace(/ 12$/, ' 13');
    expect(intoTheirCamp(later, 'a4')).toBeNull();
  });
});

describe('one registry, one composer', () => {
  const RD7 = '1r3r1k/4p2p/p1p3pq/8/P1N1P3/2P3QP/1P3PP1/3RR1K1 w - - 2 25';
  it('comes out of the registry with the seat', () => {
    const f = readBoard('intoTheirCamp', { fenBefore: RD7, san: 'Rd7', student: 'w' });
    expect(f?.computer).toBe('intoTheirCamp');
    expect(f?.seat).toBe('student');
    const g = readBoard('intoTheirCamp', { fenBefore: RD7, san: 'Rd7', student: 'b' });
    expect(g?.seat).toBe('opponent');
    expect(g?.text).toMatch(/^Their rook/);
  });
  it('carries one idea per kind', () => {
    expect(campIdea('camp-in:d1d7')).toBe('pressure');
    expect(campIdea('camp-lift:f1f3')).toBe('attack-king');
    expect(campIdea('camp-connect:b')).toBe('develop');
  });
  it('the lesson / Review move thought carries the infiltration', () => {
    const facts = moveThoughtFacts({
      plainThreatsSeen: false, story: false, theory: false, tense: 'past', fenBefore: RD7, san: 'Rd7', moverIsStudent: true,
      prev: NO_PREV_CAPTURE, line: null, history: [], theirLast: null, phrases: null, costCp: 0, reads: null,
    } as never);
    expect(facts.some((f) => f.computer === 'intoTheirCamp' && f.squares.includes('d7'))).toBe(true);
  });
});
