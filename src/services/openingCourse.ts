import type { OpeningRecord } from '../types';
import {
  MAIN_LINE_INDEX,
  RUNGS,
  RUNG_LABEL,
  isRungComplete,
  isRungUnlocked,
  nextRung,
  type Rung,
} from '../utils/wlppLadder';
import { buildVariationTabs, isSameLine, lessonSpine } from './variationTabs';
import { pgnToSans } from './openingSublines';
import { getLessonScript, getVariationLessonScript } from '../data/lessons';
import sublinesData from '../data/course-sublines.json';

/** A frequency-derived subline of a chapter — an opponent deviation, ranked by
 *  how often it's played, walked to the middlegame. Precomputed offline by
 *  `scripts/build-course-sublines.mjs` from the masters DB (masterclass openings)
 *  or `scripts/pro-repertoire/build-pro-sublines.mjs` from the PRO'S OWN GAME
 *  TREE (pro-rep openings). Either way G3 — every move DB/engine-derived, never
 *  invented. */
export interface CourseSubline {
  /** The opponent move that triggers this subline (SAN). */
  triggerMove: string;
  /** Canonical ECO name of the resulting line. */
  name: string;
  /** Share of master games at this node (e.g. 20 = 20%). Ranked desc. */
  pct: number;
  /** Master game count behind this deviation. */
  games: number;
  /** The subline's moves (SAN) to the middlegame terminus. */
  moves: string[];
  /** Ply along the variation spine where this deviation branches. */
  atPly: number;
  /** Whether the trimmed line reaches a middlegame. */
  reachesMiddlegame: boolean;
  // --- PRO-REP-only fields (David 2026-07-02: "teach both") ---------------
  // Present on pro-* sublines (from the pro's own game tree); absent on the
  // masters-DB masterclass sublines. All optional so masterclass consumers are
  // unaffected. The pro line is the PRACTICAL line the player actually played;
  // when the engine judges it dubious we ALSO teach the sound fix.
  /** The pro's real record on this deviation, from their game corpus. */
  record?: { wins: number; draws: number; losses: number };
  /** Stockfish eval at the subline terminus, STUDENT's perspective (centipawns). */
  evalCp?: number;
  /** True when the practical line is objectively dubious (student worse than
   *  ~ -1.0). We do NOT hide it — we label it and teach the fix ("humans aren't
   *  computers"). */
  dubious?: boolean;
  /** When dubious: the engine's best reply (SAN) from the position right AFTER
   *  the opponent's deviation — the objectively-cleanest fix to teach alongside. */
  engineBest?: string;
  /** When dubious: the engine's short best continuation (SAN[]) from that same
   *  post-deviation position (the fix, a few plies). */
  engineBestLine?: string[];
}

/** A reply as a chapter shows it. `tab` is the course-sublines tab it is filed
 *  under — its identity: its narration, its review cards and its rungs all key
 *  off it (`sublineKey`, `sublineLineKey`). That is not always the chapter that
 *  shows it: a variation folded into the main line or into another tab hands
 *  its replies to the chapter whose line passes through them, and they keep
 *  their own tab (2026-10-27 — 70 replies, 61 narrated, sat on folded
 *  variations and showed nowhere). */
export interface ChapterSubline extends CourseSubline {
  tab: number;
}

/** What identifies a reply: the tab it is filed under, the move, the ply. */
export interface SublineRef {
  tab: number;
  triggerMove: string;
  atPly: number;
}

type SublinesByOpening = Record<string, Record<string, CourseSubline[]>>;
const SUBLINES = sublinesData as SublinesByOpening;

/** Every subline of an opening, keyed by its variation index — all of them,
 *  not only the ones on a curated tab. */
export function sublinesForOpening(openingId: string): Record<string, CourseSubline[]> {
  return SUBLINES[openingId] ?? {};
}

// The COURSE view of an opening (2026-06-15). Reframes an opening as a
// GM-style course: a numbered list of CHAPTERS (the main-line trunk + the
// curated variation tabs, in teaching order), each chapter a situational
// prescription wrapped around the WLPP ladder that already tracks its
// progress. Pure functions over an OpeningRecord — no UI, no Dexie writes.
// Everything the course UI renders (syllabus, "Chapter 3 of 12", per-chapter
// rings, Resume / Next up, finish line) is computed here.

