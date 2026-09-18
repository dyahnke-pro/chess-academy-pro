import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeNeed, type StudentNeedContext } from './needScore';
import type { WeaknessSignal } from './weaknessSignal';

/**
 * THE LIVE LANE MUST SEE THE STUDENT'S HOLES.
 *
 * `positionFacts` called `computeNeed` with neither `clauseKind` nor
 * `conceptId`, so `weaknessTerm` — 55 points against a 50 bar, the largest
 * term in the score — could never fire on a live surface. The student model
 * was loaded, matched for `momentBoost` two lines below, and dropped on the
 * floor for the decision that actually gates speech.
 *
 * No prod audit could catch this. Every audit runs a FRESH device, where
 * `gamesPlayed < COLD_START_GAMES` pins the cold-start prior at 100 and masks
 * the dead term entirely — the one profile on which the bug is invisible.
 * So the gate has to be here.
 */
const persistentHole = {
  clusterId: 'analysis:tactic:hanging_piece',
  bucket: 'tactics',
  label: 'Hanging pieces',
  openCount: 6,
  severity: 80,
  lifecycleStatus: 'persistent',
  trend: 'worsening',
  puzzleThemes: ['hangingPiece'],
  total: 14,
} as unknown as WeaknessSignal;

/** An EXPERIENCED student (past the prior) on a line they have played right
 *  five times — so `unfamiliarityTerm` is 0 and the hole is the only thing
 *  that can still earn a word. This is the exact profile the bug hid behind. */
const experienced: StudentNeedContext = {
  rating: 1400,
  gamesPlayed: 20,
  signals: [persistentHole],
  bookDepartures: [],
  capabilities: new Map(),
  openingId: 'caro-kann',
  lineReps: Array(40).fill(5),
  openingScore: 0.5,
  overallScore: 0.5,
};

describe('need sees the student on a familiar line', () => {
  it('is SILENT when the clause kind is withheld — the shape of the bug', () => {
    const v = computeNeed({ ply: 11, studentMove: true, clauseKind: null }, experienced);
    expect(v.speak).toBe(false);
    expect(v.score).toBe(0);
  });

  it('SPEAKS for a persistent hole once the clause kind is supplied', () => {
    const v = computeNeed({ ply: 11, studentMove: true, clauseKind: 'must-defend' }, experienced);
    expect(v.speak).toBe(true);
    expect(v.reasons.join(' ')).toContain('analysis:tactic:hanging_piece');
  });

  it('still lowers nothing for a hole the student does not have', () => {
    const noHoles = { ...experienced, signals: [] };
    expect(computeNeed({ ply: 11, studentMove: true, clauseKind: 'must-defend' }, noHoles).speak).toBe(false);
  });

  /**
   * BLAME BY STATEMENT. The behavioural tests above pass just as well if
   * `positionFacts` hard-codes `clauseKind: null` — the type is satisfied and
   * the term is dead again, silently. The type forces a caller to ANSWER; this
   * forces the live lane's answer to be a computed one.
   */
  it('positionFacts computes its clause kind rather than passing a literal null', () => {
    const src = readFileSync('src/services/positionFacts.ts', 'utf8');
    // Scope to the computeNeed CALL. A whole-file scan blames the wrong line:
    // `needClauseFor` legitimately returns `{ clauseKind: null }` for a ply with
    // no clauses at all, and a file-wide `not.toMatch` red-flagged that guard.
    const i = src.indexOf('computeNeed({');
    expect(i).toBeGreaterThan(-1);
    const call = src.slice(i, src.indexOf('}, input.studentNeedContext)', i));
    expect(call).toMatch(/clauseKind:\s*needFor\.clauseKind/);
    expect(call).not.toMatch(/clauseKind:\s*null/);
    // and the join itself is written ONCE, not copied per consumer
    expect(src.match(/matchClauseKind\(/g)?.length ?? 0).toBe(1);
  });
});

/**
 * THE REVIEW LANE. `teachingSelector` supplies `conceptId` (a tactic) and no
 * clause kind, so before 2026-09-18 a student whose hole was POSITIONAL,
 * STRUCTURAL or an endgame-conversion problem got no weakness term at all on
 * the surface where diagnosis happens — review could only see tactical holes.
 *
 * The route that closes it is `posedTags` -> `matchTag`, landing on the coach's
 * OWN captures: `fromMisconception` files those rows under the misconception
 * tag itself, so they are reachable by tag and by nothing else.
 */
const coachCapturedHole = {
  clusterId: 'ignored-opponent-threat',
  bucket: 'tactics',
  label: 'Ignores what the opponent is doing',
  openCount: 5,
  severity: 70,
  lifecycleStatus: 'persistent',
  trend: 'worsening',
  puzzleThemes: [],
  total: 11,
} as unknown as WeaknessSignal;

describe('the review lane reaches non-tactical holes', () => {
  const ctx = { ...experienced, signals: [coachCapturedHole] };

  it('is SILENT on a tactic id alone — the shape of the review-lane bug', () => {
    const v = computeNeed({ ply: 11, studentMove: true, clauseKind: null }, ctx);
    expect(v.speak).toBe(false);
  });

  it('SPEAKS when the board POSED the capability the student keeps failing', () => {
    const v = computeNeed({
      ply: 11, studentMove: true, clauseKind: null,
      posedTags: ['ignored-opponent-threat'] as never,
      playedCleanly: false,   // they got it WRONG — the hole is most live here
    }, ctx);
    expect(v.speak).toBe(true);
    expect(v.reasons.join(' ')).toContain('ignored-opponent-threat');
  });

  it('raises need on a BLUNDERED ply — the guard belongs to green, not to need', () => {
    // The old shape pre-filtered the tag list by clean play, so a blundered ply
    // arrived with NO tags and the weakness term went blind exactly where the
    // student needed teaching most. Posed tags survive a bad move.
    const wrong = computeNeed({
      ply: 11, studentMove: true, clauseKind: null,
      posedTags: ['ignored-opponent-threat'] as never, playedCleanly: false,
    }, ctx);
    const right = computeNeed({
      ply: 11, studentMove: true, clauseKind: null,
      posedTags: ['ignored-opponent-threat'] as never, playedCleanly: true,
    }, ctx);
    expect(wrong.speak).toBe(true);
    expect(right.speak).toBe(true);
  });
});
