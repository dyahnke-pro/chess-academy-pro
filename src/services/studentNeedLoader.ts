// studentNeedLoader — the impure adapter that builds a `StudentNeedContext`
// (needScore, unified-coach N2) from Dexie: how many analysed games the student
// has (cold start), their weakness signals, their book departures, how often
// they have already played THIS line correctly, and how they score in this
// opening vs overall. Loaded ONCE per game/lesson on the surface side, then
// handed to the pure computers — never per ply (the same contract as
// `weaknessSignalLoader`). Any Dexie failure degrades to the cold student, which
// makes the coach TEACH (the safe default), never throw. NEVER call on a kid
// surface.
//
// 🔒 TWO HALVES, SPLIT ON PURPOSE (B3, 2026-09-22). The Dexie read (the BASE:
// games, signals, departures, capabilities) is expensive and changes only when
// the record changes, so it is memoised. The LINE half (familiarity + the two
// scores) is a cheap pure derivation over the base, so it is recomputed for
// whatever line the caller holds AT FIRE TIME. They used to be one memo keyed
// on the first 24 plies of the line handed in at load — and the live hook
// loaded at MOUNT, with an empty history, so every Learn ply measured its
// familiarity against a zero-ply line: `lineReps = []` is truthy,
// `familiarity(undefined) = 0`, unfamiliarity 50 on every ply of every game.
// The term that makes a line the student has played right five times go
// QUIET was structurally dead on the surface it was built for.

import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { loadWeaknessSignals } from './weaknessSignalLoader';
import { getCachedBookDepartureRows } from './bookDeparturePrecompute';
import { resolvePlayerColor } from './conversionDetector';
import { criticalityThresholds } from './criticalityScan';
import { coldStudent, type StudentNeedContext } from './needScore';
import type { GameRecord, OpeningKey, UserPreferences } from '../types';
import { getCapabilityProfile } from './capabilityEvidence';
import { openingEntryForKey, openingFamily, sameOpeningFamily } from './openingKey';
import { fenKey } from './needScore';
import { isFixtureGame } from './fixtureGames';

const TTL_MS = 5 * 60 * 1000;

export interface StudentNeedQuery {
  rating: number;
  /** The sequence being narrated (SANs from the start), to measure familiarity. */
  sans: readonly string[];
  studentColor: 'white' | 'black';
  openingId?: OpeningKey | null;
  /** ECO of the game, when known — scopes the opening score (games are indexed by eco). */
  eco?: string | null;
}

/** The Dexie half of the student model — everything that does NOT depend on
 *  the line being narrated. Memoised; derive a context for a line with
 *  `contextForLine`. */
export interface StudentNeedBase {
  rating: number;
  studentColor: 'white' | 'black';
  openingId: OpeningKey | null;
  gamesPlayed: number;
  /** Decided games in this opening's FAMILY (A8) and whether it is the home opening (A3). */
  openingGames: number;
  homeOpening: boolean;
  signals: StudentNeedContext['signals'];
  bookDepartures: StudentNeedContext['bookDepartures'];
  capabilities: StudentNeedContext['capabilities'];
  /** Every non-master, non-fixture game (scores). */
  games: readonly GameRecord[];
  /** The analysed subset (familiarity needs evaluations). */
  analysed: readonly GameRecord[];
  /** Games in this opening (by id or eco) — the opening-score half. */
  inOpening: readonly GameRecord[];
  names: Parameters<typeof resolvePlayerColor>[1];
}

type BaseQuery = Omit<StudentNeedQuery, 'sans'>;
let baseCache: { at: number; key: string; base: StudentNeedBase } | null = null;

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
 *  prefix AND played that ply correctly (cpLoss within the band-free "notable"
 *  bar). Only the student's own plies count; the opponent's are 0.
 *
 *  🔒 THE ARRAY IS ONE LONGER THAN THE LINE. Index `sans.length` is the
 *  POSITION AFTER the line: games that followed the whole prefix and then
 *  played a clean student ply there, whatever the move was. A live surface
 *  asks about the ply the student is ABOUT to play — `positionFacts` derives
 *  the ply from the FEN, so on the student's turn `lineReps[ply - 1]` is
 *  exactly this index. Without it the upcoming decision always read as never
 *  seen, however many times the student had stood here. Review never reads
 *  the extra entry (its line is the whole game). */
export function lineRepsFromGames(
  games: readonly GameRecord[],
  sans: readonly string[],
  studentColor: 'white' | 'black',
  names: Parameters<typeof resolvePlayerColor>[1],
): number[] {
  const reps = new Array<number>(sans.length + 1).fill(0);
  const notable = criticalityThresholds().notable;
  const sign = studentColor === 'white' ? 1 : -1;
  const cleanStudentPly = (anns: NonNullable<GameRecord['annotations']>, i: number): boolean => {
    const isStudentPly = (i % 2 === 0) === (studentColor === 'white');
    if (!isStudentPly) return false;
    const a = anns[i];
    if (!a || a.evaluation == null || a.bestMoveEval == null) return false;
    return sign * (a.bestMoveEval - a.evaluation) <= notable;
  };
  for (const g of games) {
    if (g.isMasterGame || !g.annotations || g.annotations.length === 0) continue;
    const color = resolvePlayerColor(g, names);
    if (color !== studentColor) continue;
    const anns = g.annotations;
    let i = 0;
    for (; i < sans.length && i < anns.length; i += 1) {
      if (anns[i].san !== sans[i]) break;
      if (cleanStudentPly(anns, i)) reps[i] += 1;
    }
    // The whole line matched and the game went on: the position after it.
    if (i === sans.length && anns.length > sans.length && cleanStudentPly(anns, sans.length)) reps[sans.length] += 1;
  }
  return reps;
}

