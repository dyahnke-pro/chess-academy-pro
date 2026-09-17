import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * THE DIVERGENCE, AS A NUMBER THAT MAY ONLY GO DOWN
 * (docs/plans/2026-09-17-computer-unification.md §1 Phase 5).
 *
 * The map found that the three surfaces of "one coach" share SIX services — and
 * four of those are infrastructure. `CoachTeachPage` is ~13,900 lines importing
 * ~100 services directly; 75 computers are Teach-only. The page is not a
 * surface consuming a coach, it is a THIRD COACH. That is why a fix lands on
 * one surface and not the other, over and over.
 *
 * Extracting composition out of a 13,900-line page in one heroic refactor is
 * how that refactor goes wrong. This gate turns it into a number instead: every
 * direct fact-computer import from a surface is counted, and the ceiling may
 * only SHRINK (the sealed-gates rule). A session that routes five calls through
 * the composer lowers it by five; a session that adds one goes red.
 *
 * It deliberately does NOT ban the imports outright — that would fail the build
 * today and teach nothing. It measures.
 */
const ROOT = 'src';

/**
 * A FACT COMPUTER computes chess or teaching facts. INFRASTRUCTURE does not —
 * voice, engine, audit, storage, routing, caches and UI helpers are legitimate
 * for a surface to touch directly and are excluded. Keep this list honest:
 * adding a real computer here to duck the ceiling is the same cheat as raising
 * the ceiling.
 */
const INFRA = new Set([
  'voiceService', 'stockfishEngine', 'stockfishCache', 'appAuditor', 'analytics',
  'analyticsService', 'dataLoader', 'puzzleService', 'db', 'storage',
  'deviceIdentity', 'gamePhaseService', 'boardUtils', 'engineConstants',
  'sanitizeCoachText', 'chesscomGamesService', 'lichessExplorerService',
  'coachApi', 'coachSessionRouter', 'coachAgent', 'coachThread',
  'coachSettingsAction', 'masterPlayCache', 'amateurPlayCache',
  'walkthroughAdapter', 'masterclassWalkthroughAdapter', 'narrationSegments',
  'boardAnnotationService', 'moveOrderArrows', 'voiceInputService',
  'contentGenerationService', 'openingService', 'mistakePuzzleService',
  'coachCurriculumService', 'coachGameEngine', 'coachMoveCommand',
  'coachNonAnswer', 'coachAnswerGates', 'linePickerPopularity',
  'trapPlayPosition', 'stageEntryValidity', 'playerGameRequest',
  'proGameReferenceService',
  // `standingFactMemory` computes NO chess fact — it is the say-once set and
  // its forget-on-rewind rule, the same class as a cache. Added here when the
  // rule was extracted from the two surfaces that each carried a copy.
  //
  // ⚠️ This is the shape of the cheat this gate warns about, so it is stated
  // out loud: moving a real computer into INFRA would lower the count without
  // routing a single call. The test below names nine computers and asserts
  // they are NOT here. If you add something to this list, it must be provable
  // that it answers no question about the board.
  'standingFactMemory',
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) out.push(p);
  }
  return out;
}

function factImports(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const mods = new Set<string>();
  for (const m of src.matchAll(/from '(?:\.\.\/)+services\/([A-Za-z0-9_]+)'/g)) {
    if (!INFRA.has(m[1])) mods.add(m[1]);
  }
  return [...mods];
}

const SURFACES = [
  ...walk(join(ROOT, 'components', 'Coach')),
  ...walk(join(ROOT, 'hooks')),
];

// ── SHRINK-ONLY CEILINGS, measured 2026-09-17. Lower them when you route a
//    call through the composer. NEVER raise one.
const TOTAL_CEILING = 254;
const PER_FILE_CEILING: Record<string, number> = {
  'components/Coach/CoachTeachPage.tsx': 62,
  'components/Coach/CoachGamePage.tsx': 33,
  'components/Coach/CoachGameReview.tsx': 32,
};

describe('surface composition — the coach/third-coach divergence, measured', () => {
  it(`surfaces import fact computers directly at most ${TOTAL_CEILING} times in total`, () => {
    let total = 0;
    const worst: string[] = [];
    for (const f of SURFACES) {
      const n = factImports(f).length;
      total += n;
      if (n > 0) worst.push(`${n}\t${f.replace(`${ROOT}/`, '')}`);
    }
    worst.sort((a, b) => Number(b.split('\t')[0]) - Number(a.split('\t')[0]));
    expect(total, `\n${worst.slice(0, 10).join('\n')}\n`).toBeLessThanOrEqual(TOTAL_CEILING);
  });

  it('the three big surfaces stay under their own ceilings', () => {
    for (const [rel, ceiling] of Object.entries(PER_FILE_CEILING)) {
      const f = join(ROOT, rel);
      const got = factImports(f);
      expect(got.length, `${rel}: ${got.sort().join(', ')}`).toBeLessThanOrEqual(ceiling);
    }
  });

  it('the measurement is NON-VACUOUS — it really sees the page', () => {
    // A scan that silently matches nothing would pass forever. The biggest
    // surface must be visible to it, and the INFRA list must not have swallowed
    // everything.
    const teach = factImports(join(ROOT, 'components/Coach/CoachTeachPage.tsx'));
    expect(teach.length, 'the scan found no fact computers in the largest surface').toBeGreaterThan(20);
    expect(teach).toContain('positionFacts');
  });

  it('INFRA never hides a real computer', () => {
    // The cheat this gate is most vulnerable to: parking a fact computer in
    // INFRA to lower the count. These are computers by definition — a test that
    // names them stops the list being quietly widened.
    for (const c of ['positionFacts', 'conceptEngine', 'moveFundamentals', 'weaknessSpine',
      'causalChain', 'lookaheadPlan', 'groundedAnswer', 'playCommentary', 'liveTacticsContext']) {
      expect(INFRA.has(c), `${c} is a fact computer and must not be in INFRA`).toBe(false);
    }
  });
});
