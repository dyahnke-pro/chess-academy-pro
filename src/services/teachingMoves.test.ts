// The teaching-move vocabulary is ONE list: the union in code and the taxonomy
// his words are labelled with (`scripts/scoreboard/taxonomy.md`) may not
// drift, or the yardstick scores one vocabulary against another.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { TEACHING_MOVE_LIST, TEACHING_MOVES } from './teachingMoves';

const TAX = readFileSync('scripts/scoreboard/taxonomy.md', 'utf8');
const taxCodes = [...TAX.matchAll(/^- ([A-Z]+(?:-[A-Z]+)*) —/gm)].map((m) => m[1]).filter((c) => c !== 'X-NARRATION');

describe('one teaching-move vocabulary', () => {
  it('the code list is the taxonomy, in its order', () => {
    expect([...TEACHING_MOVE_LIST]).toEqual(taxCodes);
  });
  it('every move a kind makes is in the list, once per kind', () => {
    const known = new Set(TEACHING_MOVE_LIST);
    for (const [kind, moves] of Object.entries(TEACHING_MOVES)) {
      for (const m of moves) expect(known.has(m), `${kind} → ${m}`).toBe(true);
      expect(new Set(moves).size, kind).toBe(moves.length);
    }
  });
  it('the moves no kind of fact makes yet may only shrink', () => {
    const made = new Set(Object.values(TEACHING_MOVES).flat());
    const unbuilt = TEACHING_MOVE_LIST.filter((m) => !made.has(m));
    // 2026-11-05: twenty at first. Nine came off the same day when the
    // computers that make them got kinds of their own (the reply tree, the
    // common wrong move, castling by hand, the trap ahead, the move order,
    // the false alarm and its calm, the exception, push-or-hold). A new
    // computer whose kind makes one takes it off this list; a move may never
    // join it.
    // Two more the same day: the habit of asking what their move is doing,
    // and checks-captures-threats first, each its own kind (`HABIT_KIND`).
    // The computers built for them, one a move (2026-11-05): the pawn break.
    for (const m of unbuilt) expect(['M-TWO-JOBS', 'M-PROVOKE',
      'H-CALC', 'H-WISHLIST',
      'S-SPACE', 'S-TENSION', 'S-TRIGGER', 'S-LONG-HORIZON']).toContain(m);
  });
});
