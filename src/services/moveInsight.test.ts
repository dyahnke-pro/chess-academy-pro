// moveInsight — the coach's insight, read off real boards (David 2026-10-05:
// "Why was the knight to one square better than the other when they both
// checked the king???").
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { autopilotRecapture, doubleAttack, escapeSquareFirst, greekGift, positionPosed, lastMoveAlong, lastMoveFromPgn, mechanismContrast, moveMissed, positionAsk, theirMoveChanged, walkableLine } from './moveInsight';

// White: Ka1, Re2, Ng5. Black: Kh8, Qd8. Two checks — Nf7+ (forks king and
// queen) and Rh2+ (only checks).
const TWO_CHECKS = '3q3k/8/8/6N1/8/8/4R3/K7 w - - 0 1';

describe('doubleAttack — one piece, two targets', () => {
  it('finds the knight check that also hits the queen', () => {
    const d = doubleAttack(TWO_CHECKS, 'Nf7+');
    expect(d?.targets.map((t) => t.phrase)).toEqual(['the king', 'the queen on d8']);
  });
  it('a check that hits only the king is not a double attack', () => {
    expect(doubleAttack(TWO_CHECKS, 'Rh2+')).toBeNull();
  });
});

describe('mechanismContrast — why one check beats the other', () => {
  it('names what the better check hits and that the other only checks', () => {
    expect(mechanismContrast(TWO_CHECKS, 'Nf7+', 'Rh2+'))
      .toBe('The knight to f7 hits the king and the queen on d8 at once; the rook to h2 only checks.');
  });
  it('says nothing when the better move carries no double attack', () => {
    expect(mechanismContrast(TWO_CHECKS, 'Rh2+', 'Nf7+')).toBeNull();
  });
});

describe('moveMissed — what the student’s move actually does', () => {
  it('a check the king walks out of', () => {
    const m = moveMissed(TWO_CHECKS, 'Rh2+', ['h8g7']);
    expect(m?.text).toBe('The rook to h2 checks, but the king steps to g7 and nothing follows.');
    expect(m?.line?.plies.map((p) => p.san)).toEqual(['Rh2+', 'Kg7']);
  });
  it('a move that loses material along the reply', () => {
    // Qd4 walks into the rook on d8's file? No — Qe4 is taken by nothing; use
    // a queen move onto a square the rook covers: Qd5?? Rxd5.
    const fen = '3rk3/8/8/8/8/8/8/3QK3 w - - 0 1';
    const m = moveMissed(fen, 'Qd5', ['d8d5']);
    expect(m?.text).toBe("The queen to d5? Then the rook takes d5, and by the end of the line you come out more than a queen's worth down.");
  });
});

describe('positionAsk — what the position asks, never the move', () => {
  const HIT = '3rk3/8/8/8/3Q4/8/8/4K3 w - - 0 1'; // rook d8 hits the queen d4
  it('defend: a piece under fire', () => {
    const a = positionAsk(HIT);
    expect(a.mode).toBe('defend');
    expect(a.text).toBe('Their rook on d8 is hitting your queen on d4 — deal with that first.');
  });
  it('press: something stronger than defending, without naming the move', () => {
    const a = positionAsk(HIT, { bestSan: 'Qxd8+' });
    expect(a.mode).toBe('press');
    expect(a.text).toMatch(/something stronger than defending/);
    expect(a.text).not.toMatch(/d8\+|Qxd8|takes d8/);
  });
  it('press: the fork position points at the idea, not the square', () => {
    const a = positionAsk(TWO_CHECKS, { bestSan: 'Nf7+' });
    expect(a.mode).toBe('press');
    expect(a.text).toMatch(/check that does more than check/);
    expect(a.text).not.toMatch(/f7/);
  });
  it('improve: a quiet start position', () => {
    expect(positionAsk('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1').mode).toBe('improve');
  });
  it('in check: the king first', () => {
    expect(positionAsk('4k3/8/8/8/8/8/8/r3K3 w - - 0 1').mode).toBe('defend');
  });
});

describe('walkableLine — arrows + Walk for any spoken line', () => {
  it('stops at the first illegal move', () => {
    const l = walkableLine(TWO_CHECKS, ['Nf7+', 'Kg8', 'Nxd8', 'Zz9'], 'Nf7+');
    expect(l?.plies.map((p) => p.san)).toEqual(['Nf7+', 'Kg8', 'Nxd8']);
  });
});

