/**
 * Regression test for the speakQueuedForced dead-code bug. Symptom in
 * production audit (build bb550b3+): the kickoff lesson voiced only
 * the first sentence ("Let me pull up your most common Vienna
 * position…") and the rest of the 1100+-char response was silently
 * dropped on Polly. Root cause: `voiceService.speakQueuedForced`
 * gates on `WEB_SPEECH_FALLBACK_ENABLED = false`, so it logs the
 * invocation and does NOTHING. The kickoff dispatcher was using
 * speakQueuedForced for sentences 2+, so they never reached Polly.
 *
 * The fix chains every sentence through `speakForced` via a
 * `speechChainRef` so each call awaits the previous one's audio
 * before starting. This test locks that chained-Polly behavior:
 * given a streamed multi-sentence response, EVERY sentence reaches
 * `voiceService.speakForced` (none through speakQueuedForced).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '../../test/utils';
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

  it('chains every streamed sentence through speakForced (never speakQueuedForced)', async () => {
    // Simulate the LLM streaming a multi-sentence response. The
    // CoachTeachPage's onChunk handler should detect each sentence
    // boundary and dispatch each one through speakForced — chained
    // so they play in order — never through the dead
    // speakQueuedForced path.
    const fullText =
      "Let me pull up your most common Vienna position and get the engine's read right now. " +
      'Five Vienna games, five wins — from both colors. ' +
      "That's a real pattern, and it tells me you genuinely understand this opening.";

    vi.mocked(coachService.ask).mockImplementation(async (_input, options) => {
      // Stream the full response in one chunk — exactly what DeepSeek
      // does for short responses. The dispatcher must still split
      // and queue every sentence.
      options?.onChunk?.(fullText);
      return { text: fullText, toolCallIds: [], provider: 'deepseek' };
    });

    render(<CoachTeachPage />);

    // Kickoff fires automatically on mount. Wait for all three
    // sentences to be dispatched through speakForced.
    await waitFor(() => {
      expect(mockSpeakForced.mock.calls.length).toBeGreaterThanOrEqual(3);
    }, { timeout: 4000 });

    const spoken = mockSpeakForced.mock.calls.map((c) => c[0] as string);
    expect(spoken.some((s) => s.includes('Vienna position'))).toBe(true);
    expect(spoken.some((s) => s.includes('Five Vienna games'))).toBe(true);
    expect(spoken.some((s) => s.includes('genuinely understand'))).toBe(true);

    // The dead speakQueuedForced path must NEVER be touched.
    expect(mockSpeakQueuedForced).not.toHaveBeenCalled();
  });

  it('flushes the trailing fragment through speakForced when the response ends mid-sentence-buffer', async () => {
    // Final ".finally" tail: a chunk arriving without a sentence
    // terminator must still be spoken on flush.
    const head = "Let me pull up the position. ";
    const tail = 'And here is what I see';

    vi.mocked(coachService.ask).mockImplementation(async (_input, options) => {
      options?.onChunk?.(head + tail);
      return { text: head + tail, toolCallIds: [], provider: 'deepseek' };
    });

    render(<CoachTeachPage />);

    await waitFor(() => {
      const spoken = mockSpeakForced.mock.calls.map((c) => c[0] as string);
      expect(spoken.some((s) => s.includes('Let me pull up the position'))).toBe(true);
      expect(spoken.some((s) => s.includes('here is what I see'))).toBe(true);
    }, { timeout: 4000 });

    expect(mockSpeakQueuedForced).not.toHaveBeenCalled();
  });
});
