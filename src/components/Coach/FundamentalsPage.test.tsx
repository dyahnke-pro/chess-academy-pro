import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { FundamentalsPage } from './FundamentalsPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
// SmartSearchBar pulls in the coach/search stack; the tab test only cares that
// it's mounted in the standard hub slot.
vi.mock('../Search/SmartSearchBar', () => ({ SmartSearchBar: () => <div data-testid="smart-search-bar" /> }));

// The Fundamentals track, rebuilt to the app hub standard (David 2026-09-06):
// seven phase sections, each with Listen (grounded read-aloud) + Drill (a themed
// puzzle set, or the student's own mistakes). A wire that does not fire is not a
// wire — prove the sections render, Listen/Drill exist, and Drill routes right.
const SECTION_IDS = ['opening-play', 'center', 'development', 'king-safety', 'pawn-structure', 'tactics-threats', 'endgame-technique'];

describe('FundamentalsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the standard hub shell — centered title + SmartSearchBar', () => {
    render(<FundamentalsPage />);
    expect(screen.getByTestId('fundamentals-page')).toBeInTheDocument();
    expect(screen.getByTestId('smart-search-bar')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fundamentals' })).toBeInTheDocument();
  });

  it('renders all seven phase sections, each with Listen and Drill', () => {
    render(<FundamentalsPage />);
    for (const id of SECTION_IDS) {
      expect(screen.getByTestId(`fundamental-section-${id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`fundamental-listen-${id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`fundamental-drill-${id}`)).toBeInTheDocument();
    }
  });

  it('a themed section drills real puzzles; a positional section drills own mistakes', () => {
    render(<FundamentalsPage />);
    fireEvent.click(screen.getByTestId('fundamental-drill-endgame-technique'));
    expect(mockNavigate).toHaveBeenCalledWith('/tactics/drill', {
      state: { filterThemes: ['endgame', 'rookEndgame', 'pawnEndgame', 'bishopEndgame', 'knightEndgame'] },
    });
    fireEvent.click(screen.getByTestId('fundamental-drill-opening-play'));
    expect(mockNavigate).toHaveBeenCalledWith('/tactics/mistakes');
  });

  it('shows the Opera Game walk on development, hides it where no game exists', () => {
    render(<FundamentalsPage />);
    expect(screen.getByTestId('fundamental-walk-development')).toBeInTheDocument();
    expect(screen.queryByTestId('fundamental-walk-king-safety')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fundamental-walk-pawn-structure')).not.toBeInTheDocument();
  });

  it('walking the game hands off to the real annotated review sample', () => {
    render(<FundamentalsPage />);
    fireEvent.click(screen.getByTestId('fundamental-walk-development'));
    expect(mockNavigate).toHaveBeenCalledWith('/coach/review/sample-morphy-opera-1858');
  });

  it('teaches real grounded principle text (the centre section names the centre)', () => {
    render(<FundamentalsPage />);
    expect(screen.getByTestId('fundamental-section-center').textContent).toMatch(/cent(er|re)/i);
  });
});
