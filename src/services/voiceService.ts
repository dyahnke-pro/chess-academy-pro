// AI voice synthesis — all coach speech goes through here
// Fallback chain: Amazon Polly → Web Speech API
// Only this file may call TTS APIs.

import { speechService } from './speechService';
import { voicePackService } from './voicePackService';
import { getSharedAudioContext } from './audioContextManager';
import { db } from '../db/schema';

/** Absolute URL for Polly TTS — needed when running inside Capacitor WKWebView */
const VERCEL_ORIGIN = 'https://chess-academy-pro.vercel.app';
const isCapacitor = typeof window !== 'undefined' && window.location.protocol === 'capacitor:';

export function getTtsUrl(text: string, voice: string, useSsml = true): string {
  const base = isCapacitor ? VERCEL_ORIGIN : '';
  // SSML default-on so Polly gets engine-aware structure (paragraph
  // on generative voices, prosody slowdown on neural). Short clips
  // / warmups opt out to avoid empty-SSML edge cases.
  const ssmlParam = useSsml ? '&ssml=1' : '';
  return `${base}/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}${ssmlParam}`;
}

/** Available Amazon Polly voices (served via /api/tts endpoint) */
export const POLLY_VOICES = [
  { id: 'ruth',     name: 'Ruth',     description: 'Generative female', engine: 'generative' },
  { id: 'matthew',  name: 'Matthew',  description: 'Generative male',   engine: 'generative' },
  { id: 'danielle', name: 'Danielle', description: 'Generative female', engine: 'generative' },
  { id: 'gregory',  name: 'Gregory',  description: 'Generative male',   engine: 'generative' },
  { id: 'joanna',   name: 'Joanna',   description: 'Neural female',     engine: 'neural' },
  { id: 'stephen',  name: 'Stephen',  description: 'Neural male',       engine: 'neural' },
  { id: 'kendra',   name: 'Kendra',   description: 'Neural female',     engine: 'neural' },
  { id: 'kimberly', name: 'Kimberly', description: 'Neural female',     engine: 'neural' },
  { id: 'salli',    name: 'Salli',    description: 'Neural female',     engine: 'neural' },
  { id: 'joey',     name: 'Joey',     description: 'Neural male',       engine: 'neural' },
  { id: 'ivy',      name: 'Ivy',      description: 'Neural child',      engine: 'neural' },
  { id: 'kevin',    name: 'Kevin',    description: 'Neural child',      engine: 'neural' },
] as const;

// Web Speech fallback settings
const WEB_SPEECH_FALLBACK = { rate: 0.95, pitch: 0.78 };

/** How long to cool down Polly after a failed call before trying again.
 *  A one-off 429 / 503 from AWS or a transient network hiccup shouldn't
 *  permanently disable Polly for the session — we retry after this
 *  window. Short enough that the user gets their premium voice back
 *  within a move or two; long enough to avoid hammering a broken
 *  endpoint. */
const POLLY_COOLDOWN_MS = 15_000;

/** Voice delivery tier currently serving speak() calls. Exposed for
 *  UI so the Settings screen can show "Polly active" vs "Web Speech
 *  fallback". */
export type VoiceTier = 'polly' | 'voice-pack' | 'web-speech' | 'muted';

/** Map piece letters to spoken names. Applied right before TTS so
 *  nothing reaches the speech engine as "P" / "N" / "B" / "R" / "Q" /
 *  "K" — those sound wrong when read aloud. Upstream prompts and
 *  formatters also try to avoid them, but this is the last line of
 *  defense: regardless of source (LLM output that ignored the prompt,
 *  legacy code path, cached response), the student never hears
 *  "hanging P on e4". */
const PIECE_LETTER_NAMES: Record<string, string> = {
  P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king',
};

/** SAN-ish move pattern — captures piece+capture+square/square+promo.
 *  Used to expand shorthand SAN like "Nxf7" or "Bc4" into plain
 *  English before TTS. Kept simple on purpose: false-positives here
 *  just produce slightly odd speech, never crashes. */
