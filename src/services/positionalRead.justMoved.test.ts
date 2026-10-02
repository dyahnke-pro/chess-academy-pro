// Run E walk 2026-09-30 (CfCoA7jQu84, ply 23): "Nxh3, not gxh3 …" and in the
// same breath "Your knight on h3 is your problem piece". The piece just moved
// is not called a problem on the move it was played.
import { describe, it, expect } from 'vitest';
import { buildPositionalRead } from './positionalRead';

const FEN = 'rnbqkb1r/pppppppp/5n2/8/8/7N/PPPPPPPP/RNBQKB1R b KQkq - 1 1';
const all = (justMoved: string | null): string[] => {
  const said = new Set<string>(); const out: string[] = [];
  for (let i = 0; i < 40; i++) { const o = buildPositionalRead(FEN, 'white', said, undefined, justMoved); if (!o) break; out.push(o.text); }
  return out;
};

describe('buildPositionalRead — the piece just moved', () => {
  it('is called a problem piece only when it was not the move just played', () => {
    expect(all(null).some((t) => /knight on h3 is your problem piece/.test(t))).toBe(true);
    expect(all('h3').some((t) => /knight on h3 is your problem piece/.test(t))).toBe(false);
  });
});
