import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { encryptApiKey } from '../../services/cryptoService';
import { installVoicePack, getVoiceCacheCount } from '../../services/voicePackService';
import { voiceService } from '../../services/voiceService';
import { Volume2, Download, Play, Check, Loader2 } from 'lucide-react';

interface VoiceOption {
  id: string;
  name: string;
  accent: 'American' | 'British';
  gender: 'Female' | 'Male';
}

const VOICES: VoiceOption[] = [
  { id: 'af_heart', name: 'Heart', accent: 'American', gender: 'Female' },
  { id: 'af_bella', name: 'Bella', accent: 'American', gender: 'Female' },
  { id: 'af_nicole', name: 'Nicole', accent: 'American', gender: 'Female' },
  { id: 'af_sarah', name: 'Sarah', accent: 'American', gender: 'Female' },
  { id: 'af_nova', name: 'Nova', accent: 'American', gender: 'Female' },
  { id: 'am_adam', name: 'Adam', accent: 'American', gender: 'Male' },
  { id: 'am_eric', name: 'Eric', accent: 'American', gender: 'Male' },
  { id: 'am_michael', name: 'Michael', accent: 'American', gender: 'Male' },
  { id: 'am_liam', name: 'Liam', accent: 'American', gender: 'Male' },
  { id: 'bf_emma', name: 'Emma', accent: 'British', gender: 'Female' },
  { id: 'bf_isabella', name: 'Isabella', accent: 'British', gender: 'Female' },
  { id: 'bm_daniel', name: 'Daniel', accent: 'British', gender: 'Male' },
  { id: 'bm_george', name: 'George', accent: 'British', gender: 'Male' },
];

type DownloadState = 'idle' | 'downloading' | 'installed';

export function VoiceSettingsPanel(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState(() => activeProfile?.preferences.elevenlabsVoiceId ?? '');
  const [voiceSpeed, setVoiceSpeed] = useState(() => activeProfile?.preferences.voiceSpeed ?? 1.0);
  const [status, setStatus] = useState<string | null>(null);

  const [selectedVoiceId, setSelectedVoiceId] = useState(() => activeProfile?.preferences.kokoroVoiceId ?? 'af_heart');
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [clipCount, setClipCount] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const hasExistingKey = Boolean(activeProfile?.preferences.elevenlabsKeyEncrypted);

  // Check if voice pack is already installed
  useEffect(() => {
    void getVoiceCacheCount(selectedVoiceId).then((count) => {
      if (count > 0) {
        setDownloadState('installed');
        setClipCount(count);
      } else {
        setDownloadState('idle');
        setClipCount(0);
      }
    });
  }, [selectedVoiceId]);

  const handleDownload = useCallback(async (): Promise<void> => {
    setDownloadState('downloading');
    setDownloadProgress(0);
    setDownloadError(null);

    try {
      const result = await installVoicePack(
        selectedVoiceId,
        (done, total) => {
          setDownloadProgress(Math.round((done / total) * 100));
        },
      );
      setDownloadState('installed');
      setClipCount(result.installed);
    } catch (error) {
      setDownloadState('idle');
      setDownloadError(error instanceof Error ? error.message : 'Download failed');
    }
  }, [selectedVoiceId]);

  const handleVoiceChange = async (voiceId: string): Promise<void> => {
    setSelectedVoiceId(voiceId);
    setDownloadError(null);
    if (!activeProfile) return;

    const updatedPrefs = { ...activeProfile.preferences, kokoroVoiceId: voiceId };
    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
  };

  const handlePreview = async (): Promise<void> => {
    if (downloadState !== 'installed' || previewPlaying) return;
    setPreviewPlaying(true);
    try {
      // Play a cached clip via voiceService
      voiceService.speakNow('Great move! You found the key idea in this position.');
      // Wait a bit for playback
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } finally {
      setPreviewPlaying(false);
    }
  };

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

  const selectedVoice = VOICES.find((v) => v.id === selectedVoiceId);

  return (
    <div className="space-y-6" data-testid="voice-settings-panel">
      {/* ── Voice Pack ────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Volume2 size={16} />
          HD Voice
        </h3>

        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          High-quality AI voices for opening training. Pick a voice and download the audio pack.
        </p>

        {/* Voice picker */}
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
            Voice
          </label>
          <select
            value={selectedVoiceId}
            onChange={(e) => void handleVoiceChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm appearance-none"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            data-testid="kokoro-voice-select"
          >
            {VOICES.map((voice) => (
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

        {/* Download / Status */}
        {downloadState === 'idle' && (
          <button
            onClick={() => void handleDownload()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="kokoro-download-btn"
          >
            <Download size={16} />
            Download Voice Pack
          </button>
        )}

        {downloadState === 'downloading' && (
          <div className="space-y-2" data-testid="kokoro-downloading">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
              <span>Downloading voice pack…</span>
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

        {downloadState === 'installed' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }} data-testid="kokoro-ready">
              <Check size={16} />
              Voice pack installed — {clipCount.toLocaleString()} clips ready
            </div>
          </div>
        )}

        {downloadError && (
          <p className="text-xs" style={{ color: 'var(--color-error)' }} data-testid="voice-download-error">
            {downloadError}
          </p>
        )}

        {/* Preview button */}
        {downloadState === 'installed' && (
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

      {/* ── Voice Speed ────────────────────────────────────────── */}
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
            If you have an ElevenLabs API key, it takes priority over the HD Voice pack.
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
