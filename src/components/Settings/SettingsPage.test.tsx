import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { SettingsPage } from './SettingsPage';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import type { UserProfile } from '../../types';

vi.mock('../../services/themeService', async () => {
  const actual = await vi.importActual<typeof import('../../services/themeService')>('../../services/themeService');
  return { ...actual, applyTheme: vi.fn() };
});

vi.mock('../../services/cryptoService', () => ({
  encryptApiKey: vi.fn().mockResolvedValue({ encrypted: 'enc', iv: 'iv' }),
}));

function createProfile(): UserProfile {
  return {
    id: 'main',
    name: 'Tester',
    isKidMode: false,
    coachPersonality: 'danya',
    currentRating: 1500,
    puzzleRating: 1400,
    xp: 100,
    level: 1,
    currentStreak: 3,
    longestStreak: 7,
    streakFreezes: 0,
    lastActiveDate: '2026-03-04',
    achievements: [],
    unlockedCoaches: ['danya'],
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
      preferredModel: { commentary: 'claude-haiku-4-5-20251001', analysis: 'claude-sonnet-4-5-20250514', reports: 'claude-opus-4-5-20250514' },
      monthlyBudgetCap: null,
      estimatedSpend: 0,
      elevenlabsKeyEncrypted: null,
      elevenlabsKeyIv: null,
      voiceIdDanya: '',
      voiceIdKasparov: '',
      voiceIdFischer: '',
    },
  };
}

describe('SettingsPage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
  });

  it('renders the settings page', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows all 4 tabs', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<SettingsPage />);
    expect(screen.getByTestId('tab-profile')).toBeInTheDocument();
    expect(screen.getByTestId('tab-coach')).toBeInTheDocument();
    expect(screen.getByTestId('tab-appearance')).toBeInTheDocument();
    expect(screen.getByTestId('tab-about')).toBeInTheDocument();
  });

  it('shows profile tab by default', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<SettingsPage />);
    expect(screen.getByTestId('profile-tab')).toBeInTheDocument();
    expect(screen.getByTestId('name-input')).toHaveValue('Tester');
  });

  it('switches to coach tab on click', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-coach'));
    expect(screen.getByTestId('coach-tab')).toBeInTheDocument();
    expect(screen.getByTestId('api-key-input')).toBeInTheDocument();
  });

  it('switches to appearance tab on click', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-appearance'));
    expect(screen.getByTestId('appearance-tab')).toBeInTheDocument();
    expect(screen.getByTestId('board-color-select')).toBeInTheDocument();
  });

  it('switches to about tab on click', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-about'));
    expect(screen.getByTestId('about-tab')).toBeInTheDocument();
    expect(screen.getByText('Chess Academy Pro')).toBeInTheDocument();
  });

  it('about tab has reset button with confirmation', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-about'));
    expect(screen.getByTestId('reset-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reset-btn'));
    expect(screen.getByTestId('confirm-reset-btn')).toBeInTheDocument();
  });

  it('renders empty when no profile', () => {
    render(<SettingsPage />);
    expect(screen.queryByTestId('settings-page')).not.toBeInTheDocument();
  });
});