const SAN_MOVE_RE = /\b([NBRQK])(x?)([a-h][1-8])\b/g;
/** Pawn-capture SAN (e.g. "exd5", "fxe6") — no piece letter. */
const PAWN_CAPTURE_RE = /\b([a-h])x([a-h][1-8])\b/g;
/** Piece letter immediately followed by a square in any bracketing —
 *  e.g. "P(f3)", "P [f3]", "P <f3>", "P →f3", "P->f3", "P—f3",
 *  "P (on f3)". Covers the "piece-and-location" shorthand that doesn't
 *  use the word "on" (or wraps it in parens). */
const PIECE_LETTER_ADJACENT_SQUARE_RE = /\b([PNBRQK])\s*[(\[<\-\u2013\u2014\u2192]+\s*(?:on\s+)?([a-h][1-8])\b/g;
/** Parenthesized bare piece letter: "piece at f3 (P)" → "piece at f3 (pawn)". */
const PIECE_LETTER_IN_PARENS_RE = /([(\[<])([PNBRQK])(?=[)\]>.,;:\s])/g;
/** Isolated piece-letter shorthand after a chess-context word. Kept
 *  narrow enough not to touch "Plan B" in non-chess prose, but broad
 *  enough to cover the verbs and qualifiers LLMs actually emit
 *  when they slip back into SAN shorthand. */
const PIECE_LETTER_AFTER_CONTEXT_RE =
  /\b(hanging|loose|dropped|undefended|attacked|captured|defended|protected|pinned|skewered|forked|trapped|weak|strong|passed|isolated|doubled|exposed|advanced|central|enemy|opposing|opponent's|white's|black's|white|black|the|a|an|my|your|their|our|his|her|its|that|this|these|those|both|either|neither|every|each|one|two|three|save|saving|protect|protecting|lose|losing|take|taking|grab|grabbing|trade|trading|exchange|exchanging|develop|developing|advance|advancing|push|pushing|promote|promoting|sacrifice|sacrificing|hang|hangs)\s+([PNBRQK])\b/gi;
/** Piece letter followed by an action word (on/to/at/from/hangs/etc.).
 *  Runs after the "after-context" pass so both halves of a sentence
 *  like "your P on f3" get caught. */
const ISOLATED_PIECE_LETTER_RE =
  /\b([PNBRQK])\b(?=\s+(?:on|to|at|from|of|takes|is|was|were|are|hangs|hanging|sits|sitting|stands|standing|attacks|attacking|defends|defending|moves|moved|moving|can|could|should|would|will|might|may|goes|going|covers|covering|controls|controlling|threatens|threatening|protects|protecting|supports|supporting)\b)/g;
/** Castling shorthand → plain English. "O-O" sounds nothing like
 *  "castle kingside" when read aloud. */
const CASTLE_KING_RE = /\bO-O\b(?!-)/g;
const CASTLE_QUEEN_RE = /\bO-O-O\b/g;

/** Defense-in-depth second-layer check. Returns true if `text` still
 *  contains piece-letter shorthand that `sanitizeForTTS` should have
 *  expanded but didn't. The auditor wires this after every TTS call
 *  so a new LLM shape slipping past the sanitizer regexes surfaces
 *  in the app audit log. Independent of the narrationAuditor's
 *  factual-claim checks — different failure mode, same defense. */
const LEAK_DETECTOR_RE =
  /\b[PNBRQK]\s+(?:on|to|at|from|hangs|hanging|is|was|takes|attacks|defends|sits|stands|covers|controls|threatens|protects|supports)\b|\b(?:hanging|loose|dropped|undefended|attacked|captured|save|protect|lose|hang|the|a|an|my|your|their|our|his|her|weak|strong|enemy|opposing|black['\u2019]s|white['\u2019]s)\s+[PNBRQK]\b/i;
export function detectSanitizerLeak(text: string): boolean {
  if (!text) return false;
  return LEAK_DETECTOR_RE.test(text);
}

/** Extracted by WO-COACH-NARRATION-06 so the piece-letter normalization
 *  is reusable by UI surfaces that render engine-output text without
 *  going through the TTS pipeline (blunder banners, hanging-piece
 *  alerts, tip bubbles). UI-safe: keeps SAN notation like "Nxf7"
 *  untouched and does NOT expand castling "O-O" — those read fine on
 *  screen and shouldn't be reshaped for visual display. Only the
 *  descriptive-prose shorthand ("White P on h7" → "White pawn on h7",
 *  "hanging N" → "hanging knight") is normalized.
 *  Pure function — safe to call on any string. */
export function normalizePieceShorthand(text: string): string {
  if (!text) return text;
  let out = text;
  // Bracketed / arrowed piece-on-square shorthand: "P(f3)" → "pawn on f3".
  out = out.replace(PIECE_LETTER_ADJACENT_SQUARE_RE, (_, piece: string, square: string) => {
    const name = PIECE_LETTER_NAMES[piece] ?? piece;
    return `${name} on ${square}`;
  });
  // Bare piece letter in parens/brackets: "(P)" → "(pawn)".
  out = out.replace(PIECE_LETTER_IN_PARENS_RE, (_, bracket: string, piece: string) => {
    const name = PIECE_LETTER_NAMES[piece] ?? piece;
    return `${bracket}${name}`;
  });
  // Isolated piece letters after a chess-context word ("hanging P",
  // "save P", "the white B"). Case-insensitive so "White p" → "White pawn".
  out = out.replace(PIECE_LETTER_AFTER_CONTEXT_RE, (_, lead: string, piece: string) => {
    const name = PIECE_LETTER_NAMES[piece.toUpperCase()] ?? piece;
    return `${lead} ${name}`;
  });
  // Piece letter followed by an action word ("P on f3", "N attacks").
  out = out.replace(ISOLATED_PIECE_LETTER_RE, (_, piece: string) => PIECE_LETTER_NAMES[piece] ?? piece);
  return out;
}

/** Normalise LLM output so the spoken layer never has to read chess
 *  notation aloud. Pure function — safe to call on any string. Wraps
 *  normalizePieceShorthand with the TTS-only transforms (SAN expansion,
 *  castling → plain English, pawn-capture expansion). */
export function sanitizeForTTS(text: string): string {
  if (!text) return text;
  let out = text;
  // Castling FIRST (before piece-letter substitutions mangle the O's).
  out = out.replace(CASTLE_QUEEN_RE, 'castle queenside');
  out = out.replace(CASTLE_KING_RE, 'castle kingside');
  // Pawn captures: "exd5" → "e-pawn takes d5"
  out = out.replace(PAWN_CAPTURE_RE, (_, file: string, dest: string) => `${file}-pawn takes ${dest}`);
  // Piece SAN: "Nxf7" → "knight takes f7", "Bc4" → "bishop to c4"
  out = out.replace(SAN_MOVE_RE, (_, piece: string, capture: string, dest: string) => {
    const name = PIECE_LETTER_NAMES[piece] ?? piece;
    return capture === 'x' ? `${name} takes ${dest}` : `${name} to ${dest}`;
  });
  // Descriptive piece-letter normalization (UI-safe, reusable).
  return normalizePieceShorthand(out);
}

class VoiceService {
  private currentSource: AudioBufferSourceNode | null = null;
  private abortController: AbortController | null = null;
  private playing = false;
  private speed = 1.0;
  /** Whether the Polly endpoint is currently considered usable. Set by
   *  warmup() on probe success, cleared (temporarily) by speakPolly on
   *  failure. Comes back automatically after POLLY_COOLDOWN_MS so a
   *  transient blip doesn't drop the user to Web Speech for the whole
   *  session. */
  private pollyAvailable = false;
  /** When non-null, Polly is in cooldown until this timestamp. Reads
   *  of `pollyAvailable` treat a past cooldown as expired and
   *  re-enable Polly automatically. */
  private pollyCooldownUntil: number | null = null;
  /** Tier actually used on the last successful speak() call. Read by
   *  the Settings UI to show which voice engine is active. */
  private lastTier: VoiceTier = 'muted';

  /** Max audio-cache entries before LRU eviction. ~50 entries ≈ 5-8MB
   *  depending on utterance length. Prior implementation was
   *  unbounded, which the perf audit flagged as a 90-min-session
   *  memory leak on iOS PWA (~15MB after 60+ narrations). */
  private static readonly AUDIO_CACHE_MAX_ENTRIES = 50;

  /** In-memory LRU cache of Polly audio buffers keyed by "voice:text".
   *  Map iteration order IS insertion order per spec, so the oldest
   *  entry is at the front. On hit we delete+reinsert to mark as
   *  most-recently-used; on eviction we drop the first (oldest) key. */
  private audioCache = new Map<string, ArrayBuffer>();

  /** Mark a cache entry as most-recently-used (move to end of Map). */
  private touchAudioCacheEntry(key: string): ArrayBuffer | undefined {
    const buf = this.audioCache.get(key);
    if (buf === undefined) return undefined;
    this.audioCache.delete(key);
    this.audioCache.set(key, buf);
    return buf;
  }

  /** Insert with LRU eviction of the oldest entry when over cap. */
  private setAudioCacheEntry(key: string, buf: ArrayBuffer): void {
    // Delete-and-reinsert guarantees MRU position even on overwrite.
    this.audioCache.delete(key);
    this.audioCache.set(key, buf);
    if (this.audioCache.size > VoiceService.AUDIO_CACHE_MAX_ENTRIES) {
      const oldest = this.audioCache.keys().next().value;
      if (oldest !== undefined) this.audioCache.delete(oldest);
    }
  }

  /** True when Polly is currently available (warmup succeeded and
   *  we're not in a failure cooldown). Used by the speakInternal
   *  chain and exposed to Settings UI for diagnostics. */
  isPollyLive(): boolean {
    if (this.pollyAvailable) return true;
    if (this.pollyCooldownUntil && Date.now() >= this.pollyCooldownUntil) {
      // Cooldown expired — optimistically clear the flag so the next
      // speak() tries Polly again. If it fails again we'll just come
      // back here on the next call.
      this.pollyCooldownUntil = null;
      this.pollyAvailable = true;
      return true;
    }
    return false;
  }

  /** Tier used on the last successful speak() call. */
  getCurrentTier(): VoiceTier {
    return this.lastTier;
  }

  // Cached preferences to avoid DB read on every speak() call
  private cachedPrefs: {
    voiceEnabled: boolean;
    pollyEnabled: boolean;
    pollyVoice: string;
    systemVoiceURI: string | null;
    voiceSpeed: number;
  } | null = null;
  private prefsCacheTime = 0;
  private static CACHE_TTL = 300_000; // 5 min — settings rarely change mid-session

  setSpeed(rate: number): void {
    this.speed = Math.max(0.5, Math.min(2.0, rate));
  }

  getSpeed(): number {
    return this.speed;
  }

  /** Pre-load voice preferences and warm up audio. Call early (e.g. on page mount).
   *  Probes the Polly endpoint — if reachable, enables Polly for the session.
   *  Otherwise Polly stays disabled so speak() falls through to Web Speech instantly. */
  async warmup(): Promise<void> {
    const prefs = await this.loadPrefs();
    // Prime the AudioContext so first decode isn't cold
    getSharedAudioContext();

    if (prefs?.pollyEnabled && prefs.voiceEnabled) {
      // Probe Polly availability with a short timeout
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        // Probe uses plain text (SSML=false) — no need to pay the
        // SSML parse cost for a one-char warmup, and it avoids any
        // chance of empty-SSML edge cases on Polly.
        const url = getTtsUrl('.', prefs.pollyVoice, false);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          // Polly is live — enable it and prime AudioContext
          this.pollyAvailable = true;
          const buf = await res.arrayBuffer();
          const ctx = getSharedAudioContext();
          try { await ctx.decodeAudioData(buf); } catch { /* tiny clip may fail — ok */ }
        }
      } catch {
        // Polly unreachable — stays disabled
      }
    }
  }

  private async loadPrefs(): Promise<typeof this.cachedPrefs> {
    const now = Date.now();
    if (this.cachedPrefs && (now - this.prefsCacheTime) < VoiceService.CACHE_TTL) {
      return this.cachedPrefs;
    }
    const profile = await db.profiles.get('main');
    if (!profile) {
      this.cachedPrefs = null;
      return null;
    }
    // Cast to partial — old IndexedDB records may lack newer fields
    const prefs = profile.preferences as Partial<typeof profile.preferences>;
    this.cachedPrefs = {
      voiceEnabled: prefs.voiceEnabled ?? true,
      pollyEnabled: prefs.pollyEnabled ?? false,
      pollyVoice: prefs.pollyVoice || 'ruth',
      systemVoiceURI: prefs.systemVoiceURI ?? null,
      voiceSpeed: prefs.voiceSpeed ?? 1.0,
    };
    this.prefsCacheTime = now;
    return this.cachedPrefs;
  }

  /** Invalidate cached preferences (call after settings change). */
  clearCache(): void {
    this.cachedPrefs = null;
    this.prefsCacheTime = 0;
  }

  /** Fire-and-forget audit log of every speak invocation so the next
   *  legacy-voice regression surfaces in one session instead of needing
   *  grep archaeology. Added by WO-LEGACY-VOICE-01. Dynamic import so
   *  voiceService doesn't take a hard dep on appAuditor (which pulls
   *  Dexie — can cold-start early in the app lifecycle). */
  private logSpeakInvoked(method: string, text: string): void {
    const preview = text.slice(0, 40);
    void import('./appAuditor').then(({ logAppAudit }) => {
      void logAppAudit({
        kind: 'voice-speak-invoked',
        category: 'subsystem',
        source: `voiceService.${method}`,
        summary: preview,
        details: text.length > 40 ? `length=${text.length}` : undefined,
      });
    }).catch(() => {
      // Never break speech on an audit-log failure.
    });
  }

  async speak(text: string): Promise<void> {
    this.logSpeakInvoked('speak', text);
    return this.speakInternal(sanitizeForTTS(text), false);
  }

  /** Low-latency speak for training modes — skips Polly/voice-packs and DB reads.
   *  Uses cached preferences (from warmup) and goes straight to Web Speech API. */
  async speakFast(text: string): Promise<void> {
    this.logSpeakInvoked('speakFast', text);
    if (this.cachedPrefs && !this.cachedPrefs.voiceEnabled) return;

    // Stop any in-flight speech without going through the full stop() chain
    if (speechService.isSpeaking) {
      speechService.stop();
    }

    const speed = this.cachedPrefs?.voiceSpeed ?? this.speed;
    if (this.cachedPrefs?.systemVoiceURI) {
      speechService.setVoice(this.cachedPrefs.systemVoiceURI);
    }
    await speechService.speak(sanitizeForTTS(text), { ...WEB_SPEECH_FALLBACK, rate: speed });
  }

  /** Speak regardless of the voiceEnabled preference.
   *  Used by the voice-chat mic where the user explicitly opted into voice. */
  async speakForced(text: string): Promise<void> {
    this.logSpeakInvoked('speakForced', text);
    return this.speakInternal(sanitizeForTTS(text), true);
  }

  /** Queue a sentence without stopping current speech. For streaming voice responses. */
  speakQueuedForced(text: string): void {
    this.logSpeakInvoked('speakQueuedForced', text);
    if (this.cachedPrefs?.systemVoiceURI) {
      speechService.setVoice(this.cachedPrefs.systemVoiceURI);
    }
    const speed = this.cachedPrefs?.voiceSpeed ?? this.speed;
    speechService.queue(sanitizeForTTS(text), { rate: speed, pitch: 0.78 });
  }

  private async speakInternal(text: string, force: boolean): Promise<void> {
    // Dev-mode guard: warn when a new speak fires while a previous one
    // is still playing. This is the root cause of every "two voices
    // overlap" bug we've fixed — callers doing `void speak(A)` then
    // `void speak(B)` without awaiting. The stop() below handles it
    // gracefully, but the warning helps catch the caller pattern
    // during development.
    if (import.meta.env.DEV && this.playing) {
      console.warn(
        '[VoiceService] speak() called while already playing — previous speech will be cut off.',
        'Caller should `await speak()` or chain with .then() to prevent overlap.',
        { newText: text.slice(0, 60) },
      );
    }
    // Defense-in-depth: after sanitizeForTTS has run at the call site,
    // scan the result for piece-letter shorthand that still slipped
    // through. Different failure mode than narrationAuditor's
    // factual checks — this catches new LLM shapes the sanitizer
    // vocabulary doesn't know about yet. Fire-and-forget; never
    // blocks the speak path.
    if (detectSanitizerLeak(text)) {
      void import('./appAuditor').then(({ logAppAudit }) => {
        void logAppAudit({
          kind: 'sanitizer-leak',
          category: 'subsystem',
          source: 'voiceService.speakInternal',
          summary: 'Piece-letter shorthand survived sanitizeForTTS',
          details: `text: ${text.slice(0, 300)}`,
        });
      });
    }
    this.stop();

    const prefs = await this.loadPrefs();
    if (!prefs) {
      this.speed = 0.95;
      await this.speakFallback(text);
      this.lastTier = 'web-speech';
      return;
    }

    if (!force && !prefs.voiceEnabled) {
      this.lastTier = 'muted';
      return;
    }

    // Register MediaSession pause/stop handlers so Bluetooth headset
    // play/pause buttons and OS-level media controls can interrupt
    // the coach. Without this, tapping pause on AirPods during a
    // narration does nothing (or falls through to the OS default).
    // Re-registered on every speak so handlers always reference the
    // current voiceService instance.
    this.configureMediaSession();

    this.speed = prefs.voiceSpeed;

    // Tier 1: Amazon Polly. `isPollyLive()` handles cooldown expiry
    // so a transient failure doesn't drop us to Web Speech forever.
    if (prefs.pollyEnabled && this.isPollyLive()) {
      const success = await this.speakPolly(text, prefs.pollyVoice);
      if (success) {
        this.lastTier = 'polly';
        return;
      }
      // fall through to tiers 2/3 for this call; Polly will be retried
      // on the next call once the cooldown expires (see isPollyLive).
    }

    // Tier 2: Offline voice packs (pre-rendered clips cached in IndexedDB)
    if (voicePackService.isReady()) {
      const played = await voicePackService.speak(text, this.speed);
      if (played) {
        this.lastTier = 'voice-pack';
        return;
      }
    }

    // Tier 3: Web Speech API (with user's selected system voice)
    if (prefs.systemVoiceURI) {
      speechService.setVoice(prefs.systemVoiceURI);
    }
    await this.speakFallback(text);
    this.lastTier = 'web-speech';
  }

  /** Register MediaSession action handlers so BT headset / OS media
   *  controls can pause & stop the coach. Safe no-op when the API
   *  isn't available. Called on every speak() since the spec allows
   *  re-registering; browsers dedupe internally. */
  private configureMediaSession(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      // A title makes the BT device show something meaningful on its
      // display when available (some models show track info).
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Chess Academy Coach',
        artist: 'Voice narration',
      });
      navigator.mediaSession.setActionHandler('pause', () => this.stop());
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
      // We don't implement play/seek because TTS isn't resumable in a
      // meaningful way (would require tracking sentence position).
      // Clearing these prevents BT "play" from triggering the OS
      // default (silent) behaviour and getting stuck.
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    } catch {
      // MediaSession throws if a handler isn't supported on the
      // platform — safe to ignore, we fall through to default.
    }
  }

  stop(): void {
    // Abort any in-flight Polly fetch
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped
      }
      this.currentSource = null;
    }
    this.playing = false;
    // Only call cancel() when something is actually speaking — avoids the
    // costly cancel()-induced delay on iOS/Safari when the queue is empty.
    if (speechService.isSpeaking) {
      speechService.stop();
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private pollyKey(text: string, voice: string): string {
    return `${voice}:${text}`;
  }

  /** Mark Polly as temporarily unavailable. Cleared automatically once
   *  POLLY_COOLDOWN_MS elapses (see isPollyLive). Replaces the legacy
   *  permanent-kill behavior that stranded users on Web Speech for the
   *  rest of the session after one transient failure. */
  private coolDownPolly(reason: string): void {
    this.pollyAvailable = false;
    this.pollyCooldownUntil = Date.now() + POLLY_COOLDOWN_MS;
    if (import.meta.env.DEV) {
      console.warn(
        `[VoiceService] Polly cooling down for ${Math.round(POLLY_COOLDOWN_MS / 1000)}s — ${reason}`,
      );
    }
    // Fire the app auditor so Polly degradation is visible post-launch
    // even without console access. Dynamic import to avoid a circular
    // dependency at module-load time.
    void import('./appAuditor').then(({ logAppAudit }) => {
      void logAppAudit({
        kind: 'polly-fallback',
        category: 'subsystem',
        source: 'voiceService.speakPolly',
        summary: `Polly cooling down for ${Math.round(POLLY_COOLDOWN_MS / 1000)}s`,
        details: reason,
      });
    });
  }

  private async speakPolly(text: string, voice: string): Promise<boolean> {
    try {
      const key = this.pollyKey(text, voice);
      // Use touchAudioCacheEntry so a hit marks the entry as
      // most-recently-used (LRU order). Previously a plain get
      // left the insertion order as-is — common re-speaks stayed
      // near the eviction front even when they were hot.
      let arrayBuffer = this.touchAudioCacheEntry(key);

      if (!arrayBuffer) {
        // Combine caller-abort signal (new speak() supersedes current)
        // with a 10s timeout so slow-network Polly can't hang the
        // voice pipeline indefinitely. Matches the prefetchAudio
        // pattern (5s) but longer because real speech may be a
        // longer sentence than prefetched annotations.
        this.abortController = new AbortController();
        const timeoutSignal = AbortSignal.timeout(10_000);
        // AbortSignal.any is Chrome 116+/Safari 17.4+ — older browsers
        // (and some WKWebView builds) still need the caller-only
        // signal. Types mark `any` as always present; reality differs.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const combinedSignal = AbortSignal.any
          ? AbortSignal.any([this.abortController.signal, timeoutSignal])
          : this.abortController.signal;
        const url = getTtsUrl(text, voice);
        const response = await fetch(url, { signal: combinedSignal });
        if (!response.ok) {
          this.coolDownPolly(`API error ${response.status}`);
          return false;
        }
        arrayBuffer = await response.arrayBuffer();
        this.abortController = null;
        this.setAudioCacheEntry(key, arrayBuffer);
      }

      const played = await this.playAudioBuffer(arrayBuffer.slice(0));
      if (!played) {
        // Audio context was suspended outside a user gesture and
        // couldn't be resumed. Don't cool down Polly — the fetch
        // succeeded. Just signal failure so caller falls through to
        // Web Speech for THIS call; next call may succeed if the user
        // interacts in the meantime.
        return false;
      }
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // A subsequent speak() aborted this one; not a Polly failure.
        return false;
      }
      this.coolDownPolly(error instanceof Error ? error.message : String(error));
      this.playing = false;
      this.currentSource = null;
      return false;
    }
  }

  /** Pre-fetch Polly audio for a list of texts. Call on mount when all
   *  annotations are known so playback is instant later. */
  async prefetchAudio(texts: string[]): Promise<void> {
    const prefs = await this.loadPrefs();
    if (!prefs?.pollyEnabled || !this.isPollyLive() || !prefs.voiceEnabled) return;

    const voice = prefs.pollyVoice;
    const uncached = texts.filter(t => t && !this.audioCache.has(this.pollyKey(t, voice)));
    if (uncached.length === 0) return;

    // Fetch in parallel, 4 at a time to avoid overwhelming the server
    const BATCH = 4;
    for (let i = 0; i < uncached.length; i += BATCH) {
      const batch = uncached.slice(i, i + BATCH);
      await Promise.allSettled(
        batch.map(async (text) => {
          try {
            const url = getTtsUrl(text, voice);
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
              this.setAudioCacheEntry(this.pollyKey(text, voice), await res.arrayBuffer());
            }
          } catch {
            // Prefetch failure is non-fatal
          }
        }),
      );
    }
  }

  private async speakFallback(text: string): Promise<void> {
    await speechService.speak(text, { ...WEB_SPEECH_FALLBACK, rate: this.speed });
  }

  /**
   * Decode and play a Polly audio buffer. Returns true on successful
   * playback, false when the AudioContext couldn't be resumed (iOS
   * gesture restriction) — signals the caller to fall through to a
   * different tier for THIS call without disabling Polly.
   */
  private async playAudioBuffer(buffer: ArrayBuffer): Promise<boolean> {
    const ctx = getSharedAudioContext();

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // iOS suspends the AudioContext when away from a user gesture
        // and resume() rejects outside one. Signal failure so the
        // caller can fall back to Web Speech (which has its own
        // gesture-unlock rules). Don't throw — this isn't a Polly
        // fault, it's a browser restriction.
        return false;
      }
      // Re-read state; resume() may have succeeded silently or left
      // the context still suspended depending on the browser.
      if ((ctx.state as AudioContextState) !== 'running') {
        return false;
      }
    }

    const audioBuffer = await ctx.decodeAudioData(buffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = this.speed;
    source.connect(ctx.destination);

    this.currentSource = source;
    this.playing = true;

    await new Promise<void>((resolve) => {
      source.onended = (): void => {
        this.playing = false;
        this.currentSource = null;
        resolve();
      };
      source.start();
    });
    return true;
  }
}

// Singleton
export const voiceService = new VoiceService();
