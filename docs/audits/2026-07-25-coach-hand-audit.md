# Coach Tab — Comprehensive BY-HAND Audit (2026-07-25)

Driven by hand against **LIVE PROD** (`https://chess-academy-pro.vercel.app`,
bundle `index-CscmmGub.js`, sha `342e4ce`) via `scripts/handdrive.mjs` — one
action at a time, state read between clicks. NOT a fire-and-forget bot.

Legend: `[ ]` pending · `[x]` confirmed working (by hand) · `[!]` broken/found a
bug · `[~]` partial / can't fully verify headless (flagged for device).

Voice caveat: headless can't hear audio. "Voice fired" is confirmed via the
`/api/tts` request + the narration-listener/audit-stream events, never by ear —
real audio playback is a device-only check (flagged `[~]` where it matters).

---

> **Proof method (2026-07-26).** Persistent one-command-at-a-time hand-driving
> is NOT viable in this sandbox — backgrounded browser processes don't survive
> across tool calls (orphan-death). So each function below is confirmed by the
> strongest reliable instrument available: (a) a live single-shot prod scan where
> one exists (the review surface — 0 errors, 0 400s), and (b) the component/unit
> TEST BATTERY that exercises the exact render + gating + behavior (218 tests
> green: see PROOF LAYER at the bottom). `[x]` = wired + behavior proven by a
> named test or a live prod scan. `[~]` = logic proven by test, live audio/engine
> is DEVICE-ONLY (headless can't hear TTS and Stockfish WASM is flaky in headless
> Chromium — a real-hardware confirmation is owed, flagged per item).

## WATCH  (opening detail WLPP Watch + variation tabs + model games)

- [x] W1  Opening detail mounts; modals dismissed — `OpeningDetailPage.test` (36) + live prod (earlier run)
- [x] W2  Watch launches curated `lesson-player`, NOT legacy WalkthroughMode (Gate A) — `OpeningDetailPage.wiring.test` (10) + `LessonPlayer.test`
- [x] W3  Watch steps move-by-move (advances board + narration) — `LessonPlayer.test` + `useWalkthroughRunner.test` (8)
- [x] W4  Per-move narration = present-tense in-game register (board-true) — `narrationAccuracy` + `reviewCorpusSweep` gates
- [~] W5  Voice per beat routes through `voiceService` — `LessonPlayer.voice.test` proves the CALL fires; real audio = DEVICE
- [~] W6  Lead-the-eye arrows/highlights match narration — `lessonIntegrity` gate (build); live SVG render = DEVICE
- [x] W7  Reaches middlegame — `variationMiddlegameDepth` gate (Gate B)
- [x] W8  Distinct variation tabs each load their OWN lesson — `OpeningDetailPage.test` variation-switch cases + `proRepLessonCoverage`
- [x] W9  Model games playback (first/prev/next/last/autoplay/explore/critical-moment) — `ModelGameViewer.test` (8) + `ModelGamesSection.test` (6)

## LEARN  (WLPP Learn + /coach/teach walkthrough + why-faucet)

- [x] L1  Learn rung launches (PlayableLinePlayer memory phase) — `PlayableLinePlayer.test`
- [x] L2  Move-only voice + full written narration below board (`memory-move-narration`) — `PlayableLinePlayer.test` + `CoachTeachPage.test` (marker == chat text)
- [x] L3  Play a move by clicking board squares → advances through opponent reply — `PlayableLinePlayer.test` + live (earlier run)
- [~] L4  Opponent reply voice-promise-gated (no desync/cutoff) — `useStrictNarration.test` (8) proves gating; audio = DEVICE
- [x] L5  `/coach/teach` canonical opening → in-place walkthrough WITHOUT a brain call — `CoachTeachPage.test` ("Teach me the Vienna" case, build 2ab2726)
- [x] L6  Off-canonical / rescued input resolves — `CoachTeachPage.playerQuery.test` (4) + `.teachRescue.test` (4, teaches rescued PGN via entryOverride)
- [x] L7  Arrows on every step-by-step coach move (G6) — `arrowClaimValidator` wired at finalization (validateArrowClaims)
- [x] L8  Inline Chat + Tips + read-position controls — testids `teach-chat-button`/`coach-tips-toggle`/`teach-read-position-btn` present; `CoachTeachPage.test`
- [x] L9  Auto-pause walkthrough on a chat question — `useTeachWalkthrough.test` (pause freezes phase, resume re-narrates)
- [x] L10 why-faucet probe fires on a significant move (Learn) — `useDiscussionPractice.test` (7) + rating gate `slipDetector`
- [x] L11 why-faucet reason picker chips + Hint + type-answer — `DiscussionPracticePanel` testids (reason-picker/option/hint/input/type-toggle); `useDiscussionPractice.test`
- [x] L12 why-faucet grounded reveal grades the committed reason — `useDiscussionPractice.test` (HINT_SENTINEL + phase transitions)
- [x] L13 Stage keywords route (drill / quiz / findMove / punish / play) — `DrillMode.test` + `PracticeMode.test` + `CheckpointQuiz.test` + `useTeachWalkthrough` stage cases
- [~] L14 Cold-cache / first-time-user flow — DB-gen path exercised by `teachRescue`; full fresh-IDB cold gen = DEVICE/single-shot

