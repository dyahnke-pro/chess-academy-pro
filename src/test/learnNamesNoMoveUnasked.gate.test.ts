import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// LEARN NAMES NO MOVE UNASKED (David 2026-10-10: "I do not want the better
// move stated in learn free play unless the user asks for it" → "Unify").
// Every Learn producer that could name the student's move waits for the ask:
// the weighing speaks, the move is held; Show me / Hint / a question name it.
const read = (p: string): string => readFileSync(resolve(__dirname, '..', p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('Learn names no move unasked', () => {
  it('the live reads name a move only when the student asked', () => {
    const src = read('services/positionFacts.ts');
    const names = [...src.matchAll(/nameMove:\s*([^,\n]+),/g)].map((m) => m[1].trim());
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n, 'nameMove decided by something other than the ask').toBe('!!input.namesBestMove');
  });
  it('a held move is revealed only on the ask, never after a miss', () => {
    expect(read('services/deliberation.ts')).not.toMatch(/'missed'/);
    expect(read('services/playCommentary.ts')).not.toMatch(/was the answer to their slip/);
  });
  it('leaving the book does not name the book move', () => {
    expect(read('services/openingAnnouncement.ts')).not.toMatch(/the usual move there was/);
  });
});
