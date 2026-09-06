# APP_MAP — Chess Academy Pro, end to end

A navigable architectural map of the whole app, built to answer "how does X
work / where do I touch to change Y" without re-reading. File:line anchors are
approximate (they drift as code moves) — treat them as "start reading here."

**Governing doctrine (the "G" laws, from CLAUDE.md):**
- **G0** — the LLM decides NOTHING. Code computes every chess fact; the model only
  *phrases* it, through the one chokepoint `voiceFacts` (`coachApi.ts`).
- **G3** — moves/FENs/lines come from the DB (`openings-lichess.json`) or chess.js,
  never model recall.
- **G5** — voice honors the verbosity setting (silent / brief / full), gated in
  `voiceService.speakInternal`; read-aloud buttons are the sanctioned bypass.
- **G6** — every narrated move gets a board-verified lead-the-eye arrow.
- **G8** — every JSON→Dexie reconciler deletes orphans, not just add/update.

Stack: React 19 + TS strict + Vite, Dexie (IndexedDB), Zustand, chess.js,
react-chessboard 5, Stockfish WASM/asm.js, Capacitor (iOS), DeepSeek LLM (server
proxy), Google Cloud TTS. `main` = the free web app (chess-academy-pro.vercel.app);
paying users are on the App Store iOS build (a separate, deliberate release).

---

## 1. Shell, routing, boot

- **Routes:** `src/App.tsx:489-671` (`<Route>` table). Top-level tabs in
  `src/components/ui/AppLayout.tsx:48-58` (`NAV_ITEMS`; `MOBILE_NAV_ITEMS =
  slice(0,5)` → phone bottom-nav = Home/Openings/Coach/Weaknesses/Tactics; Kids +
  Settings are desktop-sidebar only). `KidLayout` is a sibling outlet.
- **Tabs → components:** Home `/` `DashboardPage`; Openings `/openings`
  `OpeningExplorerPage`; Coach `/coach/home` `CoachHomePage`; Weaknesses
  `/weaknesses` `GameInsightsPage`; Tactics `/tactics` `TacticsPage`; Kids `/kid`
  `KidModePage`; Settings `/settings`.
- **Coach sub-hub tiles** (`CoachHomePage.tsx:131-285`): Learn `/coach/teach`,
  Play `/coach/play`, Review `/coach/review`, Library `/coach/library`, **Fundamentals
  `/coach/fundamentals`** (only nav entry into it), Endgame `/coach/endgame`,
  Training Plan `/coach/plan`, Pro Games `/coach/pro-games`, Analyse `/coach/analyse`.
- **Boot/seed:** `dataLoader.seedDatabase()` → `runSeedOnce()` loads 40 repertoire
  openings first, then detaches `startDeferredSeed()` (ECO 3,300+ → pro → gambit →
  model games → pro-game-refs → plans → flashcards → narrations). `whenFullySeeded()`
  awaits the backfill. `SEED_KEY='db_seeded_v12'`. Storage persistence
  (`storageQuota.requestPersistentStorage()`) + device id (`deviceIdentity.getDeviceId()`)
  run at boot.

## 2. Data layer

### Dexie — `src/services/db/schema.ts` (`class ChessAcademyDB`, versions 1→35)
Stores (key · record type): `puzzles`·PuzzleRecord · `openings`·OpeningRecord (~3,400)
· `games`·GameRecord (source='coach'/import) · `flashcards` · `profiles`·UserProfile
· `sessions` · `meta`·key/value (audit log, revisions, device id, coach memory) ·
`mistakePuzzles`·MistakePuzzle (v8) · `modelGames` · `middlegamePlans` ·
`generatedContent` · `openingWeakSpots` · `classifiedTactics` · `setupPuzzles` ·
`openingNarrations` · `cachedOpenings`·CachedOpening (LLM walkthrough-tree cache,
`genRev` gate) · `endgameProgress` · `srsOpeningCards` (SM-2) · **`misconceptionTags`·
MisconceptionTagRecord (v28 — the weakness store)** · `proGameReferences` ·
`masterPlayCache` · `freeTier` (soft-paywall ledger, `coachSpendUsd`) ·
`coachCurriculum` · `positionEvals` (v35, per-FEN eval cache). Rule: never edit a
shipped `version(n).stores()`; append a new one.

### Static data — `src/data/*.json` (bundled) + `public/data/*.json` (fetched lazily)
- Openings: `openings-lichess.json` (ECO 3,300+, THE canonical move source),
  `repertoire.json` (40 curated masterclasses), `pro-repertoires.json`,
  `gambits.json`, `anti-openings.json`, `counter-repertoire.json`.
