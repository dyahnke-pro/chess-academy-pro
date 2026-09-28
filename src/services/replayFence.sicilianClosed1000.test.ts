/**
 * REPLAY FENCE — Sicilian Closed, 1000-rated (lichess vvidmF0a, student Black),
 * walked by hand 2026-09-27.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildTacticsLiveContext } from './liveTacticsContext';
import { detectBehaviors } from './danyaBehaviors';
import { conceptInstanceKey } from './conceptKey';
import { namedPawnStructure } from './positionReadingService';

const GAME = 'e4 c5 Nc3 d6 Bc4 Nf6 f4 Nc6 Nf3 g6 e5 dxe5 fxe5 Ng4 O-O Bg7 d3 O-O Bg5 Ngxe5 Nxe5 Nxe5 Qf3 Nxf3+ Rxf3 h6 Bh4 e6 Bxd8 Rxd8 Raf1 f5 g4 Bd4+ Kh1 b6 gxf5 Bb7 Bxe6+ Kh7 fxg6+ Kxg6 Bf5+ Kg7 Be4 Bxe4 Nxe4 Rf8 Rg3+ Kh7 Rfg1 Bxg1 Rxg1 Rae8 Nd6 Re2 a4 Rxc2 Nc4 Rg8 Rf1 Kh8 Rf6 Rc1+'.trim().split(' ');
const fenAt = (n: number): string => { const c = new Chess(); for (const m of GAME.slice(0, n)) c.move(m); return c.fen(); };

describe('ply 42 — the b7-bishop pin is one claim across the tactic line and the behaviour', () => {
  it('in check (43.Bf5+) the behaviours stay quiet — the check comes first', () => {
    expect(detectBehaviors({ fen: fenAt(43), studentColor: 'b' })).toEqual([]);
  });
  it('both lanes key the pin identically', () => {
    // The same Bb7–Rf3–Kh1 pin on the board BEFORE the check (claim check
    // 2026-09-27 silenced behaviours while in check), Black to move.
    const fen = fenAt(42).replace(' w ', ' b ');
    const pin = buildTacticsLiveContext(fen, null, 'b', 1000).immediate.find((t) => t.side === 'student' && t.type === 'pin');
    const hit = detectBehaviors({ fen, studentColor: 'b' }).find((h) => h.id === 'tactics');
    expect(pin).toBeDefined();
    expect(hit?.keys).toContain(conceptInstanceKey(pin!.type, pin!.squares));
  });
});

describe('ply 58 — a pawn on d3 is not "the isolated queen\'s pawn"', () => {
  it('no isolani structure off a d3 pawn', () => {
    expect(namedPawnStructure(fenAt(59), 'b')?.name ?? '').not.toMatch(/isolated queen/);
  });
  it('NEGATIVE CONTROL: a real d4 isolani is still named', () => {
    expect(namedPawnStructure('r1bq1rk1/pp2bppp/2n1pn2/8/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 0 10', 'w')?.name).toMatch(/isolated queen/);
  });
});
