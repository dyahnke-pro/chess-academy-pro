/**
 * upNextLoader — reads the student's record into the Up-next picker and FREEZES
 * today's ring (the first RING_SIZE picks) so finishing one bite never
 * reshuffles the other two. One read path for Home and every hub.
 */
import { db } from '../db/schema';
import { getUnifiedWeaknessProfile } from './weaknessSpine';
import { getUnlearnedFavoriteOpenings } from './openingService';
import { getSrsDueOpenings } from './srsOpeningService';
import { buildTodaysReps } from './trainingPlanSelector';
import { getCompletedRepKeysToday, onRepCompleted } from './repCompletion';
import { onWeaknessModelChanged } from './weaknessModelEvents';
import { isFixtureGame, isFixtureGameId } from './fixtureGames';
import { loadFreeTier, hasFreeOpeningRoom } from './freeTierService';
import { isPaywallGateEnabled, useEntitlementStore } from '../stores/entitlementStore';
import { solveLengthOf } from './mistakeLineGrowth';
import {
  rankUpNext, currentPick, sectionPick, START_STEPS, THINKING_LESSON_LIVE,
  type UpNextPick, type PickHub, type UpNextInput, type StartStep, type ThinkingSignal,
} from './upNextPicker';
import { heatMap, type HeatTile } from './heatMap';
import { lessonStepForCard, loadThinkingTransfer } from './thinkingLessonStart';
import { transferGapLine, worstGap } from './thinkingTransfer';
import type { StepChoice } from './thinkingLessonPlan';
import { THINKING_STEPS } from './thinkingSteps';
import { isBeginnerMode } from './ratingBands';
import { START_FUNDAMENTALS_KEY } from './activeBite';
import { useAppStore } from '../stores/appStore';
import { RING_SIZE, dayKey } from './trainingWeek';
import { logAppAudit } from './appAuditor';
import { dueEndgameReviews } from './endgameDueReview';
import { BOOK_DEPARTURE_PREFIX } from './bookDepartureWeakness';
import { asOpeningKey, openingEntryForKey } from './openingKey';
import type { UnifiedWeakness } from './weaknessSpine';
import type { OpeningHole } from './upNextPicker';

export interface UpNextState {
  ring: UpNextPick[];
  done: Set<string>;
  /** The first not-done pick — the ring's, then anything after it. */
  current: UpNextPick | null;
  /** Every candidate, best first — what a hub reads its own section's pick from. */
  ranked: UpNextPick[];
  /** The tier-1 thinking-habit standing the ranking used (null = not offered). */
  thinking: ThinkingSignal | null;
  /** Each hub's own next bite — the one its Up next bar starts. A Record over
   *  the hubs that carry a bar, so a hub that holds bites cannot be left
   *  without one (the Coach hub had none: a fresh ring could never close). */
  section: Record<UpNextSection, UpNextPick | null>;
}

/** The hubs with an Up next bar, and which picks each one starts. */
export type UpNextSection = 'tactics' | 'openings' | 'coach';
const SECTION_HUBS: Record<UpNextSection, (hub: PickHub) => boolean> = {
  tactics: (h) => h.startsWith('tactics:'),
  openings: (h) => h === 'openings',
  coach: (h) => h === 'coach',
};

const ringKey = (d: Date): string => `today_ring_${dayKey(d)}`;

/** Free user on a paywall build — the only student the free opening and the
 *  earned opening ever concern. */
export function freeUserOnPaywall(): boolean {
  try {
    return isPaywallGateEnabled() && !useEntitlementStore.getState().isPro;
  } catch {
    return false;
  }
}

/** Which Start-here steps are left, read from the record: the Fundamentals
 *  page opened, the Italian / Two Knights main line watched, a coach game
 *  played. Empty outside beginner mode. */
export async function loadStartSteps(): Promise<StartStep[]> {
  if (!isBeginnerMode(useAppStore.getState().activeProfile)) return [];
  const [fund, italian, twoKnights, coachGames] = await Promise.all([
    db.meta.get(START_FUNDAMENTALS_KEY).catch(() => undefined),
    db.openings.get('italian-game').catch(() => undefined),
    db.openings.get('two-knights-defence').catch(() => undefined),
    db.games.where('source').equals('coach').count().catch(() => 0),
  ]);
  const done: Record<StartStep, boolean> = {
    fundamentals: !!fund,
    italian: (italian?.linesDiscovered?.length ?? 0) > 0,
    'first-game': coachGames > 0,
    'black-e5': (twoKnights?.linesDiscovered?.length ?? 0) > 0,
  };
  return START_STEPS.filter((s) => !done[s]);
}

