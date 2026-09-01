import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { EndgameTrainerPage } from './EndgameTrainerPage';

// The board + tablebase + voice are network/DOM heavy — mock them so the page's
// routing/loading/empty logic is what's under test (Batch B).
vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen, orientation }: { initialFen?: string; orientation?: string }) => (
    <div data-testid="chess-board" data-fen={initialFen} data-orientation={orientation}>Board</div>
  ),
}));
vi.mock('../../services/endgameTablebaseService', () => ({
  buildTablebaseWalk: vi.fn(async () => []),
  bestEndgameMove: vi.fn(async () => null),
  gradeEndgameMove: vi.fn(async () => null),
}));
vi.mock('../../services/voiceService', () => ({ voiceService: { speakForced: vi.fn(async () => {}) } }));
vi.mock('../../services/endgameLessonsService', () => ({
  getEndgameLessonById: (id: string) => id === 'lucena-position'
    ? { id: 'lucena-position', name: "Lucena's Position", narration: { rule: 'Build the bridge.' }, positions: [{ fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', result: 'white-wins' }] }
    : id === 'no-pos'
      ? { id: 'no-pos', name: 'Empty Lesson', narration: { rule: 'x' }, positions: [] }
      : null,
}));

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/coach/endgame-trainer/:lessonId" element={<EndgameTrainerPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EndgameTrainerPage (Batch B)', () => {
  it('mounts the trainer for a known lesson with a playable position', () => {
    renderAt('/coach/endgame-trainer/lucena-position');
    expect(screen.getByTestId('endgame-tablebase-trainer')).toBeInTheDocument();
    expect(screen.getByText("Lucena's Position")).toBeInTheDocument();
  });

  it('shows a not-found state for an unknown lesson', () => {
    renderAt('/coach/endgame-trainer/does-not-exist');
    expect(screen.getByTestId('endgame-trainer-notfound')).toBeInTheDocument();
  });

  it('shows a no-position state when the lesson has no playable FEN', () => {
    renderAt('/coach/endgame-trainer/no-pos');
    expect(screen.getByTestId('endgame-trainer-noposition')).toBeInTheDocument();
  });
});
