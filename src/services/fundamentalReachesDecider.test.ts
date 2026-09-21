/**
 * THE HEAT MAP AND THE DECIDER ARE ONE NUMBER (David 2026-09-21: "I also want
 * the decision calculator and the heat map tied together so the coach knows
 * when a why is important to state. Teaching narrations need to be important to
 * the decision computer when the stated move is a common error for the user."
 * → "Based off of weakness tab/ heat map. These two surfaces need to be tied
 * together.").
 *
 * 🚨 THE DEFECT THIS GATE EXISTS TO STOP, and it was live until today. The
 * coach could SAY "you left a piece loose again" — `fundamentalRecurrence`
 * joins the student's record EXACTLY, through `matchFundamental` — while the
 * computer deciding whether that moment was worth saying had matched
 * `matchClauseKind('fundamental')`, which answers with the most-pressing hole
 * in the whole POSITIONAL BUCKET. One sentence, two joins, two different holes,
 * and nothing anywhere said they disagreed.
 *
 * `matchFundamental` had ONE production caller (the recurrence sentence) — a
 * computer wired to the VOICE and not to the DECIDER, which is the same shape
 * as the three optional student terms this repo has already found
 * (`NeedPlyInput.clauseKind`, `StudentContext.momentBoost`, `posedTags`).
 *
 * THE TIE IS NOT A NEW TABLE, and that is the load-bearing claim here: the
 * Fundamentals tab counts `misconceptionTags.fundamentalId`
 * (`getFundamentalCounts`) and the spine aggregates the SAME field into
 * `fundamental:<id>` rows (`weaknessSpine.aggregateFundamentals`). Test 1
 * proves those two readers cannot disagree; tests 2–4 prove that record now
 * reaches the need score, precise before coarse.
 *
 * NEGATIVE CONTROLS THROUGHOUT. Every ordering assertion is paired with the
 * result the OLD order produced, computed here from the same inputs — so a
 * green means the chain reordered, not that the fixture was too weak to tell.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { logMisconception } from './misconceptionService';
import { getUnifiedWeaknessProfile } from './weaknessSpine';
import {
  buildWeaknessSignals, matchClauseKind, matchFundamental, boostFor,
  type WeaknessSignal,
} from './weaknessSignal';
import { FUNDAMENTAL_TAG } from './principleAttribution';
import { getFundamentalCounts } from './fundamentalsCatalog';
import { computeNeed, coldStudent, type NeedPlyInput, type StudentNeedContext } from './needScore';

const FEN_A = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const FEN_B = 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2';
const FEN_C = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

async function reset(): Promise<void> {
  await db.mistakePuzzles.clear();
  await db.misconceptionTags.clear();
  await db.openingWeakSpots.clear();
  await db.classifiedTactics.clear();
  await db.games.clear();
  await db.findSquareAttempts.clear();
  await db.table('meta').clear();
}

/** A warm student — the cold-start prior is 100 and would drown every data
 *  term, so every need assertion below needs a student past the floor. */
function warm(signals: readonly WeaknessSignal[]): StudentNeedContext {
  return { ...coldStudent(1500), gamesPlayed: 20, signals };
}

/** A ply carrying BOTH keys: the exact fundamental and the coarse clause kind
 *  the old chain matched on. That overlap is the whole test — the two routes
 *  answer the same question and used to answer it differently. */
function ply(fundamentalId: string | null, clauseKind: string | null): NeedPlyInput {
  return { ply: 14, studentMove: true, fundamentalId, clauseKind };
}

describe('the heat map and the spine read ONE record', () => {
  beforeEach(reset);

  it('every fundamental the tab counts is a signal the decider can match', async () => {
    await logMisconception({ tag: FUNDAMENTAL_TAG['loose-piece'], fundamentalId: 'loose-piece', source: 'auto-analysis', fen: FEN_A, playedSan: 'Nc3', counted: false, sourceGameId: 'g1' });
    await logMisconception({ tag: FUNDAMENTAL_TAG['loose-piece'], fundamentalId: 'loose-piece', source: 'auto-analysis', fen: FEN_B, playedSan: 'd5', counted: false, sourceGameId: 'g2' });
    await logMisconception({ tag: FUNDAMENTAL_TAG['tempo-handed'], fundamentalId: 'tempo-handed', source: 'game-review', fen: FEN_C, playedSan: 'a3', sourceGameId: 'g3' });

    const counts = await getFundamentalCounts();          // what the TAB shows
    const signals = buildWeaknessSignals(await getUnifiedWeaknessProfile(), null); // what the DECIDER sees

    // NON-VACUITY: a silent parse would make every assertion below free.
    expect(Object.keys(counts).length).toBeGreaterThan(0);
    expect(signals.length).toBeGreaterThan(0);

    for (const id of Object.keys(counts)) {
      const sig = matchFundamental(id, signals);
      expect(sig, `the tab counts "${id}" but the decider cannot match it`).not.toBeNull();
      // And the same number: the tab's count IS the signal's total, because
      // both read `misconceptionTags.fundamentalId` and nothing else.
      expect(sig!.total).toBe(counts[id as keyof typeof counts]!.count);
    }
  });

  it('negative control: a fundamental nobody recorded matches nothing', async () => {
    const signals = buildWeaknessSignals(await getUnifiedWeaknessProfile(), null);
    expect(signals.length).toBe(0);
    expect(matchFundamental('loose-piece', signals)).toBeNull();
  });
});

