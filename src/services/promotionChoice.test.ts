import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { promotionChoicesOn, promotionChoiceLine, promotionPlayed, queenMissedLine } from './promotionChoice';
import { readBoard } from './boardComputers';
import { assemblePositionAssessment } from './groundedAnswer';

const play = (fen: string, sans: string): string => { const c = new Chess(fen); for (const s of sans.split(' ').filter(Boolean)) c.move(s); return c.fen(); };

// Danya, "A Guide to Underpromotion" — every board is his diagram played
// along his own line.
// The Saavedra study: after 5...Rd4, "6.c8=Q allows 6...Rc4+!! 7.Qxc4, when
// the Black monarch is stalemated" — 6.c8=R.
const SAAVEDRA = play('8/8/1KP5/3r4/8/8/8/k7 w - - 0 1', 'c7 Rd6+ Kb5 Rd5+ Kb4 Rd4+ Kb3 Rd3+ Kc2 Rd4');
// Reshko–Kaliniченко: after 1.Qe8 Qb7, "2...Qf7+ 3.Qxf7 the pawn is suddenly
// immobilized … underpromoting to a rook fails for the same reason" — 2.a8=B.
const RESHKO = play('8/P3Q1pk/5p1p/3q1P1K/6PP/8/8/8 w - - 0 1', 'Qe8 Qb7');
// Jones: after 67.Kd4 Rh1 68.Rxb7+ Kc6, "69.d8=N# — checkmate. Enough said."
const JONES = play('8/1pRP4/p7/1kP2p2/1p6/4K2r/P7/8 w - - 0 67', 'Kd4 Rh1 Rxb7+ Kc6');

describe('promotionChoice — his three underpromotions', () => {
  it('Saavedra: a rook, because the queen walks into …Rc4+ and the stalemate', () => {
    const [pc] = promotionChoicesOn(SAAVEDRA, null, null);
    expect(pc).toMatchObject({ san: 'c8=R', piece: 'r', reason: { kind: 'queen-trap', trap: { check: 'Rc4+', capture: 'Qxc4' } } });
    expect(promotionChoiceLine(pc, 'w', false)).toMatch(/make a rook, not a queen.*Rc4\+.*stalemate/);
  });

  it('Reshko: a bishop, because a queen and a rook both walk into …Qf7+', () => {
    const [pc] = promotionChoicesOn(RESHKO, null, null);
    expect(pc).toMatchObject({ san: 'a8=B', piece: 'b', alsoFails: ['r'], reason: { kind: 'queen-trap', trap: { check: 'Qf7+' } } });
    expect(promotionChoiceLine(pc, 'w', false)).toMatch(/A rook fails the same way/);
  });

  it('Jones: a knight, because it mates', () => {
    const [pc] = promotionChoicesOn(JONES, null, null);
    expect(pc).toMatchObject({ san: 'd8=N#', reason: { kind: 'knight-mates' } });
  });

  it('the engine\'s best move must agree (negative control)', () => {
    expect(promotionChoicesOn(SAAVEDRA, 'c7c8q', null)).toEqual([]);
    expect(promotionChoicesOn(SAAVEDRA, 'c7c8r', null)).toHaveLength(1);
  });

  it('a plain promotion keeps the queen (negative control)', () => {
    expect(promotionChoicesOn('8/1P6/8/8/8/8/k7/4K3 w - - 0 1', null, null)).toEqual([]);
  });
});

describe('promotionChoice — the move played', () => {
  it('c8=R played: the reason said of it; c8=Q played: the stalemate it walks into', () => {
    expect(promotionChoiceLine(promotionPlayed(SAAVEDRA, 'c8=R', null)!.choice, 'w', true)).toMatch(/^You make a rook, not a queen/);
    const q = promotionPlayed(SAAVEDRA, 'c8=Q', null);
    expect(q?.queenMissed).toBe(true);
    expect(queenMissedLine(q!.choice, 'b')).toMatch(/your chance to save it/);
  });

  it('through the registry — the one producer of the underpromotion\'s reason', () => {
    const f = readBoard('promotionChoice', { fenBefore: SAAVEDRA, san: 'c8=R', student: 'w', before: null });
    expect(f?.kind).toBe('technique');
    expect(f?.claims.some((c) => c.startsWith('stalemate-trap:c8=Q:Rc4+:'))).toBe(true);
    // The stalemate trick no longer says it a second way.
    expect(readBoard('stalemateTrick', { fenBefore: SAAVEDRA, san: 'c8=R', student: 'w' })).toBeNull();
  });

  it('the position read says which piece to make', () => {
    const a = assemblePositionAssessment({ line: null, tempting: null, evalCp: 500, mateIn: null, tactics: null, studentColor: 'white', fen: JONES, bestUci: 'd7d8n' });
    expect(a?.facts).toMatch(/make a knight, not a queen/);
  });
});

describe('the knight that checks where the queen does not (Danya, "A Guide to Underpromotion")', () => {
  // a-guide-to-underpromotion#4: d8=N+ wins (+315), d8=Q only holds (−9).
  const FEN = '8/1p1P1k1p/1p4pB/2pq1b2/6Q1/2P5/P5PP/4rRK1 w - - 0 27';
  const lines = [
    { rank: 1, evaluation: 315, mate: null, depth: 16, moves: 'd7d8n d5d8 g4c4 e1e6'.split(' ') },
    { rank: 2, evaluation: -8, mate: null, depth: 16, moves: 'd7d8r e1f1 g1f1 d5d8'.split(' ') },
    { rank: 3, evaluation: -9, mate: null, depth: 16, moves: 'd7d8q e1f1 g1f1 d5d8'.split(' ') },
  ];
  it('reads the knight promotion off the engine lines', () => {
    const p = promotionPlayed(FEN, 'd8=N+', lines);
    expect(p?.choice.reason.kind).toBe('knight-checks');
    expect(promotionChoiceLine(p!.choice, 'w', true)).toMatch(/^You make a knight, not a queen\. The knight on d8 comes with check/);
    expect(promotionPlayed(FEN, 'd8=Q', lines)?.queenMissed).toBe(true);
  });
  it('says nothing with no lines, or when the queen is as good', () => {
    expect(promotionPlayed(FEN, 'd8=N+', null)).toBeNull();
    const level = lines.map((l) => (l.moves[0] === 'd7d8q' ? { ...l, evaluation: 300 } : l));
    expect(promotionPlayed(FEN, 'd8=N+', level)).toBeNull();
  });
});