export type ChapterStatus = 'not-started' | 'in-progress' | 'complete';

export interface CourseChapterRung {
  rung: Rung;
  label: string;
  complete: boolean;
  /** Playable now? Watch is always open; later rungs need the prior done. */
  unlocked: boolean;
}

export interface CourseChapter {
  /** 1-based chapter number shown to the student. */
  n: number;
  /** Line index into the WLPP ladder (MAIN_LINE_INDEX = -1 for the trunk). */
  lineIndex: number;
  /** Chapter title ("Main Line", "The Advance"). */
  label: string;
  /** The trunk chapter (the student's own line), vs an opponent-reply branch. */
  isMainLine: boolean;
  /** One-line "what you do here / why", best-effort from the variation data.
   *  Empty when the source carries no prose. */
  summary: string;
  rungs: CourseChapterRung[];
  completedRungs: number;
  totalRungs: number;
  /** 0..100 over this chapter's four rungs. */
  percent: number;
  status: ChapterStatus;
  /** Frequency-ranked opponent deviations inside this chapter (the second level
   *  of the tree — the depth that makes it a course). Empty for the main-line
   *  chapter and for forcing variations with no real deviation. */
  sublines: ChapterSubline[];
}

interface CourseNextStep {
  chapterN: number;
  lineIndex: number;
  rung: Rung;
}

interface OpeningCourse {
  openingId: string;
  title: string;
  chapters: CourseChapter[];
  /** Chapter count. */
  total: number;
  completedChapters: number;
  /** 1-based number of the chapter the student is on (first incomplete), or
   *  `total` once the course is complete. 0 only for an empty course. */
  currentChapter: number;
  /** Course-wide completion, 0..100, over every chapter's rungs. */
  percent: number;
  complete: boolean;
  /** Where "Resume / Next up" should send the student, or null when done. */
  nextStep: CourseNextStep | null;
}

/** First sentence of a prose blob, trimmed — the chapter's one-line "why". */
export function firstSentence(text: string | null | undefined): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  const end = trimmed.search(/[.!?](\s|$)/);
  if (end === -1) return trimmed;
  return trimmed.slice(0, end + 1).trim();
}

function pct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function buildChapter(
  opening: OpeningRecord,
  lineIndex: number,
  n: number,
  label: string,
  isMainLine: boolean,
  summary: string,
  sublines: ChapterSubline[],
): CourseChapter {
  const rungs: CourseChapterRung[] = RUNGS.map((rung) => ({
    rung,
    label: RUNG_LABEL[rung],
    complete: isRungComplete(opening, lineIndex, rung),
    unlocked: isRungUnlocked(opening, lineIndex, rung),
  }));
  const completedRungs = rungs.filter((r) => r.complete).length;
  const totalRungs = rungs.length;
  const status: ChapterStatus =
    completedRungs === 0 ? 'not-started' : completedRungs === totalRungs ? 'complete' : 'in-progress';
  return {
    n,
    lineIndex,
    label,
    isMainLine,
    summary,
    rungs,
    completedRungs,
    totalRungs,
    percent: pct(completedRungs, totalRungs),
    status,
    sublines,
  };
}

/** The lines a chapter teaches: its data line and the line its Watch lesson
 *  walks (often longer — it reaches the middlegame). */
function chapterLines(opening: OpeningRecord, index: number): string[][] {
  if (index === MAIN_LINE_INDEX) {
    return [pgnToSans(opening.pgn), lessonSpine(getLessonScript(opening.id))];
  }
  const v = opening.variations?.[index];
  if (!v) return [];
  return [pgnToSans(v.pgn), lessonSpine(getVariationLessonScript(opening.id, v.name))];
}

/** A reply belongs on a chapter when that chapter's line reaches the reply's
 *  move and plays something else there: the reply is the opponent's other
 *  choice at a position the chapter teaches. */
function lineReaches(line: string[], s: CourseSubline): boolean {
  if (line.length <= s.atPly || line[s.atPly] === s.triggerMove) return false;
  for (let i = 0; i < s.atPly; i++) if (line[i] !== s.moves[i]) return false;
  return true;
}

