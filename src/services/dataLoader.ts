import { Chess } from 'chess.js';
import { db } from '../db/schema';
import type { Table } from 'dexie';
import { createDefaultSrsFields } from './srsEngine';
import ecoData from '../data/openings-lichess.json';
import repertoireData from '../data/repertoire.json';
import proRepertoireData from '../data/pro-repertoires.json';
import gambitData from '../data/gambits.json';
import antiOpeningsData from '../data/anti-openings.json';
import modelGamesData from '../data/model-games.json';
import { loadProGameReferenceData } from './proGameReferenceData';
import { loadFarmedCorpora } from './farmedCorpusData';
import middlegamePlansData from '../data/middlegame-plans.json';
// Separate-lane gambit-tab plans (David 2026-05-27): own file so the masterclass
// lane never touches them; merged into the shared plan store here at load time,
// keyed by gambit-tab openingIds (gambit-*) so they never collide.
import gambitPlansData from '../data/gambit-plans.json';
import { CURATED_NARRATIONS } from '../data/opening-narrations';
import type { OpeningRecord, FlashcardRecord, ModelGame, MiddlegamePlan, ProGameReference } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EcoEntry {
  eco: string;
  name: string;
  pgn: string;
}

interface RepertoireEntry {
  id: string;
  eco: string;
  name: string;
  pgn: string;
  color: 'white' | 'black';
  style: string;
  overview: string;
  keyIdeas: string[];
  traps: string[];
  warnings: string[];
  // A masterclass repertoire opening that ALSO belongs on the Gambit tab
  // (King's/Evans/Benko/Budapest/Albin). The tab queries isGambit; setting it
  // here surfaces the fully-built canonical entry on the tab instead of the
  // shallow gambits.json dupe.
  isGambit?: boolean;
  variations: Array<{
    name: string;
    pgn: string;
    explanation: string;
  }>;
  trapLines?: Array<{
    name: string;
    pgn: string;
    explanation: string;
  }>;
  warningLines?: Array<{
    name: string;
    pgn: string;
    explanation: string;
  }>;
}

// ─── PGN Helpers ──────────────────────────────────────────────────────────────

interface PositionResult {
  fen: string;
  uci: string;
}

/**
 * Plays through a space-separated SAN move string and returns the final FEN
 * and UCI move string.
 */
export function computePosition(pgn: string): PositionResult {
  const chess = new Chess();
  const uciMoves: string[] = [];

  const tokens = pgn.trim().split(/\s+/).filter(Boolean);

  for (const san of tokens) {
    try {
      const move = chess.move(san);
      uciMoves.push(move.from + move.to + (move.promotion ?? ''));
    } catch {
      break;
    }
  }

  return { fen: chess.fen(), uci: uciMoves.join(' ') };
}

/**
 * Generates a URL-safe slug from a name.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Seeding State ────────────────────────────────────────────────────────────

const SEED_KEY = 'db_seeded_v12';

/**
 * Pro-repertoire content revision. Bump this whenever
 * `src/data/pro-repertoires.json` changes shape — added/renamed/
 * removed trapLines, warningLines, variations, explanations,
 * color/style edits, anything content-driven. On the next boot,
 * every user's Dexie reconciles to the new content via
 * `reconcileProRepertoires()` while preserving drill/SRS/woodpecker
 * progress, isRepertoire, isFavorite, and any per-opening dynamic
 * state.
 *
 * Versioning convention: `<YYYY-MM-DD>-<short-topic>`. The string is
 * compared byte-for-byte to the meta key, so any change triggers a
 * full content refresh.
 */
const PRO_DATA_REVISION = '2026-07-30-drop-empty-pro-players';
const PRO_REVISION_KEY = 'pro_data_revision';
// Bump when repertoire.json CONTENT changes need to reach already-seeded
// devices (the base repertoire is otherwise only loaded on first install).
const BASE_DATA_REVISION = '2026-07-03-glek-system-masterclass';
const BASE_REVISION_KEY = 'base_repertoire_revision';

export async function isDatabaseSeeded(): Promise<boolean> {
  const record = await db.meta.get(SEED_KEY);
  return record?.value === 'true';
}

async function markDatabaseSeeded(): Promise<void> {
  await db.meta.put({ key: SEED_KEY, value: 'true' });
}

/**
 * Yield to the event loop between heavy seed batches so the main thread can
 * paint and run queued interactive work — a tap handler, a navigation, or a
 * small profile write — instead of being monopolized by the cold-boot backfill.
 */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, 0); });
}

/**
 * Build + write a large record set in BATCHES, yielding to the event loop
 * between each. The cold-boot seed otherwise builds every record at once
 * (loadEcoData replays 3,300+ PGNs through chess.js — pure main-thread CPU)
 * and writes them in ONE bulkPut, locking the main thread + the IndexedDB
 * write queue for ~16s. That was the dashboard freeze (David 2026-06-06):
 * the queued interactive writes (e.g. the strength-calibration profile write)
 * were starved behind the giant write, and the UI couldn't paint. Chunking
 * keeps every turn short so the app stays responsive while the backfill runs.
 *
 * Idempotent: each batch is a bulkPut upsert. Returns the full built array so
 * callers that prune orphans can compute the valid-id set without re-mapping.
 */
