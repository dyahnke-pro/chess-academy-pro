/** Hand-crafted endgame data — see src/data/mating-patterns.json. */

export interface MatingLessonPosition {
  fen: string;
  /** Number of moves to mate from this position. null when unknown
   *  (only set for piece-mate fundamentals where the position is a
   *  starting setup, not a "find mate in N" puzzle). */
  movesToMate: number | null;
  /** SAN sequence of the solution. Most pychess study positions don't
   *  carry the moves — the canonical positions are visual references.
   *  Practice puzzles with full solutions come from the Lichess
   *  puzzle DB at runtime via endgameService. */
  solution?: string[];
  /** Author's note from the pychess source (game citation, history,
   *  etc.). Surfaced in the lesson UI as a small caption. */
  sourceComment?: string;
}

export interface MatingPatternNarration {
  /** Voice-first geometry intro (2-3 short sentences). Read aloud
   *  when the lesson starts. */
  intro: string;
  /** When to spot it — recognition cue, 1 sentence. */
  recognition: string;
  /** Optional historical note — namesake, origin (1 sentence). */
  history?: string;
  /** Optional coaching tip — practical pointer (1 sentence). */
  tip?: string;
}

export interface MatingPattern {
  /** Slug — e.g. "anastasias-mate". Used as the URL param + cache key. */
  id: string;
  /** Canonical name as written in chess literature. */
  name: string;
  /** Alternate names — e.g. "Philidor's Legacy" for Smothered Mate. */
  aliases?: string[];
  /** Whether this is a named tactical pattern or a piece-mate
   *  fundamental (K+Q, K+R, B+N etc.). */
  category: 'named-pattern' | 'piece-mate';
  /** Pieces involved — for filtering the picker. */
  pieces: string[];
  /** Lichess puzzle DB theme tag for the reinforcement corpus. Not
   *  every pattern has one — Lichess only tags 18 named patterns. */
  puzzleThemeTag?: string;
  /** Canonical reference positions from the pychess Lichess Practice
   *  studies. The first position (movesToMate=1) is the recognition
   *  reference; multi-move positions are example setups. The runtime
   *  practice corpus comes from the Lichess puzzle DB filtered by
   *  themeTag + multi-move mate themes. */
  lessonPositions: MatingLessonPosition[];
  /** Hand-crafted narration. Read aloud via Polly TTS. */
  narration: MatingPatternNarration;
}
