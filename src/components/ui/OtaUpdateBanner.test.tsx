import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OtaUpdateBanner } from './OtaUpdateBanner';

const install = vi.fn(async () => true);
vi.mock('../../services/otaObserver', () => ({
  installStagedBundleOnLaunch: () => install(),
}));

describe('OtaUpdateBanner', () => {
  it('stays hidden until an update is staged, then Restart now applies it', async () => {
    render(<OtaUpdateBanner />);
    expect(screen.queryByTestId('ota-update-banner')).toBeNull();
    fireEvent(window, new CustomEvent('ota-update-staged', { detail: { version: 'abc123' } }));
    expect(await screen.findByTestId('ota-update-banner')).toBeTruthy();
    fireEvent.click(screen.getByTestId('ota-restart-now'));
    await waitFor(() => expect(install).toHaveBeenCalled());
  });

  it('Not now dismisses without restarting (update lands next cold launch)', () => {
    render(<OtaUpdateBanner />);
    fireEvent(window, new CustomEvent('ota-update-staged'));
    expect(screen.getByTestId('ota-update-banner')).toBeTruthy();
    fireEvent.click(screen.getByTestId('ota-not-now'));
    expect(screen.queryByTestId('ota-update-banner')).toBeNull();
  });
});
