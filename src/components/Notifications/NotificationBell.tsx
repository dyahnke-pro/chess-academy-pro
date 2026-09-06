import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, MessageSquarePlus, Send, ArrowLeft, Megaphone, Gift } from 'lucide-react';
import {
  fetchInbox,
  getLastSeenId,
  markAllSeen,
  hasUnread,
  sendReply,
  hasUnreadThread,
  getLastSeenThreadTs,
  markThreadSeen,
  getAdminSecret,
  setAdminSecret,
  verifyAdminSecret,
  sendBroadcast,
  fetchAllThreads,
  sendDevReply,
  type Announcement,
  type ThreadMessage,
} from '../../services/announcementsService';

/**
 * NotificationBell — the Home-screen developer ↔ user message channel.
 *
 * User side: read the developer's broadcasts + your own private thread, and
 * reply. Admin side (David only, unlocked by the stored admin secret): broadcast
 * to all users, and reply to any user inside their thread. All writes are gated
 * SERVER-SIDE by /api/messages; the secret never ships in the bundle. The panel
 * is portalled to document.body so a transformed header ancestor can't clip it
 * (the 2026-09-06 gray-strip bug).
 */

const POLL_MS = 15_000;

function Bubble({ m }: { m: ThreadMessage }): JSX.Element {
  const mine = m.from === 'user';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[80%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm"
        style={{
          background: mine ? 'var(--color-accent)' : 'var(--color-bg)',
          color: mine ? '#fff' : 'var(--color-text)',
        }}
      >
        {m.body}
      </div>
    </div>
  );
}

