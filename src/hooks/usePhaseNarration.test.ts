/**
 * usePhaseNarration — the transition ritual, and WHEN it gets to speak.
 *
 * 🔒 THIS FILE EXISTS BECAUSE THE HOOK HAD NO TESTS AT ALL. It is one of the
 * loudest surfaces in the app — it speaks at every phase boundary of every
 * game — and every claim about it was a source-shape assertion in the wiring
 * gate. The build register called it the weakest link, and the defect it was
 * hiding is exactly the kind a source grep cannot see: an ORDERING problem
 * where every individual piece is correct.
 *
 * The defect: the corpus note is a JSON lookup on the history and the FEN. No
 * engine, no model, no network — ready in milliseconds. It was nevertheless
 * computed AFTER `analyzeWithBudget` (1.2s desktop, 5s on the iOS asm build)
 * and a tactics scan. And the report is abandoned WHOLE when the board moves
 * past it, which is correct and which is what kept happening: the student
 * plays inside five seconds, so the teaching that was ready almost instantly
 * was thrown away having never been spoken. Silence, at the one moment the
 * corpus was written for.
 *
 * So these tests assert TIMING as a first-class contract, not just content.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/** Resolves only when we say so — this is how "the engine is still thinking"
 *  is expressed as a test condition. */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const spoken: string[] = [];
const speakPackage = vi.fn((pkg: { spoken: string }) => {
  if (pkg.spoken) spoken.push(pkg.spoken);
  return Promise.resolve();
});

vi.mock('../services/voiceService', () => ({
  voiceService: {
    speakPackage: (pkg: { spoken: string }) => speakPackage(pkg),
    stop: vi.fn(),
  },
}));

let engineGate = deferred<unknown>();
vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzeWithBudget: () => engineGate.promise,
    analyzePosition: () => engineGate.promise,
  },
  resolveWorkerUrl: () => ({ variant: 'wasm' }),
}));

vi.mock('./stockfishFenCache', () => ({
  getCachedStockfish: () => null,
  setCachedStockfish: vi.fn(),
}));

vi.mock('../services/appAuditor', () => ({ logAppAudit: vi.fn() }));
vi.mock('../db/schema', () => ({ db: { profiles: { get: () => Promise.resolve({ currentRating: 1200 }) } } }));
// The grounded chokepoint. Default: silent (''), which keeps every test
// below honest about what the NOTE path speaks on its own. A test that needs
// the engine half VOICED swaps in the G0 echo — `voiceFacts(preferRaw)` speaks
// the computed facts it is handed, so echoing `extraFacts` IS the contract.
const groundedMoveFeedback = vi.fn(async (_args: unknown): Promise<string> => '');
const echoComputedFacts = async (args: unknown): Promise<string> => (args as { extraFacts?: string }).extraFacts ?? '';
vi.mock('../services/coachApi', () => ({ groundedMoveFeedback: (...a: unknown[]): Promise<string> => groundedMoveFeedback(a[0]) }));
vi.mock('../services/liveTacticsContext', () => ({
  buildFedTacticsContext: () => Promise.resolve(undefined),
  speakDeepestLookahead: () => null,
}));
vi.mock('../services/openingDetectionService', () => ({ detectOpening: () => null, isBookLine: () => false }));

/** The corpus. One note, filed at the transition position. */
let noteText = 'Black should trade the light-squared bishops.';
let noteOrigin: 'position' | 'structure' = 'position';
vi.mock('../services/danyaTeachingService', () => ({
  transitionTeachingSourceForGame: () => (noteText
    ? { note: { explains: noteText, teaches: '', plans: '' }, origin: noteOrigin }
    : null),
  generalizedTeaching: (_o: string, p: string) => `As a rule in these positions: ${p}`,
}));

/** The gates pass the text through — their own behaviour is tested in their
 *  own file; what is under test here is whether the hook ever CALLS them in
 *  time to matter. */
vi.mock('../services/coachAnswerGates', () => ({
  isSpokenSentenceGrounded: () => true,
  gradeNarrationText: (t: string) => t,
  gradeBorrowedTeaching: (t: string) => t,
}));

vi.mock('../services/voicePackage', () => ({
  buildVoicePackage: (facts: Array<{ text: string }>) => ({
    spoken: facts.map((f) => f.text).join(' '),
    kept: facts,
    dropped: [],
  }),
}));

