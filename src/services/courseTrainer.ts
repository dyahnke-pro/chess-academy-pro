import type { OpeningRecord } from '../types';
import { buildCourse } from './openingCourse';
import { pgnToSans } from './openingSublines';

// Adaptive tree-trainer (David 2026-06-15: "board-adaptive, weighted by the
// learner signal"). Self-contained — reuses the course's drillable lines (main +
// variations + sublines) and a weak-spot weighting; it does NOT touch the locked
// /coach/play room. The opponent's moves are auto-played; the student plays their
// own moves on the board, validated against the line. Missed lines come back more.

export interface DrillLine {
  id: string;
  label: string;
  studentColor: 'white' | 'black';
  /** Full SAN line from the start position. */
  moves: string[];
}

export interface TrainerProgress {
  attempts: number;
  misses: number;
}

/** All drillable lines of a course: the main line, every variation, and every
 *  frequency-derived subline. Lines shorter than 2 plies are skipped. */
export function buildDrillLines(opening: OpeningRecord): DrillLine[] {
  const lines: DrillLine[] = [];
  const color = opening.color;

  const main = pgnToSans(opening.pgn);
  if (main.length >= 2) lines.push({ id: 'main', label: 'Main Line', studentColor: color, moves: main });

  (opening.variations ?? []).forEach((v, i) => {
    const m = pgnToSans(v.pgn);
    if (m.length >= 2) lines.push({ id: `var-${i}`, label: v.name, studentColor: color, moves: m });
  });

  const course = buildCourse(opening);
  for (const ch of course.chapters) {
    for (const s of ch.sublines) {
      if (s.moves.length >= 2) {
        lines.push({
          id: `sub-${ch.lineIndex}-${s.triggerMove}-${s.atPly}`,
          label: `${ch.label}: ${s.name}`,
          studentColor: color,
          moves: s.moves,
        });
      }
    }
  }
  return lines;
}

/** Whose move is it at a 0-based ply (ply 0 = White's first move)? */
export function isStudentPly(plyIndex: number, studentColor: 'white' | 'black'): boolean {
  const whiteToMove = plyIndex % 2 === 0;
  return whiteToMove === (studentColor === 'white');
}

/** The ply indices where the STUDENT is to move (the moves they must produce). */
export function studentPlies(line: DrillLine): number[] {
  return line.moves.map((_, i) => i).filter((i) => isStudentPly(i, line.studentColor));
}

/** Adaptive weight for a line: unseen lines get a mild boost; missed lines come
 *  back proportionally more often (the learner signal). */
export function lineWeight(progress?: TrainerProgress): number {
  if (!progress || progress.attempts === 0) return 2;
  const missRate = progress.misses / Math.max(1, progress.attempts);
  return 1 + missRate * 4;
}

/** Weighted-random next line, biased toward weak (high-miss) + unseen lines.
 *  `rand` is injectable for deterministic tests. */
export function selectNextLine(
  lines: DrillLine[],
  progress: Record<string, TrainerProgress>,
  rand: () => number = Math.random,
): DrillLine | null {
  if (lines.length === 0) return null;
  const weights = lines.map((l) => lineWeight(progress[l.id]));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < lines.length; i++) {
    r -= weights[i];
    if (r <= 0) return lines[i];
  }
  return lines[lines.length - 1];
}
