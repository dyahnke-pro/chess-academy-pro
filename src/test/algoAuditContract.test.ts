/**
 * THE ASSERT HALF IS A GATE (David 2026-09-20: "I want audit tools on all algo
 * based builds").
 *
 * The rule locked in CLAUDE.md has two halves. EMIT: an algo-based computer
 * emits one structured row per decision, through a leaf event module. ASSERT:
 * an audit holds a CONTRACT on those rows. Only the first half is visible in
 * the product, which is exactly why it is the half that survives alone — and
 * an emission nobody asserts on is decoration, the same class as an audit that
 * reports green having verified nothing.
 *
 * So this gate reads the audit SCRIPTS and fails when an algo emission has no
 * contract standing on it.
 *
 * WHAT IT CANNOT DO, stated rather than implied: it cannot force a NEW algo
 * computer into the table below. Nothing in the type system knows that a
 * freshly written emitter is algo-based, so the honest enforcement is "every
 * emission we have DECLARED is asserted", not "every emission that exists".
 * The `Record<AlgoEmissionKind, …>` shape means a new member of the union
 * fails to compile until someone names its audit; adding the member is still
 * a human step, and the CLAUDE.md rule is what asks for it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Audit-stream kinds emitted by a DECIDING computer — the algo half of the
 *  app, where the output is a weighting rather than a fact. */
type AlgoEmissionKind =
  | 'coach-decision'
  | 'coach-need-scores'
  | 'capability-heat-map'
  | 'player-rating-estimated'
  | 'review-need-coverage'
  | 'home-opening-chosen'
  | 'analysis-batch-ordered'
  | 'search-depth'
  | 'learn-turn-decision'
  | 'lane-evidence'
  | 'review-voice-package'
  | 'puzzle-themes-targeted'
  | 'deep-run-step'
  | 'learn-reward'
  | 'thinking-lesson';

interface Contract {
  /** The audit that holds the contract. */
  readonly script: string;
  /** A substring that must appear in a row id / record() name in that script,
   *  so the gate blames a CONTRACT and not a stray mention of the kind. */
  readonly contractMarker: string;
  /** Where the row is emitted, for the failure message. */
  readonly emittedBy: string;
}

