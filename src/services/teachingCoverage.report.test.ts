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
//     note SPLICED per ply via noteAtPosition (TIER 1 ONLY — the known gap).
//
//  B. opening detail → Watch — curated LessonScript (LessonPlayer) when one is
//     registered, else the legacy WalkthroughMode fed by the ungated
//     auto-generated src/data/annotations/ (G9.3 Gate A). No corpus either way.
//
// Coverage is therefore a DIFFERENT question per path:
//   A: what share of plies get a teaching note at all (today vs. with the full
//      tiered retrieval the plan proposes)?
//   B: does the opening have a curated lesson at all, and do its beats carry
//      both registers?
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { noteAtPosition, teachingNoteForBoard } from './danyaTeachingService';
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

type Tier = 'exact' | 'tiered-only' | 'none';

function tierAt(prefix: string[], fen: string, openingName: string): Tier {
  const exact = noteAtPosition(prefix, fen, openingName);
  if (exact) return 'exact';
  const tiered = teachingNoteForBoard(prefix, fen, openingName);
  return tiered ? 'tiered-only' : 'none';
}

describe('teaching coverage report (Phase 0 measurement)', () => {
  it('measures both walkthrough paths and writes the report', () => {
    const perOpening: Array<Record<string, unknown>> = [];

    let plies = 0;
    let exactHits = 0;
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
      let tiered = 0;
      for (const step of steps) {
        const t = tierAt(step.prefix, step.fen, entry.name);
        if (t === 'exact') exact += 1;
        else if (t === 'tiered-only') tiered += 1;
      }
      plies += steps.length;
      exactHits += exact;
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
          tieredOnlyHits: tiered,
          silent: steps.length - exact - tiered,
          coverageToday: +(exact / steps.length).toFixed(3),
          coverageWithTiers: +((exact + tiered) / steps.length).toFixed(3),
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
        engine: 'generateOpeningFromDbNarration (splice: noteAtPosition, tier 1 only)',
        plies,
        exactTierHits: exactHits,
        tieredOnlyHits: tieredHits,
        silentPlies: plies - exactHits - tieredHits,
        coverageToday: plies ? +(exactHits / plies).toFixed(3) : 0,
        coverageWithTiers: plies ? +((exactHits + tieredHits) / plies).toFixed(3) : 0,
      },
      watchPath: {
        engine: 'LessonPlayer (curated LessonScript) | legacy WalkthroughMode (auto-annotations)',
        curatedLessons,
        legacyFallbacks,
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
