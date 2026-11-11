// ONE BEAT A MOVE (WO-OPENINGS-REWRITE-01 R2, David 2026-11-11: "I want 1 beat
// per move explaining the why, the move order"). Every lesson the Openings tab
// plays — the main line and every tab, masterclass and pro alike — says one
// beat for every move, both sides. A lesson that packs several moves into one
// beat skips the why of the moves in between.
//
// Measured on 2026-11-11: 819 lessons, 9 of them one beat a move (the
// Trompowsky course), a median of 5 moves a beat. The lessons not yet rewritten
// are named in the baseline, which only shrinks: a new lesson must be one beat a
// move the day it is written, and a rewritten one must leave the baseline.
// Trap lessons are their own shape and are not measured here.
import { describe, expect, it } from 'vitest';
import { getAllLessonScripts } from './index';
import baseline from './oneBeatPerMove.baseline.json';

function oneBeatPerMove(moves: readonly (readonly string[])[]): boolean {
  return moves.every((m, k) => m.length === k + 1);
}

describe('one beat a move — every Openings lesson', () => {
  const lessons = getAllLessonScripts().filter(({ lesson }) => lesson.kind !== 'trap');
  const packed = lessons.filter(({ lesson }) => !oneBeatPerMove(lesson.beats.map((b) => b.moves))).map(({ key }) => key);
  const owed = new Set(baseline as string[]);

  it('a lesson not in the baseline says one beat for every move', () => {
    expect(packed.filter((k) => !owed.has(k))).toEqual([]);
  });

  it('the baseline only shrinks: a rewritten or removed lesson leaves it', () => {
    const live = new Set(packed);
    expect((baseline as string[]).filter((k) => !live.has(k))).toEqual([]);
  });

  it('measures something (negative control)', () => {
    expect(oneBeatPerMove([['d4'], ['d4', 'Nf6'], ['d4', 'Nf6', 'Bg5']])).toBe(true);
    expect(oneBeatPerMove([['d4', 'Nf6'], ['d4', 'Nf6', 'Bg5']])).toBe(false);
    expect(lessons.length).toBeGreaterThan(500);
  });
});