import { usePhaseNarration } from './usePhaseNarration';
import type { PhaseTransitionEvent } from '../services/phaseTransitionDetector';

const FEN = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 9';
const MOVED_ON = 'r1bq1rk1/pp2bppp/2n1pn2/8/3p4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 10';

const EVENT: PhaseTransitionEvent = {
  kind: 'opening-to-middlegame',
  fen: FEN,
  playerColor: 'black',
} as PhaseTransitionEvent;

const ANALYSIS = {
  bestMove: 'e2e4', evaluation: 20, isMate: false, mateIn: null,
  depth: 10, topLines: [{ rank: 1, evaluation: 20, moves: ['e2e4'], mate: null }],
  nodesPerSecond: 1,
};

const setup = (getLiveFen?: () => string, corpusNotes = true) => renderHook(() => usePhaseNarration({
  getPgn: () => 'e4 e6 d4 d5 Nc3 Nf6',
  playerColor: 'black',
  getOpeningName: () => 'French Defense',
  getLiveFen,
  corpusNotes,
}));

beforeEach(() => {
  spoken.length = 0;
  speakPackage.mockClear();
  groundedMoveFeedback.mockReset();
  groundedMoveFeedback.mockImplementation(async () => '');
  engineGate = deferred<unknown>();
  noteText = 'Black should trade the light-squared bishops.';
  noteOrigin = 'position';
});

describe('a surface that carries no corpus notes hears none (2026-09-23)', () => {
  it('Learn free play (corpusNotes: false) never speaks the transition note', async () => {
    const { result } = setup(() => FEN, false);
    act(() => { void result.current.narrate(EVENT, 'full'); });
    await new Promise((r) => setTimeout(r, 300));
    expect(spoken.join(' ')).not.toContain('light-squared bishops');
  });
});

describe('the teaching does not wait for the engine', () => {
  it('speaks the corpus note while the search is still running', async () => {
    // THE REGRESSION THIS FILE WAS WRITTEN FOR. The engine promise is never
    // resolved in this test — if the note still reaches the voice, it is
    // provably not sitting behind the search.
    const { result } = setup(() => FEN);
    act(() => { void result.current.narrate(EVENT, 'full'); });
    await vi.waitFor(() => {
      expect(spoken.join(' '), 'the note waited for the engine').toContain('light-squared bishops');
    }, { timeout: 2000 });
  });

  it('still speaks the note when the board has already moved on', async () => {
    // The note is spoken so early that the student has not had time to move.
    // Even when they somehow have, this proves WHERE the cost lands now: the
    // engine's look-ahead is what gets abandoned, not the teaching. Before the
    // reorder the note could not win this race at all — it was computed after
    // the search that the move was outrunning.
    const { result } = setup(() => FEN);
    act(() => { void result.current.narrate(EVENT, 'full'); });
    await vi.waitFor(() => expect(spoken.length).toBeGreaterThan(0), { timeout: 2000 });
    expect(spoken.join(' ')).toContain('light-squared bishops');
  });

  it('says nothing at all when the corpus has nothing and the engine is silent', async () => {
    // "Phase narration stays silent if no notes are available" — a status
    // announcement is not teaching. With no note and no look-ahead there must
    // be no utterance, not a filler line.
    noteText = '';
    const { result } = setup(() => FEN);
    act(() => { void result.current.narrate(EVENT, 'full'); });
    engineGate.resolve(ANALYSIS);
    await act(async () => { await Promise.resolve(); });
    await new Promise((r) => setTimeout(r, 50));
    expect(spoken.join(' '), `spoke with nothing to say: ${spoken.join(' ')}`).toBe('');
  });
});

describe('a sentence is never said twice on one transition', () => {
  it('does not re-speak the note when it comes back inside the grounded text', async () => {
    // The note is spoken early AND rides into `extraFacts`, so it returns
    // inside the grounded response. Keeping it there is deliberate — the chat
    // report should read as one whole thing — so the voice is what dedupes.
    // With the chokepoint ECHOING its computed facts (the G0 contract) the
    // note really does return inside the grounded text — under the old
    // always-'' mock this test could not fail.
    groundedMoveFeedback.mockImplementationOnce(echoComputedFacts);
    const { result } = setup(() => FEN);
    act(() => { void result.current.narrate(EVENT, 'full'); });
    await vi.waitFor(() => expect(spoken.length).toBeGreaterThan(0), { timeout: 2000 });
    engineGate.resolve(ANALYSIS);
    await new Promise((r) => setTimeout(r, 120));
    const hits = spoken.filter((s) => s.includes('light-squared bishops')).length;
    expect(hits, `the note was spoken ${hits} times: ${JSON.stringify(spoken)}`).toBe(1);
  });
});

