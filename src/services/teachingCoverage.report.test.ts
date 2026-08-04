// PHASE 0 MEASUREMENT — teaching coverage across the two "walkthrough" paths.
//
// David 2026-08-04: "Audit walkthrough and teach x opening to make sure
// coverage is 100% and tell me the difference between the two."
//
// This is a REPORT, not a gate. It does not assert a threshold — it measures
// what fraction of the plies a student actually walks through carry real
// teaching, on each path, and what the corpus would add. The number is the
// go/no-go for the corpus-integration plan
// (docs/plans/2026-08-03-teaching-corpus-integration.md §4 Phase 0).
//
// THE TWO PATHS (they are NOT the same engine):
//
//  A. "teach me <opening>"  — /coach/teach → useTeachWalkthrough →
//     generateOpeningFromDbNarration. Spine from openings-lichess.json /
//     repertoire.json, per-ply narration written at runtime, with a corpus
//     note SPLICED per ply via `noteAtPosition` — POSITION ONLY, meaning the
//     note's own taught line must reproduce that ply's board. The fuzzy
//     opening-name tier was removed from the splice on 2026-08-04; it is why
//     `supportTierHits` now reads 0 and is not a regression.
//
//  B. opening detail → Watch — curated LessonScript (LessonPlayer). Every
//     masterclass and pro opening has one, so this path no longer falls back
//     to the legacy WalkthroughMode; an uncurated ECO row hands off to path A
//     instead (2026-08-04). No runtime corpus either way — a curated beat is
//     reviewed and gated offline, so the corpus improves it at BAKE time.
//
// Coverage is therefore a DIFFERENT question per path:
//   A: what share of plies get a teaching note at all (today vs. with the full
//      tiered retrieval the plan proposes)?
//   B: does the opening have a curated lesson at all, and do its beats carry
//      both registers?
//
// ⚠ RE-MEASURED 2026-08-04 (David: "I just want to confirm that you see All the
// downloaded corpus notes"). The first cut of this report ran with only the two
// STATIC corpora visible — 11,385 of 58,124 notes. Hanging Pawns and Saint Louis
// are fetched from `public/data/` at boot, and nothing in vitest performs that
// fetch, so every number below was computed against a fifth of the input.
// `loadFullCorpus()` primes them from disk. Do not remove it; a report run
// without it silently understates coverage.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { noteAtPosition, supportNoteForPly, teachingNoteForBoard } from './danyaTeachingService';
import { noteArrowSourceAt } from './openingGenerator';
import { phaseOfFen, type Phase } from './boardConcepts';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { getLessonScript } from '../data/lessons';
import repertoireRaw from '../data/repertoire.json';
import modelGamesRaw from '../data/model-games.json';

interface RepertoireEntry {
  id: string;
  name: string;
  pgn: string;
  color?: string;
  variations?: Array<{ name: string; pgn: string }>;
}

const REPERTOIRE = repertoireRaw as unknown as RepertoireEntry[];

