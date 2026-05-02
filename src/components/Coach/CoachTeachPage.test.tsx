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
import { render, waitFor, fireEvent, screen } from '../../test/utils';
import { CoachTeachPage } from './CoachTeachPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import { db } from '../../db/schema';

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

vi.mock('../../coach/coachService', () => ({
  coachService: {
    ask: vi.fn(),
  },
}));

vi.mock('../../services/gameAnalysisService', () => ({
  analyzeRecentGames: vi.fn().mockResolvedValue(0),
  gameNeedsAnalysis: vi.fn().mockReturnValue(false),
}));

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
    useAppStore.getState().setActiveProfile(buildUserProfile({ name: 'Player' }));
    mockSpeakForced.mockResolvedValue(undefined);
  });

  /** Drive a student message through the chat input. Used by every
   *  test below to invoke the LLM — kickoff is now a canned greeting
   *  with no LLM call, so streaming has to be triggered by user input. */
  async function sendStudentMessage(text: string): Promise<void> {
    const input = await screen.findByTestId('chat-text-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: text } });
    fireEvent.submit(input.closest('form')!);
  }

  it('speaks the canned welcome line on mount via speakForced (no LLM call)', async () => {
    vi.mocked(coachService.ask).mockResolvedValue({ text: '', toolCallIds: [], provider: 'anthropic' });
    render(<CoachTeachPage />);

    await waitFor(() => {
      const spoken = mockSpeakForced.mock.calls.map((c) => c[0] as string);
      expect(spoken.some((s) => s.toLowerCase().includes('welcome to my classroom'))).toBe(true);
    }, { timeout: 4000 });

    // Student speaks first now — kickoff itself never invokes the brain.
    expect(coachService.ask).not.toHaveBeenCalled();
    expect(mockSpeakQueuedForced).not.toHaveBeenCalled();
  });

  it('chains every streamed sentence through speakForced (never speakQueuedForced)', async () => {
    const fullText =
      "Let me pull up your most common Vienna position and get the engine's read right now. " +
      'Five Vienna games, five wins — from both colors. ' +
      "That's a real pattern, and it tells me you genuinely understand this opening.";

    vi.mocked(coachService.ask).mockImplementation(async (_input, options) => {
      options?.onChunk?.(fullText);
      return { text: fullText, toolCallIds: [], provider: 'deepseek' };
    });

    render(<CoachTeachPage />);
    await sendStudentMessage('Teach me the Vienna.');

    await waitFor(() => {
      // 3 streamed sentences + 1 welcome line = 4 minimum.
      expect(mockSpeakForced.mock.calls.length).toBeGreaterThanOrEqual(4);
    }, { timeout: 4000 });

    const spoken = mockSpeakForced.mock.calls.map((c) => c[0] as string);
    expect(spoken.some((s) => s.includes('Vienna position'))).toBe(true);
    expect(spoken.some((s) => s.includes('Five Vienna games'))).toBe(true);
    expect(spoken.some((s) => s.includes('genuinely understand'))).toBe(true);
    expect(mockSpeakQueuedForced).not.toHaveBeenCalled();
  });

  it('forces the Anthropic provider for every coachService.ask call (Learn-only routing)', async () => {
    vi.mocked(coachService.ask).mockImplementation(async (_input, options) => {
      options?.onChunk?.('Pulling the position.');
      return { text: 'Pulling the position.', toolCallIds: [], provider: 'anthropic' };
    });

    render(<CoachTeachPage />);
    await sendStudentMessage('Show me a Vienna position.');

    await waitFor(() => {
      expect(coachService.ask).toHaveBeenCalled();
    }, { timeout: 4000 });

    for (const call of vi.mocked(coachService.ask).mock.calls) {
      const opts = call[1] as { providerOverride?: { name: string } } | undefined;
      expect(opts?.providerOverride?.name).toBe('anthropic');
    }
  });

  it('flushes the trailing fragment through speakForced when the response ends mid-sentence-buffer', async () => {
    const head = "Let me pull up the position. ";
    const tail = 'And here is what I see';

    vi.mocked(coachService.ask).mockImplementation(async (_input, options) => {
      options?.onChunk?.(head + tail);
      return { text: head + tail, toolCallIds: [], provider: 'deepseek' };
    });

    render(<CoachTeachPage />);
    await sendStudentMessage('Walk me through the position.');

    await waitFor(() => {
      const spoken = mockSpeakForced.mock.calls.map((c) => c[0] as string);
      expect(spoken.some((s) => s.includes('Let me pull up the position'))).toBe(true);
      expect(spoken.some((s) => s.includes('here is what I see'))).toBe(true);
    }, { timeout: 4000 });

    expect(mockSpeakQueuedForced).not.toHaveBeenCalled();
  });
});
