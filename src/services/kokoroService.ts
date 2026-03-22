// Kokoro TTS — high-quality open-source text-to-speech running entirely in-browser
// Uses kokoro-js (ONNX model via Transformers.js) with WASM/WebGPU backend
// Only this file may import from kokoro-js.

import { IS_IOS } from '../utils/constants';

export type KokoroModelStatus = 'idle' | 'downloading' | 'ready' | 'error';

export interface KokoroVoice {
  id: string;
  name: string;
  accent: 'American' | 'British';
  gender: 'Female' | 'Male';
}

export const KOKORO_VOICES: KokoroVoice[] = [
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

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const SAMPLE_RATE = 24000;

type KokoroTTSInstance = {
  generate: (text: string, options: { voice: string; speed?: number }) => Promise<{
    audio: Float32Array;
    sampling_rate: number;
  }>;
};

class KokoroService {
  private tts: KokoroTTSInstance | null = null;
  private status: KokoroModelStatus = 'idle';
  private statusListeners: Set<(status: KokoroModelStatus) => void> = new Set();
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private playing = false;
  private downloadProgress = 0;
  private progressListeners: Set<(progress: number) => void> = new Set();
  private loadPromise: Promise<void> | null = null;

  getStatus(): KokoroModelStatus {
    return this.status;
  }

  getDownloadProgress(): number {
    return this.downloadProgress;
  }

  isReady(): boolean {
    return this.status === 'ready';
  }

  isPlaying(): boolean {
    return this.playing;
  }

  onStatusChange(listener: (status: KokoroModelStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => { this.statusListeners.delete(listener); };
  }

  onProgress(listener: (progress: number) => void): () => void {
    this.progressListeners.add(listener);
    return () => { this.progressListeners.delete(listener); };
  }

  private setStatus(status: KokoroModelStatus): void {
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

  async loadModel(): Promise<void> {
    if (this.status === 'ready') return;

    // Deduplicate concurrent load calls
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.doLoadModel();
    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async doLoadModel(): Promise<void> {
    this.setStatus('downloading');
    this.setProgress(0);

    try {
      // On iOS, configure ONNX runtime to use single-threaded WASM
      // (iOS WKWebView lacks SharedArrayBuffer for multi-threading)
      if (IS_IOS) {
        const { env } = await import(/* @vite-ignore */ '@huggingface/transformers') as {
          env: { backends: { onnx: { wasm: { numThreads: number; proxy: boolean } } } };
        };
        env.backends.onnx.wasm.numThreads = 1;
        env.backends.onnx.wasm.proxy = false;
      }

      const { KokoroTTS } = await import(/* @vite-ignore */ 'kokoro-js') as {
        KokoroTTS: {
          from_pretrained: (
            modelId: string,
            options: { dtype: string; device: string; progress_callback?: (progress: { progress: number }) => void },
          ) => Promise<KokoroTTSInstance>;
        };
      };

      const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (progress: { progress: number }) => {
          if (typeof progress.progress === 'number') {
            this.setProgress(Math.round(progress.progress));
          }
        },
      });

      this.tts = tts;
      this.setProgress(100);
      this.setStatus('ready');
    } catch (error) {
      console.error('[KokoroService] Failed to load model:', error);
      this.setStatus('error');
      throw error;
    }
  }

  async speak(text: string, voice: string = 'af_heart', speed: number = 1.0): Promise<void> {
    if (!this.tts) {
      throw new Error('Kokoro model not loaded. Call loadModel() first.');
    }

    this.stop();

    const result = await this.tts.generate(text, { voice, speed });
    await this.playAudio(result.audio, result.sampling_rate);
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

  private async playAudio(samples: Float32Array, sampleRate: number = SAMPLE_RATE): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const buffer = this.audioContext.createBuffer(1, samples.length, sampleRate);
    buffer.getChannelData(0).set(samples);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    this.currentSource = source;
    this.playing = true;

    return new Promise<void>((resolve) => {
      source.onended = () => {
        this.playing = false;
        this.currentSource = null;
        resolve();
      };
      source.start();
    });
  }

  /** Unload model and free memory */
  unload(): void {
    this.stop();
    this.tts = null;
    this.setStatus('idle');
    this.setProgress(0);
  }
}

// Singleton
export const kokoroService = new KokoroService();
