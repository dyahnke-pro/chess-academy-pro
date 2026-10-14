import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Review walk 2026-10-04, G2 (lichess VRUh4Qgh), ply 70: "The through-line of
// this game was the bishop pair — two bishops raking the board" — whose pair
// was never said. Every through-line names a seat (you/your/they/their).
describe('every through-line says whose it is', () => {
  it('each PHRASING entry names a seat', () => {
    const src = readFileSync(resolve(__dirname, 'reviewFullData.ts'), 'utf8');
    const at = src.indexOf('const PHRASING: Record<string, string> = {');
    const body = src.slice(at, src.indexOf('};', at));
    const entries = [...body.matchAll(/^\s+['\w-]+:\s*["'](.+)["'],\s*$/gm)].map((m) => m[1]);
    expect(entries.length).toBeGreaterThanOrEqual(7);
    for (const e of entries) expect(e).toMatch(/\b(you|your|they|their)\b/);
  });
});

describe('the through-line is the middlegame theme, never a second whole-game story (review audit 2026-10-14)', () => {
  it('no PHRASING entry claims "the story of this game" or "the through-line of this game"', () => {
    const src = readFileSync(resolve(__dirname, 'reviewFullData.ts'), 'utf8');
    const at = src.indexOf('const PHRASING: Record<string, string> = {');
    const body = src.slice(at, src.indexOf('};', at));
    expect(body).not.toMatch(/story of this game|through-line of this game/);
  });
});
