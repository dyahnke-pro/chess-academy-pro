import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { StarDisplay } from './StarDisplay';

describe('StarDisplay', () => {
  it('renders correct number of total stars', () => {
    render(<StarDisplay earned={2} total={3} />);
    const filled = screen.getAllByTestId('star-filled');
    const empty = screen.getAllByTestId('star-empty');
    expect(filled).toHaveLength(2);
    expect(empty).toHaveLength(1);
  });

  it('renders all empty stars when earned is 0', () => {
    render(<StarDisplay earned={0} total={3} />);
    const empty = screen.getAllByTestId('star-empty');
    expect(empty).toHaveLength(3);
    expect(screen.queryAllByTestId('star-filled')).toHaveLength(0);
  });

  it('renders all filled stars when earned equals total', () => {
    render(<StarDisplay earned={3} total={3} />);
    const filled = screen.getAllByTestId('star-filled');
    expect(filled).toHaveLength(3);
    expect(screen.queryAllByTestId('star-empty')).toHaveLength(0);
  });

  it('renders the star-display container', () => {
    render(<StarDisplay earned={1} total={3} />);
    expect(screen.getByTestId('star-display')).toBeInTheDocument();
  });

  it('accepts size prop without errors', () => {
    const { unmount } = render(<StarDisplay earned={1} total={3} size="lg" />);
    expect(screen.getByTestId('star-display')).toBeInTheDocument();
    unmount();

    render(<StarDisplay earned={1} total={3} size="sm" />);
    expect(screen.getByTestId('star-display')).toBeInTheDocument();
  });
});
