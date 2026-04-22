import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────

// Controllable speak promise so we can assert cancellation during playback.
type SpeakRecord = { text: string; resolve: () => void };
const speakRecords: SpeakRecord[] = [];
let stopCount = 0;

vi.mock('../services/voiceService', () => ({
  voiceService: {
    speakForced: vi.fn((text: string) => {
      return new Promise<void>((resolve) => {
        speakRecords.push({ text, resolve });
      });
    }),
    stop: vi.fn(() => {
      stopCount++;
    }),
  },
}));

vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({
      bestMove: 'e2e4',
      evaluation: 0,
      isMate: false,
      mateIn: null,
      depth: 16,
      topLines: [],
      nodesPerSecond: 0,
    }),
  },
}));

vi.mock('../db/schema', () => ({
  db: {
    profiles: {
      get: vi.fn().mockResolvedValue({ currentRating: 1200 }),
    },
  },
}));

type StreamCb = (chunk: string) => void;
const chatCalls: { addition: string; task: string; onStream?: StreamCb }[] = [];
let chatResolver: ((text: string) => void) | null = null;

vi.mock('../services/coachApi', () => ({
  getCoachChatResponse: vi.fn(
    (
      _messages: unknown,
      systemPromptAddition: string,
      onStream?: StreamCb,
      task: string = 'chat_response',
    ) => {
      chatCalls.push({ addition: systemPromptAddition, task, onStream });
      return new Promise<string>((resolve) => {
        chatResolver = resolve;
      });
    },
  ),
}));

import { usePositionNarration } from './usePositionNarration';
import { POSITION_NARRATION_ADDITION } from '../services/coachPrompts';

// ── Helpers ───────────────────────────────────────────────────────────────

function defaultArgs(): Parameters<typeof usePositionNarration>[0] {
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    pgn: '1. e4',
    moveNumber: 1,
    playerColor: 'white',
    openingName: null,
  };
}

beforeEach(() => {
  speakRecords.length = 0;
  stopCount = 0;
  chatCalls.length = 0;
  chatResolver = null;
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('usePositionNarration', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));
    expect(result.current.isNarrating).toBe(false);
    expect(result.current.currentText).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('calls the coach API with POSITION_NARRATION_ADDITION and position_analysis_chat task', async () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));

    act(() => {
      void result.current.narrate();
    });

    await waitFor(() => expect(chatCalls.length).toBe(1));
    expect(chatCalls[0].addition).toBe(POSITION_NARRATION_ADDITION);
    expect(chatCalls[0].task).toBe('position_analysis_chat');
    expect(result.current.isNarrating).toBe(true);
  });

  it('streams chunks into currentText as they arrive', async () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));

    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(chatCalls.length).toBe(1));

    const onStream = chatCalls[0].onStream;
    expect(onStream).toBeDefined();

    act(() => {
      onStream?.('Okay, we are out of book.');
    });
    expect(result.current.currentText).toBe('Okay, we are out of book.');

    act(() => {
      onStream?.(' I have pressure on the c-file.');
    });
    expect(result.current.currentText).toBe(
      'Okay, we are out of book. I have pressure on the c-file.',
    );
  });

  it('speaks the full response via voiceService.speakForced when the stream completes', async () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));

    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(chatCalls.length).toBe(1));

    const fullText = 'Okay, we are out of book. Tension on c-file.';
    act(() => {
      chatResolver?.(fullText);
    });

    await waitFor(() => expect(speakRecords.length).toBe(1));
    expect(speakRecords[0].text).toBe(fullText);
    // Still narrating until speech resolves
    expect(result.current.isNarrating).toBe(true);

    act(() => {
      speakRecords[0].resolve();
    });
    await waitFor(() => expect(result.current.isNarrating).toBe(false));
  });

  it('calling narrate() again mid-flight stops prior speech and starts a fresh turn', async () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));

    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(chatCalls.length).toBe(1));

    act(() => {
      chatResolver?.('First narration text.');
    });
    await waitFor(() => expect(speakRecords.length).toBe(1));

    // Re-tap mid-speech — should stop audio and start over.
    act(() => {
      void result.current.narrate();
    });

    expect(stopCount).toBeGreaterThanOrEqual(2); // once at start, once on restart
    await waitFor(() => expect(chatCalls.length).toBe(2));
    // Stale text cleared by the restart.
    expect(result.current.currentText).toBe('');
  });

  it('cancel() stops speech and clears state', async () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));

    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(chatCalls.length).toBe(1));
    act(() => {
      chatCalls[0].onStream?.('Partial text.');
    });
    expect(result.current.currentText).toBe('Partial text.');

    act(() => {
      result.current.cancel();
    });

    expect(stopCount).toBeGreaterThanOrEqual(1);
    expect(result.current.isNarrating).toBe(false);
    expect(result.current.currentText).toBe('');
  });
});
