/**
 * REPLAY FENCE — Damiano Defence, 1000-rated (lichess u2HWiU93, student White),
 * walked by hand 2026-09-27. Flagged lines replayed on the real positions;
 * engine lines are real Stockfish (stockfish-18-lite, d16) unless noted.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { namedPawnStructure } from './positionReadingService';
import { buildDeliberation } from './deliberation';
import { computeMoveFundamentals } from './moveFundamentals';
import { callInaccuracyDetailed } from './inaccuracyCall';
import { readConversion } from './conversionMethod';
import { classifyMatchup } from './endgameMatchup';

const GAME = 'e4 e5 Nf3 f6 d4 d6 d5 a6 Bd3 Ne7 O-O h5 Nc3 h4 h3 Bxh3 gxh3 Qc8 Kg2 g5 Rh1 Bg7 Be3 b5 Qe2 b4 Na4 O-O c3 bxc3 Nxc3 g4 hxg4 Qxg4+ Kf1 h3 Rg1 Qh5 Nh2 Qxe2+ Bxe2 a5 a4 Na6 Bxa6 Rxa6 Nb5 Rc8 Na7 Rb8 Rb1 Nc8 Nc6 Rb7 Bh6 Kh7 Bxg7 Rb3 Bxf6 Rab6 Rg7+ Kh6 Rxc7 Rxb2 Rxb2 Rxb2 Rxc8 Rb1+ Ke2 Rb2+ Kd3 Rxf2 Ng4+ Kh5 Nxf2 h2 Rh8+ Kg6 Bd8 Kg7 Rxh2 Kf7 Bxa5'.trim().split(' ');
const fenAt = (n: number): string => { const c = new Chess(); for (const m of GAME.slice(0, n)) c.move(m); return c.fen(); };

describe('ply 7 — 4.d5 in a Damiano is a closed centre, not a King\'s Indian', () => {
  it('the structure is named without an opening the student is not playing', () => {
    const s = namedPawnStructure(fenAt(8), 'w');
    expect(s?.name ?? '').not.toMatch(/Indian/);
  });
});

describe('ply 49 — a loose knight the engine does not punish is not "dropped"', () => {
  it('Bh6 within a whisker of the best is never "That drops the knight on a7"', () => {
    // The live read had Nb5 first and Bh6 a whisker behind; depth 16 has them the
    // other way round (456 v 426) — either way the knight on a7 costs nothing.
    const d = buildDeliberation({
      analysis: { topLines: [
        { rank: 1, evaluation: 430, mate: null, moves: ['a7b5', 'c7c6', 'b5c7', 'b8b2'] },
        { rank: 2, evaluation: 426, mate: null, moves: ['e3h6', 'g8h7', 'g1g7', 'h7h6'] },
      ] } as never,
      fenBefore: fenAt(50), moverColor: 'w', opponentLastSan: 'Rb8',
    });
    const bh6 = d?.alternatives.find((a) => a.san === 'Bh6');
    expect(bh6).toBeDefined();
    expect(bh6?.shortfall).not.toBe('drops-material');
  });
});

describe('ply 55 — a bishop that hangs on h6 is not on an "outpost"', () => {
  it('Bh6 is not read as an outpost', () => {
    expect(computeMoveFundamentals(fenAt(54), 'Bh6', 'white').map((f) => f.id)).not.toContain('outpost');
  });
});

describe('ply 63 — losing a forced mate is the cost, not "let them in with Kg6"', () => {
  it('the grade names the slipped mate, never the king step', () => {
    const v = callInaccuracyDetailed({ priorMove: null,
      fenBefore: fenAt(62), playedSan: 'Rxc7', bestSan: 'Ng4+',
      bestLineUci: ['h2g4', 'h6h5', 'g7g5', 'h5h4', 'g4h2', 'b3d3'],
      cpLoss: 0, missedMate: 4, side: 'student', moverColor: 'white',
      replyLineUci: ['h6g6', 'c7c8', 'b3b2', 'b1b2', 'b6b2', 'c8h8'], // the live walk's reply, Kg6
      replySan: 'Rxb2',
    });
    const said = v.call?.said ?? '';
    expect(said).not.toMatch(/in with Kg6/);
    expect(said).toMatch(/forced mate/);
  });
});

describe('ply 67 — no "queen up" without a queen', () => {
  it('rook, bishop and knight against a rook is not called a queen', () => {
    expect(readConversion(fenAt(68), 'w')?.text ?? '').not.toMatch(/a queen up/);
  });
});

describe('ply 77 — pieces against a bare king and pawn is not "rook against a minor"', () => {
  it('classified as pieces against bare pawns', () => {
    expect(classifyMatchup(fenAt(78)).cls).toBe('pieces-vs-pawns');
  });
  it('NEGATIVE CONTROL: a real rook-v-minor ending still classifies', () => {
    expect(classifyMatchup('8/5k2/8/3n4/8/8/4RK2/8 w - - 0 1').cls).toBe('rook-vs-minor');
  });
});

describe('ply 83 — the coach walking into mate did not "give away material"', () => {
  it('the coach\'s blunder names mate when it allowed one', () => {
    const v = callInaccuracyDetailed({
      fenBefore: fenAt(83), playedSan: 'Kf8', bestSan: 'Kg6', cpLoss: 0, allowedMate: 7,
      side: 'coach', moverColor: 'black', replySan: null,
    } as never);
    expect(v.call?.said).toMatch(/walks into mate/);
  });
});
