// verdictWithReasons — the reasons behind the engine's verdict, the one or two
// that fit it and never one against it (WO-DANYA-READS-01 #2). Boards: Danya's
// Chess.com article diagrams (reference only, never quoted), each with
// Stockfish's depth-16 evaluation (White's view) and best line.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { verdictWithReasons, boardReasons, type ReasonKind } from './verdictWithReasons';
import { evalReading } from './reviewMoveBriefing';
import { assemblePositionAssessment } from './groundedAnswer';

const NONE: ReadonlySet<ReasonKind> = new Set();
const lines = (s: string): { moves: string[] }[] => [{ moves: s.split(' ') }];

describe('verdictWithReasons', () => {
  it('a king stranded in the middle explains +1.16 with the material even (the-knockout-blow #2)', () => {
    const fen = '3rr3/pp1k2pp/2n1p3/3p1q2/8/1P3NP1/1PP1QPP1/3RR1K1 w - - 0 19';
    const v = verdictWithReasons({ fen, evalCp: 116, mate: null, lines: lines('c2c3 d7c7 b3b4 a7a6 b4b5 a6b5 e2b5 d5d4'), student: 'w', lastMove: null, said: NONE })!;
    expect(v.favoured).toBe('w');
    expect(v.reasons[0].kind).toBe('king-centre');
    expect(v.text).toBe('Their king on d7 is still in the middle, and it can no longer castle.');
    // Board truth: the king stands on d7, Black has no castling rights, White has castled.
    const c = new Chess(fen);
    expect(c.get('d7')).toEqual({ type: 'k', color: 'b' });
    expect(c.getCastlingRights('b')).toEqual({ k: false, q: false });
  });

  it('space explains +1.21 (the-positional-sacrifice #1)', () => {
    const fen = 'rn1qr1k1/p4p2/1p1p1bpp/2pP4/4PP2/2N3N1/PP2Q1PP/R4RK1 w - - 0 15';
    const v = verdictWithReasons({ fen, evalCp: 121, mate: null, lines: lines('e2d2 f6c3 b2c3 b8d7 a1e1 d8h4 d2f2 a7a6'), student: 'w', lastMove: null, said: NONE })!;
    // Three pawns are not listed square by square: the board lights them.
    expect(v.text).toBe('Your centre pawns give you more space.');
    expect(v.squares).toEqual(['d5', 'e4', 'f4']);
  });

  it('never a reason against the verdict: the side down the piece has the initiative, and the reason said is the piece (the-art-of-maneuvering #2)', () => {
    const fen = '2k4r/1p2p1bp/p5p1/q2rPb2/2pB4/2P5/P2Q1NPP/2R1KB1R b K - 0 18';
    const all = boardReasons(fen, 'b', lines('d5d4 c3d4 a5d2 e1d2 g7h6 d2d1 h6c1 d1c1'), null);
    expect(all.some((r) => r.kind === 'initiative' && r.side === 'b')).toBe(true);
    const v = verdictWithReasons({ fen, evalCp: 201, mate: null, lines: lines('d5d4 c3d4 a5d2 e1d2 g7h6 d2d1 h6c1 d1c1'), student: 'b', lastMove: null, said: NONE })!;
    expect(v.reasons.every((r) => r.side === 'w')).toBe(true);
    expect(v.text).toBe("They're up material: a piece for a pawn.");
  });

  it('on a level board, the initiative (the-greek-gift-sacrifice-lives-on #3, +0.34)', () => {
    const fen = 'r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16';
    const v = verdictWithReasons({ fen, evalCp: 34, mate: null, lines: lines('d3h7 g8h7 f3g5 h7g6 b2b4 c5d7 e2e4 f7f5'), student: 'w', lastMove: null, said: NONE })!;
    expect(v.favoured).toBeNull();
    expect(v.reasons.map((r) => r.kind)).toEqual(['initiative']);
  });

  it('a kind the surface already says is not picked (how-to-avoid-blunders-part-1 #3: a pawn up, +0.50)', () => {
    const fen = '2r5/4p3/3p1npk/3n2N1/5P1N/1P1r2P1/4R1KP/4R3 w - - 0 1';
    const v = verdictWithReasons({ fen, evalCp: 50, mate: null, lines: lines('h4f3 h6g7 g5e6 g7h6 f3d4 c8c3 g2f1 f6g4'), student: 'w', lastMove: null, said: NONE })!;
    expect(v.text).toBe("You're up a pawn.");
    expect(verdictWithReasons({ fen, evalCp: 50, mate: null, lines: null, student: 'w', lastMove: null, said: new Set<ReasonKind>(['material']) })).toBeNull();
  });

  it('negative controls: no reason fits → silence; a mate → no reasons', () => {
    const start = new Chess().fen();
    expect(verdictWithReasons({ fen: start, evalCp: 30, mate: null, lines: null, student: 'w', lastMove: null, said: NONE })).toBeNull();
    // An eval the board shows no reason for is not given one.
    expect(verdictWithReasons({ fen: start, evalCp: 200, mate: null, lines: null, student: 'w', lastMove: null, said: NONE })).toBeNull();
    expect(verdictWithReasons({ fen: start, evalCp: 100000, mate: 3, lines: null, student: 'w', lastMove: null, said: NONE })).toBeNull();
  });
});

