import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Native Stockfish plugin. Mirrors the UCI-over-stdio contract of the web
 * engine: you send UCI command strings with `cmd`, and every UCI output line
 * arrives on the `output` listener. iOS only — the web/Android app keeps the
 * asm.js/WASM engine.
 */
export interface StockfishNativePlugin {
  /** Boot the engine (starts the reader thread, forces classical eval). */
  start(): Promise<void>;
  /** Send one UCI command line, e.g. `{ cmd: 'go depth 18' }`. */
  cmd(options: { cmd: string }): Promise<void>;
  /** Quit the engine and join the reader thread. */
  exit(): Promise<void>;
  /** Max engine hash in MB (≈ 1/16th of device RAM). */
  getMaxMemory(): Promise<{ value: number }>;
  /** CPU architecture string (e.g. `arm64`). */
  getCPUArch(): Promise<{ value: string }>;
  /**
   * Which channel this install came from — `testflight` | `appstore` |
   * `development`. Runtime receipt check (Apple promotes the same binary from
   * TestFlight to the App Store, so a build-time flag would mislabel users).
   */
  getDistribution(): Promise<{ channel: string }>;
  /** One event per UCI output line the engine prints. */
  addListener(
    eventName: 'output',
    listenerFunc: (data: { line: string }) => void,
  ): Promise<PluginListenerHandle>;
  /** Remove all `output` listeners. */
  removeAllListeners(): Promise<void>;
}
