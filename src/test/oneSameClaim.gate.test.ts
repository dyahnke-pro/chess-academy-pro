// GATE: ONE SAME-CLAIM RULE (sweep 2026-11-21). Two facts are one claim only
// when their squares overlap AND they are the same kind (`factSelector.
// sameClaim`, the B12 fix: the loose bishop on e2 is not the pin through e2).
// Learn called the same function with no kind, so it merged on squares alone
// and still dropped the loose piece Review had stopped dropping. It fails when
// any caller passes no family at the GEOMETRY grain (one board, any computer).
// The `one-move` grain is the lesson composer's: its facts are one move's own
// job and carry an idea, not a kind, so a shared square there is one claim.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

describe('one same-claim rule', () => {
  it('no geometry-grain caller of sameClaim passes a fact with no kind', () => {
    // The function under any name it is imported as (`sameClaim as oneClaim`).
    const calls = (src: string): string[] => {
      const names = ['sameClaim', ...[...src.matchAll(/sameClaim as (\w+)/g)].map((m) => m[1])];
      return names.flatMap((n) => src.match(new RegExp(`\\b${n}\\(\\{[^;]*?'(?:geometry|one-move)'\\)`, 'g')) ?? []);
    };
    // ONE NAMED EXCEPTION, MEASURED (decision baseline 2026-11-21): the read
    // decider's own step (`readDecider`, "two facts of one step on the same
    // squares are one claim") collapses on geometry alone ON PURPOSE. Given
    // their kinds it said six claims twice on the baseline games — "one more
    // piece on your weak pawn on c3" then "your opponent's rook trains on your
    // weak pawn on c3", "it hits your rook" then "their knight now attacks your
    // rook". Inside one step of one turn, the squares are the claim.
    const EXEMPT = new Set(['src/services/readDecider.ts']);
    const bad = files('src').filter((p) => !EXEMPT.has(p) && calls(readFileSync(p, 'utf8')).some((c) => /family:\s*null/.test(c) && /'geometry'\)$/.test(c)));
    expect(bad).toEqual([]);
  });
  it('every door reads the one claim family', () => {
    for (const p of ['src/services/factSelector.ts', 'src/services/learnTurnDoor.ts']) {
      expect(readFileSync(p, 'utf8')).toMatch(/family: claimFamily\(/);
    }
  });
});
