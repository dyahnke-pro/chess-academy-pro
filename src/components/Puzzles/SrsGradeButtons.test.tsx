import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { SrsGradeButtons } from './SrsGradeButtons';

describe('SrsGradeButtons', () => {
  const defaultProps = {
    currentInterval: 1,
    easeFactor: 2.5,
    repetitions: 1,
    onGrade: vi.fn(),
  };

  it('renders all four grade buttons', () => {
    render(<SrsGradeButtons {...defaultProps} />);
    expect(screen.getByTestId('grade-again')).toBeInTheDocument();
    expect(screen.getByTestId('grade-hard')).toBeInTheDocument();
    expect(screen.getByTestId('grade-good')).toBeInTheDocument();
    expect(screen.getByTestId('grade-easy')).toBeInTheDocument();
  });

  it('displays interval labels on each button', () => {
    render(<SrsGradeButtons {...defaultProps} />);
    // Each button should contain the grade name + interval
    expect(screen.getByTestId('grade-again').textContent).toContain('Again');
    expect(screen.getByTestId('grade-good').textContent).toContain('Good');
    expect(screen.getByTestId('grade-easy').textContent).toContain('Easy');
  });

  it('calls onGrade with the correct grade when clicked', () => {
    const onGrade = vi.fn();
    render(<SrsGradeButtons {...defaultProps} onGrade={onGrade} />);

    fireEvent.click(screen.getByTestId('grade-good'));
    expect(onGrade).toHaveBeenCalledWith('good');

    fireEvent.click(screen.getByTestId('grade-again'));
    expect(onGrade).toHaveBeenCalledWith('again');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<SrsGradeButtons {...defaultProps} disabled />);
    expect(screen.getByTestId('grade-again')).toBeDisabled();
    expect(screen.getByTestId('grade-hard')).toBeDisabled();
    expect(screen.getByTestId('grade-good')).toBeDisabled();
    expect(screen.getByTestId('grade-easy')).toBeDisabled();
  });

  it('does not call onGrade when disabled', () => {
    const onGrade = vi.fn();
    render(<SrsGradeButtons {...defaultProps} onGrade={onGrade} disabled />);
    fireEvent.click(screen.getByTestId('grade-good'));
    expect(onGrade).not.toHaveBeenCalled();
  });
});