async function buildAndBulkPutChunked<S, R>(
  table: Table<R>,
  source: readonly S[],
  build: (item: S) => R,
  batchSize = 200,
): Promise<R[]> {
  const built: R[] = [];
  for (let i = 0; i < source.length; i += batchSize) {
    const end = Math.min(i + batchSize, source.length);
    const batch: R[] = [];
    for (let j = i; j < end; j++) batch.push(build(source[j]));
    await table.bulkPut(batch);
    built.push(...batch);
    if (end < source.length) await yieldToEventLoop();
  }
  return built;
}

/**
 * Seed a curated-content table from a JSON source: chunked bulkPut upsert +
 * orphan prune (G8), the WHOLE thing guarded so an IndexedDB abort on a
 * low-storage / busy device degrades gracefully instead of escaping as an
 * unhandled rejection. On prod (PostHog 2026-07) these surfaced as
 * "Transaction aborted" and "Attempt to delete range from database without an
 * in-progress transaction" — the every-boot orphan sweep aborting mid-write.
 * The next boot re-runs the load, so a swallowed hiccup self-heals.
 *
 * `validIds` derives from the SOURCE array (not the bulkPut's return), so a
 * partially-failed put never widens the prune into deleting live rows. Curated
 * rows carry no user progress, so deleting a Dexie row absent from the source
 * is safe. (David 2026-07-14: swept modelGames + middlegamePlans onto the same
 * guard proGameReferences already had — the sweep the f97ccb8 spot-fix missed.)
 */
/** Minimal structural view of a curated-content table — the three ops the
 *  seed needs. Dexie's `EntityTable<T,'id'>` satisfies this, and typing to it
 *  (rather than `Table<R>`) keeps the generic from fighting Dexie's
 *  InsertType/IDType machinery. */
interface CuratedTable<R> {
  bulkPut(items: R[]): Promise<unknown>;
  toArray(): Promise<R[]>;
  bulkDelete(keys: string[]): Promise<unknown>;
}

async function seedCuratedTable<R extends { id: string }>(
  table: CuratedTable<R>,
  source: readonly R[],
  label: string,
  normalize?: (entry: R) => R,
): Promise<void> {
  try {
    // Chunked + yielding — every-boot write, must not starve interactive work
    // (mirrors buildAndBulkPutChunked; inlined here so the guard wraps it).
    //
    // `normalize` is the SEED-BOUNDARY cure for the curated-data crash class
    // (David 2026-07-15): content JSON routinely omits fields the TS type
    // declares REQUIRED (373/646 model games lack `criticalMoments`, some
    // plans lack `strategicThemes`/`endgameTransitions`), so a bare `{...entry}`
    // wrote records that LIE about their type — a downstream `.map`/`.length`
    // on the missing array then white-screens. Callers pass a normalize that
    // defaults those required-but-JSON-optional ARRAYS to `[]`, making the
    // persisted record match its type and no reader surprise-able. Symmetry
    // with `sanitizeTreeStages` on the cache-read boundary.
    const prep = normalize ?? ((entry: R): R => ({ ...entry }));
    for (let i = 0; i < source.length; i += 200) {
      await table.bulkPut(source.slice(i, i + 200).map((entry) => prep(entry)));
      if (i + 200 < source.length) await yieldToEventLoop();
    }
    const validIds = new Set(source.map((r) => r.id));
    const all = await table.toArray();
    const stale = all.filter((r) => !validIds.has(r.id)).map((r) => r.id);
    if (stale.length > 0) await table.bulkDelete(stale);
  } catch (err) {
    console.warn(`[dataLoader] ${label} seed hiccup — retries next boot:`, err);
  }
}

// ─── ECO Loader ───────────────────────────────────────────────────────────────

export async function loadEcoData(): Promise<void> {
  const defaults = createDefaultSrsFields();

  // Chunked + yielding: 3,300+ chess.js PGN replays + the bulkPut are the
  // single biggest main-thread block on a cold boot. Batch them so the UI
  // stays responsive and interactive writes aren't starved (the freeze fix).
  await buildAndBulkPutChunked(db.openings, ecoData as EcoEntry[], (entry): OpeningRecord => {
    const { fen, uci } = computePosition(entry.pgn);
    const id = slugify(`${entry.eco}-${entry.name}`);

    return {
      id,
      eco: entry.eco,
      name: entry.name,
      pgn: entry.pgn,
      uci,
      fen,
      color: 'white',       // ECO-only entries don't have a fixed color
      style: '',
      isRepertoire: false,
      overview: null,
      keyIdeas: null,
      traps: null,
      warnings: null,
      variations: null,
      drillAccuracy: 0,
      drillAttempts: 0,
      lastStudied: null,
      woodpeckerReps: 0,
      woodpeckerSpeed: null,
      woodpeckerLastDate: null,
      isFavorite: false,
      // SRS fields (unused on non-repertoire records, but schema requires them
      // since they share a table — stored as defaults)
      ...defaults,
    };
  });
}

