import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { CoachSessionPage } from './CoachSessionPage';
import { voiceService } from '../../services/voiceService';

// Mock async services so tests don't hit real Stockfish / Dexie.
vi.mock('../../services/playerRatingService', () => ({
  getPlayerRating: vi.fn().mockResolvedValue(1500),
}));

vi.mock('../../services/middlegamePlanner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/middlegamePlanner')>();
  return {
    ...actual,
    resolveMiddlegameSessionWithFallback: vi.fn(),
  };
});

vi.mock('../../services/walkthroughResolver', () => ({
  resolveWalkthroughSession: vi.fn(),
  matchOpeningForSubject: vi.fn(),
}));

// The ExplainPositionSessionView touches coachApi + stockfishEngine — mock at
// the component layer so we don't need to simulate either here.
vi.mock('./ExplainPositionSessionView', () => ({
  ExplainPositionSessionView: ({ fen }: { fen?: string }) => (
    <div data-testid="explain-position-stub">{fen ?? 'start'}</div>
  ),
}));

import { resolveMiddlegameSessionWithFallback } from '../../services/middlegamePlanner';
import { resolveWalkthroughSession } from '../../services/walkthroughResolver';
import type { WalkthroughSession } from '../../types/walkthrough';

function renderAt(path: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MotionConfig transition={{ duration: 0 }}>
        <Routes>
          <Route path="/coach/session/:kind" element={<CoachSessionPage />} />
          <Route path="/coach/chat" element={<div data-testid="chat-redirect" />} />
          <Route path="/puzzles" element={<div data-testid="puzzles-redirect" />} />
        </Routes>
      </MotionConfig>
    </MemoryRouter>,
  );
}

function buildSession(overrides?: Partial<WalkthroughSession>): WalkthroughSession {
  return {
    title: 'Italian Plan',
    subtitle: 'Middlegame plan',
    orientation: 'white',
    kind: 'middlegame',
    startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    steps: [
      {
        moveNumber: 1,
        san: 'e4',
        fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        narration: 'Take the center.',
      },
    ],
    ...overrides,
  };
}

describe('CoachSessionPage — middlegame', () => {
  beforeEach(() => {
    vi.spyOn(voiceService, 'speak').mockResolvedValue(undefined);
    vi.spyOn(voiceService, 'stop').mockImplementation(() => {});
    vi.mocked(resolveMiddlegameSessionWithFallback).mockReset();
  });

  it('renders a session when one resolves', async () => {
    vi.mocked(resolveMiddlegameSessionWithFallback).mockResolvedValue(buildSession());
    renderAt('/coach/session/middlegame?opening=italian-game&orientation=white');
    await waitFor(() =>
      expect(screen.getByTestId('chess-lesson-layout')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('chess-lesson-board')).toBeInTheDocument();
    expect(screen.getByTestId('chess-lesson-controls')).toBeInTheDocument();
  });

  it('shows a friendly empty state when resolution returns null', async () => {
    vi.mocked(resolveMiddlegameSessionWithFallback).mockResolvedValue(null);
    renderAt('/coach/session/middlegame?opening=nonexistent');
    await waitFor(() => {
      const layout = screen.getByTestId('chess-lesson-layout');
      expect(within(layout).getByText(/no middlegame plan|unavailable/i)).toBeInTheDocument();
    });
  });

  it('provides prev/next/play/restart controls once a session loads', async () => {
    vi.mocked(resolveMiddlegameSessionWithFallback).mockResolvedValue(buildSession());
    renderAt('/coach/session/middlegame?subject=italian');
    await waitFor(() =>
      expect(screen.getByLabelText('Previous move')).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Next move')).toBeInTheDocument();
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
    expect(screen.getByLabelText('Restart')).toBeInTheDocument();
  });
});

describe('CoachSessionPage — walkthrough', () => {
  beforeEach(() => {
    vi.spyOn(voiceService, 'speak').mockResolvedValue(undefined);
    vi.mocked(resolveWalkthroughSession).mockReset();
  });

  it('renders the walkthrough session when one resolves', async () => {
    vi.mocked(resolveWalkthroughSession).mockResolvedValue(
      buildSession({ title: 'Sicilian Defense', kind: 'opening' }),
    );
    renderAt('/coach/session/walkthrough?subject=Sicilian');
    await waitFor(() =>
      expect(screen.getByText('Sicilian Defense')).toBeInTheDocument(),
    );
  });

  it('shows a helpful error when the subject does not match', async () => {
    vi.mocked(resolveWalkthroughSession).mockResolvedValue(null);
    renderAt('/coach/session/walkthrough?subject=nothingburger');
    await waitFor(() =>
      expect(screen.getByText(/couldn't find an opening/i)).toBeInTheDocument(),
    );
  });
});

describe('CoachSessionPage — puzzle', () => {
  it('redirects to /puzzles with query params', () => {
    renderAt('/coach/session/puzzle?theme=fork&difficulty=medium');
    expect(screen.getByTestId('puzzles-redirect')).toBeInTheDocument();
  });
});

describe('CoachSessionPage — explain-position', () => {
  it('mounts ExplainPositionSessionView with the fen from search params', () => {
    renderAt('/coach/session/explain-position?fen=abc');
    expect(screen.getByTestId('explain-position-stub')).toHaveTextContent('abc');
  });
});

describe('CoachSessionPage — play-against', () => {
  beforeEach(() => {
    vi.spyOn(voiceService, 'speak').mockResolvedValue(undefined);
    vi.spyOn(voiceService, 'stop').mockImplementation(() => {});
  });

  it('renders a loading state then the play view', async () => {
    renderAt('/coach/session/play-against?subject=italian&difficulty=easy');
    // Loads the player rating async.
    await waitFor(() =>
      expect(
        screen.getByLabelText('Resign and return to chat'),
      ).toBeInTheDocument(),
    );
  });
});

describe('CoachSessionPage — unknown kind', () => {
  it('redirects to /coach/chat for unrecognized session kinds', () => {
    renderAt('/coach/session/nonsense');
    expect(screen.getByTestId('chat-redirect')).toBeInTheDocument();
  });
});
