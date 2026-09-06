import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationBell } from './NotificationBell';

const sendReply = vi.fn(async () => true);

vi.mock('../../services/announcementsService', () => ({
  fetchInbox: vi.fn(async () => ({
    broadcasts: [{ id: 'b1', title: 'Welcome', body: 'New app — be patient.', date: '2026-09-06' }],
    thread: [{ from: 'dev', body: 'Thanks for testing!', ts: 1000 }],
  })),
  fetchAnnouncements: vi.fn(async () => []),
  getLastSeenId: vi.fn(async () => null),
  markAllSeen: vi.fn(async () => undefined),
  hasUnread: () => true,
  sendReply: (...a: unknown[]) => sendReply(...a),
  hasUnreadThread: () => false,
  getLastSeenThreadTs: vi.fn(async () => 0),
  markThreadSeen: vi.fn(async () => undefined),
  getAdminSecret: vi.fn(async () => null), // NOT David → no admin UI
  setAdminSecret: vi.fn(async () => undefined),
  verifyAdminSecret: vi.fn(async () => false),
  sendBroadcast: vi.fn(async () => true),
  fetchAllThreads: vi.fn(async () => []),
  sendDevReply: vi.fn(async () => true),
}));

describe('NotificationBell', () => {
  it('portals the panel to document.body so a TRANSFORMED ancestor cannot clip it', async () => {
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

  it('shows the broadcast, the thread, and lets a user reply', async () => {
    render(<NotificationBell />);
    fireEvent.click(await screen.findByTestId('notification-bell'));
    expect(await screen.findByText('Welcome')).toBeTruthy();
    expect(screen.getByText('Thanks for testing!')).toBeTruthy();

    const input = screen.getByTestId('user-reply-input');
    fireEvent.change(input, { target: { value: 'How do I import games?' } });
    fireEvent.click(screen.getByTestId('user-reply-send'));
    await waitFor(() => expect(sendReply).toHaveBeenCalledWith('How do I import games?'));
  });

  it('hides all admin controls for a non-developer device', async () => {
    render(<NotificationBell />);
    fireEvent.click(await screen.findByTestId('notification-bell'));
    await screen.findByTestId('notification-panel');
    expect(screen.queryByTestId('admin-tab-broadcast')).toBeNull();
    expect(screen.queryByTestId('broadcast-composer')).toBeNull();
    expect(screen.queryByTestId('admin-tab-threads')).toBeNull();
  });
});
