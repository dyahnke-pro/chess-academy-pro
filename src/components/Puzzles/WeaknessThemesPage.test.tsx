import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/utils';
import { WeaknessThemesPage } from './WeaknessThemesPage';
import { buildMistakePuzzle } from '../../test/factories';
import type { WeaknessTheme, WeaknessDrillItem, WeaknessDrillSession, MistakePuzzle } from '../../types';

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockGetAllMistakePuzzles = vi.fn<() => Promise<MistakePuzzle[]>>();
const mockGradeMistakePuzzle = vi.fn<() => Promise<void>>();
const mockDetectWeaknessThemes = vi.fn<(mistakes: MistakePuzzle[]) => WeaknessTheme[]>();
const mockGeneratePersonalizedDrill = vi.fn<(theme?: string, max?: number) => Promise<WeaknessDrillSession>>();

vi.mock('../../services/mistakePuzzleService', () => ({
  getAllMistakePuzzles: (...args: unknown[]) => mockGetAllMistakePuzzles(...args as []),
  gradeMistakePuzzle: (...args: unknown[]) => mockGradeMistakePuzzle(...args as []),
}));

vi.mock('../../services/weaknessAnalyzer', () => ({
  detectWeaknessThemes: (...args: unknown[]) => mockDetectWeaknessThemes(...args as [MistakePuzzle[]]),
  generatePersonalizedDrill: (...args: unknown[]) => mockGeneratePersonalizedDrill(...args as [string?, number?]),
}));