/** The card's standing, read off the step the lesson WOULD teach (PURE).
 *  RED when the lesson is about to teach a step the student keeps failing (in
 *  games, led by the tile with the most open slips; or in lessons), GREY when
 *  it would teach an unproven step (grey means teach it), GREEN when every step
 *  is proven and it would only review. Null when the chooser has no step. */
export function thinkingSignalFrom(choice: StepChoice | null, tiles: readonly HeatTile[], gap: string | null = null): ThinkingSignal | null {
  if (!choice) return null;
  const step = THINKING_STEPS[choice.step.step].name;
  const withGap = (sig: ThinkingSignal): ThinkingSignal => (gap ? { ...sig, gap } : sig);
  if (choice.reason === 'game-weakness') {
    const worst = tiles
      .filter((t) => t.state === 'red' && choice.step.tags.includes(t.tag))
      .sort((a, b) => b.openCount + b.broken - (a.openCount + a.broken))[0];
    return withGap({ state: 'red', skill: worst?.label ?? step, step });
  }
  if (choice.reason === 'red-first') return withGap({ state: 'red', skill: step, step });
  if (choice.reason === 'review') return withGap({ state: 'green', skill: step, step });
  // A mixed round of proven steps: green, and the card says it is a mix.
  if (choice.reason === 'mixed') return withGap({ state: 'green', skill: 'Mixed practice', step: 'Which question does the board ask?' });
  return withGap({ state: 'grey', skill: step, step });
}

async function loadThinkingSignal(): Promise<ThinkingSignal | null> {
  if (!THINKING_LESSON_LIVE) return null;
  const [evidence, slips] = await Promise.all([
    db.capabilityEvidence.toArray().catch(() => []),
    db.misconceptionTags.toArray().catch(() => []),
  ]);
  const tiles = heatMap(evidence, slips);
  const transfer = await loadThinkingTransfer();
  const gap = worstGap(transfer);
  return thinkingSignalFrom(
    await lessonStepForCard(tiles, isBeginnerMode(useAppStore.getState().activeProfile), transfer).catch(() => null),
    tiles,
    gap ? transferGapLine(gap) : null,
  );
}

/** The openings the student keeps leaving the book in, read off the spine's
 *  book-departure rows (already gated: early for their rating, costly, in 2+
 *  games). Most games first. */
export function openingHolesFrom(weaknesses: readonly UnifiedWeakness[]): OpeningHole[] {
  const prefix = `${BOOK_DEPARTURE_PREFIX}:`;
  const out: OpeningHole[] = [];
  for (const w of weaknesses) {
    if (!w.tag.startsWith(prefix)) continue;
    const key = asOpeningKey(w.tag.slice(prefix.length));
    const name = key ? openingEntryForKey(key)?.name : null;
    if (!key || !name) continue;
    out.push({ openingId: key, name, games: w.gameIds.length || w.total });
  }
  return out.sort((a, b) => b.games - a.games);
}

