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

**Measured volume.** The static narration the app can actually speak —
registered lesson beats + cues, baked walkthrough narration, plan lines and
pitfalls — is **17,262 distinct lines / 2.0M characters** (counted by
`npm run tts:prerender`, which is the authoritative number since it applies the
same `sanitizeForTTS` the client does and dedupes). A real session ≈ 10k chars
⇒ ~100 sessions/month inside the free tier. Fine for beta, not for the store —
which is what job 2 fixes.

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
  body through a streaming reader that incrementally strips the JSON wrapper
  and base64-decodes as bytes arrive — we never buffer the clip ourselves.
- `api/_lib/tts/ssml.ts` — SSML construction, moved out of the endpoint. Whether
  a voice accepts SSML is a VENDOR fact, so the provider builds the document;
  handing a plain-text-only Chirp3 voice a `<speak>` document would have it read
  the markup aloud.
- `api/_lib/tts/polly.ts` — today's Polly code extracted verbatim, unchanged.
- `api/tts.ts` — thin handler. Gates (origin / rate-limit / usage-guard)
  unchanged; picks the provider; `buildSsmlForEngine` stays exported (imported
  by `src/services/ttsProsody.test.ts`).

### Provider selection (the "don't break it" call)

`GOOGLE_TTS_API_KEY` set → **Google**. Absent, or Google fails → **Polly**.

David asked to remove Polly. It stays as a fallback leg for exactly one reason:
**no Google key exists yet, so the Google path cannot be exercised against the
real API from here.** Shipping a branch whose only provider is untested is the
failure mode he warned about. Once the key is provisioned and the Google leg is
audited green (see Phase 3 — localhost first, this project has no branch
preview), deleting the Polly leg is one file + one env var. Flagged to David,
not silently deferred.

`selectProviders()` is pinned by `api/_lib/tts/providerChain.test.ts` across all
four credential states, so the "no Google key ⇒ identical to today" property
can't regress silently.

## Phase 2 — pre-rendered narration

The Watch/Learn corpus is identical for every user, so it should be synthesized
once, not per user per playback.

- `scripts/tts-prerender.mts` (`npm run tts:prerender`) — walks the corpora,
  dedupes by `sha256(text|voice|style|prosody|ssml)`, synthesizes via Google,
  uploads to Vercel Blob at `tts/v1/<hash>.mp3`, writes `tts/v1/manifest.json`.
  Resumable, and **dry-run by default** — `--commit` is required to spend money
  or mutate the blob store.
- `api/_lib/tts/prerendered.ts` — the handler checks the manifest (fetched once
  per isolate, cached in memory, **fails open** on any error) and pipes the blob
  bytes through with the identical headers. Miss ⇒ normal synthesis.

The hash function is imported from the SAME module the endpoint uses rather than
reimplemented in the script: a drifted hash would silently mean "always a miss",
and we'd pay to re-render clips we already had.

Fail-open everywhere: a bad / missing / stale manifest degrades to exactly
today's behavior, never to silence. Disabled entirely until
`TTS_PRERENDER_BASE_URL` is set.

## Phase 3 — verify

- Unit tests for the voice map, the base64 stream transform, the manifest
  lookup, the provider chain, and the preserved error contract. ✅ 43 tests.
- `npm run ship-check`. ✅ READY TO PUSH (typecheck / prod build / lint 0
  errors / content gates).
- 3-instrument audit (G1) once the Google key exists — see the caveat below.

### 🚨 There is NO branch preview to audit — this project builds `main` only

The Vercel project's **Ignored Build Step** is deliberately set to build only
`main` (Deployment Policy: previews burn the 100-builds/day cap and David can't
see them on the real app). PR #862's deployment shows as **Ignored**, which is
correct behavior, not a failure.

So the G1 3-instrument audit for this work CANNOT run against a branch preview.
The options, in order of preference:

1. **Audit against `localhost:5173`** with `GOOGLE_TTS_API_KEY` exported in the
   dev shell. This genuinely exercises the Google leg (the endpoint calls the
   real API), and it is the ONLY way to hear the new voices before merging.
   It does not verify the deploy pipeline — say so explicitly when reporting.
2. **Merge to `main`, then audit prod immediately** per G1. This is the
   deploy-pipeline-verifying audit, but it puts the migration in front of beta
   testers before anyone has heard it.

Given the voice is the thing most likely to be wrong in a subjective way, do
(1) first — David listens to the new voices on localhost — and only then merge
and run (2). Do NOT claim the surface shipped on localhost evidence alone.

---

## Decisions log

- **2026-08-03** — Google over Azure. Azure F0's 20-req/60s cap is
  disqualifying for per-sentence narration.
- **2026-08-03** — Chirp3-HD for generative-equivalent voices, Neural2 for
  neural-equivalent. Mirrors today's prosody behavior exactly instead of
  changing how the coach sounds mid-migration.
- **2026-08-03** — Polly kept as a fallback leg until the Google key is live.
  One-file deletion after the Google leg is audited.
- **2026-08-03** — Pre-render uses the best voice tier: it is a one-time cost,
  so quality there is effectively free.
- **2026-08-03** — Pre-render covers the DEFAULT voice + style only (ruth, no
  style param — voiceService normalises the default personality to no `style`).
  A non-default personality simply misses the manifest and synthesizes live,
  exactly as today. Extend with `--voice` when a second voice earns it.

## Known gaps (not fixed here, deliberately)

- `/api/tts` sets no `Access-Control-Expose-Headers`, so cross-origin callers
  (the Capacitor native app) can't read `X-TTS-Error-Name` / the new
  `X-TTS-Source`. Pre-existing, unrelated to this migration, left alone to keep
  the diff tight. Worth a one-line fix in a separate change.
- Provider fallover only covers failures raised BEFORE the first byte. Once the
  Response is returned the stream is committed, so a mid-stream fault surfaces
  as a truncated clip (which voiceService already detects and retries). Falling
  over mid-stream would require buffering, and G4 forbids that.

## Next-session pickup

Needs from David: `GOOGLE_TTS_API_KEY` in the Vercel project env (with Cloud
Text-to-Speech enabled on the GCP project). Then:

1. `npm run tts:prerender` (dry run) to confirm the corpus count, then
   `npm run tts:prerender -- --commit` with `BLOB_READ_WRITE_TOKEN` set.
2. Set `TTS_PRERENDER_BASE_URL` to the blob base so the endpoint starts serving
   the rendered clips.
3. Audit per Phase 3 — localhost with the key first (David listens to the
   voices), then prod after merge.
4. Delete `api/_lib/tts/polly.ts` and drop `pollyProvider` from
   `selectProviders()` in `api/tts.ts`.