/** Position keys (board+side+castling+ep) after 0..n plies of the line — the
 *  join the departure term uses: a departure row belongs to THIS line when its
 *  last-in-book position is one of these, whatever either game was named. */
export function lineFenKeys(sans: readonly string[]): string[] {
  const c = new Chess();
  const out = [fenKey(c.fen())];
  for (const s of sans) {
    c.move(s);
    out.push(fenKey(c.fen()));
  }
  return out;
}

/** Decided (non-master, finished) games in a set. */
function decidedCount(games: readonly GameRecord[]): number {
  return games.filter((g) => !g.isMasterGame && g.result !== '*').length;
}

/** Is this key's family the persisted home opening for the student's colour? */
function isHomeFamily(
  key: OpeningKey | null,
  colour: 'white' | 'black',
  home: UserPreferences['homeOpenings'] | undefined,
): boolean {
  if (!key) return false;
  const choice = home?.[colour];
  if (!choice) return false;
  const entry = openingEntryForKey(key);
  return entry !== null && openingFamily(entry.name) === choice.family;
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

/** The Dexie half, memoised for TTL_MS. `null` = the read failed (the caller
 *  derives the cold student, which TEACHES). */
export async function loadStudentNeedBase(q: BaseQuery): Promise<StudentNeedBase | null> {
  const key = `${q.rating}:${q.studentColor}:${q.openingId ?? ''}:${q.eco ?? ''}`;
  if (baseCache && baseCache.key === key && Date.now() - baseCache.at < TTL_MS) return baseCache.base;
  try {
    const prefs = useAppStore.getState().activeProfile?.preferences;
    const names = { lichessUsername: prefs?.lichessUsername, chessComUsername: prefs?.chessComUsername };
    // D5: a review FIXTURE is never the student's game. The samples ship
    // `fullyAnalyzed: true`, so without this a fresh install counted as five
    // analysed games and lost its cold-start prior on day one (B7a).
    const [games, signals] = await Promise.all([
      db.games.filter((g) => !g.isMasterGame && !isFixtureGame(g)).toArray(),
      loadWeaknessSignals().catch(() => []),
    ]);
    const analysed = games.filter((g) => g.fullyAnalyzed);
    const bookDepartures = await getCachedBookDepartureRows(games, names, q.rating).catch(() => []);
    // "Your results in this opening": the FAMILY (Sicilian, not one Najdorf
    // sub-line), which is the unit the home-opening computer ranks. ECO is the
    // fallback for a game whose key never resolved (A1).
    // THE SEAT IS PART OF THE RECORD (walk 2026-09-23: a review opened with
    // "your 126th Sicilian" while the home card said 87 — the family filter
    // counted the student's games AGAINST the Sicilian as White too). "Your
    // record in this opening" is the record from the seat being reviewed.
    const inOpening = games.filter((g) => resolvePlayerColor(g, names) === q.studentColor
      && ((q.openingId && sameOpeningFamily(g.openingId, q.openingId)) || (!q.openingId && q.eco && g.eco === q.eco)));
    // THE POSITIVE HALF. `getCapabilityProfile` had three call sites before
    // 2026-09-18 and all three were in its own test, so every `held` row the
    // review pass had ever written was unreadable to the coach. Loaded beside
    // the weakness signals because they are two halves of ONE student model,
    // and a surface must never be able to load one without the other.
    const capabilities = await getCapabilityProfile().catch(() => new Map());
    const base: StudentNeedBase = {
      rating: q.rating,
      studentColor: q.studentColor,
      openingId: q.openingId ?? null,
      gamesPlayed: analysed.length,
      openingGames: decidedCount(inOpening),
      homeOpening: isHomeFamily(q.openingId ?? null, q.studentColor, prefs?.homeOpenings),
      signals,
      bookDepartures,
      capabilities,
      games,
      analysed,
      inOpening,
      names,
    };
    baseCache = { at: Date.now(), key, base };
    return base;
  } catch {
    return null;
  }
}

/** The LINE half — pure, cheap, and recomputed for whatever line the caller
 *  holds at fire time. A null base is the cold student (TEACH). */
export function contextForLine(base: StudentNeedBase | null, sans: readonly string[], rating: number): StudentNeedContext {
  if (!base) return coldStudent(rating);
  const line = legalPrefix(sans);
  return {
    rating: base.rating,
    gamesPlayed: base.gamesPlayed,
    signals: base.signals,
    bookDepartures: base.bookDepartures,
    capabilities: base.capabilities,
    openingId: base.openingId,
    openingGames: base.openingGames,
    homeOpening: base.homeOpening,
    lineFenKeys: lineFenKeys(line),
    lineReps: lineRepsFromGames(base.analysed, line, base.studentColor, base.names),
    openingScore: scoreShare(base.inOpening, base.names),
    overallScore: scoreShare(base.games, base.names),
  };
}

export async function loadStudentNeedContext(q: StudentNeedQuery): Promise<StudentNeedContext> {
  return contextForLine(await loadStudentNeedBase(q), q.sans, q.rating);
}

/** Drop the memo (new analysed game / drill) so the next load reflects it. */
export function invalidateStudentNeedContext(): void {
  baseCache = null;
}
