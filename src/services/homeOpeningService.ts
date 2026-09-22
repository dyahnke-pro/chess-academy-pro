// homeOpeningService — the persisted, audited half of the home-opening
// computer (WO-HOME-OPENING-01 A3). `homeOpening.ts` is the pure computer;
// this reads the student's games and profile, keeps the choice on the profile
// (`preferences.homeOpenings`), honours a student's one-tap override over any
// recompute, and EMITS `home-opening-chosen` so an audit can hold the
// decision to its contract (CLAUDE.md: every algo build ships with an audit
// tool — inputs, the term that carried it, the verdict).
import { db } from '../db/schema';
import { isFixtureGame } from './fixtureGames';
import { useAppStore } from '../stores/appStore';
import { logAppAudit } from './appAuditor';
import type { PlayerColor, PlayerIdentity } from './playerIdentity';
import {
  chooseHomeOpening, rankHomeOpeningCandidates, toChoice,
  HOME_OPENING_MIN_GAMES, HOME_OPENING_MIN_SHARE,
  type HomeOpeningChoice, type HomeOpeningRanking,
} from './homeOpening';
import type { UserProfile } from '../types';

export type HomeOpenings = Record<PlayerColor, HomeOpeningChoice | null>;

const COLOURS: readonly PlayerColor[] = ['white', 'black'];
const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; gameCount: number; rankings: Record<PlayerColor, HomeOpeningRanking> } | null = null;

async function loadProfile(): Promise<UserProfile | null> {
  return useAppStore.getState().activeProfile ?? (await db.profiles.toCollection().first()) ?? null;
}

function identityOf(p: UserProfile | null): PlayerIdentity {
  return {
    profileName: p?.name ?? null,
    chessComUsername: p?.preferences.chessComUsername ?? null,
    lichessUsername: p?.preferences.lichessUsername ?? null,
  };
}

/** Both colours' rankings, memoized for five minutes on the game count. */
export async function getHomeOpeningRankings(opts: { force?: boolean } = {}): Promise<Record<PlayerColor, HomeOpeningRanking>> {
  // Fixtures are not the student (D5): a seeded demo never votes for a home opening.
  const games = await db.games.filter((g) => !g.isMasterGame && !isFixtureGame(g)).toArray();
  if (!opts.force && cache && cache.gameCount === games.length && Date.now() - cache.at < TTL_MS) return cache.rankings;
  const identity = identityOf(await loadProfile());
  const rankings = {
    white: rankHomeOpeningCandidates(games, identity, 'white'),
    black: rankHomeOpeningCandidates(games, identity, 'black'),
  };
  cache = { at: Date.now(), gameCount: games.length, rankings };
  return rankings;
}

/** Test hook. */
export function __resetHomeOpeningCacheForTests(): void {
  cache = null;
}

async function persist(profile: UserProfile, next: HomeOpenings): Promise<void> {
  const preferences = { ...profile.preferences, homeOpenings: next };
  await db.profiles.update(profile.id, { preferences });
  const store = useAppStore.getState();
  if (store.activeProfile && store.activeProfile.id === profile.id) {
    store.setActiveProfile({ ...store.activeProfile, preferences });
  }
}

function emit(colour: PlayerColor, ranking: HomeOpeningRanking, choice: HomeOpeningChoice | null, reason: string): void {
  void logAppAudit({
    kind: 'home-opening-chosen',
    category: 'subsystem',
    source: 'homeOpeningService.getHomeOpenings',
    summary: choice
      ? `${colour}: ${choice.family} (${choice.games} games, ${Math.round(choice.score * 100)}%, ${choice.source}) — ${reason}`
      : `${colour}: no home opening yet (${ranking.totalGames} games, ${ranking.unkeyed} unkeyed) — ${reason}`,
    details: JSON.stringify({
      colour,
      reason,
      floor: { minGames: HOME_OPENING_MIN_GAMES, minShare: HOME_OPENING_MIN_SHARE },
      totalGames: ranking.totalGames,
      unkeyed: ranking.unkeyed,
      chosen: choice,
      candidates: ranking.candidates.slice(0, 8).map((c) => ({
        family: c.family, games: c.games, score: Number(c.score.toFixed(3)), share: Number(c.share.toFixed(3)), clearsFloor: c.clearsFloor,
      })),
    }),
  });
}

/**
 * The student's home openings, one per colour. A `student` choice on the
 * profile is kept as-is; otherwise the computer's pick is (re)computed and
 * persisted when it changes. Emits once per colour per (re)computation.
 */
export async function getHomeOpenings(opts: { force?: boolean } = {}): Promise<HomeOpenings> {
  const profile = await loadProfile();
  const stored: Partial<HomeOpenings> = profile?.preferences.homeOpenings ?? {};
  const rankings = await getHomeOpeningRankings(opts);
  const next: HomeOpenings = { white: stored.white ?? null, black: stored.black ?? null };
  let changed = false;
  for (const colour of COLOURS) {
    const current = stored[colour] ?? null;
    if (current?.source === 'student') continue;
    const pick = chooseHomeOpening(rankings[colour]);
    const computed = pick ? toChoice(pick, 'computed') : null;
    const same = (current?.family ?? null) === (computed?.family ?? null)
      && (current?.games ?? 0) === (computed?.games ?? 0);
    if (same) continue;
    next[colour] = computed;
    changed = true;
    emit(colour, rankings[colour], computed, current ? 'recomputed — the record moved' : 'computed from the record');
  }
  if (changed && profile) await persist(profile, next);
  return next;
}

/** One-tap change: the student picks a family from the ranked list. Any
 *  ranked family is theirs to pick — the floor binds the COMPUTER, not them. */
export async function setHomeOpening(colour: PlayerColor, family: string): Promise<HomeOpeningChoice | null> {
  const profile = await loadProfile();
  if (!profile) return null;
  const rankings = await getHomeOpeningRankings();
  const candidate = rankings[colour].candidates.find((c) => c.family === family);
  if (!candidate) return null;
  const choice = toChoice(candidate, 'student');
  const stored: Partial<HomeOpenings> = profile.preferences.homeOpenings ?? {};
  const next: HomeOpenings = { white: stored.white ?? null, black: stored.black ?? null, [colour]: choice };
  await persist(profile, next);
  emit(colour, rankings[colour], choice, 'student chose');
  return choice;
}

/** Back to the computer's pick. */
export async function clearHomeOpening(colour: PlayerColor): Promise<HomeOpenings> {
  const profile = await loadProfile();
  if (profile) {
    const stored: Partial<HomeOpenings> = profile.preferences.homeOpenings ?? {};
    await persist(profile, { white: stored.white ?? null, black: stored.black ?? null, [colour]: null });
  }
  return getHomeOpenings();
}
