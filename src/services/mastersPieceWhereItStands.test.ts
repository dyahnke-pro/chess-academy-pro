import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { mastersPlanRead, mastersPlanLine, type MovesAt } from './mastersPlanRead';

// Clean-pass walk 2026-10-03, G3 ply 8 (lichess mZ1GOTOw, Berlin): "your
// knight on d6 usually goes to f5" — the knight stood on e4; d6 is where it
// stands after …Nd6, two master moves later.
const key = (f: string): string => f.split(' ').slice(0, 4).join(' ');
const fenOf = (line: string): string => { const c = new Chess(); line.split(' ').forEach((m) => c.move(m)); return c.fen(); };
const BASE = 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4';
const tree = (t: Record<string, Array<[string, number]>>): MovesAt => {
  const by = new Map(Object.entries(t).map(([l, ms]) => [key(fenOf(l)), ms.map(([san, games]) => ({ san, games }))]));
  return (fen) => by.get(key(fen)) ?? null;
};

describe('a master placement names the piece where it stands now', () => {
  it('never "your knight on d6" while the knight is on e4', () => {
    const at = tree({
      [BASE]: [['Nd6', 1000]],
      [`${BASE} Nd6`]: [['Bxc6', 1000]],
      [`${BASE} Nd6 Bxc6`]: [['dxc6', 1000]],
      [`${BASE} Nd6 Bxc6 dxc6`]: [['dxe5', 1000]],
      [`${BASE} Nd6 Bxc6 dxc6 dxe5`]: [['Nf5', 1000]],
    });
    const line = mastersPlanLine(mastersPlanRead(fenOf(BASE), at), 'b')?.text ?? '';
    expect(line).not.toMatch(/knight on d6/);
  });
});