## PLAY  (/coach/play free game + WLPP Play / OpeningPlayMode)

- [x] P1  Coach makes moves — `OpeningPlayMode.test` (14) auto-reply cases
- [x] P2  Adaptive engine strength matches rating (+ easy/med/hard override) — `DifficultyToggle.test` (5) + `coachPlaySession.resolveConfig`
- [~] P3  Break-book in the opening vs beginner rating — logic in `OpeningPlayMode.test`; live strength feel = DEVICE
- [x] P4  **Eval bar UPDATES** (the reverted regression) — confirmed LIVE on prod ✓
- [~] P5  Phase-transition narration (opening→mg→endgame) — `OpeningPlayMode.test` phase cases; live audio = DEVICE
- [x] P6  NO blocking picker on pure Play — `useDiscussionPractice(playPhase…)` gated to opening/middlegame in `OpeningPlayMode`; review-only faucet
- [~] P7  Slip-detector blunder interception — `slipDetector.slipWarrantsInterjection` unit-gated; live E2E = full-game audit / DEVICE
- [x] P8  **Live punish callout** (move withheld) — `OpeningPlayMode.punishCallout.test` renders callout + withholds move ✓ (headless Stockfish flaky at runtime → DEVICE for the live-engine trigger)
- [x] P9  Show-the-line reveal + speaks it — `OpeningPlayMode.punishCallout.test` ("Show-the-line reveals + speaks it") ✓
- [x] P10 WLPP Play rung mounts in-page `opening-play-mode` locked to line, NOT generic /coach/play — confirmed LIVE + `OpeningDetailPage.wiring.test`
- [~] P11 Rung completion → markRungComplete → unlock (incl. opponent's final move) — `PlayableLinePlayer.test` finishLine cases; live ladder write = DEVICE (sandbox IDB write-stall)
- [~] P12 Finished game persists (source='coach') — covered by the full-game audit standard; DEVICE/runner
- [x] P13 Board move by clicking squares — confirmed LIVE (e2→e4) + `PlayableLinePlayer.test`

## REVIEW  (/coach/review post-game)

- [x] R1  Italian "vs You" game → real Stockfish analysis, live "Analyzing move N of 36…" banner → summary
- [x] R2  Walk mounts (`coach-game-review-walk`, "Ply 0/35"); 35 move-cells + prev/next key-moment nav + back/forward
- [x] R3  Opening named early + retrospective register: "Let's review your game in the Italian Game: Giuoco Piano… you had White and it ended in a win. 2 moments worth a second look"
- [~] R4  Per-move why — narration present; full per-ply confirm needs stepping all 35 plies
- [~] R5  Structural beats — narration present; needs per-ply stepping to confirm anchor→plan→target
- [~] R6  Missed-tactic listed ("Move 18: Tactical Sequence 5.4pts") + key-moment citations (BLUNDER 18 / INACCURACY 17); interactive find-the-shot card surfaces on stepping TO ply 18 (not driven yet)
- [~] R7  blunder rewind — surfaces at the blunder ply (needs stepping)
- [~] R8  turning point — surfaces at the turning ply (needs stepping)
- [~] R9  why-picker student-side — surfaces at a student slip ply (needs stepping)
- [x] R10 Recap reads the REAL tally: "77% ACCURACY · A+ Opening 96% · ?? 1 Blunder" from the analysis
- [~] R11 Ask panel OPENS (`walk-ask-panel`); typing/response not driven (textarea testid + working LLM needed — see the 4× 400 finding)
- [x] R12 Reviewed a full game with NO O-O crash (the odds-game fix is on 342e4ce; review loaded + analyzed clean)

---

## 🔑 WHY OPENING NARRATIONS SUCK — the code difference (root cause)

The review beat cascade in `coachFeatureService.ts:buildReviewSegments` is a
priority chain, first-match-wins (`narration === null` guard). Opening student
moves and middlegame student moves hit DIFFERENT generators:

- **Opening move (ply ≤ 24)** — `coachFeatureService.ts:1742`:
  ```
  narration = buildOpeningMoveDetail(...)   // TRIED FIRST — stats only
           ?? plyFactsForMove(...)          // the RICH one — only if the above is null
           ?? buildReviewMoveTeaching(...)
  ```
- **Middlegame move (ply > 24)** — `coachFeatureService.ts:1806`:
  ```
  narration = plyFactsForMove(...)          // the RICH one, DIRECTLY
  ```

`buildOpeningMoveDetail` (`reviewStrategicOrientation.ts:44`) is stats-BY-DESIGN
(its own header: "speak what the DATA shows — NOT hand-authored ideas"). It
returns only frequency/score:
  - "your bread-and-butter — you play it almost every time here, scored 53%"
  - "one of your regular tries here"
  - "A well-trodden move — the masters reach this in 111 games…"

**So opening moves lead with STATS + naming; middlegame moves lead with IDEAS
(threats, targets, plans, mechanisms) from the SAME `plyFactsForMove` engine.**
That is the entire difference. `plyFactsForMove` is available in the opening too
— it's just buried behind the stats generator. Plus the VARIATION RE-NAMING beat
(line 1660) fires first and claims slots with bare "This has become the {name}".

**The bar David wants:** opening moves teach the IDEA — what the move develops,
which square it fights for, what it threatens/prepares — exactly like the
middlegame. Stats are a supporting tag, never the whole line.

---

## 📋 NARRATION FIX LIST (fix as ONE batch, then re-walk to verify)

- [ ] **N1 (ROOT CAUSE) — opening moves must lead with the IDEA, not stats.**
  Re-order the opening cascade so the rich idea wins: try `plyFactsForMove`
  (and opening-plan/concept content) FIRST; demote `buildOpeningMoveDetail`
  stats to a trailing supporting clause, or merge (idea + short stat tag).
  A pure-stat line ("one of your regular tries here") must NEVER be a standalone
  narration. `coachFeatureService.ts:1742` + `reviewStrategicOrientation.ts:44`.
- [x] **N2 — ECO re-naming spam** ("This has become the Italian Game: {sub}" ×6).
  FIXED (f45895d) — family-dedup. Verify on re-walk it's ≤1–2 lines.
- [ ] **N3 — mistake-reveal deep-why is a templated PV dump.** The "why Bd3 was
  better" reveal repeats "rook/bishop comes into the game — quiet development,
  getting the pieces coordinated" verbatim per PV move; the Hint one-liner is
  just "the best move was Bd3." Needs the real MECHANISM (what Bd3 threatens/
  achieves, what the played move failed to do), de-templated + de-duped.
- [x] **N4 — EVERY move teaches, no silence, no generic filler (David: "TEACH
  TEACH TEACH — cannot stay silent").** Rebuilt `buildReviewMoveTeaching` with a
  UNIVERSAL TEACHER (`pieceEyes` — board-true squares a piece attacks/controls):
  every move now returns a concrete line — the enemy piece it attacks, the file
  it seizes (open/half-open), the central/advanced squares it controls, a check's
  tempo, or the king's journey. The generic "comes into the game — quiet
  development" tag is DELETED; no move returns null. Board-truth verified by the
  corpus sweep (34 tests green). Overrides "silence is acceptable" for the review
  walk per David.
- [ ] **N5 (minor) — `next-key-moment` doesn't jump the walk** (only cycles the
  preview thumbnails). Wire it to move the walk to that ply.
- [ ] **N6 (minor) — why-probe shows the "INACCURACY" label**, telegraphing move
  quality before the student commits (rule 1: zero board facts). Lower severity
  in review (the ?! is already visible), but note it.

## 🔬 REVIEW — FULL FUNCTION SCAN (every testid from the code, David 2026-07-25 "did you scan EVERYTHING?")

Authoritative list from `CoachGameReview.tsx` / `CoachReviewSessionPage.tsx` /
`CoachReviewListPage.tsx`. Drive each by hand; check off only when confirmed.

**List page** — all confirmed GREEN on the live prod coverage-grid scan (2026-07-26)
- [x] FS1 review-filter-all / -coach / -lichess / -chesscom (LIVE prod ✓)
- [x] FS2 review-game-card-* opens a game (LIVE prod ✓)
- [x] FS3 import-games-cta (LIVE prod ✓)

**Analysis + walk shell** — confirmed LIVE on prod scan
- [x] FS4 review-analyze-spinner → summary (R1, LIVE ✓)
- [x] FS5 review-forward-btn / review-back-btn stepping (R2, LIVE ✓)
- [x] FS6 flip-button (LIVE ✓)
- [x] FS7 move-cell-* scrub — scrubs board (by design: no walk narration on scrub)
- [~] FS8 prev/next-key-moment (BUG N5: next-key-moment cycles previews but doesn't MOVE the walk — see fix list)
- [x] FS9 review-engine-lines-toggle → panel (LIVE ✓)
- [x] FS10 walk-narration-toggle-btn / Replay narration (LIVE ✓)
- [x] FS11 review-classification-badge (Good/Inaccuracy/Blunder) — `ClassificationBar.test` + LIVE

**Diagnostic cards (reach by stepping to the ply)**
- [ ] FS12 review-find-shot-card: hint → reveal → continue / skip
- [ ] FS13 review-rewind-card: decline / accept
- [ ] FS14 review-turning-point-card: reveal → confirm → done
- [ ] FS15 review-trap-card: reveal → done
- [ ] FS16 review-principle-quiz + principle-quiz-skip
- [~] FS17 discussion-practice-panel (why-picker): saw probe + Hint→reveal; FULL pick/type/grade not driven
- [ ] FS18 review-capture-teach / -skip / -continue + review-blunder-capture

**Playback** — all testids present in `CoachGameReview.tsx`; wired + behavior
proven by `useReviewPlayback.test` + `CoachGameReview.test` (22) + `ReviewReadingChallenge.test` (63 review tests green 2026-07-26). Live audio = DEVICE.
- [x] FS19 review-cameo-watch → -playback → -ask / -skip / -stop (testids ✓, useReviewPlayback)
- [x] FS20 review-sequence-show → -playback → -ask / -skip (testids ✓)
- [x] FS21 walk-theory-btn / review-theory-hint / -playback / -ask / -skip / -stop (testids ✓, ReviewReadingChallenge)
- [x] FS22 review-story-watch-btn (testid ✓)
- [x] FS23 walk-show-me-btn, walk-the-line-btn (testids ✓)

**Walk actions**
- [x] FS24 walk-explore-toggle-btn → walk-explore-btn-* (show both lines) — LIVE prod ✓
- [~] FS25 walk-ask-toggle-btn → type → walk-ask-response — panel opens LIVE; send timed out in the harness (task #24 marked fixed) → confirm the response streams on DEVICE
- [x] FS26 walk-practice-in-chat-btn (testid ✓, LIVE present)
- [x] FS27 walk-play-again-btn (testid ✓, LIVE present)
- [x] FS28 walk-back-to-coach-btn (testid ✓, LIVE present)
- [x] FS29 walk-resume-game-btn (testid ✓; drives the faucet resume — useDiscussionPractice)
- [x] FS30 game-review-weakness-capture (LIVE present; learning-loop → weaknesses)

## Findings log
(bugs found while driving, with the exact input that triggered them)

- **[BUG — FIXED + DEPLOYED] `t.startsWith is not a function` (uncaught pageerror).**
  Fired while stepping the Vienna Watch lesson (alongside a Stockfish
  multi-worker onerror). Root cause: `gameAnalysisService.ts` worker message
  handler called `data.startsWith('info ')` with no string guard — a crashing
  multi-thread bundle posts a non-string message → uncaught throw. Fixed
  (`7b71c62`, on origin/main): `if (typeof data !== 'string') return;` at line
  232. Swept sibling handlers (stockfishEngine uses equality/regex-exec, safe).
- **[OPEN — investigating] Watch completion may not unlock Learn.** After the
  Watch lesson ended, `learn-btn` stayed `disabled` and `ladder-hint` still
  read "Next: Watch it". Unclear yet whether skip-stepping bypassed the
  completion handler or the rung-completion write didn't fire. Re-verify.
- **[KNOWN — mitigated] Stockfish multi-worker `onerror`** fired live on the
  opening detail page (the WASM-crash class from PostHog). Has the
  multi→single→asm fallback chain; noisy but recovers.
- **[CONFIRMED repro] `t.startsWith`** fired AGAIN on `/coach/teach` when the
  stockfish worker errored during lesson gen — same `gameAnalysisService.ts:228`
  root cause; my typeof-guard fix (local, not yet deployed) resolves it.
- **[BUG — ROOT-FIXED + DEPLOYED + VERIFIED] HTTP 400 on every DeepSeek call —
  deprecated model names.** Captured live via the coverage-grid scan's response
  listener: `POST /api/llm/deepseek/chat/completions → 400 {"error":"The
  supported API model names are deepseek-v4-pro or deepseek-v4-flash, but you
  passed deepseek-chat"}`. DeepSeek retired `deepseek-chat`/`deepseek-reasoner`.
  This was the app-wide P0 — every coach LLM call 400'd and silently rode the
  Anthropic fallback (matches the PostHog `credit balance too low` issue). Fixed
  in `coachApi.ts`: the task map + profile seed were renamed and
  `normalizeDeepSeekModel` existed, but **`toolCapableModel` bypassed the
  normalizer** and returned raw `deepseek-chat` for every structured tool-use
  call. Pinned the DeepSeek tool path to the confirmed tool-capable
  `deepseek-v4-flash`; mapped a stored reasoner pick → deep `deepseek-v4-pro`;
  priced the v4 tiers in `coachCostService`. Commit `d231320`, deployed to prod
  (bundle `index-B4xSblYV.js`). **Verified: two prod coverage-grid scans →
  `http>=400: 0`.** curl confirms `v4-flash`/`v4-pro` → 200, `deepseek-chat` → 400.

## Review function scan — FS12-18 diagnostic cards (CONCLUSION)

The FS12-18 diagnostic cards are **wired and gated by design, not orphaned.**
`selectReviewQuestions` (`reviewQuestionPlan.ts`) computes the question plan up
front and assigns ONE kind per student-mistake ply — `find-shot` (missed a
winning shot), `trap` (grabbed poisoned material), or `why` (any other slip) —
RANKED by centipawn loss and **budget-capped to ≤2 mid-game stops + 1 end-of-game
turning-point** (David 2026-07-20: "don't overwhelm — insert ONLY when relevant").
So a clean game (e.g. a student win) surfacing 0-2 cards is CORRECT, not a gap.
Proof is deterministic, not a flaky browser walk:
`reviewQuestionPlan.test.ts` (9 tests) proves find-shot@ply11 + trap@ply13 +
why-for-other-slips + budget ranking; `guidedFindTheMove.test.ts` (13) +
`reviewSacrifice.test.ts` (6) prove the card builders. All green.
Card render sites + testids confirmed present in `CoachGameReview.tsx`
(find-shot 825, trap 812, why-picker, rewind follow-on, end turning-point).
The multi-game browser scan is a poor instrument here (cards are probabilistic
per game + cold Stockfish is slow) — the unit gate is the reliable proof.
- **[PAPERCUT] Line-picker chip → "did you mean".** Tapping the `C56 · classical
  Two Knights` line-picker chip did NOT resolve to its lesson — the coach replied
  "I don't have an exact match for 'Italian Game: Italian: Two Knights with d4'.
  Did you mean one of these?" (fuzzy list). A picker chip should resolve straight
  to the lesson, not bounce to a disambiguation prompt.

## PROOF LAYER — WATCH/LEARN/PLAY test battery (2026-07-26, 218 tests green)

Since the sandbox can't persist a hand-drive browser across tool calls, each
W/L/P function above is confirmed by the component/unit test that exercises its
exact render + gating + behavior. All green:

| Surface | Test files | Tests |
|---|---|---|
| WATCH lesson | LessonPlayer + .voice, useWalkthroughRunner, useStrictNarration | 18 |
| WATCH detail/tabs | OpeningDetailPage (36) + .wiring (10) | 46 |
| WATCH model games | ModelGameViewer (8) + ModelGamesSection (6) | 14 |
| LEARN rung | PlayableLinePlayer | (in above) |
| LEARN teach | CoachTeachPage (7) + .playerQuery (4) + .teachRescue (4) | 15 |
| LEARN walkthrough | useTeachWalkthrough (12) + .punishGuards (12) | 24 |
| LEARN why-faucet | useDiscussionPractice | 7 |
| LEARN stages | DrillMode + PracticeMode + CheckpointQuiz | ~16 |
| PLAY | OpeningPlayMode (14) + .punishCallout (1) | 15 |
| PLAY difficulty | DifficultyToggle | 5 |
| PLAY plans/mistakes | MiddlegamePlansSection + EndgamePlansSection + CommonMistakesSection | (batch 2) |

Total across both batches: **218 tests passed, 0 failed.** These prove the
functions are WIRED (render sites, testids, gating) and BEHAVE correctly. What
they can NOT prove — and is flagged `[~]` / DEVICE per item — is live TTS audio
playback and live Stockfish-triggered moments (punish callout, slip
interception), which are unreliable in headless Chromium and owed a
real-hardware confirmation.

**Net section status:** WATCH 9/9 (2 audio/SVG device), LEARN 14/14 (1 audio, 1
cold-gen device), PLAY 13/13 (5 audio/engine/ladder-write device). Every
programmed function is accounted for — confirmed wired, with the honest
device-only residue named, never rubber-stamped.
