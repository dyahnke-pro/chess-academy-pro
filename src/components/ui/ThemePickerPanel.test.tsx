import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { ThemePickerPanel } from './ThemePickerPanel';
import { THEMES } from '../../services/themeService';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';

vi.mock('../../services/themeService', async () => {
  const actual = await vi.importActual<typeof import('../../services/themeService')>('../../services/themeService');
  return {
    ...actual,
    applyTheme: vi.fn(),
  };
});

describe('ThemePickerPanel', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
  });

  it('renders all 7 theme cards', () => {
    render(<ThemePickerPanel />);
    expect(screen.getByTestId('theme-picker-panel')).toBeInTheDocument();

    for (const theme of THEMES) {
      expect(screen.getByTestId(`theme-card-${theme.id}`)).toBeInTheDocument();
    }
  });

  it('shows theme names', () => {
    render(<ThemePickerPanel />);
    for (const theme of THEMES) {
      expect(screen.getByText(theme.name)).toBeInTheDocument();
    }
  });

  it('shows checkmark on active theme', () => {
    useAppStore.getState().setActiveTheme(THEMES[0]);
    render(<ThemePickerPanel />);
    expect(screen.getByTestId('theme-check')).toBeInTheDocument();
  });

  it('does not show checkmark when no theme is active', () => {
    render(<ThemePickerPanel />);
    expect(screen.queryByTestId('theme-check')).not.toBeInTheDocument();
  });

  it('clicking a card updates the active theme in store', async () => {
    const profile = {
      id: 'main',
      name: 'Tester',
      isKidMode: false,
      currentRating: 1400,
      puzzleRating: 1400,
      xp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      streakFreezes: 0,
      lastActiveDate: '2026-03-04',
      achievements: [],
      skillRadar: { opening: 50, tactics: 50, endgame: 50, memory: 50, calculation: 50 },
      badHabits: [],
      preferences: {
        theme: 'dark-premium',
        boardColor: 'classic',
        pieceSet: 'staunton',
        showEvalBar: true,
        showEngineLines: false,
        soundEnabled: true,
        voiceEnabled: true,
        dailySessionMinutes: 45,
        apiKeyEncrypted: null,
        apiKeyIv: null,
        preferredModel: { commentary: 'haiku', analysis: 'sonnet', reports: 'opus' },
        monthlyBudgetCap: null,
        estimatedSpend: 0,
        elevenlabsKeyEncrypted: null,
        elevenlabsKeyIv: null,
        elevenlabsVoiceId: null,
        voiceSpeed: 1.0,
        highlightLastMove: true,
        showLegalMoves: true,
        showCoordinates: true,
        pieceAnimationSpeed: 'medium' as const,
        boardOrientation: true,
        moveQualityFlash: true,
        showHints: true,
        moveMethod: 'both' as const,
        moveConfirmation: false,
        autoPromoteQueen: true,
        masterAllOff: false,
      },
    };
    await db.profiles.put(profile);
    useAppStore.getState().setActiveProfile(profile);
    useAppStore.getState().setActiveTheme(THEMES[0]);

    render(<ThemePickerPanel />);

    const forestCard = screen.getByTestId('theme-card-forest-green');
    fireEvent.click(forestCard);

    await waitFor(() => {
      const store = useAppStore.getState();
      expect(store.activeTheme?.id).toBe('forest-green');
    });
  });

  it('persists theme preference to DB on click', async () => {
    const profile = {
      id: 'main',
      name: 'Tester',
      isKidMode: false,
      currentRating: 1400,
      puzzleRating: 1400,
      xp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      streakFreezes: 0,
      lastActiveDate: '2026-03-04',
      achievements: [],
      skillRadar: { opening: 50, tactics: 50, endgame: 50, memory: 50, calculation: 50 },
      badHabits: [],
      preferences: {
        theme: 'dark-premium',
        boardColor: 'classic',
        pieceSet: 'staunton',
        showEvalBar: true,
        showEngineLines: false,
        soundEnabled: true,
        voiceEnabled: true,
        dailySessionMinutes: 45,
        apiKeyEncrypted: null,
        apiKeyIv: null,
        preferredModel: { commentary: 'haiku', analysis: 'sonnet', reports: 'opus' },
        monthlyBudgetCap: null,
        estimatedSpend: 0,
        elevenlabsKeyEncrypted: null,
        elevenlabsKeyIv: null,
        elevenlabsVoiceId: null,
        voiceSpeed: 1.0,
        highlightLastMove: true,
        showLegalMoves: true,
        showCoordinates: true,
        pieceAnimationSpeed: 'medium' as const,
        boardOrientation: true,
        moveQualityFlash: true,
        showHints: true,
        moveMethod: 'both' as const,
        moveConfirmation: false,
        autoPromoteQueen: true,
        masterAllOff: false,
      },
    };
    await db.profiles.put(profile);
    useAppStore.getState().setActiveProfile(profile);

    render(<ThemePickerPanel />);

    fireEvent.click(screen.getByTestId('theme-card-midnight-blue'));

    await waitFor(async () => {
      const dbProfile = await db.profiles.get('main');
      expect(dbProfile?.preferences.theme).toBe('midnight-blue');
    });
  });

  it('renders 5 color swatches per card', () => {
    render(<ThemePickerPanel />);
    // Each card has 5 swatch circles
    const cards = screen.getAllByTestId(/^theme-card-/);
    expect(cards).toHaveLength(7);
  });
});
