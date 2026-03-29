import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { POLLY_VOICES, getTtsUrl } from '../../services/voiceService';
import { speechService } from '../../services/speechService';
import type { SystemVoice } from '../../services/speechService';
import { Volume2, Play, Mic, Sparkles, AlertCircle } from 'lucide-react';

/** Curated quality voice names — prioritized at top of system voice list */
const QUALITY_VOICES = [
  'Microsoft Aria Online (Natural)',
  'Microsoft Jenny Online (Natural)',
  'Microsoft Guy Online (Natural)',
  'Microsoft Steffan Online (Natural)',
  'Microsoft Ana Online (Natural)',
  'Microsoft Andrew Online (Natural)',
  'Microsoft Ava Online (Natural)',
  'Microsoft Brian Online (Natural)',
  'Microsoft Emma Online (Natural)',
  'Microsoft Michelle Online (Natural)',
  'Microsoft Roger Online (Natural)',
  'Microsoft Christopher Online (Natural)',
  'Google US English',
  'Google UK English Female',
  'Google UK English Male',
  'Samantha',
  'Karen',
  'Daniel',
  'Moira',
];

export function VoiceSettingsPanel(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [voiceSpeed, setVoiceSpeed] = useState(() => activeProfile?.preferences.voiceSpeed ?? 1.0);
  const [status, setStatus] = useState<string | null>(null);

  // Amazon Polly TTS state
  const [pollyEnabled, setPollyEnabled] = useState(() => activeProfile?.preferences.pollyEnabled ?? true);
  const [pollyVoice, setPollyVoice] = useState(() => activeProfile?.preferences.pollyVoice ?? 'ruth');
  const [pollyPreviewPlaying, setPollyPreviewPlaying] = useState(false);

  // System voice state
  const [systemVoices, setSystemVoices] = useState<SystemVoice[]>([]);
  const [systemVoiceURI, setSystemVoiceURI] = useState<string | null>(
    () => activeProfile?.preferences.systemVoiceURI ?? null
  );
  const [systemPreviewPlaying, setSystemPreviewPlaying] = useState(false);

  useEffect(() => {
    const loadSystemVoices = (): void => {
      const voices = speechService.getAvailableVoices();
      const sorted = [...voices].sort((a, b) => {
        const aIdx = QUALITY_VOICES.findIndex(q => a.name.includes(q));
        const bIdx = QUALITY_VOICES.findIndex(q => b.name.includes(q));
        const aQuality = aIdx >= 0 ? aIdx : 999;
        const bQuality = bIdx >= 0 ? bIdx : 999;
        if (aQuality !== bQuality) return aQuality - bQuality;
        return a.name.localeCompare(b.name);
      });
      setSystemVoices(sorted);
    };
    loadSystemVoices();
    const unsubVoices = speechService.onVoicesChanged(loadSystemVoices);

    return () => { unsubVoices(); };
  }, []);

  const handleVoiceSpeedChange = async (speed: number): Promise<void> => {
    setVoiceSpeed(speed);
    speechService.setRate(speed);
    if (!activeProfile) return;
    const updatedPrefs = { ...activeProfile.preferences, voiceSpeed: speed };
    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
  };

  const handlePollyToggle = async (enabled: boolean): Promise<void> => {
    setPollyEnabled(enabled);
    if (!activeProfile) return;
    const updatedPrefs = { ...activeProfile.preferences, pollyEnabled: enabled };
    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
  };

  const handlePollyVoiceChange = async (voice: string): Promise<void> => {
    setPollyVoice(voice);
    if (!activeProfile) return;
    const updatedPrefs = { ...activeProfile.preferences, pollyVoice: voice };
    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
  };

  const handlePollyPreview = (): void => {
    if (pollyPreviewPlaying) return;
    setPollyPreviewPlaying(true);

    const previewText = 'Great move! You found the key idea in this position.';
    const url = getTtsUrl(previewText, pollyVoice);
    const audio = new Audio(url);

    audio.onended = () => {
      setPollyPreviewPlaying(false);
    };
    audio.onerror = () => {
      const err = audio.error;
      const detail = err ? `code=${err.code} ${err.message}` : 'unknown';
      setStatus(`Preview failed: ${detail}`);
      setTimeout(() => setStatus(null), 5000);
      setPollyPreviewPlaying(false);
    };
    audio.play().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`Play error: ${msg}`);
      setTimeout(() => setStatus(null), 5000);
      setPollyPreviewPlaying(false);
    });
  };

  const handleSystemVoiceChange = async (voiceURI: string): Promise<void> => {
    const uri = voiceURI === '' ? null : voiceURI;
    setSystemVoiceURI(uri);
    speechService.setVoice(uri);
    if (!activeProfile) return;

    const updatedPrefs = { ...activeProfile.preferences, systemVoiceURI: uri };
    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
  };

  const handleSystemPreview = (): void => {
    if (systemPreviewPlaying) return;
    setSystemPreviewPlaying(true);
    if (systemVoiceURI) {
      speechService.setVoice(systemVoiceURI);
    }
    speechService.speak('Great move! You found the key idea in this position.', {
      rate: voiceSpeed,
    });
    setTimeout(() => setSystemPreviewPlaying(false), 3000);
  };

  return (
    <div className="space-y-6" data-testid="voice-settings-panel">
      {/* ── Amazon Polly (Cloud Voice) ──────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Sparkles size={16} />
            Cloud Voice (AI)
          </h3>
          <label className="flex items-center gap-2 cursor-pointer" data-testid="polly-toggle">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {pollyEnabled ? 'On' : 'Off'}
            </span>
            <div
              role="switch"
              aria-checked={pollyEnabled}
              tabIndex={0}
              onClick={() => void handlePollyToggle(!pollyEnabled)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void handlePollyToggle(!pollyEnabled); } }}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ background: pollyEnabled ? 'var(--color-accent)' : 'var(--color-border)' }}
            >
              <span
                className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                style={{ transform: pollyEnabled ? 'translateX(24px)' : 'translateX(4px)' }}
              />
            </div>
          </label>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          High-quality AI voice powered by Amazon Polly. Reads any text naturally — no setup required.
        </p>

        {pollyEnabled && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Voice
              </label>
              <select
                value={pollyVoice}
                onChange={(e) => void handlePollyVoiceChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm appearance-none"
                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                data-testid="polly-voice-select"
              >
                {POLLY_VOICES.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} — {voice.description}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => { handlePollyPreview(); }}
              disabled={pollyPreviewPlaying}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-50"
              style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
              data-testid="polly-preview-btn"
            >
              <Play size={14} />
              {pollyPreviewPlaying ? 'Playing…' : 'Preview Voice'}
            </button>

            <button
              onClick={() => {
                const url = getTtsUrl('Test', pollyVoice);
                setStatus(`Testing ${url} ...`);
                void fetch(url).then(async (r) => {
                  const contentType = r.headers.get('Content-Type') ?? 'none';
                  if (!r.ok) {
                    const body = await r.text();
                    setStatus(`API error ${r.status}: ${body}`);
                  } else {
                    const blob = await r.blob();
                    setStatus(`OK: ${r.status}, type=${contentType}, size=${blob.size} bytes`);
                  }
                  setTimeout(() => setStatus(null), 8000);
                }).catch((e: unknown) => {
                  const msg = e instanceof Error ? e.message : String(e);
                  setStatus(`Fetch failed: ${msg}`);
                  setTimeout(() => setStatus(null), 8000);
                });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              data-testid="polly-test-btn"
            >
              <AlertCircle size={14} />
              Test API Endpoint
            </button>
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
            onChange={(e) => void handleVoiceSpeedChange(parseFloat(e.target.value))}
            className="flex-1"
            data-testid="voice-speed-slider"
          />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>1.5x</span>
        </div>
      </div>

      {/* ── System Voices (Free) ─────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Mic size={16} />
          System Voices (Free)
        </h3>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Built-in voices from your browser. Microsoft Natural voices are high quality and free.
          {!pollyEnabled && ' Used as the primary voice when Cloud Voice is off.'}
        </p>

        {systemVoices.length > 0 ? (
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Voice
            </label>
            <select
              value={systemVoiceURI ?? ''}
              onChange={(e) => void handleSystemVoiceChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm appearance-none"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              data-testid="system-voice-select"
            >
              <option value="">Auto (best available)</option>
              {systemVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name}
                  {voice.isNatural ? ' ★' : ''}
                </option>
              ))}
            </select>
            {systemVoiceURI && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {systemVoices.find(v => v.voiceURI === systemVoiceURI)?.isNatural
                  ? '★ Natural voice — high quality'
                  : 'Standard voice'}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Loading system voices…
          </p>
        )}

        <button
          onClick={handleSystemPreview}
          disabled={systemPreviewPlaying || systemVoices.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-50"
          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
          data-testid="system-voice-preview-btn"
        >
          <Play size={14} />
          {systemPreviewPlaying ? 'Playing…' : 'Preview System Voice'}
        </button>
      </div>

      {/* ── Voice Info ───────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Volume2 size={14} style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Cloud Voice speaks any text. System Voices are used as fallback.
          </p>
        </div>
      </div>

      {status && (
        <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }} data-testid="voice-status">
          {status}
        </p>
      )}
    </div>
  );
}