- Lessons/plans: `middlegame-plans.json` (~240), `model-games.json` (wins-only),
  `common-mistakes.json`, `checkpoint-quizzes.json`, `drawn-patterns.json`,
  `endgame-principles.json`/`pawn-endings.json`/`rook-endings.json`,
  `mating-patterns.json`.
- Grounding/corpus: `chess-concepts.json` (664 classical passages),
  `opening-book-pages.json`, `danya-teachings.json`+`chessbrah-teachings.json`
  (bundled), `public/data/*-teachings.json` (gothamchess/hangingpawns/hikaru/
  imrosen/magnuscarlsen/saintlouis — farmed, lazy), `voiced-*.json`.
- Puzzles: `puzzles.json` (~15k Lichess CC0, camelCase `themes`), `training-puzzles.json`.
- Weakness taxonomy: `misconceptionTags.ts` (TS closed set — see §5).
- `public/data/openings-masters-db.json` (master-play stats), `pro-game-references.json`.
- Reconcilers + revisions in `dataLoader.ts` (`reconcileProRepertoires`,
  `reconcileBaseRepertoire`, G8 orphan-delete, `*_REVISION` keys).

## 3. Coach brain (`src/services/coachService.ts` + `coachApi.ts`)

- **Turn spine:** `coachService.askImpl` (`coachService.ts:501`) → `getCoachChatResponse`
  (`coachApi.ts:3130`). Language detected deterministically; grounding pre-loads into
  liveState; `assembleEnvelope` (`envelope.ts:462`, 6 parts: Identity/Memory/App-map/
  Live-state/Toolbelt/Ask); provider loop parses `[[ACTION:…]]` tool tags.
- **G0 chokepoint:** `voiceFacts(facts, opts)` (`coachApi.ts:2472`) — phrases a
  code-computed `facts` string. Registers: plain / warm (live) / review / kid-safe.
  `preferRaw` bypasses the LLM and speaks facts verbatim (purest G0). A number-fidelity
  net strips any output number not present in `facts`.
- **Provider:** DeepSeek only (Anthropic removed 2026-07-31), via server proxy
  `api/llm-proxy.ts`; client holds a sentinel key, real key server-side.
- **Grounding leaves:** `groundedAnswer.ts` — ~90 `assemble*` computers; each returns
  `GroundedAnswer|null` whose `.facts` feeds `voiceFacts`. Key ones: `explainBestMoveGrounded`
  (1317), `assemblePlanAnswer`, `assembleTacticsAnswer`, `assembleMasterPlayAnswer`,
  **`assembleFundamentalsAnswer` (2515)**, board-fact assemblers (material/hanging/
  threat/king-safety/square-control).
- **Master-play grounding (4 layers A-D):** prefetch (`masterPlayWatcher`, NEVER on
  `/kid/*`) → pre-injection (`masterPlayLookup`) → optional tool → claim validation
  (`claimValidator`, retry ≤2 → stock fallback). Resolution: cache → local masters DB →
  live Lichess → `{source:'none'}` (never invents).
- **Intents:** `src/coach/questionIntents.ts` (~75 regex classifiers) matched in
  `coachService.ts:1151-1327`; deterministic board verdicts (whose-turn/mate/draw/color)
  answered BEFORE the LLM. Each fired intent sets an `autoGrounding` flag → dispatches the
  matching assembler.

## 4. Voice / TTS (`src/services/voiceService.ts`)

- Speak methods → all funnel `speakInternal` (`:1230`): `speak` (brief-capped),
  `speakForced` (bypass voiceEnabled, honor silent), `speakLecture` (bypass brief cap),
  `speakReadAloud` (bypass verbosity entirely — the G5 read-aloud exemption),
  `speakGrounded` (strips disproven sentences vs live FEN), `speakPackage`.
- **Verbosity gate:** `resolveCoachNarration` (silent/brief/full) + `applyBriefVoiceCap`.
- **TTS:** streamed `/api/tts` served by Google Cloud TTS behind a provider seam
  (`api/_lib/tts/*`, `providerChain`), Web Speech API as the always-free floor.
  `sanitizeForTTS` strips `[BOARD:]`/markdown/FEN before synthesis.
