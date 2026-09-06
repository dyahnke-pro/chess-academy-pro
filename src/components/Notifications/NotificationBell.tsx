import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, MessageSquarePlus } from 'lucide-react';
import {
  fetchAnnouncements,
  getLastSeenId,
  markAllSeen,
  hasUnread,
  type Announcement,
} from '../../services/announcementsService';

/**
 * NotificationBell — the home-screen bell (David 2026-09-06: "The bell is only
 * on the Home Screen… nice and big-ish, top right corner just like every other
 * bell message icon").
 *
 * A message from the developer to users. The messages are fetched at runtime
 * from `/announcements.json` on the app origin, so a new note reaches native
 * App Store users without an App Store release. A red dot shows while the newest
 * message is unseen; opening the panel marks it seen (persisted per-device in
 * Dexie `meta`, per the no-localStorage rule). The panel offers a one-tap
 * "Send feedback" that opens the existing feedback composer.
 *
 * NOTE: two-way replies (the developer answering a user's feedback in this
 * panel) are a planned follow-up — this ships the one-way announcement + the
 * feedback hand-off.
 */
export function NotificationBell(): JSX.Element {
  const [messages, setMessages] = useState<Announcement[]>([]);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [msgs, seen] = await Promise.all([fetchAnnouncements(), getLastSeenId()]);
      if (!alive) return;
      setMessages(msgs);
      setLastSeenId(seen);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const unread = hasUnread(messages, lastSeenId);

  const openPanel = useCallback(() => {
    setOpen(true);
    if (messages.length > 0) {
      void markAllSeen(messages[0].id);
      setLastSeenId(messages[0].id);
    }
  }, [messages]);

  const sendFeedback = useCallback(() => {
    // The always-on QuickFeedbackButton (in AppLayout) listens for this and
    // opens its composer — reuse it rather than duplicate the feedback form.
    window.dispatchEvent(new CustomEvent('open-feedback'));
    setOpen(false);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        aria-label={unread ? 'Messages — you have a new message' : 'Messages'}
        data-testid="notification-bell"
        className="relative p-2 rounded-full text-theme-text transition-colors hover:opacity-80"
      >
        <Bell size={26} />
        {unread && (
          <span
            data-testid="notification-dot"
            className="absolute right-1 top-1 h-3 w-3 rounded-full bg-red-500"
            style={{ boxShadow: '0 0 0 2px var(--color-bg)' }}
          />
        )}
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16"
          onClick={() => setOpen(false)}
          data-testid="notification-overlay"
        >
          <div
            className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-xl"
            style={{ background: 'var(--color-surface)' }}
            onClick={(e) => e.stopPropagation()}
            data-testid="notification-panel"
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h2 className="font-bold text-theme-text">Messages</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded p-1 text-theme-text hover:opacity-70"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {loading ? (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Loading…
                </p>
              ) : messages.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  No messages yet.
                </p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-theme-text">{msg.title}</h3>
                      <span className="shrink-0 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {msg.date}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-theme-text">{msg.body}</p>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={sendFeedback}
                data-testid="notification-send-feedback"
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-theme-accent py-2.5 font-semibold text-theme-accent hover:opacity-80"
              >
                <MessageSquarePlus size={18} /> Send feedback
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
