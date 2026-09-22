// homeOpening — THE HOME-OPENING COMPUTER (WO-HOME-OPENING-01 A3, David
// 2026-09-22: "it should take what i play the most and improve the weaknesses
// within that … some of the best players started with one opening for each
// color and learned everything they could about it").
//
// One home opening per colour, chosen from what the student PLAYS MOST. Pure:
// games in, a ranked candidate list out; the service beside it persists the
// choice and emits the decision. Stress-tested before building (PLAN.md):
//
//   • "Most played" is the FAMILY ("Vienna Game"), not a name-string — a
//     student's Vienna splits across C25/C28 sub-lines and the sub-lines are
//     carried as `variations` so the plan and the drills can target the one
//     that bleeds. The family comes from the ONE opening key (A1) resolved
//     back to its entry; a game without a key is counted but cannot vote.
//   • A FLOOR, or the Elephant Gambit wins again: a family under
//     HOME_OPENING_MIN_GAMES games, or under HOME_OPENING_MIN_SHARE of the
//     colour's games, is a candidate the student may PICK but the computer
//     never CHOOSES. `chooseHomeOpening` is volume-first among those that
//     clear it; a 3-game 0% line can never win (gate: homeOpening.test.ts).
//   • Score is (wins + ½ draws) / decided — a fact about the record, never a
//     rating; the coach reads it to find the weaknesses INSIDE the home
//     opening, not to decide how much to say (CLAUDE.md: rating is strength).
import type { GameRecord, OpeningKey } from '../types';
import { resolvePlayerColor, resolveGameOutcome, type PlayerColor, type PlayerIdentity } from './playerIdentity';
import { openingEntryForKey, openingFamily } from './openingKey';

/** A family needs this many games before the computer may choose it. */
export const HOME_OPENING_MIN_GAMES = 10;
/** …and this share of the colour's keyed games. */
export const HOME_OPENING_MIN_SHARE = 0.05;

/** THE ONE VOLUME FLOOR — for the home pick AND for every "which opening"
 *  verdict the chat lanes speak (`openingVolumeFloor` delegates here; two
 *  floors drifted the day they were both written). Both arms: at least
 *  HOME_OPENING_MIN_GAMES games AND at least HOME_OPENING_MIN_SHARE of the
 *  colour's games. AND, not OR: a share arm on its own lets a 5-game line
 *  lead a win-rate verdict on a 100-game account, and five games is noise. */
export function clearsHomeFloor(games: number, colourGames: number): boolean {
  if (games < HOME_OPENING_MIN_GAMES) return false;
  return colourGames <= 0 || games / colourGames >= HOME_OPENING_MIN_SHARE;
}

export interface HomeOpeningVariation {
  key: OpeningKey;
  name: string;
  games: number;
  /** (wins + ½ draws) / decided games, 0–1. */
  score: number;
}

export interface HomeOpeningCandidate {
  family: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  score: number;
  /** Share of the colour's KEYED games. */
  share: number;
  /** Most-played key inside the family — what a lesson or a Play line anchors on. */
  key: OpeningKey;
  /** Sub-lines by volume, most-played first. */
  variations: HomeOpeningVariation[];
  /** Clears both floors — the computer may choose it. */
  clearsFloor: boolean;
}

export interface HomeOpeningRanking {
  colour: PlayerColor;
  /** Student games as this colour, master games and unfinished ones excluded. */
  totalGames: number;
  /** Of those, games that carry no opening key (left every named line at ply 0,
   *  or a PGN that would not replay) — counted, never voting. */
  unkeyed: number;
  /** Most-played first. */
  candidates: HomeOpeningCandidate[];
}

export interface HomeOpeningChoice {
  family: string;
  key: OpeningKey;
  games: number;
  score: number;
  /** `computed` = the computer's volume pick; `student` = a one-tap override,
   *  which a recompute never overwrites. */
  source: 'computed' | 'student';
  chosenAt: number;
}

interface Tally { wins: number; draws: number; losses: number; games: number }
const tally = (): Tally => ({ wins: 0, draws: 0, losses: 0, games: 0 });
const scoreOf = (t: Tally): number => {
  const decided = t.wins + t.draws + t.losses;
  return decided === 0 ? 0 : (t.wins + t.draws * 0.5) / decided;
};

