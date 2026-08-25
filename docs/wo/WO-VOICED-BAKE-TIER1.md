# WO-VOICED-BAKE-TIER1 — bake the voiced corpus into free play + every Tier-1 spot, finish the tier restructure

**Owner note (David):** this is the integration half. It runs AFTER the
WO-VOICED-AUTHORING shard PRs have merged to main (so the full voiced corpus is
in the tree). One session owns it — do not split it, the file edits overlap.
Session c28ca97f may already have parts of the tier-restructure code done; if so,
rebase on its branch/PR first and finish what's left rather than redoing it.

## The tier model (David 2026-08-24, LOCKED — get the numbers right)

- **Tier 1 = THE CORPUS.** The video-distilled, position-keyed, board-true voiced
  notes. Deterministic, selected BY POSITION only. This is now PRIMARY.
- **Tier 2 = hand-written masterclass** LessonScripts (curated beats).
- **Tier 3 = computed** from the DB + board (G0/G3).
- **DELETED: the old generic offline bake** (`src/data/walkthrough-narrations.json`
  via `bakedNarrationFor`) — "a generic line pinned to a position is a false
  claim, never a real tier." There are no more generic statements that are false.

## Part A — rebuild the derived artifacts from the merged corpus

The voiced files feed three derived artifacts. Rebuild all three ONCE, after the
shards merged:

```bash
# recover the full bank first (all voiced ids), so the builders can read fens:
node -e "const fs=require('fs');fs.writeFileSync('/tmp/allids.txt',fs.readdirSync('data/video-narration-voiced').filter(f=>f.endsWith('.json')).map(f=>f.replace('.json','')).join('\n'))"
node scripts/voiced-authoring/recover-bank.mjs /tmp/allids.txt

node scripts/build-voiced-walkthroughs.mjs   # -> src/data/voiced-walkthroughs.json   (teach-me-X trees)
node scripts/build-voiced-matchups.mjs       # -> src/data/voiced-matchups.json        (KIA vs French etc.)
node scripts/build-voiced-teachings.mjs      # -> public/data/voiced-teachings.json     (POSITION-KEYED CORPUS = Tier 1)
```

`voiced-teachings.json` is the Tier-1 corpus: each note is `{id:"vc-<id>-<ply>",
lineSan, opening:null, phase, explains, teaches, plans, sources:["yt:<id>"]}`.
`opening:null` = pure position selection (surfaces only on an exact-position /
transposition match; never competes in the opening-family tier). See
`build-voiced-teachings.mjs` header.

Note the PWA precache cap: big `src/data/*.json` need a `vite.config.ts`
`manualChunks` rule (`appdata-voiced` already exists for
voiced-walkthroughs/matchups) — confirm the build doesn't blow the 8 MiB Workbox
cap. `voiced-teachings.json` lives in `public/data/` (FETCHED, not bundled) so it
doesn't count.

## Part B — bake into free play + every Tier-1 narration spot

