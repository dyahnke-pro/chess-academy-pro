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
}

export function usePieceSound(): UsePieceSoundReturn {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const soundEnabled = activeProfile?.preferences.soundEnabled ?? true;
  const pieceSet = activeProfile?.preferences.pieceSet ?? 'classic';
  const isKidMode = activeProfile?.isKidMode ?? false;

  // Synchronise soundService settings whenever they change.
  useEffect(() => {
    soundService.setEnabled(soundEnabled);
    const set = pieceSetToSoundSet(pieceSet, isKidMode);
    soundService.setSoundSet(set);
    // Kid Mode plays slightly louder and more exaggerated.
    soundService.setVolume(isKidMode ? 1.0 : 0.7);
    // Pre-warm the audio cache for the active set.
    soundService.preload();
  }, [soundEnabled, pieceSet, isKidMode]);

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

  return { playMoveSound, playCelebration, playEncouragement };
}
