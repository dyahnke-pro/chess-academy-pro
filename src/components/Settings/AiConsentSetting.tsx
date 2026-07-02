import { ShieldCheck } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useAiConsentStore } from '../../stores/aiConsentStore';

/**
 * Settings control to view and change the AI data-sharing consent
 * (Apple 5.1.1 — the privacy policy links users here to manage it).
 *
 * Self-contained: reads the active profile straight from the store so it can
 * be dropped into the Settings data/privacy area without prop threading.
 * Turning it ON opens the full-disclosure AiConsentModal; turning it OFF
 * records 'denied', after which the coach re-prompts before any AI call.
 */
export function AiConsentSetting(): JSX.Element | null {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  if (!activeProfile) return null;

  const status = activeProfile.aiDataConsent;
  const granted = status === 'granted';

  const turnOff = (): void => {
    setActiveProfile({ ...activeProfile, aiDataConsent: 'denied' });
  };
  const turnOn = (): void => {
    // Opens the blocking consent modal (full disclosure) since consent isn't
    // currently granted; the modal persists 'granted' on Allow.
    void useAiConsentStore.getState().requestConsent();
  };

  return (
    <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck size={16} style={{ color: 'var(--color-accent)' }} />
        Privacy — AI coach data sharing
      </div>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {granted
          ? 'On — your board positions and questions are sent to our AI providers (DeepSeek, Anthropic) and AWS Polly to power the coach and its voice.'
          : 'Off — the AI coach and voice are disabled and no gameplay data is sent to the AI providers. The rest of the app still works.'}
      </p>
      <button
        onClick={granted ? turnOff : turnOn}
        className="w-full py-2 rounded-lg text-sm font-medium"
        style={{
          background: granted ? 'transparent' : 'var(--color-accent)',
          color: granted ? 'var(--color-text)' : '#fff',
          border: granted ? '1px solid var(--color-border)' : 'none',
        }}
        data-testid="ai-consent-setting-toggle"
      >
        {granted ? 'Turn off AI data sharing' : 'Turn on AI coach'}
      </button>
    </div>
  );
}
