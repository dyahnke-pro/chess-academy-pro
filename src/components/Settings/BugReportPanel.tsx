/**
 * BugReportPanel — Settings → About → "Report a problem" (David 2026-06-02).
 *
 * The human feedback channel: a tester describes what felt wrong and we ship
 * it (plus build id + recent error context) to the audit-stream and PostHog
 * via `submitBugReport`. Catches the bugs no automated detector fires on —
 * wrong-but-legal content, UX confusion, "the coach said something dumb."
 */
import { useState, useCallback } from 'react';
import { MessageSquareWarning, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { submitBugReport } from '../../services/bugReport';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function BugReportPanel(): JSX.Element {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSend = useCallback(async (): Promise<void> => {
    if (!note.trim() || status === 'sending') return;
    setStatus('sending');
    const ok = await submitBugReport(note);
    if (ok) {
      setStatus('sent');
      setNote('');
    } else {
      setStatus('error');
    }
  }, [note, status]);

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--color-surface)' }}
      data-testid="bug-report-panel"
    >
      <div className="flex items-center gap-2 mb-1">
        <MessageSquareWarning size={16} style={{ color: 'var(--color-accent)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Report a problem
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Something feel off — wrong move, confusing screen, the coach said something odd?
        Tell us. We attach the recent app log automatically.
      </p>

      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          if (status !== 'idle') setStatus('idle');
        }}
        placeholder="What happened? What did you expect instead?"
        rows={4}
        data-testid="bug-report-note"
        className="w-full rounded-lg p-2 text-sm resize-none outline-none"
        style={{
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
      />

      <div className="flex items-center justify-between mt-2">
        <div className="text-xs min-h-[1rem]" aria-live="polite">
          {status === 'sent' && (
            <span className="flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
              <CheckCircle size={13} /> Thanks — sent.
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
              <AlertTriangle size={13} /> Couldn&apos;t send. Try again.
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!note.trim() || status === 'sending'}
          data-testid="bug-report-send"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        >
          {status === 'sending' ? <Loader2 size={14} className="animate-spin" /> : null}
          {status === 'sending' ? 'Sending…' : 'Send report'}
        </button>
      </div>
    </div>
  );
}
