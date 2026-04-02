import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { TacticSetupBoard } from './TacticSetupBoard';
import { buildSetupPuzzle, resetFactoryCounter } from '../../test/factories';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSpeak = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn();

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: (...args: unknown[]): Promise<void> => mockSpeak(...args) as Promise<void>,
    stop: (): void => { mockStop(); },
    warmup: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn(),
    isPlaying: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../services/tacticNarrationService', () => ({
  setupIntro: (_type: string, _diff: number, _fen?: string, _color?: string): string =>
    _fen ? 'Material is roughly equal. Find one quiet move that make the fork inevitable.' : 'Find the setup move.',
  setupCorrectPrep: (remaining: number): string => `${remaining} more to go.`,
  setupRevealComplete: (): string => 'Tactic revealed!',
  setupIncorrect: (): string => 'Not quite right.',
}));

vi.mock('../../services/tacticalProfileService', () => ({
  tacticTypeLabel: (t: string): string => t.replace(/_/g, ' '),
  tacticTypeIcon: (): string => '',
}));

// Mock useSettings to control showHints
const mockSettings = { showHints: true };
vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({ settings: mockSettings, updateSetting: vi.fn() }),
}));

describe('TacticSetupBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounter();
    mockSettings.showHints = true;
  });

  it('renders the board with intro narration as status message', () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByTestId('setup-board')).toBeInTheDocument();
    // Intro narration now includes position context
    expect(screen.getByText(/fork inevitable/)).toBeInTheDocument();
  });

  it('shows hint button when showHints is enabled', () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByTestId('setup-hint-area')).toBeInTheDocument();
    expect(screen.getByTestId('hint-button')).toBeInTheDocument();
    expect(screen.getByTestId('hint-button')).toHaveTextContent('Get a Hint');
  });

  it('hides hint button when showHints is disabled', () => {
    mockSettings.showHints = false;
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.queryByTestId('setup-hint-area')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hint-button')).not.toBeInTheDocument();
  });

  it('advances hint level when hint button is clicked', async () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    const hintButton = screen.getByTestId('hint-button');
    expect(hintButton).toHaveAttribute('data-level', '0');

    fireEvent.click(hintButton);

    await waitFor(() => {
      expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '1');
    });
  });

  it('shows arrow cue text at hint level 1', async () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByTestId('hint-button'));

    await waitFor(() => {
      expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '1');
    });

    expect(screen.getByTestId('hint-arrow-cue')).toHaveTextContent('Look at the gold arrow on the board.');
  });

  it('shows nudge text at hint level 2', async () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    const hintButton = screen.getByTestId('hint-button');

    // Level 0 → 1 (arrows)
    fireEvent.click(hintButton);
    await waitFor(() => {
      expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '1');
    });

    // Level 1 → 2 (nudge)
    fireEvent.click(hintButton);
    await waitFor(() => {
      expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '2');
    });

    // Nudge text should appear
    expect(screen.getByTestId('hint-nudge')).toBeInTheDocument();
  });

  it('speaks intro narration with position context on mount', () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(mockSpeak).toHaveBeenCalledWith(
      'Material is roughly equal. Find one quiet move that make the fork inevitable.',
    );
  });

  it('shows move indicator for player turn', () => {
    const puzzle = buildSetupPuzzle({ difficulty: 1 });
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByText(/Your turn — find the prep move/)).toBeInTheDocument();
  });
});