- **Narration hooks:** `useStrictNarration` (lesson walkthroughs, voice-promise-gated
  advance, no racing timers), `useNarration` (endgame surfaces), `useProseReader`
  (prose/audiobook pages incl. Fundamentals tab), `useWalkthroughRunner` (coach-session
  walkthroughs).

## 5. Review → Fundamentals → Weakness → Drill pipeline  ★ (the plan lives here)

One-line flow: **replayPgn → pooled Stockfish → classifyCpLoss + persisted PV →
`attributePrinciples` → `principleVoice` (review) AND `FUNDAMENTAL_TAG` →
`misconceptionClassifier` → `logMisconception`/`mistakePuzzles` → weakness spine →
Weaknesses tab / drills / Training Plan.**

### 5a. Analysis — `gameAnalysisService.ts` + `autoAnalyzeGame.ts`
- Depths: sweep `BATCH_SHALLOW_DEPTH=12`/200ms (draft); the deep pass on OPEN is the
  real review (`REVIEW_DEEP_DEPTH=16`, `BEST_MOVE_DEPTH=18`). Grader `classifyCpLoss`
  (expected-points/win%, chess.com model). Worker pool (`WORKER_POOL_SIZE`, phones cap 4).
- **PV persisted on flagged annotations:** `MoveAnnotation.pv = {afterPlayed, afterBest}`
  (UCI) — corroboration for the attributor, never its gate.
- `autoAnalyzeGame`: extracts blunders/mistakes for the player color with
  `historySans` + real `cpLoss`, writes `mistakePuzzles` (incl. positional back-fill)
  and calls `captureMisconception` once/game.

### 5b. The fundamentals computer — `src/services/principleAttribution.ts`
- **25 `FUNDAMENTAL_IDS`** (12 opening / 10 middlegame / 3 endgame), `:32-43`.
  `FUNDAMENTAL_TAG` (`:47-73`) maps each → a `MisconceptionTagId`. `CO_OCCURRENCE`
  (`:77-81`) = positional detectors that speak only when no move-verified row exists.
  `ATTRIBUTION_MAX=3`, `OPENING_PLIES=24`.
