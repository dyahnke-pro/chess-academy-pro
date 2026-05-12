/**
 * puzzleConceptHint
 * -----------------
 * Maps Lichess puzzle theme tags to short concept-hint strings.
 * Surfaced under the puzzle description after the student plays a
 * wrong first move, giving them a textual nudge toward the core
 * idea without revealing the move.
 *
 * Per CLAUDE.md narration voice rules: concrete chess vocabulary,
 * no UI references, no acknowledgments. Each hint is 4-8 words.
 *
 * The mapping is selective — when a puzzle has multiple themes the
 * caller picks the most-specific one (longer match wins). Generic
 * themes ('endgame', 'middlegame') don't get hints; only tactical
 * or structural themes that tell the student WHAT to look for.
 */

/** Priority list — earlier entries are more specific, win the
 *  mapping race when a puzzle has multiple matches. */
const HINT_ENTRIES: Array<readonly [string, string]> = [
  // Mate-in-N — depth tells the student to calculate further.
  ['mateIn1', 'Find the mate in one'],
  ['mateIn2', 'Find the forced mate in two'],
  ['mateIn3', 'Find the forced mate in three'],
  ['mateIn4', 'Find the forced mate in four'],
  ['mateIn5', 'Find the forced mate in five'],
  // Named mating patterns.
  ['backRankMate', 'Look for the back-rank weakness'],
  ['smotheredMate', 'Smother the king'],
  ['arabianMate', 'Knight + rook coordinate against the corner'],
  ['anastasiaMate', 'Knight + rook lock the king on the edge'],
  ['doubleBishopMate', 'Both bishops aim at the king'],
  // Tactical motifs.
  ['fork', 'Find the fork'],
  ['pin', 'Use the pin'],
  ['skewer', 'Find the skewer'],
  ['discoveredAttack', 'Look for a discovered attack'],
  ['discoveredCheck', 'Find the discovered check'],
  ['doubleCheck', 'Both pieces check at once'],
  ['deflection', 'Force the defender off its square'],
  ['attraction', 'Lure the king to a bad square'],
  ['interference', 'Block the defender’s line'],
  ['xRayAttack', 'Find the X-ray'],
  ['clearance', 'Clear the path for a heavier piece'],
  ['intermezzo', 'Insert the in-between move'],
  ['sacrifice', 'Find the winning sacrifice'],
  ['exposedKing', 'Strike at the exposed king'],
  ['quietMove', 'The winning move isn’t a check or capture'],
  ['hangingPiece', 'Win the undefended piece'],
  ['trappedPiece', 'Trap the piece'],
  // Endgame themes.
  ['advancedPawn', 'Push the passed pawn'],
  ['promotion', 'Promote the pawn'],
  ['underPromotion', 'Underpromotion wins'],
  ['zugzwang', 'Force the bad move with zugzwang'],
  ['kingsideAttack', 'Crash through on the kingside'],
  ['queensideAttack', 'Open the queenside files'],
  // Piece-type endgames (fallback hints — less specific).
  ['queenRookEndgame', 'Activate the heavier pieces'],
  ['rookEndgame', 'Use rook activity'],
  ['queenEndgame', 'Centralize the queen'],
  ['bishopEndgame', 'Use bishop reach'],
  ['knightEndgame', 'Outpost the knight'],
  ['pawnEndgame', 'King + pawn technique'],
  // Defensive themes.
  ['defensiveMove', 'Find the only saving move'],
  ['stalemate', 'Hold or force the stalemate'],
  ['perpetualCheck', 'Force perpetual check'],
];

const HINT_MAP = new Map(HINT_ENTRIES);

/** Pick the best concept-hint for a puzzle given its theme array.
 *  Returns null when no themes match the curated map. Caller can
 *  fall back to lesson-level guidance (e.g., `lesson.narration.rule`). */
export function pickConceptHint(themes: ReadonlyArray<string>): string | null {
  // Earlier entries in HINT_ENTRIES are more specific — iterate in
  // map-insertion order and return the first match.
  for (const [theme, hint] of HINT_ENTRIES) {
    if (themes.includes(theme)) return hint;
  }
  return null;
}

/** Test-only export — the mapping itself, for snapshot/coverage. */
export const _internals = { HINT_MAP, HINT_ENTRIES };
