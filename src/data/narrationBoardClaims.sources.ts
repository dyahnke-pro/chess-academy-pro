// Every authored Openings-tab narration unit, fed through the board-claim
// checker. Test/tooling only — never imported by the app.
import type { Chess } from 'chess.js';
import { boardsFor, checkBoardClaims } from './narrationBoardClaims';
import plansRaw from './middlegame-plans.json';
import { GEM_NARRATION } from './lessons/punishGemNarration';
import { GAMBIT_GEM_NARRATION } from './lessons/gambitGemNarration';
import { ALL_GEMS, gemId } from './lessons/punishGems';
import { getAllLessonScripts } from './lessons';
import { WATCH_COURSES } from './lessons/watch';
import type { WatchCourse } from './lessons/watch/watchCourse';
import type { LessonScript, MiddlegamePlan } from '../types';

interface BoardClaimRow {
  source: string;
  unit: string;
  claim: string;
  why: string;
  text: string;
  fen: string;
}

function isLesson(v: unknown): v is LessonScript {
  return !!v && typeof v === 'object' && Array.isArray((v as LessonScript).beats)
    && typeof (v as LessonScript).openingId === 'string';
}

/** A lesson the gate reads, under the name its rows report. */
interface CheckedLesson {
  /** The served key (`<openingId>` or `<openingId>::<tab>`) for a lesson the
   *  app serves; the file name for one only the folder scan finds. */
  source: string;
  lesson: LessonScript;
}

/** Every lesson the gate reads, deduped by identity.
 *
 *  THE SERVED LESSONS COME FIRST (2026-11-11). A lesson is checked because
 *  the app serves it (`getAllLessonScripts`: the main line of every opening
 *  and every tab), never because of the folder its file sits in. The gate
 *  used to scan `./lessons/*.ts` alone; when the opening lessons were
 *  rewritten as Watch courses in `./lessons/watch/` and the old files were
 *  deleted, 57 openings fell out of its reach one by one and it stayed green.
 *
 *  The folder scan still runs after it, for a lesson object a file exports
 *  that no key serves (the named-trap lessons): it is narration in the repo,
 *  so it is held to the board too. `served = []` is the old collector — the
 *  reach guard's negative control. */
export function checkedLessons(served: ReadonlyArray<{ key: string; lesson: LessonScript }> = getAllLessonScripts()): CheckedLesson[] {
  const seen = new Set<LessonScript>();
  const out: CheckedLesson[] = [];
  const take = (source: string, v: unknown): void => {
    if (isLesson(v) && !seen.has(v)) { seen.add(v); out.push({ source, lesson: v }); }
  };
  for (const { key, lesson } of served) take(key, lesson);
  const mods: Record<string, Record<string, unknown>> = import.meta.glob(['./lessons/*.ts', '!./lessons/*.test.ts'], { eager: true });
  for (const [path, mod] of Object.entries(mods)) {
    if (path.endsWith('.test.ts')) continue;
    const file = path.replace('./lessons/', '');
    for (const v of Object.values(mod)) {
      if (isLesson(v)) take(file, v);
      else if (v && typeof v === 'object' && !Array.isArray(v)) {
        for (const inner of Object.values(v as Record<string, unknown>)) take(file, inner);
      } else if (Array.isArray(v)) {
        for (const inner of v) take(file, inner);
      }
    }
  }
  return out;
}

/** What the lesson half of the gate actually read. A beat counts only when
 *  its words were put on a board: one with no words was not checked, and one
 *  whose moves do not replay is listed in `unreadable`. */
interface BoardClaimReach {
  lessons: number;
  beats: number;
  /** Source (the served key, or the file for an unserved lesson) → beats
   *  checked. Keyed by the served key, never the opening id: the unserved
   *  trap lessons carry their opening's id, so a count by opening id would
   *  read "reached" off a trap lesson while the course itself went unread. */
  beatsBySource: Map<string, number>;
  /** Beats whose moves do not replay (`<source>#<beat id>`): never checked. */
  unreadable: string[];
}

/** The key a Watch line is served under (`watchLessons`). */
const servedKey = (course: WatchCourse, tab: string | null): string => (tab === null ? course.openingId : `${course.openingId}::${tab}`);

/** Every Watch-course line the gate did not read whole: one row a line,
 *  `<served key>: <checked> of <moves> beats checked`. A course is one beat a
 *  move, so a line of N moves must show N checked beats under its own key.
 *  Empty when the gate reaches every course; the reach guard holds it there. */