// ─── Repertoire Loader ────────────────────────────────────────────────────────

export async function loadRepertoireData(): Promise<void> {
  const defaults = createDefaultSrsFields();

  const records: OpeningRecord[] = (repertoireData as RepertoireEntry[]).map(
    (entry) => {
      const { fen, uci } = computePosition(entry.pgn);

      return {
        id: entry.id,
        eco: entry.eco,
        name: entry.name,
        pgn: entry.pgn,
        uci,
        fen,
        color: entry.color,
        style: entry.style,
        isRepertoire: true,
        isGambit: entry.isGambit ?? false,
        overview: entry.overview,
        keyIdeas: entry.keyIdeas,
        traps: entry.traps,
        warnings: entry.warnings,
        variations: entry.variations,
        trapLines: entry.trapLines ?? null,
        warningLines: entry.warningLines ?? null,
        drillAccuracy: 0,
        drillAttempts: 0,
        lastStudied: null,
        woodpeckerReps: 0,
        woodpeckerSpeed: null,
        woodpeckerLastDate: null,
        isFavorite: false,
        ...defaults,
      };
    },
  );

  // bulkPut: upserts so we can re-seed without data loss
  await db.openings.bulkPut(records);
}

// ─── Pro Repertoire Loader ────────────────────────────────────────────────────

interface ProRepertoireEntry extends RepertoireEntry {
  playerId: string;
}

export async function loadProRepertoireData(): Promise<void> {
  const defaults = createDefaultSrsFields();
  const entries = (proRepertoireData as { openings: ProRepertoireEntry[] }).openings;

  await buildAndBulkPutChunked(db.openings, entries, (entry): OpeningRecord => {
    const { fen, uci } = computePosition(entry.pgn);

    return {
      id: entry.id,
      eco: entry.eco,
      name: entry.name,
      pgn: entry.pgn,
      uci,
      fen,
      color: entry.color,
      style: entry.style,
      isRepertoire: false,
      proPlayerId: entry.playerId,
      overview: entry.overview,
      keyIdeas: entry.keyIdeas,
      traps: entry.traps,
      warnings: entry.warnings,
      variations: entry.variations,
      trapLines: entry.trapLines ?? null,
      warningLines: entry.warningLines ?? null,
      drillAccuracy: 0,
      drillAttempts: 0,
      lastStudied: null,
      woodpeckerReps: 0,
      woodpeckerSpeed: null,
      woodpeckerLastDate: null,
      isFavorite: false,
      ...defaults,
    };
  });
}

/**
 * Reconcile `pro-repertoires.json` content into Dexie for already-
 * seeded users. No-op when the meta-stored revision matches the
 * current `PRO_DATA_REVISION` constant; otherwise walks every entry
 * in the JSON and merges static content fields onto the existing
 * Dexie record (or inserts fresh when the id is new).
 *
 * User-progress fields are preserved across the merge:
 *   isRepertoire, drillAccuracy, drillAttempts, lastStudied,
 *   woodpeckerReps, woodpeckerSpeed, woodpeckerLastDate,
 *   variationAccuracy, drillHistory, linesDiscovered,
 *   linesPerfected, isFavorite, srs* fields.
 *
 * Static fields rewritten from the JSON:
 *   eco, name, pgn, uci, fen, color, style, proPlayerId, overview,
 *   keyIdeas, traps, warnings, variations, trapLines, warningLines.
 *
 * Entries that disappear from the JSON are DELETED from Dexie (the
 * orphan sweep below), scoped to every player in the roster — so a
 * player whose openings are wiped entirely (slate-wipe) gets cleaned
 * out on already-seeded devices, not just players who still carry
 * some JSON content (G8, David 2026-05-28).
 */
