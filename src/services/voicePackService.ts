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

interface ClipRef {
  offset: number;
  length: number;
}

class VoicePackService {
  private clipRefs: Map<string, ClipRef> = new Map();
  private packBlob: Blob | null = null;
  private status: VoicePackStatus = 'idle';
  private loadedVoiceId: string | null = null;
  private downloadProgress = 0;
  private statusListeners: Set<(status: VoicePackStatus) => void> = new Set();
  private progressListeners: Set<(progress: number) => void> = new Set();
  private currentSource: AudioBufferSourceNode | null = null;
  private playing = false;

  getStatus(): VoicePackStatus {
    return this.status;
  }

  getLoadedVoiceId(): string | null {
    return this.loadedVoiceId;
  }

  getClipCount(): number {
    return this.clipRefs.size;
  }

  getDownloadProgress(): number {
    return this.downloadProgress;
  }

  isReady(): boolean {
    return this.status === 'ready' && this.clipRefs.size > 0;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  hasClip(text: string): boolean {
    return this.clipRefs.has(hashText(text));
  }

  onStatusChange(listener: (status: VoicePackStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => { this.statusListeners.delete(listener); };
  }

  onProgress(listener: (progress: number) => void): () => void {
    this.progressListeners.add(listener);
    return () => { this.progressListeners.delete(listener); };
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
   * Load a voice pack from a URL. Downloads the .bin file in chunks,
   * parses it, and caches as a Blob in IndexedDB for offline use.
   *
   * Uses Blob (disk-backed) instead of ArrayBuffer (RAM) so the full
   * 234MB file doesn't have to fit in mobile Safari's ~256MB heap.
   */
  async loadFromUrl(voiceId: string, url: string): Promise<void> {
    if (this.status === 'ready' && this.loadedVoiceId === voiceId) return;

    this.setStatus('downloading');
    this.setProgress(0);

    try {
      // Check IndexedDB cache first
      const cached = await this.getCachedBlob(voiceId);
      if (cached) {
        await this.parseBinFromBlob(cached);
        this.packBlob = cached;
        this.loadedVoiceId = voiceId;
        this.setProgress(100);
        this.setStatus('ready');
        return;
      }

      // Download in 5MB chunks using Range requests to stay within
      // the edge function's 25-second timeout per request.
      const CHUNK_SIZE = 5 * 1024 * 1024;
      const blobParts: Blob[] = [];
      let receivedBytes = 0;
      let totalBytes = 0;

      for (;;) {
        const start = receivedBytes;
        const end = start + CHUNK_SIZE - 1;

        const chunkResp = await fetch(url, {
          headers: { 'Range': `bytes=${start}-${end}` },
        });

        if (chunkResp.status === 200) {
          // Server doesn't support Range — got whole file
          const blob = await chunkResp.blob();
          await this.parseBinFromBlob(blob);
          this.packBlob = blob;
          this.loadedVoiceId = voiceId;
          this.setProgress(100);
          this.setStatus('ready');
          this.cacheBlob(voiceId, blob).catch(() => {});
          return;
        }

        if (chunkResp.status !== 206) {
          throw new Error(`Chunk download failed (HTTP ${chunkResp.status}) at byte ${start}.`);
        }

        if (totalBytes === 0) {
          const rangeHeader = chunkResp.headers.get('content-range') ?? '';
          const match = rangeHeader.match(/\/(\d+)$/);
          if (match) {
            totalBytes = parseInt(match[1], 10);
          }
        }

        const chunkBlob = await chunkResp.blob();
        blobParts.push(chunkBlob);
        receivedBytes += chunkBlob.size;

        if (totalBytes > 0) {
          this.setProgress(Math.round((receivedBytes / totalBytes) * 100));
        }

        if (chunkBlob.size < CHUNK_SIZE || (totalBytes > 0 && receivedBytes >= totalBytes)) {
          break;
        }
      }

      // Combine chunks into a single Blob (disk-backed, not RAM)
      const fullBlob = new Blob(blobParts, { type: 'application/octet-stream' });

      // Parse the index from the blob — only reads small slices into RAM
      await this.parseBinFromBlob(fullBlob);
      this.packBlob = fullBlob;
      this.loadedVoiceId = voiceId;
      this.setProgress(100);
      this.setStatus('ready');

      // Cache in IndexedDB in the background
      this.cacheBlob(voiceId, fullBlob).catch((err) => {
        console.warn('[VoicePackService] Cache failed (will re-download next time):', err);
      });
    } catch (error) {
      console.error('[VoicePackService] Failed to load voice pack:', error);
      this.setStatus('error');
      throw error;
    }
  }

  /**
   * Load a voice pack directly from an ArrayBuffer (e.g. for testing or
   * when the .bin is bundled with the app).
   */
  loadFromBuffer(voiceId: string, buffer: ArrayBuffer): void {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    // parseBinFromBlob is async but we fire-and-forget for test compat
    this.parseBinFromBlob(blob).then(() => {
      this.packBlob = blob;
      this.loadedVoiceId = voiceId;
      this.setProgress(100);
      this.setStatus('ready');
    });
  }

  /**
   * Load a cached voice pack from IndexedDB by voice ID.
   * Returns true if a cached pack was found and loaded.
   */
  async loadCached(voiceId: string): Promise<boolean> {
    if (this.status === 'ready' && this.loadedVoiceId === voiceId) return true;

    const cached = await this.getCachedBlob(voiceId);
    if (!cached) return false;

    await this.parseBinFromBlob(cached);
    this.packBlob = cached;
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
    const ref = this.clipRefs.get(hash);

    if (!ref || !this.packBlob) {
      return false;
    }

    // Slice only the single clip from the blob (disk-backed → RAM)
    const clipSlice = this.packBlob.slice(ref.offset, ref.offset + ref.length);
    const audioData = await clipSlice.arrayBuffer();

    this.stop();

    const ctx = getSharedAudioContext();

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const audioBuffer = await ctx.decodeAudioData(audioData);
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
    this.clipRefs.clear();
    this.packBlob = null;
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

  /**
   * Parse the clip index from a Blob without loading the entire file into RAM.
   * Only reads small header slices into memory to build the offset map.
   */
  private async parseBinFromBlob(blob: Blob): Promise<void> {
    this.clipRefs.clear();

    // Read first 4 bytes for clip count
    const headerBuf = await blob.slice(0, 4).arrayBuffer();
    const headerView = new DataView(headerBuf);
    const count = headerView.getUint32(0, true);

    // Read the index portion in 1MB pages to avoid loading full file
    let offset = 4;
    const PAGE_SIZE = 1024 * 1024;
    let pageBuf: ArrayBuffer | null = null;
    let pageStart = 0;

    for (let i = 0; i < count; i++) {
      // Ensure we have enough buffered data for the index entry header (6 bytes min)
      if (!pageBuf || offset - pageStart + 6 > pageBuf.byteLength) {
        pageStart = offset;
        const pageEnd = Math.min(offset + PAGE_SIZE, blob.size);
        pageBuf = await blob.slice(pageStart, pageEnd).arrayBuffer();
      }

      const localOff = offset - pageStart;
      const view = new DataView(pageBuf);

      const hashLen = view.getUint16(localOff, true);

      // Make sure we have enough for hash + audioLen header
      if (localOff + 2 + hashLen + 4 > pageBuf.byteLength) {
        pageStart = offset;
        const pageEnd = Math.min(offset + PAGE_SIZE, blob.size);
        pageBuf = await blob.slice(pageStart, pageEnd).arrayBuffer();
      }

      const localOff2 = offset - pageStart;
      const view2 = new DataView(pageBuf);

      const hLen = view2.getUint16(localOff2, true);
      const hashBytes = new Uint8Array(pageBuf, localOff2 + 2, hLen);
      const hash = new TextDecoder().decode(hashBytes);

      const audioLen = view2.getUint32(localOff2 + 2 + hLen, true);

      const audioOffset = offset + 2 + hLen + 4;
      this.clipRefs.set(hash, { offset: audioOffset, length: audioLen });

      offset = audioOffset + audioLen;
    }
  }

  private async getCachedBlob(voiceId: string): Promise<Blob | null> {
    const record = await db.meta.get(`voicepack-${voiceId}`);
    if (record && (record as unknown as { value: unknown }).value instanceof Blob) {
      return (record as unknown as { value: Blob }).value;
    }
    return null;
  }

  private async cacheBlob(voiceId: string, blob: Blob): Promise<void> {
    await db.meta.put({ key: `voicepack-${voiceId}`, value: blob as unknown as string });
  }
}

// Singleton
export const voicePackService = new VoicePackService();
