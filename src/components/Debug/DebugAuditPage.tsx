import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NarrationAuditPanel } from '../Settings/NarrationAuditPanel';
import { getAppAuditLog } from '../../services/appAuditor';
import { formatLogAsMarkdown } from '../Settings/NarrationAuditPanel';

/**
 * `/debug/audit` — back-door route for the audit log. Not linked from
 * anywhere in the app UI; deep-link only. Useful when Settings isn't
 * reachable (error boundary hit, unexpected UI state) or when the
 * user wants to share "here's the log" in one step.
 *
 * Query params:
 *   ?copy=1   → auto-copies the log to clipboard on mount
 */
export function DebugAuditPage(): JSX.Element {
  const [search] = useSearchParams();
  const autoCopy = search.get('copy') === '1';

  useEffect(() => {
    if (!autoCopy) return;
    void (async () => {
      const log = await getAppAuditLog();
      const md = formatLogAsMarkdown(log);
      try {
        await navigator.clipboard.writeText(md);
      } catch {
        // Fallback via transient textarea.
        const textarea = document.createElement('textarea');
        textarea.value = md;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
        } finally {
          document.body.removeChild(textarea);
        }
      }
    })();
  }, [autoCopy]);

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      data-testid="debug-audit-page"
    >
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold">Audit back-door</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Full audit log — narration, runtime, subsystem, app. Visit
            <code className="mx-1 px-1 rounded" style={{ background: 'var(--color-surface)' }}>
              /debug/audit?copy=1
            </code>
            to auto-copy on load. Also available from DevTools as
            <code className="mx-1 px-1 rounded" style={{ background: 'var(--color-surface)' }}>
              await __AUDIT__.copy()
            </code>
            .
          </p>
          <details className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
            <summary className="cursor-pointer">Live-watch setup (optional)</summary>
            <div className="mt-2 space-y-1 pl-2">
              <p>
                To stream each audit event to <code>/api/audit-stream</code> so
                Claude can watch in real time during a session:
              </p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Enable Vercel KV in the project dashboard (one click).</li>
                <li>Set <code>AUDIT_STREAM_SECRET</code> env var to any long random string.</li>
                <li>Run these two commands in this tab&rsquo;s DevTools console:</li>
              </ol>
              <pre className="mt-1 p-2 rounded overflow-x-auto" style={{ background: 'var(--color-surface)' }}>
{`localStorage.setItem('auditStreamUrl', location.origin + '/api/audit-stream');
localStorage.setItem('auditStreamSecret', 'PASTE_SAME_SECRET');`}
              </pre>
              <p className="mt-1">
                After setup, every new audit event POSTs to the endpoint. Claude
                polls <code>GET /api/audit-stream?since=&lt;ms&gt;</code> and sees
                new entries within seconds. Default behaviour is still
                local-only — no data leaves the device unless both keys are set.
              </p>
            </div>
          </details>
        </div>
        <NarrationAuditPanel />
      </div>
    </div>
  );
}