export async function reconcileProRepertoires(): Promise<void> {
  const entries = (proRepertoireData as { openings: ProRepertoireEntry[] }).openings;

  // Fast early-out BEFORE any heavy work or opening a write transaction: if the
  // revision already matches, there's nothing to reconcile.
  const meta0 = await db.meta.get(PRO_REVISION_KEY);
  if (meta0?.value === PRO_DATA_REVISION) return;

  // Precompute every position OUTSIDE the transaction. computePosition replays
  // the full PGN through chess.js — heavy synchronous CPU. Doing it inside the
  // rw transaction leaves long sync gaps with NO in-flight IDB request, and
  // WebKit/iOS auto-commits an IndexedDB transaction the moment its microtask
  // queue drains during such a gap → the later bulkDelete then fails with
  // "Attempt to delete range from database without an in-progress transaction"
  // (PostHog, iOS capacitor:// boot, 2026-07-21). Precomputing keeps the
  // transaction body pure fast IDB ops, so it never idles mid-flight.
  const posById = new Map<string, ReturnType<typeof computePosition>>();
  for (const entry of entries) posById.set(entry.id, computePosition(entry.pgn));

  // Wrap the entire reconcile in a single read-write transaction so all
  // reads (get, toArray) and writes (bulkPut, bulkDelete, meta.put) share
  // one scope. Without this, each await in the for-of loop creates its own
  // transient transaction, and the bulkPut + orphan sweep + revision bump
  // can race → "Attempt to get records from database without an in-progress
  // transaction" (Dexie runtime error, caught in prod 2026-06-30).
  await db.transaction('rw', db.openings, db.meta, async () => {
    // Re-check inside the transaction in case a concurrent reconcile applied
    // the revision between the read above and acquiring the write lock.
    const meta = await db.meta.get(PRO_REVISION_KEY);
    if (meta?.value === PRO_DATA_REVISION) return;

    const defaults = createDefaultSrsFields();

    const toPut: OpeningRecord[] = [];
    for (const entry of entries) {
      const { fen, uci } = posById.get(entry.id) ?? computePosition(entry.pgn);
      const existing = await db.openings.get(entry.id);

      if (existing) {
        toPut.push({
          ...existing,
          eco: entry.eco,
          name: entry.name,
          pgn: entry.pgn,
          uci,
          fen,
          color: entry.color,
          style: entry.style,
          proPlayerId: entry.playerId,
          overview: entry.overview,
          keyIdeas: entry.keyIdeas,
          traps: entry.traps,
          warnings: entry.warnings,
          variations: entry.variations,
          trapLines: entry.trapLines ?? null,
          warningLines: entry.warningLines ?? null,
        });
      } else {
        toPut.push({
          id: entry.id,
          eco: entry.eco,
          name: entry.name,
          pgn: entry.pgn,
          uci,
          fen,
          color: entry.color,
          style: entry.style,
          isRepertoire: false,
          proPlayerId: entry.playerId,
          overview: entry.overview,
          keyIdeas: entry.keyIdeas,
          traps: entry.traps,
          warnings: entry.warnings,
          variations: entry.variations,
          trapLines: entry.trapLines ?? null,
          warningLines: entry.warningLines ?? null,
          drillAccuracy: 0,
          drillAttempts: 0,
          lastStudied: null,
          woodpeckerReps: 0,
          woodpeckerSpeed: null,
          woodpeckerLastDate: null,
          isFavorite: false,
          ...defaults,
        });
      }
    }

    await db.openings.bulkPut(toPut);

    // Delete orphan pro-rep entries: for each player we have current JSON
    // data for, drop any Dexie row with that proPlayerId whose id isn't in
    // the current JSON. Prevents scrapped entries from surfacing in the
    // player list with stale LLM-synthesised narration when their
    // LessonScript no longer exists (David 2026-05-28, audit caught
    // pro-naroditsky-fantasy-caro lingering after the Naroditsky rebuild).
    // Scoped per player so a partial rebuild doesn't accidentally delete
    // other players' content. Seed the map from the full player roster
    // (not just players who still have openings) so a player whose builds
    // were wiped entirely gets an empty valid-set → all their Dexie rows
    // are swept as orphans (slate-wipe, David 2026-05-28).
    const idsByPlayer: Record<string, Set<string>> = {};
    const roster = (proRepertoireData as { players: { id: string }[] }).players;
    for (const player of roster) idsByPlayer[player.id] = new Set();
    for (const entry of entries) {
      if (!idsByPlayer[entry.playerId]) idsByPlayer[entry.playerId] = new Set();
      idsByPlayer[entry.playerId].add(entry.id);
    }
    // proPlayerId isn't a Dexie-indexed column — full-table scan + filter.
    // ~3,400 rows total at steady state; cost is negligible.
    const allOpenings = await db.openings.toArray();
    for (const [playerId, validIds] of Object.entries(idsByPlayer)) {
      const orphanIds = allOpenings
        .filter((o) => o.proPlayerId === playerId && !validIds.has(o.id))
        .map((o) => o.id);
      if (orphanIds.length > 0) {
        await db.openings.bulkDelete(orphanIds);
      }
    }

    // Sweep rows belonging to a player who left the roster entirely
    // (2026-07-30: the seven placeholder pros that carried zero openings
    // were removed). The per-player loop above only covers players still
    // in the JSON, so a dropped player's rows would otherwise survive on
    // a device seeded before the removal.
    const droppedPlayerRows = allOpenings
      .filter((o) => o.proPlayerId && !(o.proPlayerId in idsByPlayer))
      .map((o) => o.id);
    if (droppedPlayerRows.length > 0) {
      await db.openings.bulkDelete(droppedPlayerRows);
    }

    await db.meta.put({ key: PRO_REVISION_KEY, value: PRO_DATA_REVISION });
  });
}

