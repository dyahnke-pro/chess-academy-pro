// Fix 3 (2026-11-13): the move's threat, read off the null-move line. The
// four boards are Wikibooks positions whose page leads with the threat (three)
// or calls the threat harmless (f4); the reads are the bench's own Stockfish
// reads of them (depth 14).
import { describe, it, expect } from 'vitest';
import { moveThreat } from './moveThreat';
import type { AnalysisLine } from '../types';

type Line = { rank: number; evaluation: number; mate: number | null; moves: string[] };
type Case = { fen: string; san: string; before: Line[]; after: Line[]; passAfter: Line[] };
const BG5: Case = {"fen": "r1bqkb1r/pp2pppp/2n2n2/3p4/2PP4/2N5/PP3PPP/R1BQKBNR w KQkq - 3 6", "san": "Bg5", "before": [{"rank": 1, "evaluation": 29, "mate": null, "moves": ["g1f3", "c8g4", "c4d5", "f6d5", "d1b3", "g4f3", "g2f3", "e7e6"]}, {"rank": 2, "evaluation": 23, "mate": null, "moves": ["c1g5", "e7e6", "g1f3", "f8b4", "f1d3", "h7h6", "g5h4", "d5c4"]}], "after": [{"rank": 1, "evaluation": 0, "mate": null, "moves": ["d5c4", "d4d5", "c6a5", "b2b4", "c4b3", "f1b5", "c8d7", "b5d7"]}, {"rank": 2, "evaluation": 4, "mate": null, "moves": ["c8e6", "g5f6", "e7f6", "c4c5", "g7g6", "f1b5", "f8g7", "g1e2"]}], "passAfter": [{"rank": 1, "evaluation": 109, "mate": null, "moves": ["g5f6", "e7f6", "c4d5", "c6b4", "f1b5", "c8d7", "d1e2", "d8e7"]}, {"rank": 2, "evaluation": 63, "mate": null, "moves": ["g1f3", "e7e6", "c4d5", "e6d5", "f1b5", "f8e7", "b5c6", "b7c6"]}]};
const NE4: Case = {"fen": "rnbq1rk1/ppp1bpp1/4pn1p/3p4/2PP3B/2N1PN2/PP3PPP/R2QKB1R b KQ - 1 7", "san": "Ne4", "before": [{"rank": 1, "evaluation": 19, "mate": null, "moves": ["b7b6", "c4d5", "f6d5", "c3d5", "e6d5", "h4e7", "d8e7", "f1e2"]}, {"rank": 2, "evaluation": 25, "mate": null, "moves": ["b8d7", "a1c1", "c7c5", "d4c5", "d7c5", "c4d5", "e6d5", "f1e2"]}], "after": [{"rank": 1, "evaluation": 29, "mate": null, "moves": ["h4e7", "d8e7", "a1c1", "c7c6", "f1d3", "e4c3", "c1c3", "d5c4"]}, {"rank": 2, "evaluation": 11, "mate": null, "moves": ["h4g3", "c7c5", "c4d5", "e6d5", "f1d3", "c5d4", "f3d4", "b8c6"]}], "passAfter": [{"rank": 1, "evaluation": -470, "mate": null, "moves": ["e7h4", "c3e4", "d5e4", "f3h4", "d8h4", "d1c2", "e6e5", "e1c1"]}, {"rank": 2, "evaluation": -86, "mate": null, "moves": ["e4c3", "h4e7", "c3d1", "e7d8", "d1e3", "f2e3", "f8d8", "a1c1"]}]};
const QE2: Case = {"fen": "r1bqkb1r/ppp2pp1/5n1p/n2P4/2B1p3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 8", "san": "Qe2", "before": [{"rank": 1, "evaluation": -38, "mate": null, "moves": ["d1e2", "a5c4", "d3c4", "f8c5", "h2h3", "e8g8", "f3h2", "c7c6"]}, {"rank": 2, "evaluation": -40, "mate": null, "moves": ["f3d4", "f8c5", "c1e3", "e4d3", "c2d3", "f6d5", "c4d5", "d8d5"]}], "after": [{"rank": 1, "evaluation": -69, "mate": null, "moves": ["a5c4", "d3c4", "f8c5", "h2h3", "e8g8", "f3h2", "c7c6", "b1c3"]}, {"rank": 2, "evaluation": 67, "mate": null, "moves": ["d8e7", "d3e4", "a5c4", "e2c4", "e7e4", "c4e4", "f6e4", "e1g1"]}], "passAfter": [{"rank": 1, "evaluation": 277, "mate": null, "moves": ["d3e4", "a5c4", "e2c4", "c7c6", "d5c6", "d8b6", "b1c3", "f8c5"]}, {"rank": 2, "evaluation": 159, "mate": null, "moves": ["b1c3", "a5c4", "c3e4", "f8b4", "e4c3", "d8e7", "e2e7", "e8e7"]}]};
const F4: Case = {"fen": "rnbqkb1r/ppp1pp1p/3p1np1/8/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 4", "san": "f4", "before": [{"rank": 1, "evaluation": 69, "mate": null, "moves": ["c1g5", "c7c6", "d1d2", "h7h6", "g5e3", "b7b5", "f1d3", "f6g4"]}, {"rank": 2, "evaluation": 63, "mate": null, "moves": ["h2h3", "f8g7", "g1f3", "e8g8", "c1e3", "a7a6", "a2a4", "b7b6"]}], "after": [{"rank": 1, "evaluation": 72, "mate": null, "moves": ["f8g7", "g1f3", "e8g8", "f1d3", "b8d7", "e4e5", "f6e8", "c1e3"]}, {"rank": 2, "evaluation": 96, "mate": null, "moves": ["a7a6", "g1f3", "f8g7", "e4e5", "f6d7", "f1c4", "d7b6", "c4e2"]}], "passAfter": [{"rank": 1, "evaluation": 134, "mate": null, "moves": ["g1f3", "f8g7", "e4e5", "f6d7", "h2h4", "c7c5", "d4c5", "d7c5"]}, {"rank": 2, "evaluation": 125, "mate": null, "moves": ["e4e5", "f6h5", "d1f3", "h5g7", "h2h3", "h7h5", "c1d2", "c7c6"]}]};
const read = (c: Case, student: 'w' | 'b') => moveThreat(c.fen, c.san, { before: c.before, after: c.after, passAfter: c.passAfter }, student);

