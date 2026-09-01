# PLAN — Coach answers a beginner + trains toward a goal (2026-08-27)

> **Related:** more TODOs recovered from the "Not what i see" session (game-
> analysis stall, sacrifice-soundness `computer:null`, mistake-puzzle best
> moves, hint-wrong-piece, puzzle play-out, the weakness-meta→coach "what am I
> weak at" loop) live in
> `docs/plans/2026-09-01-recovered-todos-not-what-i-see.md`.

Owner: David. Triggered by real native-iOS user `466e36fc` (Rivertoe85, ~900,
paying trial, daily-active). PostHog showed his coach experience is broken in
two ways: (1) the coach can't answer his plain-English questions, and (2) there
is no "let's play a game to fix your middlegame → I'll remember that's the goal
→ here's your middlegame feedback" loop.

## Verified findings (from PostHog + live prod audit)

- `audit-coach-beginner-questions-prod.mjs` (run against live main 2026-08-27):
  5 of 6 beginner question shapes fail —
  - "Why did they move their queen?" → generic best-move readout (ignores Q)
  - "Do you understand me?" → best-move readout (conversational MISROUTED)
  - "What does Bxe7 mean?" → glossary for *fork* (wrong; never explains notation)
  - "Was my knight to d5 good?" → help menu (not move-quality)
  - "Doesn't that mess up the structure?" → canned "I can't verify that precisely"
  - "How do I improve my middlegame?" → ✔ real weakness-profile answer
- Root cause: coach only has grounded assemblers for a fixed set (best-move /
  plan / hanging / tactics / openings / weakness-profile). Everything else falls
  to `serveGroundedPositionDefault` (ignores the question) or
  `STOCK_GROUNDING_FALLBACK`. **G0 is NOT the blocker** — the failing shapes are
  all answerable from computed data; the assemblers just don't exist / misroute.
- Memory build (curriculum arc, `coachCurriculumService`, Dexie v34) IS on main,
  but it sequences WEAKNESS TAGS from analyzed games and advances on drills. It
  has NO per-game "focus goal" and is empty for a 0-analyzed-games user. The
  right pattern to mirror is `coachMemoryStore.intendedOpening` (a persistent
  cross-session commitment stored in the `meta` JSON blob — additive, no Dexie
  bump).

## The two jobs

### A. Beginner Q&A assemblers (fix the deflection) — G0-safe, computed
1. **Conversational routing** — a non-chess/meta question ("do you understand
   me", "you there") must reach the conversational lane, never the best-move
   default. Bug in the chess-signal gate / assembler precedence.
2. **Notation help** — "what does `Bxe7` mean?" → parse the SAN with chess.js
   against the live FEN → "the bishop takes the pawn on e7." Deterministic.
3. **Move-quality** — "was my knight to d5 good?" → move classification (eval
   delta + label; the machinery exists in the review path). Route to it.
4. **Opponent-move why** — "why did they move their queen there?" → explain the
   opponent's LAST move from the board (`describeMoveInfluence` /
   `detectNewThreat` / threat computers). Computed.

### B. Train-toward-a-goal loop (the "memory build" David wants)
5. **`trainingFocus` memory** — new field on `coachMemoryStore` mirroring
   `intendedOpening`: `{ area, reason, setAt, capturedFromSurface, gameId? }`,
   `area ∈ {opening, middlegame, endgame, tactics, calculation, king-safety,
   time-management}`. Actions `setTrainingFocus` / `clearTrainingFocus`.
   Additive to the `coachMemory.v1` JSON blob — no schema migration.
6. **Recommend-a-game intent** — "how do I improve my `<area>`?" → the coach
   recommends playing a focused game AND sets `trainingFocus(area)`; returns a
   `play_focused_game` action offer carrying the area. Generalize to every area,
   not just middlegame.
7. **Play honors the focus** — `/coach/play` reads `trainingFocus`, records the
   game's goal on the game, and (optionally) biases phase narration toward that
   phase.
8. **Phase-scoped feedback** — post-game review, when a `trainingFocus` is set,
   LEADS with feedback scoped to that phase/area (the phase's plans + the
   mistakes classified into that phase via `classifyPhase`). Clears the focus
   (or advances it) when addressed.

## Phasing (each phase = one small push to `main`, tests + audit)

- [x] **P1 — `trainingFocus` memory** (`coachMemoryStore` + test). FOUNDATION. (f70804f)
- [x] **P2 — Notation-help assembler** (A2) — "what does Bxe7 mean?" → plain
      English (`notationQuestionSan` + `explainSanNotation`, chess.js names the
      captured piece), wired into both coachApi fall-throughs. 8 tests.
- [ ] **P3 — Conversational routing fix** (A1).
- [x] **P4 — Recommend-a-game intent + set focus** (B6) — the core of David's ask.
      "improve my `<area>`" → recommend a focused game, set `trainingFocus`,
      offer a `play_focused_game` chip → `/coach/play?focus=<area>`. Pure
      detection + recommendation in `groundedAnswer` (12 tests); wired in the
      progress handler; chip in `ChatMessage`. STILL OWED: P7 (play tags the
      game via `setTrainingFocusGame` + review scopes feedback to the focus).
- [ ] **P5 — Move-quality assembler** (A3).
- [ ] **P6 — Opponent-move why assembler** (A4).
- [ ] **P7 — Phase-scoped post-game feedback from `trainingFocus`** (B7/B8).
- [ ] Extend `audit-coach-beginner-questions-prod.mjs` assertions as each lands;
      run the 3-instrument prod audit after each deploy (G1).

## Recovered-session TODOs — ALL must be done (David 2026-09-01, "do #6 FIRST")
Recovered from the "Not what i see" session (full detail:
`docs/plans/2026-09-01-recovered-todos-not-what-i-see.md`). David 2026-09-01:
*"All of those need to be done as well… I want 6 to be done first."*

- [x] **R6 — coach answers ALL user-error questions (David 2026-09-01; play-out
      loop DROPPED).** Shipped + 3-instrument prod-verified
      (`audit-coach-weakness-selfassessment-prod.mjs`, 5/5). Three classes now
      answered from computed data (G0), no deflection:
      - **Aggregate self-assessment** ("what am I weak at / assess me / what
        should I work on") → answers from the weaknesses-tab meta-data
        (`getMistakeInsights` via `assembleMistakesAnswer`) when the ranked
        misconception profile is empty; `isProgressQuestion` widened for bare
        "assess me / size me up / where do I stand".
      - **Last-game error** ("what did I do wrong in my last game / what was my
        critical error") → new `isLastGameMistakeQuestion` +
        `getLastGameErrors` + `assembleLastGameMistakeAnswer` names the worst
        move, the better move, the drop, and the game context. Fires even on a
        board surface for an explicit "my last game"; when the game isn't
        analyzed it says so (the R1 hook).
      - **Per-move quality** ("was my knight to d5 good / a mistake") — broadened
        `isMoveRatingQuestion` to the beginner plain-English/named-move phrasing
        → existing `assembleMoveRatingAnswer` (rates the LAST played move).
      Play-out self-assessment loop dropped: once games analyze (R1) + the coach
      answers these, it's moot (David's call).
      REMAINING nuance (not blocking): plain-English move-rating rates the LAST
      move only — naming an EARLIER move isn't located in history yet (a deeper
      P5 build if David wants it).
- [x] **R1 — game-analysis stall (David 2026-09-01, the second fix).** Root
      cause: when iOS kills a pool worker (memory pressure) it stops answering,
      so EVERY position then waits the full ~9s reject — a 40-move game becomes
      ~6 min of dead waits and the next game reuses the same dead worker ("stuck
      at 1/629"). Fix: `analyzeGameOnWorker` bails with `WorkerWedgedError` after
      3 CONSECUTIVE position timeouts (a live engine never does); the batch loop
      destroys + respawns that worker, leaves the game for the next sweep, and
      advances. Tests: `gameAnalysisService.wedge.test.ts` (4). ON-DEVICE caveat:
      real iOS worker-death recycling is device-only — confirm on David's phone
      (headless/jsdom can't reproduce iOS worker death).
- [x] **R2 — "is a bishop sac on h7 sound?" (David 2026-09-01).** The engine leg
      was ALREADY wired (`buildCandidateEval` plays the move + evals the after-
      position via Stockfish → `assembleCandidateMoveAnswer`) and works for SAN
      ("is Bxh7 sound"). The real gap was David's plain-English phrasing: "bishop
      sac on h7" parsed to just the square. Fixed `extractCandidateSan`'s spoken-
      move regex to accept sac/capture/takes/on verbs, and added a sac-phrasing
      pattern to the candidate intent (chess.js resolves the capture from
      piece+square without the 'x'). Needs a live board FEN (correct — you ask
      this looking at a position). Tests in questionIntents.test.ts.
- [x] **R3 + R5 — mistake-puzzle best move + wrong-piece hint (David 2026-09-01).**
      Shared root: the drill validates the student's move against `moves[0]` (the
      PV) while the shown best move + the hint's PIECE come from `bestMoveSan`
      (the `bestmove` UCI). When Stockfish's committed bestmove and the captured
      PV's first move diverged, the hint named the wrong piece ("think about your
      knight" on a pawn solution). Fix: guard in BOTH generation paths in
      `mistakePuzzleService` — if `pvMoves[0] !== bestMove`, rebuild the line from
      bestmove, so solution, shown best move, and hint piece all agree. Tests in
      mistakePuzzleService.test.ts (invariant + forced-divergence).
- [x] **R4 — puzzle play-out ("keep playing", David 2026-09-01).** After a
      mistake puzzle is solved, a "Keep playing this position →" button
      (`MistakePuzzleBoard` new `freeplay` state) lets the student play it out;
      the computer answers each move via the coach play loop (`getCoachMove` /
      `resolveConfig`, rating-matched). Game-over + thinking states shown.
- [x] **Associated drills (David 2026-09-01).** The coach's last-game-error
      answer now offers a drill chip SCOPED to that game (`weakness_drill` id
      `game:<id>` → `/coach/teach?drill=mistakes&game=<id>`);
      `buildMistakeDrillQueue({ gameId })` drills that game's mistakes now,
      regardless of SRS due date.
- [x] **"last game +n" (David 2026-09-01).** `getLastGameErrors(offset)` +
      `getRecentGamesErrors(n)` + intent/lane parsing: "2 games ago", "the game
      before last", "my last 3 games", "recent games" all answered
      (`assembleLastGameMistakeAnswer` phrases the offset;
      `assembleRecentGamesMistakeAnswer` totals the span + names the worst slip).

## Decisions log
- 2026-09-01 (David): ALL recovered TODOs (R1–R6) are in scope. **R6 first.**
  Land everything on `main`.
- 2026-08-27 (David): fix all four assemblers + build the recommend-game→
  remember-goal→phase-feedback loop, generalized to all areas. G0 stays intact —
  every answer computed in code, phrased via `voiceFacts`.

## Sequencing logic
Memory first (P1) — everything in B hangs off it. Then the two safest, highest-
value assemblers (notation, routing) that immediately help the beginner. Then
the recommend-game intent (P4), which needs P1. Move-quality / opponent-why /
phase-feedback follow. Each independently shippable and reversible on `main`.

## Next-session pickup
Start at the first unchecked box. Every new assembler routes through `voiceFacts`
(never a free-LLM chess answer); every computed fact comes from chess.js / the
engine / the review facet computers. Run `npm run ship-check` then the prod
audit. Hot file: `src/services/coachApi.ts` (multiple sessions) — rebase before
each push.
