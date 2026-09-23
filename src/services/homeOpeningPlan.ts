// homeOpeningPlan — THE TRAINING PLAN READS THE HOME OPENINGS (WO-HOME-OPENING-01
// A4, David 2026-09-22: "it should take what i play the most and improve the
// weaknesses within that … not some random opening i will never play").
//
// The plan used to be built on FAVOURITES only — empty with 932 games in. It is
// now built, per colour, from the persisted home opening and the RECORDED
// weaknesses inside it, in this order:
//   1. ANALYSE — the home games not yet analysed (the holes are invisible until
//      they are; A2 already runs them first, this says so on the plan).
//   2. THE WEAKEST LINE inside the family (`weakestVariation`: games × deficit).
//   3. THE DEPARTURE — where the student leaves book most often in this family
//      (the precomputed departure rows, grouped by last-in-book POSITION).
//   4. THE RECURRING FUNDAMENTALS — the weakness spine's rows whose games are
//      the home games (the spine's own `gameIds`, no second join).
//   5. THE MIDDLEGAME PLAN for its structure, when the corpus has one.
// Pure core (`homePlanFor`) + a loader (`buildHomeOpeningPlan`) that assembles
// the inputs from the same computers every other surface reads. Nothing here
// is authored: every line is a count off the record or a row the corpus holds.
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import type { BookDepartureRow } from './bookDepartureWeakness';
export type { PlayerColor } from './playerIdentity';
import { getCachedBookDepartureRows } from './bookDeparturePrecompute';
import { gameNeedsAnalysis } from './gameAnalysisService';
import { isFixtureGame } from './fixtureGames';
import { isHomeOpeningGame, weakestVariation, type HomeOpeningCandidate, type HomeOpeningChoice } from './homeOpening';
import { getHomeOpeningRankings, getHomeOpenings } from './homeOpeningService';
import { findPlanForOpening } from './middlegamePlanner';
import { openingEntryForKey } from './openingKey';
import type { PlayerColor, PlayerIdentity } from './playerIdentity';
import { resolveRepRoute, type RepRoute } from './repRouting';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { getUnifiedWeaknessProfile, type UnifiedWeakness } from './weaknessSpine';
import type { GameRecord, MiddlegamePlan } from '../types';

export type HomePlanRepKind = 'analyse' | 'weakest-line' | 'departure' | 'fundamental' | 'middlegame-plan';

export interface HomePlanRep {
  kind: HomePlanRepKind;
  key: string;
  label: string;
  subtitle: string;
  route: RepRoute;
}

export interface HomePlanSection {
  colour: PlayerColor;
  choice: HomeOpeningChoice;
  /** Home games on record and how many of them are analysed. */
  games: number;
  analysed: number;
  reps: HomePlanRep[];
}

export interface HomePlanInput {
  colour: PlayerColor;
  choice: HomeOpeningChoice;
  candidate: HomeOpeningCandidate | null;
  /** The student's games in this home opening (already seat-resolved). */
  homeGames: readonly GameRecord[];
  /** The spine's rows (all of them; filtered here by the home game ids). */
  weaknesses: readonly UnifiedWeakness[];
  /** Precomputed departures (all games; filtered here). */
  departures: readonly BookDepartureRow[];
  plan: MiddlegamePlan | null;
}

/** A departure counts as "here" when its last-in-book board is the same. */
const DEPARTURE_MIN_GAMES = 2;
const FUNDAMENTAL_REPS = 2;