// Naroditsky catalogue §1, measured on his Four Pawns Alekhine (vc-1rcEbI44WqE).
const G1 = 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 Qd7 Nf3 Bg4 Be2 O-O-O c5 Nd5 Nxd5 Qxd5 Kf2 e6 h3 Bf5 Qa4 Qe4 Qa3 Qc2 b4 Be7 b5 Nb8 Qxa7 Bd3 Rhe1 Bxb5 Rab1 Qa4 Qxa4 Bxa4 Nd2 f6 Nc4 Bc6 Bf3 fxe5 Nxe5 Rhf8 Kg3 Bxf3 Nxf3 Nc6 Bf2 Rf6 Re4 Rd5 Rbe1 Kd7 Kh2 h6 Bg3 g5 Be5 Nxe5 Nxe5+ Kd8 Ng4 Rg6 Rf1 h5 Ne3 Rd7 Rb1 Kc8 Nc4 g4 Ne5 g3+ Kg1 Rf6 Nxd7 Kxd7'.split(' ');
const g1Before = (ply: number): string => { const c = new Chess(); for (let i = 0; i < ply; i += 1) c.move(G1[i]); return c.fen(); };

describe('theirMoveChanged — what their move changed (catalogue §1)', () => {
  it('35...Kd8 — "the king must leave d7, weakening e6"', () => {
    expect(theirMoveChanged(g1Before(69), 'Kd8', 'w')?.text)
      .toBe('The king to d8, and now only the rook on f6 guards their pawn on e6.');
  });
  it('18...Nb8 — "so you can simply grab the a7-pawn"', () => {
    expect(theirMoveChanged(g1Before(35), 'Nb8', 'w')?.text).toMatch(/their pawn on a7 has no defender and is already attacked/);
  });
  it('43...Kxd7 — b7, the long-term weakness, is hanging', () => {
    expect(theirMoveChanged(g1Before(85), 'Kxd7', 'w')?.text).toMatch(/their pawn on b7 has no defender and is already attacked/);
  });
  it('a pawn no one can reach is not insight: 10...O-O-O says nothing about f7', () => {
    expect(theirMoveChanged(g1Before(19), 'O-O-O', 'w')?.text ?? '').not.toMatch(/f7/);
  });
  it('never reads the student’s own move as theirs', () => {
    expect(theirMoveChanged(g1Before(68), 'Nxe5+', 'w')).toBeNull();
  });
  it('positionAsk leads with it when given the last move', () => {
    const fen = g1Before(70);
    const a = positionAsk(fen, { lastMove: { fenBefore: g1Before(69), san: 'Kd8' } });
    expect(a.text.startsWith('The king to d8, and now only the rook on f6 guards their pawn on e6.')).toBe(true);
  });
});

describe('lastMoveAlong / lastMoveFromPgn', () => {
  it('rebuilds the last move and the board it was played from', () => {
    const start = new Chess().fen();
    expect(lastMoveAlong(start, ['e2e4', 'e7e5'])).toEqual({ fenBefore: g1Before(1), san: 'e5' });
    expect(lastMoveFromPgn('1. e4 Nf6')?.san).toBe('Nf6');
  });
});

describe('moveMissed — your own move\u2019s drawback (catalogue §35)', () => {
  it('a move that leaves a piece unguarded, and the reply that takes it', () => {
    // The queen on d1 is the only guard of e2; Qa4 walks away and Rxe2 follows.
    const m = moveMissed('4r1k1/8/8/8/8/8/4P3/3Q2K1 w - - 0 1', 'Qa4', ['e8e2']);
    expect(m?.text).toBe('The queen to a4 leaves your pawn on e2 with no guard, and the rook takes e2.');
  });
});

describe('theirMoveChanged — what they want (catalogue §2)', () => {
  it('names the concrete threat their move just made', () => {
    const t = theirMoveChanged('r5k1/5ppp/8/8/8/8/R4PPP/6K1 b - - 0 1', 'Re8', 'w');
    expect(t?.text).toMatch(/^The rook to e8 threatens the rook to e1/);
    expect(t?.text).toMatch(/mate/);
  });
});

describe('autopilotRecapture — the in-between move (catalogue §9)', () => {
  it('flags the straight recapture when a check comes first', () => {
    // Black just took on d4 with the knight; White's Qxd4 is autopilot — Bb5+ first.
    const lastBefore = 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3';
    const fen = new Chess(lastBefore); fen.move('exd4');
    expect(autopilotRecapture(fen.fen(), 'Nxd4', 'Bb5', { fenBefore: lastBefore, san: 'exd4' })).toBeNull(); // Bb5 is quiet — nothing to flag
    expect(autopilotRecapture(fen.fen(), 'Nxd4', 'Qxd4', { fenBefore: lastBefore, san: 'exd4' })).toBeNull(); // both recapture
    const lb2 = 'rnbqkbnr/pppp1ppp/8/4p3/2BPP3/5N2/PPP2PPP/RNBQK2R b KQkq - 0 3';
    const f2 = new Chess(lb2); f2.move('exd4');
    expect(autopilotRecapture(f2.fen(), 'Nxd4', 'Bxf7+', { fenBefore: lb2, san: 'exd4' }))
      .toBe('Taking straight back is the autopilot move — there is a check to play first, and the recapture can wait.');
  });
});

