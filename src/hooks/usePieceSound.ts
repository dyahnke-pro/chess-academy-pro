import { useCallback, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { SoundService, soundService, pieceSetToSoundSet } from '../services/soundService';

export interface UsePieceSoundReturn {
  /** Play the appropriate sound for a chess move given its SAN notation. */
  playMoveSound: (san: string) => void;
  /** Play the Kid Mode celebration sound (correct move in drill). */
  playCelebration: () => void;
  /** Play the Kid Mode encouragement sound (wrong move in drill). */
  playEncouragement: () => void;
  /** Soft error ping for wrong puzzle moves. */
  playErrorPing: () => void;
  /** Soft success chime for correct puzzle completion. */
  playSuccessChime: () => void;
}

export function usePieceSound(): UsePieceSoundReturn {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const soundEnabled = activeProfile?.preferences.soundEnabled ?? true;
  const pieceSet = activeProfile?.preferences.pieceSet ?? 'classic';
  const isKidMode = activeProfile?.isKidMode ?? false;

  // WO-COACH-PIECE-SOUND-CUSTOM — pull the four slider values from
  // user prefs. Defaults match PIECE_SOUND_DEFAULTS so unconfigured
  // profiles (and existing users who haven't moved a slider) get the
  // same sound character as before this PR.
  const pitch = activeProfile?.preferences.pieceSoundPitch ?? 50;
  const tone = activeProfile?.preferences.pieceSoundTone ?? 50;
  const waveform = activeProfile?.preferences.pieceSoundWaveform ?? 50;
  const length = activeProfile?.preferences.pieceSoundLength ?? 50;

  // Synchronise soundService settings whenever they change.
  useEffect(() => {
    soundService.setEnabled(soundEnabled);
    const set = pieceSetToSoundSet(pieceSet, isKidMode);
    soundService.setSoundSet(set);
    // Kid Mode plays slightly louder and more exaggerated.
    soundService.setVolume(isKidMode ? 1.0 : 0.7);
    soundService.setCustomization({ pitch, tone, waveform, length });
    // Pre-warm the audio cache for the active set.
    soundService.preload();
  }, [soundEnabled, pieceSet, isKidMode, pitch, tone, waveform, length]);

  const playMoveSound = useCallback((san: string): void => {
    if (!soundEnabled) return;
    const type = SoundService.soundTypeFromSan(san);
    soundService.play(type);
  }, [soundEnabled]);

  const playCelebration = useCallback((): void => {
    soundService.playKidCelebration();
  }, []);

  const playEncouragement = useCallback((): void => {
    soundService.playKidEncouragement();
  }, []);

  const playErrorPing = useCallback((): void => {
    soundService.playErrorPing();
  }, []);

  const playSuccessChime = useCallback((): void => {
    soundService.playSuccessChime();
  }, []);

  return { playMoveSound, playCelebration, playEncouragement, playErrorPing, playSuccessChime };
}
