import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// LEARN NAMES NO MOVE UNASKED (David 2026-10-10: "I do not want the better
// move stated in learn free play unless the user asks for it" → "Unify").
// Every Learn producer that could name the student's move waits for the ask:
// the weighing speaks, the move is held; Show me / Hint / a question name it.
// ONE CARVE-OUT — THEORY (David 2026-10-14: "it's ok to name the move if it's
// after it's already been played. How else do we teach the user a wrong
// move?"): once the student has LEFT THE BOOK, the book move is named, and only
// with its job on the board (`bookMoveWhy`). A tactical miss still waits.
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
  it('leaving the book names the book move only WITH its job, never bare', () => {
    const ann = read('services/openingAnnouncement.ts');
    expect(ann).not.toMatch(/the usual move there was/);
    expect(ann).not.toMatch(/The book move is/);
    expect(ann).not.toMatch(/bookMoveWhy/);
    // ONE PRODUCER, ON ITS OWN LANE: the registry reads it, Learn speaks it.
    expect(read('services/boardComputers.ts')).toMatch(/bookMoveWhy\(dep\.fen, dep\.mainSan, dep\.san, student\)/);
    expect(read('components/Coach/CoachTeachPage.tsx')).toMatch(/lane: 'bookMove' as const/);
    const why = read('services/bookMoveWhy.ts');
    // EVERY form of the sentence carries a computed job: the book move's own
    // clause, or (no tempo handed over) the cost of the student's move.
    const forms = why.split('\n').filter((l) => /The book move is/.test(l));
    expect(forms.length, 'the book move is never named without a job').toBeGreaterThan(0);
    for (const f of forms) expect(f, f.trim()).toMatch(/\$\{late\.(clause|short)\}/);
  });
});
