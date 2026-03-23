import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { encryptApiKey } from '../../services/cryptoService';
import { kokoroService, KOKORO_VOICES } from '../../services/kokoroService';
import { pregenerateOpeningAudio } from '../../services/audioPregenService';
import type { KokoroModelStatus } from '../../services/kokoroService';
import { Volume2, Download, Play, Check, AlertCircle, Loader2 } from 'lucide-react';

export function VoiceSettingsPanel(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState(() => activeProfile?.preferences.elevenlabsVoiceId ?? '');
  const [voiceSpeed, setVoiceSpeed] = useState(() => activeProfile?.preferences.voiceSpeed ?? 1.0);
  const [status, setStatus] = useState<string | null>(null);

  // Kokoro state
  const [kokoroEnabled, setKokoroEnabled] = useState(() => activeProfile?.preferences.kokoroEnabled ?? true);
  const [kokoroVoiceId, setKokoroVoiceId] = useState(() => activeProfile?.preferences.kokoroVoiceId ?? 'af_heart');
  const [modelStatus, setModelStatus] = useState<KokoroModelStatus>(kokoroService.getStatus());
  const [downloadProgress, setDownloadProgress] = useState(kokoroService.getDownloadProgress());
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [pregenProgress, setPregenProgress] = useState<{ done: number; total: number } | null>(null);
  const [pregenDone, setPregenDone] = useState(false);

  const hasExistingKey = Boolean(activeProfile?.preferences.elevenlabsKeyEncrypted);

  useEffect(() => {
    const unsubStatus = kokoroService.onStatusChange(setModelStatus);
    const unsubProgress = kokoroService.onProgress(setDownloadProgress);
    return () => { unsubStatus(); unsubProgress(); };
  }, []);

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
    setStatus('Voice settings saved');
    setTimeout(() => setStatus(null), 2000);
  };

  const handleDownloadModel = useCallback(async (): Promise<void> => {
    try {
      await kokoroService.loadModel();

      // Pre-generate all opening phrases silently in the background
      setPregenProgress({ done: 0, total: 0 });
      try {
        const result = await pregenerateOpeningAudio(
          kokoroVoiceId,
          voiceSpeed,
          (done, total) => setPregenProgress({ done, total }),
        );
        setPregenDone(true);
        setPregenProgress(null);
        console.log(`[VoicePregen] Generated: ${result.generated}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
      } catch (pregenError) {
        console.warn('[VoicePregen] Pre-generation failed:', pregenError);
        setPregenProgress(null);
      }
    } catch {
      setStatus('Failed to download voice model');
      setTimeout(() => setStatus(null), 3000);
    }
  }, [kokoroVoiceId, voiceSpeed]);

  const handleKokoroToggle = async (enabled: boolean): Promise<void> => {
    setKokoroEnabled(enabled);
    if (!activeProfile) return;

    const updatedPrefs = { ...activeProfile.preferences, kokoroEnabled: enabled };
    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs });

    if (!enabled) {
      kokoroService.unload();
    }
  };

  const handleKokoroVoiceChange = async (voiceId: string): Promise<void> => {
    setKokoroVoiceId(voiceId);
    if (!activeProfile) return;

    const updatedPrefs = { ...activeProfile.preferences, kokoroVoiceId: voiceId };
    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
  };

  const handlePreview = async (): Promise<void> => {
    if (!kokoroService.isReady() || previewPlaying) return;
    setPreviewPlaying(true);
    try {
      await kokoroService.speak(
        'Great move! You found the key idea in this position.',
        kokoroVoiceId,
        voiceSpeed,
      );
    } catch {
      setStatus('Preview failed');
      setTimeout(() => setStatus(null), 2000);
    } finally {
      setPreviewPlaying(false);
    }
  };

  const selectedVoice = KOKORO_VOICES.find((v) => v.id === kokoroVoiceId);

  return (
    <div className="space-y-6" data-testid="voice-settings-panel">
      {/* ── Kokoro HD Voice ────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Volume2 size={16} />
            HD Voice (Kokoro)
          </h3>
          <label className="flex items-center gap-2 cursor-pointer" data-testid="kokoro-toggle">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {kokoroEnabled ? 'On' : 'Off'}
            </span>
            <div
              role="switch"
              aria-checked={kokoroEnabled}
              tabIndex={0}
              onClick={() => void handleKokoroToggle(!kokoroEnabled)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void handleKokoroToggle(!kokoroEnabled); } }}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ background: kokoroEnabled ? 'var(--color-accent)' : 'var(--color-border)' }}
            >
              <span
                className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                style={{ transform: kokoroEnabled ? 'translateX(24px)' : 'translateX(4px)' }}
              />
            </div>
          </label>
        </div>

        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Natural-sounding AI voice that runs entirely on your device. No API key needed.
        </p>

        {kokoroEnabled && (
          <div className="space-y-3">
            {/* Model download status */}
            {modelStatus === 'idle' && (
              <button
                onClick={() => void handleDownloadModel()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                data-testid="kokoro-download-btn"
              >
                <Download size={16} />
                Download Voice Model (~87 MB)
              </button>
            )}

            {modelStatus === 'downloading' && (
              <div className="space-y-2" data-testid="kokoro-downloading">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                  <span>Downloading voice model…</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {downloadProgress}%
                  </span>
                </div>
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--color-border)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${downloadProgress}%`, background: 'var(--color-accent)' }}
                  />
                </div>
              </div>
            )}

            {modelStatus === 'ready' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }} data-testid="kokoro-ready">
                  <Check size={16} />
                  Voice model loaded
                </div>
                {pregenProgress && (
                  <div className="space-y-1" data-testid="pregen-progress">
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Generating voice clips… {pregenProgress.done}/{pregenProgress.total}</span>
                    </div>
                    {pregenProgress.total > 0 && (
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.round((pregenProgress.done / pregenProgress.total) * 100)}%`, background: 'var(--color-accent)' }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {pregenDone && !pregenProgress && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-success)' }}>
                    <Check size={12} />
                    All voice clips cached
                  </div>
                )}
              </div>
            )}

            {modelStatus === 'error' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-error)' }} data-testid="kokoro-error">
                  <AlertCircle size={16} />
                  Failed to load voice model
                </div>
                {kokoroService.getLastError() && (
                  <p className="text-xs px-2 py-1 rounded" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }} data-testid="kokoro-error-detail">
                    {kokoroService.getLastError()}
                  </p>
                )}
                <button
                  onClick={() => void handleDownloadModel()}
                  className="w-full py-2 rounded-lg text-sm font-medium border"
                  style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                >
                  Retry Download
                </button>
              </div>
            )}

            {/* Voice picker */}
            {(modelStatus === 'ready' || modelStatus === 'idle') && (
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Voice
                </label>
                <select
                  value={kokoroVoiceId}
                  onChange={(e) => void handleKokoroVoiceChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm appearance-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  data-testid="kokoro-voice-select"
                >
                  {KOKORO_VOICES.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} — {voice.accent} {voice.gender}
                    </option>
                  ))}
                </select>
                {selectedVoice && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {selectedVoice.accent} {selectedVoice.gender.toLowerCase()} voice
                  </p>
                )}
              </div>
            )}

            {/* Preview button */}
            {modelStatus === 'ready' && (
              <button
                onClick={() => void handlePreview()}
                disabled={previewPlaying}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-50"
                style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                data-testid="kokoro-preview-btn"
              >
                <Play size={14} />
                {previewPlaying ? 'Playing…' : 'Preview Voice'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Voice Speed (shared) ───────────────────────────────── */}
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

      {/* ── ElevenLabs (Advanced) ──────────────────────────────── */}
      <details className="group">
        <summary
          className="cursor-pointer text-xs font-medium flex items-center gap-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span className="group-open:rotate-90 transition-transform">▶</span>
          ElevenLabs (Advanced)
          {hasExistingKey && <Check size={12} className="ml-1" style={{ color: 'var(--color-success)' }} />}
        </summary>

        <div className="mt-3 space-y-3 pl-3 border-l-2" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            If you have an ElevenLabs API key, it takes priority over Kokoro HD Voice.
          </p>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
              API Key {hasExistingKey && '(saved)'}
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

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Voice ID
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

          <button
            onClick={() => void handleSaveVoiceIds()}
            className="w-full py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
            data-testid="save-voice-ids-btn"
          >
            Save ElevenLabs Settings
          </button>
        </div>
      </details>

      {status && (
        <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }} data-testid="voice-status">
          {status}
        </p>
      )}
    </div>
  );
}
