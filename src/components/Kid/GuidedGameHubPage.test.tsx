import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { GuidedGameHubPage } from './GuidedGameHubPage';

vi.mock('./StarDisplay', () => ({
  StarDisplay: ({ earned, total }: { earned: number; total: number }) => (
    <div data-testid="star-display">{earned}/{total}</div>
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('GuidedGameHubPage', () => {
  it('renders the hub with title', () => {
    render(<GuidedGameHubPage />);
    expect(screen.getByText('Play a Game')).toBeInTheDocument();
  });

  it('shows all 5 game cards', () => {
    render(<GuidedGameHubPage />);
    expect(screen.getByTestId('guided-game-card-scholars-mate')).toBeInTheDocument();
    expect(screen.getByTestId('guided-game-card-fools-mate')).toBeInTheDocument();
    expect(screen.getByTestId('guided-game-card-legals-mate')).toBeInTheDocument();
    expect(screen.getByTestId('guided-game-card-queen-power')).toBeInTheDocument();
    expect(screen.getByTestId('guided-game-card-blackburne-shilling')).toBeInTheDocument();
  });

  it('shows game titles', () => {
    render(<GuidedGameHubPage />);
    expect(screen.getByText('The Scholar\'s Surprise')).toBeInTheDocument();
    expect(screen.getByText('The Fastest Checkmate')).toBeInTheDocument();
    expect(screen.getByText('The Knight\'s Trap')).toBeInTheDocument();
    expect(screen.getByText('Queen on the Attack')).toBeInTheDocument();
    expect(screen.getByText('The Knight\'s Revenge')).toBeInTheDocument();
  });

  it('shows difficulty badges', () => {
    render(<GuidedGameHubPage />);
    const beginnerBadges = screen.getAllByText('Beginner');
    expect(beginnerBadges.length).toBe(3); // Games 1, 2, 4
    expect(screen.getByText('Explorer')).toBeInTheDocument(); // Game 3
    expect(screen.getByText('Champion')).toBeInTheDocument(); // Game 5
  });

  it('navigates to game on card click', () => {
    render(<GuidedGameHubPage />);
    fireEvent.click(screen.getByTestId('guided-game-card-scholars-mate'));
    expect(mockNavigate).toHaveBeenCalledWith('/kid/play-games/scholars-mate');
  });

  it('back button navigates to kid hub', () => {
    render(<GuidedGameHubPage />);
    fireEvent.click(screen.getByTestId('guided-hub-back'));
    expect(mockNavigate).toHaveBeenCalledWith('/kid');
  });

  it('shows estimated time for each game', () => {
    render(<GuidedGameHubPage />);
    expect(screen.getAllByText(/~\d+ min/).length).toBe(5);
  });

  it('shows player color for each game', () => {
    render(<GuidedGameHubPage />);
    expect(screen.getAllByText('Play White').length).toBe(3);
    expect(screen.getAllByText('Play Black').length).toBe(2);
  });
});