/**
 * Reconcile the BASE repertoire (repertoire.json) onto already-seeded
 * devices. The base repertoire is otherwise only written on first
 * install, so content edits (e.g. per-variation overview/keyIdeas) never
 * reach existing users. Mirrors reconcileProRepertoires: overrides the
 * content fields while preserving all per-user progress (drill/SRS/
 * woodpecker/favorites/line tracking) via the `...existing` spread.
 * Revision-gated so it no-ops once applied.
 */
export async function reconcileBaseRepertoire(): Promise<void> {
  const entries = repertoireData as RepertoireEntry[];

  // Fast early-out before any heavy work / opening a write transaction.
  const meta0 = await db.meta.get(BASE_REVISION_KEY);
  if (meta0?.value === BASE_DATA_REVISION) return;

  // Precompute positions OUTSIDE the transaction — see reconcileProRepertoires:
  // heavy synchronous computePosition inside the rw transaction lets WebKit/iOS
  // auto-commit the IndexedDB transaction mid-flight, breaking the later
  // bulkDelete orphan sweep ("delete range without an in-progress transaction").
  const posById = new Map<string, ReturnType<typeof computePosition>>();
  for (const entry of entries) posById.set(entry.id, computePosition(entry.pgn));

  // Single rw transaction so the for-of get() loop, bulkPut, orphan sweep,
  // and revision bump share one scope (David 2026-06-30, prod catch).
  await db.transaction('rw', db.openings, db.meta, async () => {
    const meta = await db.meta.get(BASE_REVISION_KEY);
    if (meta?.value === BASE_DATA_REVISION) return;

    const toPut: OpeningRecord[] = [];
    const defaults = createDefaultSrsFields();
    for (const entry of entries) {
      const existing = await db.openings.get(entry.id);
      const { fen, uci } = posById.get(entry.id) ?? computePosition(entry.pgn);
      if (!existing) {
        // Brand-new masterclass added to repertoire.json AFTER this device was
        // first seeded (e.g. glek-system, David 2026-07-03). The first-install
        // seed only runs once, so reconcile must CREATE the record here or an
        // existing user never sees the new opening. Build the full record with
        // isRepertoire defaults, exactly as loadRepertoireData would.
        toPut.push({
          id: entry.id,
          eco: entry.eco,
          name: entry.name,
          pgn: entry.pgn,
          uci,
          fen,
          color: entry.color,
          style: entry.style,
          isRepertoire: true,
          isGambit: entry.isGambit ?? false,
          overview: entry.overview,
          keyIdeas: entry.keyIdeas,
          traps: entry.traps,
          warnings: entry.warnings,
          variations: entry.variations,
          trapLines: entry.trapLines ?? null,
          warningLines: entry.warningLines ?? null,
          drillAccuracy: 0,
          drillAttempts: 0,
          lastStudied: null,
          woodpeckerReps: 0,
          woodpeckerSpeed: null,
          woodpeckerLastDate: null,
          isFavorite: false,
          ...defaults,
        });
        continue;
      }
      toPut.push({
        ...existing,
        eco: entry.eco,
        name: entry.name,
        pgn: entry.pgn,
        uci,
        fen,
        color: entry.color,
        style: entry.style,
        overview: entry.overview,
        keyIdeas: entry.keyIdeas,
        traps: entry.traps,
        warnings: entry.warnings,
        isGambit: entry.isGambit ?? existing.isGambit ?? false,
        variations: entry.variations,
        trapLines: entry.trapLines ?? null,
        warningLines: entry.warningLines ?? null,
      });
    }

    if (toPut.length > 0) await db.openings.bulkPut(toPut);

    // G8 orphan sweep: the King's/Evans/Benko/Budapest Gambits
    const RETIRED_GAMBIT_DUPES = [
      'gambit-kings-gambit',
      'gambit-evans-gambit',
      'gambit-benko-gambit',
      'gambit-budapest-gambit',
    ];
    const orphans = (await db.openings.bulkGet(RETIRED_GAMBIT_DUPES))
      .filter((o): o is OpeningRecord => !!o)
      .map((o) => o.id);
    if (orphans.length > 0) await db.openings.bulkDelete(orphans);

    await db.meta.put({ key: BASE_REVISION_KEY, value: BASE_DATA_REVISION });
  });
}

// ─── Gambit Loader ───────────────────────────────────────────────────────────

