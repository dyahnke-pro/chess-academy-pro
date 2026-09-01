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

## Decisions log
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
