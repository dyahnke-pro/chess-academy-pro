import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '../../test/utils';
import { AchievementToast } from './AchievementToast';
import { useAppStore } from '../../stores/appStore';
import type { Achievement, UserProfile } from '../../types';

const mockAchievement: Achievement = {
  id: 'streak_3',
  name: 'Hat Trick',
  description: 'Maintain a 3-day streak',
  icon: '🔥',
  condition: (p: UserProfile) => p.currentStreak >= 3,
  xpReward: 100,
};

describe('AchievementToast', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no pending achievement', () => {
    render(<AchievementToast />);
    expect(screen.queryByTestId('achievement-toast')).not.toBeInTheDocument();
  });

  it('shows toast with icon, name, and XP when achievement pending', () => {
    useAppStore.getState().setPendingAchievement(mockAchievement);
    render(<AchievementToast />);

    expect(screen.getByTestId('achievement-toast')).toBeInTheDocument();
    expect(screen.getByText('Hat Trick')).toBeInTheDocument();
    expect(screen.getByText('+100 XP')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('auto-dismisses after timeout', () => {
    useAppStore.getState().setPendingAchievement(mockAchievement);
    render(<AchievementToast />);

    expect(screen.getByTestId('achievement-toast')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(useAppStore.getState().pendingAchievement).toBeNull();
  });

  it('clears timeout on unmount', () => {
    useAppStore.getState().setPendingAchievement(mockAchievement);
    const { unmount } = render(<AchievementToast />);

    unmount();
    vi.advanceTimersByTime(3000);

    // Should not throw or cause issues
    expect(useAppStore.getState().pendingAchievement).not.toBeNull();
  });
});
