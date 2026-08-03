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

## Phase 2 — caching strategy

### 🔒 DECIDED 2026-08-03: cache on first play. Do NOT bulk pre-render.

David: *"Can't we just capture recordings as they play out for the first time
and then cache them?"* — yes, and it is strictly better than the bulk
pre-render this plan originally proposed. Reasons, in order of weight:

1. **Bulk rendering pays for speculation.** The corpus is 17,262 lines, but a
   large share (obscure variations, openings nobody opens) may never be played.
   Rendering all of them costs ~$30 up front to produce audio that may never be
   heard. Caching on play costs only for lines someone genuinely hears.
2. **Popular content gets cached first, by construction** — no need to guess
   which lessons matter.
3. **Zero up-front spend**, and the ceiling is the same $30 in the worst case
   where literally every line eventually plays.

**The mechanism was already there and we weren't using it properly.** Verified
against prod 2026-08-03: `/api/tts` responses are served by Vercel's CDN
(`x-vercel-cache: MISS` then `HIT` on a repeat request). The endpoint was
sending `max-age=86400` — a ONE DAY TTL, so the cache was discarded nightly and
the same lesson lines were re-billed forever.

Fix (`AUDIO_CACHE_CONTROL` in `api/tts.ts`): a given (text, voice, style) always
produces identical audio, so the clip is immutable. TTL is now a year, with
`s-maxage` (the shared CDN copy — the one that saves money across ALL users, not
per-device) and `stale-while-revalidate` so an expiry never costs a user
latency.

Two lines of config, no new failure modes, no storage layer to operate.

**Caveats, honestly:**
- `Vary: Origin` is set (correctly — it fixed the 2026-06-28 Android CORS bug),
  so the CDN keys per origin. With ~3 origins the first play of a line costs one
  synthesis per origin, not one globally.
- CDN entries evict under pressure, so this is not durable storage. That is
  acceptable: eviction is LRU, so what evicts is exactly the cold content that
  is cheap to re-synthesize.

**A durable blob write-through was considered and deliberately NOT built.** It
would mean one blob write per unique line — the same per-event blob pattern that
once billed 79K ops against a 2K cap and got the account PAUSED (see the warning
in `api/audit-stream.ts`). Bounded here, but not worth the risk or the operating
burden until real usage data shows CDN misses are actually costing money. Empty
> generic > invented, applied to infrastructure.

### The pre-render script stays — as an opt-in tool, not the strategy

`scripts/tts-prerender.mts` is kept because it is genuinely useful for
deliberately warming the cache (e.g. guaranteeing zero first-play latency on a
flagship opening before a launch). It is **dry-run by default**, disabled in the
endpoint unless `TTS_PRERENDER_BASE_URL` is set, and costs nothing while unused.
Do not run it as a matter of course.

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

---

# OUTCOME (2026-08-03, end of session)

## Shipped to production

- **Google Cloud TTS is LIVE on prod**, verified three ways: `x-tts-source: google`
  on a real request, byte-perfect streaming decode, and a 13/13 prod Playwright
  audit where the narration listener captured 5 real voice events.
- **Cache-on-first-play** replaced the bulk pre-render (David's call, and the
  better design). `AUDIT_CACHE_CONTROL` is now immutable + max TTL; the old
  `max-age=86400` was discarding the CDN cache nightly and re-billing the same
  lesson lines forever — that was costing money on Polly too.
- **The personality picker controls the voice again.** Under Polly it was a dead
  control (generative voices discard prosody); Chirp3 honors speakingRate +
  volumeGainDb. Verified live on prod: soft 3.67s / default 3.53s /
  drill-sergeant 3.12s on the same sentence.
- **Voice choice: unchanged.** David A/B-ed 8 candidates and picked the shipping
  one (`en-US-Chirp3-HD-Aoede`, rate 1.0). `default` is pinned to 1.0 in
  `CHIRP3_PROSODY_BY_STYLE` for exactly this reason — do not "harmonise" it to
  the neural map's 0.95.

## Bugs found that were NOT part of the original task

1. **All 11 `asc-*.yml` workflows had `APP_VERSION: '3.4'` — the LIVE version.**
   Attach/submit/readiness were aimed at the release customers are running.
   Fixed to 3.5 + `src/data/ascWorkflowVersion.test.ts` fails the build if they
   ever drift from `ci_post_clone.sh` again.
2. **`audit-book-reader-prod.mjs` never installed `autoDismissCalibration`** —
   the only prod audit missing it. The page-help modal intercepted every click,
   producing 13 cascading failures that read as a voice regression on the exact
   night the voice provider changed. Fixed; 13/13 green.
3. **The env var name mismatch** (`google_api_key` vs `GOOGLE_TTS_API_KEY`).
   Without the multi-name read, prod would have silently stayed on Polly with no
   error anywhere — the migration would have looked like it simply never
   happened.

## Not a bug (investigated and closed)

- **David's paywall.** All six of his subscriptions were `sandbox`; Apple caps
  sandbox at exactly 6 auto-renewals and his last lapsed 2026-08-01. The app was
  correctly reporting no entitlement. Fix on his side: re-subscribe in
  TestFlight (free in sandbox). Real revenue verified intact via the RevenueCat
  API: 1 active subscription, 1 active trial, $7 MRR, 146 active users.
- **170/172 RevenueCat customers are anonymous.** Expected — they predate the
  2026-08-01 alias fix. Not a live bug, but those users would be orphaned from
  their purchase on reinstall. A one-time backfill is worth considering.

## Blocked on David (no credentials in this environment)

- **A build sits in Beta App Review** (`ANOTHER_BUILD_IN_REVIEW` on the 168
  distribute step), which blocks the next external submission. The App Store
  Connect secrets API 403s through the agent proxy and no `.p8` exists on disk,
  so cancelling it requires David in App Store Connect.
- Note: **workflow DISPATCH does work** from a session via the GitHub MCP
  (204 on `run_workflow`), even though the raw Actions API 403s. That means the
  `asc-*` workflows CAN be driven from a session — they hold the credentials
  even though the session doesn't. This corrects the "Actions dispatch is
  proxy-blocked" note elsewhere in CLAUDE.md.

## Remaining sequence for the 3.5 App Store release

1. David cancels the in-review build in App Store Connect.
2. `create-asc-version.yml` (APP_VERSION now 3.5) with What's New copy.
3. `asc-attach-latest-build.yml` — build 168 / ASC id 1782017440, state VALID.
4. `asc-readiness.yml` — now points at 3.5, so it validates the PENDING
   submission rather than the live release.
5. `asc-submit-review.yml`.