export async function loadUpNextInput(): Promise<UpNextInput> {
  const [weaknesses, srsDue, newLines, mistakes, ownGames, freeTier, startSteps] = await Promise.all([
    getUnifiedWeaknessProfile().catch(() => []),
    getSrsDueOpenings().catch(() => []),
    getUnlearnedFavoriteOpenings().catch(() => []),
    db.mistakePuzzles.toArray().catch(() => []),
    db.games.filter((g) => !g.isMasterGame && !isFixtureGame(g)).count().catch(() => 0),
    loadFreeTier(),
    loadStartSteps().catch(() => [] as StartStep[]),
  ]);
  const reps = buildTodaysReps({ weaknesses, srsDue, newLines, total: 5 });

  // The newest own game's biggest unsolved slip.
  const own = mistakes.filter((m) => !isFixtureGameId(m.sourceGameId) && m.status !== 'mastered');
  const newest = [...own].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const slip = newest
    ? own.filter((m) => m.sourceGameId === newest.sourceGameId && m.status === 'unsolved').sort((a, b) => b.cpLoss - a.cpLoss)[0]
    : undefined;

  // A puzzle that grew and is due.
  const today = new Date().toISOString().split('T')[0];
  const grown = own.find((m) => solveLengthOf(m) > 1 && m.srsDueDate <= today && m.id !== slip?.id);

  return {
    reps,
    latestGameSlip: slip ? { puzzleId: slip.id, opponent: slip.opponentName, cpLoss: slip.cpLoss } : null,
    grownPuzzle: grown ? { puzzleId: grown.id, length: solveLengthOf(grown) } : null,
    freeOpeningOpen: freeUserOnPaywall() && hasFreeOpeningRoom(freeTier),
    coldStart: ownGames === 0 && own.length === 0,
    startSteps,
    thinking: await loadThinkingSignal().catch(() => null),
    endgameDue: (await dueEndgameReviews().catch(() => []))[0] ?? null,
    openingHoles: openingHolesFrom(weaknesses),
  };
}

// One read per session, refreshed when a bite finishes or the record changes —
// the record walk is seconds on a big library, and Home + every hub read it.
let cached: { at: number; p: Promise<UpNextState> } | null = null;
const CACHE_MS = 5 * 60 * 1000;
onRepCompleted(() => { cached = null; });
onWeaknessModelChanged(() => { cached = null; });

export function loadUpNext(now: Date = new Date()): Promise<UpNextState> {
  if (cached && now.getTime() - cached.at < CACHE_MS) return cached.p;
  const p = loadUpNextFresh(now);
  cached = { at: now.getTime(), p };
  p.catch(() => { cached = null; });
  return p;
}

async function loadUpNextFresh(now: Date): Promise<UpNextState> {
  const [input, done, frozen] = await Promise.all([
    loadUpNextInput(),
    getCompletedRepKeysToday(),
    db.meta.get(ringKey(now)).catch(() => undefined),
  ]);
  const ranked = rankUpNext(input);
  let ring: UpNextPick[];
  try {
    ring = frozen ? (JSON.parse(frozen.value) as UpNextPick[]) : [];
  } catch {
    ring = [];
  }
  if (ring.length === 0) {
    ring = ranked.slice(0, RING_SIZE);
    if (ring.length > 0) await db.meta.put({ key: ringKey(now), value: JSON.stringify(ring) });
    // The day's pick, observable (algo-audit rule): which bites, from which
    // record, frozen once a day.
    void logAppAudit({
      kind: 'up-next-chosen',
      category: 'subsystem',
      source: 'upNextLoader.loadUpNext',
      summary: `ring: ${ring.map((p) => p.kind).join(', ')}`,
      details: JSON.stringify({
        ring: ring.map((p) => ({ kind: p.kind, key: p.key, bite: p.bite })),
        candidates: ranked.length,
        coldStart: input.coldStart,
        hasSlip: !!input.latestGameSlip,
        hasGrown: !!input.grownPuzzle,
        freeOpeningOpen: input.freeOpeningOpen,
        thinking: input.thinking?.state ?? null,
        openingHoles: input.openingHoles.map((h) => ({ openingId: h.openingId, games: h.games })),
        importance: ring.map((p) => p.importance ?? null),
      }),
    });
  }
  // Up next: a beginner's next Start-here step leads even over today's frozen
  // ring (the ring may have frozen before they answered the strength
  // question); then the ring; once it is closed, whatever the record says next.
  const start = input.startSteps.length > 0 ? ranked.find((p) => p.kind === 'start' && !done.has(p.key)) : undefined;
  const current = start ?? currentPick(ring, done) ?? currentPick(ranked, done);
  const section = Object.fromEntries((Object.keys(SECTION_HUBS) as UpNextSection[])
    .map((k) => [k, sectionPick(ranked, done, SECTION_HUBS[k])])) as Record<UpNextSection, UpNextPick | null>;
  return { ring, done, current, ranked, thinking: input.thinking, section };
}

/** Up next may have changed (a bite finished): the one signal a surface needs
 *  to re-read the pick, so it never reaches past this door. */
export function onUpNextChanged(fn: () => void): () => void {
  return onRepCompleted(() => fn());
}