const CONTRACTS: Record<AlgoEmissionKind, Contract> = {
  'learn-turn-decision': {
    script: 'scripts/audit-concept-gameplay-prod.mjs',
    contractMarker: 'the LEARN door EMITTED',
    emittedBy: 'src/services/learnTurnDoor.ts (decideTurn), aggregated by appAuditor',
  },
  'lane-evidence': {
    script: 'scripts/audit-concept-gameplay-prod.mjs',
    contractMarker: 'LANE EVIDENCE rows are held-only',
    emittedBy: 'src/services/capabilityEvidence.ts (recordLaneEvidence)',
  },
  'review-voice-package': {
    script: 'scripts/audit-review-overhaul-prod.mjs',
    contractMarker: 'REVIEW DOOR package ran',
    emittedBy: 'src/services/coachFeatureService.ts (buildReviewSegments → buildVoicePackage)',
  },
  'coach-decision': {
    script: 'scripts/audit-concept-gameplay-prod.mjs',
    contractMarker: 'the deciding door EMITTED',
    emittedBy: 'src/services/coachDecisionEvents.ts (coachDecider.decide)',
  },
  'coach-need-scores': {
    script: 'scripts/audit-review-overhaul-prod.mjs',
    contractMarker: 'NEED capability-term-never-raises',
    emittedBy: 'src/services/needScore.ts (computeNeed), aggregated by appAuditor',
  },
  'capability-heat-map': {
    script: 'scripts/audit-loop-green-prod.mjs',
    contractMarker: 'HEAT MAP emitted',
    emittedBy: 'src/services/capabilityEvidence.ts (getCapabilityProfile)',
  },
  'player-rating-estimated': {
    script: 'scripts/audit-strength-calibration.mjs',
    contractMarker: 'NAMES which rung of the confidence chain answered',
    emittedBy: 'src/services/playerRatingService.ts (getPlayerRatingEstimate)',
  },
  'review-need-coverage': {
    script: 'scripts/audit-review-overhaul-prod.mjs',
    contractMarker: 'NEED coverage-rows-captured',
    emittedBy: 'coachFeatureService (the N2 need selector)',
  },
  'home-opening-chosen': {
    script: 'scripts/audit-home-opening-prod.mjs',
    contractMarker: 'HOME OPENING chosen-by-volume-over-floor',
    emittedBy: 'src/services/homeOpeningService.ts (getHomeOpenings / setHomeOpening)',
  },
  'analysis-batch-ordered': {
    script: 'scripts/audit-home-opening-prod.mjs',
    contractMarker: 'ANALYSIS ORDER home-games-first-past-the-cap',
    emittedBy: 'src/services/gameAnalysisService.ts (analyzeAllGames via pickAnalysisBatch)',
  },
  'search-depth': {
    script: 'scripts/audit-search-depth-prod.mjs',
    contractMarker: 'SEARCH DEPTH emitted',
    emittedBy: 'src/services/searchDepthEvents.ts (searchDepth.searchUntilStable)',
  },
  'puzzle-themes-targeted': {
    script: 'scripts/audit-tactics-record-prod.mjs',
    contractMarker: 'TACTICS RECORD red-leads',
    emittedBy: 'src/services/puzzleService.ts (getWeakestThemes via rankThemeTargets)',
  },
  'deep-run-step': {
    script: 'scripts/audit-reward-layer-prod.mjs',
    contractMarker: 'DEEP RUN depth climbs',
    emittedBy: 'src/components/Puzzles/DeepRunPage.tsx (fetchFor, from the pure deepRun computer)',
  },
  'learn-reward': {
    script: 'scripts/audit-concept-gameplay-prod.mjs',
    contractMarker: 'LEARN REWARD only skill earns a chime',
    emittedBy: 'src/components/Coach/CoachTeachPage.tsx (handleStudentMove via learnRewardFor)',
  },
  'thinking-lesson': {
    script: 'scripts/audit-learn-how-to-think-prod.mjs',
    contractMarker: 'the lesson emitted thinking-lesson rows with outcomes',
    emittedBy: 'src/services/thinkingLessonSession.ts (one row per question), forwarded by appAuditor',
  },
};

const root = resolve(__dirname, '../..');
const read = (p: string): string => readFileSync(resolve(root, p), 'utf8');

describe('every algo emission has an audit contract standing on it', () => {
  for (const [kind, c] of Object.entries(CONTRACTS) as [AlgoEmissionKind, Contract][]) {
    it(`${kind} is asserted by ${c.script}`, () => {
      expect(existsSync(resolve(root, c.script)), `${c.script} is gone — ${kind} (${c.emittedBy}) now emits with nothing asserting on it`).toBe(true);
      const src = read(c.script);
      // The audit must READ the kind off the wire…
      expect(src.includes(`'${kind}'`), `${c.script} no longer reads ${kind} off the listener`).toBe(true);
      // …and hold a named contract on what it read. Reading without asserting
      // is the decoration this gate exists to catch.
      expect(src.includes(c.contractMarker), `${c.script} reads ${kind} but has no "${c.contractMarker}" row — the ASSERT half is missing`).toBe(true);
    });
  }

  it('the emitted row shape and the contract read the same fields', () => {
    // A contract that reads a field the row does not carry passes vacuously
    // forever (undefined !== 'importance' is quietly true). Pin the join.
    const row = read('src/services/coachDecisionEvents.ts');
    const learn = read('scripts/audit-concept-gameplay-prod.mjs');
    const review = read('scripts/audit-review-overhaul-prod.mjs');
    for (const field of ['posture', 'speak', 'reason', 'quietCount', 'method', 'quietBy', 'subsumed', 'stakedCount', 'leadStaked', 'teaches', 'moveAdvice']) {
      expect(row.includes(`${field}:`), `CoachDecisionRow lost the ${field} field`).toBe(true);
      expect(
        learn.includes(`.${field}`) || review.includes(`.${field}`),
        `no audit reads row.${field} — an emitted field nobody asserts on is decoration`,
      ).toBe(true);
    }
  });
});