vi.mock('./MistakePuzzleBoard', () => ({
  MistakePuzzleBoard: ({ onComplete }: { onComplete: (correct: boolean) => void }) => (
    <div data-testid="mistake-board">
      <button data-testid="solve-correct" onClick={() => onComplete(true)}>Solve</button>
      <button data-testid="solve-wrong" onClick={() => onComplete(false)}>Fail</button>
    </div>
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Setup ─────────────────────────────────────────────────────────────────

const sampleThemes: WeaknessTheme[] = [
  {
    theme: 'Forks',
    specificPattern: 'Missed fork patterns',
    frequency: 5,
    sampleFens: ['fen1', 'fen2'],
    avgCentipawnLoss: 250,
  },
  {
    theme: 'Opening Blunders',
    specificPattern: 'Errors in the opening phase',
    frequency: 3,
    sampleFens: ['fen3'],
    avgCentipawnLoss: 180,
  },
];

function buildDrillSession(items: WeaknessDrillItem[] = []): WeaknessDrillSession {
  return {
    themes: sampleThemes,
    drillItems: items,
    generatedAt: new Date().toISOString(),
  };
}

describe('WeaknessThemesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllMistakePuzzles.mockResolvedValue([]);
    mockDetectWeaknessThemes.mockReturnValue([]);
    mockGeneratePersonalizedDrill.mockResolvedValue(buildDrillSession());
    mockGradeMistakePuzzle.mockResolvedValue(undefined);
  });

  it('shows loading state initially', () => {
    mockGetAllMistakePuzzles.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<WeaknessThemesPage />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('shows empty state when no mistakes exist', async () => {
    mockGetAllMistakePuzzles.mockResolvedValue([]);
    mockDetectWeaknessThemes.mockReturnValue([]);

    render(<WeaknessThemesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No weakness data yet/)).toBeInTheDocument();
    });
  });

  it('displays weakness themes with correct data', async () => {
    const mistakes = [buildMistakePuzzle({ status: 'unsolved' })];
    mockGetAllMistakePuzzles.mockResolvedValue(mistakes);
    mockDetectWeaknessThemes.mockReturnValue(sampleThemes);

    render(<WeaknessThemesPage />);

    await waitFor(() => {
      expect(screen.getByText('Forks')).toBeInTheDocument();
    });

    expect(screen.getByText('Opening Blunders')).toBeInTheDocument();
    expect(screen.getByText('5 mistakes')).toBeInTheDocument();
    expect(screen.getByText('3 mistakes')).toBeInTheDocument();
    expect(screen.getByText('avg 250 cp loss')).toBeInTheDocument();
  });

  it('shows mixed training button', async () => {
    mockGetAllMistakePuzzles.mockResolvedValue([buildMistakePuzzle()]);
    mockDetectWeaknessThemes.mockReturnValue(sampleThemes);

    render(<WeaknessThemesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('mixed-training-btn')).toBeInTheDocument();
    });
  });

  it('starts theme-specific drill on Practice click', async () => {
    const user = userEvent.setup();
    const mp = buildMistakePuzzle({ id: 'mp1', tacticType: 'fork', status: 'unsolved' });
    const drillItems: WeaknessDrillItem[] = [{ mistakePuzzle: mp, themeKey: 'Forks' }];

    mockGetAllMistakePuzzles.mockResolvedValue([mp]);
    mockDetectWeaknessThemes.mockReturnValue(sampleThemes);
    mockGeneratePersonalizedDrill.mockResolvedValue(buildDrillSession(drillItems));

    render(<WeaknessThemesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('drill-btn-0')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('drill-btn-0'));

    await waitFor(() => {
      expect(mockGeneratePersonalizedDrill).toHaveBeenCalledWith('Forks', 20);
    });

    await waitFor(() => {
      expect(screen.getByTestId('drill-view')).toBeInTheDocument();
    });
  });

  it('starts mixed drill on Mixed Training click', async () => {
    const user = userEvent.setup();
    const mp = buildMistakePuzzle({ id: 'mp1', status: 'unsolved' });
    const drillItems: WeaknessDrillItem[] = [{ mistakePuzzle: mp, themeKey: 'Forks' }];

    mockGetAllMistakePuzzles.mockResolvedValue([mp]);
    mockDetectWeaknessThemes.mockReturnValue(sampleThemes);
    mockGeneratePersonalizedDrill.mockResolvedValue(buildDrillSession(drillItems));

    render(<WeaknessThemesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('mixed-training-btn')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('mixed-training-btn'));

    await waitFor(() => {
      expect(mockGeneratePersonalizedDrill).toHaveBeenCalledWith(undefined, 20);
    });
  });

  it('shows summary after completing all drill items', async () => {
    const user = userEvent.setup();
    const mp = buildMistakePuzzle({ id: 'mp1', status: 'unsolved' });
    const drillItems: WeaknessDrillItem[] = [{ mistakePuzzle: mp, themeKey: 'Forks' }];

    mockGetAllMistakePuzzles.mockResolvedValue([mp]);
    mockDetectWeaknessThemes.mockReturnValue(sampleThemes);
    mockGeneratePersonalizedDrill.mockResolvedValue(buildDrillSession(drillItems));

    render(<WeaknessThemesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('mixed-training-btn')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('mixed-training-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('drill-view')).toBeInTheDocument();
    });

    // Solve the puzzle
    await user.click(screen.getByTestId('solve-correct'));

    // Click next/finish
    await user.click(screen.getByTestId('next-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('session-summary')).toBeInTheDocument();
    });

    expect(screen.getByText('Drill Complete')).toBeInTheDocument();
    expect(screen.getByText('1/1 solved (100%)')).toBeInTheDocument();
  });

  it('grades mistake puzzle when solved', async () => {
    const user = userEvent.setup();
    const mp = buildMistakePuzzle({ id: 'mp1', status: 'unsolved' });
    const drillItems: WeaknessDrillItem[] = [{ mistakePuzzle: mp, themeKey: 'Forks' }];

    mockGetAllMistakePuzzles.mockResolvedValue([mp]);
    mockDetectWeaknessThemes.mockReturnValue(sampleThemes);
    mockGeneratePersonalizedDrill.mockResolvedValue(buildDrillSession(drillItems));

    render(<WeaknessThemesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('mixed-training-btn')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('mixed-training-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('solve-correct')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('solve-correct'));

    expect(mockGradeMistakePuzzle).toHaveBeenCalledWith('mp1', 'good', true);
  });

  it('shows summary with no drills when session is empty', async () => {
    const user = userEvent.setup();
    mockGetAllMistakePuzzles.mockResolvedValue([buildMistakePuzzle()]);
    mockDetectWeaknessThemes.mockReturnValue(sampleThemes);
    mockGeneratePersonalizedDrill.mockResolvedValue(buildDrillSession([]));

    render(<WeaknessThemesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('mixed-training-btn')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('mixed-training-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('session-summary')).toBeInTheDocument();
    });

    expect(screen.getByText('No Drills Available')).toBeInTheDocument();
  });

  it('navigates to import page from empty state', async () => {
    const user = userEvent.setup();
    mockGetAllMistakePuzzles.mockResolvedValue([]);
    mockDetectWeaknessThemes.mockReturnValue([]);

    render(<WeaknessThemesPage />);

    await waitFor(() => {
      expect(screen.getByText('Import Games')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Import Games'));
    expect(mockNavigate).toHaveBeenCalledWith('/games/import');
  });
});
