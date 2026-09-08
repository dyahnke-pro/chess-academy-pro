# Coach System Map — how the coach is built and wired

**Purpose.** Regain context on the coach's architecture fast, without
re-reading 900 service files. This is the STRUCTURE of the space. The VISION +
build plan lives in `docs/plans/2026-09-08-unified-coach.md` — read that before
starting a build; read THIS to remember where a wire lives.

Grounding rules that govern everything below live in `CLAUDE.md` (G0: the LLM
decides nothing, it voices facts computed in code; G3: no invented chess
content). This doc describes the machinery those rules run on.

---

## 1. The one-sentence model

**Code computes chess facts → a code SPINE selects and orders which facts matter
for THIS student in THIS position → a phrasing chokepoint (`voiceFacts`) turns
the selected facts into the house voice → actuators (voice + board-control +
arrows/highlights) deliver it.** The LLM is only the phraser. Everything
upstream of `voiceFacts` is deterministic code.

```
   DATA + BOARD                FACT-COMPUTERS            SPINE SELECTOR         ACTUATORS
 ┌──────────────┐          ┌────────────────────┐    ┌──────────────────┐   ┌─────────────┐
 │ chess.js     │          │ positionFacts      │    │ narrationImportance│  │ voiceFacts  │→ TTS
 │ Stockfish    │  ──────► │ tacticsDetector    │──► │ criticalityScan   │─► │ (phrasing)  │
 │ openings DB  │          │ causalChain        │    │ (+ studentWeakness │   │ board tools │→ board
 │ corpus notes │          │ threatOut / PV     │    │  = the gap, P1)   │   │ arrows/hl   │→ eyes
 │ weakness DB  │          │ theoryDeparture …  │    └──────────────────┘   └─────────────┘
 └──────────────┘          └────────────────────┘             │                    │
                                                               └──── loops back ────┘
                                                          (student model updated by what
                                                           happened → next selection)
```

---

## 2. Surfaces (routes) — same brain, different register

