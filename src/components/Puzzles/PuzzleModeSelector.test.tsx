import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { fireEvent } from '@testing-library/react';
import { PuzzleModeSelector } from './PuzzleModeSelector';
import { PUZZLE_MODES } from '../../services/puzzleService';

describe('PuzzleModeSelector', () => {
  it('renders all puzzle modes', () => {
    render(<PuzzleModeSelector onSelectMode={vi.fn()} />);

    expect(screen.getByTestId('puzzle-mode-selector')).toBeInTheDocument();
    for (const config of PUZZLE_MODES) {
      expect(screen.getByTestId(`mode-${config.mode}`)).toBeInTheDocument();
      expect(screen.getByText(config.label)).toBeInTheDocument();
    }
  });

  it('displays mode descriptions', () => {
    render(<PuzzleModeSelector onSelectMode={vi.fn()} />);

    for (const config of PUZZLE_MODES) {
      expect(screen.getByText(config.description)).toBeInTheDocument();
    }
  });

  it('calls onSelectMode with the correct mode when clicked', () => {
    const onSelectMode = vi.fn();
    render(<PuzzleModeSelector onSelectMode={onSelectMode} />);

    fireEvent.click(screen.getByTestId(`mode-${PUZZLE_MODES[0].mode}`));
    expect(onSelectMode).toHaveBeenCalledWith(PUZZLE_MODES[0].mode);
  });

  it('shows time badge for timed modes', () => {
    render(<PuzzleModeSelector onSelectMode={vi.fn()} />);

    const timedMode = PUZZLE_MODES.find((m) => m.timeLimit !== null);
    if (timedMode) {
      expect(screen.getByText(`${timedMode.timeLimit}s`)).toBeInTheDocument();
    }
  });

  it('has aria-labels on all mode buttons', () => {
    render(<PuzzleModeSelector onSelectMode={vi.fn()} />);

    for (const config of PUZZLE_MODES) {
      const btn = screen.getByTestId(`mode-${config.mode}`);
      expect(btn).toHaveAttribute('aria-label', `${config.label}: ${config.description}`);
    }
  });
});
