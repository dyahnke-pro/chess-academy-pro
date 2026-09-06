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

  it('lands the deep-link initialPly when narration loads (instead of snapping to 0)', async () => {
    // /coach/review/:id?move=5 → initialPly 5. Regression: the deep link
    // only seeded the legacy reviewState, and the narration-load reset
    // snapped the walk header back to ply 0 (audit 2026-06-27).
    const narration = makeNarration({
      segments: [makeSegment({ ply: 1 }), makeSegment({ ply: 5, narration: 'Move five.' })],
    });
    const { result } = renderHook(() =>
      useReviewPlayback({ narration, totalPlies: 33, initialPly: 5 }),
    );
    await waitFor(() => expect(result.current.currentPly).toBe(5));
  });

  it('keeps the deep-link ply when narration arrives AFTER the moves (the prod ordering)', async () => {
    // The bug that shipped: on a deep-linked mount, the walk header only
    // renders once narration loads, and narration arrives asynchronously
    // AFTER the PGN is parsed (moves known first). The first fix applied the
    // ply while narration was null, marked it applied, then the narration
    // reset snapped it back to 0. This rerender reproduces that exact order.
    const narration = makeNarration({ segments: [makeSegment({ ply: 5, narration: 'Move five.' })] });
    const { result, rerender } = renderHook(
      ({ n }) => useReviewPlayback({ narration: n, totalPlies: 33, initialPly: 5 }),
      { initialProps: { n: null as ReviewNarration | null } },
    );
    // Moves known, narration still pending → the ply must already be landed.
    await waitFor(() => expect(result.current.currentPly).toBe(5));
    // Narration now arrives — must NOT snap back to 0 (the prod regression).
    rerender({ n: narration });
    // Let all narration-load effects flush, then assert the ply held.
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.currentPly).toBe(5);
  });

  it('clamps an out-of-range initialPly to the game length', async () => {
    const narration = makeNarration({ segments: [makeSegment({ ply: 1 })] });
    const { result } = renderHook(() =>
      useReviewPlayback({ narration, totalPlies: 8, initialPly: 9999 }),
    );
    await waitFor(() => expect(result.current.currentPly).toBe(8));
  });

  it('lands the deep-link initialPly even when narration never arrives', async () => {
    // Narration generation failed/pending — the header must still reflect
    // ?move=N once the ply count is known.
    const { result } = renderHook(() =>
      useReviewPlayback({ narration: null, totalPlies: 20, initialPly: 7 }),
    );
    await waitFor(() => expect(result.current.currentPly).toBe(7));
  });

  it('does not override user navigation after the deep-link landed', async () => {
    const narration = makeNarration({
      segments: [makeSegment({ ply: 1 }), makeSegment({ ply: 2 }), makeSegment({ ply: 5 })],
    });
    const { result } = renderHook(() =>
      useReviewPlayback({ narration, totalPlies: 33, initialPly: 5 }),
    );
    await waitFor(() => expect(result.current.currentPly).toBe(5));
    act(() => { result.current.goForward(); });
    expect(result.current.currentPly).toBe(6);
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

  // WO-REVIEW-02a-FIX regression: nav must walk the whole game even
  // when segments are truncated (LLM hit max_tokens or parse failed).
  it('totalPlies is the authoritative nav ceiling — walks past truncated segments', async () => {
    const narration = makeNarration({
      segments: [
        makeSegment({ ply: 1, narration: 'One.' }),
        makeSegment({ ply: 2, narration: 'Two.' }),
      ],
    });
    const { result } = renderHook(() =>
      useReviewPlayback({ narration, totalPlies: 10 }),
    );
    await waitFor(() => expect(speakRecords.length).toBe(1)); // intro

    // Walk all the way to ply 10 — should never throw, even for plies
    // 3–10 where no segment exists.
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.goForward();
      });
    }
    expect(result.current.currentPly).toBe(10);

    // goForward once more: clamped to totalPlies + 1 (closing slot).
    act(() => {
      result.current.goForward();
    });
    expect(result.current.currentPly).toBeLessThanOrEqual(11);
  });

  it('silent advance (ply past segments.length) speaks nothing and does not crash', async () => {
    const narration = makeNarration({
      segments: [makeSegment({ ply: 1, narration: 'Only move narrated.' })],
    });
    const { result } = renderHook(() =>
      useReviewPlayback({ narration, totalPlies: 5 }),
    );
    await waitFor(() => expect(speakRecords.length).toBe(1)); // intro

    act(() => {
      result.current.goForward(); // ply 1: has narration
    });
    await waitFor(() => expect(speakRecords.length).toBe(2));

    const speaksBefore = speakRecords.length;
    act(() => {
      result.current.goForward(); // ply 2: no segment → silent
    });
    expect(result.current.currentPly).toBe(2);
    expect(speakRecords.length).toBe(speaksBefore);
    expect(result.current.currentSegment).toBeNull();
    expect(result.current.narrationState).toBe('idle');
  });
});

