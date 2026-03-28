// Voice Pack Service — plays pre-rendered audio clips from .bin voice packs
// Replaces Kokoro WASM TTS with lightweight, iOS-safe pre-rendered audio.
//
// .bin format (little-endian):
//   [4 bytes] Uint32LE: clip count
//   For each clip:
//     [2 bytes] Uint16LE: hash string length
//     [N bytes] UTF-8: hash string (signed 32-bit integer as string)
//     [4 bytes] Uint32LE: audio data length
//     [M bytes] Raw audio bytes (MP3 or AAC)
//
// Only this file may read/write voice pack binary data.

import { getSharedAudioContext } from './audioContextManager';
import { db } from '../db/schema';

/** Build the download URL for a voice pack by ID.
 *  Vercel Edge Function proxies to GitHub Releases (avoids CORS). */
export function getVoicePackUrl(voiceId: string): string {
  return `/api/voice-packs/${voiceId}_mp3.bin`;
}

export type VoicePackStatus = 'idle' | 'downloading' | 'ready' | 'error';

export interface VoicePackVoice {
  id: string;
  name: string;
  accent: 'American' | 'British';
  gender: 'Female' | 'Male';
}

/** Available voice packs — same voices as Kokoro, but pre-rendered as audio clips. */
export const VOICE_PACK_VOICES: VoicePackVoice[] = [
  { id: 'af_heart', name: 'Heart', accent: 'American', gender: 'Female' },
  { id: 'af_bella', name: 'Bella', accent: 'American', gender: 'Female' },
  { id: 'af_nicole', name: 'Nicole', accent: 'American', gender: 'Female' },
  { id: 'af_sarah', name: 'Sarah', accent: 'American', gender: 'Female' },
  { id: 'af_nova', name: 'Nova', accent: 'American', gender: 'Female' },
  { id: 'am_adam', name: 'Adam', accent: 'American', gender: 'Male' },
  { id: 'am_eric', name: 'Eric', accent: 'American', gender: 'Male' },
  { id: 'am_michael', name: 'Michael', accent: 'American', gender: 'Male' },
  { id: 'am_liam', name: 'Liam', accent: 'American', gender: 'Male' },
  { id: 'bf_emma', name: 'Emma', accent: 'British', gender: 'Female' },
  { id: 'bf_isabella', name: 'Isabella', accent: 'British', gender: 'Female' },
  { id: 'bm_daniel', name: 'Daniel', accent: 'British', gender: 'Male' },
  { id: 'bm_george', name: 'George', accent: 'British', gender: 'Male' },
];

export interface VoicePackInfo {
  voiceId: string;
  clipCount: number;
  sizeBytes: number;
}

/** Hash text using Java-style String.hashCode (signed 32-bit). Must match Colab generator. */
export function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h = ((h << 5) - h) + code;
    h |= 0; // Convert to signed 32-bit integer
  }
  return String(h);
}

class VoicePackService {
  private clips: Map<string, ArrayBuffer> = new Map();
  private status: VoicePackStatus = 'idle';
  private loadedVoiceId: string | null = null;
  private downloadProgress = 0;
  private statusListeners: Set<(status: VoicePackStatus) => void> = new Set();
  private progressListeners: Set<(progress: number) => void> = new Set();
  private logListeners: Set<(entry: string) => void> = new Set();
  private currentSource: AudioBufferSourceNode | null = null;
  private playing = false;

  getStatus(): VoicePackStatus {
    return this.status;
  }

  getLoadedVoiceId(): string | null {
    return this.loadedVoiceId;
  }

  getClipCount(): number {
    return this.clips.size;
  }

  getDownloadProgress(): number {
    return this.downloadProgress;
  }

