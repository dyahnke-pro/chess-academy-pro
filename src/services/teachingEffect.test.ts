import { describe, it, expect } from 'vitest';
import { teachingEffects, type EffectRow, type EffectGame } from './teachingEffect';

const games = (n: number, from = 0): EffectGame[] => Array.from({ length: n }, (_, i) => ({ id: `g${from + i}`, at: (from + i) * 10 }));
const row = (kind: string, gameIdx: number, source: EffectRow['source'] = 'auto-analysis'): EffectRow => ({ kind, source, at: gameIdx * 10, gameId: `g${gameIdx}` });

describe('teachingEffects — did the mistake fall after the coach taught it?', () => {
  it('a mistake taught live at game 3, then gone for four games → declining', () => {
    const g = games(8);
    const rows = [row('loose-piece', 0), row('loose-piece', 1), row('loose-piece', 2), row('loose-piece', 3, 'discussion-practice')];
    const [e] = teachingEffects(rows, g);
    expect(e.kind).toBe('loose-piece');
    expect(e.gamesBefore).toBe(4);
    expect(e.gamesAfter).toBe(4);
    expect(e.rateBefore).toBe(1);
    expect(e.rateAfter).toBe(0);
    expect(e.verdict).toBe('declining');
  });
  it('still happening after it was taught → rising or flat, never declining', () => {
    const g = games(8);
    const rows = [row('ignored-threat', 0), row('ignored-threat', 3, 'game-review'), row('ignored-threat', 4), row('ignored-threat', 5), row('ignored-threat', 6)];
    expect(teachingEffects(rows, g)[0].verdict).toBe('rising');
  });
  it('found only by the import sweep → never taught, not measured', () => {
    expect(teachingEffects([row('loose-piece', 0), row('loose-piece', 1)], games(8))).toEqual([]);
  });
  it('two games after the lesson is too early to call', () => {
    const rows = [row('no-plan', 0), row('no-plan', 4, 'discussion-practice')];
    expect(teachingEffects(rows, games(7))[0].verdict).toBe('too-early');
  });
});
