import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { CoachSessionPage } from './CoachSessionPage';
import { voiceService } from '../../services/voiceService';

function renderAt(path: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MotionConfig transition={{ duration: 0 }}>
        <Routes>
          <Route path="/coach/session/:kind" element={<CoachSessionPage />} />
          <Route path="/coach/chat" element={<div data-testid="chat-redirect" />} />
        </Routes>
      </MotionConfig>
    </MemoryRouter>,
  );
}

describe('CoachSessionPage — middlegame', () => {
  beforeEach(() => {
    vi.spyOn(voiceService, 'speak').mockResolvedValue(undefined);
    vi.spyOn(voiceService, 'stop').mockImplementation(() => {});
  });

  it('renders a session for a known opening', () => {
    renderAt('/coach/session/middlegame?opening=italian-game&orientation=white');
    expect(screen.getByTestId('chess-lesson-layout')).toBeInTheDocument();
    expect(screen.getByTestId('chess-lesson-board')).toBeInTheDocument();
    expect(screen.getByTestId('chess-lesson-controls')).toBeInTheDocument();
  });

  it('shows a friendly empty state when no plan matches', () => {
    renderAt('/coach/session/middlegame?opening=nonexistent');
    const layout = screen.getByTestId('chess-lesson-layout');
    expect(within(layout).getByText(/no middlegame plan/i)).toBeInTheDocument();
  });

  it('provides prev/next/play/restart controls in middlegame mode', () => {
    renderAt('/coach/session/middlegame?subject=italian');
    expect(screen.getByLabelText('Previous move')).toBeInTheDocument();
    expect(screen.getByLabelText('Next move')).toBeInTheDocument();
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
    expect(screen.getByLabelText('Restart')).toBeInTheDocument();
  });
});

describe('CoachSessionPage — play-against', () => {
  beforeEach(() => {
    vi.spyOn(voiceService, 'speak').mockResolvedValue(undefined);
    vi.spyOn(voiceService, 'stop').mockImplementation(() => {});
  });

  it('renders a play-against view with a resign button', () => {
    renderAt('/coach/session/play-against?subject=italian&difficulty=easy');
    expect(screen.getByTestId('chess-lesson-layout')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Resign and return to chat'),
    ).toBeInTheDocument();
  });
});

describe('CoachSessionPage — unknown kind', () => {
  it('redirects to /coach/chat for unrecognized session kinds', () => {
    renderAt('/coach/session/nonsense');
    expect(screen.getByTestId('chat-redirect')).toBeInTheDocument();
  });
});