describe('the reasons reach the surfaces', () => {
  it('Review\'s standing never falls back to an uncounted "the more active"', () => {
    // 1.e4: a band change with no board reason → the verdict alone (the old
    // fallback said "your pieces are the more active" here).
    const c = new Chess(); c.move('e4');
    const text = evalReading(c.fen(), 0, 100, null, 'w', null, null)!;
    expect(text).not.toMatch(/more active/);
    expect(text).toBe("You're slightly better.");
  });

  it('the position read carries the reason (the-knockout-blow #2)', () => {
    const fen = '3rr3/pp1k2pp/2n1p3/3p1q2/8/1P3NP1/1PP1QPP1/3RR1K1 w - - 0 19';
    const a = assemblePositionAssessment({ tempting: null, evalCp: 116, mateIn: null, studentColor: 'white', fen, bestUci: 'c2c3', line: 'c2c3 d7c7 b3b4 a7a6 b4b5 a6b5 e2b5 d5d4'.split(' ') })!;
    expect(a.facts).toContain('Their king on d7 is still in the middle, and it can no longer castle.');
    expect(a.keySquares).toContain('d7');
  });
});

describe('verdictWithReasons — space on the one rule (ownsMoreSpace)', () => {
  it('knights on the rim #2: a territory of 6 to 3 is the reason White stands better', () => {
    // Danya: "White has a massive space advantage". The read kept its own
    // four-square margin and said "slightly better" with no reason.
    const fen = '2kr3r/1b1nqpn1/1p1p2p1/p1pPp2p/P1P1P2P/1NPBBPP1/3Q4/2KR3R w - - 0 20';
    const v = verdictWithReasons({ fen, evalCp: 105, mate: null, lines: lines('c1b1 b7a6 b3a1 d8g8 a1c2 g7e8 b1a1 f7f6 d1b1 g6g5'), student: 'w', lastMove: null, said: NONE });
    expect(v?.reasons.map((r) => r.kind)).toContain('space');
    expect(v?.text).toMatch(/give you more space/);
  });
  it('no space reason when the territory differs by a single square (positional combinations #0)', () => {
    const fen = 'r1b1r1k1/1pqn1ppp/p1pb1n2/5N2/2B1P3/2N4P/PPQ2PP1/R1BR2K1 b - - 0 14';
    expect(boardReasons(fen, 'b', lines('d6h2 g1h1 d7b6 c4f1 c8f5 e4f5 h2f4 c1f4 c7f4 g2g3'), null).some((r) => r.kind === 'space')).toBe(false);
  });
});
