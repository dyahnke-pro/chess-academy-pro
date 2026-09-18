// studentNeedLoader — the impure adapter that builds a `StudentNeedContext`
// (needScore, unified-coach N2) from Dexie: how many analysed games the student
// has (cold start), their weakness signals, their book departures, how often
// they have already played THIS line correctly, and how they score in this
// opening vs overall. Loaded ONCE per game/lesson on the surface side, then
// handed to the pure computers — never per ply (the same contract as
// `weaknessSignalLoader`). Any Dexie failure degrades to the cold student, which
// makes the coach TEACH (the safe default), never throw. NEVER call on a kid
// surface.

import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { loadWeaknessSignals } from './weaknessSignalLoader';
import { getCachedBookDepartureRows } from './bookDeparturePrecompute';
import { resolvePlayerColor } from './conversionDetector';
import { criticalityThresholds } from './criticalityScan';
import { coldStudent, type StudentNeedContext } from './needScore';
import type { GameRecord } from '../types';
import { getCapabilityProfile } from './capabilityEvidence';

const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; key: string; ctx: StudentNeedContext } | null = null;

export interface StudentNeedQuery {
  rating: number;
  /** The sequence being narrated (SANs from the start), to measure familiarity. */
  sans: readonly string[];
  studentColor: 'white' | 'black';
  openingId?: string | null;
  /** ECO of the game, when known — scopes the opening score (games are indexed by eco). */
  eco?: string | null;
}

/** Score share for the student in a set of games (1 win, ½ draw), or null when
 *  fewer than MIN_SCORE_GAMES decided games back it. */
const MIN_SCORE_GAMES = 4;
function scoreShare(games: readonly GameRecord[], names: Parameters<typeof resolvePlayerColor>[1]): number | null {
  let pts = 0;
  let n = 0;
  for (const g of games) {
    if (g.isMasterGame || g.result === '*') continue;
    const color = resolvePlayerColor(g, names);
    if (!color) continue;
    n += 1;
    if (g.result === '1/2-1/2') pts += 0.5;
    else if ((g.result === '1-0') === (color === 'white')) pts += 1;
  }
  return n >= MIN_SCORE_GAMES ? pts / n : null;
}

/** Per ply of `sans`: how many prior games by this student followed the same
 *  prefix AND played that ply correctly (cpLoss within the rating's "notable"
 *  bar). Only the student's own plies count; the opponent's are 0. */
export function lineRepsFromGames(
  games: readonly GameRecord[],
  sans: readonly string[],
  studentColor: 'white' | 'black',
  names: Parameters<typeof resolvePlayerColor>[1],
  rating: number,
): number[] {
  const reps = new Array<number>(sans.length).fill(0);
  const notable = criticalityThresholds(rating).notable;
  for (const g of games) {
    if (g.isMasterGame || !g.annotations || g.annotations.length === 0) continue;
    const color = resolvePlayerColor(g, names);
    if (color !== studentColor) continue;
    const anns = g.annotations;
    for (let i = 0; i < sans.length && i < anns.length; i += 1) {
      if (anns[i].san !== sans[i]) break;
      const isStudentPly = (i % 2 === 0) === (studentColor === 'white');
      if (!isStudentPly) continue;
      const a = anns[i];
      if (a.evaluation == null || a.bestMoveEval == null) continue;
      const sign = studentColor === 'white' ? 1 : -1;
      const cpLoss = sign * (a.bestMoveEval - a.evaluation);
      if (cpLoss <= notable) reps[i] += 1;
    }
  }
  return reps;
}

/** Sanity-replay the SANs so a corrupt sequence never poisons the reps. */
function legalPrefix(sans: readonly string[]): string[] {
  const c = new Chess();
  const out: string[] = [];
  for (const s of sans) {
    try { if (!c.move(s)) break; } catch { break; }
    out.push(s);
  }
  return out;
}

export async function loadStudentNeedContext(q: StudentNeedQuery): Promise<StudentNeedContext> {
  const key = `${q.studentColor}:${q.openingId ?? ''}:${q.eco ?? ''}:${q.sans.slice(0, 24).join(' ')}`;
  if (cache && cache.key === key && Date.now() - cache.at < TTL_MS) return cache.ctx;
  try {
    const prefs = useAppStore.getState().activeProfile?.preferences;
    const names = { lichessUsername: prefs?.lichessUsername, chessComUsername: prefs?.chessComUsername };
    const [games, signals] = await Promise.all([
      db.games.filter((g) => !g.isMasterGame).toArray(),
      loadWeaknessSignals().catch(() => []),
    ]);
    const analysed = games.filter((g) => g.fullyAnalyzed);
    const bookDepartures = await getCachedBookDepartureRows(games, names, q.rating).catch(() => []);
    const sans = legalPrefix(q.sans);
    const inOpening = games.filter((g) => (q.openingId && g.openingId === q.openingId) || (q.eco && g.eco === q.eco));
    // THE POSITIVE HALF. `getCapabilityProfile` had three call sites before
    // 2026-09-18 and all three were in its own test, so every `held` row the
    // review pass had ever written was unreadable to the coach. Loaded beside
    // the weakness signals because they are two halves of ONE student model,
    // and a surface must never be able to load one without the other.
    const capabilities = await getCapabilityProfile().catch(() => new Map());
    const ctx: StudentNeedContext = {
      rating: q.rating,
      gamesPlayed: analysed.length,
      signals,
      bookDepartures,
      capabilities,
      openingId: q.openingId ?? null,
      lineReps: lineRepsFromGames(analysed, sans, q.studentColor, names, q.rating),
      openingScore: scoreShare(inOpening, names),
      overallScore: scoreShare(games, names),
    };
    cache = { at: Date.now(), key, ctx };
    return ctx;
  } catch {
    return coldStudent(q.rating);
  }
}

/** Drop the memo (new analysed game / drill) so the next load reflects it. */
export function invalidateStudentNeedContext(): void {
  cache = null;
}
