import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { encryptApiKey } from '../../services/cryptoService';

type OnboardingStep = 1 | 2 | 3;

export function OnboardingPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'deepseek' | 'anthropic'>(activeProfile?.preferences.aiProvider ?? 'deepseek');
  const [name, setName] = useState(activeProfile?.name ?? 'Player');
  const [elo, setElo] = useState(activeProfile?.currentRating ?? 1200);
  const [status, setStatus] = useState<string | null>(null);

  const isAnthropic = provider === 'anthropic';

  const handleSaveApiKey = async (): Promise<void> => {
    if (!activeProfile || !apiKey.trim()) return;
    try {
      const { encrypted, iv } = await encryptApiKey(apiKey.trim());
      const keyPrefs = isAnthropic
        ? { anthropicApiKeyEncrypted: encrypted, anthropicApiKeyIv: iv }
        : { apiKeyEncrypted: encrypted, apiKeyIv: iv };
      const updatedPrefs = {
        ...activeProfile.preferences,
        ...keyPrefs,
        aiProvider: provider,
      };
      await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
      setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
      setStep(3);
    } catch {
      setStatus('Error saving key');
      setTimeout(() => setStatus(null), 2000);
    }
  };

  const handleSkipApiKey = async (): Promise<void> => {
    await db.meta.put({ key: 'onboarding_skipped', value: 'true' });
    setStep(3);
  };

  const handleFinish = async (): Promise<void> => {
    if (!activeProfile) return;
    const updated = {
      ...activeProfile,
      name,
      currentRating: elo,
    };
    await db.profiles.update(activeProfile.id, { name, currentRating: elo });
    setActiveProfile(updated);
    await db.meta.put({ key: 'onboarding_skipped', value: 'true' });
    void navigate('/');
  };

  return (
    <div
      className="flex flex-col items-center justify-center flex-1 p-8 gap-8"
      style={{ color: 'var(--color-text)' }}
      data-testid="onboarding-page"
    >
      {/* Step indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className="w-8 h-1 rounded-full"
            style={{ background: s <= step ? 'var(--color-accent)' : 'var(--color-border)' }}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="text-center max-w-md space-y-6">
          <div className="text-5xl">♛</div>
          <h1 className="text-3xl font-bold">Chess Academy Pro</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Your AI-powered chess training companion. Practice puzzles, study openings, and get personalised coaching.
          </p>
          <button
            onClick={() => setStep(2)}
            className="w-full py-3 rounded-lg font-semibold text-sm"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="get-started-btn"
          >
            Get Started
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-md w-full space-y-6">
          <h2 className="text-2xl font-bold text-center">API Key Setup</h2>
          <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
            Enter your API key to enable AI coaching.
          </p>
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }} data-testid="onboarding-provider-toggle">
            {(['deepseek', 'anthropic'] as const).map((p) => (
              <button
                key={p}
                onClick={() => { setProvider(p); setApiKey(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  background: provider === p ? 'var(--color-accent)' : 'var(--color-bg)',
                  color: provider === p ? 'var(--color-bg)' : 'var(--color-text)',
                }}
                data-testid={`onboarding-provider-${p}`}
              >
                {p === 'deepseek' ? 'DeepSeek' : 'Anthropic'}
              </button>
            ))}
          </div>
          <div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={isAnthropic ? 'sk-ant-...' : 'sk-...'}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              data-testid="onboarding-api-key"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {isAnthropic ? 'Get a key at console.anthropic.com' : 'Get a key at platform.deepseek.com'}
            </p>
          </div>
          {status && <p className="text-sm text-center" style={{ color: 'var(--color-error)' }}>{status}</p>}
          <button
            onClick={() => void handleSaveApiKey()}
            className="w-full py-3 rounded-lg font-semibold text-sm"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="save-onboarding-key-btn"
          >
            Save & Continue
          </button>
          <button
            onClick={() => void handleSkipApiKey()}
            className="w-full py-2 text-sm"
            style={{ color: 'var(--color-text-muted)' }}
            data-testid="skip-api-key-btn"
          >
            Skip for now
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-md w-full space-y-6">
          <h2 className="text-2xl font-bold text-center">Your Profile</h2>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              data-testid="onboarding-name"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>ELO Rating</label>
            <input
              type="number"
              value={elo}
              onChange={(e) => setElo(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              data-testid="onboarding-elo"
            />
          </div>
          <button
            onClick={() => void handleFinish()}
            className="w-full py-3 rounded-lg font-semibold text-sm"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="start-training-btn"
          >
            Start Training
          </button>
        </div>
      )}
    </div>
  );
}