- **`Ctx` a detector receives** (`:330-335`): `before`/`after`/`afterBest` chess.js
  boards (`afterBest` = best move + opponent's natural recapture), `last`/`best`
  verbose Moves, `history`, `plyIndex`, `opening`/`endgame`, `pvP`/`pvB` (SAN PVs).
- **`att(id, weight, {squares, moves, pvMoves}, facts)`** (`:337-341`) — a detector
  returns `null` (silent) or `att(...)`. `facts` keys are consumed verbatim by
  `principleVoice`. `+1` weight if `pvMoves` non-empty.
- **Authoring a detector (the triad, by convention):** (1) guard the PATTERN off
  `last`/`before`/`history`; (2) prove the PUNISHMENT on `after` — a concrete opponent
  move (helpers `kickAvailable`/`twoStepKick`/`cheapestCapture`/`hangsBy`(SEE)/
  `landsSafely`/`legalMovesFor`) → SAN in `moves`, OR a positional cost → add id to
  `CO_OCCURRENCE`, `moves`=the better move; (3) prove the COUNTERFACTUAL — recompute the
  punishment on `afterBest`, `return null` if it survives; (4) `return att(...)`. Reusable
  board helpers at `:124-326` (`isolatedPawns`/`doubledPawns`/`isPassed`/`supportedPawn`,
  `fileIsOpen`, `pieceMobility`, `pawnAttacks`, `material`, `kingSquare`, …).
- **Driver `attributePrinciples`** (`:735-796`): gates on flagged + bestSan; runs all
  DETECTORS; subsumption (early-queen ⊳ tempo+dev; loose-piece ⊳ greedy; ignored-threat ⊳
  loose-piece); prefers verified over co-occurrence; sorts by weight then IDs order;
  slices to 3. The triad decides **when** a detector announces — deterministic board
  facts that lack a punishment simply stay silent (so a "true every move" rule never spams).

### 5c. Voice of a fundamental — `src/services/principleVoice.ts`
- `fullVerdict(a,v)` (`:28`) + `shortVerdict(a)` (`:242`) — one exhaustive `case` per
  `FundamentalId` (3 stem variants, rotated on ply). `RECAP_NOUN` (`:304`) one phrase per
  id. `renderFundamentalVerdict` leads a flagged move's review beat; `renderFundamentalsRecap`
  is the end-of-game aggregate. Spoken RAW (excluded from the LLM warm pass) — G0.

### 5d. Misconception tags — `misconceptionClassifier.ts` + `data/misconceptionTags.ts`
- `classifyMisconception` is deterministic; **(0) attribution-first**: runs
  `attributePrinciples`, uses `attrs[0].tag` when any fires, else cheap board checks,
  else `{tag:'other'}`. 21 tags across buckets opening/tactical/positional/endgame/general.
- **Only 5 tags carry `puzzleThemes`** (drillable from `puzzles.json`): `hung-material`,
  `missed-tactic`, `calculation-depth`, `missed-opponents-threat`, `overvalued-attack`.
  Every other tag drills from the student's OWN flagged positions (`mistakePuzzles`).
- **5 tags have NO fundamental detector** (attribution gap): `no-plan`,
  `overvalued-attack`, `calculation-depth`, `left-book-early`, `botched-conversion`.

### 5e. Weakness aggregation + drills
- `misconceptionService` — logs `MisconceptionTagRecord` (+ PostHog `weakness_captured`),
  SRS-spaces via `recordTagDrillResult`, `getMisconceptionProfile` → ranked aggregates,
  `mapTagToDrills` → `TagDrillPlan {tag, kind, puzzleThemes, positions[]}`.
- `weaknessSpine` — `UnifiedWeakness` merges the misconception + analysis pipelines;
  `themesForTactic` (snake→Lichess camelCase), `getUnifiedWeaknessProfile` (coach-caught
  rows win the position dedup). `weaknessAnalyzer` — buckets→categories, `WeaknessItem`
  with `trainingAction.route`; persists `weakness_profile` + `skillRadar`.
- `mistakePuzzles` store (`MistakePuzzle`, `types/index.ts:56`) — the student's own
  flagged positions, SRS-scheduled, drilled at `/weaknesses/mistakes`.

### 5f. Review UI
- Narration composed in `coachFeatureService.generateReviewNarration` — the fundamental
  LEADS the beat (verdict → PV evidence → why → cost → better move), fundamentals-led
  lines excluded from the warm pass. `CoachReviewSessionPage` (render-now-deepen-in-bg) +
  `CoachGameReview` (ply walk; find-the-shot / blunder-rewind / turning-point cards;
  "Show me" auto-walks the engine line).

**Adding ~30 detectors touches exactly 4 files:** `principleAttribution.ts`
(`FUNDAMENTAL_IDS`, `FUNDAMENTAL_TAG`, optional `CO_OCCURRENCE`, `DETECTORS`),
`principleVoice.ts` (`fullVerdict`+`shortVerdict`+`RECAP_NOUN`). Reuse an existing tag
→ the drill/weakness/UI layers need zero change. New tag → also `misconceptionTags.ts` +
`misconceptionClassifier.ts`.

## 6. Openings + teaching

- **`/openings` explorer** — `OpeningExplorerPage` (tabs masterclasses/pro/gambits/
  counter/all). **`/openings/:id`** — `OpeningDetailPage` (2611 lines), a ~40-mode view
  switch; the canonical **WLPP** surface: Watch/Learn/Practice/Play ladder
  (`utils/wlppLadder.ts`), variation tabs, middlegame + endgame plans, model games,
  punish-gems + named traps (weapons lock), pitfalls/common-mistakes, checkpoint quiz,
  book readers. Practice→Play unlocks only on a perfect pass; Play unlocks weapons.
- **Content registries:** `data/lessons/index.ts` — `LESSONS` (main + ALL pro-rep) and
  `VARIATION_LESSONS` (runtime routing); `lessonToPlayableLine` converts a `LessonScript`
  → `PlayableMiddlegameLine` (Learn/Practice). `data/lessons/registry.ts` — the CONTENT-GATE
  collector (`OPENINGS` → `ALL_LESSONS`); pro-rep is deliberately absent (only the G5
  contract applies to it). Types: `LessonBeat`/`LessonScript` (`types/index.ts:201-240`).
- **DB-narration generation** — `openingGenerator.generateOpeningFromDbNarration`
  (`:1716`): spine from DB (+ explorer deepening of thin lines), chess.js FENs, LLM writes
  prose only, arrows code-computed from the note before the model speaks. Three tiers:
  **note-driven** (corpus note leads) / **authored** (`repertoire.json` explanation) /
  **computed** (deliberation) → silence fallback. `WALKTHROUGH_GEN_REV` cache stamp.
- **Learn-with-Coach** — `CoachTeachPage` (largest surface) + `useTeachWalkthrough`
  (11-phase machine: idle/choose-mode/narrating/fork/trap/gem/leaf/paused/stage-menu/
  quiz/drill). Hook owns chess.js; voice-gated `speakPaced`. Stage gen (concepts/findMove/
  drill/punish). An unbuilt opening redirects here from OpeningDetailPage.
- **Players/primitives:** `LessonPlayer` (Watch, story-first, lead-the-eye reveal),
  `PlayableLinePlayer` (Learn/Practice/Watch of a playable line). `openingDetectionService`
  (`NAME_ALIASES`, `detectOpening` trie, terminal-short filter `TEACHABLE_PLY_THRESHOLD=8`,
  `findSiblingExtensionBranches`).
- **SRS:** opening-line trainer `srsOpeningService` (SM-2, one card per student ply) +
  `flashcardService` (FSRS via `srsEngine.ts`).

## 7. Play with Coach

- `/coach/play` `CoachGamePage` — pure playing surface (coach silent unless asked; gated
  by `coachHubCopy.test.ts`). `coachPlaySession.resolveConfig(difficulty, elo)` →
  rating-matched Stockfish (`UCI_Elo`). `slipDetector.slipWarrantsInterjection(cpLoss,
  rating)` — rating-adaptive interruption bar (but the slip is always captured to the
  weakness bucket regardless). `usePhaseNarration` = the ~10% coach voice (corpus note
  first, then engine look-ahead; grounded, no free LLM). Games persist to `db.games`
  (source='coach') → `generateMistakePuzzlesFromGame`.

## 8. Engine & tactics

- `stockfishEngine.ts` — singleton + worker; `resolveWorkerUrl` picks variant
  (multi/single/lila/asm/ios-native); iOS pinned to asm.js (WASM traps/OOM on WebKit).
  `analyzePosition`/`getBestMove`/`analyzeWithBudget`. Separate analysis pool in
  `gameAnalysisService`.
- `tacticsDetector.detectTactics(fen)` — pure chess.js, no engine; forks/pins/skewers/
  mate-threats/back-rank/trapped/discovered/removable-guard/overload/battery, each with a
  `beneficiary`. Supplies live tactic context to the coach.

## 9. Puzzles / Tactics

- `/tactics` `TacticsPage` (grid hub) — Pattern Recognition, My Mistakes, My Weaknesses
  (`/tactics/weakness-themes`), Analysis Practice, Calculation, Daily Training, Setup,
  Random Mix (`/tactics/drill`), Find the Square, plus `/tactics/adaptive`.
- `puzzleService` — `THEME_MAP` (label→Lichess tags), `getPuzzleForThemeAtRating(themes,
  rating, seen)` (adaptive band picker), ELO rating model. `adaptivePuzzleService` —
  `createAdaptiveSession(difficulty, forcedWeakThemes?)`, `getNextAdaptivePuzzle`.
- **Reusable drill UX:** `TacticDrillPage` reads `location.state.filterThemes`;
  `/tactics/adaptive` reads `forcedWeakThemes`. Hand-off pattern (see `PatternSchoolPage`):
  `navigate('/tactics/drill', { state: { filterThemes } })`. `PuzzleBoard` owns validate/
  hint/solution/retry/meter.

## 10. Endgame  ★ (the section this branch owns)

- `/coach/endgame` `CoachEndgamePage` — 7 tabs (Mating/Principles/Pawn/Rook/Drawn/Eval
  Lab/Your Games) via a horizontal strip. `EndgameLessonTab` renders keystones (student
  plays `solution`) + adaptive/fixed drills; board through `ChessLessonLayout` +
  `ConsistentChessboard`. `useEndgamePlayout` (student-driven, `reveal()` auto-plays).
  Data: `endgame-principles.json`, `pawn-endings.json`, `rook-endings.json`,
  `drawn-patterns.json`, `mating-patterns.json`. `EndgameLessonPosition` has
  `fen/title/explanation/result/bestMove/solution[]`.
- Endgame is the THINNEST layer of the fundamentals computer (3 of 25 detectors) — the
  biggest detector gap (opposition, passed-pawn push, rook-7th, OCB draw, majorities).

## 11. Fundamentals tab (`/coach/fundamentals`)  ★

- `FundamentalsPage.tsx` — 4 read-aloud "pillar" cards (piece-values, center,
  development, king-safety) from `groundedAnswer.assembleFundamentalsAnswer(topic)`
  (`FundamentalsTopic` = those 4 + `general`). Each card: authored prose + "Listen"
  (`useProseReader`→`speakReadAloud`) + optional "Walk the Opera Game" (→ `/coach/review/
  sample-morphy-opera-1858`, only where `exampleReviewId` exists).
- **NO puzzles, NO board practice.** Only nav entry is the Coach hub tile.
- **Taxonomy gap:** the tab's 4 pillars are a SEPARATE, coarser taxonomy from the
  computer's 25 `FUNDAMENTAL_IDS` — no code links a `FundamentalId` to a
  `FundamentalsTopic`. Reconciling them is net-new authoring.

## 12. Surfaces & standards ("match the rest of the app")

- **Hub shell:** centered `text-xl font-bold text-center` title + `PageHelp` top-right +
  `SmartSearchBar` in `max-w-lg mx-auto w-full`; standard scroll container
  `flex flex-col gap-4 p-4 flex-1 min-h-0 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6`.
  Two accepted card shapes: Dashboard **stacked bars** (`flex flex-col gap-2 max-w-lg
  mx-auto w-full`, each `rounded-2xl flex items-center gap-3 px-4 py-3.5` + icon + 2-line
  text + chevron + neon border) or the **2-col grid** (`grid grid-cols-2 gap-3`,
  `border-2 rounded-2xl bg-{c}-500/10`). FundamentalsPage only partially conforms
  (no SmartSearchBar, back-arrow instead of first-class hub, prose-only).
- **Board primitives:** `ConsistentChessboard` (the only board facade),
  `Board/ChessBoard` (walkthrough validating board), `ChessLessonLayout` (single-column
  lesson rhythm; board slot is now a clip-proof width-driven aspect-square). WLPP grammar
  = Watch (voiced auto-play) / Learn (guided) / Practice (silent+hint) / Play (locked line).
  Voice-gated advance = `useStrictNarration`. Lead-the-eye arrows required per move.

## 13. Analytics, audit, gates, deploy

- **Analytics:** `analytics.ts` — PostHog (`us.i.posthog.com`), super-props from the
  device-identity chain, `captureEvent`. `mirrorAuditEvent` bridges mapped audit kinds →
  PostHog events. Native-iOS-only + appstore-distribution filters are the rule for usage
  questions (CLAUDE.md).
- **Audit:** `appAuditor.logAppAudit` — rolling 300-entry `meta` log, streams to
  `/api/audit-stream` (ephemeral, wiped per deploy — NOT the analytics store). ~300
  `AuditKind`s.
- **Gates:** `scripts/ship-check.mjs` — typecheck + `vite build` + lint(errors) + curated
  `GATE_TESTS` (~90 content-correctness tests incl. coachInversion.gate, grounding*,
  narration*, lesson*, perspectiveVoice) + co-located tests for changed files. `--full`
  adds the Playwright `AUDIT_MATRIX`.
- **Deploy:** push to `main` = the free web app (Vercel; ignored-build-step builds only
  `main`; Netlify mirror redirects to it). iOS = a separate on-demand TestFlight/App Store
  build. Post-deploy 3-instrument audit is mandatory (G1). OTA via `api/ota/manifest.ts`
  (forward-only ordinal, delta manifests).
- **API:** `api/tts.ts` (Google seam), `api/llm-proxy.ts` (LLM key), `api/audit-stream.ts`,
  Lichess proxies (`lichess-explorer`/`-game-export`/`-cloud-eval`/`-tablebase`/`-puzzle`),
  `api/revenuecat-webhook.ts` (billing).

---

## 14. The Fundamentals extension — where the plan will build (deterministic-rules → detectors)

The ~35 board/engine-provable maxims (the "D" set from the 200-maxim triage) become new
`FUNDAMENTAL_IDS` detectors, each reusing an existing `MisconceptionTagId` where possible
so the drill/weakness/UI layers light up for free. Endgame is the priority (thinnest).
Drill source per fundamental:
- has a Lichess `puzzleThemes` tag (tactical/mate/technique) → themed `puzzles.json` drill
  via `getPuzzleForThemeAtRating` / `filterThemes` hand-off;
- otherwise → the student's OWN flagged positions (`mistakePuzzles`), produced
  automatically once the detector fires in review/autoAnalyze.
The Fundamentals tab is then rebuilt to the hub standard (SmartSearchBar + standard cards)
and each fundamental gains Watch narration (H-set maxims) + a "Drill" action. Full plan:
`docs/plans/2026-09-06-fundamentals-puzzles-and-detectors.md` (to be written).
