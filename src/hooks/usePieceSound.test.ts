import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePieceSound } from './usePieceSound';

// ─── Hoist mock vars so they're available inside vi.mock factories ─────────

const {
  mockPlay,
  mockPreload,
  mockSetEnabled,
  mockSetVolume,
  mockSetSoundSet,
  mockPlayKidCelebration,
  mockPlayKidEncouragement,
} = vi.hoisted(() => ({
  mockPlay: vi.fn(),
  mockPreload: vi.fn(),
  mockSetEnabled: vi.fn(),
  mockSetVolume: vi.fn(),
  mockSetSoundSet: vi.fn(),
  mockPlayKidCelebration: vi.fn(),
  mockPlayKidEncouragement: vi.fn(),
}));

// ─── Mock sound service ────────────────────────────────────────────────────

vi.mock('../services/soundService', () => ({
  soundService: {
    play: mockPlay,
    preload: mockPreload,
    setEnabled: mockSetEnabled,
    setVolume: mockSetVolume,
    setSoundSet: mockSetSoundSet,
    playKidCelebration: mockPlayKidCelebration,
    playKidEncouragement: mockPlayKidEncouragement,
  },
  SoundService: {
    soundTypeFromSan: (san: string): string => {
      if (san === 'O-O' || san === 'O-O-O') return 'castle';
      if (san.includes('+') || san.includes('#')) return 'check';
      if (san.includes('x')) return 'capture';
      return 'move';
    },
  },
  pieceSetToSoundSet: (_pieceSet: string, isKidMode: boolean): string =>
    isKidMode ? 'cartoon' : 'classic',
}));

// ─── Mock Zustand store ────────────────────────────────────────────────────

interface MockProfile {
  preferences: { soundEnabled: boolean; pieceSet: string };
  isKidMode: boolean;
}

function makeProfile(
  soundEnabled = true,
  pieceSet = 'classic',
  isKidMode = false,
): MockProfile {
  return {
    preferences: { soundEnabled, pieceSet },
    isKidMode,
  };
}

let currentProfile: MockProfile | null = makeProfile();

vi.mock('../stores/appStore', () => ({
  useAppStore: (selector: (s: { activeProfile: MockProfile | null }) => unknown) =>
    selector({ activeProfile: currentProfile }),
}));

// ─── Tests ────────────────────────────────────────────────────────────────

describe('usePieceSound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentProfile = makeProfile();
  });

  describe('playMoveSound', () => {
    it('plays "move" sound for a quiet move', () => {
      const { result } = renderHook(() => usePieceSound());
      act(() => { result.current.playMoveSound('e4'); });
      expect(mockPlay).toHaveBeenCalledWith('move');
    });

    it('plays "castle" sound for O-O', () => {
      const { result } = renderHook(() => usePieceSound());
      act(() => { result.current.playMoveSound('O-O'); });
      expect(mockPlay).toHaveBeenCalledWith('castle');
    });

    it('plays "capture" sound for Bxe5', () => {
      const { result } = renderHook(() => usePieceSound());
      act(() => { result.current.playMoveSound('Bxe5'); });
      expect(mockPlay).toHaveBeenCalledWith('capture');
    });

    it('plays "check" sound for Nxf7+', () => {
      const { result } = renderHook(() => usePieceSound());
      act(() => { result.current.playMoveSound('Nxf7+'); });
      expect(mockPlay).toHaveBeenCalledWith('check');
    });

    it('does not play when soundEnabled is false', () => {
      currentProfile = makeProfile(false);
      const { result } = renderHook(() => usePieceSound());
      act(() => { result.current.playMoveSound('e4'); });
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe('playCelebration', () => {
    it('delegates to soundService.playKidCelebration', () => {
      const { result } = renderHook(() => usePieceSound());
      act(() => { result.current.playCelebration(); });
      expect(mockPlayKidCelebration).toHaveBeenCalledOnce();
    });
  });

  describe('playEncouragement', () => {
    it('delegates to soundService.playKidEncouragement', () => {
      const { result } = renderHook(() => usePieceSound());
      act(() => { result.current.playEncouragement(); });
      expect(mockPlayKidEncouragement).toHaveBeenCalledOnce();
    });
  });

  describe('effect — syncs settings on mount', () => {
    it('calls setEnabled(true) when sound is on', () => {
      renderHook(() => usePieceSound());
      expect(mockSetEnabled).toHaveBeenCalledWith(true);
    });

    it('calls setEnabled(false) when sound is off', () => {
      currentProfile = makeProfile(false);
      renderHook(() => usePieceSound());
      expect(mockSetEnabled).toHaveBeenCalledWith(false);
    });

    it('sets volume to 0.7 in normal mode', () => {
      renderHook(() => usePieceSound());
      expect(mockSetVolume).toHaveBeenCalledWith(0.7);
    });

    it('sets volume to 1.0 in Kid Mode', () => {
      currentProfile = makeProfile(true, 'classic', true);
      renderHook(() => usePieceSound());
      expect(mockSetVolume).toHaveBeenCalledWith(1.0);
    });

    it('calls preload on mount', () => {
      renderHook(() => usePieceSound());
      expect(mockPreload).toHaveBeenCalledOnce();
    });

    it('uses cartoon set in Kid Mode', () => {
      currentProfile = makeProfile(true, 'classic', true);
      renderHook(() => usePieceSound());
      // pieceSetToSoundSet('classic', true) returns 'cartoon'
      expect(mockSetSoundSet).toHaveBeenCalledWith('cartoon');
      expect(mockPreload).toHaveBeenCalledOnce();
    });
  });
});