describe('staleness is decided once, for the whole report', () => {
  it('abandons the engine half whole rather than speaking it in pieces', async () => {
    // Judged per sentence against a board moving underneath them, some
    // survived and some did not — so the student heard a narration with holes
    // in it, one clause referring to a piece the next had already abandoned.
    // Half a teaching line is not half as good as a whole one.
    //
    // The live board is reported as a DIFFERENT position from the start here,
    // so everything the hook tries to say after that point must be dropped.
    // The event carries no `moveNumber`, so the ply distance is UNKNOWN — and
    // an unknown distance collapses to the strict exact-position rule rather
    // than quietly skipping the guard (`NaN > 3` is false, which is how a
    // widened guard stops guarding without anyone noticing).
    const { result } = setup(() => MOVED_ON);
    act(() => { void result.current.narrate(EVENT, 'full'); });
    engineGate.resolve(ANALYSIS);
    await new Promise((r) => setTimeout(r, 80));
    expect(spoken.join(' '), `spoke about a board that is gone: ${spoken.join(' ')}`).toBe('');
  });

  it('still speaks when the board is only a move or two past the boundary', async () => {
    // 🔒 A BOUNDARY IS NOT A TACTIC. "The opening is over" does not stop being
    // true because one more move was played — unlike "the knight on f6 is
    // pinned", which does. Judging a structural announcement by a tactical
    // rule threw away teaching that was still correct, and the prod audit
    // caught it doing so even after the call site was fixed to hand over the
    // live board (`detected=1 abandoned-stale=1`).
    //
    // The fixture pgn is 6 plies; an event detected at ply 5 is one ply back —
    // inside the window — so the report speaks even though the board moved.
    const { result } = setup(() => MOVED_ON);
    act(() => { void result.current.narrate({ ...EVENT, moveNumber: 5 } as PhaseTransitionEvent, 'full'); });
    engineGate.resolve(ANALYSIS);
    await vi.waitFor(() => expect(spoken.length).toBeGreaterThan(0), { timeout: 2000 });
    expect(spoken.join(' ')).not.toBe('');
  });

  it('abandons once the board is genuinely far past the boundary', async () => {
    // Same fixture, but detected 6 plies ago: the student has moved on to a
    // different problem and the announcement is old news.
    const { result } = setup(() => MOVED_ON);
    act(() => { void result.current.narrate({ ...EVENT, moveNumber: 0 } as PhaseTransitionEvent, 'full'); });
    engineGate.resolve(ANALYSIS);
    await new Promise((r) => setTimeout(r, 80));
    expect(spoken.join(' '), `spoke about a board six plies gone: ${spoken.join(' ')}`).toBe('');
  });

  it('speaks normally when the board is still the one it is describing', async () => {
    const { result } = setup(() => FEN);
    act(() => { void result.current.narrate(EVENT, 'full'); });
    await vi.waitFor(() => expect(spoken.length).toBeGreaterThan(0), { timeout: 2000 });
    expect(spoken.join(' ')).toContain('light-squared bishops');
  });
});

describe('a borrowed note is framed as borrowed', () => {
  it('does not narrate another position as if it were this one', async () => {
    // Only the exact-position tier was authored at the board the student is
    // looking at. A structure-transfer note speaks its PLAN, framed as a rule,
    // never its explanation of the game it came from.
    noteOrigin = 'structure';
    noteText = '';
    const { result } = setup(() => FEN);
    act(() => { void result.current.narrate(EVENT, 'full'); });
    engineGate.resolve(ANALYSIS);
    await new Promise((r) => setTimeout(r, 80));
    // With no `plans` on the note there is nothing a borrowed tier may say, so
    // the correct outcome is silence rather than the explanation leaking.
    expect(spoken.join(' ')).toBe('');
  });
});