describe('greekGift — his article, read off the board', () => {
  // Classic French-style setup: Bd3, Nf3, e5, Black castled with no knight on f6.
  const FEN = 'r1bq1rk1/pppnbppp/4p3/3pP3/3P4/3B1N2/PPP2PPP/R1BQK2R w KQ - 0 8';
  it('names the pattern when the best move is the sacrifice', () => {
    expect(greekGift(FEN, 'Bxh7+')?.text).toMatch(/^This is the Greek gift: the bishop gives itself on h7 with check, the knight jumps in on g5/);
  });
  it('says nothing for another best move', () => {
    expect(greekGift(FEN, 'O-O')).toBeNull();
  });
});

describe('positionAsk — is the threat real? (his "How To Ignore A Threat And Win")', () => {
  // The rook on a8 hits the a2-pawn; when the best move is quiet and leaves it, the
  // coach says the threat is not the issue.
  const FEN = 'r3k3/8/8/8/8/8/P7/4K2R w K - 0 1';
  it('a quiet best move that leaves the attacked piece → not the real issue', () => {
    const a = positionAsk(FEN, { bestSan: 'Kd2' });
    expect(a.mode).toBe('improve');
    expect(a.text).toMatch(/pawn on a2, but that is not the real issue here/);
  });
  it('a best move that defends it → defend', () => {
    expect(positionAsk(FEN, { bestSan: 'a3' }).mode).toBe('defend');
  });
});
describe('greekGift hint withholds the square', () => {
  it('hint names the pattern only', () => {
    const g = greekGift('r1bq1rk1/pppnbppp/4p3/3pP3/3P4/3B1N2/PPP2PPP/R1BQK2R w KQ - 0 8', 'Bxh7+');
    expect(g?.hint).not.toMatch(/h7|g5/);
  });
});

describe('escapeSquareFirst — take the escape square away first (catalogue §36)', () => {
  // Re8+ is check but the king escapes to h7; Bd3 covers h7 first, then Re8 is mate.
  const FEN = '7k/p5p1/7p/8/8/8/8/4RBK1 w - - 0 1';
  it('explains the quiet move', () => {
    expect(escapeSquareFirst(FEN, 'Bd3')?.text)
      .toBe('The rook to e8 would be check, but the king escapes to h7. The bishop to d3 takes h7 away first — then that check is mate.');
  });
  it('the hint withholds the move and the square', () => {
    const h = escapeSquareFirst(FEN, 'Bd3')?.hint ?? '';
    expect(h).not.toMatch(/h7|d3|e8/);
    expect(positionAsk(FEN, { bestSan: 'Bd3' }).text).toContain(h);
  });
  it('not for a forcing best move', () => {
    expect(escapeSquareFirst(FEN, 'Re8+')).toBeNull();
  });
});

describe('moveMissed — handing them a tempo (catalogue §37)', () => {
  it('...Nc6 lets d5 come with tempo', () => {
    const fen = 'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2';
    expect(moveMissed(fen, 'Nc6', ['d4d5'])?.text).toBe('The knight to c6? Then the pawn to d5 comes with tempo, hitting your knight on c6.');
  });
});

describe('positionPosed — the diagnosis half (both ways)', () => {
  it('the escape-square position poses missed-tactic', () => {
    expect(positionPosed('7k/p5p1/7p/8/8/8/8/4RBK1 w - - 0 1', { bestSan: 'Bd3' }).map((p) => p.tag)).toEqual(['missed-tactic']);
  });
  it('their threatening last move poses missed-opponents-threat', () => {
    const before = 'r5k1/5ppp/8/8/8/8/R4PPP/6K1 b - - 0 1';
    const c = new Chess(before); c.move('Re8');
    expect(positionPosed(c.fen(), { lastMove: { fenBefore: before, san: 'Re8' } }).map((p) => p.tag)).toContain('missed-opponents-threat');
  });
  it('every miss carries the tag it is evidence of', () => {
    expect(moveMissed('rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2', 'Nc6', ['d4d5'])?.tag).toBe('tempo-handed');
    expect(moveMissed('4r1k1/8/8/8/8/8/4P3/3Q2K1 w - - 0 1', 'Qa4', ['e8e2'])?.tag).toBe('hung-material');
  });
});
