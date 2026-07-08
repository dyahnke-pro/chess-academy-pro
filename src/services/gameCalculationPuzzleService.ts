/**
 * gameCalculationPuzzleService
 * ----------------------------
 * Turns the student's OWN mined mistakes (`mistakePuzzles` in Dexie)
 * into calculation-drill puzzles — but only the ones whose solution
 * line genuinely demonstrates a calculation skill's pattern.
 *
 * Flow per mistake puzzle:
 *   1. Take the stored solution line (`moves`, UCI, student-to-move).
 *   2. Run `matchCalculationThemes` — replays the line with chess.js and
 *      returns the calc-skill Lichess themes it actually exhibits
 *      (mate, quiet move, long, race, sacrifice, …). The stored motif
 *      tag is NOT trusted for this — the pattern is computed (G0/G3).
 *   3. Puzzles that match nothing are dropped (never force-fit).
 *   4. The rest are adapted into game-derived `RawPuzzle`s that the
 *      existing adaptive drill picker/runner already understand.
 *
 * The output is memoized for the session (classification is chess.js
 * work per puzzle); call `clearGameCalculationCache()` after new mistake
 * puzzles are written if a live refresh is needed.
 */
import { getAllMistakePuzzles } from './mistakePuzzleService';
import { getCalculationSkillById } from './calculationDrillService';
import { matchCalculationThemes } from './calculationSkillMatch';
import { pickConceptHint } from './puzzleConceptHint';
import type { RawPuzzle } from './adaptiveEndgameService';
import type { MistakePuzzle } from '../types';

const RATING_FLOOR = 600;
const RATING_CEILING = 2600;

/** Map the internal snake_case motif tag onto the camelCase key the
 *  concept-hint table uses, so a game puzzle carries a motif-aware hint
 *  ("Find the fork") on top of its calculation-skill themes. Motifs with
 *  no curated hint are omitted (the theme hint still applies). */
const TACTIC_TO_HINT_KEY: Record<string, string> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discovered_attack: 'discoveredAttack',
  double_check: 'doubleCheck',
  back_rank: 'backRankMate',
  hanging_piece: 'hangingPiece',
  trapped_piece: 'trappedPiece',
  deflection: 'deflection',
  x_ray: 'xRayAttack',
  clearance: 'clearance',
  interference: 'interference',
  zwischenzug: 'intermezzo',
  promotion: 'promotion',
};

/** Rough difficulty from calculation depth + how badly the student
 *  missed it. Deeper line and larger blunder → higher rating. The
 *  adaptive band does the real work; this only slots the puzzle roughly. */
function synthesizeRating(plies: number, cpLoss: number): number {
  const raw = 900 + plies * 90 + Math.min(Math.max(cpLoss, 0), 600) * 0.6;
  return Math.round(Math.max(RATING_FLOOR, Math.min(RATING_CEILING, raw)));
}

function sourceLabelFor(p: MistakePuzzle): string {
  if (p.opponentName) {
    const date = p.gameDate ? ` (${p.gameDate.slice(0, 10)})` : '';
    return `From your game vs ${p.opponentName}${date}`;
  }
  return 'From one of your games';
}

function conceptHintFor(p: MistakePuzzle, themes: string[]): string | undefined {
  const keys: string[] = [];
  if (p.tacticType && TACTIC_TO_HINT_KEY[p.tacticType]) {
    keys.push(TACTIC_TO_HINT_KEY[p.tacticType]);
  }
  keys.push(...themes);
  return pickConceptHint(keys) ?? undefined;
}

/** Build a game-derived RawPuzzle from a mistake puzzle, or null when
 *  its line matches no calculation skill pattern. */
export function mistakePuzzleToRawPuzzle(p: MistakePuzzle): RawPuzzle | null {
  const solutionUci = p.moves ? p.moves.split(/\s+/).filter(Boolean) : [];
  if (solutionUci.length === 0 && p.bestMove) solutionUci.push(p.bestMove);
  if (solutionUci.length === 0) return null;

  const themes = matchCalculationThemes(p.fen, solutionUci, {
    tacticType: p.tacticType,
    gamePhase: p.gamePhase,
  });
  if (themes.length === 0) return null;

  return {
    id: `gcalc-${p.id}`,
    fen: p.fen,
    moves: solutionUci.join(' '),
    rating: synthesizeRating(solutionUci.length, p.cpLoss),
    themes,
    openingTags: p.openingName ?? null,
    // Sentinels so a game puzzle always clears any popularity/plays
    // floor it's checked against (it has no Lichess play data).
    popularity: 100,
    nbPlays: 9999,
    noSetupMove: true,
    conceptHint: conceptHintFor(p, themes),
    sourceLabel: sourceLabelFor(p),
    sourceGameId: p.sourceGameId,
  };
}

let cache: Promise<RawPuzzle[]> | null = null;

/** All game-derived calculation puzzles the student's mistakes support,
 *  classified + memoized for the session. */
export function buildGameCalculationPuzzles(): Promise<RawPuzzle[]> {
  if (!cache) {
    cache = getAllMistakePuzzles()
      .then((puzzles) =>
        puzzles
          .map(mistakePuzzleToRawPuzzle)
          .filter((p): p is RawPuzzle => p !== null),
      )
      .catch(() => []);
  }
  return cache;
}

/** Drop the memo so the next build re-reads Dexie (e.g. after a game
 *  review adds new mistake puzzles). */
export function clearGameCalculationCache(): void {
  cache = null;
}

/** Game-derived puzzles whose themes intersect a calculation skill's
 *  theme set — the pool the drill blends in for that skill. Returns []
 *  for an unknown skill or when the student has no matching mistakes. */
export async function getGameCalculationPuzzlesForSkill(
  skillId: string,
): Promise<RawPuzzle[]> {
  const skill = getCalculationSkillById(skillId);
  if (!skill) return [];
  const themeSet = new Set(skill.themes);
  const excludeSet = new Set(skill.excludeThemes ?? []);
  const all = await buildGameCalculationPuzzles();
  return all.filter((p) => {
    if (skill.excludeThemes && p.themes.some((t) => excludeSet.has(t))) return false;
    return p.themes.some((t) => themeSet.has(t));
  });
}

/** How many game-derived puzzles match each of the given skills — for
 *  the picker tiles' "+N from your games" hint. Reuses the memoized
 *  build, so calling it for all skills is cheap. */
export async function countGameCalculationPuzzlesBySkill(
  skillIds: string[],
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    skillIds.map(
      async (id) => [id, (await getGameCalculationPuzzlesForSkill(id)).length] as const,
    ),
  );
  return Object.fromEntries(entries);
}
