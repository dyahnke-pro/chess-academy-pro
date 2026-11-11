// Gate: every structural board claim in the Openings tab's narration is true
// on the board it is spoken over (2026-10-08). The checker reads isolated,
// doubled, half-open/open files, the bishop pair, pins, castling, material
// counts and "no pawn can chase" squares; narrationBoardClaims.ts says how.
// Zero violations, no baseline: a false claim is fixed in the sentence.
//
// REACH (2026-11-11): the gate reads the lessons the app SERVES
// (`getAllLessonScripts`), not the files of one folder. It used to scan
// `./lessons/*.ts`; the Watch courses live in `./lessons/watch/`, so as each
// old lesson file was deleted its opening left the gate and the gate stayed
// green over almost none of what a student hears. The reach guard below fails
// when any Watch course has no checked beat.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { checkBoardClaims } from './narrationBoardClaims';
import {
  checkedLessons, collectBoardClaims, collectLessonBoardClaims, unreachedWatchLines, unreachedWatchOpenings,
} from './narrationBoardClaims.sources';
import { getAllLessonScripts } from './lessons';
import { WATCH_COURSES } from './lessons/watch';

describe('narration board claims', () => {
  // One pass over everything, shared by the claim test and the reach guard.
  let all: ReturnType<typeof collectBoardClaims>;
  beforeAll(() => { all = collectBoardClaims(); }, 900000);

  it('every structural claim in lessons, plans and gems is true on its board', () => {
    expect(all.rows.map((r) => `${r.source}#${r.unit}: "${r.claim}" — ${r.why}`)).toEqual([]);
  });

  describe('reach: the gate reads the lessons that are served', () => {
    it('every served lesson is read, and reported under its served key', () => {
      const served = getAllLessonScripts();
      const read = new Map(checkedLessons().map((l) => [l.lesson, l.source]));
      expect(served.filter(({ lesson }) => !read.has(lesson)).map(({ key }) => key)).toEqual([]);
      // One object served under two keys is read once, under the first.
      const firstKey = new Map<unknown, string>();
      for (const { key, lesson } of served) if (!firstKey.has(lesson)) firstKey.set(lesson, key);
      expect(served.filter(({ lesson }) => read.get(lesson) !== firstKey.get(lesson)).map(({ key }) => key)).toEqual([]);
    });

    it('every Watch course is checked: each line, a beat for every move', () => {
      expect(WATCH_COURSES.length).toBeGreaterThan(0);
      expect(unreachedWatchOpenings(all.reach)).toEqual([]);
      expect(unreachedWatchLines(all.reach)).toEqual([]);
    });

    it('no beat is skipped because its moves do not replay', () => {
      expect(all.reach.unreadable).toEqual([]);
    });

    // Negative controls: the guard fires when a course is out of reach.
    it('the guard names a course whose lessons the gate was not handed', () => {
      const [gone, kept] = WATCH_COURSES;
      const handed = checkedLessons().filter((l) => l.lesson.openingId === kept.openingId);
      const { reach } = collectLessonBoardClaims(handed);
      expect(unreachedWatchOpenings(reach, [gone, kept])).toEqual([gone.openingId]);
      expect(unreachedWatchLines(reach, [gone, kept]).length).toBe(gone.lines.length);
      expect(unreachedWatchLines(reach, [kept])).toEqual([]);
    });

    it('the folder scan alone — the collector before 2026-11-11 — reaches no Watch course', () => {
      // `checkedLessons([])` reads ./lessons/*.ts and nothing served. A course
      // is built at registration from a file in ./lessons/watch/, so the scan
      // never sees one. It does find the unserved trap lessons, which carry
      // their opening's id: the guard counts by served key so those cannot
      // stand in for the course.
      const old = checkedLessons([]);
      const watchIds = new Set(WATCH_COURSES.map((c) => c.openingId));
      expect(old.some((l) => watchIds.has(l.lesson.openingId))).toBe(true);
      const { reach } = collectLessonBoardClaims(old);
      expect(reach.beats).toBeGreaterThan(0);
      expect(unreachedWatchOpenings(reach).length).toBe(WATCH_COURSES.length);
    }, 300000);
  });

  // Negative controls: each check must still fire on a board where the claim
  // is false, so a green run cannot come from a checker that stopped reading.
  const start = (moves: string): Chess[] => {
    const c = new Chess();
    for (const m of moves.split(' ')) c.move(m);
    return [c];
  };
  it.each([
    ['e4 e5 Nf3 Nc6 Bb5', 'Bb5 pins the c6-knight'],
    ['d4 Nf6 Bg5', 'Bg5 pins the f6-knight'],
    ['e4 c5 Nf3 d6 d4 cxd4 Nxd4', 'the open c-file'],
    ['e4 e5', 'White has the bishop pair'],
    ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'leaves White with doubled c-pawns'],
    ['e4 e5 Nf3 Nc6', 'Black castles'],
    ['e4 d5 exd5 Qxd5', 'Black is a pawn up'],
    ['d4 d5 c4 e6', 'an isolated d-pawn on d4 — the isolated pawn on d4'],
  ])('flags a false claim: %s / %s', (moves, text) => {
    expect(checkBoardClaims(start(moves), text).length).toBeGreaterThan(0);
  });
  it.each([
    ['e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6', 'leaves Black with doubled c-pawns'],
    ['e4 d5 exd5 Qxd5', 'the half-open d-file'],
    ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'if Black ever castles'],
  ])('passes a true or conditional claim: %s / %s', (moves, text) => {
    expect(checkBoardClaims(start(moves), text)).toEqual([]);
  });
});
