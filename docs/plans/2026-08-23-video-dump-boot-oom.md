# 2026-08-23 — App crash: eager "video dump" corpus loads OOM the boot

**Status: fix landed on branch `claude/app-crash-video-dumps-uybsis` (urgent — web + native).**

## Symptom
David: "my app is crashing my computer. I think its the video dumps pulling over
too much data." Later: urgent — must reach the native App Store; confirm native
has the same bug.

## Root cause (confirmed)
The FARMED teaching corpora (notes distilled from creators' YouTube
back-catalogues — the "video dumps") + the spoken bake were **fetched and parsed
eagerly on every boot**, on the critical path:

- `App.tsx` boot → `seedDatabase()` (`dataLoader.ts`) fired
  `loadFarmedCorpora()` (a single `Promise.all` over all 6 corpora) +
  `loadSpokenBake()`.
- **53 MB fetched at once**: `saintlouis` 28 MB, `corpus-spoken` 13 MB,
  `hangingpawns` 9 MB, + 3 small ones. Six back-to-back multi-MB `JSON.parse`
  calls on the main thread, then chess.js transposition-index replay.
- Everything held in a module cache **forever**. Warm total across all
  video-derived corpora ≈ **109 MB raw JSON** (add on-demand
  `openings-masters-db` 37 MB + `danya-play-db` 6.5 MB + bundled `danya` 9 MB +
  `chessbrah` 2.5 MB). Parsed JS objects run several× raw → hundreds of MB of
  live heap.

Result: boot allocation spike + retained heap → tab OOM on desktop; on iOS
WKWebView the per-process memory ceiling makes Jetsam kill the app (harder
crash). **Native is the same build (`capacitor.config.ts` `webDir: 'dist'`), so
it has the identical bug — and is more crash-prone.**

## Fix
Make the whole teaching-corpus tier **lazy, per-corpus, and off the boot
critical path**:

- `farmedCorpusData.ts`: per-corpus cache (was all-or-nothing). New
  `primeFarmedCorporaLazily()` loads each corpus **sequentially, smallest first,
  Saint Louis (28 MB) LAST** — no simultaneous fetch, no back-to-back parse
  burst. `getFarmedCorporaSync()` is now a **pure** read (triggers nothing). A
  `generation` token + identity guard make the reset seam authoritative.
  `onFarmedCorpusLoaded` lets the index warm per-corpus as each lands.
- `secondaryCorpora.ts`: the four teaching-lookup entry points call
  `primeFarmedCorporaLazily()` — so the tier loads **only when a coach/teaching
  surface actually consults it**, never on boot. Index warms via the
  `onFarmedCorpusLoaded` listener.
- `danyaTeachingService.spokenBeatText`: calls `loadSpokenBake()` lazily on
  first coach speech (self-heals to original prose until it lands).
- `dataLoader.ts` `seedDatabase()`: **removed** the eager `loadFarmedCorpora()`
  + `loadSpokenBake()` + boot index-warm block. Curated masterclass beat index
  (primary, bundled — no fetch, pure CPU) now warms on **idle**
  (`requestIdleCallback`, `setTimeout` fallback), off the critical path.

### Effect
- Boot goes from **53 MB fetch+parse spike → ~0** for the corpus tier.
- Sessions that never open the coach (dashboard, kids, tactics, openings browse)
  pay **nothing** for the video corpora.
- Coach sessions load lazily + sequentially; the position tier self-heals within
  a second or two. Contract "empty > invented" preserved throughout.

## Not addressed (follow-ups, flagged)
- `danya-teachings.json` (9 MB) + `chessbrah` (2.5 MB) are **static imports** —
  parsed at module load regardless. Converting to fetched `public/` assets would
  shave ~11 MB more but is a larger change.
- `openings-masters-db.json` (37 MB) loads on first master lookup and is held —
  still the single biggest on-demand payload; candidate for a bounded/streamed
  or per-opening-sharded load.
- Heavy coach users still eventually warm most corpora. True per-opening gating
  of Saint Louis (load only when its opening comes up) needs a small
  per-corpus opening/prefix manifest — deferred unless memory is still tight.

## Tests
`farmedCorpusData.test.ts` updated to the lazy contract (pure sync read; prime
loads all; a lookup primes the tier; idempotent). Boot + consumer suites green
(`dataLoader`, `secondarySupport`, `danyaTeachingService.spokenBeat`,
`handwrittenSpoken`, `curatedBeatSource`). typecheck + lint (0 errors).
