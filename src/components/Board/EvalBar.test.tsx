import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test/utils';
import { EvalBar } from './EvalBar';

describe('EvalBar', () => {
  describe('rendering', () => {
    it('renders the eval bar', () => {
      render(<EvalBar evaluation={0} isMate={false} mateIn={null} />);
      expect(screen.getByTestId('eval-bar')).toBeInTheDocument();
    });

    it('renders white and black segments', () => {
      render(<EvalBar evaluation={0} isMate={false} mateIn={null} />);
      expect(screen.getByTestId('eval-bar-white')).toBeInTheDocument();
      expect(screen.getByTestId('eval-bar-black')).toBeInTheDocument();
    });

    it('has correct aria-label', () => {
      render(<EvalBar evaluation={150} isMate={false} mateIn={null} />);
      const bar = screen.getByTestId('eval-bar');
      expect(bar).toHaveAttribute('aria-label', 'Evaluation: +1.5');
    });
  });

  describe('evaluation label', () => {
    it('shows 0.0 for equal position (null evaluation)', () => {
      render(<EvalBar evaluation={null} isMate={false} mateIn={null} />);
      expect(screen.getByTestId('eval-label')).toHaveTextContent('0.0');
    });

    it('shows positive label for white advantage', () => {
      render(<EvalBar evaluation={150} isMate={false} mateIn={null} />);
      expect(screen.getByTestId('eval-label')).toHaveTextContent('+1.5');
    });

    it('shows negative label for black advantage', () => {
      render(<EvalBar evaluation={-300} isMate={false} mateIn={null} />);
      expect(screen.getByTestId('eval-label')).toHaveTextContent('-3.0');
    });

    it('shows mate notation for white mating', () => {
      render(<EvalBar evaluation={null} isMate mateIn={3} />);
      expect(screen.getByTestId('eval-label')).toHaveTextContent('M3');
    });

    it('shows mate notation for black mating', () => {
      render(<EvalBar evaluation={null} isMate mateIn={-2} />);
      expect(screen.getByTestId('eval-label')).toHaveTextContent('M-2');
    });
  });

  describe('segment sizing', () => {
    it('applies custom className', () => {
      const { container } = render(
        <EvalBar evaluation={0} isMate={false} mateIn={null} className="test-class" />,
      );
      expect(container.querySelector('[data-testid="eval-bar"]')).toHaveClass('test-class');
    });
  });
});
