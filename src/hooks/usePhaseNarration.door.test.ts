/**
 * THE PHASE REPORT REACHES THE TURN DOOR ONCE, AS TYPED FACTS (root causes 5
 * + 6, Smith-Morra replay 2026-10-19). On the move-8 board the hook re-ran
 * position facts, flattened them to prose and sent each sentence to the door
 * alone with no claim key, so say-once could match only exact words and every
 * line was its own turn. Now the whole report is one door call whose facts
 * carry the same claim keys the turn's own position-facts lane gives them.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ClauseItem, PositionFactsResult } from '../services/positionFacts';
import type { PhaseFact } from '../services/coachDecider';

const speakPackage = vi.fn((_pkg: unknown) => Promise.resolve());
vi.mock('../services/voiceService', () => ({ voiceService: { speakPackage: (p: unknown) => speakPackage(p), stop: vi.fn() } }));

const MOVE8 = 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8';
const TOP = {
  bestMove: 'e4e5', evaluation: -17, isMate: false, mateIn: null, depth: 10, nodesPerSecond: 1,
  topLines: [
    { rank: 1, moves: ['e4e5', 'c6e5', 'f3e5', 'g7e5'], evaluation: -17, mate: null },
    { rank: 2, moves: ['c3d5', 'c8g4', 'd1b3'], evaluation: -28, mate: null },
  ],
};
vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: { analyzeWithBudget: () => Promise.resolve(TOP), evalBoard: () => Promise.resolve(null) },
  resolveWorkerUrl: () => ({ variant: 'wasm' }),
}));
vi.mock('./stockfishFenCache', () => ({ getCachedStockfish: () => null, setCachedStockfish: vi.fn() }));
vi.mock('../services/appAuditor', () => ({ logAppAudit: vi.fn() }));
vi.mock('../db/schema', () => ({ db: { profiles: { get: () => Promise.resolve({ currentRating: 1200 }) } } }));
const groundedMoveFeedback = vi.fn(async (a: { extraFacts?: string }) => a.extraFacts ?? '');
vi.mock('../services/coachApi', () => ({ groundedMoveFeedback: (a: { extraFacts?: string }) => groundedMoveFeedback(a) }));
vi.mock('../services/liveTacticsContext', () => ({ buildFedTacticsContext: () => Promise.resolve(undefined), speakDeepestLookahead: () => null }));
vi.mock('../services/danyaTeachingService', () => ({ transitionTeachingSourceForGame: () => null }));
vi.mock('../services/coachAnswerGates', () => ({ isSpokenSentenceGrounded: () => true, gradeNarrationText: (t: string) => t }));

/** The replay's report on MOVE8, as the clauses position facts handed over. */
const CLAUSES: ClauseItem[] = [
  { kind: 'stop-flaw', rank: 30, text: 'They want the bishop to g4, pinning your knight on f3 to your queen. The obvious stop is h3 — find another way.', squares: ['g4', 'f3', 'd1'], claim: 'prophylaxis:g4:idea' },
  { kind: 'your-habit', rank: 20, text: 'Missing a pin keeps catching you.' },
] as ClauseItem[];
vi.mock('../services/positionFacts', async (orig) => {
  const actual = await orig<typeof import('../services/positionFacts')>();
  return {
    ...actual,
    computePositionFacts: () => Promise.resolve({
      clauses: CLAUSES, remember: [], rememberByClause: CLAUSES.map((c) => ({ text: c.text, keys: [] })),
    } as unknown as PositionFactsResult),
  };
});

import { usePhaseNarration } from './usePhaseNarration';
import { clauseClaims } from '../services/positionFacts';
import type { PhaseTransitionEvent } from '../services/phaseTransitionDetector';

const SANS = 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 d6 Bc4 Nc6 Nf3 g6 O-O Bg7';

describe('usePhaseNarration with a turn door', () => {
  it('hands the move-8 report to the door ONCE, every fact typed with its claim keys', async () => {
    const door = vi.fn(async (_facts: readonly PhaseFact[], _fen: string) => 'spoken');
    const { result } = renderHook(() => usePhaseNarration({
      getPgn: () => SANS, playerColor: 'white', getOpeningName: () => 'Sicilian Defense: Smith-Morra Gambit',
      getLiveFen: () => MOVE8, corpusNotes: false, tacticsOwnedByTurn: true, getStanding: null, speakFacts: door,
    }));
    await act(async () => {
      await result.current.narrate({ kind: 'opening-to-middlegame', fen: MOVE8, playerColor: 'white', moveNumber: 14 } as PhaseTransitionEvent, 'full');
    });
    expect(door).toHaveBeenCalledTimes(1);
    const [facts, fen] = door.mock.calls[0];
    expect(fen).toBe(MOVE8);
    expect(facts.map((f) => f.text)).toEqual(CLAUSES.map((c) => c.text));
    const pf = { clauses: CLAUSES, rememberByClause: CLAUSES.map((c) => ({ text: c.text, keys: [] })) };
    facts.forEach((f, i) => {
      expect(f.claims.length).toBeGreaterThan(0);
      expect(f.claims).toEqual(clauseClaims(pf, i, MOVE8));
    });
    expect(facts[0].claims).toContain('prophylaxis:g4:idea');
    expect(facts[0].squares).toEqual(['g4', 'f3', 'd1']);
    // Nothing went to the voice behind the door's back.
    expect(speakPackage).not.toHaveBeenCalled();
  });
});