export function NotificationBell(): JSX.Element {
  const [broadcasts, setBroadcasts] = useState<Announcement[]>([]);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const [lastSeenThreadTs, setLastSeenThreadTs] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');

  // Admin (David) state.
  const [admin, setAdmin] = useState(false);
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [secretText, setSecretText] = useState('');
  const [secretError, setSecretError] = useState(false);
  const [adminView, setAdminView] = useState<'user' | 'broadcast' | 'threads'>('user');
  const [threads, setThreads] = useState<{ device: string; messages: ThreadMessage[] }[]>([]);
  const [activeDevice, setActiveDevice] = useState<string | null>(null);
  const [bTitle, setBTitle] = useState('');
  const [bBody, setBBody] = useState('');
  const [devReplyText, setDevReplyText] = useState('');

  const loadInbox = useCallback(async () => {
    const inbox = await fetchInbox();
    setBroadcasts(inbox.broadcasts);
    setThread(inbox.thread);
    return inbox;
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [inbox, seen, seenTs, secret] = await Promise.all([
        fetchInbox(), getLastSeenId(), getLastSeenThreadTs(), getAdminSecret(),
      ]);
      if (!alive) return;
      setBroadcasts(inbox.broadcasts);
      setThread(inbox.thread);
      setLastSeenId(seen);
      setLastSeenThreadTs(seenTs);
      setAdmin(!!secret);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // Poll while the panel is open so new messages arrive without a reopen.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!open) { if (pollRef.current) clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(() => {
      void loadInbox();
      if (admin && adminView === 'threads') void fetchAllThreads().then(setThreads);
    }, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, admin, adminView, loadInbox]);

  // Every bell instance (header + sidebar) clears together when ANY of them
  // marks messages seen — re-read the shared markers from Dexie on the event.
  useEffect(() => {
    const sync = (): void => {
      void getLastSeenId().then(setLastSeenId);
      void getLastSeenThreadTs().then(setLastSeenThreadTs);
    };
    window.addEventListener('messages-seen', sync);
    return () => window.removeEventListener('messages-seen', sync);
  }, []);

  const unread = hasUnread(broadcasts, lastSeenId) || hasUnreadThread(thread, lastSeenThreadTs);

  const openPanel = useCallback(() => {
    setOpen(true);
    if (broadcasts.length > 0) { void markAllSeen(broadcasts[0].id); setLastSeenId(broadcasts[0].id); }
    const newestDev = thread.filter((m) => m.from === 'dev').at(-1);
    if (newestDev) { void markThreadSeen(newestDev.ts); setLastSeenThreadTs(newestDev.ts); }
  }, [broadcasts, thread]);

  const submitReply = useCallback(async () => {
    const text = replyText.trim();
    if (!text) return;
    setReplyText('');
    setThread((t) => [...t, { from: 'user', body: text, ts: Date.now() }]); // optimistic
    await sendReply(text);
    await loadInbox();
  }, [replyText, loadInbox]);

  const sendFeedback = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-feedback'));
    setOpen(false);
  }, []);

  const inviteFriend = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-referral'));
    setOpen(false);
  }, []);

  // Admin unlock: enter the secret, verify by attempting an admin read.
  const tryUnlock = useCallback(async () => {
    const s = secretText.trim();
    if (!s) return;
    // Verify against the server FIRST (200 vs 401) so a wrong key never fakes the
    // admin UI. Only store + unlock on a real 200.
    const valid = await verifyAdminSecret(s);
    if (!valid) { setSecretError(true); setSecretText(''); return; }
    await setAdminSecret(s);
    setThreads(await fetchAllThreads());
    setAdmin(true);
    setShowSecretInput(false);
    setSecretText('');
    setSecretError(false);
    setAdminView('threads');
  }, [secretText]);

  const submitBroadcast = useCallback(async () => {
    if (!bBody.trim()) return;
    const ok = await sendBroadcast(bTitle, bBody);
    if (ok) { setBTitle(''); setBBody(''); await loadInbox(); setAdminView('user'); }
  }, [bTitle, bBody, loadInbox]);

  const openThread = useCallback(async (device: string) => {
    setActiveDevice(device);
    const all = await fetchAllThreads();
    setThreads(all);
  }, []);

  const submitDevReply = useCallback(async () => {
    if (!activeDevice || !devReplyText.trim()) return;
    const text = devReplyText.trim();
    setDevReplyText('');
    await sendDevReply(activeDevice, text);
    setThreads(await fetchAllThreads());
  }, [activeDevice, devReplyText]);

  const activeThread = threads.find((t) => t.device === activeDevice);

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
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h2
                className="font-bold text-theme-text"
                // Hidden admin unlock: a long-press reveals the secret entry.
                onPointerDown={() => {
                  const t = setTimeout(() => setShowSecretInput(true), 700);
                  const cancel = () => { clearTimeout(t); window.removeEventListener('pointerup', cancel); };
                  window.addEventListener('pointerup', cancel);
                }}
              >
                {admin && adminView !== 'user' ? (adminView === 'broadcast' ? 'Broadcast' : activeDevice ? 'Reply' : 'User messages') : 'Messages'}
              </h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1 text-theme-text hover:opacity-70">
                <X size={20} />
              </button>
            </div>

            {/* Admin toolbar */}
            {admin && (
              <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <button type="button" data-testid="admin-tab-user" onClick={() => { setAdminView('user'); setActiveDevice(null); }} className={`rounded-lg px-2 py-1 text-xs font-semibold ${adminView === 'user' ? 'text-theme-accent' : 'text-theme-text opacity-60'}`}>Inbox</button>
                <button type="button" data-testid="admin-tab-broadcast" onClick={() => setAdminView('broadcast')} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${adminView === 'broadcast' ? 'text-theme-accent' : 'text-theme-text opacity-60'}`}><Megaphone size={13} /> Broadcast</button>
                <button type="button" data-testid="admin-tab-threads" onClick={() => { setAdminView('threads'); setActiveDevice(null); void fetchAllThreads().then(setThreads); }} className={`rounded-lg px-2 py-1 text-xs font-semibold ${adminView === 'threads' && !activeDevice ? 'text-theme-accent' : 'text-theme-text opacity-60'}`}>Threads</button>
              </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {showSecretInput && (
                <div className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
                  <label className="text-xs font-semibold text-theme-text">Developer key</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="password" value={secretText} onChange={(e) => setSecretText(e.target.value)}
                      data-testid="admin-secret-input"
                      className="flex-1 rounded-lg px-2 py-1 text-sm" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    />
                    <button type="button" onClick={() => void tryUnlock()} data-testid="admin-unlock" className="rounded-lg bg-theme-accent px-3 py-1 text-sm font-semibold text-white">Unlock</button>
                  </div>
                  {secretError && <p className="mt-1 text-xs text-red-500">Invalid key.</p>}
                </div>
              )}

              {loading ? (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
              ) : admin && adminView === 'broadcast' ? (
                <div className="space-y-2" data-testid="broadcast-composer">
                  <input value={bTitle} onChange={(e) => setBTitle(e.target.value)} placeholder="Title (optional)" className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
                  <textarea value={bBody} onChange={(e) => setBBody(e.target.value)} placeholder="Message to all users…" rows={5} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
                  <button type="button" onClick={() => void submitBroadcast()} data-testid="broadcast-send" className="flex w-full items-center justify-center gap-2 rounded-xl bg-theme-accent py-2.5 font-semibold text-white hover:opacity-90"><Megaphone size={16} /> Send to all users</button>
                </div>
              ) : admin && adminView === 'threads' && !activeDevice ? (
                threads.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No user messages yet.</p>
                ) : (
                  threads.map((t) => (
                    <button key={t.device} type="button" onClick={() => void openThread(t.device)} data-testid="thread-row" className="w-full rounded-xl p-3 text-left" style={{ background: 'var(--color-bg)' }}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-xs text-theme-text">{t.device.slice(0, 8)}…</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.messages.length} msg</span>
                      </div>
                      <p className="mt-1 truncate text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.messages.at(-1)?.body ?? ''}</p>
                    </button>
                  ))
                )
              ) : admin && activeDevice ? (
                <>
                  <button type="button" onClick={() => setActiveDevice(null)} className="flex items-center gap-1 text-xs text-theme-accent"><ArrowLeft size={14} /> All threads</button>
                  {(activeThread?.messages ?? []).map((m, i) => <Bubble key={i} m={m} />)}
                </>
              ) : (
                // ── USER VIEW: broadcasts + your thread ──
                <>
                  {broadcasts.length === 0 && thread.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No messages yet.</p>
                  ) : (
                    broadcasts.map((msg) => (
                      <div key={msg.id} className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="font-semibold text-theme-text">{msg.title}</h3>
                          <span className="shrink-0 text-xs" style={{ color: 'var(--color-text-muted)' }}>{msg.date}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm text-theme-text">{msg.body}</p>
                      </div>
                    ))
                  )}
                  {thread.length > 0 && (
                    <div className="space-y-2 pt-1" data-testid="user-thread">
                      {thread.map((m, i) => <Bubble key={i} m={m} />)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer: reply composer for the active conversation */}
            <div className="px-4 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
              {admin && activeDevice ? (
                <div className="flex gap-2">
                  <input value={devReplyText} onChange={(e) => setDevReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submitDevReply(); }} placeholder="Reply to this user…" className="flex-1 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
                  <button type="button" onClick={() => void submitDevReply()} data-testid="dev-reply-send" aria-label="Send reply" className="rounded-xl bg-theme-accent px-3 text-white"><Send size={18} /></button>
                </div>
              ) : (admin && (adminView === 'broadcast' || adminView === 'threads')) ? null : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submitReply(); }} data-testid="user-reply-input" placeholder="Reply to the developer…" className="flex-1 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
                    <button type="button" onClick={() => void submitReply()} data-testid="user-reply-send" aria-label="Send reply" className="rounded-xl bg-theme-accent px-3 text-white"><Send size={18} /></button>
                  </div>
                  <button type="button" onClick={sendFeedback} data-testid="notification-send-feedback" className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-theme-accent py-2 text-sm font-semibold text-theme-accent hover:opacity-80">
                    <MessageSquarePlus size={16} /> Send feedback
                  </button>
                  <button type="button" onClick={inviteFriend} data-testid="notification-invite-friend" className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-theme-accent hover:opacity-80">
                    <Gift size={16} /> Invite a friend — get a free class
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
