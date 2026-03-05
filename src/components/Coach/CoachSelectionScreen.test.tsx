import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { CoachSelectionScreen } from './CoachSelectionScreen';
import { useAppStore } from '../../stores/appStore';
import type { UserProfile } from '../../types';

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('../../db/schema', () => ({
  db: {
    profiles: { update: vi.fn().mockResolvedValue(1) },
  },
}));

const mockProfile: UserProfile = {
  id: 'main',
  name: 'Player',
  isKidMode: false,
  coachPersonality: 'danya',
  currentRating: 1420,
  puzzleRating: 1400,
  xp: 500,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  streakFreezes: 1,
  lastActiveDate: '2026-03-05',
  achievements: [],
  unlockedCoaches: ['danya'],
  skillRadar: { opening: 50, tactics: 50, endgame: 50, memory: 50, calculation: 50 },
  badHabits: [],
  preferences: {
    theme: 'dark-modern',
    boardColor: 'classic',
    pieceSet: 'staunton',
    showEvalBar: true,
    showEngineLines: false,
    soundEnabled: true,
    voiceEnabled: true,
    dailySessionMinutes: 45,
    apiKeyEncrypted: null,
    apiKeyIv: null,
    preferredModel: { commentary: 'c', analysis: 'c', reports: 'c' },
    monthlyBudgetCap: null,
    estimatedSpend: 0,
    elevenlabsKeyEncrypted: null,
    elevenlabsKeyIv: null,
    voiceIdDanya: '',
    voiceIdKasparov: '',
    voiceIdFischer: '',
    voiceSpeed: 1.0,
  },
};

describe('CoachSelectionScreen', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ activeProfile: mockProfile });
  });

  it('renders all 3 coach cards', () => {
    render(<CoachSelectionScreen onSelect={onSelect} />);
    expect(screen.getByTestId('coach-card-danya')).toBeInTheDocument();
    expect(screen.getByTestId('coach-card-kasparov')).toBeInTheDocument();
    expect(screen.getByTestId('coach-card-fischer')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<CoachSelectionScreen onSelect={onSelect} />);
    expect(screen.getByText('Choose Your Coach')).toBeInTheDocument();
  });

  it('locks Kasparov at level 1', () => {
    render(<CoachSelectionScreen onSelect={onSelect} />);
    const kasparovCard = screen.getByTestId('coach-card-kasparov');
    expect(kasparovCard).toBeDisabled();
  });

  it('locks Fischer at level 1', () => {
    render(<CoachSelectionScreen onSelect={onSelect} />);
    const fischerCard = screen.getByTestId('coach-card-fischer');
    expect(fischerCard).toBeDisabled();
  });

  it('unlocks Kasparov at level 5', () => {
    useAppStore.setState({
      activeProfile: { ...mockProfile, level: 5 },
    });
    render(<CoachSelectionScreen onSelect={onSelect} />);
    const kasparovCard = screen.getByTestId('coach-card-kasparov');
    expect(kasparovCard).not.toBeDisabled();
  });

  it('unlocks Fischer at level 10', () => {
    useAppStore.setState({
      activeProfile: { ...mockProfile, level: 10 },
    });
    render(<CoachSelectionScreen onSelect={onSelect} />);
    const fischerCard = screen.getByTestId('coach-card-fischer');
    expect(fischerCard).not.toBeDisabled();
  });

  it('shows Danya as always unlocked', () => {
    render(<CoachSelectionScreen onSelect={onSelect} />);
    const danyaCard = screen.getByTestId('coach-card-danya');
    expect(danyaCard).not.toBeDisabled();
  });
});
