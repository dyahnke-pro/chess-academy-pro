import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * TURN-TAKING conversation mode (David 2026-07-11: "I want it to stay on so I
 * can have a back and forth with the coach — a natural conversation").
 *
 * The invariant under test: record and playback NEVER overlap on the shared
 * iOS AVAudioSession (the proven crash), yet the mic re-arms itself after the
 * coach's reply finishes — one tap arms a whole conversation.
 */

// ── Controllable native plugin mock ──────────────────────────────────────────
type ListenerCb = (data: never) => void;
const pluginListeners = new Map<string, ListenerCb>();
const pluginStart = vi.fn(async () => undefined);
const pluginStop = vi.fn(async () => undefined);
vi.mock('@capacitor-community/speech-recognition', () => ({
  SpeechRecognition: {
    requestPermissions: vi.fn(async () => ({ speechRecognition: 'granted' })),
    available: vi.fn(async () => ({ available: true })),
    removeAllListeners: vi.fn(async () => pluginListeners.clear()),
    addListener: vi.fn(async (name: string, cb: ListenerCb) => { pluginListeners.set(name, cb); }),
    start: pluginStart,
    stop: pluginStop,
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));

// voiceService mock — the playback-state oracle the re-arm cycle polls.
const voiceState = { playing: false };
vi.mock('./voiceService', () => ({
  voiceService: {
    isPlaying: () => voiceState.playing,
    stop: vi.fn(),
  },
}));

import { voiceInputService } from './voiceInputService';

function emitPartial(text: string): void {
  (pluginListeners.get('partialResults') as ((d: { matches: string[] }) => void) | undefined)?.({ matches: [text] });
}
function emitStopped(): void {
  (pluginListeners.get('listeningState') as ((d: { status: string }) => void) | undefined)?.({ status: 'stopped' });
}
async function flushAsync(): Promise<void> {
  // Let queued microtasks (dynamic imports, listener registration) settle.
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

describe('voiceInputService — turn-taking conversation mode (native)', () => {
  beforeEach(async () => {
    voiceState.playing = false;
    pluginStart.mockClear();
    pluginStop.mockClear();
    pluginListeners.clear();
  });

  afterEach(async () => {
    voiceInputService.stopListening();
    if (vi.isFakeTimers()) await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
  });

  /** Start under REAL timers (the first dynamic import of a module inside
   *  startNative needs vitest's transform pipeline, which requires real
   *  time — under fake timers it deadlocks), THEN switch to fake timers for
   *  the silence/re-arm phases the tests drive deterministically. */
  async function startConversation(handlers: { onEnd?: () => void; onResult?: (t: string) => void } = {}): Promise<() => void> {
    vi.useRealTimers();
    const startCallsBefore = pluginStart.mock.calls.length;
    const un = handlers.onResult ? voiceInputService.onResult(handlers.onResult) : (): void => undefined;
    voiceInputService.startListening({ onEnd: handlers.onEnd });
    // Deterministic bootstrap: poll (real time) until the recognizer actually
    // started — a fixed sleep flaked under parallel test load.
    const deadline = Date.now() + 5000;
    while (pluginStart.mock.calls.length === startCallsBefore && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 25));
    }
    await flushAsync();
    vi.useFakeTimers();
    return un;
  }

  it('one tap arms conversation mode; a pause auto-submits WITHOUT ending the conversation', async () => {
    const onEnd = vi.fn();
    const onResult = vi.fn();
    const un = await startConversation({ onEnd, onResult });
    expect(pluginStart).toHaveBeenCalledTimes(1);
    expect(voiceInputService.isConversationActive()).toBe(true);

    emitPartial('what is the best move here');
    await vi.advanceTimersByTimeAsync(2100); // NATIVE_SILENCE_MS elapses
    await flushAsync();

    // Utterance dispatched, recognizer torn down (half-duplex), but the
    // CONVERSATION is still live — endHandler must NOT have fired.
    expect(onResult).toHaveBeenCalledWith('what is the best move here');
    expect(pluginStop).toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
    expect(voiceInputService.isConversationActive()).toBe(true);
    un();
  });

  it('re-arms the mic only AFTER the reply finishes speaking (two-phase wait)', async () => {
    const un = await startConversation({ onResult: vi.fn() });
    pluginStart.mockClear();

    emitPartial('why is that best');
    await vi.advanceTimersByTimeAsync(2100); // submit + teardown
    await flushAsync();
    emitStopped(); // plugin confirms the session ended → re-arm cycle starts
    await flushAsync();

    // LLM round-trip gap: no playback yet — the mic must NOT restart inside it.
    await vi.advanceTimersByTimeAsync(3000);
    expect(pluginStart).not.toHaveBeenCalled();

    // Reply starts speaking… still no restart while playing.
    voiceState.playing = true;
    await vi.advanceTimersByTimeAsync(5000);
    expect(pluginStart).not.toHaveBeenCalled();

    // Reply finishes → after the idle-confirm window + settle, the mic re-arms.
    voiceState.playing = false;
    await vi.advanceTimersByTimeAsync(2500);
    await flushAsync();
    expect(pluginStart).toHaveBeenCalledTimes(1);
    expect(voiceInputService.isListening()).toBe(true);
    un();
  });

  it('re-arms even when the reply never speaks (voice off) after the start-wait window', async () => {
    const un = await startConversation({ onResult: vi.fn() });
    pluginStart.mockClear();

    emitPartial('silent mode question');
    await vi.advanceTimersByTimeAsync(2100);
    await flushAsync();
    emitStopped();
    await flushAsync();

    // No playback ever starts. After REPLY_START_WAIT_MS (15s) + idle confirm
    // + settle, the mic comes back anyway.
    await vi.advanceTimersByTimeAsync(17_500);
    await flushAsync();
    expect(pluginStart).toHaveBeenCalledTimes(1);
    un();
  });

  it('tap-off ends the conversation — no re-arm afterwards', async () => {
    const onEnd = vi.fn();
    const un = await startConversation({ onEnd, onResult: vi.fn() });
    pluginStart.mockClear();

    voiceInputService.stopListening();
    expect(voiceInputService.isConversationActive()).toBe(false);
    expect(onEnd).toHaveBeenCalled();

    // Even after every window elapses, the mic stays off.
    await vi.advanceTimersByTimeAsync(30_000);
    await flushAsync();
    expect(pluginStart).not.toHaveBeenCalled();
    un();
  });

  it('yieldForPlayback tears down a live recognizer before playback (crash-order guard)', async () => {
    const un = await startConversation({ onResult: vi.fn() });
    expect(voiceInputService.isListening()).toBe(true);
    pluginStop.mockClear();

    const yieldPromise = voiceInputService.yieldForPlayback();
    await vi.advanceTimersByTimeAsync(300); // the route-release settle
    await yieldPromise;

    expect(pluginStop).toHaveBeenCalled();
    expect(voiceInputService.isListening()).toBe(false);
    // Conversation stays armed — the cycle will bring the mic back later.
    expect(voiceInputService.isConversationActive()).toBe(true);
    un();
  });

  it('yieldForPlayback is a no-op when the mic is off', async () => {
    vi.useFakeTimers();
    pluginStop.mockClear();
    const p = voiceInputService.yieldForPlayback();
    await vi.advanceTimersByTimeAsync(300);
    await p;
    expect(pluginStop).not.toHaveBeenCalled();
  });
});