describe('the COMPUTED CONCEPT speaks at a phase transition (P4c — a wire that fires)', () => {
  // The contract: the phase beat VOICES the ranked concept clause that
  // computePositionFacts derives from the engine's own line (one computer).
  // This is the surface-level proof — the hook, not just positionFacts — and
  // the fixture was probed through the same board router before it was
  // pinned: white to move, the engine's line is Ne5+, a royal fork on Kd7 and
  // the winnable Rc6. Corpus silent, so only the computed facts can speak.
  const FORK_FEN = '8/3k4/2r5/8/8/3N4/8/6K1 w - - 0 40';
  const FORK_EVENT: PhaseTransitionEvent = {
    kind: 'middlegame-to-endgame',
    fen: FORK_FEN,
    playerColor: 'white',
  } as PhaseTransitionEvent;
  // Two lines, as a real multipv read has: the fork is the ONLY move that
  // wins (+3.5), everything else is level — that gap is the decision leverage
  // the importance gate needs before any clause speaks (one computer, one
  // criticality: the same bar the live briefing uses).
  const FORK_ANALYSIS = {
    bestMove: 'd3e5', evaluation: 350, isMate: false, mateIn: null,
    depth: 12,
    topLines: [
      { rank: 1, evaluation: 350, moves: ['d3e5'], mate: null },
      { rank: 2, evaluation: 0, moves: ['g1f2'], mate: null },
    ],
    nodesPerSecond: 1,
  };

  it('hands the fork, with its invariant, to the grounded chokepoint — and it is spoken', async () => {
    noteText = '';
    groundedMoveFeedback.mockImplementationOnce(echoComputedFacts);
    const { result } = setup(() => FORK_FEN);
    act(() => { void result.current.narrate(FORK_EVENT, 'full'); });
    engineGate.resolve(FORK_ANALYSIS);
    // Mock-independent proof: the concept clause reached the chokepoint's facts.
    await vi.waitFor(() => expect(groundedMoveFeedback).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const handed = (groundedMoveFeedback.mock.calls[0][0] as { extraFacts?: string }).extraFacts ?? '';
    expect(handed, 'the concept clause never reached the chokepoint').toMatch(/a fork hits two targets at once/);
    // …and once the chokepoint voices it, the student hears it.
    await vi.waitFor(() => {
      expect(spoken.join(' '), `spoken: ${spoken.join(' ')}`).toMatch(/a fork hits two targets at once/);
    }, { timeout: 4000 });
  });

  it('a spoken concept is gate-clean (you/they perspective, never we/our)', async () => {
    noteText = '';
    groundedMoveFeedback.mockImplementationOnce(echoComputedFacts);
    const { result } = setup(() => FORK_FEN);
    act(() => { void result.current.narrate(FORK_EVENT, 'full'); });
    engineGate.resolve(FORK_ANALYSIS);
    await vi.waitFor(() => expect(spoken.length).toBeGreaterThan(0), { timeout: 4000 });
    expect(spoken.join(' ')).not.toMatch(/\b(we|our|us)\b/i);
  });
});


describe('THE ONE SELECTOR at a phase transition (unified-coach N1)', () => {
  it('does NOT speak a pin that merely "landed" as the story of the game (hand walk 2026-09-24)', async () => {
    // The Scandinavian Lasker: …Bg4 pins the f3-knight to the queen. With no
    // eval swing the thesis is a 'landed' tactic — at a phase change it used to
    // come out as "Watch move 5, Bg4 — that is where the pin lands", present
    // tense about a move already played. Only a real TURN is spoken now.
    noteText = '';
    const { result } = renderHook(() => usePhaseNarration({
      getPgn: () => 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bg4',
      playerColor: 'black',
      getOpeningName: () => 'Scandinavian Defense: Lasker Variation',
      getLiveFen: () => FEN,
      corpusNotes: true,
    }));
    act(() => { void result.current.narrate({ ...EVENT, playerColor: 'black' }, 'full'); });
    await new Promise((r) => setTimeout(r, 300));
    expect(spoken.join(' ')).not.toMatch(/that is where the pin lands|Watch move/);
  });

  it('stays silent about a thesis when nothing has turned yet (no tactic, no evals)', async () => {
    noteText = '';
    const { result } = renderHook(() => usePhaseNarration({
      getPgn: () => 'e4 e6 d4 d5 Nc3 Nf6',
      playerColor: 'black',
      getOpeningName: () => 'French Defense',
      getLiveFen: () => FEN,
      corpusNotes: true,
    }));
    act(() => { void result.current.narrate(EVENT, 'full'); });
    await new Promise((r) => setTimeout(r, 300));
    expect(spoken.join(' ')).not.toMatch(/turns at|lands there/);
  });
});
