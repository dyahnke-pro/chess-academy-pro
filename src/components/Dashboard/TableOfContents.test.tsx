import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { TableOfContents } from './TableOfContents';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('TableOfContents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the collapsed yellow bar with no panel', () => {
    render(<TableOfContents />);
    expect(screen.getByTestId('toc-toggle')).toBeInTheDocument();
    expect(screen.queryByTestId('toc-panel')).not.toBeInTheDocument();
  });

  it('expands the panel and shows every main tab when the bar is tapped', () => {
    render(<TableOfContents />);
    fireEvent.click(screen.getByTestId('toc-toggle'));
    expect(screen.getByTestId('toc-panel')).toBeInTheDocument();
    for (const key of ['openings', 'coach', 'tactics', 'weaknesses', 'academy', 'kids', 'settings']) {
      expect(screen.getByTestId(`toc-section-${key}`)).toBeInTheDocument();
    }
  });

  it('keeps a main tab collapsed until tapped, then reveals its capabilities', () => {
    render(<TableOfContents />);
    fireEvent.click(screen.getByTestId('toc-toggle'));
    // Coach capabilities hidden until the Coach tab is expanded.
    expect(screen.queryByTestId('toc-item-learn-with-coach')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('toc-section-coach'));
    expect(screen.getByTestId('toc-item-learn-with-coach')).toBeInTheDocument();
  });

  it('expands a nested subcategory independently', () => {
    render(<TableOfContents />);
    fireEvent.click(screen.getByTestId('toc-toggle'));
    fireEvent.click(screen.getByTestId('toc-section-tactics'));
    // The "Themed Sets" subcategory is itself collapsible.
    const themed = screen.getByTestId('toc-item-themed-sets');
    expect(themed).toBeInTheDocument();
    expect(screen.queryByTestId('toc-item-forks')).not.toBeInTheDocument();
    fireEvent.click(themed);
    expect(screen.getByTestId('toc-item-forks')).toBeInTheDocument();
  });

  it('navigates when a leaf capability is tapped', () => {
    render(<TableOfContents />);
    fireEvent.click(screen.getByTestId('toc-toggle'));
    fireEvent.click(screen.getByTestId('toc-section-coach'));
    fireEvent.click(screen.getByTestId('toc-item-learn-with-coach'));
    expect(mockNavigate).toHaveBeenCalledWith('/coach/teach', undefined);
  });

  it('forwards router state for deep-linked capabilities', () => {
    render(<TableOfContents />);
    fireEvent.click(screen.getByTestId('toc-toggle'));
    fireEvent.click(screen.getByTestId('toc-section-weaknesses'));
    fireEvent.click(screen.getByTestId('toc-item-mistakes'));
    expect(mockNavigate).toHaveBeenCalledWith('/weaknesses', { state: { tab: 'mistakes' } });
  });
});