// ── AUTO-ADVANCE (David 2026-09-05: "have the walkthrough play itself … waits
// for the narrations to finish, maybe 0.5 second pause, then auto progress") ──
describe('useReviewPlayback — auto-advance', () => {
  const narr = () => makeNarration({
    intro: 'Intro.',
    segments: [
      makeSegment({ ply: 1, narration: 'First move, fine.' }),
      makeSegment({ ply: 2, narration: 'A slip here.', classification: 'mistake' }),
      makeSegment({ ply: 3, narration: null }),
      makeSegment({ ply: 4, narration: 'Last.' }),
    ],
  });

  it('is OFF until play() — the intro speaks but the walk does not move on its own', async () => {
    vi.useFakeTimers();
    try {
      const n = narr();
      const { result } = renderHook(() => useReviewPlayback({ narration: n, totalPlies: 4 }));
      expect(result.current.isAutoPlaying).toBe(false);
      expect(speakRecords).toHaveLength(1); // the intro
      await act(async () => { speakRecords[0].resolve(); });
      await act(async () => { vi.advanceTimersByTime(5000); });
      expect(result.current.currentPly).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it('after play(): narration resolves → 0.5s pause → the parent forward handler fires', async () => {
    vi.useFakeTimers();
    try {
      const onAutoAdvance = vi.fn();
      const n = narr();
      const { result } = renderHook(() => useReviewPlayback({ narration: n, totalPlies: 4, onAutoAdvance }));
      await act(async () => { speakRecords[0].resolve(); });
      await act(async () => { result.current.play(); });
      expect(result.current.isAutoPlaying).toBe(true);
      // play() re-speaks the current ply (the intro); it resolves…
      const intro = speakRecords[speakRecords.length - 1];
      await act(async () => { intro.resolve(); });
      // …not yet (the pause is still running)…
      await act(async () => { vi.advanceTimersByTime(400); });
      expect(onAutoAdvance).not.toHaveBeenCalled();
      // …and at 500ms the walk advances through the parent's forward.
      await act(async () => { vi.advanceTimersByTime(150); });
      expect(onAutoAdvance).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); }
  });

  it('holds 1.5s after a FLAGGED ply so the arrow is seen, 0.8s on a silent ply', async () => {
    vi.useFakeTimers();
    try {
      const onAutoAdvance = vi.fn();
      const n = narr();
      const { result } = renderHook(() => useReviewPlayback({ narration: n, totalPlies: 4, onAutoAdvance }));
      await act(async () => { speakRecords[0].resolve(); });
      await act(async () => { result.current.play(); });
      await act(async () => { speakRecords[speakRecords.length - 1].resolve(); });
      await act(async () => { vi.advanceTimersByTime(500); });
      // Simulate the parent stepping to ply 2 (the mistake) with auto still on.
      await act(async () => { result.current.goForward(); result.current.goForward(); });
      expect(result.current.currentPly).toBe(2);
      onAutoAdvance.mockClear();
      await act(async () => { speakRecords[speakRecords.length - 1].resolve(); });
      await act(async () => { vi.advanceTimersByTime(1400); });
      expect(onAutoAdvance).not.toHaveBeenCalled();
      await act(async () => { vi.advanceTimersByTime(150); });
      expect(onAutoAdvance).toHaveBeenCalledTimes(1);
      // Silent ply 3: nothing to speak → a fixed hold, then advance.
      onAutoAdvance.mockClear();
      await act(async () => { result.current.goForward(); });
      expect(result.current.currentPly).toBe(3);
      await act(async () => { vi.advanceTimersByTime(700); });
      expect(onAutoAdvance).not.toHaveBeenCalled();
      await act(async () => { vi.advanceTimersByTime(150); });
      expect(onAutoAdvance).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); }
  });

  it('a user intervention PAUSES it, and only play() restarts it', async () => {
    vi.useFakeTimers();
    try {
      const onAutoAdvance = vi.fn();
      const n = narr();
      const { result } = renderHook(() => useReviewPlayback({ narration: n, totalPlies: 4, onAutoAdvance }));
      await act(async () => { speakRecords[0].resolve(); });
      await act(async () => { result.current.play(); });
      await act(async () => { result.current.goForward(); });
      // Back = the student stepping in.
      await act(async () => { result.current.goBack(); });
      expect(result.current.isAutoPlaying).toBe(false);
      await act(async () => { speakRecords[speakRecords.length - 1].resolve(); vi.advanceTimersByTime(5000); });
      expect(onAutoAdvance).not.toHaveBeenCalled();
      // A manual forward tap keeps it paused (single step); a jump too.
      await act(async () => { result.current.goForward({ manual: true }); });
      expect(result.current.isAutoPlaying).toBe(false);
      await act(async () => { result.current.jumpToPly(1); });
      expect(result.current.isAutoPlaying).toBe(false);
      // A next-key-moment skip keeps it playing.
      await act(async () => { result.current.play(); });
      await act(async () => { result.current.jumpToPly(2, { keepAuto: true }); });
      expect(result.current.isAutoPlaying).toBe(true);
      // Pause stops the voice mid-sentence.
      const before = stopCount;
      await act(async () => { result.current.pause(); });
      expect(result.current.isAutoPlaying).toBe(false);
      expect(stopCount).toBeGreaterThan(before);
    } finally { vi.useRealTimers(); }
  });

  it('stops at the end of the game — never advances past the closing', async () => {
    vi.useFakeTimers();
    try {
      const onAutoAdvance = vi.fn();
      const n = makeNarration({ segments: [makeSegment({ ply: 1, narration: 'Only.' })], closing: 'Done.' });
      const { result } = renderHook(() => useReviewPlayback({ narration: n, totalPlies: 1, onAutoAdvance }));
      await act(async () => { speakRecords[0].resolve(); });
      await act(async () => { result.current.play(); });
      await act(async () => { result.current.goForward(); });
      await act(async () => { speakRecords[speakRecords.length - 1].resolve(); vi.advanceTimersByTime(600); });
      // Parent would step to the closing (ply 2 = lastPly+1):
      await act(async () => { result.current.goForward(); });
      expect(result.current.currentPly).toBe(2);
      onAutoAdvance.mockClear();
      await act(async () => { speakRecords[speakRecords.length - 1].resolve(); vi.advanceTimersByTime(5000); });
      expect(onAutoAdvance).not.toHaveBeenCalled();
      expect(result.current.isAutoPlaying).toBe(false);
    } finally { vi.useRealTimers(); }
  });
});
