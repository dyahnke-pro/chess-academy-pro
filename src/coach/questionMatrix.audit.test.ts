import { describe, it, expect } from 'vitest';
import { buildQuestionGrounding } from './questionIntents';
import { routeChatIntent } from '../services/coachSessionRouter';
import type { MasterGroundingOptions } from '../services/coachApi';
// @ts-expect-error — .mjs matrix, no types
import { QUESTION_MATRIX, allPhrasings, fillerVariants, STRUCTURAL_PROBES } from '../../scripts/audit-lib/coach-question-matrix.mjs';

/**
 * THE COACH QUESTION-MATRIX AUDIT (David 2026-07-09: "list out all of the
 * questions… all parts of the app, all actions… if it comes back with the stock
 * answer we track it down and plug it in").
 *
 * Drives EVERY question the app can answer + EVERY action the coach takes,
 * and asserts each ROUTES to a real intent / action — not the stock fall-through.
 * A Q&A probe that fires NO intent, or an action probe that matches nothing, is
 * the wiring gap that would surface as the stock line at runtime. The
 * ASSEMBLER-produces-facts half is covered by the per-assembler unit tests; this
 * audit proves the ROUTING is wired for every capability.
 */

// The intent flags that route a Q&A turn to an assembler (the *Kind refinements
// carry defaults, so they don't count as "an intent fired" on their own).
const INTENT_KEYS: ReadonlyArray<keyof MasterGroundingOptions> = [
  'planQuestion', 'bestMoveQuestion', 'whyBestMoveQuestion', 'tacticsQuestion', 'progressQuestion',
  'trendQuestion', 'openingProfileQuestion', 'statsQuestion', 'strengthsQuestion',
  'openingAccuracyQuestion', 'openingTrapsQuestion', 'openingTrapsSystemAsk',
  'reviewDueQuestion', 'mistakesQuestion', 'tacticsProfileQuestion', 'phaseQuestion',
  'repertoireGapQuestion', 'accuracyQuestion', 'consistencyQuestion',
  'convertingQuestion', 'colorQuestion', 'recordsQuestion', 'recordVsTarget',
  'moveRatingQuestion', 'trainingRequestKind', 'puzzleStatsQuestion',
  'transferGapQuestion', 'skillRadarQuestion', 'masterPlayQuestion', 'conceptQuestion',
  'playerGamesQuestion', 'endgameQuestion', 'positionAssessmentQuestion',
  'teachingMethodQuestion', 'settingsQuestion', 'appHelpQuestion',
  'timeTroubleQuestion', 'lastGameQuestion', 'positionalTopic',
  // Two intents that shipped after this list was written, so three probes were
  // reported as routing gaps while the routing was in fact correct:
  //   "what happens if i play e5 here"        → candidateMoveQuestion
  //   "what do i play against the caro …"     → counterRepertoireQuestion
  //   "do i have a line against everything"   → counterRepertoireQuestion
  // A missing key here reads as a product hole that does not exist, which is
  // the same wasted hunt as a gate that stays silent on a real one. Verified
  // 2026-08-08 that both are FALSE on gibberish and on off-topic asks, so
  // adding them cannot make a probe pass trivially.
  'candidateMoveQuestion', 'counterRepertoireQuestion',
];

function firedIntent(g: MasterGroundingOptions): boolean {
  return INTENT_KEYS.some((k) => {
    const v = g[k];
    return typeof v === 'boolean' ? v : v !== undefined && v !== null;
  });
}

// A live FEN for the board-dependent probes (a normal middlegame).
const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4';

// `needsOpeningsDb` is NOT `knownGap`. knownGap = a feature that isn't built.
// needsOpeningsDb = a feature that IS built but whose route reads the openings
// Dexie store, which a bare vitest process never seeds — the read never settles,
// the default timeout fires, and the `.catch(() => null)` below renders that
// stall as "routed NO action". Reporting it as a routing hole sends the next
// session hunting for a bug that isn't there. The Playwright audits share this
// matrix and run against the real seeded app, so the probe still runs for real.
interface Row { id: string; cat: string; lane: string; qs: string[]; qs2?: string[]; knownGap?: string; needsOpeningsDb?: string }