/** Every reply of an opening, on the chapter that shows it, keyed by chapter
 *  index. A shown tab keeps its own replies. A variation that is not a tab was
 *  folded into the chapter it duplicates (the same line, often run further —
 *  the Dragon's "Yugoslav Attack Main Line" is the main line 12 plies on), so
 *  its replies go to that chapter. A folded variation that duplicates none
 *  hands each reply to the first chapter — main line, then the tabs in order —
 *  whose line reaches its branch point. */
function placeSublines(opening: OpeningRecord, tabIndexes: number[]): Map<number, ChapterSubline[]> {
  const subs = SUBLINES[opening.id] ?? {};
  const shown = new Set(tabIndexes);
  const placed = new Map<number, ChapterSubline[]>();
  for (const index of tabIndexes) {
    placed.set(index, (subs[String(index)] ?? []).map((s) => ({ ...s, tab: index })));
  }
  const folded = Object.keys(subs).map(Number).filter((tab) => !shown.has(tab));
  if (folded.length === 0) return placed;
  const homes = [MAIN_LINE_INDEX, ...tabIndexes].map((index) => ({ index, lines: chapterLines(opening, index) }));
  for (const tab of folded) {
    const own = chapterLines(opening, tab);
    const same = homes.find((h) => h.lines.some((line) => own.some((o) => isSameLine(o, line))));
    for (const s of subs[String(tab)] ?? []) {
      const home = same ?? homes.find((h) => h.lines.some((line) => lineReaches(line, s)));
      if (!home) continue;
      const list = placed.get(home.index) ?? [];
      if (list.some((o) => o.atPly === s.atPly && o.triggerMove === s.triggerMove)) continue;
      list.push({ ...s, tab });
      placed.set(home.index, list);
    }
  }
  for (const list of placed.values()) list.sort((a, b) => b.games - a.games);
  return placed;
}

/**
 * Build the course view of an opening: the chapter list (main-line trunk +
 * curated variation tabs in teaching order) with per-chapter and course-wide
 * progress, the current chapter, and the Resume target. Mirrors exactly what
 * the detail page shows as tabs, so the syllabus and the page never disagree.
 */
export function buildCourse(opening: OpeningRecord): OpeningCourse {
  const tabs = buildVariationTabs(opening.id, opening.variations);
  const variations = opening.variations ?? [];

  const placed = placeSublines(opening, tabs.map((t) => t.index));
  const chapters: CourseChapter[] = [];

  // Chapter 1 — the trunk (main line). Summary from the opening overview. It
  // carries the replies of any variation folded into it.
  chapters.push(
    buildChapter(
      opening,
      MAIN_LINE_INDEX,
      1,
      'Main Line',
      true,
      firstSentence(opening.overview),
      placed.get(MAIN_LINE_INDEX) ?? [],
    ),
  );

  // Chapters 2..N — the curated variation tabs, in their pedagogical order, each
  // with its frequency-ranked sublines (the opponent's deviations within it).
  for (const tab of tabs) {
    const v = variations[tab.index];
    const summary = firstSentence(v?.overview ?? v?.explanation);
    chapters.push(
      buildChapter(opening, tab.index, chapters.length + 1, tab.label, false, summary, placed.get(tab.index) ?? []),
    );
  }

  const total = chapters.length;
  const completedChapters = chapters.filter((c) => c.status === 'complete').length;
  const totalRungs = chapters.reduce((sum, c) => sum + c.totalRungs, 0);
  const doneRungs = chapters.reduce((sum, c) => sum + c.completedRungs, 0);
  const complete = total > 0 && completedChapters === total;

  const firstIncomplete = chapters.find((c) => c.status !== 'complete');
  const currentChapter = complete ? total : firstIncomplete?.n ?? (total === 0 ? 0 : 1);

  let nextStep: CourseNextStep | null = null;
  if (firstIncomplete) {
    const rung = nextRung(opening, firstIncomplete.lineIndex);
    if (rung) {
      nextStep = { chapterN: firstIncomplete.n, lineIndex: firstIncomplete.lineIndex, rung };
    }
  }

  return {
    openingId: opening.id,
    title: opening.name,
    chapters,
    total,
    completedChapters,
    currentChapter,
    percent: pct(doneRungs, totalRungs),
    complete,
    nextStep,
  };
}
