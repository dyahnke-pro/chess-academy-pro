import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { CoachAvatar } from './CoachAvatar';

describe('CoachAvatar', () => {
  it('renders with default props', () => {
    render(<CoachAvatar personality="danya" expression="neutral" speaking={false} />);
    expect(screen.getByTestId('coach-avatar')).toBeInTheDocument();
  });

  it('sets personality data attribute', () => {
    render(<CoachAvatar personality="kasparov" expression="neutral" speaking={false} />);
    expect(screen.getByTestId('coach-avatar')).toHaveAttribute('data-personality', 'kasparov');
  });

  it('sets expression data attribute', () => {
    render(<CoachAvatar personality="danya" expression="excited" speaking={false} />);
    expect(screen.getByTestId('coach-avatar')).toHaveAttribute('data-expression', 'excited');
  });

  it('renders at small size', () => {
    render(<CoachAvatar personality="fischer" expression="thinking" speaking={false} size="sm" />);
    const svg = screen.getByTestId('coach-avatar').querySelector('svg');
    expect(svg).toHaveAttribute('width', '48');
  });

  it('renders at large size', () => {
    render(<CoachAvatar personality="danya" expression="neutral" speaking={false} size="lg" />);
    const svg = screen.getByTestId('coach-avatar').querySelector('svg');
    expect(svg).toHaveAttribute('width', '120');
  });

  it('renders at medium size by default', () => {
    render(<CoachAvatar personality="danya" expression="neutral" speaking={false} />);
    const svg = screen.getByTestId('coach-avatar').querySelector('svg');
    expect(svg).toHaveAttribute('width', '80');
  });

  it('renders all 5 expression states', () => {
    const expressions = ['neutral', 'encouraging', 'excited', 'disappointed', 'thinking'] as const;
    for (const expression of expressions) {
      const { unmount } = render(
        <CoachAvatar personality="danya" expression={expression} speaking={false} />,
      );
      expect(screen.getByTestId('coach-avatar')).toHaveAttribute('data-expression', expression);
      unmount();
    }
  });

  it('renders for all 3 personalities', () => {
    const personalities = ['danya', 'kasparov', 'fischer'] as const;
    for (const personality of personalities) {
      const { unmount } = render(
        <CoachAvatar personality={personality} expression="neutral" speaking={false} />,
      );
      expect(screen.getByTestId('coach-avatar')).toHaveAttribute('data-personality', personality);
      unmount();
    }
  });
});
