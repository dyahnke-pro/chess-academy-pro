import { useCallback, useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/schema';
import type { UserPreferences, PieceAnimationSpeed, MoveMethod } from '../types';

export interface EffectiveSettings {
  theme: string;
  boardColor: string;
  pieceSet: string;
  showEvalBar: boolean;
  showEngineLines: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  dailySessionMinutes: number;
  highlightLastMove: boolean;
  showLegalMoves: boolean;
  showCoordinates: boolean;
  pieceAnimationSpeed: PieceAnimationSpeed;
  boardOrientation: boolean;
  moveQualityFlash: boolean;
  showHints: boolean;
  moveMethod: MoveMethod;
  moveConfirmation: boolean;
  autoPromoteQueen: boolean;
  masterAllOff: boolean;
  coachBlunderAlerts: boolean;
  coachTacticAlerts: boolean;
  coachPositionalTips: boolean;
  coachMissedTacticTakeback: boolean;
  coachReviewVoice: boolean;
}

export interface UseSettingsReturn {
  settings: EffectiveSettings;
  raw: UserPreferences | null;
  updateSetting: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => Promise<void>;
  updateSettings: (updates: Partial<UserPreferences>) => Promise<void>;
}

const MASTER_OFF_OVERRIDES: Partial<EffectiveSettings> = {
  voiceEnabled: false,
  showHints: false,
  moveQualityFlash: false,
  highlightLastMove: false,
  showLegalMoves: false,
  pieceAnimationSpeed: 'none',
};

const DEFAULT_SETTINGS: EffectiveSettings = {
  theme: 'dark-premium',
  boardColor: 'classic',
  pieceSet: 'staunton',
  showEvalBar: true,
  showEngineLines: false,
  soundEnabled: true,
  voiceEnabled: true,
  dailySessionMinutes: 45,
  highlightLastMove: true,
  showLegalMoves: true,
  showCoordinates: true,
  pieceAnimationSpeed: 'medium',
  boardOrientation: true,
  moveQualityFlash: true,
  showHints: true,
  moveMethod: 'both',
  moveConfirmation: false,
  autoPromoteQueen: true,
  masterAllOff: false,
  coachBlunderAlerts: true,
  coachTacticAlerts: true,
  coachPositionalTips: true,
  coachMissedTacticTakeback: true,
  coachReviewVoice: true,
};

export function useSettings(): UseSettingsReturn {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const raw = activeProfile?.preferences ?? null;

  const settings = useMemo((): EffectiveSettings => {
    if (!raw) return DEFAULT_SETTINGS;

    const base: EffectiveSettings = {
      theme: raw.theme,
      boardColor: raw.boardColor,
      pieceSet: raw.pieceSet,
      showEvalBar: raw.showEvalBar,
      showEngineLines: raw.showEngineLines,
      soundEnabled: raw.soundEnabled,
      voiceEnabled: raw.voiceEnabled,
      dailySessionMinutes: raw.dailySessionMinutes,
      highlightLastMove: raw.highlightLastMove,
      showLegalMoves: raw.showLegalMoves,
      showCoordinates: raw.showCoordinates,
      pieceAnimationSpeed: raw.pieceAnimationSpeed,
      boardOrientation: raw.boardOrientation,
      moveQualityFlash: raw.moveQualityFlash,
      showHints: raw.showHints,
      moveMethod: raw.moveMethod,
      moveConfirmation: raw.moveConfirmation,
      autoPromoteQueen: raw.autoPromoteQueen,
      masterAllOff: raw.masterAllOff,
      coachBlunderAlerts: raw.coachBlunderAlerts ?? true,
      coachTacticAlerts: raw.coachTacticAlerts ?? true,
      coachPositionalTips: raw.coachPositionalTips ?? true,
      coachMissedTacticTakeback: raw.coachMissedTacticTakeback ?? true,
      coachReviewVoice: raw.coachReviewVoice ?? true,
    };

    if (raw.masterAllOff) {
      return { ...base, ...MASTER_OFF_OVERRIDES, masterAllOff: true };
    }

    return base;
  }, [raw]);

  const updateSetting = useCallback(
    async <K extends keyof UserPreferences>(
      key: K,
      value: UserPreferences[K],
    ): Promise<void> => {
      if (!activeProfile) return;
      const updatedPrefs = { ...activeProfile.preferences, [key]: value };
      await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
      setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
    },
    [activeProfile, setActiveProfile],
  );

  const updateSettings = useCallback(
    async (updates: Partial<UserPreferences>): Promise<void> => {
      if (!activeProfile) return;
      const updatedPrefs = { ...activeProfile.preferences, ...updates };
      await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
      setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
    },
    [activeProfile, setActiveProfile],
  );

  return { settings, raw, updateSetting, updateSettings };
}