describe('QUESTION MATRIX — every capability routes (no stock fall-through)', () => {
  const rows = QUESTION_MATRIX as Row[];

  // Q&A families: EVERY phrasing across EVERY pass must fire an intent.
  // (pass 1 = `qs` natural; pass 2 = `qs2` harder/oblique — David: "each pass
  // is all questions three different ways… then it gets harder on the second".)
  for (const row of rows.filter((r) => r.cat !== 'action')) {
    it(`Q&A [${row.cat}/${row.id}] every phrasing (all passes) fires an intent`, () => {
      const misses: string[] = [];
      for (const q of allPhrasings(row) as string[]) {
        const g = buildQuestionGrounding(q, { fen: FEN });
        if (!firedIntent(g)) misses.push(q);
      }
      expect(misses, `STOCK-GAP (${row.id}): these fired NO intent → would return the stock line: ${JSON.stringify(misses)}`).toEqual([]);
    });
  }

  // Action families: every command (all passes) must match the deterministic
  // router. Rows flagged `knownGap` are documented unbuilt features (drill /
  // favorite / repertoire / board-control from chat = task #19) — reported via
  // `it.skip` so the audit stays green on plugged items while keeping the gap
  // visible in the run output.
  for (const row of rows.filter((r) => r.cat === 'action')) {
    const runner = row.knownGap || row.needsOpeningsDb ? it.skip : it;
    const why = row.knownGap ? ` (KNOWN GAP: ${row.knownGap})`
      : row.needsOpeningsDb ? ` (NEEDS SEEDED DB: ${row.needsOpeningsDb})` : '';
    runner(`ACTION [${row.id}] every phrasing (all passes) routes to an action${why}`, async () => {
      const misses: string[] = [];
      for (const q of allPhrasings(row) as string[]) {
        let routed: unknown = null;
        try {
          routed = await routeChatIntent(q, { currentFen: FEN });
        } catch {
          routed = null;
        }
        if (!routed) misses.push(q);
      }
      expect(misses, `ACTION-GAP (${row.id}): these matched NO action → would fall to the brain/stock: ${JSON.stringify(misses)}`).toEqual([]);
    });
  }
});

describe('QUESTION MATRIX — PASS 4: filler robustness + hard structure', () => {
  const rows = QUESTION_MATRIX as Row[];

  // Every Q&A family's pass-1 phrasings, wrapped in conversational filler, must
  // still fire an intent (the runtime normalizes filler away).
  for (const row of rows.filter((r) => r.cat !== 'action')) {
    it(`FILLER [${row.cat}/${row.id}] padded phrasings still fire`, () => {
      const misses: string[] = [];
      for (const q of fillerVariants(row) as string[]) {
        if (!firedIntent(buildQuestionGrounding(q, { fen: FEN }))) misses.push(q);
      }
      expect(misses, `FILLER-GAP (${row.id}): padded asks fired NO intent: ${JSON.stringify(misses)}`).toEqual([]);
    });
  }

  // The distinct harder-structure phrasings passes 4-8 surfaced. `notKey` (when
  // present) is an intent flag that must NOT fire — a misroute guard (e.g. a
  // training-plan ask must not fire the board planQuestion).
  interface Probe { id: string; cat: string; q: string; notKey?: keyof MasterGroundingOptions; needsOpeningsDb?: string }
  for (const p of STRUCTURAL_PROBES as Probe[]) {
    // Same seeded-store carve-out as the action rows above.
    const structRunner = p.needsOpeningsDb ? it.skip : it;
    structRunner(`STRUCT [${p.id}] "${p.q}" routes${p.notKey ? ` (not ${p.notKey})` : ''}${p.needsOpeningsDb ? ` (NEEDS SEEDED DB: ${p.needsOpeningsDb})` : ''}`, async () => {
      if (p.cat === 'action') {
        const routed = await routeChatIntent(p.q, { currentFen: FEN }).catch(() => null);
        expect(routed, `STRUCT-GAP (${p.id}): "${p.q}" matched NO action`).not.toBeNull();
      } else {
        const g = buildQuestionGrounding(p.q, { fen: FEN });
        expect(firedIntent(g), `STRUCT-GAP (${p.id}): "${p.q}" fired NO intent`).toBe(true);
        if (p.notKey) {
          const v = g[p.notKey];
          const fired = typeof v === 'boolean' ? v : v !== undefined && v !== null;
          expect(fired, `MISROUTE (${p.id}): "${p.q}" wrongly fired ${p.notKey}`).toBe(false);
        }
      }
    });
  }
});
