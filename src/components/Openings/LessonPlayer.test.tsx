import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { Chess } from 'chess.js';
import type { LessonScript } from '../../types';

// Capture every `fen` the board is asked to show, in order.
const fenCalls: string[] = [];
vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: ({ fen }: { fen: string }) => {
    fenCalls.push(fen);
    return null;
  },
}));

// Strip the scaffold/chat/voice machinery — we only care about board fens.
vi.mock('./LessonScaffold', () => ({
  LessonScaffold: ({ board }: { board: React.ReactNode }) => board,
}));
vi.mock('../../services/voiceService', () => ({
  voiceService: { speakLecture: vi.fn(() => Promise.resolve()) },
}));
vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({ settings: { voiceEnabled: false } }),
}));

// Drive the hook deterministically: on mount it enters beat 0 (the autoplay
// entry the real hook performs via its [currentStep] effect), which fires
// LessonPlayer's animation effect. Use a real useEffect so act() flushes it.
vi.mock('../../hooks/useStrictNarration', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    useStrictNarration: ({ applyStep }: { applyStep: (i: number) => void }) => {
      const done = React.useRef(false);
      React.useEffect(() => {
        if (done.current) return;
        done.current = true;
        applyStep(0);
      }, [applyStep]);
      return {
        isAutoPlaying: true,
        next: vi.fn(), prev: vi.fn(), goToStep: vi.fn(), toggleAutoPlay: vi.fn(),
      };
    },
  };
});

import { LessonPlayer } from './LessonPlayer';

const START = new Chess().fen();
function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const m of sans) c.move(m);
  return c.fen();
}

const DEEP_FIRST_BEAT: LessonScript = {
  openingId: 'test-dragon',
  title: 'Test Dragon',
  minutes: 5,
  orientation: 'black',
  beats: [
    { id: 'born', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'], say: 'The Dragon.' },
    { id: 'next', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7'], say: 'Develop.' },
  ],
};

describe('LessonPlayer — first beat builds move-by-move (David 2026-06-26)', () => {
  beforeEach(() => { fenCalls.length = 0; vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('does NOT snap straight to the deep first-beat position; it plays the opening moves up from the start', async () => {
    // Render under StrictMode: it double-invokes the animation effect on mount
    // (setup → cleanup → setup), which is exactly the re-run that used to
    // advance prevIdxRef and SNAP the first beat. The build must survive it.
    await act(async () => {
      render(
        <StrictMode>
          <LessonPlayer script={DEEP_FIRST_BEAT} onExit={() => {}} />
        </StrictMode>,
      );
    });
    // Advance the build-out timers in small steps (they fire ~500ms apart in the
    // real app, one render each — advancing all at once would let React batch
    // every setDisplayFen into one final frame and hide the intermediates).
    for (let i = 0; i < 30; i += 1) {
      await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    }

    const deep = fenAfter(DEEP_FIRST_BEAT.beats[0].moves);
    // The first frame must be the START position (the build origin), never the deep one.
    expect(fenCalls[0]).toBe(START);
    expect(fenCalls[0]).not.toBe(deep);
    // It must pass THROUGH intermediate positions (proof of move-by-move build).
    expect(fenCalls).toContain(fenAfter(['e4']));
    expect(fenCalls).toContain(fenAfter(['e4', 'c5', 'Nf3']));
    // And it must arrive at the full deep position by the end.
    expect(fenCalls[fenCalls.length - 1]).toBe(deep);
    // A real build shows many distinct positions, not 1-2.
    expect(new Set(fenCalls).size).toBeGreaterThanOrEqual(8);

    // Once the walk has landed, firstWalkDoneRef flips so further re-runs SNAP
    // and never rebuild — the board must NOT loop back to the start. Keep
    // advancing and assert it stays settled at the deep position.
    const framesAfterSettle = fenCalls.length;
    for (let i = 0; i < 10; i += 1) {
      await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    }
    const tail = fenCalls.slice(framesAfterSettle);
    expect(tail.every((f) => f === deep)).toBe(true); // no rebuild-loop back to START
  });
});
