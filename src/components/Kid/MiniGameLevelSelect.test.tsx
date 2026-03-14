import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { MiniGameLevelSelect } from './MiniGameLevelSelect';
import { PAWN_WARS_LEVELS } from '../../data/pawnWarsConfig';
import type { MiniGameProgress } from '../../types';
import { isLevelUnlocked } from '../../services/miniGameService';

vi.mock('../../services/miniGameService', () => ({
  isLevelUnlocked: vi.fn(),
}));

const mockedIsLevelUnlocked = isLevelUnlocked as ReturnType<typeof vi.fn>;

describe('MiniGameLevelSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsLevelUnlocked.mockReturnValue(true);
  });

  it('renders level title and description', () => {
    const config = PAWN_WARS_LEVELS[0];
    render(
      <MiniGameLevelSelect config={config} progress={null} onSelect={vi.fn()} />,
    );

    expect(screen.getByText('Pawn Skirmish')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Race your pawns forward! Red and green squares help you.',
      ),
    ).toBeInTheDocument();
  });

  it('calls onSelect with level number when clicked and unlocked', () => {
    const onSelect = vi.fn();
    const config = PAWN_WARS_LEVELS[0];
    render(
      <MiniGameLevelSelect config={config} progress={null} onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByTestId('level-select-1'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('does NOT call onSelect when level is locked', () => {
    mockedIsLevelUnlocked.mockReturnValue(false);
    const onSelect = vi.fn();
    const config = PAWN_WARS_LEVELS[1];
    render(
      <MiniGameLevelSelect config={config} progress={null} onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByTestId('level-select-2'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows lock icon when level is locked', () => {
    mockedIsLevelUnlocked.mockReturnValue(false);
    const config = PAWN_WARS_LEVELS[1];
    render(
      <MiniGameLevelSelect config={config} progress={null} onSelect={vi.fn()} />,
    );

    // When locked, the level number should NOT be shown
    const button = screen.getByTestId('level-select-2');
    expect(button).toBeDisabled();
    // Lock icon is rendered from lucide-react as an SVG
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('shows star display when level is completed', () => {
    const progress: MiniGameProgress = {
      levels: {
        1: { completed: true, stars: 2, hintsUsed: 1 },
      },
    };
    const config = PAWN_WARS_LEVELS[0];
    render(
      <MiniGameLevelSelect config={config} progress={progress} onSelect={vi.fn()} />,
    );

    expect(screen.getByTestId('star-display')).toBeInTheDocument();
  });

  it('does not show star display when level is not completed', () => {
    const config = PAWN_WARS_LEVELS[0];
    render(
      <MiniGameLevelSelect config={config} progress={null} onSelect={vi.fn()} />,
    );

    expect(screen.queryByTestId('star-display')).not.toBeInTheDocument();
  });

  it('renders correct data-testid for each level', () => {
    const config = PAWN_WARS_LEVELS[2];
    render(
      <MiniGameLevelSelect config={config} progress={null} onSelect={vi.fn()} />,
    );

    expect(screen.getByTestId('level-select-3')).toBeInTheDocument();
  });

  it('button is disabled when locked', () => {
    mockedIsLevelUnlocked.mockReturnValue(false);
    const config = PAWN_WARS_LEVELS[1];
    render(
      <MiniGameLevelSelect config={config} progress={null} onSelect={vi.fn()} />,
    );

    expect(screen.getByTestId('level-select-2')).toBeDisabled();
  });
});
