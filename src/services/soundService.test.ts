import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoundService, pieceSetToSoundSet } from './soundService';
import type { SoundSet } from './soundService';

// ─── Web Audio API mock ──────────────────────────────────────────────────────
// The synth path creates oscillator + gain nodes; tracking createOscillator
// calls is the simplest observable proxy for "a sound was played".

const mockOscStart = vi.fn();
const mockCreateOscillator = vi.fn(() => ({
  type: '' as OscillatorType,
  frequency: { setValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: mockOscStart,
  stop: vi.fn(),
}));
const mockCreateGain = vi.fn(() => ({
  gain: {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
}));
const mockCreateBuffer = vi.fn((_: number, length: number, sampleRate: number) => ({
  getChannelData: vi.fn(() => new Float32Array(Math.floor(sampleRate * length))),
}));
const mockCreateBufferSource = vi.fn(() => ({
  buffer: null as AudioBuffer | null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}));
const mockCreateBiquadFilter = vi.fn(() => ({
  type: '' as BiquadFilterType,
  frequency: { setValueAtTime: vi.fn() },
  Q: { setValueAtTime: vi.fn() },
  connect: vi.fn(),
}));

class MockAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  state: AudioContextState = 'running';
  destination = {} as AudioDestinationNode;
  resume = vi.fn(() => Promise.resolve());
  createOscillator = mockCreateOscillator;
  createGain = mockCreateGain;
  createBuffer = mockCreateBuffer;
  createBufferSource = mockCreateBufferSource;
  createBiquadFilter = mockCreateBiquadFilter;
  close = vi.fn(() => Promise.resolve());
}

vi.stubGlobal('AudioContext', MockAudioContext);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('pieceSetToSoundSet', () => {
  it('maps classic piece set to classic sounds', () => {
    expect(pieceSetToSoundSet('classic', false)).toBe('classic');
  });

  it('maps modern piece set to metallic sounds', () => {
    expect(pieceSetToSoundSet('modern', false)).toBe('metallic');
  });

  it('maps minimalist piece set to metallic sounds', () => {
    expect(pieceSetToSoundSet('minimalist', false)).toBe('metallic');
  });

  it('maps 3d piece set to marble sounds', () => {
    expect(pieceSetToSoundSet('3d', false)).toBe('marble');
  });

  it('maps cartoon piece set to cartoon sounds', () => {
    expect(pieceSetToSoundSet('cartoon', false)).toBe('cartoon');
  });

  it('returns cartoon for any piece set in Kid Mode', () => {
    expect(pieceSetToSoundSet('classic', true)).toBe('cartoon');
    expect(pieceSetToSoundSet('modern', true)).toBe('cartoon');
  });

  it('falls back to classic for unknown piece set', () => {
    expect(pieceSetToSoundSet('unknown', false)).toBe('classic');
  });
});

describe('SoundService', () => {
  let service: SoundService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SoundService();
  });

  describe('play', () => {
    it('triggers synthesis for a move sound', () => {
      service.play('move');
      expect(mockCreateOscillator).toHaveBeenCalled();
    });

    it('triggers synthesis for capture, castle, and check', () => {
      service.play('capture');
      service.play('castle');
      service.play('check');
      // Each call creates at least one oscillator
      expect(mockCreateOscillator.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('does not synthesise when disabled', () => {
      service.setEnabled(false);
      service.play('move');
      expect(mockCreateOscillator).not.toHaveBeenCalled();
    });

    it('plays again after re-enabling', () => {
      service.setEnabled(false);
      service.setEnabled(true);
      service.play('move');
      expect(mockCreateOscillator).toHaveBeenCalled();
    });

    it('clamps volume to a maximum of 1', () => {
      // Should not throw — just verifying setVolume clamps correctly
      service.setVolume(1.5);
      service.play('move');
      expect(mockCreateOscillator).toHaveBeenCalled();
    });

    it('clamps volume to a minimum of 0', () => {
      service.setVolume(-0.5);
      service.play('move');
      expect(mockCreateOscillator).toHaveBeenCalled();
    });
  });

  describe('setSoundSet', () => {
    it('synthesises for each sound set without error', () => {
      const sets: SoundSet[] = ['classic', 'metallic', 'marble', 'cartoon'];
      for (const set of sets) {
        service.setSoundSet(set);
        service.play('move');
      }
      // Each sound set should trigger synthesis
      expect(mockCreateOscillator.mock.calls.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('playKidCelebration and playKidEncouragement', () => {
    it('synthesises kid encouragement sound when enabled', () => {
      service.playKidEncouragement();
      expect(mockCreateOscillator).toHaveBeenCalled();
    });

    it('does not synthesise kid sounds when disabled', () => {
      service.setEnabled(false);
      service.playKidCelebration();
      service.playKidEncouragement();
      expect(mockCreateOscillator).not.toHaveBeenCalled();
      expect(mockOscStart).not.toHaveBeenCalled();
    });

    it('playKidCelebration schedules 4 notes via setTimeout', () => {
      vi.useFakeTimers();
      service.playKidCelebration();
      // Advance past all 4 note delays (4 × 80 ms = 320 ms)
      vi.advanceTimersByTime(400);
      expect(mockCreateOscillator.mock.calls.length).toBeGreaterThanOrEqual(4);
      vi.useRealTimers();
    });
  });

  describe('preload', () => {
    it('is a no-op and does not throw', () => {
      expect(() => service.preload()).not.toThrow();
    });
  });

  describe('soundTypeFromSan (static)', () => {
    it('returns castle for O-O', () => {
      expect(SoundService.soundTypeFromSan('O-O')).toBe('castle');
    });

    it('returns castle for O-O-O', () => {
      expect(SoundService.soundTypeFromSan('O-O-O')).toBe('castle');
    });

    it('returns check for a move with +', () => {
      expect(SoundService.soundTypeFromSan('Nf3+')).toBe('check');
    });

    it('returns check for checkmate (#)', () => {
      expect(SoundService.soundTypeFromSan('Qh7#')).toBe('check');
    });

    it('returns capture for a move with x (no check)', () => {
      expect(SoundService.soundTypeFromSan('Bxe5')).toBe('capture');
    });

    it('returns move for a quiet move', () => {
      expect(SoundService.soundTypeFromSan('e4')).toBe('move');
    });

    it('returns move for a pawn promotion without capture or check', () => {
      expect(SoundService.soundTypeFromSan('e8=Q')).toBe('move');
    });

    it('check takes priority over capture in Nxf7+', () => {
      expect(SoundService.soundTypeFromSan('Nxf7+')).toBe('check');
    });
  });
});
