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
//     note SPLICED per ply via `noteAtPosition ?? supportNoteForPly` — the
//     EXACT tier plus the SUPPORT tier. (An earlier cut of this report said
//     "tier 1 only"; that was already stale when written — see `tierAt`.)
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
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { noteAtPosition, supportNoteForPly, teachingNoteForBoard } from './danyaTeachingService';
import { getLessonScript } from '../data/lessons';
import repertoireRaw from '../data/repertoire.json';

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

// The tiers, in the order the TEACH PATH actually consults them.
//
// CORRECTED 2026-08-04. The first cut of this report compared `noteAtPosition`
// against `teachingNoteForBoard` and called the former "today" — but the teach
// path has not been exact-tier-only since 2026-08-01. `noteArrowSourceAt` in
// openingGenerator is `noteAtPosition(...) ?? supportNoteForPly(...)`, so the
// SUPPORT tier is production and belongs in the baseline. Measuring without it
// understated live coverage by three-fold (10.9% vs the real 33.9%) and made
// the gap look like a free swap.
//
// `transfer-or-concept` is what `teachingNoteForBoard` adds ON TOP of
// production: structure transfer (borrow a note from another opening whose
// structure matches) and the concept tier. Both are deliberately OFF inside a
// taught lesson — `supportNoteForPly` returns null rather than borrowing when
// the student named the opening they wanted (David 2026-08-02: "make sure the
// coach stays scoped to the opening that it was asked to teach"). It is
// reported as a CEILING, not a target: reaching it would mean reversing that
// scoping rule, not fixing a bug.
type Tier = 'exact' | 'support' | 'transfer-or-concept' | 'none';

function tierAt(prefix: string[], fen: string, openingName: string): Tier {
  if (noteAtPosition(prefix, fen, openingName)) return 'exact';
  if (supportNoteForPly(prefix, fen, openingName)) return 'support';
  return teachingNoteForBoard(prefix, fen, openingName) ? 'transfer-or-concept' : 'none';
}

describe('teaching coverage report (Phase 0 measurement)', () => {
  it('measures both walkthrough paths and writes the report', () => {
    const perOpening: Array<Record<string, unknown>> = [];

    let plies = 0;
    let exactHits = 0;
    let supportHits = 0;
    let tieredHits = 0;
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
      for (const step of steps) {
        const t = tierAt(step.prefix, step.fen, entry.name);
        if (t === 'exact') exact += 1;
        else if (t === 'support') support += 1;
        else if (t === 'transfer-or-concept') tiered += 1;
      }
      plies += steps.length;
      exactHits += exact;
      supportHits += support;
      tieredHits += tiered;

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
        engine: 'generateOpeningFromDbNarration (splice: noteAtPosition ?? supportNoteForPly)',
        plies,
        exactTierHits: exactHits,
        supportTierHits: supportHits,
        transferOrConceptHits: tieredHits,
        silentPlies: plies - exactHits - supportHits - tieredHits,
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
});
