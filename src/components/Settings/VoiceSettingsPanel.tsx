import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { encryptApiKey } from '../../services/cryptoService';
import { Volume2 } from 'lucide-react';

export function VoiceSettingsPanel(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState(() => activeProfile?.preferences.elevenlabsVoiceId ?? '');
  const [voiceSpeed, setVoiceSpeed] = useState(() => activeProfile?.preferences.voiceSpeed ?? 1.0);
  const [status, setStatus] = useState<string | null>(null);

  const hasExistingKey = Boolean(activeProfile?.preferences.elevenlabsKeyEncrypted);

  const handleSaveKey = async (): Promise<void> => {
    if (!activeProfile || !elevenlabsKey.trim()) return;

    try {
      const { encrypted, iv } = await encryptApiKey(elevenlabsKey.trim());
      const updatedPrefs = {
        ...activeProfile.preferences,
        elevenlabsKeyEncrypted: encrypted,
        elevenlabsKeyIv: iv,
      };
      await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
      setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
      setElevenlabsKey('');
      setStatus('ElevenLabs key saved');
    } catch {
      setStatus('Error saving key');
    }
    setTimeout(() => setStatus(null), 2000);
  };

  const handleSaveVoiceIds = async (): Promise<void> => {
    if (!activeProfile) return;

    const updatedPrefs = {
      ...activeProfile.preferences,
      elevenlabsVoiceId,
      voiceSpeed,
    };
    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
    setStatus('Voice IDs saved');
    setTimeout(() => setStatus(null), 2000);
  };

  return (
    <div className="space-y-4" data-testid="voice-settings-panel">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Volume2 size={16} />
        AI Voice (ElevenLabs)
      </h3>

      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
          ElevenLabs API Key {hasExistingKey && '(saved)'}
        </label>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={elevenlabsKey}
            onChange={(e) => setElevenlabsKey(e.target.value)}
            placeholder={hasExistingKey ? '••••••••' : 'Enter ElevenLabs API key'}
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            data-testid="elevenlabs-key-input"
          />
          <button
            onClick={() => setShowKey((s) => !s)}
            className="px-3 py-2 rounded-lg border text-xs"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={() => void handleSaveKey()}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="save-elevenlabs-key-btn"
          >
            Save
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
            ElevenLabs Voice ID
          </label>
          <input
            type="text"
            value={elevenlabsVoiceId}
            onChange={(e) => setElevenlabsVoiceId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            data-testid="voice-id-elevenlabs"
          />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Voice Speed: {voiceSpeed}x
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>0.75x</span>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.25"
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
              className="flex-1"
              data-testid="voice-speed-slider"
            />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>1.5x</span>
          </div>
        </div>

        <button
          onClick={() => void handleSaveVoiceIds()}
          className="w-full py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
          data-testid="save-voice-ids-btn"
        >
          Save Voice Settings
        </button>
      </div>

      {status && (
        <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }} data-testid="voice-status">
          {status}
        </p>
      )}

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Without an ElevenLabs key, the coach will use your browser&apos;s built-in text-to-speech.
      </p>
    </div>
  );
}
