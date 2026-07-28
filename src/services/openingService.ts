import { db } from '../db/schema';
import type { OpeningRecord, DrillAttempt } from '../types';
import { fuzzyScore } from '../utils/fuzzySearch';
import { expandOpeningAbbrev } from '../utils/openingAbbrev';
import { MAIN_LINE_INDEX } from '../utils/wlppLadder';
import { buildVariationTabs } from './variationTabs';
import { enrollOpeningLine } from './srsOpeningService';
import { captureEvent } from './analytics';
import openingManifests from '../data/opening-manifests.json';
import antiOpeningsData from '../data/anti-openings.json';
import gambitData from '../data/gambits.json';

// ─── Opening name helpers ────────────────────────────────────────────────────

/** Derive the family-level name from a (possibly deep) opening name.
 *
 *  The openings DB names variations as `<Family>: <Variation>` (e.g.
 *  `"Italian Game: Two Knights Defense"`). The family is everything
 *  before the first colon. Family-level openings have no colon and
 *  return their own name unchanged.
 *
 *  Used by the rolodex Puzzles selector (WO-ROLODEX-PLUMBING-01
 *  item 11) for family-fallback: when a deep variation has no
 *  exact-name puzzle matches, walk up to the family and query
 *  there. `OpeningRecord` has no parent/family field — this is the
 *  derivation. */
