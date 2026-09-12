# /coach/teach — how it SHOULD work (behavior spec, 2026-09-12)

The intended-behavior map for the Learn-with-Coach surface, built from
`src/components/Coach/CoachTeachPage.tsx` (handleSubmit), `useTeachWalkthrough.ts`
(runtime), `coachApi.ts` (brain lanes), and the locked CLAUDE.md contracts. This
is the **"should."** The coach-break audit drives the **"does"**; §Diff at the
bottom reconciles them.

Two engines: (A) `handleSubmit` — a deterministic pre-flight pipeline that
BYPASSES the brain for anything it can resolve in code, falling through to tier
generation, then the brain Q&A; (B) `useTeachWalkthrough` — the lesson runtime
once a walkthrough is running.

---

## A. handleSubmit pipeline — ORDER IS THE CONTRACT (first match wins)

Each row: input shape → what SHOULD happen. Order matters — a later branch must
never steal an earlier one's input.

1. **newest-move-wins** — a board move made mid-turn overrides a stale closure FEN.
2. **retry detector** — "no / try again / not that" after a coach move → retract + re-answer, don't treat as new opening.
3. **followup detector** — "why / what about that" → answer about the SAME position, don't reset.
4. **walkthrough control (active)** — start/stop/pause/resume/skip/next while a walkthrough runs → drive the runtime, BYPASS brain.
5. **walkthrough control (idle)** — the same control words with nothing running → graceful no-op message (G7 out-of-order), never a bogus opening.
6. **typed move report** — "I played e4. your move." → step-by-step branch; coach replies with arrows (G6).
7. **dictated coach move** — "play e5" → apply on board, BYPASS brain, arrow it.
8. **/clearcache** — dev command → clear caches.
9. **setting-as-action** — "turn off voice / set narration to brief" → apply the setting, confirm.
10. **player-game request** — "show me how Hikaru beat X" → lookup player games, BYPASS opening resolution.
11. **custom lesson (P5)** — weakness-driven custom lesson → start it.
12. **training-aid drill** — "drill calculation / fork puzzle" → real training surface, never fuzzy-matched as an opening.
13. **navigation intent** — "take me to / manage my repertoire" → matchNavigationRoute → navigate (the 2026-09-12 fix; verb+topic gated).
14. **middlegame-plan intent** — "middlegame plans in the Pirc" → /coach/session/middlegame, not a fuzzy opening name.
15. **matchup** ("X vs Y") — voiced matchup first, else constructed matchup walkthrough.
16. **opening-name resolution** → the tiered generator (below). Guarded by: not-a-question, not-conversational-reply, not-walkthrough-control, not-navigation, resolves to a real opening.
    - **Tier 1** static curated lesson (getLessonScript) → LessonPlayer.
    - **Tier 1.5** line-picker (a family name → variation tabs).
    - **Tier 2** cached generated tree.
    - **Tier 2.5** shared/base tree.
    - **Tier 3** DB-narration generation (generateOpeningFromDbNarration).
    - Fuzzy: autoAccept a confident hit; ambiguous → "did you mean" picker; no-match → fall through to brain.
17. **play intent** — "play the Vienna against me" → in-page OpeningPlayMode locked to the line, never generic /coach/play.
18. **teach rescue / surfaceRouting** — last-resort routing before the brain.
19. **pre-flight reject → brain Q&A** — anything not resolved above → getCoachChatResponse (the 54 lanes below).

**Cross-cutting contracts (every path):**
- **G0/G3** — coach voices facts computed in code; invents zero chess content.
- **G6** — step-by-step replies carry arrows on every SAN.
- **Voice** — one perspective (you/your student, they/their opponent, never we/our); brief/full/silent verbosity honored (G5); TTS streaming (G4).
- **Auto-pause** — a question mid-walkthrough pauses voice+advance; confirm before resume.
- **No wrong-opening** — a non-opening imperative/question must never fuzzy-match into a lesson (the disease class fixed 2026-09-12).

---

## B. Brain Q&A — the 54 lanes (coachApi `grounding.*Question`)

Every lane answers from COMPUTED facts (G0), voiced through `voiceFacts`. Grouped:

- **Board / position (live):** bestMove, whyBestMove, alternatives, candidateMove, positionAssessment, groundedBoard, phase, plan, attack, hint, lastMove, opponentMove, nameOpening, masterPlay, tactics, converting, endgame, color, theory.
- **Self-knowledge / profile (needs games):** strengths, weaknessBriefing, skillRadar, stats, statsProfile, mistakes, gameMistake, lastGameMistake, lastGame, moveRating, misconceptions, progress, trend, records, puzzleStats, tacticsProfile, openingProfile, openingAccuracy, accuracy, consistency, timeTrouble, errorsBySituation, transferGap, endgameWeakness, reviewDue, repertoireGap, counterRepertoire.
- **Opening / content:** openingTraps, famousGame, playerGames, fundamentalLesson, fundamentals.
- **Meta / app:** appHelp, teachingMethod, settings.

**Lane contracts:**
- Profile lanes with no uploaded games → an HONEST decline ("upload games and I'll…"), never a fabrication.
- appHelp → matchRouteByTopic → names the real surface (verified working).
- Routing: a question must reach ITS lane, not get captured as an opening name (the concept-lane-swallow disease, fixed via token-gated fall-through).
- Degrades under a dead LLM (DEGRADE=llm): still answers in the raw computed register (G0 inversion proof).

