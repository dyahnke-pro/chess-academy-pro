/**
 * PieceSoundPanel — user-facing sliders for tuning the piece move sound.
 *
 * Layered ON TOP of the existing piece-set / event-type defaults so
 * move / capture / castle / check stay distinguishable. Each slider is
 * 0–100 with 50 = "no change" baseline.
 *
 * Lives under Settings → Board → Piece Sound. Saves directly to Dexie
 * + Zustand on slider release (debounced) so users can hear changes
 * via the test button without explicit Save → Reload.
 *
 * Per WO-COACH-PIECE-SOUND-CUSTOM.
 */
import { useState, useCallback, useEffect } from 'react';
import { db } from '../../db/schema';
import { useAppStore } from '../../stores/appStore';
import {
  soundService,
  PIECE_SOUND_DEFAULTS,
  type SoundType,
} from '../../services/soundService';

interface SliderRowProps {
  label: string;
  hintLow: string;
  hintHigh: string;
  value: number;
  onChange: (value: number) => void;
  testId: string;
}

function SliderRow({ label, hintLow, hintHigh, value, onChange, testId }: SliderRowProps): JSX.Element {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        data-testid={testId}
        aria-label={label}
      />
      <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
        <span>{hintLow}</span>
        <span>{hintHigh}</span>
      </div>
    </div>
  );
}

export function PieceSoundPanel(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [pitch, setPitch] = useState(activeProfile?.preferences.pieceSoundPitch ?? PIECE_SOUND_DEFAULTS.pitch);
  const [tone, setTone] = useState(activeProfile?.preferences.pieceSoundTone ?? PIECE_SOUND_DEFAULTS.tone);
  const [waveform, setWaveform] = useState(activeProfile?.preferences.pieceSoundWaveform ?? PIECE_SOUND_DEFAULTS.waveform);
  const [length, setLength] = useState(activeProfile?.preferences.pieceSoundLength ?? PIECE_SOUND_DEFAULTS.length);

  // Live preview: every slider movement updates soundService immediately
  // so the Test button reflects the current draft. Persistence to Dexie
  // happens in a debounced effect below.
  useEffect(() => {
    soundService.setCustomization({ pitch, tone, waveform, length });
  }, [pitch, tone, waveform, length]);

  // Debounced persistence — write to Dexie + profile 250 ms after the
  // last slider movement so dragging doesn't hammer the DB.
  useEffect(() => {
    if (!activeProfile) return;
    const handle = setTimeout(() => {
      void (async () => {
        const updatedPrefs = {
          ...activeProfile.preferences,
          pieceSoundPitch: pitch,
          pieceSoundTone: tone,
          pieceSoundWaveform: waveform,
          pieceSoundLength: length,
        };
        await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
        setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
      })();
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitch, tone, waveform, length]);

  const playSample = useCallback((type: SoundType): void => {
    soundService.play(type);
  }, []);

  const playSequence = useCallback((): void => {
    // Move → 250 ms → capture → 250 ms → castle → 250 ms → check.
    // Spaced wider than the default sound duration so each is heard
    // distinctly even at the longest length setting.
    const seq: SoundType[] = ['move', 'capture', 'castle', 'check'];
    seq.forEach((type, i) => setTimeout(() => playSample(type), i * 350));
  }, [playSample]);

  const reset = useCallback((): void => {
    setPitch(PIECE_SOUND_DEFAULTS.pitch);
    setTone(PIECE_SOUND_DEFAULTS.tone);
    setWaveform(PIECE_SOUND_DEFAULTS.waveform);
    setLength(PIECE_SOUND_DEFAULTS.length);
  }, []);

  return (
    <div className="space-y-3" data-testid="piece-sound-panel">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold">Piece Sound</h3>
        <button
          onClick={reset}
          className="text-xs underline"
          style={{ color: 'var(--color-text-muted)' }}
          data-testid="piece-sound-reset"
        >
          Reset
        </button>
      </div>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Tune the click sound when pieces move. Capture, castle, and check stay
        distinguishable across all settings.
      </p>

      <SliderRow
        label="Pitch"
        hintLow="Low"
        hintHigh="High"
        value={pitch}
        onChange={setPitch}
        testId="piece-sound-pitch"
      />
      <SliderRow
        label="Brightness"
        hintLow="Warm"
        hintHigh="Bright"
        value={tone}
        onChange={setTone}
        testId="piece-sound-tone"
      />
      <SliderRow
        label="Snap"
        hintLow="Mellow"
        hintHigh="Sharp"
        value={waveform}
        onChange={setWaveform}
        testId="piece-sound-waveform"
      />
      <SliderRow
        label="Length"
        hintLow="Short"
        hintHigh="Long"
        value={length}
        onChange={setLength}
        testId="piece-sound-length"
      />

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => playSample('move')}
          className="flex-1 py-2 rounded-lg border text-xs"
          style={{ borderColor: 'var(--color-border)' }}
          data-testid="piece-sound-test-move"
        >
          ▷ Move
        </button>
        <button
          onClick={playSequence}
          className="flex-1 py-2 rounded-lg border-2 text-xs font-semibold"
          style={{ borderColor: 'var(--color-accent)' }}
          data-testid="piece-sound-test-all"
        >
          ▷ Test all
        </button>
      </div>
    </div>
  );
}