export function getOpeningFamily(name: string): string {
  const colonIdx = name.indexOf(':');
  if (colonIdx === -1) return name.trim();
  return name.slice(0, colonIdx).trim();
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns all repertoire openings, optionally filtered by color, sorted by mastery (weakest first). */
export async function getRepertoireOpenings(
  color?: 'white' | 'black',
): Promise<OpeningRecord[]> {
  // NOTE: IndexedDB does not support boolean keys, so `.where('isRepertoire')
  // .equals(true)` throws DataError ("parameter is not a valid key") and — since
  // this powers the Openings tab load — leaves it stuck on "Loading openings…".
  // Filter in JS instead (the pattern seedFlashcardsForRepertoire already uses).
  const all = await db.openings.filter((o) => o.isRepertoire).toArray();
  const filtered = color ? all.filter((o) => o.color === color) : all;
  return filtered.sort((a, b) => getMasteryPercent(a) - getMasteryPercent(b));
}

/** Slug-level aliases for opening IDs whose canonical form in our DB
 *  differs from a spelling the user (or a URL) might use. Used by
 *  `getOpeningById` to transparently resolve either spelling to the
 *  canonical record without renaming 40+ files or orphaning user-state
 *  (favorites / SRS cards / weakness rows / etc.) that key on the old id.
 *
 *  Current entries:
 *  - `pirc-defense` → `pirc-defence`: the Lichess DB slugifies "Pirc Defense"
 *    (American) to `pirc-defense`, but our curated repertoire/lessons/plans
 *    all key on the British `pirc-defence` (chosen by
 *    scripts/dedupe-british-american.mjs because that's where the curated
 *    content lives). Without this alias, navigating to /openings/pirc-defense
 *    returns "Opening not found".
 *
 *  Add an entry only when a spelling needs to resolve to a different
 *  canonical id; this is NOT a place for human-typed name aliases (those
 *  live in src/services/openingAliases.ts). */
export const OPENING_ID_ALIASES: Record<string, string> = {
  'pirc-defense': 'pirc-defence',
  // The Glek System was promoted to its own masterclass (`glek-system`, David
  // 2026-07-03). The raw Lichess ECO twin `c47-four-knights-game-glek-system`
  // (Watch + book readings only) must resolve to the rich masterclass so a
  // search/browse tap lands on the full course, not the bare reference page.
  'c47-four-knights-game-glek-system': 'glek-system',
};

/** Returns a single opening by its ID. Honours `OPENING_ID_ALIASES`: if
 *  the direct lookup misses, retries with the aliased canonical id so
 *  /openings/<alias> URLs resolve to the canonical record. */
export async function getOpeningById(
  id: string,
): Promise<OpeningRecord | undefined> {
  // Guard an undefined/empty key: `useParams` types the route id as `string`
  // but returns `string | undefined` at runtime, and callers fire-and-forget
  // (`void getOpeningById(id).then(...)`). `db.openings.get(undefined)` throws
  // IndexedDB `DataError: Provided data is inadequate` → an unhandled rejection
  // (24 hits on prod, iOS). No valid opening has a falsy id, so short-circuit
  // to the "not found" contract every caller already handles.
  if (!id) return undefined;
  // Alias FIRST — an alias source can also exist as its own bare DB record (the
  // ECO twin `c47-four-knights-game-glek-system` → `glek-system` masterclass);
  // a direct-first lookup would return the bare twin and never reach the alias.
  const aliased = OPENING_ID_ALIASES[id];
  if (aliased) {
    const canonical = await db.openings.get(aliased);
    if (canonical) return canonical;
  }
  return db.openings.get(id);
}

/** Returns all openings matching a given ECO code. */
export async function getOpeningByEco(eco: string): Promise<OpeningRecord[]> {
  return db.openings.where('eco').equals(eco).toArray();
}

/**
 * Full-text search over opening names (case-insensitive substring match).
 * Also matches on ECO code prefix.
 */
export async function searchOpenings(query: string): Promise<OpeningRecord[]> {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();

  const all = await db.openings.toArray();

  // Normalized form so "Kings Indian" start-matches "King's Indian
  // Defense". Apostrophes are REMOVED (not spaced) — "King's" → "kings"
  // (matching "Kings"), not "king s" — then other punctuation becomes a
  // word separator.
  const norm = (s: string): string => s.toLowerCase().replace(/['‘’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const normQuery = norm(query);

  // Score every opening and keep matches
  const scored: Array<{ opening: OpeningRecord; score: number }> = [];
  for (const o of all) {
    // Skip records that are an alias SOURCE — they resolve to a canonical
    // masterclass (e.g. the bare `c47-four-knights-game-glek-system` ECO twin
    // → `glek-system`). Listing both would double up a "Glek System" result;
    // the canonical rich record is kept, the bare reference twin hidden.
    if (o.id in OPENING_ID_ALIASES) continue;
    // ECO prefix match (always exact)
    if (o.eco.toLowerCase().startsWith(lower)) {
      scored.push({ opening: o, score: -1 });
      continue;
    }
    // Fuzzy name match
    const s = fuzzyScore(query, o.name);
    if (s !== null) {
      // Start-of-name bonus: a query matching the START of the opening's
      // own name ("Kings Indian" → "King's Indian Defense") ranks ABOVE a
      // mid-name match ("Benoni Defense: King's Indian System"). Without
      // it, the alphabetical tiebreak floats Benoni/English "...King's
      // Indian Formation" above the real King's Indian Defense (audit
      // 2026-06-02).
      const startsBonus = normQuery && norm(o.name).startsWith(normQuery) ? -100 : 0;
      scored.push({ opening: o, score: s + startsBonus });
    }
  }

  // Casual-shorthand fallback: nothing matched the raw query, but it may carry
  // an abbreviation the token matchers can't score ("Scandi panov"). Expand
  // whole-word abbreviations and retry once so search (dashboard + openings
  // page) resolves casual input (David 2026-07-16). Guarded on `expanded !==
  // query` so it never loops.
  if (scored.length === 0) {
    const expanded = expandOpeningAbbrev(query);
    if (expanded !== query) return searchOpenings(expanded);
  }

  // Sort by score (lower = better), then alphabetically
  scored.sort((a, b) => a.score - b.score || a.opening.name.localeCompare(b.opening.name));
  return scored.map((s) => s.opening);
}

/** Returns all openings (both repertoire and ECO reference), sorted by ECO code. */
export async function getAllOpenings(): Promise<OpeningRecord[]> {
  const all = await db.openings.toArray();
  return all.sort((a, b) => a.eco.localeCompare(b.eco) || a.name.localeCompare(b.name));
}

/** Returns openings whose ECO code starts with the given letter (A, B, C, D, or E). */
export async function getOpeningsByEcoLetter(letter: string): Promise<OpeningRecord[]> {
  const upper = letter.toUpperCase();
  const all = await db.openings.toArray();
  return all
    .filter((o) => o.eco.startsWith(upper))
    .sort((a, b) => a.eco.localeCompare(b.eco) || a.name.localeCompare(b.name));
}

// ─── Progress ─────────────────────────────────────────────────────────────────

/**
 * Records a drill attempt and updates rolling accuracy and lastStudied.
 *
 * @param correct  whether the attempt was correct
 * @param timeSeconds  seconds taken to complete the main line (Woodpecker tracking)
 */
export async function updateDrillProgress(
  id: string,
  correct: boolean,
): Promise<void> {
  const opening = await db.openings.get(id);
  if (!opening) return;

  const attempts = opening.drillAttempts + 1;
  const accuracy =
    (opening.drillAccuracy * opening.drillAttempts + (correct ? 1 : 0)) /
    attempts;

  const updates: Partial<OpeningRecord> = {
    drillAttempts: attempts,
    drillAccuracy: accuracy,
    lastStudied: new Date().toISOString(),
  };

  await db.openings.update(id, updates);
}

/**
 * Updates Woodpecker Method tracking fields after a full drill-through of the
 * main line.
 */
export async function updateWoodpecker(
  id: string,
  timeSeconds: number,
): Promise<void> {
  const opening = await db.openings.get(id);
  if (!opening) return;

  const reps = opening.woodpeckerReps + 1;
  const prevSpeed = opening.woodpeckerSpeed;
  // Rolling average speed
  const newSpeed =
    prevSpeed === null ? timeSeconds : (prevSpeed * (reps - 1) + timeSeconds) / reps;

  await db.openings.update(id, {
    woodpeckerReps: reps,
    woodpeckerSpeed: newSpeed,
    woodpeckerLastDate: new Date().toISOString().split('T')[0],
  });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * Returns the repertoire openings with the weakest drill accuracy.
 * Openings never drilled (drillAttempts === 0) are ranked last to encourage
 * exploration.
 */
export async function getWeakestOpenings(
  limit: number = 5,
  color?: 'white' | 'black',
): Promise<OpeningRecord[]> {
  const repertoire = await getRepertoireOpenings(color);

  return repertoire
    .slice()
    .sort((a, b) => {
      // Never-drilled openings sort after drilled ones but before well-drilled
      const aScore = a.drillAttempts === 0 ? 0.5 : a.drillAccuracy;
      const bScore = b.drillAttempts === 0 ? 0.5 : b.drillAccuracy;
      return aScore - bScore;
    })
    .slice(0, limit);
}

/**
 * Returns the repertoire openings the student drills BEST — highest drill
 * accuracy first, among openings actually practiced (drillAttempts >= MIN).
 * Never-drilled openings are excluded (you can't be "strongest" at something
 * you've never trained). The deterministic backing for the coach's
 * "what's my strongest opening?" answer (G0 — code computes, LLM voices).
 */
const MIN_DRILL_ATTEMPTS_FOR_STRENGTH = 3;
export async function getStrongestOpenings(
  limit: number = 3,
  color?: 'white' | 'black',
): Promise<OpeningRecord[]> {
  const repertoire = await getRepertoireOpenings(color);
  return repertoire
    .filter((o) => o.drillAttempts >= MIN_DRILL_ATTEMPTS_FOR_STRENGTH)
    .sort((a, b) => b.drillAccuracy - a.drillAccuracy || b.drillAttempts - a.drillAttempts)
    .slice(0, limit);
}

/**
 * Returns the student's MOST-PLAYED openings, counted from their real game
 * history (`db.games` grouped by `openingId`), joined to the repertoire record
 * for the display name + color. The deterministic backing for "what's my
 * favorite / most-played opening?". Falls back to most-DRILLED (drillAttempts)
 * when there's no game history yet. `withCount` carries the game tally so the
 * coach can voice "you've played the Sicilian 42 times".
 */
export async function getMostPlayedOpenings(
  limit: number = 3,
  color?: 'white' | 'black',
): Promise<Array<{ opening: OpeningRecord; games: number }>> {
  const repertoire = await getRepertoireOpenings(color);
  const byId = new Map(repertoire.map((o) => [o.id, o]));
  // Count games per openingId (only openings that are in the repertoire so we
  // have a clean display name + color).
  const counts = new Map<string, number>();
  try {
    const games = await db.games.toArray();
    for (const g of games) {
      if (!g.openingId) continue;
      const rec = byId.get(g.openingId);
      if (!rec) continue;
      if (color && rec.color !== color) continue;
      counts.set(g.openingId, (counts.get(g.openingId) ?? 0) + 1);
    }
  } catch {
    /* no games store / read error — fall through to the drill fallback */
  }
  const played = [...counts.entries()]
    .map(([id, games]) => ({ opening: byId.get(id) as OpeningRecord, games }))
    .filter((x) => x.opening)
    .sort((a, b) => b.games - a.games);
  if (played.length > 0) return played.slice(0, limit);
  // Fallback: most-DRILLED opening = de-facto favorite (report games: 0 so the
  // assembler phrases it as "most-practiced" rather than "most-played").
  return repertoire
    .filter((o) => o.drillAttempts > 0)
    .sort((a, b) => b.drillAttempts - a.drillAttempts)
    .slice(0, limit)
    .map((opening) => ({ opening, games: 0 }));
}

/**
 * Returns openings due for Woodpecker review — those not drilled in the
 * last N days or never drilled.
 */
export async function getWoodpeckerDue(
  daysSince: number = 7,
  color?: 'white' | 'black',
): Promise<OpeningRecord[]> {
  const repertoire = await getRepertoireOpenings(color);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysSince);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return repertoire.filter(
    (o) =>
      o.woodpeckerLastDate === null || o.woodpeckerLastDate <= cutoffStr,
  );
}

// ─── Mastery ─────────────────────────────────────────────────────────────────

/**
 * Calculates mastery percentage (0-100) from the last 10 drill attempts.
 * Falls back to drillAccuracy if no drillHistory exists.
 * Returns 0 if never drilled.
 */
export function getMasteryPercent(opening: OpeningRecord): number {
  if (opening.drillHistory && opening.drillHistory.length > 0) {
    const recent = opening.drillHistory.slice(-10);
    const correct = recent.filter((a) => a.correct).length;
    return Math.round((correct / recent.length) * 100);
  }
  if (opening.drillAttempts === 0) return 0;
  return Math.round(opening.drillAccuracy * 100);
}

/** Returns true when mastery is below 70%. */
export function needsReview(opening: OpeningRecord): boolean {
  if (opening.drillAttempts === 0) return false;
  return getMasteryPercent(opening) < 70;
}

/**
 * Records a drill attempt to the rolling drillHistory (max 10 entries).
 */
export async function recordDrillAttempt(
  id: string,
  correct: boolean,
  timeSeconds: number,
): Promise<void> {
  const opening = await db.openings.get(id);
  if (!opening) return;

  const entry: DrillAttempt = {
    correct,
    time: timeSeconds,
    date: new Date().toISOString(),
  };

  const history = [...(opening.drillHistory ?? []), entry].slice(-10);

  await db.openings.update(id, { drillHistory: history });
  // Also update legacy drillAccuracy/drillAttempts for backward compat
  await updateDrillProgress(id, correct);
}

// ─── Line Tracking (Chess Reps style) ────────────────────────────────────────

/** Marks a variation as "discovered" (learned). Idempotent. */
export async function markLineDiscovered(
  id: string,
  variationIndex: number,
): Promise<void> {
  const opening = await db.openings.get(id);
  if (!opening) return;
  const discovered = opening.linesDiscovered ? [...opening.linesDiscovered] : [];
  if (!discovered.includes(variationIndex)) {
    discovered.push(variationIndex);
    await db.openings.update(id, { linesDiscovered: discovered });
  }
}

/** Marks a variation as "learned" (completed the Learn run). Idempotent. */
export async function markLineLearned(
  id: string,
  variationIndex: number,
): Promise<void> {
  const opening = await db.openings.get(id);
  if (!opening) return;
  const learned = opening.linesLearned ? [...opening.linesLearned] : [];
  if (!learned.includes(variationIndex)) {
    learned.push(variationIndex);
    await db.openings.update(id, { linesLearned: learned });
  }
}

/** Marks a variation as "perfected" (practiced without errors). Idempotent. */
export async function markLinePerfected(
  id: string,
  variationIndex: number,
): Promise<void> {
  const opening = await db.openings.get(id);
  if (!opening) return;
  const perfected = opening.linesPerfected ? [...opening.linesPerfected] : [];
  if (!perfected.includes(variationIndex)) {
    perfected.push(variationIndex);
    await db.openings.update(id, { linesPerfected: perfected });
  }
}

/** Marks a variation as "played" (completed a Play rep vs the coach).
 *  Idempotent. This is the rung that unlocks the line's weapons. */
export async function markLinePlayed(
  id: string,
  variationIndex: number,
): Promise<void> {
  const opening = await db.openings.get(id);
  if (!opening) return;
  const played = opening.linesPlayed ? [...opening.linesPlayed] : [];
  if (!played.includes(variationIndex)) {
    played.push(variationIndex);
    await db.openings.update(id, { linesPlayed: played });
  }
}

/** Marks a WLPP rung complete for a line, backfilling every earlier rung
 *  (monotonic — finishing Practice implies Watch + Learn are done). One call
 *  the runtime can fire from any rung's completion without ordering bugs. */
export async function markRungComplete(
  id: string,
  variationIndex: number,
  rung: 'watch' | 'learn' | 'practice' | 'play',
): Promise<void> {
  const order: Array<'watch' | 'learn' | 'practice' | 'play'> = ['watch', 'learn', 'practice', 'play'];
  const upto = order.slice(0, order.indexOf(rung) + 1);
  const opening = await db.openings.get(id);
  if (!opening) return;
  const patch: Partial<OpeningRecord> = {};
  const add = (key: 'linesDiscovered' | 'linesLearned' | 'linesPerfected' | 'linesPlayed'): void => {
    const arr = opening[key] ? [...opening[key]] : [];
    if (!arr.includes(variationIndex)) { arr.push(variationIndex); patch[key] = arr; }
  };
  if (upto.includes('watch')) add('linesDiscovered');
  if (upto.includes('learn')) add('linesLearned');
  if (upto.includes('practice')) add('linesPerfected');
  if (upto.includes('play')) add('linesPlayed');
  if (Object.keys(patch).length) await db.openings.update(id, patch);

  // Auto-enroll the learned line into spaced repetition (David 2026-05-25):
  // once you've Learned a line it enters SRS so it resurfaces for review and
  // feeds the Training Plan's "spaced review due" reps — no manual enroll
  // step. Scoped to THIS line so SRS never surfaces lines you haven't
  // learned. Fire-and-forget; never block rung completion.
  if (upto.includes('learn') && patch.linesLearned) {
    void enrollOpeningLine(opening, variationIndex).catch(() => undefined);
  }

  // Named completion event (the WLPP rung actually finished) — the outcome
  // signal autocapture can't produce. Feeds the opening-lesson usage +
  // Watch→Learn→Practice→Play drop-off funnel.
  captureEvent('lesson_completed', { opening_id: id, rung, variation_index: variationIndex });
}

/** Marks a WLPP rung complete for a WEAPON (named trap / punish gem / warning,
 *  keyed by its string id). Backfills every earlier rung (monotonic — finishing
 *  Practice implies Watch + Learn). Mirrors `markRungComplete` but writes the
 *  string-keyed `weaponRungs` map since weapons aren't variation indices. This
 *  is what makes the trap/gem WLPP buttons check off when completed. */
export async function markWeaponRungComplete(
  id: string,
  weaponKey: string,
  rung: 'watch' | 'learn' | 'practice' | 'play',
): Promise<void> {
  const order: Array<'watch' | 'learn' | 'practice' | 'play'> = ['watch', 'learn', 'practice', 'play'];
  const upto = order.slice(0, order.indexOf(rung) + 1);
  const opening = await db.openings.get(id);
  if (!opening) return;
  const map: Record<string, Array<'watch' | 'learn' | 'practice' | 'play'>> = { ...(opening.weaponRungs ?? {}) };
  const existing = map[weaponKey] as Array<'watch' | 'learn' | 'practice' | 'play'> | undefined;
  const done = existing ? [...existing] : [];
  let changed = false;
  for (const r of upto) {
    if (!done.includes(r)) { done.push(r); changed = true; }
  }
  if (changed) {
    map[weaponKey] = done;
    await db.openings.update(id, { weaponRungs: map });
  }
  captureEvent('weapon_rung_completed', { opening_id: id, weapon_key: weaponKey, rung });
}

/** Per-line "I already know this" escape — unlocks every rung + the weapons
 *  for one line without forcing the climb. Idempotent toggle-on. */
export async function unlockLineAll(
  id: string,
  variationIndex: number,
): Promise<void> {
  const opening = await db.openings.get(id);
  if (!opening) return;
  const unlocked = opening.linesUnlockedAll ? [...opening.linesUnlockedAll] : [];
  if (!unlocked.includes(variationIndex)) {
    unlocked.push(variationIndex);
    await db.openings.update(id, { linesUnlockedAll: unlocked });
  }
}

/** "I already know this whole opening" expert pass — unlocks EVERY line (main
 *  + all variations) at once. Spent against a per-color lifetime budget at the
 *  call site (see unlockBudgetFor); this just applies the unlock. */
export async function unlockOpeningAllLines(
  id: string,
  variationCount: number,
): Promise<void> {
  const all = [MAIN_LINE_INDEX, ...Array.from({ length: variationCount }, (_, i) => i)];
  await db.openings.update(id, { linesUnlockedAll: all });
}

/** Returns count of discovered lines for an opening. */
export function getLinesDiscovered(opening: OpeningRecord): number {
  return opening.linesDiscovered?.length ?? 0;
}

/** Returns count of perfected lines for an opening. */
export function getLinesPerfected(opening: OpeningRecord): number {
  return opening.linesPerfected?.length ?? 0;
}

/** Returns the total number of REACHABLE variation lines for an opening —
 *  i.e. the tabs the detail page actually renders, not the raw variation
 *  count. A variation that folds into the main-line pill or a twin tab has
 *  no tab and can't be discovered, so counting it would make the "X/N lines"
 *  badge over-promise (the 2026-07-18 hidden-tabs fix: KIA showed "0/9" while
 *  rendering 2 tabs). buildVariationTabs is the single source of truth for
 *  which lines are reachable, keeping this badge in lockstep with the tabs. */
export function getTotalLines(opening: OpeningRecord): number {
  if (!opening.variations?.length) return 0;
  return buildVariationTabs(opening.id, opening.variations).length;
}

/**
 * Updates per-variation mastery tracking.
 */
export async function updateVariationProgress(
  id: string,
  variationIndex: number,
  correct: boolean,
): Promise<void> {
  const opening = await db.openings.get(id);
  if (!opening || !opening.variations) return;
  if (variationIndex < 0 || variationIndex >= opening.variations.length) return;

  const accuracy = opening.variationAccuracy
    ? [...opening.variationAccuracy]
    : new Array<number>(opening.variations.length).fill(0);

  // Ensure array is long enough
  while (accuracy.length < opening.variations.length) {
    accuracy.push(0);
  }

  // Rolling update: weight previous value 80%, new result 20%
  const prev = accuracy[variationIndex];
  accuracy[variationIndex] = prev * 0.8 + (correct ? 1 : 0) * 0.2;

  await db.openings.update(id, { variationAccuracy: accuracy });
}

// ─── Gambits ────────────────────────────────────────────────────────────────

/** Returns all gambit openings, sorted by ECO code. */
export async function getGambitOpenings(): Promise<OpeningRecord[]> {
  const all = await db.openings.filter((o) => o.isGambit === true).toArray();
  return all.sort((a, b) => a.eco.localeCompare(b.eco) || a.name.localeCompare(b.name));
}

// ─── Masterclasses (David 2026-05-22) ───────────────────────────────────────
//
// The "Masterclasses" tab on /openings shows openings that have been built to
// the full masterclass standard — hand-authored Watch/Learn/Practice/Play
// across the main line and every first-class variation, named-trap weapons,
// middlegame plans with playable lead-the-eye lines, model games per
// variation, and grounded narration (§5b). The source of truth is
// `src/data/opening-manifests.json`: any openingId declared there is a
// masterclass and renders on this tab.

/** Returns the list of openingIds that have a content manifest — these are
 *  the masterclass openings. Keys are filtered to skip the JSON's meta
 *  fields (those starting with `_`). */
export function getMasterclassOpeningIds(): string[] {
  return Object.keys(openingManifests).filter((k) => !k.startsWith('_'));
}

/** Returns the masterclass openings as full records, in the manifest's
 *  declared order. Missing entries are skipped silently — if a manifest
 *  exists for an opening that hasn't been seeded yet, the tab just shows
 *  the ones we have. */
export async function getMasterclassOpenings(): Promise<OpeningRecord[]> {
  const ids = getMasterclassOpeningIds();
  const out: OpeningRecord[] = [];
  for (const id of ids) {
    const o = await db.openings.get(id);
    if (o) out.push(o);
  }
  return out;
}

/** The White anti-opening courses (Counter-Weapons) as full records, in the
 *  generated order. Seeded by `loadAntiOpenings`; missing entries skipped. */
export async function getAntiOpenings(): Promise<OpeningRecord[]> {
  const ids = (antiOpeningsData as Array<{ id: string }>).map((o) => o.id);
  const out: OpeningRecord[] = [];
  for (const id of ids) {
    const o = await db.openings.get(id);
    if (o) out.push(o);
  }
  return out;
}

/** The gambit courses (gambits.json) as full records. Seeded by
 *  `loadGambitData`; missing entries skipped. */
export async function getGambitCourseOpenings(): Promise<OpeningRecord[]> {
  const ids = (gambitData as Array<{ id: string }>).map((o) => o.id);
  const out: OpeningRecord[] = [];
  for (const id of ids) {
    const o = await db.openings.get(id);
    if (o) out.push(o);
  }
  return out;
}

// ─── Favorites (WO-3) ───────────────────────────────────────────────────────

/** Toggles the isFavorite flag on an opening. Returns the new value. */
export async function toggleFavorite(id: string): Promise<boolean> {
  const opening = await db.openings.get(id);
  if (!opening) return false;
  const newValue = !opening.isFavorite;
  await db.openings.update(id, { isFavorite: newValue });
  return newValue;
}

/**
 * Promote an opening into the student's repertoire — the on-the-fly
 * "Save & drill" flow (the coach just taught it; the student wants to
 * keep it). Marks it `isRepertoire` (so it's drillable + tracked) and
 * `isFavorite` (so it lands in the Training Plan rolodex). Idempotent.
 * Flashcard seeding is the caller's job via `seedFlashcardsForRepertoire`
 * (kept out of here to avoid a dataLoader import cycle). Returns the
 * opening's name, or null when the id doesn't resolve.
 */
export async function saveOpeningToRepertoire(id: string): Promise<string | null> {
  const opening = await db.openings.get(id);
  if (!opening) return null;
  await db.openings.update(id, { isRepertoire: true, isFavorite: true });
  return opening.name;
}

/** Returns all favorited repertoire openings. */
export async function getFavoriteOpenings(): Promise<OpeningRecord[]> {
  // IndexedDB has no boolean keys — filter in JS, not via the index (see
  // getRepertoireOpenings above: `.where('isFavorite').equals(true)` throws
  // DataError).
  return db.openings.filter((o) => o.isFavorite).toArray();
}

/** Favorited openings that still have at least one un-learned line (the
 *  main line or any variation index missing from `linesLearned`). Feeds the
 *  Training Plan's "new line to learn" reps so the openings you favorited
 *  actually enter your daily path. One entry per opening (the rep deep-links
 *  into the opening so the student picks which line). */
export async function getUnlearnedFavoriteOpenings(): Promise<{ openingId: string; name: string }[]> {
  const favorites = await getFavoriteOpenings();
  const out: { openingId: string; name: string }[] = [];
  for (const o of favorites) {
    const learned = new Set(o.linesLearned ?? []);
    const allLines = [MAIN_LINE_INDEX, ...Array.from({ length: o.variations?.length ?? 0 }, (_, i) => i)];
    if (allLines.some((idx) => !learned.has(idx))) {
      out.push({ openingId: o.id, name: o.name });
    }
  }
  return out;
}