export function homePlanFor(input: HomePlanInput): HomePlanSection {
  const { colour, choice, candidate, homeGames } = input;
  const homeIds = new Set(homeGames.map((g) => g.id));
  const analysed = homeGames.filter((g) => !gameNeedsAnalysis(g, { depthUpgrade: false })).length;
  const reps: HomePlanRep[] = [];

  // 1. Analyse what the coach cannot see yet.
  const unanalysed = homeGames.length - analysed;
  if (unanalysed > 0) {
    reps.push({
      kind: 'analyse',
      key: `home:${colour}:analyse`,
      label: `Analyse your ${choice.family} games`,
      subtitle: `${unanalysed} of your ${homeGames.length} ${choice.family} games aren't analysed yet — the holes inside it stay invisible until they are.`,
      route: { path: '/weaknesses' },
    });
  }

  // 2. The weakest line inside the family.
  const weakest = candidate ? weakestVariation(candidate) : null;
  if (weakest) {
    reps.push({
      kind: 'weakest-line',
      key: `home:${colour}:line:${weakest.key}`,
      label: `Your weakest line inside the ${choice.family}`,
      subtitle: `${weakest.name}: ${Math.round(weakest.score * 100)}% over ${weakest.games} games. Learn it, then play it.`,
      route: { path: `/openings/${weakest.key}` },
    });
  }

  // 3. Where they leave book, by POSITION.
  const byBoard = new Map<string, { rows: BookDepartureRow[] }>();
  for (const r of input.departures) {
    if (!homeIds.has(r.gameId)) continue;
    const k = r.bookFen.split(' ').slice(0, 4).join(' ');
    const slot = byBoard.get(k) ?? { rows: [] };
    slot.rows.push(r);
    byBoard.set(k, slot);
  }
  const topDeparture = [...byBoard.values()].sort((a, b) => b.rows.length - a.rows.length)[0];
  if (topDeparture && topDeparture.rows.length >= DEPARTURE_MIN_GAMES) {
    const r = topDeparture.rows[0];
    const moveNo = Math.ceil(r.departurePly / 2);
    const dots = r.departurePly % 2 === 0 ? '…' : '';
    reps.push({
      kind: 'departure',
      key: `home:${colour}:departure:${r.departurePly}:${r.departedSan}`,
      label: `Where you leave book in the ${choice.family}`,
      subtitle: `Move ${moveNo}: ${dots}${r.departedSan} instead of ${dots}${r.mainSan}, in ${topDeparture.rows.length} games. Learn the line past that point.`,
      route: { path: `/openings/${choice.key}` },
    });
  }

  // 4. The recurring fundamentals inside those games — the spine's own join.
  const inside = input.weaknesses
    .filter((w) => w.openCount > 0 && w.gameIds.some((id) => homeIds.has(id)))
    .map((w) => ({ w, games: w.gameIds.filter((id) => homeIds.has(id)).length }))
    .sort((a, b) => b.games - a.games || b.w.severity - a.w.severity)
    // One hole, one rep (walk 5, S2a): a fundamental row and the tag it files
    // under are the same drill — the first-ranked keeps the slot.
    .filter(({ w }, i, all) => all.findIndex((o) => (o.w.capabilityTag ?? o.w.key) === (w.capabilityTag ?? w.key)) === i)
    .slice(0, FUNDAMENTAL_REPS); // a plan's shape (the daily feed), not a cap on facts — the Weaknesses hub lists them all
  for (const { w, games } of inside) {
    reps.push({
      kind: 'fundamental',
      key: `home:${colour}:fundamental:${w.key}`,
      label: w.label,
      subtitle: `${games === 1 ? 'In one' : `In ${games}`} of your ${choice.family} games. Drill it.`,
      route: resolveRepRoute({ kind: 'weakness', key: w.key, label: w.label, subtitle: '', tag: w.tag, puzzleThemes: w.puzzleThemes, fen: w.fen }),
    });
  }

  // 5. The middlegame plan for the structure, when the corpus has one.
  if (input.plan) {
    reps.push({
      kind: 'middlegame-plan',
      key: `home:${colour}:plan:${input.plan.id}`,
      label: `Middlegame plan: ${input.plan.title}`,
      subtitle: `The plan the ${choice.family} leads to — play it out with the coach.`,
      route: { path: `/coach/session/middlegame?subject=${encodeURIComponent(input.plan.title)}` },
    });
  }

  return { colour, choice, games: homeGames.length, analysed, reps };
}

function identityOf(): PlayerIdentity {
  const p = useAppStore.getState().activeProfile;
  return { profileName: p?.name ?? null, chessComUsername: p?.preferences.chessComUsername ?? null, lichessUsername: p?.preferences.lichessUsername ?? null };
}

/** The plan for the corpus opening the home key resolves to: the key IS the
 *  Dexie id, so the exact-id lookup is the honest one; the planner's fuzzy
 *  fallback on the family name is what a masterclass id shares with it. */
function planForHome(choice: HomeOpeningChoice): MiddlegamePlan | null {
  const entry = openingEntryForKey(choice.key);
  return findPlanForOpening(choice.key) ?? (entry ? findPlanForOpening(entry.name.split(':')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')) : null);
}

/** Both colours' sections; null for a colour with no home opening yet. */
export async function buildHomeOpeningPlan(): Promise<Record<PlayerColor, HomePlanSection | null>> {
  const home = await getHomeOpenings();
  const out: Record<PlayerColor, HomePlanSection | null> = { white: null, black: null };
  if (!home.white && !home.black) return out;
  const identity = identityOf();
  const [games, rankings, weaknesses] = await Promise.all([
    db.games.filter((g) => !g.isMasterGame && !isFixtureGame(g)).toArray(),
    getHomeOpeningRankings(),
    getUnifiedWeaknessProfile().catch(() => [] as UnifiedWeakness[]),
  ]);
  const rating = useAppStore.getState().activeProfile?.currentRating ?? DEFAULT_STUDENT_RATING;
  const departures = await getCachedBookDepartureRows(games, { chessComUsername: identity.chessComUsername ?? undefined, lichessUsername: identity.lichessUsername ?? undefined }, rating).catch(() => [] as BookDepartureRow[]);
  for (const colour of ['white', 'black'] as const) {
    const choice = home[colour];
    if (!choice) continue;
    const homeGames = games.filter((g) => isHomeOpeningGame(g, identity, { [colour]: choice }));
    const candidate = rankings[colour].candidates.find((c) => c.family === choice.family) ?? null;
    out[colour] = homePlanFor({ colour, choice, candidate, homeGames, weaknesses, departures, plan: planForHome(choice) });
  }
  return out;
}
