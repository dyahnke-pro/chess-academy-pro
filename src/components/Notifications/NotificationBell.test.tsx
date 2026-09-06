import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationBell } from './NotificationBell';

vi.mock('../../services/announcementsService', () => ({
  fetchAnnouncements: vi.fn(async () => [
    { id: 'a1', title: 'Welcome', body: 'This is a new app — be patient.', date: '2026-09-06' },
  ]),
  getLastSeenId: vi.fn(async () => null),
  markAllSeen: vi.fn(async () => undefined),
  hasUnread: () => true,
}));

describe('NotificationBell', () => {
  it('portals the panel to document.body so a TRANSFORMED ancestor cannot clip it', async () => {
    // Repro of the 2026-09-06 bug: the bell lived inside a `-translate-y-1/2`
    // wrapper; a transformed ancestor becomes the containing block for a
    // `fixed` child, collapsing the overlay into a thin strip on the right.
    // The fix (createPortal → document.body) must keep the panel OUT of the
    // transformed subtree.
    render(
      <div style={{ transform: 'translateY(-50%)' }} data-testid="xform">
        <NotificationBell />
      </div>,
    );
    fireEvent.click(await screen.findByTestId('notification-bell'));
    const panel = await screen.findByTestId('notification-panel');
    expect(screen.getByTestId('xform').contains(panel)).toBe(false);
    expect(document.body.contains(panel)).toBe(true);
  });

  it('shows the developer message and a Send feedback affordance when opened', async () => {
    render(<NotificationBell />);
    fireEvent.click(await screen.findByTestId('notification-bell'));
    expect(await screen.findByText('Welcome')).toBeTruthy();
    expect(screen.getByTestId('notification-send-feedback')).toBeTruthy();
  });
});
