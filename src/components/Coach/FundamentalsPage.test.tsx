import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { FundamentalsPage } from './FundamentalsPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// The Fundamentals track (Phase 2) — David 2026-08-26. A wire that does not
// fire is not a wire: prove the four principles render, the example-game walk
// hands off to the real review, and principles without a game hide the walk.
describe('FundamentalsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders all four fundamental cards', () => {
    render(<FundamentalsPage />);
    expect(screen.getByTestId('fundamentals-page')).toBeInTheDocument();
    for (const topic of ['piece-values', 'center', 'development', 'king-safety']) {
      expect(screen.getByTestId(`fundamental-card-${topic}`)).toBeInTheDocument();
      expect(screen.getByTestId(`fundamental-listen-${topic}`)).toBeInTheDocument();
    }
  });

  it('shows the Opera Game walk on development, hides it where no game exists', () => {
    render(<FundamentalsPage />);
    expect(screen.getByTestId('fundamental-walk-development')).toBeInTheDocument();
    expect(screen.queryByTestId('fundamental-walk-piece-values')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fundamental-walk-king-safety')).not.toBeInTheDocument();
  });

  it('walking the game hands off to the real annotated review sample', () => {
    render(<FundamentalsPage />);
    fireEvent.click(screen.getByTestId('fundamental-walk-development'));
    expect(mockNavigate).toHaveBeenCalledWith('/coach/review/sample-morphy-opera-1858');
  });

  it('teaches the real principle text (piece values names the numbers)', () => {
    render(<FundamentalsPage />);
    expect(screen.getByTestId('fundamental-card-piece-values').textContent).toMatch(/rook/i);
  });
});
