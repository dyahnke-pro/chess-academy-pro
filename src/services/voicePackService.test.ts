import { describe, it, expect, vi, beforeEach } from 'vitest';
import { voicePackService, hashText, VOICE_PACK_VOICES } from './voicePackService';

// Stub AudioContext for playback tests
if (typeof globalThis.AudioContext === 'undefined') {
  const mockSource = {
    buffer: null as AudioBuffer | null,
    playbackRate: { value: 1 },
    connect: vi.fn(),
    start: vi.fn(function (this: { onended?: () => void }) {
      // Simulate immediate playback completion
      setTimeout(() => this.onended?.(), 0);
    }),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  };

  (globalThis as Record<string, unknown>).AudioContext = class {
    state = 'running';
    createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        duration: length / sampleRate,
        getChannelData: () => new Float32Array(length),
      } as unknown as AudioBuffer;
    }
    createBufferSource() { return mockSource; }
    get destination() { return {} as AudioDestinationNode; }
    async resume() { this.state = 'running'; }
    async decodeAudioData(buffer: ArrayBuffer): Promise<AudioBuffer> {
      return this.createBuffer(1, buffer.byteLength, 24000);
    }
    async close() { this.state = 'closed'; }
  };
}

/** Build a .bin buffer with the given text→audio entries. */
function buildBin(entries: Array<{ text: string; audioBytes: Uint8Array }>): ArrayBuffer {
  const parts: Uint8Array[] = [];

  // Clip count (4 bytes LE)
  const countBuf = new ArrayBuffer(4);
  new DataView(countBuf).setUint32(0, entries.length, true);
  parts.push(new Uint8Array(countBuf));

  for (const entry of entries) {
    const hash = hashText(entry.text);
    const hashBytes = new TextEncoder().encode(hash);

    // Hash length (2 bytes LE)
    const hashLenBuf = new ArrayBuffer(2);
    new DataView(hashLenBuf).setUint16(0, hashBytes.length, true);
    parts.push(new Uint8Array(hashLenBuf));

    // Hash string
    parts.push(hashBytes);

    // Audio length (4 bytes LE)
    const audioLenBuf = new ArrayBuffer(4);
    new DataView(audioLenBuf).setUint32(0, entry.audioBytes.length, true);
    parts.push(new Uint8Array(audioLenBuf));

    // Audio data
    parts.push(entry.audioBytes);
  }

  const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result.buffer;
}

describe('hashText', () => {
  it('returns consistent hash for same input', () => {
    expect(hashText('hello')).toBe(hashText('hello'));
  });

  it('returns different hashes for different input', () => {
    expect(hashText('hello')).not.toBe(hashText('world'));
  });

  it('returns a numeric string', () => {
    const result = hashText('test string');
    expect(Number.isFinite(Number(result))).toBe(true);
  });

  it('handles empty string', () => {
    expect(hashText('')).toBe('0');
  });

  it('matches Java String.hashCode for known values', () => {
    // Java: "hello".hashCode() == 99162322
    expect(hashText('hello')).toBe('99162322');
  });
});

describe('VOICE_PACK_VOICES', () => {
  it('includes Bella', () => {
    const bella = VOICE_PACK_VOICES.find((v) => v.id === 'af_bella');
    expect(bella).toBeDefined();
    expect(bella?.name).toBe('Bella');
    expect(bella?.accent).toBe('American');
    expect(bella?.gender).toBe('Female');
  });

  it('has 13 voices', () => {
    expect(VOICE_PACK_VOICES).toHaveLength(13);
  });
});

describe('voicePackService', () => {
  beforeEach(() => {
    voicePackService.unload();
  });

  it('starts in idle state', () => {
    expect(voicePackService.getStatus()).toBe('idle');
    expect(voicePackService.isReady()).toBe(false);
    expect(voicePackService.getClipCount()).toBe(0);
  });

  it('loads a .bin buffer and becomes ready', () => {
    const bin = buildBin([
      { text: 'hello', audioBytes: new Uint8Array([1, 2, 3]) },
      { text: 'world', audioBytes: new Uint8Array([4, 5, 6]) },
    ]);

    voicePackService.loadFromBuffer('af_bella', bin);

    expect(voicePackService.getStatus()).toBe('ready');
    expect(voicePackService.isReady()).toBe(true);
    expect(voicePackService.getClipCount()).toBe(2);
    expect(voicePackService.getLoadedVoiceId()).toBe('af_bella');
  });

  it('reports hasClip correctly', () => {
    const bin = buildBin([
      { text: 'hello', audioBytes: new Uint8Array([1, 2, 3]) },
    ]);

    voicePackService.loadFromBuffer('af_bella', bin);

    expect(voicePackService.hasClip('hello')).toBe(true);
    expect(voicePackService.hasClip('goodbye')).toBe(false);
  });

  it('speak returns false for missing clips', async () => {
    const bin = buildBin([
      { text: 'hello', audioBytes: new Uint8Array([1, 2, 3]) },
    ]);

    voicePackService.loadFromBuffer('af_bella', bin);
    const result = await voicePackService.speak('not in pack');
    expect(result).toBe(false);
  });

  it('unload clears state', () => {
    const bin = buildBin([
      { text: 'hello', audioBytes: new Uint8Array([1, 2, 3]) },
    ]);

    voicePackService.loadFromBuffer('af_bella', bin);
    voicePackService.unload();

    expect(voicePackService.getStatus()).toBe('idle');
    expect(voicePackService.isReady()).toBe(false);
    expect(voicePackService.getClipCount()).toBe(0);
    expect(voicePackService.getLoadedVoiceId()).toBeNull();
  });

  it('emits status change events', () => {
    const statuses: string[] = [];
    const unsub = voicePackService.onStatusChange((s) => statuses.push(s));

    const bin = buildBin([
      { text: 'test', audioBytes: new Uint8Array([1]) },
    ]);

    voicePackService.loadFromBuffer('af_bella', bin);
    voicePackService.unload();

    unsub();
    expect(statuses).toContain('ready');
    expect(statuses).toContain('idle');
  });

  it('parses multi-clip bin correctly', () => {
    const clips = Array.from({ length: 50 }, (_, i) => ({
      text: `clip-${i}`,
      audioBytes: new Uint8Array([i & 0xff]),
    }));

    const bin = buildBin(clips);
    voicePackService.loadFromBuffer('af_bella', bin);

    expect(voicePackService.getClipCount()).toBe(50);
    for (const clip of clips) {
      expect(voicePackService.hasClip(clip.text)).toBe(true);
    }
  });
});
