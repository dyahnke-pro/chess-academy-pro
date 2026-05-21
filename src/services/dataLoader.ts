import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { createDefaultSrsFields } from './srsEngine';
import ecoData from '../data/openings-lichess.json';
import repertoireData from '../data/repertoire.json';
import proRepertoireData from '../data/pro-repertoires.json';
import gambitData from '../data/gambits.json';
import modelGamesData from '../data/model-games.json';
import middlegamePlansData from '../data/middlegame-plans.json';
import { CURATED_NARRATIONS } from '../data/opening-narrations';
import type { OpeningRecord, FlashcardRecord, ModelGame, MiddlegamePlan } from '../types';

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
const PRO_DATA_REVISION = '2026-05-16-traps-orient-fix';
const PRO_REVISION_KEY = 'pro_data_revision';
// Bump when repertoire.json CONTENT changes need to reach already-seeded
// devices (the base repertoire is otherwise only loaded on first install).
const BASE_DATA_REVISION = '2026-05-21-pirc-variation-keyideas';
const BASE_REVISION_KEY = 'base_repertoire_revision';

export async function isDatabaseSeeded(): Promise<boolean> {
  const record = await db.meta.get(SEED_KEY);
  return record?.value === 'true';
}

async function markDatabaseSeeded(): Promise<void> {
  await db.meta.put({ key: SEED_KEY, value: 'true' });
}

// ─── ECO Loader ───────────────────────────────────────────────────────────────

export async function loadEcoData(): Promise<void> {
  const defaults = createDefaultSrsFields();

  const records: OpeningRecord[] = (ecoData as EcoEntry[]).map((entry) => {
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

  // bulkPut is idempotent — safe to re-run
  await db.openings.bulkPut(records);
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

  const records: OpeningRecord[] = entries.map((entry) => {
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

  await db.openings.bulkPut(records);
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
 * Entries that disappear from the JSON are left in Dexie untouched
 * (orphaned records won't surface in the player-list UI but a user
 * who had stats on them keeps that history).
 */
export async function reconcileProRepertoires(): Promise<void> {
  const meta = await db.meta.get(PRO_REVISION_KEY);
  if (meta?.value === PRO_DATA_REVISION) return;

  const defaults = createDefaultSrsFields();
  const entries = (proRepertoireData as { openings: ProRepertoireEntry[] }).openings;

  const toPut: OpeningRecord[] = [];
  for (const entry of entries) {
    const { fen, uci } = computePosition(entry.pgn);
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
  await db.meta.put({ key: PRO_REVISION_KEY, value: PRO_DATA_REVISION });
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
  const meta = await db.meta.get(BASE_REVISION_KEY);
  if (meta?.value === BASE_DATA_REVISION) return;

  const toPut: OpeningRecord[] = [];
  for (const entry of repertoireData as RepertoireEntry[]) {
    const existing = await db.openings.get(entry.id);
    if (!existing) continue; // first-install seed handles brand-new entries
    const { fen, uci } = computePosition(entry.pgn);
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
      variations: entry.variations,
      trapLines: entry.trapLines ?? null,
      warningLines: entry.warningLines ?? null,
    });
  }

  if (toPut.length > 0) await db.openings.bulkPut(toPut);
  await db.meta.put({ key: BASE_REVISION_KEY, value: BASE_DATA_REVISION });
}

// ─── Gambit Loader ───────────────────────────────────────────────────────────

export async function loadGambitData(): Promise<void> {
  const defaults = createDefaultSrsFields();

  const records: OpeningRecord[] = (gambitData as RepertoireEntry[]).map(
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
    },
  );

  await db.openings.bulkPut(records);
}

// ─── Model Games Loader ──────────────────────────────────────────────────────

export async function loadModelGamesData(): Promise<void> {
  const records = (modelGamesData as ModelGame[]).map((entry) => ({
    ...entry,
  }));
  await db.modelGames.bulkPut(records);
}

// ─── Middlegame Plans Loader ─────────────────────────────────────────────────

export async function loadMiddlegamePlansData(): Promise<void> {
  const records = (middlegamePlansData as MiddlegamePlan[]).map((entry) => ({
    ...entry,
  }));
  await db.middlegamePlans.bulkPut(records);
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
    await loadModelGamesData();
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

  // Middlegame plans are seeded ONCE in the first-install deferred
  // backfill, so already-seeded users never picked up plan JSON
  // updates (new openings' plans, added theory). bulkPut upserts by
  // id — cheap (~240 small records), carries no user progress — so
  // re-running it every boot is safe and keeps the Middlegame Theory /
  // Plans sections current. (David 2026-05-20: added Ruy variation
  // plans weren't reaching the device.)
  await loadMiddlegamePlansData();
}

export function seedDatabase(): Promise<void> {
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