describe('moveThreat', () => {
  it('Bg5 threatens Bxf6 and then cxd5: the knight is the only guard of d5', () => {
    const t = read(BG5, 'w');
    expect(t?.clause).toMatch(/^threatens to win a pawn: /);
    expect(t?.sans).toEqual(['Bxf6', 'exf6', 'cxd5']);
  });
  it('Ne4 threatens their bishop on h4 (the page: "an attack on the dark-squared bishop")', () => {
    expect(read(NE4, 'b')?.clause).toMatch(/^threatens to win a bishop/);
  });
  it('Qe2 pins the e4-pawn, so dxe4 is coming', () => {
    expect(read(QE2, 'w')?.sans[0]).toBe('dxe4');
  });
  it('f4 "threatens" e5, which wins nothing: not a threat', () => {
    expect(read(F4, 'w')).toBeNull();
  });
  it('from the other seat the words turn: their move threatens you', () => {
    expect(read(BG5, 'b')?.clause).toMatch(/they play Bxf6/);
  });
  // Stockfish depth 14: after Qe2, with White to move again, Qe8+ Rxe8 Rxe8#
  // (mate in two); with Black to move, …g6 holds (White +5.7).
  it('a mate threat two moves long is said as one, with its line', () => {
    const fen = 'r5k1/5ppp/8/8/8/8/1Q3PPP/4R1K1 w - - 0 1';
    const t = moveThreat(fen, 'Qe2', {
      before: [{ moves: ['b2b7', 'a8f8'], evaluation: 538, mate: null, depth: 14 } as unknown as AnalysisLine],
      after: [{ moves: ['g7g6', 'e2f3'], evaluation: 567, mate: null, depth: 14 } as unknown as AnalysisLine],
      passAfter: [{ moves: ['e2e8', 'a8e8', 'e1e8'], evaluation: 0, mate: 2, depth: 14 } as unknown as AnalysisLine],
    }, 'w');
    expect(t?.clause).toBe('threatens mate in two: you play Qe8+, they answer Rxe8 and you play Rxe8#');
  });
  // Bench 2026-11-13: Kh1 out of …Bxh2+ was said to threaten the fork Nxd8+
  // that the knight on c6 already had.
  it('an escape from check makes no threat of its own', () => {
    const fen = 'r1bqk2r/1pp2ppp/p1N5/3p4/B3n3/8/PPP2PPb/RNBQR1K1 w kq - 0 10';
    const any = [{ moves: ['c6d8'], evaluation: 900, mate: null, depth: 14 } as unknown as AnalysisLine];
    expect(moveThreat(fen, 'Kh1', { before: any, after: any, passAfter: any }, 'w')).toBeNull();
  });
});
