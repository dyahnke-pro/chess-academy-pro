/**
 * DataDropPanel — Settings → "Send my data to Claude" (David 2026-10-18).
 * One tap sends the student's own record (`dataDrop.sendMyData`) and shows the
 * code to paste into the chat. Says plainly what is sent, before the tap.
 * Renders only on the owner's devices — the server decides (`canSendMyData`).
 */
import { useState, useCallback, useEffect } from 'react';
import { Send, CheckCircle, AlertTriangle, Loader2, Copy } from 'lucide-react';
import { sendMyData, canSendMyData } from '../../services/dataDrop';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function DataDropPanel(): JSX.Element | null {
  const [owner, setOwner] = useState(false);
  useEffect(() => { let live = true; void canSendMyData().then((ok) => { if (live) setOwner(ok); }); return () => { live = false; }; }, []);
  const [status, setStatus] = useState<Status>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSend = useCallback(async (): Promise<void> => {
    if (status === 'sending') return;
    setStatus('sending');
    setCopied(false);
    const r = await sendMyData();
    if (r.ok && r.code) {
      setCode(r.code);
      setStatus('sent');
    } else {
      setError(r.error ?? 'Could not send');
      setStatus('error');
    }
  }, [status]);

  const handleCopy = useCallback(async (): Promise<void> => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setCopied(true); } catch { setCopied(false); }
  }, [code]);

  if (!owner) return null;
  return (
    <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
    <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)' }} data-testid="data-drop-panel">
      <div className="flex items-center gap-2 mb-1">
        <Send size={16} style={{ color: 'var(--color-accent)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Send my data to Claude</span>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Sends your games, their analysis, the mistakes the coach recorded and your skill map to the developer,
        so a question about the coach can be answered from your real record. Nothing is sent until you tap.
      </p>
      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={status === 'sending'}
        data-testid="data-drop-send"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
      >
        {status === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        {status === 'sending' ? 'Sending…' : 'Send my data'}
      </button>
      {status === 'sent' && code && (
        <div className="mt-3 text-xs space-y-2" data-testid="data-drop-code">
          <div className="flex items-center gap-1" style={{ color: 'var(--color-text)' }}>
            <CheckCircle size={14} className="text-green-400" /> Sent. Paste this code into the chat:
          </div>
          <div className="flex items-center gap-2">
            <code className="px-2 py-1 rounded break-all" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>{code}</code>
            <button type="button" onClick={() => void handleCopy()} aria-label="Copy code" data-testid="data-drop-copy">
              <Copy size={14} style={{ color: 'var(--color-text-muted)' }} />
            </button>
            {copied && <span style={{ color: 'var(--color-text-muted)' }}>Copied</span>}
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="mt-3 flex items-center gap-1 text-xs text-rose-300" data-testid="data-drop-error">
          <AlertTriangle size={14} /> Could not send ({error}). Try again in a moment.
        </div>
      )}
    </div>
    </div>
  );
}
