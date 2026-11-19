import { describe, expect, it } from 'vitest';
import { defenderInTime } from './defenderInTime';
import { readBoardAll } from './boardComputers';

// Danya have-check board positional-combinations#4; the engine's top lines as dumped (White's view).
const L = [{"moves": ["h2h4", "g8g7", "e1f3", "g7g6", "h4g5", "f6g5", "f3e5", "g6f6", "c3f3", "f6g7"], "cp": 129, "mate": null}, {"moves": ["c3c7", "f8f7", "c7c3", "f7f8", "h2h4", "g8f7", "c3c7", "f7g6", "c7b7", "b6b5"], "cp": 112, "mate": null}, {"moves": ["e1c2", "g8f7", "c3c7", "f7e6", "c2e3", "f8d8", "c7b7", "b8d7", "f1e2", "h5h4"], "cp": 87, "mate": null}];
// Negative control: the-greek-gift-sacrifice-lives-on#3.
const N = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];

describe('defenderInTime', () => {
  it('reads the Danya board', () => {
    const r = defenderInTime('1n3rk1/8/pp3p2/3p2pp/3P4/2R5/PP3PPP/4NK2 w - - 0 27', L, 'w')[0];
    expect([r?.pawn, r?.walk]).toEqual(['d5', ['f7', 'e6']]);
    expect(r?.route.length).toBe(2);
  });
  it('stays silent where the board does not have it', () => {
    expect(defenderInTime('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', N, 'w')).toEqual([]);
  });
  it('returns every race, not the shortest alone (G4.5), each said on its own stem', () => {
    const FEN = '1n3rk1/8/pp3p2/3p2pp/3P4/2R5/PP3PPP/4NK2 w - - 0 27';
    const rs = defenderInTime(FEN, L, 'w');
    expect(rs.map((r) => r.pawn)).toEqual(['d5', 'h5']);
    // One fact a pair through the registry; no two open on the same words.
    const facts = readBoardAll('defenderInTime', { fen: FEN, lines: L, student: 'w' });
    expect(facts.map((f) => f.text.slice(0, 20))).toHaveLength(2);
    expect(new Set(facts.map((f) => f.text.split(' ').slice(0, 3).join(' '))).size).toBe(2);
  });
});