export function unreachedWatchLines(reach: BoardClaimReach, courses: readonly WatchCourse[] = WATCH_COURSES): string[] {
  const out: string[] = [];
  for (const course of courses) {
    for (const line of course.lines) {
      const key = servedKey(course, line.tab);
      const got = reach.beatsBySource.get(key) ?? 0;
      if (got < line.moves.length) out.push(`${key}: ${got} of ${line.moves.length} beats checked`);
    }
  }
  return out;
}

/** The Watch-course openings with no checked beat at all. */
export function unreachedWatchOpenings(reach: BoardClaimReach, courses: readonly WatchCourse[] = WATCH_COURSES): string[] {
  return courses
    .filter((c) => !c.lines.some((l) => (reach.beatsBySource.get(servedKey(c, l.tab)) ?? 0) > 0))
    .map((c) => c.openingId);
}

/** Checks one narration unit on its boards. */
function checkOn(rows: BoardClaimRow[], boards: Chess[], source: string, unit: string, text: string | undefined): boolean {
  if (!text) return false;
  for (const v of checkBoardClaims(boards, text)) {
    rows.push({ source, unit, claim: v.claim, why: v.why, text, fen: boards[boards.length - 1].fen() });
  }
  return true;
}

function check(rows: BoardClaimRow[], source: string, unit: string, moves: string[], text: string | undefined, startFen?: string): void {
  if (!text || moves.length === 0) return;
  const boards = boardsFor(moves, startFen);
  if (boards) checkOn(rows, boards, source, unit, text);
}

/** The lesson half of the gate: every beat of `lessons` on its boards. Rows
 *  are named `<source>#<beat id>`, the source being the served key. */
export function collectLessonBoardClaims(lessons: readonly CheckedLesson[] = checkedLessons()): { rows: BoardClaimRow[]; reach: BoardClaimReach } {
  const rows: BoardClaimRow[] = [];
  const reach: BoardClaimReach = { lessons: lessons.length, beats: 0, beatsBySource: new Map(), unreadable: [] };
  for (const { source, lesson } of lessons) {
    for (const beat of lesson.beats) {
      if (beat.moves.length === 0 || !(beat.say || beat.sayShort)) continue;
      const boards = boardsFor(beat.moves);
      if (!boards) { reach.unreadable.push(`${source}#${beat.id}`); continue; }
      checkOn(rows, boards, source, beat.id, beat.say);
      checkOn(rows, boards, source, `${beat.id} (short)`, beat.sayShort);
      reach.beats++;
      reach.beatsBySource.set(source, (reach.beatsBySource.get(source) ?? 0) + 1);
    }
  }
  return { rows, reach };
}

/** The whole gate in one pass: lessons, middlegame plans and gem narration,
 *  with what the lesson half reached. */
export function collectBoardClaims(): { rows: BoardClaimRow[]; reach: BoardClaimReach } {
  const { rows, reach } = collectLessonBoardClaims();
  for (const plan of plansRaw as unknown as MiddlegamePlan[]) {
    plan.playableLines?.forEach((line, li) => {
      line.moves.forEach((_, i) => {
        const moves = line.moves.slice(0, i + 1);
        check(rows, 'middlegame-plans.json', `${plan.id}[${li}]#${i}`, moves, line.annotations?.[i], line.fen);
        check(rows, 'middlegame-plans.json', `${plan.id}[${li}]#${i} (cue)`, moves, line.learnCues?.[i], line.fen);
      });
    });
  }
  const gemText: Record<string, { watch: string[]; learn?: string[] }> = { ...GEM_NARRATION, ...GAMBIT_GEM_NARRATION };
  for (const gem of ALL_GEMS) {
    const n = gemText[gemId(gem)];
    if (!n) continue;
    const ply = gem.playLine.trim().split(/\s+/);
    n.watch.forEach((t, i) => check(rows, 'gem narration', `${gemId(gem)}#${i}`, ply.slice(0, i + 1), t));
    n.learn?.forEach((t, i) => check(rows, 'gem narration', `${gemId(gem)}#${i} (cue)`, ply.slice(0, i + 1), t));
  }
  return { rows, reach };
}

export function collectBoardClaimViolations(): BoardClaimRow[] {
  return collectBoardClaims().rows;
}
