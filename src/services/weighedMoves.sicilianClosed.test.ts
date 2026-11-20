// The two try rows the 2026-11-20 renderer read flagged on the Sicilian Closed
// replay (lesson lines 13 and 31): a try named three times and its cost said
// twice ("Nh5 hands them a pawn… Nh5 achieves nothing, and gives back part of
// your edge"), and a Black try said without its "…" (read as White's move).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { standingRefutations } from './weighedMoves';
import { linesOf, replayPlies, type ReplayGame } from '../test/replayGame';

const game = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: Array<ReplayGame & { id: string }> }).games.find((g) => g.id === 'sicilianClosed1000');
if (!game) throw new Error('no sicilianClosed1000');
const plies = replayPlies(game);
const tryAfter = (k: number, san: string): string => {
  const p = plies[k];
  const reads = linesOf(p.after).map((l) => ({ evaluation: l.evaluation, mate: l.mate, moves: l.moves }));
  return standingRefutations({ fen: p.fenAfter, student: 'b', rating: 1000, reads }).find((x) => x.san === san)?.text ?? '';
};

describe('a try is worded for its mover, named once, one cost (sicilianClosed1000)', () => {
  it('#13 after fxe5: …Nh5 carries its "…", is named once and says ONE cost', () => {
    const t = tryAfter(12, 'Nh5');
    expect(t).toBe('…Nh5 is the obvious try, but O-O is the answer: they win a pawn in the line.');
    expect(t).toMatch(/^…Nh5 /);
    expect(t.split('Nh5').length - 1).toBe(1);
    expect(/hands them|win/.test(t) && /edge/.test(t)).toBe(false);
  });
  it('#31 after Raf1: …Bxc3 is named once and says its cost once', () => {
    const t = tryAfter(30, 'Bxc3');
    expect(t).toBe('…Bxc3 is tempting, but bxc3 takes the sting out of it. It wins nothing: the trades leave the material level, and it gives back part of your edge.');
    expect(t).toMatch(/^…Bxc3 /);
    expect(t.split('Bxc3').length - 1).toBe(1);
    expect((t.match(/edge/g) ?? []).length).toBeLessThanOrEqual(1);
  });
});
