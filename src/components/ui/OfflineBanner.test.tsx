import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '../../test/utils';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
  });

  it('renders nothing when online', () => {
    const { container } = render(<OfflineBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('renders banner when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    render(<OfflineBanner />);
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
  });

  it('shows banner when going offline', () => {
    render(<OfflineBanner />);
    expect(screen.queryByTestId('offline-banner')).toBeNull();

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
  });

  it('hides banner when coming back online', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    render(<OfflineBanner />);
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });
});
