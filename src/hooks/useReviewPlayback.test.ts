import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────

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

const auditCalls: { kind: string; summary: string }[] = [];
vi.mock('../services/appAuditor', () => ({
  logAppAudit: vi.fn((entry: { kind: string; summary: string }) => {
    auditCalls.push({ kind: entry.kind, summary: entry.summary });
    return Promise.resolve();
  }),
}));

import { useReviewPlayback } from './useReviewPlayback';
import type { ReviewNarration, ReviewMoveSegment } from '../services/coachFeatureService';

beforeEach(() => {
  speakRecords.length = 0;
  stopCount = 0;
  auditCalls.length = 0;
});

// ── Helpers ───────────────────────────────────────────────────────────────

function makeSegment(overrides: Partial<ReviewMoveSegment> & { ply: number }): ReviewMoveSegment {
  return {
    ply: overrides.ply,
    moveNumber: Math.ceil(overrides.ply / 2),
    san: 'e4',
    playerColor: overrides.ply % 2 === 1 ? 'white' : 'black',
    fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    fenAfter: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    classification: 'good',
    evalBefore: 0,
    evalAfter: 0,
    bestMoveSan: null,
    bestMoveUci: null,
    narration: null,
    ...overrides,
  };
}

function makeNarration(partial: Partial<ReviewNarration> & { segments: ReviewMoveSegment[] }): ReviewNarration {
  return {
    intro: partial.intro ?? 'Opening intro.',
    segments: partial.segments,
    closing: partial.closing ?? null,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('useReviewPlayback', () => {
  it('starts at ply 0 and speaks the intro on mount', async () => {
    const narration = makeNarration({ segments: [makeSegment({ ply: 1, narration: 'Move one.' })] });
    const { result } = renderHook(() => useReviewPlayback({ narration }));
    expect(result.current.currentPly).toBe(0);
    await waitFor(() => expect(speakRecords.length).toBe(1));
    expect(speakRecords[0].text).toBe('Opening intro.');
    expect(result.current.narrationState).toBe('speaking');
  });

  it('goForward advances ply + cancels prior voice + speaks new segment', async () => {
    const narration = makeNarration({
      segments: [
        makeSegment({ ply: 1, narration: 'Move one narration.' }),
        makeSegment({ ply: 2, narration: 'Move two narration.' }),
      ],
    });
    const { result } = renderHook(() => useReviewPlayback({ narration }));
    await waitFor(() => expect(speakRecords.length).toBe(1));
    const stopsBeforeForward = stopCount;

    act(() => {
      result.current.goForward();
    });
    expect(result.current.currentPly).toBe(1);
    // Forward must have cancelled the prior utterance before dispatching new one.
    expect(stopCount).toBeGreaterThan(stopsBeforeForward);
    await waitFor(() => expect(speakRecords.length).toBe(2));
    expect(speakRecords[1].text).toBe('Move one narration.');
  });

  it('goForward on a silent (null narration) ply still advances the board but speaks nothing', async () => {
    const narration = makeNarration({
      segments: [makeSegment({ ply: 1, narration: null })],
    });
    const { result } = renderHook(() => useReviewPlayback({ narration }));
    await waitFor(() => expect(speakRecords.length).toBe(1)); // intro
    act(() => {
      result.current.goForward();
    });
    expect(result.current.currentPly).toBe(1);
    // No new speak record — just the intro + stop. narrationState goes idle.
    expect(speakRecords.length).toBe(1);
    expect(result.current.narrationState).toBe('idle');
  });

  it('goBack decrements ply WITHOUT re-speaking the narration', async () => {
    const narration = makeNarration({
      segments: [
        makeSegment({ ply: 1, narration: 'Move one.' }),
        makeSegment({ ply: 2, narration: 'Move two.' }),
      ],
    });
    const { result } = renderHook(() => useReviewPlayback({ narration }));
    await waitFor(() => expect(speakRecords.length).toBe(1));

    act(() => {
      result.current.goForward(); // ply 1, speaks "Move one."
    });
    await waitFor(() => expect(speakRecords.length).toBe(2));

    const speaksBeforeBack = speakRecords.length;
    act(() => {
      result.current.goBack();
    });
    expect(result.current.currentPly).toBe(0);
    // No new speak on back nav.
    expect(speakRecords.length).toBe(speaksBeforeBack);
    expect(result.current.narrationState).toBe('idle');
  });

  it('togglePausePlay stops the current utterance and then resumes via replay', async () => {
    const narration = makeNarration({
      segments: [makeSegment({ ply: 1, narration: 'Long coach sentence.' })],
    });
    const { result } = renderHook(() => useReviewPlayback({ narration }));
    await waitFor(() => expect(speakRecords.length).toBe(1));

    act(() => {
      result.current.goForward();
    });
    await waitFor(() => expect(speakRecords.length).toBe(2));
    const speaksBefore = speakRecords.length;

    // Pause while speaking.
    act(() => {
      result.current.togglePausePlay();
    });
    expect(result.current.narrationState).toBe('paused');

    // Play resumes → re-speaks the current ply's text from the top.
    act(() => {
      result.current.togglePausePlay();
    });
    expect(speakRecords.length).toBe(speaksBefore + 1);
    expect(speakRecords[speakRecords.length - 1].text).toBe('Long coach sentence.');
  });

  it('goToStart + goToEnd jump correctly', async () => {
    const narration = makeNarration({
      segments: [
        makeSegment({ ply: 1, narration: 'One.' }),
        makeSegment({ ply: 2, narration: 'Two.' }),
        makeSegment({ ply: 3, narration: 'Three.' }),
      ],
    });
    const { result } = renderHook(() => useReviewPlayback({ narration }));
    await waitFor(() => expect(speakRecords.length).toBe(1));

    act(() => {
      result.current.goToEnd();
    });
    expect(result.current.currentPly).toBe(3);

    act(() => {
      result.current.goToStart();
    });
    expect(result.current.currentPly).toBe(0);
  });

  it('currentSegment returns the ply-matched segment, null at ply 0', async () => {
    const seg1 = makeSegment({ ply: 1, narration: 'A' });
    const seg2 = makeSegment({ ply: 2, narration: 'B' });
    const narration = makeNarration({ segments: [seg1, seg2] });
    const { result } = renderHook(() => useReviewPlayback({ narration }));
    expect(result.current.currentSegment).toBeNull();

    act(() => {
      result.current.goForward();
    });
    expect(result.current.currentSegment).toEqual(seg1);

    act(() => {
      result.current.goForward();
    });
    expect(result.current.currentSegment).toEqual(seg2);
  });

  it('audit log fires review-opened once per narration load', async () => {
    const narration = makeNarration({ segments: [makeSegment({ ply: 1, narration: 'x' })] });
    renderHook(() => useReviewPlayback({ narration }));
    await waitFor(() => expect(auditCalls.some((c) => c.kind === 'review-opened')).toBe(true));
    expect(auditCalls.filter((c) => c.kind === 'review-opened')).toHaveLength(1);
  });
});
