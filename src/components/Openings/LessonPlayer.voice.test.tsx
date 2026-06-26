import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { Chess } from 'chess.js';
import type { LessonScript } from '../../types';

// Uses the REAL useStrictNarration (NOT mocked) so we verify the actual
// first-beat contract: the board plays the opening moves SILENTLY, and the
// narration (voiceService.speakLecture) fires only AFTER the walk settles —
// the coach speaks about the arrival position, never over a half-built board
// (David 2026-06-26 silent walk-in).

const fenCalls: string[] = [];
vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: ({ fen }: { fen: string }) => { fenCalls.push(fen); return null; },
}));
vi.mock('./LessonScaffold', () => ({
  LessonScaffold: ({ board }: { board: React.ReactNode }) => board,
}));

// Resolve speakLecture immediately so that, once it's CALLED, auto-advance can
// proceed — we assert on WHEN it's first called, not on audio. vi.hoisted so
// the spy exists before the hoisted vi.mock factory runs.
const { speakLecture } = vi.hoisted(() => ({ speakLecture: vi.fn(() => Promise.resolve()) }));
vi.mock('../../services/voiceService', () => ({
  voiceService: { speakLecture, speak: vi.fn(() => Promise.resolve()), stop: vi.fn() },
}));
vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({ settings: { voiceEnabled: true } }),
}));

import { LessonPlayer } from './LessonPlayer';

const START = new Chess().fen();
function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const m of sans) c.move(m);
  return c.fen();
}

// 4-ply first beat → build ≈ 300 + 3×500 = 1800ms.
const SCRIPT: LessonScript = {
  openingId: 'voice-test',
  title: 'Voice Test',
  minutes: 5,
  orientation: 'black',
  beats: [
    { id: 'born', moves: ['e4', 'c5', 'Nf3', 'd6'], say: 'The Sicilian — we strike at the centre from the side.' },
    { id: 'b2', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4'], say: 'White opens the centre.' },
  ],
};

describe('LessonPlayer — first-beat narration waits for the silent walk', () => {
  beforeEach(() => { fenCalls.length = 0; speakLecture.mockClear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('stays SILENT while the opening moves play, then speaks at the arrival position', async () => {
    await act(async () => {
      render(<LessonPlayer script={SCRIPT} onExit={() => {}} />);
    });

    // Mid-build (~900ms in): the board has moved but the coach must be silent.
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(speakLecture).not.toHaveBeenCalled();
    // The board is mid-walk (past the start, not yet at the full first beat).
    expect(fenCalls).toContain(START);
    expect(fenCalls).not.toContain(fenAfter(SCRIPT.beats[0].moves));

    // After the walk settles (≥1800ms), the narration fires — and with the
    // first beat's full text, at the arrival position.
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    expect(speakLecture).toHaveBeenCalled();
    expect(speakLecture.mock.calls[0][0]).toBe(SCRIPT.beats[0].say);
    // The board reached the full first-beat position by the time it spoke.
    expect(fenCalls).toContain(fenAfter(SCRIPT.beats[0].moves));
  });
});