export async function loadGambitData(): Promise<void> {
  const defaults = createDefaultSrsFields();

  await buildAndBulkPutChunked(db.openings, gambitData as RepertoireEntry[], (entry): OpeningRecord => {
    const { fen, uci } = computePosition(entry.pgn);

    return {
      id: entry.id,
      eco: entry.eco,
      name: entry.name,
      pgn: entry.pgn,
      uci,
      fen,
      color: entry.color,
      style: entry.style,
      isRepertoire: false,
      isGambit: true,
      overview: entry.overview,
      keyIdeas: entry.keyIdeas,
      traps: entry.traps,
      warnings: entry.warnings,
      variations: entry.variations,
      trapLines: entry.trapLines ?? null,
      warningLines: entry.warningLines ?? null,
      drillAccuracy: 0,
      drillAttempts: 0,
      lastStudied: null,
      woodpeckerReps: 0,
      woodpeckerSpeed: null,
      woodpeckerLastDate: null,
      isFavorite: false,
      ...defaults,
    };
  });
}

// ─── Anti-Opening Loader ─────────────────────────────────────────────────────
// White anti-opening courses (Counter-Weapons): grounded weapon repertoires vs
// the Black defenses amateurs struggle to face. DB-derived (G3), course-shaped.
// bulkPut upsert — idempotent, runs on fresh + already-seeded boots.
export async function loadAntiOpenings(): Promise<void> {
  const defaults = createDefaultSrsFields();
  // anti-openings.json carries nulls (overview/keyIdeas/etc.) by design; the map
  // below coerces every field, so cast through unknown to satisfy the stricter
  // RepertoireEntry shape.
  const records = (antiOpeningsData as unknown as RepertoireEntry[]).map((entry): OpeningRecord => {
    const { fen, uci } = computePosition(entry.pgn);
    return {
      id: entry.id,
      eco: entry.eco,
      name: entry.name,
      pgn: entry.pgn,
      uci,
      fen,
      color: entry.color,
      style: entry.style,
      isRepertoire: true,
      isGambit: false,
      overview: entry.overview ?? null,
      keyIdeas: entry.keyIdeas ?? null,
      traps: entry.traps ?? null,
      warnings: entry.warnings ?? null,
      variations: entry.variations,
      trapLines: null,
      warningLines: null,
      drillAccuracy: 0,
      drillAttempts: 0,
      lastStudied: null,
      woodpeckerReps: 0,
      woodpeckerSpeed: null,
      woodpeckerLastDate: null,
      isFavorite: false,
      ...defaults,
    };
  });
  await db.openings.bulkPut(records);
}

// ─── Model Games Loader ──────────────────────────────────────────────────────

export async function loadModelGamesData(): Promise<void> {
  // Chunked + yielding — runs on EVERY boot for already-seeded users, so it
  // must never starve interactive writes (the freeze fix). Guarded seed +
  // orphan prune (G8): a game DELETED from the JSON (e.g. a draw/loss replaced
  // per the wins-only model-game rule) would otherwise linger in Dexie and keep
  // surfacing in ModelGamesSection + coach grounding. Model games carry NO user
  // progress (pure curated content keyed by id), so pruning is safe.
  // (David 2026-06-01 added the sweep; 2026-07-14 wrapped it in the shared
  // guard so an IndexedDB abort can't escape as an unhandled rejection.)
  await seedCuratedTable<ModelGame>(
    db.modelGames,
    modelGamesData as ModelGame[],
    'modelGames',
    // `criticalMoments` is typed required but absent on 373/646 entries.
    (g) => ({ ...g, criticalMoments: g.criticalMoments ?? [] }),
  );
}

// ─── Pro Game References Loader ──────────────────────────────────────────────

/**
 * Load the coach's breadth layer of real player games (David 2026-06-01).
 * Built by `scripts/pro-repertoire/build-game-references.mjs` into
 * `src/data/pro-game-references.json`. Same contract as model games /
 * plans: bulkPut upserts by id, rows carry no user progress, prune
 * orphans every boot so a scrapped/rebuilt player's references never
 * linger (G8). Re-run every boot so the coach + walkthroughs always see
 * the current reference set.
 */
export async function loadProGameReferences(): Promise<void> {
  // Fetched from public/data (not bundled) — also primes the in-memory
  // cache the coach envelope source reads synchronously. This runs FIRST, so
  // even if the Dexie persistence below hiccups, the coach still has the games
  // in memory for this session.
  const records = await loadProGameReferenceData();
  // Every-boot best-effort persistence via the shared guarded seed. On a
  // low-storage / busy device the IndexedDB transaction can abort mid-write
  // (seen in prod: "Transaction aborted" / "Attempt to delete range from
  // database without an in-progress transaction", 165/200 puts failing). The
  // guard degrades gracefully rather than escaping as an unhandled rejection —
  // the next boot re-runs this whole load, and the in-memory cache primed above
  // already gave the coach these games for this session.
  await seedCuratedTable<ProGameReference>(db.proGameReferences, records, 'proGameReferences');
}

// ─── Middlegame Plans Loader ─────────────────────────────────────────────────