---

## C. Walkthrough runtime — 15 phases (`useTeachWalkthrough`)

`idle → narrating → (paused) → fork → leaf → stage-menu`, plus the stage phases
`drill / findMove / quiz / punish`, the weapon phases `gem-picker / gem-playing /
trap-prompt / trap-playing`, and `choose-mode`.

**Phase contracts:**
- **narrating** — auto-play + voice; advance gated ONLY on the voice promise (no racing timers).
- **paused** — chat question pauses here; resume continues from the same node.
- **fork** — branch tiles each extend to a middlegame; a "deep dive" tile STARTS A LESSON (never routes to chat / never "did you mean").
- **leaf** — end of a line → stage-menu polls for generated stages; "continue learning" / "play this line" surface.
- **drill / findMove** — student plays on the board; runtime needs the SAN back (Board/ChessBoard).
- **quiz** — answered by CLICKING a choice.
- **gem/trap** — WLPP play locked to the exact line.
- Rung completion (incl. opponent's auto-played final move) → markRungComplete → unlock next.

---

## D. Diff — should vs does (filled by the coach-break audit)

The break audit (`audit-coach-teach-functional.mjs` + `audit-coach-teach-loop.mjs`)
drives every branch above with real + adversarial input and records the observed
behavior. A divergence is a **real bug** only after ruling out load/harness
artifacts (per CLAUDE.md §adversarial). Findings land here:

**Functional coverage grid (prod, 2026-09-12): 26/38 reached, 0 console/page errors.**

REAL BUG — FOUND + FIXED (1 root, 6 cascaded fails):
- **Static-routed walkthroughs never generated their optional stages.** The
  Tier-1 static surface-route (tapping the "Sicilian Defense" picker tile →
  Alapin walkthrough) started the walkthrough but — unlike Tiers 2/2.5/3 —
  never called `cacheOpening` NOR `generateMissingStagesInBackground`. So at the
  leaf `hasStages` stayed false and "Continue learning" NEVER surfaced, and the
  leaf/stage-menu 3s poll (`mergeStagesFromCache`) cache-missed forever on a tree
  that was never written to `cachedOpenings`. A `drill <static opening>` jump
  parked on the same missing stage.
- **Proof (timed prod probe, 2026-09-12):** "Sicilian Defense" tile → Alapin
  walkthrough → leaf at ~50s; continue-learning NEVER enabled within 150s; ZERO
  stage-gen events (`generateMissingStagesInBackground` never invoked — no
  "kicking off" log); `getCachedOpening` cache-missed 9× (51/58/64/70/76s).
  So it was NOT >60s cold-gen — it was a genuine stall: stages were never
  requested and had no cache row to land in.
- **Fix (CoachTeachPage.tsx, Tier-1 static branch):** `await cacheOpening(...)`
  the static tree (stamps `tree.cacheKey` in place so merges + the poll find its
  row), then fire `generateMissingStagesInBackground(...)`, matching the other
  three tiers. Tour mode still skips the optional stages. Typecheck clean.
- **VERIFIED on prod (commit 90cdfcb, 2026-09-12):** same "Sicilian Defense"
  tile → Alapin leaf; background gen "kicking off 4 stages" at 15.9s → all 4
  merged at 40s (concepts 5, findMove 2, drill 2, punish 5) → continue-learning
  ENABLED at 52.2s → click opened the stage menu. Before/after: NEVER→52s,
  0→5 stage-gen events, 9×cache-miss→0.

STALE/WRONG audit expectations (app behavior is correct, per locked rules):
- `stage-play→/coach/play` — WLPP Play mounts in-page OpeningPlayMode; it MUST NOT
  nav to /coach/play. Audit asserts the superseded behavior.
- `fork-auto-advance` — a fork is a CHOICE point; not auto-advancing is correct.

HARNESS (didn't drive the branch):
- tile-routing / lesson-starts-from-click — tapped a FAMILY tile → fork panel (correct);
  audit didn't pick a variation. wt-fork-pick passed later, so forks work.

NEEDS A LOOK:
- line-picker-surfaces / line-picker-variation-click (Tier 1.5 — may be the same panel as fork)
- face-mode-toggle (is Face mode still exposed?)

CORE VERIFIED ✅: play→named-opening, walkthrough start/narrate/skip/fork/leaf,
controls (new/stop/resume/auto-pause), bare-name, both fuzzy paths, brain Q&A,
player-game, middlegame-plan, /clearcache, board-move.

**Adversarial break-loop (prod, 2026-09-12) — pass 1, 40 messy/hostile inputs:**
- ZERO real product breaks (no pageerror, no React same-key/`Maximum update
  depth` warning — the correctness classes).
- 3 breaks, ALL the harness/load artifact class CLAUDE.md §adversarial names:
  `stuck-input` (a brain call queued >90s under rapid fire), `send-failed` +
  `chaos-pickbeforeload` (the loop's CHAOS injectors use raw `fill`+`chat-send-btn`
  with 4s timeouts and no wait-for-input-reenable, so they time out / hang on a
  busy input). The loop's MAIN `ask()` is sound (pressSequentially + 90s recovery
  wait); only the chaos injectors are rotted.
- AUDIT-MAINTENANCE (not a product bug): rebuild the chaos injectors to pace
  themselves + wait for input recovery like `ask()` does, so the loop can run the
  3-consecutive-clean-pass contract without manufacturing false breaks/hangs.
