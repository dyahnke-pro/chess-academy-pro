import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { sublineToPlayableLine, sublineToCustomLine } from './sublineLesson';
import type { CourseSubline } from './openingCourse';
import sublinesData from '../data/course-sublines.json';

const sub: CourseSubline = {
  triggerMove: 'Nf3',
  name: 'Caro-Kann Defense: Advance Variation, Tal Variation',
  pct: 31,
  games: 1200,
  moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5', 'Be3', 'Nd7', 'O-O', 'Ne7'],
  atPly: 6,
  reachesMiddlegame: true,
};

describe('sublineToPlayableLine', () => {
  it('builds a watchable line with one move-arrow per move', () => {
    const line = sublineToPlayableLine(sub);
    expect(line).not.toBeNull();
    expect(line!.moves).toEqual(sub.moves);
    expect(line!.arrows).toHaveLength(sub.moves.length);
    expect(line!.arrows.every((a) => a.length >= 1)).toBe(true);
    expect(line!.annotations).toHaveLength(sub.moves.length);
  });

  it('highlights only the deviation (trigger) ply', () => {
    const line = sublineToPlayableLine(sub)!;
    const withHi = line.highlights!.map((h, i) => (h.length ? i : -1)).filter((i) => i >= 0);
    expect(withHi).toEqual([sub.atPly]);
  });

  it('baseline intro frames the deviation by name (no invented teaching prose)', () => {
    const line = sublineToPlayableLine(sub)!;
    expect(line.intro?.say).toContain(sub.triggerMove);
    // un-authored: silent walk (every annotation empty), arrows lead the eye
    expect(line.annotations.every((a) => a === '')).toBe(true);
  });

  it('uses hand-authored narration when provided (never templated)', () => {
    const line = sublineToPlayableLine(sub, {
      intro: { say: 'Hand-written framing for this deviation.', sayShort: 'Authored cue.' },
      beats: [{ atMove: 7, say: 'Authored keystone on move 7.', highlights: [{ square: 'e6' }] }],
      sources: ['concept:pos-center'],
    })!;
    expect(line.intro?.say).toBe('Hand-written framing for this deviation.');
    expect(line.annotations[7]).toBe('Authored keystone on move 7.');
    expect(line.sources).toContain('concept:pos-center');
  });

  it('carries a resolvable source', () => {
    const line = sublineToPlayableLine(sub)!;
    expect(line.sources && line.sources.length).toBeTruthy();
  });

  it('returns null on an illegal move list', () => {
    expect(sublineToPlayableLine({ ...sub, moves: ['e4', 'e9'] })).toBeNull();
  });
});

describe('sublineToCustomLine', () => {
  it('produces a pgn that replays legally from the start', () => {
    const cl = sublineToCustomLine(sub);
    const c = new Chess();
    for (const san of cl.pgn.split(' ')) expect(() => c.move(san)).not.toThrow();
    expect(cl.name).toBe('Advance Variation, Tal Variation');
  });
});

describe('every shipped subline is convertible (no broken data)', () => {
  it('converts a sample across all openings without nulls or illegal lines', () => {
    const byOpening = sublinesData as Record<string, Record<string, CourseSubline[]>>;
    let checked = 0;
    let nulls = 0;
    for (const opening of Object.values(byOpening)) {
      for (const list of Object.values(opening)) {
        for (const s of list.slice(0, 2)) {
          checked++;
          const line = sublineToPlayableLine(s);
          if (!line) nulls++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(nulls).toBe(0);
  });
});
