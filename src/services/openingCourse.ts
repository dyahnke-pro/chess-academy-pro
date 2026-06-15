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
import { buildVariationTabs } from './variationTabs';

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
}

export interface CourseNextStep {
  chapterN: number;
  lineIndex: number;
  rung: Rung;
}

export interface OpeningCourse {
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
function firstSentence(text: string | null | undefined): string {
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
  };
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

  const chapters: CourseChapter[] = [];

  // Chapter 1 — the trunk (main line). Summary from the opening overview.
  chapters.push(
    buildChapter(
      opening,
      MAIN_LINE_INDEX,
      1,
      'Main Line',
      true,
      firstSentence(opening.overview),
    ),
  );

  // Chapters 2..N — the curated variation tabs, in their pedagogical order.
  for (const tab of tabs) {
    const v = variations[tab.index];
    const summary = firstSentence(v?.overview ?? v?.explanation);
    chapters.push(
      buildChapter(opening, tab.index, chapters.length + 1, tab.label, false, summary),
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
