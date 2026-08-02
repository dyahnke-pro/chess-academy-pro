/**
 * Regression tests for the speakQueuedForced dead-code bug PLUS the
 * canned welcome-line shape on /coach/teach.
 *
 * Speech-chain regression context (build bb550b3+): production audit
 * showed only the first sentence reaching Polly because sentences 2+
 * were dispatched through `voiceService.speakQueuedForced`, which
 * gates on `WEB_SPEECH_FALLBACK_ENABLED = false` — i.e. silently
 * drops the call. The fix chains every sentence through `speakForced`
 * via `speechChainRef`. These tests lock that behavior by driving a
 * student message and asserting that every streamed sentence reaches
 * speakForced (none through speakQueuedForced).
 *
 * Welcome-line regression context (build 75791d7+): the kickoff used
 * to fire an LLM call to generate a greeting; now it speaks a canned
 * "Welcome to my classroom — what would you like to learn today?"
 * directly via Polly. The student speaks first; the LLM is only
 * invoked once they reply.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { render, waitFor, fireEvent, screen } from '../../test/utils';
import { CoachTeachPage } from './CoachTeachPage';
import { stockfishEngine } from '../../services/stockfishEngine';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import { db } from '../../db/schema';
import { COACH_GREETINGS } from '../../data/coachGreetings';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSpeakForced = vi.fn().mockResolvedValue(undefined);
const mockSpeakQueuedForced = vi.fn();
const mockStop = vi.fn();
const mockSpeak = vi.fn().mockResolvedValue(undefined);

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speakForced: (text: string) => mockSpeakForced(text),
    // CoachTeachPage's chain uses the Polly-only variant (no Web
    // Speech fallback). Both spies count as "Polly path" for the
    // regression assertion: every sentence reaches Polly, none
    // get dropped to the dead speakQueuedForced.
    speakForcedPollyOnly: (text: string) => mockSpeakForced(text),
    speakQueuedForced: (text: string) => mockSpeakQueuedForced(text),
    speak: (text: string) => mockSpeak(text),
    stop: () => mockStop(),
    warmup: vi.fn().mockResolvedValue(undefined),
  },
}));

// Partial mock: only `coachService.ask` is stubbed. The question-intent
// detectors (isProgressQuestion, isStatsQuestion, …) are pure regex
// re-exports CoachTeachPage's fuzzy-skip guard imports from here — keep
// the REAL ones so the guard behaves correctly (a bare `{ ask }` mock
// left them undefined and crashed the send path).
vi.mock('../../coach/coachService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../coach/coachService')>();
  return {
    ...actual,
    coachService: {
      ask: vi.fn(),
    },
  };
});

vi.mock('../../services/gameAnalysisService', () => ({
  analyzeRecentGames: vi.fn().mockResolvedValue(0),
  gameNeedsAnalysis: vi.fn().mockReturnValue(false),
}));

// The page now ponders in the background (useEnginePonder) + reads the engine
// directly; stub the engine so tests don't spin up a real Stockfish worker.
vi.mock('../../services/stockfishEngine', () => {
  const analysis = {
    bestMove: 'e2e4', evaluation: 0, isMate: false, mateIn: null,
    depth: 12, topLines: [], nodesPerSecond: 0,
  };
  return {
    stockfishEngine: {
      analyzePosition: vi.fn().mockResolvedValue(analysis),
      analyzeWithBudget: vi.fn().mockResolvedValue(analysis),
      isBusy: vi.fn(() => false),
      newGame: vi.fn(),
    },
    resolveWorkerUrl: vi.fn(() => ({ url: '', variant: 'single', reason: 'test', workerType: 'classic' })),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

import { coachService } from '../../coach/coachService';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CoachTeachPage — Polly dispatch (regression for speakQueuedForced bug)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
    // ChatInput gates sends on AI data-sharing consent (Apple 5.1.1);
    // grant it so the send actually reaches the coach in the test.
    useAppStore.getState().setActiveProfile(buildUserProfile({ name: 'Player', aiDataConsent: 'granted' }));
    mockSpeakForced.mockResolvedValue(undefined);
  });

  /** Drive a student message through the chat input. Used by every
   *  test below to invoke the LLM — kickoff is now a canned greeting
   *  with no LLM call, so streaming has to be triggered by user input. */
  async function sendStudentMessage(text: string): Promise<void> {
    const input = await screen.findByTestId('chat-text-input');
    fireEvent.change(input, { target: { value: text } });
    fireEvent.submit(input.closest('form')!);
  }

  it('speaks a rotating greeting on mount via speakForced (no LLM call) + shows suggested-question chips', async () => {
    vi.mocked(coachService.ask).mockResolvedValue({ text: '', toolCallIds: [], dispatchedToolNames: [], provider: 'anthropic' });
    render(<CoachTeachPage />);

    // The greeting is now one of the rotating set (David 2026-07-04), not the
    // static "welcome to my classroom" line.
    await waitFor(() => {
      const spoken = mockSpeakForced.mock.calls.map((c) => c[0] as string);
      expect(spoken.some((s) => COACH_GREETINGS.includes(s))).toBe(true);
    }, { timeout: 4000 });

    // Suggested-question pickers render so the student sees what they can ask.
    await waitFor(() => {
      expect(screen.getByTestId('coach-choice-chips')).toBeInTheDocument();
      expect(screen.getByTestId('coach-choice-chip-0')).toBeInTheDocument();
    }, { timeout: 4000 });

    // Student speaks first now — kickoff itself never invokes the brain.
    expect(coachService.ask).not.toHaveBeenCalled();
    expect(mockSpeakQueuedForced).not.toHaveBeenCalled();
  });

  it('speaks the [VOICE: ...] marker contents AND shows that same text in chat (text == narration)', async () => {
    // Brain emits a VOICE summary up-front + long teaching text below.
    // Voice channel speaks the marker contents only — never the long
    // chat-only prose. And the chat bubble shows that SAME summary, so
    // the student reads exactly what the voice says (David 2026-06-11:
    // "i want the text to match the narration"). The long prose that
    // streams after the marker drives only the board arrows, never a
    // divergent transcript.
    const voiceSummary = "e4 frees the bishop and queen. I'll mirror with e5 — symmetric center, both sides develop knights and castle short.";
    const longChat = "Vienna Game proper kicks in once white plays Nc3 — knight to c3 supports a future d4 push and eyes the d5/f5 squares. Black's main responses are Nf6 mirroring development or Nc6 with a more positional setup. Master games show ~55% white scoring at club level, dropping to balance at master strength.";
    const fullText = `[VOICE: ${voiceSummary}] ${longChat}`;

    vi.mocked(coachService.ask).mockImplementation(async (_input, options) => {
      options?.onChunk?.(fullText);
      return { text: fullText, toolCallIds: [], dispatchedToolNames: [], provider: 'anthropic' };
    });

    render(<CoachTeachPage />);
    // NB: ask phrased as a Q so the surface-level walkthrough router
    // (which intercepts "teach me / walk me through / show me [opening]")
    // doesn't bypass the brain — this test exercises the brain path.
    await sendStudentMessage('Why does white play 2.Nc3 in this line?');

    await waitFor(() => {
      const spoken = mockSpeakForced.mock.calls.map((c) => c[0] as string);
      // The VOICE summary reaches Polly.
      expect(spoken.some((s) => s.includes('symmetric center'))).toBe(true);
    }, { timeout: 4000 });

    // The long chat-only prose did NOT reach Polly. Match on a
    // distinctive phrase that only appears in the chat-side text.
    const allSpoken = mockSpeakForced.mock.calls.map((c) => c[0] as string).join(' || ');
    expect(allSpoken).not.toContain('Master games show');
    expect(allSpoken).not.toContain('club level');
    expect(mockSpeakQueuedForced).not.toHaveBeenCalled();

    // text == narration: the chat bubble shows the SAME summary the voice
    // spoke, and does NOT show the long teaching prose.
    expect(await screen.findByText(/symmetric center/)).toBeInTheDocument();
    expect(screen.queryByText(/Master games show/)).not.toBeInTheDocument();
  });

  it('speaks the full short reply when the brain omits the [VOICE:] marker', async () => {
    // Defensive fallback (David 2026-07-04 voice-truncation fix): if the
    // brain forgets to wrap its voice summary, the surface now speaks the
    // FULL reply when it's short (≤600 chars) so the student hears the
    // whole answer — not just the first sentence, which used to clip the
    // grounded numbers off (the "5 master-level games" was going unspoken).
    const fullText = 'Pulling the Vienna explorer data right now. The position has 5 master-level games on this exact line.';

    vi.mocked(coachService.ask).mockImplementation(async (_input, options) => {
      options?.onChunk?.(fullText);
      return { text: fullText, toolCallIds: [], dispatchedToolNames: [], provider: 'anthropic' };
    });

    render(<CoachTeachPage />);
    // Non-routable ask (doesn't match the surface-level walkthrough
    // router) so this test exercises the brain path.
    await sendStudentMessage('What does Stockfish say about this position?');

    await waitFor(() => {
      const spoken = mockSpeakForced.mock.calls.map((c) => c[0] as string);
      expect(spoken.some((s) => s.includes('Pulling the Vienna explorer data'))).toBe(true);
    }, { timeout: 4000 });

    // The full reply is spoken under the short-fallback — including the
    // second sentence's grounded stat that the first-sentence-only
    // fallback used to drop.
    const allSpoken = mockSpeakForced.mock.calls.map((c) => c[0] as string).join(' || ');
    expect(allSpoken).toContain('5 master-level games');
    expect(mockSpeakQueuedForced).not.toHaveBeenCalled();
  });

  it('routes a masterclass-led ask to the in-place walkthrough WITHOUT calling the brain (build 2ab2726 audit fix)', async () => {
    // Brain audit (build 2ab2726) showed the LLM hallucinating that
    // it had called start_walkthrough_for_opening — its [VOICE:]
    // marker said "the walkthrough is queued but keeps hitting a
    // dead loop" — while actually chaining 3× set_board_position
    // calls. The walkthrough never fired. Fix: surface-level
    // pattern-match this kind of ask and call walkthrough.start()
    // directly, never invoking the brain.
    //
    // Uses the ITALIAN, not the Vienna (2026-08-01). Notes became the primary
    // source for lessons, so an opening the farmed corpora teach well now takes
    // the generated path on purpose and DOES call the brain — the Vienna has 3
    // note-covered plies and flipped. The Italian has 2, below the floor, so it
    // still leads with the masterclass and is the right subject for the
    // no-brain contract this test exists to protect.
    render(<CoachTeachPage />);
    await sendStudentMessage('Teach me the Italian.');

    // The brain was NOT invoked at all — surface short-circuited.
    expect(coachService.ask).not.toHaveBeenCalled();
    // The user's ask AND the canned acknowledgement both rendered
    // in the transcript so the conversation is honest.
    await waitFor(() => {
      expect(screen.getByText("Teach me the Italian.")).toBeInTheDocument();
      expect(screen.getByText(/let's walk through the Italian Game/i)).toBeInTheDocument();
    });
  });

  it('does NOT set providerOverride at the surface (let the spine pick + fall back)', async () => {
    // Test history: this used to assert `providerOverride.name === 'anthropic'`
    // because Learn-with-Coach pinned Anthropic. CLAUDE.md 2026-05-14
    // changed the policy — Anthropic is the spine's default primary
    // and the coachApi layer auto-falls-back to DeepSeek on 401/429.
    // Surfaces must NOT pin either provider; pinning defeats the
    // auto-fallback. This test enforces the policy at the surface
    // contract level: regardless of which provider ends up serving the
    // call, /coach/teach should hand the spine a clean options bag
    // with no providerOverride.
    vi.mocked(coachService.ask).mockImplementation(async (_input, options) => {
      options?.onChunk?.('[VOICE: Pulling the position.] Detailed analysis follows.');
      return {
        text: '[VOICE: Pulling the position.] Detailed analysis follows.',
        toolCallIds: [],
        dispatchedToolNames: [],
        provider: 'anthropic',
      };
    });

    render(<CoachTeachPage />);
    await sendStudentMessage('Why is white better in this position?');

    await waitFor(() => {
      expect(coachService.ask).toHaveBeenCalled();
    }, { timeout: 4000 });

    for (const call of vi.mocked(coachService.ask).mock.calls) {
      const opts = call[1] as { providerOverride?: { name: string } } | undefined;
      expect(opts?.providerOverride).toBeUndefined();
    }
  });

  it('auto-teaches a NON-built opening arriving via ?teach=<name>&auto=1 (no second ask)', async () => {
    // OpeningDetailPage routes a non-built opening here so the coach teaches it
    // live (David 2026-07-16). The kickoff must announce it will teach the line
    // itself and auto-launch — NOT show the opt-in "Ready to start?" prompt.
    vi.mocked(coachService.ask).mockResolvedValue({ text: '', toolCallIds: [], dispatchedToolNames: [], provider: 'anthropic' });
    rtlRender(
      <MemoryRouter initialEntries={['/coach/teach?teach=Grob%20Opening&auto=1']}>
        <MotionConfig transition={{ duration: 0 }}>
          <CoachTeachPage />
        </MotionConfig>
      </MemoryRouter>,
    );

    // The "we don't have a masterclass, I'll teach it myself" line renders in
    // the transcript AND is spoken through Polly.
    expect(
      await screen.findByText(/don't have a hand-built masterclass for the Grob Opening/i),
    ).toBeInTheDocument();
    await waitFor(() => {
      const spoken = mockSpeakForced.mock.calls.map((c) => c[0] as string);
      expect(spoken.some((s) => /teach it to you myself/i.test(s))).toBe(true);
    }, { timeout: 4000 });
  });

  it('Hint button grounds on Stockfish (best move), not the LLM', async () => {
    render(<CoachTeachPage />);
    const hintBtn = await screen.findByTestId('teach-hint-btn');
    // Ignore the mount-time position-grounding calls (depth 12); we want to
    // prove the HINT itself queries the engine.
    vi.mocked(stockfishEngine.analyzePosition).mockClear();
    fireEvent.click(hintBtn);
    await waitFor(() => {
      const calls = vi.mocked(stockfishEngine.analyzePosition).mock.calls;
      // The hint requests depth 15 — a distinct signature from grounding.
      expect(calls.some((c) => c[1] === 15)).toBe(true);
    });
    // No LLM call is made for the hint — the engine decides the move (G0/G3).
    expect(coachService.ask).not.toHaveBeenCalled();
  });
});