"90% of what needs to be said lives within these notes" (CLAUDE.md). The corpus
must LEAD on every coaching surface, delivered by the existing position retrieval
(`teachingNoteForBoard` / `noteAtPosition` in `danyaTeachingService.ts` →
`secondaryCorpora` / `farmedCorpusData`). Do NOT invent a new retrieval — reuse
the board-gated one (corpus doctrine: "a note is selected BY POSITION, never by
name").

Surfaces that must deliver the corpus (per CLAUDE.md "EVERY COACHING SURFACE GETS
THE CORPUS"):
- **Free play / Learn** (`/coach/teach`, `CoachTeachPage.tsx`) — the note LEADS
  the beat, ranked ABOVE the masterclass beat (Tier 1 > Tier 2). This is the
  "preexisting issue preventing tier 1 in free play" David flagged: the corpus
  note (`noteArrowSourceAt` / `noteLine`) must not be suppressed by the (now
  deleted) bake, and must outrank `curatedLine` in `buildVoicePackage`.
- **Post-game review** (`/coach/review`) — facet computers reach the note that
  teaches the moment.
- **Tactics** (`/tactics/*`) — 17,972 tactic-tagged notes; a drill is where that
  teaching belongs.
- **Read this position** (`usePositionNarration`).
- **Endgame page** (concept/structure tiers).
- **Play** (`/coach/play`) — access wired but SILENT until the student asks
  (locked). Do not make it volunteer notes.
- **Kid surfaces** — EXCLUDED by contract. Do not wire.

**A wire that does not fire is not a wire (David 2026-08-07).** For each surface
you touch, ship/extend a test proving a REAL note comes OUT for a real position
(see `src/services/voicedCorpus.integration.test.ts` as the reference — it warms
the corpus and asserts `secondaryNotesForFen(fen)` returns a `vc-` note). Not
"the function was called" — the note in the output.

## Part C — finish deleting the generic bake

Remove every reference so Tier 1 is unambiguously the corpus:
- `src/services/bakedWalkthroughNarration.ts` — DELETE.
- `src/data/walkthrough-narrations.json` — DELETE (23 openings; 15 already have
  voiced walkthroughs, the rest fall to LLM+corpus-splice which is correct).
- `src/services/openingGenerator.ts` — remove the `bakedNarrationFor` import +
  the `baked`/`bakedRaw` overlay branch (falls through to LLM narration with the
  corpus note spliced/leading per PASS 1). [c28ca97f may have done this.]
- `src/components/Coach/CoachTeachPage.tsx` — remove `bakedTeachingForPly` /
  `bakedSpineNextMove` import + all `bakedLine`/`bakedPly`/`bakedPlySeenRef` refs;
  reorder `buildVoicePackage` so `noteLine` (corpus) ranks ABOVE `curatedLine`
  (masterclass). [c28ca97f may have done this.]
- `src/hooks/useTeachWalkthrough.ts` — remove the `bakedNarrationFor` import +
  the `bakedBridge` lookup at the fork (computed bridge fallback remains).
- Delete the dead tests: `walkthroughNarrations.test.ts`,
  `bakedPlyTeaching.test.ts`, `bakedWalkthroughNarration.test.ts`; fix
  `computedVoiceAudit.report.test.ts` (imports `bakedTeachingForPly`).
- Retire the generic-bake scripts: `scripts/danya-corpus/narrate-from-video.mjs`
  (wrote walkthrough-narrations.json), `batch-bake.mjs`, `coverage-report.mjs`.

Grep to confirm nothing references the deleted module:
`grep -rn "bakedNarrationFor\|bakedWalkthroughNarration\|walkthrough-narrations" src/`

## Part D — docs

- **CLAUDE.md** "THE THREE NARRATION TIERS" — rewrite to the new definitions
  above (Tier 1 = corpus, Tier 2 = masterclass, Tier 3 = computed; generic bake
  deleted).
- **docs/voiced-narration-pipeline.md** — update the tier section AND the
  authoring section to the move-by-move standard (the `author-video.mjs` /
  `author-all.mjs` per-move pass replaced the old 3-6-beat `lib.build` hand map).
- Add: "future video-narration work feeds Tier 1" — new voiced files go in
  `data/video-narration-voiced/`, authored move-by-move via `author-video.mjs`,
  rebuilt into `voiced-teachings.json`, which is the Tier-1 corpus.

## Part E — gates + ship

```bash
npx vitest run \
  src/data/secondaryTeachings.test.ts \
  src/services/voicedCorpus.integration.test.ts \
  src/services/farmedCorpusData.test.ts \
  src/data/noteSelectionDeterminism.test.ts \
  src/data/noteAnchorIntegrity.test.ts
npm run typecheck && npm run lint
npm run ship-check          # must print READY TO PUSH
```

Then merge to main via PR (direct push is classifier-blocked). After it lands,
run the post-deploy 3-instrument audit for the coach surfaces (G1): Playwright +
audit-stream + narration listener against prod, confirming the corpus note fires
on free play. Reference: `scripts/audit-teach-on-topic-prod.mjs` /
`scripts/audit-coach-player-games.mjs` / `audit-farmed-corpus-prod.mjs` (a farmed
corpus is FETCHED — a green build proves nothing about whether the running app
reaches it).

## Definition of done

Corpus rebuilt from the full merged voiced set → leads Tier 1 on free play +
review + tactics + read-position (each with a wire-fires test) → generic bake
fully deleted → docs updated → all gates + ship-check green → merged to main →
post-deploy audit confirms a `vc-` note speaking on free play.