  isReady(): boolean {
    return this.status === 'ready' && this.clips.size > 0;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  hasClip(text: string): boolean {
    return this.clips.has(hashText(text));
  }

  onStatusChange(listener: (status: VoicePackStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => { this.statusListeners.delete(listener); };
  }

  onProgress(listener: (progress: number) => void): () => void {
    this.progressListeners.add(listener);
    return () => { this.progressListeners.delete(listener); };
  }

  onLog(listener: (entry: string) => void): () => void {
    this.logListeners.add(listener);
    return () => { this.logListeners.delete(listener); };
  }

  private log(msg: string): void {
    const ts = new Date().toLocaleTimeString();
    const entry = `[${ts}] ${msg}`;
    console.log('[VoicePack]', msg);
    for (const listener of this.logListeners) {
      listener(entry);
    }
  }

  private setStatus(status: VoicePackStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private setProgress(progress: number): void {
    this.downloadProgress = progress;
    for (const listener of this.progressListeners) {
      listener(progress);
    }
  }

  /**
   * Load a voice pack from a URL. Downloads the .bin file, parses it,
   * and caches the raw binary in IndexedDB for offline use.
   */
  async loadFromUrl(voiceId: string, url: string): Promise<void> {
    if (this.status === 'ready' && this.loadedVoiceId === voiceId) return;

    this.setStatus('downloading');
    this.setProgress(0);

    try {
      // Check IndexedDB cache first
      this.log('Checking IndexedDB cache...');
      const cached = await this.getCachedPack(voiceId);
      if (cached) {
        this.log(`Cache hit! ${cached.byteLength} bytes. Parsing...`);
        this.parseBin(cached);
        this.loadedVoiceId = voiceId;
        this.setProgress(100);
        this.setStatus('ready');
        this.log(`Ready — ${this.clips.size} clips loaded from cache`);
        return;
      }
      this.log('No cache. Starting download...');

      // Single streaming GET request — edge function proxies and streams the body
      this.log(`Fetching ${url}...`);
      const response = await fetch(url);
      this.log(`Response: HTTP ${response.status}`);

      if (!response.ok) {
        const body = await response.text().catch(() => '(unreadable)');
        throw new Error(`HTTP ${response.status}: ${body}`);
      }

      // Guard against SPA catch-all serving HTML
      const contentType = response.headers.get('content-type') ?? '';
      this.log(`Content-Type: ${contentType}`);
      if (contentType.includes('text/html')) {
        throw new Error('Server returned HTML instead of binary.');
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      this.log(`Content-Length: ${totalBytes} (${(totalBytes / 1024 / 1024).toFixed(1)} MB)`);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      // Stream chunks from the response body
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      let chunkNum = 0;

      this.log('Streaming response body...');
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;
        chunkNum++;
        if (totalBytes > 0) {
          const pct = Math.round((receivedBytes / totalBytes) * 100);
          this.setProgress(pct);
          // Log every ~5MB
          if (chunkNum % 100 === 0) {
            this.log(`Received ${(receivedBytes / 1024 / 1024).toFixed(1)} MB (${pct}%)`);
          }
        }
      }
      this.log(`Download complete: ${(receivedBytes / 1024 / 1024).toFixed(1)} MB in ${chunkNum} chunks`);

      // Combine chunks into single ArrayBuffer
      this.log('Combining into ArrayBuffer...');
      const combined = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      const buffer = combined.buffer;
      this.log('Buffer ready. Parsing binary...');

      // Parse and cache
      this.parseBin(buffer);
      this.log(`Parsed ${this.clips.size} clips. Caching to IndexedDB...`);
      await this.cachePack(voiceId, buffer);
      this.log('Cached. Done!');
      this.loadedVoiceId = voiceId;
      this.setProgress(100);
      this.setStatus('ready');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(`ERROR: ${msg}`);
      this.setStatus('error');
      throw error;
    }
  }

  /**
   * Load a voice pack directly from an ArrayBuffer (e.g. for testing or
   * when the .bin is bundled with the app).
   */
  loadFromBuffer(voiceId: string, buffer: ArrayBuffer): void {
    this.parseBin(buffer);
    this.loadedVoiceId = voiceId;
    this.setProgress(100);
    this.setStatus('ready');
  }

  /**
   * Load a cached voice pack from IndexedDB by voice ID.
   * Returns true if a cached pack was found and loaded.
   */
  async loadCached(voiceId: string): Promise<boolean> {
    if (this.status === 'ready' && this.loadedVoiceId === voiceId) return true;

    const cached = await this.getCachedPack(voiceId);
    if (!cached) return false;

    this.parseBin(cached);
    this.loadedVoiceId = voiceId;
    this.setProgress(100);
    this.setStatus('ready');
    return true;
  }

  /**
   * Speak text by looking up its hash in the loaded voice pack.
   * Returns true if a clip was found and played, false if not found.
   */
  async speak(text: string, speed: number = 1.0): Promise<boolean> {
    const hash = hashText(text);
    const audioData = this.clips.get(hash);

    if (!audioData) {
      return false;
    }

    this.stop();

    const ctx = getSharedAudioContext();

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const audioBuffer = await ctx.decodeAudioData(audioData.slice(0));
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = speed;
    source.connect(ctx.destination);

    this.currentSource = source;
    this.playing = true;

    return new Promise<boolean>((resolve) => {
      source.onended = () => {
        this.playing = false;
        this.currentSource = null;
        resolve(true);
      };
      source.start();
    });
  }

  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped
      }
      this.currentSource = null;
    }
    this.playing = false;
  }

  /** Unload the current voice pack and free memory. */
  unload(): void {
    this.stop();
    this.clips.clear();
    this.loadedVoiceId = null;
    this.setStatus('idle');
    this.setProgress(0);
  }

  /** Delete a cached voice pack from IndexedDB. */
  async deleteCached(voiceId: string): Promise<void> {
    await db.meta.delete(`voicepack-${voiceId}`);
  }

  /** Get info about all cached voice packs. */
  async getCachedPackIds(): Promise<string[]> {
    const allMeta = await db.meta.toArray();
    return allMeta
      .filter((m): m is typeof m & { key: string } => typeof m.key === 'string' && m.key.startsWith('voicepack-'))
      .map(m => m.key.replace('voicepack-', ''));
  }

  // --- Private ---

  private parseBin(buffer: ArrayBuffer): void {
    this.clips.clear();
    const view = new DataView(buffer);
    let offset = 0;

    const count = view.getUint32(offset, true);
    offset += 4;

    for (let i = 0; i < count; i++) {
      const hashLen = view.getUint16(offset, true);
      offset += 2;

      const hashBytes = new Uint8Array(buffer, offset, hashLen);
      const hash = new TextDecoder().decode(hashBytes);
      offset += hashLen;

      const audioLen = view.getUint32(offset, true);
      offset += 4;

      const audioData = buffer.slice(offset, offset + audioLen);
      offset += audioLen;

      this.clips.set(hash, audioData);
    }
  }

  private async getCachedPack(voiceId: string): Promise<ArrayBuffer | null> {
    const record = await db.meta.get(`voicepack-${voiceId}`);
    if (record && (record as unknown as { value: unknown }).value instanceof ArrayBuffer) {
      return (record as unknown as { value: ArrayBuffer }).value;
    }
    return null;
  }

  private async cachePack(voiceId: string, buffer: ArrayBuffer): Promise<void> {
    await db.meta.put({ key: `voicepack-${voiceId}`, value: buffer as unknown as string });
  }
}

// Singleton
export const voicePackService = new VoicePackService();
