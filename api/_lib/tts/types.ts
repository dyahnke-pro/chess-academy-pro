/**
 * The TTS provider seam.
 *
 * `/api/tts` used to call AWS Polly directly. The 12-month Polly free tier is a
 * cliff (CLAUDE.md G4's planned migration), so synthesis now goes through this
 * interface and the vendor is swappable without touching the endpoint's HTTP
 * contract — which is load-bearing, because `voiceService` reads the status,
 * the `X-TTS-Error-Name` header and `Retry-After` to tune its cooldown.
 *
 * Contract every provider MUST honor:
 *   - resolve with a ReadableStream of MP3 bytes, never a buffered blob. G4 is
 *     absolute: buffering the clip before the first byte leaves the server was
 *     the primary source of voice lag.
 *   - throw `TtsProviderError` (not a bare Error) so the endpoint can map the
 *     failure onto the status + retry hint the client already understands.
 */

/** Engine class of a voice. Mirrors Polly's split, which the SSML builder keys
 *  off: `generative` voices ignore prosody tags, `neural` honor them. */
export type VoiceEngine = 'neural' | 'standard' | 'generative';

export interface SynthesisRequest {
  /** Plain text, or SSML when `ssml` is true. */
  text: string;
  /** App-level voice key ('ruth', 'joanna', …) — NOT a vendor voice id. */
  voiceKey: string;
  /** Engine class the caller resolved for this voice. */
  engine: VoiceEngine;
  /** BCP-47 locale when the passage was language-detected (e.g. 'es-ES'). */
  languageCode?: string;
  /** True when `text` is already an SSML document. */
  ssml: boolean;
  /** Personality style for prosody ('default' | 'soft' | 'edgy' | …). */
  style?: string;
  /** '#25' decisive-beat prosody spike. */
  prosodyMode?: string;
}

/**
 * Failure shape the endpoint can translate into the client's error contract.
 * `errorName` lands in the `X-TTS-Error-Name` header; `retryAfterSec` becomes
 * `Retry-After` and drives voiceService's cooldown length.
 */
export class TtsProviderError extends Error {
  readonly errorName: string;
  readonly status: number;
  readonly retryAfterSec?: number;

  constructor(errorName: string, message: string, status = 500, retryAfterSec?: number) {
    super(message);
    this.name = 'TtsProviderError';
    this.errorName = errorName;
    this.status = status;
    this.retryAfterSec = retryAfterSec;
  }
}

export interface TtsProvider {
  /** Stable id for logs / audits ('google', 'cloud'). */
  readonly id: string;
  /** False when the provider's credentials aren't configured — the endpoint
   *  uses this to pick a leg instead of failing a request. */
  isConfigured(): boolean;
  /** Resolve with a stream of MP3 bytes, or throw `TtsProviderError`. */
  synthesize(req: SynthesisRequest): Promise<ReadableStream<Uint8Array>>;
}
