# Coach /coach/teach — "no middlegame" + "trap line won't start" fixes

**David 2026-07-15.** Two bugs on Learn-with-Coach, both **silent** (no
exception, no telemetry event — confirmed via PostHog: `$exception` stream
is all Stockfish-worker/narration noise, and `/coach/teach` is actively used
from the iPhone app). PostHog can't see them because neither path emits a
"trap started" / "reached middlegame" event and neither throws to Sentry.

## Bug 1 — walkthrough doesn't reach the middlegame

**Root cause** (`openingGenerator.ts` → `openingDetectionService.ts`): the
walkthrough spine is `findShortestCanonicalPgn()` — deliberately the SHORTEST
canonical PGN so the fork picker can surface named sub-variations, on the
assumption the walkthrough auto-advances the most-popular branch into the
middlegame. When the terminal-short filter (`isTeachableEntry`) strips every
fork candidate, OR the bare canonical entry is itself a short sideline
(Scandinavian = `e4 d5 b3`, Philidor's bare entry is a 7-ply Bc4 line), the
main line leafs in the opening — no middlegame.

**Fix:** new `resolveTeachSpine(canonicalName, fallbackMoves, {extendToMiddlegame})`
in `openingDetectionService.ts`. In full pace, if the main line (spine + top
branch) doesn't `reachesMiddlegame` (the shared pro-rep depth metric):
1. **Tier 1 — same-prefix extension** (`findLongestPgnExtending`): the DB
   often carries the same line deeper under a more-specific name (fixes
   Benoni 12→20 plies).
2. **Tier 2 — family trunk** (`pickFamilyMiddlegameSpine`): pick the shortest
   middlegame-reaching line on the family's most-popular trunk continuation
   (fixes Scandinavian→Classical, Slav→Schallopp, Philidor→Lion).
Every move stays a real DB line (G3 — never invented). Tour pace opts out.
The extended plies are narrated by the same single Danya-voiced,
teaching-grounded LLM call, so the deeper line still teaches like his video.

Probe result across 24 common openings: **0 still broken** (was 4).

## Bug 2 — "keep learning" → "trap line" fails to start

**Root cause** (`useTeachWalkthrough.ts`): `buildPunishWalkthroughTree` did
unguarded `lesson.distractors.map(...)` / `lesson.setupMoves.length`. A punish
lesson that entered `tree.punish` via a **legacy Dexie tree or the shared
Supabase cache** never re-runs `repairPunishStage` (`getCachedOpening` only
re-checks the tree's move legality, not punish-stage field shape), so a
missing `distractors`/`setupMoves` **threw synchronously in the picker's
onClick** — the lesson silently never started. Confirmed empirically with a
unit test (TypeError on the malformed lesson).

**Fix:**
- `isStartablePunishLesson(lesson)` — validates shape + legality (≥1
  distractor, legal inaccuracy→punishment). Exported.
- `buildPunishWalkthroughTree` defends `distractors`/`setupMoves` (never
  throws even if one slips through).
- `startPunishLesson` no-ops + audits on an unstartable lesson.
- `stageHasEntries('punish')` + the stage-menu `punishCount` + `hasStages` +
  the QuizPanel gate + `PunishLessonPicker` all filter to STARTABLE lessons
  (preserving original indices) — a broken lesson never shows a dead tile.

## The Danya → DB → Stockfish grounding chain (David's follow-ups)

- **Voice/teaching = Naroditsky.** Narration prompt already carries the house
  voice + `buildDanyaTeachingBlock` (corpus: 4529 notes / 446 videos / 290
  opening tags). 23/24 common openings have direct Danya opening notes; the
  rest fall back to DB-grounded narration in his voice (empty block → teach
  from DB moves, gated by `narrationAccuracy` — never invented).
- **Moves = Lichess DB** (G3), for the whole opening line.
- **Stockfish = the middlegame**, via the play-out handoff (David chose
  "play-out handoff only", no gen-time engine extension). Fixed the leaf
  "Play this line out yourself" button: it used to `navigate('/coach/play?
  opening=…')` — leaving the page AND starting the generic room from scratch
  (lost the taught line + middlegame position; violated the WLPP Play-lock).
  Now it mounts `OpeningPlayMode` IN-PAGE, LOCKED to the taught line via
  `customLine` → plays the watched moves move-for-move, then adaptive
  Stockfish in the middlegame.

## Tests

- `useTeachWalkthrough.punishGuards.test.ts` — builder guards +
  `isStartablePunishLesson` (8 tests).
- `openingDetectionService.teachSpine.test.ts` — main line reaches the
  middlegame across 15 openings; the 4 repaired ones invoke the extension;
  tour doesn't extend; legality (18 tests).

## Not verifiable in this sandbox

The live 3-instrument Playwright audit against prod could NOT run here —
this container's egress **resets Chromium→prod TLS connections**
(`ERR_CONNECTION_RESET`; curl succeeds, Chromium doesn't, with or without
the agent proxy). Unit + typecheck + lint + content gates are green. The
prod full-play audit (leaf→play-out Stockfish handoff, cold-cache trap
start) must run from CI / a device.
