// conceptRecord — WHICH CONCEPTS THE STUDENT HAS PROVEN, from their own record
// (David 2026-10-18: "not needed for players that demonstrate these concepts
// regularly"). Two halves, either one proves it:
//   • PUZZLES on the concept's theme, answered well over enough tries;
//   • the concept PLAYED BY THEM in their own games, often enough.
// Absent is not proven (grey teaches): a fresh student hears every concept.
import { db } from '../db/schema';
import { getThemeSkills } from './puzzleService';

/** The puzzle theme that trains each pattern (Lichess theme keys). */
const CONCEPT_THEME: Readonly<Record<string, string>> = {
  fork: 'fork', pin: 'pin', skewer: 'skewer', discovery: 'discoveredAttack',
  double_check: 'doubleCheck', back_rank: 'backRankMate', removal_of_guard: 'capturingDefender',
  trapped_piece: 'trappedPiece', mate_threat: 'mate', overload: 'overloading',
  danger_levels: 'defensiveMove',
};

/** Puzzles: at least this many tries on the theme, at this accuracy. */
const PROVEN_PUZZLE_ATTEMPTS = 10;
const PROVEN_PUZZLE_ACCURACY = 0.8;
/** Games: played by the student this many times, unprompted. */
const PROVEN_GAME_PLAYS = 3;

const KEY = 'concepts_played_v1';

async function readPlays(): Promise<Record<string, number>> {
  try { return JSON.parse((await db.meta.get(KEY))?.value ?? '{}') as Record<string, number>; } catch { return {}; }
}

/** The student played `type` in a game (their own move created it). */
export async function recordConceptPlayed(type: string): Promise<void> {
  const plays = await readPlays();
  plays[type] = (plays[type] ?? 0) + 1;
  try { await db.meta.put({ key: KEY, value: JSON.stringify(plays) }); } catch { /* best effort */ }
}

/** PURE: proven concepts from the two halves. */
export function provenConcepts(
  themeSkills: ReadonlyArray<{ theme: string; accuracy: number; attempts: number }>,
  plays: Readonly<Record<string, number>>,
): Set<string> {
  const out = new Set<string>();
  for (const [type, theme] of Object.entries(CONCEPT_THEME)) {
    const s = themeSkills.find((x) => x.theme === theme);
    if (s && s.attempts >= PROVEN_PUZZLE_ATTEMPTS && s.accuracy >= PROVEN_PUZZLE_ACCURACY) out.add(type);
    if ((plays[type] ?? 0) >= PROVEN_GAME_PLAYS) out.add(type);
  }
  return out;
}

/** The student's proven concepts, read once (a failed read is none proven). */
export async function loadProvenConcepts(): Promise<Set<string>> {
  const [skills, plays] = await Promise.all([getThemeSkills().catch(() => []), readPlays()]);
  return provenConcepts(skills, plays);
}
