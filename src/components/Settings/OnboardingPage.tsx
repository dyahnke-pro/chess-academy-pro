import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';

type OnboardingStep = 1 | 2 | 3;

export function OnboardingPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [provider, setProvider] = useState<'deepseek' | 'anthropic'>(activeProfile?.preferences.aiProvider ?? 'deepseek');
  const [name, setName] = useState(activeProfile?.name ?? 'Player');
  const [elo, setElo] = useState(activeProfile?.currentRating ?? 1200);

  const handleSaveProvider = async (): Promise<void> => {
    if (!activeProfile) return;
    const updatedPrefs = {
      ...activeProfile.preferences,
      aiProvider: provider,
    };
    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
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
          <h2 className="text-2xl font-bold text-center">Preferred Provider</h2>
          <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
            Choose your preferred AI coaching provider. You can change this later in Settings.
          </p>
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }} data-testid="onboarding-provider-toggle">
            {(['deepseek', 'anthropic'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
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
          <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
            API keys are managed via server environment variables.
          </p>
          <button
            onClick={() => void handleSaveProvider()}
            className="w-full py-3 rounded-lg font-semibold text-sm"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="save-onboarding-provider-btn"
          >
            Continue
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
