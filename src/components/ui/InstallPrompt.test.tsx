import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { InstallPrompt } from './InstallPrompt';
import { db } from '../../db/schema';

describe('InstallPrompt', () => {
  beforeEach(async () => {
    await db.meta.clear();
  });

  it('renders nothing when no beforeinstallprompt event fired', () => {
    const { container } = render(<InstallPrompt />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when previously dismissed', async () => {
    await db.meta.put({ key: 'install_dismissed', value: 'true' });
    const { container } = render(<InstallPrompt />);
    // Wait a tick for the async check
    await vi.waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('shows banner when beforeinstallprompt fires and not dismissed', async () => {
    render(<InstallPrompt />);

    // Wait for the async dismissed check
    await vi.waitFor(() => {
      // Simulate beforeinstallprompt
      const event = new Event('beforeinstallprompt');
      Object.assign(event, {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      });
      window.dispatchEvent(event);
    });

    await vi.waitFor(() => {
      expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
    });
  });
});
