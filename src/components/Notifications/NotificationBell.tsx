import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, MessageSquarePlus, Send, ArrowLeft, Megaphone, Gift, Inbox, Star } from 'lucide-react';
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
  fetchFeedback,
  hasUnreadFeedback,
  getLastSeenFeedbackTs,
  markFeedbackSeen,
  type Announcement,
  type ThreadMessage,
  type FeedbackItem,
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
  const [adminView, setAdminView] = useState<'user' | 'broadcast' | 'threads' | 'feedback'>('user');
  const [threads, setThreads] = useState<{ device: string; messages: ThreadMessage[] }[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [lastSeenFeedbackTs, setLastSeenFeedbackTs] = useState(0);
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
      const [inbox, seen, seenTs, seenFbTs, secret] = await Promise.all([
        fetchInbox(), getLastSeenId(), getLastSeenThreadTs(), getLastSeenFeedbackTs(), getAdminSecret(),
      ]);
      if (!alive) return;
      setBroadcasts(inbox.broadcasts);
      setThread(inbox.thread);
      setLastSeenId(seen);
      setLastSeenThreadTs(seenTs);
      setLastSeenFeedbackTs(seenFbTs);
      setAdmin(!!secret);
      setLoading(false);
      // Admin only: pull feedback so the dot can light for David without the
      // panel being open. No other user has the secret, so no other user's
      // bell ever fetches (or alerts on) feedback.
      if (secret) { const fb = await fetchFeedback(); if (alive) setFeedback(fb); }
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
      if (admin) void fetchFeedback().then(setFeedback);
    }, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, admin, adminView, loadInbox]);

  // Admin-only slow background poll so David's bell dot lights when feedback
  // arrives even with the panel closed. One device (his), one GET/min — no
  // meaningful load. Non-admin devices never run this (no secret → no fetch).
  useEffect(() => {
    if (!admin || open) return;
    const id = setInterval(() => { void fetchFeedback().then(setFeedback); }, 60_000);
    return () => clearInterval(id);
  }, [admin, open]);

  // Every bell instance (header + sidebar) clears together when ANY of them
  // marks messages seen — re-read the shared markers from Dexie on the event.
  useEffect(() => {
    const sync = (): void => {
      void getLastSeenId().then(setLastSeenId);
      void getLastSeenThreadTs().then(setLastSeenThreadTs);
      void getLastSeenFeedbackTs().then(setLastSeenFeedbackTs);
    };
    window.addEventListener('messages-seen', sync);
    return () => window.removeEventListener('messages-seen', sync);
  }, []);

  // The feedback alert is admin-gated: only David's bell (which holds the
  // secret) ever fetches feedback, so `feedback` is empty for every other
  // user and this term is always false for them (David 2026-09-07).
  const unreadFeedback = admin && hasUnreadFeedback(feedback, lastSeenFeedbackTs);
  const unread = hasUnread(broadcasts, lastSeenId) || hasUnreadThread(thread, lastSeenThreadTs) || unreadFeedback;

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
    setFeedback(await fetchFeedback());
    setAdmin(true);
    setShowSecretInput(false);
    setSecretText('');
    setSecretError(false);
    setAdminView('threads');
  }, [secretText]);

  // Opening the Feedback tab clears the alert up to the newest item seen.
  const openFeedbackTab = useCallback(async () => {
    const items = await fetchFeedback();
    setFeedback(items);
    const newestTs = items.reduce((mx, f) => Math.max(mx, f.ts), 0);
    if (newestTs > 0) { await markFeedbackSeen(newestTs); setLastSeenFeedbackTs(newestTs); }
  }, []);

  // Reply to a feedback sender — threads it into their own 1:1 conversation,
  // reusing the existing dev-reply channel (David 2026-09-07: "respond to the
  // person that sent it"). Jumps to that device's thread view.
  const replyToFeedback = useCallback((device: string) => {
    if (!device || device === 'unknown') return;
    setActiveDevice(device);
    setAdminView('threads');
    void fetchAllThreads().then(setThreads);
  }, []);

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
                // iOS fires its native text-selection menu (Copy / Look Up) on a
                // long-press of selectable text, which stole this gesture on
                // David's phone (2026-09-07). Disable selection + the callout so
                // the hold reaches our handler instead of the OS menu.
                style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'manipulation' } as React.CSSProperties}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={() => {
                  const t = setTimeout(() => setShowSecretInput(true), 700);
                  const cancel = () => { clearTimeout(t); window.removeEventListener('pointerup', cancel); };
                  window.addEventListener('pointerup', cancel);
                }}
              >
                {admin && adminView !== 'user' ? (adminView === 'broadcast' ? 'Broadcast' : adminView === 'feedback' ? 'Feedback' : activeDevice ? 'Reply' : 'User messages') : 'Messages'}
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
                <button type="button" data-testid="admin-tab-feedback" onClick={() => { setAdminView('feedback'); setActiveDevice(null); void fetchFeedback().then(setFeedback); void openFeedbackTab(); }} className={`relative flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${adminView === 'feedback' ? 'text-theme-accent' : 'text-theme-text opacity-60'}`}>
                  <Inbox size={13} /> Feedback
                  {unreadFeedback && <span data-testid="admin-feedback-dot" className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                </button>
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
              ) : admin && adminView === 'feedback' ? (
                feedback.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No feedback yet.</p>
                ) : (
                  feedback.map((f) => (
                    <div key={f.id} data-testid="feedback-row" className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-accent" style={{ background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)' }}>{f.category}</span>
                        {typeof f.rating === 'number' && (
                          <span className="flex items-center gap-0.5 text-xs text-yellow-500"><Star size={11} fill="currentColor" /> {f.rating}/5</span>
                        )}
                        <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(f.ts).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-line text-sm text-theme-text">{f.message}</p>
                      <div className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {f.name || 'Anonymous'}{f.route ? ` · ${f.route}` : ''}{f.email ? ` · ${f.email}` : ''}
                      </div>
                      {f.device && f.device !== 'unknown' && (
                        <button type="button" data-testid="feedback-reply" onClick={() => replyToFeedback(f.device)} className="mt-2 flex items-center gap-1 rounded-lg border border-theme-accent px-2.5 py-1 text-xs font-semibold text-theme-accent hover:opacity-80">
                          <Send size={12} /> Reply to sender
                        </button>
                      )}
                    </div>
                  ))
                )
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
              ) : (admin && (adminView === 'broadcast' || adminView === 'threads' || adminView === 'feedback')) ? null : (
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
