import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useAiConsentStore } from '../../stores/aiConsentStore';
import { logAppAudit } from '../../services/appAuditor';

/**
 * AiConsentModal — the in-app permission for sharing gameplay data with the
 * coach's third-party AI + voice providers (Apple Guideline 5.1.1(i)/5.1.2(i)).
 *
 * Blocking: the user must choose Allow or Don't Allow — there is no
 * backdrop-dismiss, so a decision is always recorded before any data is
 * shared. Shown as the first-run prompt (App boot, once consent is unasked)
 * and re-shown just-in-time if a user who declined later tries the coach.
 * Global — mounted once at the app root.
 */
export function AiConsentModal(): JSX.Element | null {
  const promptOpen = useAiConsentStore((s) => s.promptOpen);
  const resolveConsent = useAiConsentStore((s) => s.resolveConsent);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  if (!promptOpen || !activeProfile) return null;

  const decide = (granted: boolean): void => {
    setActiveProfile({ ...activeProfile, aiDataConsent: granted ? 'granted' : 'denied' });
    void logAppAudit({
      kind: 'ai-consent-decision',
      category: 'app',
      source: 'AiConsentModal',
      summary: granted ? 'granted' : 'denied',
    });
    resolveConsent(granted);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="AI coaching data permission"
      data-testid="ai-consent-modal"
    >
      <div className="w-full sm:max-w-md bg-theme-surface border-t-2 sm:border-2 border-amber-500/40 rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={20} className="text-amber-400" />
          <h2 className="text-base font-bold text-theme-text">Before you use the AI coach</h2>
        </div>

        <p className="text-sm text-theme-text-muted mb-3 leading-relaxed">
          To answer your questions and speak coaching out loud, this app sends
          some of your gameplay data to trusted third-party AI and voice
          services. We only send what's needed to generate a response:
        </p>

        <ul className="text-sm text-theme-text-muted mb-3 space-y-1.5 list-disc pl-5">
          <li>
            The <strong className="text-theme-text">board position and the question you ask</strong>{' '}
            go to our AI providers — <strong className="text-theme-text">DeepSeek</strong> and{' '}
            <strong className="text-theme-text">Anthropic</strong> — to generate the coaching reply.
          </li>
          <li>
            When you talk to the coach, your{' '}
            <strong className="text-theme-text">spoken words</strong> are transcribed to text for
            that question, and the coach's reply is sent to{' '}
            <strong className="text-theme-text">AWS Polly</strong> to synthesize the voice.
          </li>
        </ul>

        <p className="text-xs text-theme-text-muted mb-4 leading-relaxed">
          We do not send your name, email, or payment info, and we don't sell
          your data. You can change this anytime in Settings. See our{' '}
          <Link to="/privacy" className="text-amber-400 underline">
            Privacy Policy
          </Link>{' '}
          for full detail.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => decide(true)}
            className="w-full px-4 py-3 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors"
            data-testid="ai-consent-allow"
          >
            Allow &amp; continue
          </button>
          <button
            type="button"
            onClick={() => decide(false)}
            className="w-full px-4 py-3 rounded-xl border-2 border-theme-border text-theme-text-muted font-medium text-sm hover:border-amber-500/40 transition-colors"
            data-testid="ai-consent-deny"
          >
            Don't allow
          </button>
        </div>

        <p className="text-[11px] text-center text-theme-text-muted mt-3 leading-relaxed">
          If you don't allow, the AI coach and voice stay off — everything else
          in the app (puzzles, openings, local Stockfish analysis) still works.
        </p>
      </div>
    </div>,
    document.body,
  );
}