/** SAN list + the FEN after each ply, from a PGN's bare move text. */
function walk(pgn: string): Array<{ prefix: string[]; fen: string }> {
  const chess = new Chess();
  const out: Array<{ prefix: string[]; fen: string }> = [];
  const sans = pgn
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .replace(/\s+(1-0|0-1|1\/2-1\/2|\*)\s*$/, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const prefix: string[] = [];
  for (const san of sans) {
    try {
      chess.move(san);
    } catch {
      break; // G3: stop at the first illegal token rather than guess
    }
    prefix.push(san);
    out.push({ prefix: [...prefix], fen: chess.fen() });
  }
  return out;
}

// The retrieval tiers, measured for CONTRAST — only `exact` is production.
//
// `support` reads 0 from 2026-08-04 onward and that is the fix, not a
// regression: its opening-NAME arm selected notes without reference to the
// board, which is how teaching authored at one position reached a lesson about
// another. `supportNoteForPly` now offers only structure transfer, and that is
// off inside a named lesson (David 2026-08-02: "make sure the coach stays scoped
// to the opening that it was asked to teach").
//
// `transfer-or-concept` is what `teachingNoteForBoard` would add on top:
// borrowing from other openings plus the concept tier. Reported as a CEILING to
// be looked at, never approached — reaching it means reversing the scoping rule.
// Two sessions have now mistaken it for headroom.
type Tier = 'exact' | 'support' | 'transfer-or-concept' | 'none';

function tierAt(prefix: string[], fen: string, openingName: string): { tier: Tier; id: string | null } {
  const exact = noteAtPosition(prefix, fen, openingName);
  if (exact) return { tier: 'exact', id: exact.id };
  const support = supportNoteForPly(prefix, fen, openingName);
  if (support) return { tier: 'support', id: support.id };
  const wider = teachingNoteForBoard(prefix, fen, openingName);
  return wider ? { tier: 'transfer-or-concept', id: wider.id } : { tier: 'none', id: null };
}

interface ModelGame {
  id: string;
  openingId?: string;
  pgn: string;
}
const MODEL_GAMES = modelGamesRaw as unknown as ModelGame[];

/** Opening name for a model game, so the review split consults the corpus the
 *  same way the review surface would — an unnamed game gets the same treatment
 *  a student's own unnamed game does. */
const OPENING_NAME_BY_ID = new Map(REPERTOIRE.map((e) => [e.id, e.name]));

describe('teaching coverage report (Phase 0 measurement)', () => {
  // 120s: the helper parses ~37 MB of corpus JSON and builds the transposition
  // index in one synchronous pass. Heavy, deliberately — see loadFullCorpus.
  beforeAll(() => {
    const loaded = loadFullCorpus();
    const total = loaded.reduce((n, c) => n + c.notes, 0);
    // Fail loudly rather than quietly re-measuring against a fifth of the data.
    expect(total, `farmed corpora not primed: ${JSON.stringify(loaded)}`).toBeGreaterThan(46_000);
  }, 120_000);

  it('measures both walkthrough paths and writes the report', () => {
    const perOpening: Array<Record<string, unknown>> = [];

    let plies = 0;
    let exactHits = 0;
    let supportHits = 0;
    let tieredHits = 0;
    let freshHits = 0;
    let splicedHits = 0;
    let curatedLessons = 0;
    let legacyFallbacks = 0;
    let beatsTotal = 0;
    let beatsBothRegisters = 0;

    for (const entry of REPERTOIRE) {
      if (!entry.pgn) continue;
      const steps = walk(entry.pgn);
      if (steps.length === 0) continue;

      // ── PATH A: the teach engine's per-ply corpus splice ──────────────
      let exact = 0;
      let support = 0;
      let tiered = 0;
      let fresh = 0;
      let prevId: string | null = null;
      // PRODUCTION semantics: the same call the generator makes, with the same
      // per-lesson `seenIds` set. This is what a student actually hears.
      const seenIds = new Set<string>();
      let spliced = 0;
      for (const step of steps) {
        if (noteArrowSourceAt(step.prefix, step.fen, seenIds, entry.name)) spliced += 1;
        const { tier, id } = tierAt(step.prefix, step.fen, entry.name);
        if (tier === 'exact') exact += 1;
        else if (tier === 'support') support += 1;
        else if (tier === 'transfer-or-concept') tiered += 1;
        // Production tiers only, and only when the note CHANGED — see the
        // `fresh` note on the review measurement below.
        if ((tier === 'exact' || tier === 'support') && id && id !== prevId) fresh += 1;
        if (tier === 'exact' || tier === 'support') prevId = id;
      }
      plies += steps.length;
      exactHits += exact;
      supportHits += support;
      tieredHits += tiered;
      freshHits += fresh;
      splicedHits += spliced;

      // ── PATH B: does Watch use a curated lesson, and is it two-register? ─
      const lesson = getLessonScript(entry.id);
      let lessonBeats = 0;
      let lessonBoth = 0;
      if (lesson) {
        curatedLessons += 1;
        const beats = (lesson as unknown as { beats?: Array<{ say?: string; sayShort?: string }> }).beats ?? [];
        lessonBeats = beats.length;
        lessonBoth = beats.filter((b) => Boolean(b.say?.trim()) && Boolean(b.sayShort?.trim())).length;
        beatsTotal += lessonBeats;
        beatsBothRegisters += lessonBoth;
      } else {
        legacyFallbacks += 1;
      }

      perOpening.push({
        id: entry.id,
        name: entry.name,
        plies: steps.length,
        teachPath: {
          exactTierHits: exact,
          supportTierHits: support,
          transferOrConceptHits: tiered,
          freshPlies: fresh,
          splicedPlies: spliced,
          silent: steps.length - exact - support - tiered,
          // PRODUCTION = exact + support. This is the number to move.
          coverageToday: +((exact + support) / steps.length).toFixed(3),
          // Ceiling only — reaching it means re-enabling cross-opening
          // borrowing inside a named lesson, which is switched off on purpose.
          coverageCeilingIfScopingDropped: +((exact + support + tiered) / steps.length).toFixed(3),
        },
        watchPath: {
          curatedLesson: Boolean(lesson),
          beats: lessonBeats,
          beatsWithBothRegisters: lessonBoth,
        },
      });
    }

    const report = {
      generatedAt: '2026-08-04',
      note: 'Phase 0 measurement for docs/plans/2026-08-03-teaching-corpus-integration.md',
      openingsMeasured: perOpening.length,
      teachPath: {
        engine: 'generateOpeningFromDbNarration (splice: noteAtPosition — position-determined only)',
        plies,
        exactTierHits: exactHits,
        supportTierHits: supportHits,
        transferOrConceptHits: tieredHits,
        silentPlies: plies - exactHits - supportHits - tieredHits,
        freshPlies: freshHits,
        freshCoverage: plies ? +(freshHits / plies).toFixed(3) : 0,
        // THE NUMBER THAT DESCRIBES THE PRODUCT: plies where the generator
        // actually splices a note, through `noteArrowSourceAt` — after the
        // per-lesson dedupe and the board-truth grade. Every other figure here
        // is retrieval potential, not delivered teaching.
        splicedPlies: splicedHits,
        splicedCoverage: plies ? +(splicedHits / plies).toFixed(3) : 0,
        coverageToday: plies ? +((exactHits + supportHits) / plies).toFixed(3) : 0,
        coverageCeilingIfScopingDropped: plies
          ? +((exactHits + supportHits + tieredHits) / plies).toFixed(3)
          : 0,
      },
      watchPath: {
        engine: 'LessonPlayer (curated LessonScript); uncurated openings hand off to the coach',
        curatedLessons,
        // Openings with no curated main lesson. These no longer render the
        // legacy walkthrough — they redirect to /coach/teach — so this counts
        // HAND-OFFS, not ungated fallbacks. NB: this loop measures
        // repertoire.json only; pro openings and every variation were measured
        // separately (82/82 and 318/318 + 285/285, all curated).
        coachHandoffs: legacyFallbacks,
        curatedShare: perOpening.length ? +(curatedLessons / perOpening.length).toFixed(3) : 0,
        beatsTotal,
        beatsWithBothRegisters: beatsBothRegisters,
        corpusNotes: 0,
      },
      perOpening: perOpening.sort(
        (a, b) =>
          ((a.teachPath as { coverageToday: number }).coverageToday)
          - ((b.teachPath as { coverageToday: number }).coverageToday),
      ),
    };

    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/teaching-coverage.json', JSON.stringify(report, null, 2));

    console.log(JSON.stringify({ ...report, perOpening: undefined }, null, 2));

    expect(report.openingsMeasured).toBeGreaterThan(0);
  }, 600_000);

  // ── REVIEW PATH — where in a FULL GAME does the corpus actually have
  // something to say? (David 2026-08-04: "For review's new narration the corpus
  // notes should [be] primary mainly used in opening phase, then fall back to
  // grounded analysis.")
  //
  // That shape has to be EARNED against the real numbers, not assumed. The
  // corpus is farmed from opening teaching, so the prediction is that coverage
  // collapses after the book — but a review walks every ply of a real game, and
  // if the corpus reaches the middlegame too then scoping it to the opening
  // would throw away teaching we already have.
  //
  // Measured over `model-games.json` because those ARE full games, played to a
  // result, which is what a review walks. Phase is computed from material
  // (`phaseOfFen`), not the move number — a queenless position ten moves in is
  // an endgame whatever the clock says.
  it('measures corpus coverage across a full game, split by phase', () => {
    // `covered` counts plies where SOME note matched. `fresh` counts plies where
    // the note DIFFERS from the one used on the previous covered ply — the
    // honest number, because an opening-level note matches every ply of its
    // opening and would otherwise read as sixty plies of coverage from one note.
    // `notes` is the distinct set actually drawn on.
    // (danyaTeachingService's own `noteCoverageForLine` makes the same
    // distinction: "an opening-level note that matches everywhere is not
    // coverage of the line".)
    const byPhase: Record<Phase, {
      plies: number; exact: number; support: number; fresh: number; notes: Set<string>;
    }> = {
      opening: { plies: 0, exact: 0, support: 0, fresh: 0, notes: new Set() },
      middlegame: { plies: 0, exact: 0, support: 0, fresh: 0, notes: new Set() },
      endgame: { plies: 0, exact: 0, support: 0, fresh: 0, notes: new Set() },
    };
    // Where coverage actually runs out, as a ply number — the number that says
    // whether "opening phase" is the right scope or an arbitrary cutoff.
    const lastCoveredPly: number[] = [];
    let gamesMeasured = 0;

    for (const game of MODEL_GAMES) {
      if (!game.pgn) continue;
      const steps = walk(game.pgn);
      if (steps.length < 20) continue; // not a full game
      const openingName = (game.openingId && OPENING_NAME_BY_ID.get(game.openingId)) || '';
      gamesMeasured += 1;
      let lastCovered = 0;
      let prevNoteId: string | null = null;
      for (const [i, step] of steps.entries()) {
        const phase = phaseOfFen(step.fen);
        if (!phase) continue;
        const bucket = byPhase[phase];
        bucket.plies += 1;
        // Exact + support only. The transfer/concept tiers are switched off
        // inside a named lesson on purpose, and whether review should re-enable
        // them is precisely the design question — measuring them as if they
        // were live would beg it.
        const exact = noteAtPosition(step.prefix, step.fen, openingName);
        const note = exact ?? supportNoteForPly(step.prefix, step.fen, openingName);
        if (!note) continue;
        if (exact) bucket.exact += 1;
        else bucket.support += 1;
        bucket.notes.add(note.id);
        if (note.id !== prevNoteId) bucket.fresh += 1;
        prevNoteId = note.id;
        lastCovered = i + 1;
      }
      lastCoveredPly.push(lastCovered);
    }

    const pct = (hit: number, total: number): number => (total ? +(hit / total).toFixed(3) : 0);
    const sorted = [...lastCoveredPly].sort((a, b) => a - b);
    const at = (q: number): number => sorted[Math.floor(sorted.length * q)] ?? 0;

    const review = {
      source: 'model-games.json (full games, >= 20 plies)',
      gamesMeasured,
      tiersMeasured: 'exact + support (production); transfer/concept deliberately excluded',
      byPhase: Object.fromEntries(
        (Object.keys(byPhase) as Phase[]).map((p) => {
          const b = byPhase[p];
          return [p, {
            plies: b.plies,
            exact: b.exact,
            support: b.support,
            coverage: pct(b.exact + b.support, b.plies),
            // The number to design against: plies that get something NEW to say.
            freshPlies: b.fresh,
            freshCoverage: pct(b.fresh, b.plies),
            distinctNotes: b.notes.size,
          }];
        }),
      ),
      lastCoveredPly: { p50: at(0.5), p75: at(0.75), p90: at(0.9), max: sorted[sorted.length - 1] ?? 0 },
    };

    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/review-corpus-coverage.json', JSON.stringify(review, null, 2));
    console.log(JSON.stringify(review, null, 2));

    expect(gamesMeasured).toBeGreaterThan(0);
  }, 600_000);
});