export async function loadMiddlegamePlansData(): Promise<void> {
  // Chunked + yielding — every-boot write, must not starve interactive work.
  // Guarded seed + orphan prune (G8): a plan DELETED from the JSON (e.g. the
  // Pirc Bayonet/Kholmov plans) would otherwise linger in Dexie forever on
  // already-seeded devices and keep rendering. Middlegame plans carry NO user
  // progress (pure curated content keyed by id), so pruning is safe.
  // (2026-07-14 wrapped in the shared guard so an IndexedDB abort can't escape
  // as an unhandled rejection.)
  await seedCuratedTable<MiddlegamePlan>(
    db.middlegamePlans,
    [...(middlegamePlansData as MiddlegamePlan[]), ...(gambitPlansData as MiddlegamePlan[])],
    'middlegamePlans',
    // These four are typed required arrays but some plans omit them.
    (p) => ({
      ...p,
      pawnBreaks: p.pawnBreaks ?? [],
      pieceManeuvers: p.pieceManeuvers ?? [],
      strategicThemes: p.strategicThemes ?? [],
      endgameTransitions: p.endgameTransitions ?? [],
    }),
  );
}

// ─── Flashcard Seeder ─────────────────────────────────────────────────────────

/**
 * Generates flashcard decks for all repertoire openings that don't yet have
 * cards. Skips openings already seeded.
 */
export async function seedFlashcardsForRepertoire(): Promise<void> {
  const repertoire = await db.openings
    .filter((o) => o.isRepertoire)
    .toArray();

  for (const opening of repertoire) {
    if (!opening.variations?.length) continue;

    const existing = await db.flashcards
      .where('openingId')
      .equals(opening.id)
      .count();

    if (existing > 0) continue;

    await generateFlashcardsForOpening(opening);
  }
}