The coach speaks in TWO registers (`CLAUDE.md` "TWO DISTINCT NARRATION
REGISTERS"): **review** = retrospective (your game, hindsight); **in-game /
watch / learn** = present-tense as a line plays out. Perspective is always
you/your (student), they/their (opponent), never we/our (`CLAUDE.md`
"ONE PERSPECTIVE").

| Route | Component (src/components/…) | Register | Notes |
|---|---|---|---|
| `/coach/teach` | `Coach/CoachTeachPage` | learn (present-tense) | THE canonical lesson surface. Board+chat two-column. Live "talk you through the game" commentary + phase transitions. Mid-game cards REMOVED (record kept). |
| `/coach/play` | `Coach/…` (`OpeningPlayMode` in-page) | in-game | PURE playing surface. Silent unless student asks; only phase-transition narration volunteers. Full diagnostic → review. |
| `/coach/review`, `/coach/review/:gameId` | `Coach/CoachGameReview` | review | Ply-by-ply walk; diagnostic cards; the causal chain leads the beat here. |
| `/coach/chat` | `Coach/…` | Q&A | Text coach; grounded answers via `groundedAnswer`. |
| `/coach/endgame`, `/coach/session/:kind`, `/coach/plan`, `/coach/train`, `/coach/fundamentals` | `Coach/…` | mixed | Lesson/session surfaces built on the walkthrough runtime. |
| `/openings/:id`, `/openings/pro/:playerId/:id` | `Openings/OpeningDetailPage` | watch/learn | WLPP (Watch/Learn/Practice/Play), masterclass + pro-rep. |
| `/tactics/*`, `/puzzles/*`, `/weaknesses/*` | `Tactics/…` | drill | Puzzle/drill surfaces; consume the weakness spine. |
| `/kid/*` | `Kid/…` | kid-safe | PERMANENTLY EXCLUDED from the corpus + adult personalities (`CLAUDE.md` kids rules). |

Routes are declared in `src/App.tsx`.

---

## 3. The coach brain (chat / turn pipeline)

Lives under `src/coach/`.

- **`coachService.ts`** — top of the turn. `getCoachChatResponse` orchestrates
  a turn: intent → grounding → tool loop → phrasing.
- **`dispatchCoachTurn.ts`** — routes a turn to the right lane.
- **`envelope.ts`** — assembles the system-prompt envelope (board FEN, injected
  grounding blocks, teach-mode additions, arrow rules).
- **`questionIntents.ts`** — deterministic (regex-first) intent classification
  (best-move / positional / principle / traps / meta / teaching / game-mistake).
- **`querySignals.ts`**, **`boardQuestions.ts`** — signal extraction from the ask.
- **`providers/`** — DeepSeek-first, Anthropic fallback (`CLAUDE.md` provider
  routing). The fallback chain lives in `coachApi.ts`.
- **`tools/registry.ts`** — the LLM's tool surface, split:
  - **`tools/cerebellum/`** = LOOKUP tools (read-only knowledge): lichess
    explorer / masters / opening book, `lookupPlayerGames`,
    `stockfishEval`, `stockfishClassifyMove`.
  - **`tools/cerebrum/`** = ACTION tools (the coach's "hands"): `playMove`,
    `takeBackMove`, `resetBoard`, `setBoardPosition`, `savePosition`,
    `restoreSavedPosition`, `startWalkthroughForOpening`, `navigateToRoute`,
    `quizUserForMove`, `recordBlunder`, `recordHintRequest`, `favoriteOpening`,
    `saveOpeningToRepertoire`, `setIntendedOpening`, `clearMemory`.
  > These board-control tools ALREADY EXIST. Today the LLM decides when to call
  > them. The unified-coach gap (P4) is letting the SPINE invoke them
  > deterministically — the "hands" are built, the autonomic control of them is not.

### The chokepoint — `src/services/coachApi.ts`
- **`voiceFacts(...)` (coachApi.ts:2487)** — THE single phrasing chokepoint
  (G0). Takes an ORDERED list of computed facts + a register/rating, returns
  the spoken line. Contract: "never merge, split, reorder" — the SPINE already
  ordered them. `preferRaw` speaks the computed prose directly and bypasses the
  LLM entirely (the purest G0). This is the ONLY place `openai`/Anthropic is
  imported (`CLAUDE.md` Do-NOT rule).
- Provider config + the 401/429 fallback chain also live here.

---

## 4. The fact-computers — "all the tools at the coach's fingertips"

These are the LEAF services that compute board-proven chess facts. The SPINE
picks from among them. (This is the pool David means by "all tools at the
coach's fingertips.")

**Position assessment**
- `positionFacts.ts` — the aggregator. `computePositionFacts(input)` →
  `PositionFactsResult{ importance, criticality, mustDefend, leansOn,
  opponentLeansOn, deliberation, latentDanger, kingExposure, opponentIntent,
  structurePlan … }`. `PositionFactsInput` (line 32) is the SEAM — it has
  fen/moverColor/studentColor/rating/analysis but **NO studentWeaknesses**
  field yet (that's P1).
- `criticalityScan.ts` — `criticalityThresholds(rating)` rating bands
  (<1000 / 1000–2000 / >2000); gapCp/severity = decision leverage.
- `narrationImportance.ts` — `computeImportance(...)` → the importance verdict
  that gates whether a fact speaks. Position + rating only today.
- `perturbation.ts` (`computeLeansOn`), `deliberation.ts` (candidate weighing),
  `threatOut.ts` (`computeMustDefend` — null-move standing-threat probe),
  `kingSafety.ts`, `opponentIntent.ts`, `latentDanger.ts`, `boardPlan.ts`
  (`structurePlan`), `positionalRead.ts` / `tacticalRead.ts`.

**Tactics**
- `tacticsDetector.ts` — fork/pin/skewer/discovery/etc. detection.
- `liveTacticsContext.ts` — the TacticsLiveContext block for in-game awareness.
- `tacticAlertService.ts`, `missedTacticService.ts`, `tacticClaimValidator.ts`.

**Causal chain (SHIPPED — see `docs/plans/2026-09-07-causal-chain-engine.md`)**
- `causalChain.ts` — cross-move cause→effect graph. `buildCausalChain` (played),
  `findMissedChain`, `findAllowedChain`. Two patterns (premature-queen→discovery;
  removed-defender). Helpers: `causalChainArrows`, `causalChainHighlights`,
  `causalChainMistakeTags`.
- `causalChainVoice.ts` — `renderCausalChain(chain, {register, studentColor,
  rating})`, rating-scaled depth.

**Engine PV (spelling lines out)**
- `pvPlayback.ts` — `computePvLine(fen, {firstUci, maxPlies, depth})` →
  `PvLine{plies:PvPly[], rootEvalCp, terminalEvalCp, delivers, closeAlternative}`;
  each `PvPly` carries `PlyFacts{captured, isCheck, isMate, tacticLanded,
  materialGained…}`. The raw material to spell threat/plan lines truthfully.
- `stockfishEngine.ts` — the ONLY Stockfish access (`CLAUDE.md` Do-NOT). Native
  binary in sandbox at `/usr/games/stockfish`; WASM worker in-app.

**Threats** (the rework target, P2)
- `groundedAnswer.ts` — `detectNewThreat` (1-ply chess.js scan → DetectedThreat),
  `describeStudentThreat`, `describeThreatRecognition` (line ~4973 — the
  REMEDIAL explainer David wants KILLED), `describeThreatPrevention`.
- `threatCheck.ts`, `threatOut.ts`.

**Openings / theory**
- `openingDetectionService.ts` — name/PGN resolution, `NAME_ALIASES`,
  terminal-short filter, `findSiblingExtensionBranches`, `findContinuationsAtPly`.
- `theoryDeparture.ts` — `TheoryDeparture{departurePly, bookFen, departedSan,
  mainMove:{san,games,pct}}` from the masters DB (G3-clean). The book-departure
  weakness signal (P3) aggregates this.
- `openingGenerator.ts` — `generateOpeningFromDbNarration` (DB moves → LLM prose
  only). `openingFactChains.ts`, `reviewOpeningTheory.ts`.

**The corpus (90% of what gets said — `CLAUDE.md`)**
- `farmedCorpusData.ts` / secondary corpora → position-keyed notes selected by
  BOARD (`teachingNoteForBoard`, `noteAtPosition`), never by name. Voiced corpus
  (`vc-`) is the sole exact-position source on play surfaces.

---

## 5. The student model (weakness spine)

- **`weaknessSpine.ts:538`** — `getUnifiedWeaknessProfile(): Promise<UnifiedWeakness[]>`.
  The CANONICAL ranked weakness query. Folds misconceptions + mistakePuzzles +
  classifiedTactics + openingWeakSpots + conversion/time-trouble/vision. Ranked
  by openCount → severity → lastSeenAt. **Read today ONLY by drills + chat — NOT
  by live narration. That is the central unified-coach gap (P1).**
- `misconceptionService.ts` / `misconceptionClassifier.ts` — misconception tags;
  the "why did you play that?" record still captured silently
  (`learnSilentCapture`).
- `mistakePuzzleService.ts` — My-Mistakes puzzles; `pvBandForRating`.
- `coachDrillService.ts` — `buildMistakeDrillQueue`.
- `coachCurriculumService.ts` — `CoachCurriculumRecord` sequences weaknesses
  into a curriculum (the seed for custom sessions, P5).
- `tacticalProfileService.ts`, `weaknessAnalyzer.ts`, `weaknessConceptMap.ts`,
  `weaknessLifecycle.ts`.

---

## 6. Narration authoring & delivery

- `voiceService.ts` — TTS. `speakInternal` (gated by verbosity G5),
  `speakForced` (automatic in-game, gated), `speakReadAloud` (explicit
  read-this-to-me, bypasses verbosity), `speakCloud` (Google TTS tier).
  Audit mute: `muteTtsForAudit` / `auditMute` (`CLAUDE.md` G1).
- `narrationSegments.ts` — sentence-grained reveal (marker fires as its
  sentence is spoken). `narrationArrows.ts` — grounded/legality-gated arrows.
- `walkthroughNarration.ts` / `pvPlayback` feed the walkthrough runtime
  (`src/services/walkthroughRunner.ts` + `src/hooks/useWalkthroughRunner.ts`,
  voice-promise-gated auto-advance).
- Gates: `narrationAccuracy` (board-truth per claim), `narrationGrounding`,
  `lessonIntegrity` (arrow origins), `perspectiveVoice` (no we/our).

---

## 7. Data, stores, DB

- **DB (canon for MOVES):** `src/data/openings-lichess.json` (3.6k entries),
  `public/data/openings-masters-db.json` (masters, opening-phase),
  `puzzles.json` (Lichess CC0), `repertoire.json`, `pro-repertoires.json`,
  `middlegame-plans.json`, `model-games.json`, `common-mistakes.json`,
  `chess-concepts.json` + `opening-book-pages.json` (books = IDEAS, classical).
- **Dexie** (`src/db/schema.ts`): games, mistakePuzzles, classifiedTactics,
  misconceptionTags, openingWeakSpots, openings, flashcards, profiles,
  proGameReferences, meta … Persistent data only.
- **Zustand** (`src/stores/`): `appStore` (activeProfile, settings, theme),
  `coachBoardStore`, `coachSessionStore`, `coachMemoryStore`, `entitlementStore`,
  `freeTierStore`, `aiConsentStore`. Runtime state only.

---

## 8. Where the big wires live (fast anchors)

- Review beat build: `coachFeatureService.ts` → `buildReviewSegments(moves,
  studentColor, …, rating)`. Causal chain leads the beat here (both push sites).
  Threat callout ~1819; `augmentWithProjections` (async PV deepening) ~2395.
- Learn live commentary: `CoachTeachPage` coach-reply teaching pass (frame = the
  move just played).
- Phrasing: `coachApi.ts:2487` `voiceFacts`.
- Selection: `positionFacts.ts:32` (`PositionFactsInput`) + `narrationImportance`
  + `criticalityScan`.
- Student model: `weaknessSpine.ts:538` `getUnifiedWeaknessProfile`.

## 9. How to regain context fast

```bash
# what computes X?
grep -rn "computePositionFacts\|computeImportance\|buildCausalChain\|computePvLine\|getUnifiedWeaknessProfile" src/services | head
# who consumes it?
grep -rln "getUnifiedWeaknessProfile" src
# the phrasing chokepoint + tool surface
sed -n '2487,2560p' src/services/coachApi.ts ; ls src/coach/tools/cerebrum src/coach/tools/cerebellum
```

Audits per surface: `docs/AUDIT_INDEX.md` + the Post-Deploy Audit matrix in
`CLAUDE.md`. Gates: `npm run ship-check`.
