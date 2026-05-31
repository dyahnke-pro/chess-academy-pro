import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { CoachSessionPage } from './CoachSessionPage';
import { voiceService } from '../../services/voiceService';
import { useAppStore } from '../../stores/appStore';

beforeEach(() => {
  useAppStore.getState().clearLastBoardSnapshot();
});

// Mock async services so tests don't hit real Stockfish / Dexie.
vi.mock('../../services/playerRatingService', () => ({
  getPlayerRating: vi.fn().mockResolvedValue(1500),
}));

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

function renderAt(path: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MotionConfig transition={{ duration: 0 }}>
        <Routes>
          <Route path="/coach/session/:kind" element={<CoachSessionPage />} />
          <Route path="/coach/chat" element={<div data-testid="chat-redirect" />} />
          <Route path="/coach/play" element={<CoachPlayProbe />} />
          <Route path="/coach/teach" element={<CoachTeachProbe />} />
          <Route path="/tactics" element={<div data-testid="tactics-redirect" />} />
          <Route
            path="/tactics/adaptive"
            element={<TacticsAdaptiveProbe />}
          />
        </Routes>
      </MotionConfig>
    </MemoryRouter>,
  );
}

function CoachTeachProbe(): JSX.Element {
  // Surface the redirect path + query string so the walkthrough
  // redirect can be asserted on (the legacy /coach/session/walkthrough
  // now routes here).
  const loc = useLocation();
  return (
    <div data-testid="coach-teach-redirect">
      <span data-testid="coach-teach-redirect-path">
        {loc.pathname + loc.search}
      </span>
    </div>
  );
}

function TacticsAdaptiveProbe(): JSX.Element {
  // Surface the forcedWeakThemes router state so tests can assert that
  // the coach's theme handoff actually reaches AdaptivePuzzlePage.
  const loc = useLocation();
  const themes =
    (loc.state as { forcedWeakThemes?: string[] } | null)?.forcedWeakThemes ?? [];
  return (
    <div data-testid="adaptive-redirect" data-themes={themes.join(',')} />
  );
}

function CoachPlayProbe(): JSX.Element {
  // Surface the redirect path + query string so tests can assert that
  // play-against sessions forward their config to /coach/play.
  const loc = useLocation();
  return (
    <div data-testid="coach-play-redirect">
      <span data-testid="coach-play-redirect-path">
        {loc.pathname + loc.search}
      </span>
    </div>
  );
}

describe('CoachSessionPage — middlegame (redirect)', () => {
  // Middlegame plans now play on /coach/teach (the one and only play
  // UI — David 2026-05-31). /coach/session/middlegame is a redirect-only
  // kind: it maps ?opening / ?subject → ?plans so CoachTeachPage's
  // URL-param flow auto-runs the authored plan(s) on the big board.
  it('redirects to /coach/teach with subject mapped to plans', () => {
    renderAt('/coach/session/middlegame?subject=italian');
    expect(screen.getByTestId('coach-teach-redirect-path').textContent).toBe(
      '/coach/teach?plans=italian',
    );
  });

  it('falls back to the opening id when no subject is given', () => {
    renderAt('/coach/session/middlegame?opening=italian-game');
    expect(screen.getByTestId('coach-teach-redirect-path').textContent).toBe(
      '/coach/teach?plans=italian-game',
    );
  });

  it('redirects to bare /coach/teach when nothing identifies an opening', () => {
    renderAt('/coach/session/middlegame');
    expect(screen.getByTestId('coach-teach-redirect-path').textContent).toBe(
      '/coach/teach',
    );
  });
});

describe('CoachSessionPage — walkthrough (redirect)', () => {
  // /coach/session/walkthrough is a redirect-only kind now — the
  // canonical Learn-with-Coach surface (/coach/teach) owns the
  // walkthrough runtime. The redirect maps ?subject=X → ?opening=X
  // and preserves ?orientation so CoachTeachPage's URL-param flow
  // picks it up.
  it('redirects to /coach/teach with subject mapped to opening', () => {
    renderAt('/coach/session/walkthrough?subject=Sicilian');
    expect(screen.getByTestId('coach-teach-redirect')).toBeInTheDocument();
    expect(screen.getByTestId('coach-teach-redirect-path').textContent).toBe(
      '/coach/teach?opening=Sicilian',
    );
  });

  it('preserves orientation when redirecting', () => {
    renderAt('/coach/session/walkthrough?subject=Caro-Kann&orientation=black');
    expect(screen.getByTestId('coach-teach-redirect-path').textContent).toBe(
      '/coach/teach?opening=Caro-Kann&orientation=black',
    );
  });

  it('redirects to /coach/teach with no params when subject is missing', () => {
    renderAt('/coach/session/walkthrough');
    expect(screen.getByTestId('coach-teach-redirect-path').textContent).toBe(
      '/coach/teach',
    );
  });
});

describe('CoachSessionPage — puzzle', () => {
  it('redirects to /tactics/adaptive with the theme in router state', () => {
    renderAt('/coach/session/puzzle?theme=fork&difficulty=medium');
    const el = screen.getByTestId('adaptive-redirect');
    expect(el).toBeInTheDocument();
    expect(el.getAttribute('data-themes')).toBe('fork');
  });

  it('redirects to /tactics hub when no theme is provided', () => {
    renderAt('/coach/session/puzzle');
    expect(screen.getByTestId('tactics-redirect')).toBeInTheDocument();
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

  it('redirects to /coach/play with forwarded query params', async () => {
    renderAt('/coach/session/play-against?subject=italian&difficulty=easy');
    await waitFor(() =>
      expect(screen.getByTestId('coach-play-redirect')).toBeInTheDocument(),
    );
    const pathDisplay = screen.getByTestId('coach-play-redirect-path');
    expect(pathDisplay.textContent).toContain('/coach/play');
    expect(pathDisplay.textContent).toContain('subject=italian');
    expect(pathDisplay.textContent).toContain('difficulty=easy');
  });
});

describe('CoachSessionPage — unknown kind', () => {
  it('redirects to /coach/chat for unrecognized session kinds', () => {
    renderAt('/coach/session/nonsense');
    expect(screen.getByTestId('chat-redirect')).toBeInTheDocument();
  });
});