/** Rank the student's families for one colour, most-played first. */
export function rankHomeOpeningCandidates(
  games: readonly GameRecord[],
  identity: PlayerIdentity,
  colour: PlayerColor,
): HomeOpeningRanking {
  let totalGames = 0;
  let unkeyed = 0;
  type KeyTally = Tally & { name: string };
  type FamilyTally = Tally & { keys: Map<OpeningKey, KeyTally> };
  const families = new Map<string, FamilyTally>();
  for (const g of games) {
    if (g.isMasterGame || g.result === '*') continue;
    if (resolvePlayerColor(g, identity) !== colour) continue;
    totalGames += 1;
    const entry = g.openingId ? openingEntryForKey(g.openingId) : null;
    if (!g.openingId || !entry) { unkeyed += 1; continue; }
    const family = openingFamily(entry.name);
    const fam: FamilyTally = families.get(family) ?? { ...tally(), keys: new Map<OpeningKey, KeyTally>() };
    const key: KeyTally = fam.keys.get(g.openingId) ?? { ...tally(), name: entry.name };
    const outcome = resolveGameOutcome(g, colour);
    const tallies: Tally[] = [fam, key];
    for (const t of tallies) {
      t.games += 1;
      if (outcome === 'win') t.wins += 1;
      else if (outcome === 'draw') t.draws += 1;
      else if (outcome === 'loss') t.losses += 1;
    }
    fam.keys.set(g.openingId, key);
    families.set(family, fam);
  }
  const keyed = totalGames - unkeyed;
  const candidates: HomeOpeningCandidate[] = [...families.entries()].map(([family, fam]) => {
    const variations: HomeOpeningVariation[] = [...fam.keys.entries()]
      .map(([key, t]) => ({ key, name: t.name, games: t.games, score: scoreOf(t) }))
      .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
    const share = keyed === 0 ? 0 : fam.games / keyed;
    return {
      family,
      games: fam.games,
      wins: fam.wins,
      draws: fam.draws,
      losses: fam.losses,
      score: scoreOf(fam),
      share,
      key: variations[0].key,
      variations,
      clearsFloor: clearsHomeFloor(fam.games, keyed),
    };
  }).sort((a, b) => b.games - a.games || a.family.localeCompare(b.family));
  return { colour, totalGames, unkeyed, candidates };
}

/** The computer's pick: the MOST-PLAYED family that clears the floor. Null
 *  when nothing does — a cold record has no home opening yet, and the coach
 *  says so rather than crowning a 3-game line. */
export function chooseHomeOpening(ranking: HomeOpeningRanking): HomeOpeningCandidate | null {
  return ranking.candidates.find((c) => c.clearsFloor) ?? null;
}

/** Sub-lines a student may reasonably be judged on. */
export const VARIATION_MIN_GAMES = 5;

/** The variation INSIDE a home opening that bleeds the most: games × score
 *  deficit, among sub-lines with enough games to mean anything. Null when no
 *  sub-line qualifies or none is below 50%. This is "improve the weaknesses
 *  within it" at the line level; the per-ply holes come from the weakness spine. */
export function weakestVariation(candidate: HomeOpeningCandidate): HomeOpeningVariation | null {
  let best: HomeOpeningVariation | null = null;
  let bestDeficit = 0;
  for (const v of candidate.variations) {
    if (v.games < VARIATION_MIN_GAMES) continue;
    const deficit = v.games * Math.max(0, 0.5 - v.score);
    if (deficit > bestDeficit) { best = v; bestDeficit = deficit; }
  }
  return best;
}

/** Freeze a candidate as a choice. */
export function toChoice(c: HomeOpeningCandidate, source: HomeOpeningChoice['source'], now = Date.now()): HomeOpeningChoice {
  return { family: c.family, key: c.key, games: c.games, score: c.score, source, chosenAt: now };
}

/** Is this one of the student's HOME-opening games — played as the colour
 *  whose home family the game's key resolves to? A Pirc the student faced as
 *  White is not their Pirc. */
export function isHomeOpeningGame(
  g: GameRecord,
  identity: PlayerIdentity,
  home: Partial<Record<PlayerColor, { family: string } | null>>,
): boolean {
  if (!g.openingId || g.isMasterGame) return false;
  const colour = resolvePlayerColor(g, identity);
  if (!colour) return false;
  const h = home[colour];
  if (!h) return false;
  const entry = openingEntryForKey(g.openingId);
  return entry !== null && openingFamily(entry.name) === h.family;
}

/** THE ANALYSIS ORDER (WO-HOME-OPENING-01 A2, David: "beautiful idea"): the
 *  home openings' games first — ALL of them, both colours — then everything
 *  else newest-first. "Improve the weaknesses within it" is empty until the
 *  games in it are analysed, so a batch that takes "50 most recent" leaves the
 *  coach recommending the Pirc with nothing to say about it. Stable within
 *  each half (newest first). */
export function orderGamesForAnalysis<T extends GameRecord>(
  games: readonly T[],
  identity: PlayerIdentity,
  home: Partial<Record<PlayerColor, { family: string } | null>>,
): { home: T[]; rest: T[] } {
  const stamp = (g: GameRecord): number => (g.date ? new Date(g.date).getTime() : 0);
  const byDate = [...games].sort((a, b) => stamp(b) - stamp(a));
  const homeGames: T[] = [];
  const rest: T[] = [];
  for (const g of byDate) (isHomeOpeningGame(g, identity, home) ? homeGames : rest).push(g);
  return { home: homeGames, rest };
}