function generateFlashcardsForOpening(opening: OpeningRecord): Promise<void> {
  const defaults = createDefaultSrsFields();
  const cards: FlashcardRecord[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Card 1: Name the opening (position → name)
  cards.push({
    id: `${opening.id}-name-0`,
    openingId: opening.id,
    type: 'name_opening',
    questionFen: opening.fen,
    questionText: 'Name this opening position.',
    answerMove: null,
    answerText: `${opening.name} (ECO ${opening.eco}). ${opening.overview ?? ''}`,
    srsInterval: defaults.interval,
    srsEaseFactor: defaults.easeFactor,
    srsRepetitions: defaults.repetitions,
    srsDueDate: today,
    srsLastReview: null,
  });

  // Card 2: Explain the opening idea
  if (opening.keyIdeas?.length) {
    cards.push({
      id: `${opening.id}-idea-0`,
      openingId: opening.id,
      type: 'explain_idea',
      questionFen: opening.fen,
      questionText: `What are the key ideas in the ${opening.name}?`,
      answerMove: null,
      answerText: opening.keyIdeas.join(' | '),
      srsInterval: defaults.interval,
      srsEaseFactor: defaults.easeFactor,
      srsRepetitions: defaults.repetitions,
      srsDueDate: today,
      srsLastReview: null,
    });
  }

  // Cards 3+: One card per variation (best move type)
  (opening.variations ?? []).forEach((variation, i) => {
    const { fen } = computePosition(variation.pgn);
    cards.push({
      id: `${opening.id}-var-${i}`,
      openingId: opening.id,
      type: 'best_move',
      questionFen: fen,
      questionText: `What is the key idea in the ${variation.name}?`,
      answerMove: null,
      answerText: variation.explanation,
      srsInterval: defaults.interval,
      srsEaseFactor: defaults.easeFactor,
      srsRepetitions: defaults.repetitions,
      srsDueDate: today,
      srsLastReview: null,
    });
  });

  // WO-REAL-FIXES — bulkPut (upsert). See dbService.populateFromOpenings
  // for the rationale; same deterministic-id collision pattern.
  return db.flashcards.bulkPut(cards).then(() => undefined);
}

// ─── Opening Narrations ──────────────────────────────────────────────────────

async function loadOpeningNarrations(): Promise<void> {
  await db.openingNarrations.bulkPut(CURATED_NARRATIONS);
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Seeds the database on first launch. Safe to call on every app start —
 * the bulk seed is a no-op if already seeded, but pro-repertoire
 * content is reconciled on every boot so existing users pick up
 * trapLines/warningLines/variations/explanation updates without
 * losing drill progress. See `reconcileProRepertoires` for details.
 */
// Singleton guard. App.tsx's boot effect can fire seedDatabase()
// multiple times (React 18 strict-mode double-invoke + re-renders).
// Concurrent runs raced their bulkPut writes on db.openings — the
// large loadEcoData() write starved loadRepertoireData()'s write,
// which hung forever, so the 40 repertoire openings never landed
// and every /openings/<id> showed "Opening not found" for fresh
// users. Collapsing concurrent calls onto one in-flight promise
// fixes the race. (David 2026-05-20.)
let seedInFlight: Promise<void> | null = null;
// The heavy backfill (ECO 3641-set + pro + gambits + model games +
// plans + flashcards + narrations) runs detached from the critical
// seed so /openings paints fast. Tracked separately so it's still
// single-flight and so the "All" tab can await it. (David 2026-05-20:
// fix the ~40s "Loading openings…" first-run wait.)
let deferredSeedInFlight: Promise<void> | null = null;

/** Run the heavy, non-critical backfill. Idempotent (bulkPut upserts).
 *  markDatabaseSeeded fires only at the END so a reload mid-backfill
 *  safely re-seeds rather than skipping the unfinished tables. */
function startDeferredSeed(): Promise<void> {
  if (deferredSeedInFlight) return deferredSeedInFlight;
  deferredSeedInFlight = (async () => {
    await loadEcoData();
    await loadProRepertoireData();
    await loadGambitData();
    await loadAntiOpenings();
    await loadModelGamesData();
    await loadProGameReferences();
    await loadMiddlegamePlansData();
    await seedFlashcardsForRepertoire();
    await loadOpeningNarrations();
    await markDatabaseSeeded();
    // Fresh seed already used the current JSON — mark the revision
    // so the reconcile path no-ops on the next boot.
    await db.meta.put({ key: PRO_REVISION_KEY, value: PRO_DATA_REVISION });
  })().finally(() => {
    deferredSeedInFlight = null;
  });
  return deferredSeedInFlight;
}

async function runSeedOnce(): Promise<void> {
  if (!(await isDatabaseSeeded())) {
    // Critical path: the 40 repertoire openings power the default
    // /openings "Most Common" tab. Load them FIRST so the explorer
    // renders in <1s instead of blocking ~40s on the full ECO
    // backfill. The remaining tables stream in behind via
    // startDeferredSeed (detached — we don't await it here, so
    // `seedDatabase()` resolves as soon as the common tab can paint).
    await loadRepertoireData();
    void startDeferredSeed();
    return;
  }

  // Already-seeded users: reconcile pro content on every boot so
  // updates to pro-repertoires.json reach them without wiping
  // drill/SRS/favorites/woodpecker progress.
  await reconcileProRepertoires();

  // Same for the BASE repertoire (repertoire.json) — content edits like
  // per-variation overview/keyIdeas otherwise never reach existing users.
  await reconcileBaseRepertoire();

  // Anti-opening courses (Counter-Weapons) — bulkPut upsert reaches
  // already-seeded users on every boot without touching their progress.
  await loadAntiOpenings();

  // Middlegame plans are seeded ONCE in the first-install deferred
  // backfill, so already-seeded users never picked up plan JSON
  // updates (new openings' plans, added theory). bulkPut upserts by
  // id — cheap (~240 small records), carries no user progress — so
  // re-running it every boot is safe and keeps the Middlegame Theory /
  // Plans sections current. (David 2026-05-20: added Ruy variation
  // plans weren't reaching the device.)
  await loadMiddlegamePlansData();

  // Model games were ALSO seeded only in the first-install deferred
  // backfill, so already-seeded users never picked up new games (the
  // 2026-05-31 audit caught 14 masterclass openings showing ZERO model
  // games on-device even after real games were authored). Same contract
  // as plans: bulkPut upserts by id, the rows carry no user progress, so
  // re-running every boot is safe and keeps ModelGamesSection current.
  await loadModelGamesData();

  // Pro game references (the coach's breadth layer of real player games)
  // — same every-boot contract: pure content, prune-on-load, keeps the
  // coach + walkthroughs current as references are rebuilt. (David 2026-06-01.)
  await loadProGameReferences();
}

export function seedDatabase(): Promise<void> {
  // Prime the FARMED teaching corpora (public/data, not bundled) immediately
  // and OFF the critical path. The gap tier reads them synchronously and simply
  // contributes nothing until this resolves, so starting it here — rather than
  // inside the ~50s deferred seed — is what keeps the coach from being silent
  // on an uncovered opening early in a session. Never rejects.
  void loadFarmedCorpora();
  // Reuse the in-flight promise so concurrent callers share one run.
  // Resolves after the CRITICAL seed (repertoire) — the heavy ECO/pro/
  // gambit/model-game backfill continues detached. Callers that need
  // the full ECO set (the "All" tab) await `whenFullySeeded()`.
  if (seedInFlight) return seedInFlight;
  seedInFlight = runSeedOnce().finally(() => {
    seedInFlight = null;
  });
  return seedInFlight;
}

/** Resolves when the heavy backfill (ECO 3641-set powering the "All"
 *  tab, pro repertoires, gambits, model games, middlegame plans) has
 *  fully landed. The default "Most Common" tab only needs
 *  `seedDatabase()`; surfaces that read the full ECO catalog should
 *  await this. Resolves immediately when the backfill is already done
 *  (deferredSeedInFlight cleared) — including for already-seeded
 *  returning users, where runSeedOnce never starts a deferred run. */
export function whenFullySeeded(): Promise<void> {
  return deferredSeedInFlight ?? Promise.resolve();
}
