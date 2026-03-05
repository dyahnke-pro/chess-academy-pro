import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { ThemeToggle } from './ThemeToggle';
import { useAppStore } from '../../stores/appStore';

vi.mock('../../services/themeService', async () => {
  const actual = await vi.importActual<typeof import('../../services/themeService')>('../../services/themeService');
  return {
    ...actual,
    applyTheme: vi.fn(),
  };
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it('renders the palette button', () => {
    render(<ThemeToggle />);
    expect(screen.getByTestId('theme-toggle-btn')).toBeInTheDocument();
    expect(screen.getByText('Themes')).toBeInTheDocument();
  });

  it('does not show popover initially', () => {
    render(<ThemeToggle />);
    expect(screen.queryByTestId('theme-popover')).not.toBeInTheDocument();
  });

  it('opens popover on click', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByTestId('theme-toggle-btn'));
    expect(screen.getByTestId('theme-popover')).toBeInTheDocument();
  });

  it('closes popover on second click', () => {
    render(<ThemeToggle />);
    const btn = screen.getByTestId('theme-toggle-btn');
    fireEvent.click(btn);
    expect(screen.getByTestId('theme-popover')).toBeInTheDocument();

    fireEvent.click(btn);
    expect(screen.queryByTestId('theme-popover')).not.toBeInTheDocument();
  });

  it('contains ThemePickerPanel when open', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByTestId('theme-toggle-btn'));
    expect(screen.getByTestId('theme-picker-panel')).toBeInTheDocument();
  });

  it('closes popover on outside click', () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <ThemeToggle />
      </div>,
    );
    fireEvent.click(screen.getByTestId('theme-toggle-btn'));
    expect(screen.getByTestId('theme-popover')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByTestId('theme-popover')).not.toBeInTheDocument();
  });
});
