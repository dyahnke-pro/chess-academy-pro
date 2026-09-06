import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationBell } from './NotificationBell';

// Stateful mock so the seen-marker actually moves and the sync event fires.
let seenId: string | null = null;
let seenTs = 0;
const sendReply = vi.fn(async () => true);

vi.mock('../../services/announcementsService', () => ({
  fetchInbox: vi.fn(async () => ({
    broadcasts: [{ id: 'b1', title: 'Welcome', body: 'New app — be patient.', date: '2026-09-06' }],
    thread: [{ from: 'dev', body: 'Thanks for testing!', ts: 1000 }],
  })),
  fetchAnnouncements: vi.fn(async () => []),
  getLastSeenId: vi.fn(async () => seenId),
  getLastSeenThreadTs: vi.fn(async () => seenTs),
  markAllSeen: vi.fn(async (id: string) => { seenId = id; window.dispatchEvent(new CustomEvent('messages-seen')); }),
  markThreadSeen: vi.fn(async (ts: number) => { seenTs = ts; window.dispatchEvent(new CustomEvent('messages-seen')); }),
  hasUnread: (msgs: { id: string }[], last: string | null) => msgs.length > 0 && msgs[0].id !== last,
  hasUnreadThread: (thread: { from: string; ts: number }[], lastTs: number) => thread.some((m) => m.from === 'dev' && m.ts > lastTs),
  sendReply: (...a: unknown[]) => sendReply(...a),
  getAdminSecret: vi.fn(async () => null),
  setAdminSecret: vi.fn(async () => undefined),
  verifyAdminSecret: vi.fn(async () => false),
  sendBroadcast: vi.fn(async () => true),
  fetchAllThreads: vi.fn(async () => []),
  sendDevReply: vi.fn(async () => true),
}));

beforeEach(() => { seenId = null; seenTs = 0; });

describe('NotificationBell — unread dot', () => {
  it('shows a red dot while there is an unread message, and CLEARS it once read', async () => {
    render(<NotificationBell />);
    // Unread welcome → dot visible.
    expect(await screen.findByTestId('notification-dot')).toBeTruthy();
    // Open the panel = read → dot goes away and stays away.
    fireEvent.click(screen.getByTestId('notification-bell'));
    await waitFor(() => expect(screen.queryByTestId('notification-dot')).toBeNull());
  });

  it('clears the dot on EVERY mounted bell when one is read (header + sidebar sync)', async () => {
    render(<div><span data-testid="a"><NotificationBell /></span><span data-testid="b"><NotificationBell /></span></div>);
    await waitFor(() => expect(screen.getAllByTestId('notification-dot').length).toBe(2));
    // Read on the first bell → the messages-seen event clears BOTH.
    fireEvent.click(screen.getAllByTestId('notification-bell')[0]);
    await waitFor(() => expect(screen.queryAllByTestId('notification-dot').length).toBe(0));
  });

  it('portals the panel to document.body (transformed ancestor cannot clip it)', async () => {
    render(<div style={{ transform: 'translateY(-50%)' }} data-testid="xform"><NotificationBell /></div>);
    fireEvent.click(await screen.findByTestId('notification-bell'));
    const panel = await screen.findByTestId('notification-panel');
    expect(screen.getByTestId('xform').contains(panel)).toBe(false);
    expect(document.body.contains(panel)).toBe(true);
  });

  it('hides all admin controls for a non-developer device', async () => {
    render(<NotificationBell />);
    fireEvent.click(await screen.findByTestId('notification-bell'));
    await screen.findByTestId('notification-panel');
    expect(screen.queryByTestId('admin-tab-broadcast')).toBeNull();
    expect(screen.queryByTestId('broadcast-composer')).toBeNull();
  });
});
