# PLAN — Polly → Google Cloud TTS + pre-rendered narration

**Branch:** `claude/polly-replacement-voice-service-8ez30z` (NOT main — David 2026-08-03)
**Status:** in progress
**Directive (David 2026-08-03):** "Do both. DONT BRAKE MY APP IN THE PROCESS!"

Two jobs:

1. **Replace AWS Polly with Google Cloud TTS** behind a provider seam (the G4
   planned migration, now executed).
2. **Pre-render the repeated narration** so the same-for-every-user lessons are
   synthesized ONCE and served as static audio, off the metered path.

---

## Why Google (decided 2026-08-03, measured)

| | free allowance | rate cap | overage |
|---|---|---|---|
| **Google** | **1M chars/mo (Chirp3-HD/Neural2) + 4M (WaveNet/Standard), perpetual monthly** | 200–1000 req/min | $16/1M Neural2, $30/1M Chirp3-HD |
| Azure F0 | 0.5M chars/mo | **20 requests / 60 SECONDS, not adjustable** | n/a on F0 |
| Polly (today) | 1M/mo **for 12 months only** | — | ~$16/1M |

Azure F0 is disqualified on the rate cap alone — we speak per sentence, so a
single lesson exceeds 20 requests/minute.

**Measured volume** (`src/data/lessons/**`): 19,259 Watch beats @ 150 chars avg
(2.9M chars of corpus) + 18,812 Learn cues @ 25 chars. A real session ≈ 10k
chars ⇒ ~100 sessions/month inside the free tier. Fine for beta, not for the
store — which is what job 2 fixes.

---

## The safety property (this is the whole design)

The client funnels EVERY narration through one URL builder,
`getTtsUrl()` → `/api/tts?text=…&voice=…&ssml=1&style=…&prosody=…`
(`src/services/voiceService.ts:181`). So the entire migration happens
**server-side, behind an unchanged HTTP contract**:

- same query params, same `audio/mpeg` chunked body (G4 — no buffering),
- same `Cache-Control: public, max-age=86400`,
- same error contract: `X-TTS-Error-Name` + `Retry-After` (voiceService reads
  both around `:2183`–`:2190` to tune its cooldown),
- same status mapping (throttle→429, service→503, auth→503/60s).

**Zero changes to `voiceService.ts`.** Its 2,466 lines of iOS / MediaSource /
ManagedMediaSource / cooldown logic are the highest-risk code in the app and
this work does not touch them. That is how "don't break my app" is honored.

---

## Phase 1 — provider seam + Google leg

- `api/_lib/tts/types.ts` — `TtsProvider` interface + `SynthesisRequest`,
  `TtsProviderError` (carries the `errorName` / status the client contract needs).
- `api/_lib/tts/googleVoices.ts` — voice map. **Behavioral mirror of today:**
  - Polly *generative* keys (ruth, matthew, danielle, gregory) → **Chirp3-HD**,
    plain text, no prosody — exactly today's generative behavior (generative
    Polly already ignores prosody, so nothing is lost).
  - Polly *neural* keys (joanna, stephen, ivy, …) → **Neural2**, full SSML with
    the existing `NEURAL_PROSODY_BY_STYLE` rate/pitch/volume — preserved.
  - The 11 language voices (`ttsLang.ts`) get Chirp3-HD equivalents per locale.
- `api/_lib/tts/google.ts` — `POST texttospeech.googleapis.com/v1/text:synthesize`
  with the `X-Goog-Api-Key` header, `MP3` encoding.
  **G4:** Google's REST returns base64 JSON, so the provider pipes the response
  body through a `TransformStream` that incrementally strips the JSON wrapper
  and base64-decodes as bytes arrive — we never buffer the clip ourselves.
- `api/_lib/tts/polly.ts` — today's Polly code extracted verbatim, unchanged.
- `api/tts.ts` — thin handler. Gates (origin / rate-limit / usage-guard)
  unchanged; picks the provider; `buildSsmlForEngine` stays exported (imported
  by `src/services/ttsProsody.test.ts`).

### Provider selection (the "don't break it" call)

`GOOGLE_TTS_API_KEY` set → **Google**. Absent, or Google fails → **Polly**.

David asked to remove Polly. It stays as a fallback leg for exactly one reason:
**no Google key exists yet, so the Google path cannot be exercised against the
real API from here.** Shipping a branch whose only provider is untested is the
failure mode he warned about. Once the key is provisioned and the branch
preview is audited green, deleting the Polly leg is one file + one env var.
Flagged to David, not silently deferred.

## Phase 2 — pre-rendered narration

The Watch/Learn corpus is identical for every user, so it should be synthesized
once, not per user per playback.

- `scripts/tts-prerender.mjs` — walks the narration corpora, dedupes by
  `sha256(text|voice|style|prosody|ssml)`, synthesizes via Google, uploads to
  Vercel Blob at `tts/v1/<hash>.mp3`, writes `tts/v1/manifest.json`. Resumable.
- `api/_lib/tts/prerendered.ts` — the handler checks the manifest (fetched once
  per isolate, cached in memory, **fails open** on any error) and pipes the blob
  bytes through with the identical headers. Miss ⇒ normal synthesis.

Fail-open everywhere: a bad / missing / stale manifest degrades to exactly
today's behavior, never to silence.

## Phase 3 — verify

- Unit tests for the voice map, the base64 stream transform, the manifest
  lookup, and the preserved error contract.
- `npm run ship-check`.
- Branch preview + 3-instrument audit (G1) once the Google key exists.

---

## Decisions log

- **2026-08-03** — Google over Azure. Azure F0's 20-req/60s cap is
  disqualifying for per-sentence narration.
- **2026-08-03** — Chirp3-HD for generative-equivalent voices, Neural2 for
  neural-equivalent. Mirrors today's prosody behavior exactly instead of
  changing how the coach sounds mid-migration.
- **2026-08-03** — Polly kept as a fallback leg until the Google key is live.
  One-file deletion after the branch audit.
- **2026-08-03** — Pre-render uses the best voice tier: it is a one-time cost,
  so quality there is effectively free.

## Next-session pickup

Needs from David: `GOOGLE_TTS_API_KEY` in the Vercel project env (with Cloud
Text-to-Speech enabled on the GCP project). Then run
`node scripts/tts-prerender.mjs`, audit the branch preview, delete
`api/_lib/tts/polly.ts`.
