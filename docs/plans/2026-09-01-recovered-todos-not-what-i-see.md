# Recovered TODOs — "Not what i see" session (2026-08-30)

**Recovered 2026-09-01 from David's screenshots.** The original session logged
these to local `MEMORY.md` + note files (`game-analysis-stuck.md`,
`sacrifice-soundness.md`, `mistake-puzzle-best-moves.md`, `puzzle-play-out.md`,
`hint-wrong-piece.md`) that were **never committed** — they died with the
offline container. This file is the durable recapture. Nothing here was touched
in code yet; all "noted only, not fixed" per David's call (he was mobile, no
data / no concrete repro to hand).

David's framing: *"Don't fix now, not enough data, but take note."* These go
quick once he's back on wifi with a concrete example (a bad puzzle, the h7
position).

---

## The five captured notes

### 1. Game analysis stuck / not working
- Symptom: app **couldn't tell whether a bishop sac on h7 was sound or not** —
  game analyze not working.
- Diagnosis logged: analysis stalls (e.g. `1/629`). **Stop works but the loop
  doesn't advance** — likely a **mobile Stockfish stall / missing per-game
  timeout in `gameAnalysisService`.**
- Fix direction: add a per-game timeout so a stalled engine read doesn't wedge
  the whole batch; advance/skip on timeout.

### 2. Coach can't judge sacrifice soundness
- "Is Bxh7 sound?" → the coach can't answer.
- Diagnosis: that's an engine **move-consequence** question. The new
  board-question router built the **chess.js aspects but the engine aspect is
  still `computer: null`.** Clear next-phase build: wire the engine leg so
  move-consequence / "is X sound?" gets a grounded eval answer (G0-safe — the
  engine computes, `voiceFacts` phrases).

### 3. Mistake-puzzle best moves
- Best moves on mistake puzzles look off.
- Check the **`bestMoveEqualsPlayed` / PV derivation**, and whether the
  **2026-08-28 cpLoss / book-move changes skewed it** (book-exemption + mate
  cpLoss clamp landed around then — commits `c93b1af`, `6a9690c`).

### 4. Puzzle play-out ("keep playing")
- Feature ask: optional **"keep playing"** on a solved puzzle — the **computer
  plays the opponent's replies from the puzzle's end position** so the user can
  play it out. **Reuse the coach / opening play loop.**

### 5. Hint names the wrong piece
- Concrete hint bug: hint said **"think about what your knight can do" but the
  solution was a pawn move.**
- Fix: **ground the hint's piece to the actual solution move.** Likely rides on
  the **same root as the mistake-puzzle best-move bug (#3)** — both derive from
  the puzzle's solution/PV.

---

## The big one — the "suggest coach" / self-assessment loop (David, verbatim intent)

> "I want a suggest coach when users ask *what am I weak at, what should I work
> on, help me get better* — these sort of questions. Any non-specific
> help/assess-me questions."

The flow David described:
1. Coach asks the user to **play out a common position** and find the best
   moves for each side. Start easy→moderately difficult but doable — **maybe a
   ~1000-rated puzzle.**
2. **Analyze the moves the user plays WITHOUT telling them they're wrong.**
3. Computer **recaps what the best moves were and why**, then tries to explain
   **why the user made those decisions**: *"most people move here because they
   see this… is that what you saw?"*
4. **Even if they don't answer**, gather the mistakes → **build a portfolio of
   the user's mistakes.**

David's key insight (the root cause):
> "**Good god we already do this. But the coach is not using it.** Nothing is
> computing the meta data of the weaknesses tab and actually feeding an answer /
> outcome to the coach of what the user is actually bad at!! That is why the
> coach cannot answer that question!!"

**So the build is not "gather weaknesses" (that exists) — it's WIRE the
weaknesses-tab meta-data INTO the coach** so a non-specific "what am I weak at /
what should I work on" question gets a grounded answer computed from the user's
own mistake portfolio, then offers the play-a-position self-assessment loop.

---

## How this maps to `PLAN.md` (already in flight on this branch)

Heavy overlap — `PLAN.md` (2026-08-27) is the same theme (beginner Q&A + train-
toward-a-goal). Cross-links:
- Note #2 (sacrifice soundness / `computer: null`) → **PLAN.md is missing an
  engine-consequence assembler.** New phase.
- The "suggest coach / what am I weak at" ask → **PLAN.md P4/P7** (recommend-a-
  game + `trainingFocus`) is the skeleton, but David's ask adds: feed the
  **weaknesses-tab meta-data** into the answer, and the **play-a-common-position
  self-assessment loop** with the "is that what you saw?" reason capture.
- Notes #1, #3, #4, #5 are **NOT in PLAN.md** — separate bugs/features:
  - #1 `gameAnalysisService` per-game timeout (blocks everything — analysis is
    the source of the mistake portfolio).
  - #3/#5 shared root: puzzle solution/PV derivation (best-move + hint piece).
  - #4 puzzle play-out (reuse play loop).

## Suggested next-session order (once David has data / a concrete repro)
1. **#1 game-analysis timeout first** — it's the data source for everything
   else; a stalled analyze starves the mistake portfolio.
2. **#3 + #5 together** (shared PV/solution root) — with a specific bad puzzle.
3. **#2 engine-consequence assembler** ("is Bxh7 sound?") — wire the engine leg
   the board-question router left `null`; needs the h7 position to verify.
4. **Weakness-meta → coach wiring** + the self-assessment play loop (the big
   ask) — builds on PLAN.md P4/P7.
5. **#4 puzzle play-out** — smallest, independent, reuse the coach play loop.