describe('the exact fundamental reaches the need score, precise before coarse', () => {
  beforeEach(reset);

  /**
   * The fixture that makes the bug visible, and it has to be built on purpose:
   * a WEAK exact hole beside a STRONG unrelated positional one. With the coarse
   * route ahead of the exact one, the strong stranger wins and need is computed
   * about a hole this move has nothing to do with.
   */
  async function mixedProfile(): Promise<readonly WeaknessSignal[]> {
    // ONE loose-piece slip — the exact hole this move broke. Weak on purpose.
    await logMisconception({ tag: FUNDAMENTAL_TAG['loose-piece'], fundamentalId: 'loose-piece', source: 'auto-analysis', fen: FEN_A, playedSan: 'Nc3', counted: false, sourceGameId: 'g1' });
    // FIVE slips on an unrelated positional fundamental — the bucket's leader.
    for (let i = 0; i < 5; i++) {
      await logMisconception({
        tag: FUNDAMENTAL_TAG['space-conceded'], fundamentalId: 'space-conceded',
        source: 'auto-analysis', fen: `${FEN_B.slice(0, -1)}${i + 1}`, playedSan: `a${i + 3}`,
        counted: false, sourceGameId: `g${i + 2}`,
      });
    }
    return buildWeaknessSignals(await getUnifiedWeaknessProfile(), null);
  }

  it('matches the fundamental this move broke, NOT the bucket leader', async () => {
    const signals = await mixedProfile();

    const exact = matchFundamental('loose-piece', signals);
    const coarse = matchClauseKind('fundamental', signals);

    // The fixture is only meaningful if the two routes really disagree here.
    expect(exact, 'fixture: the exact row must exist').not.toBeNull();
    expect(coarse, 'fixture: the coarse route must find something').not.toBeNull();
    expect(coarse!.clusterId).not.toBe(exact!.clusterId);
    expect(boostFor(coarse!), 'fixture: the stranger must outrank the exact hole, or the old order was harmless')
      .toBeGreaterThan(boostFor(exact!));

    // THE CONTRACT: the chain answers with the hole the MOVE is about.
    const v = computeNeed(ply('loose-piece', 'fundamental'), warm(signals));
    const reason = v.reasons.find((r) => r.startsWith('weakness:'));
    expect(reason, 'the weakness term must fire at all').toBeTruthy();
    expect(reason).toContain(exact!.clusterId);
    // NEGATIVE CONTROL — what the OLD order produced, from the same inputs.
    expect(reason).not.toContain(coarse!.clusterId);
  });

  it('the coarse route still answers when no fundamental was attributed (raise-only)', async () => {
    const signals = await mixedProfile();
    // `fundamentalId: null` is the honest answer on a ply the attributor
    // declined. Demoted, not deleted: deleting it would make the coach QUIETER
    // on a student with a real positional hole, and data may only LOWER on
    // evidence of the POSITIVE (the ALGO-BASED law).
    const v = computeNeed(ply(null, 'fundamental'), warm(signals));
    const reason = v.reasons.find((r) => r.startsWith('weakness:'));
    expect(reason).toBeTruthy();
    expect(reason).toContain(matchClauseKind('fundamental', signals)!.clusterId);
  });

  it('a fundamental with no record raises nothing — grey is not a hole', async () => {
    const signals = await mixedProfile();
    // 'botched-conversion' is never recorded by the fixture. Absent ≠ mastered,
    // but it is also not evidence of failure: the weakness term must stay 0 and
    // let the other terms (and the ranker's grey boost) carry the ply.
    const v = computeNeed(ply('botched-conversion', null), warm(signals));
    expect(v.reasons.some((r) => r.startsWith('weakness:'))).toBe(false);
  });
});
