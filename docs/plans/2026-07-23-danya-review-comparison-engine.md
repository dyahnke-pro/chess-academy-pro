# The Danya Review — engine-grounded, mirror his teaching (2026-07-23)

David + Claude design session. Goal: make the **post-game review** narration
mirror Naroditsky's review — same teaching structures, same Socratic style —
while every fact is **computed and proven**, never invented. The LLM voices;
the engine and the board decide (G0/G3).

This is the durable spec. Read it before touching review narration.

## The core doctrine — PROVE IT OR SHOW IT, NEVER FAKE IT

Every "why" the coach speaks is either:
- **Proven** by the engine (a measured number — eval, ablation, material), or
- **Shown** by playing the line out on the board (chess.js-legal moves), or
- **Not spoken at all.** Empty > invented.

100% Stockfish + chess.js in the *reasoning*; the LLM is a pure mouthpiece at
the very end (voiceFacts). It never decides, verifies, or picks a reason. The
whole hallucination surface of "why is this move good" moves OUT of the LLM and
INTO the engine, where a why is a fact.

**Cost:** engine calls run on the USER'S device (client-side Stockfish) — $0 to
David. The feature does not add LLM/TTS calls; if anything it shrinks the LLM
prompt. The only trade is user device time — bound depth, run at critical
moments, cache.

## The anchor game (grounded reference for tuning)

Naroditsky "Win the Center, Win the Game" speedrun, video `YXz0xSbhY70`
(2023-04-18). Real game pulled from chess.com (not reconstructed):
**Dalibor6709 (W) vs FrankfurtAirport / Danya (B)** — B23 Closed Sicilian Grand
Prix Attack, chess.com game `74342999351`. 66 plies, all chess.js-validated.
`FrankfurtAirport` is Danya's speedrun account. Two registers in the video:
**PLAY** (his running commentary while playing) and **REVIEW** (post-game). We
mirror the REVIEW *style*; we may harvest IDEAS from both; the PLAY style is
held in reserve for `/coach/play` (Review and Play must NOT sound identical —
consistent with the locked two-register rule).

## The method of comparison — THE why-engine (built, landed)

Naroditsky: *"that's called the method of comparison — that's where you really
get to the bottom of why the engine recommends what it does."*

The "why" of a move is the **diff between it and the alternative**, and a diff
between two real boards is **computable**. `src/services/moveComparison.ts`
(`compareTwoMoves(fen, A, B, evaluate)`, landed PR #838):
- Play both out, evaluate each → which is better + the gap.
- **Prove the delta:** MATERIAL (magnitude reconciles) · **ABLATION** (remove
  the suspected feature — e.g. a passed pawn — re-evaluate; gap collapses →
  proven cause; gap holds → wrong hypothesis, refuse to name it).
- No provable single-feature delta → `delta = null` + return the engine's LINE
  so the caller SHOWS the why instead of inventing one.
- Proven end-to-end with real Stockfish (passer +4.15 → ablate → +1.38) and the
  honest null-with-line fallback on the anchor's `16.Nxe5` turning point.

Verification tests to widen a delta: **ablation** (remove feature, re-eval),
**magnitude reconciliation** (named delta must ~account for the gap size),
**play-it-out** (the advantage must cash into the named thing), **refutation**
(a tactical resource works in A, fails in B — demonstrate it).

## The shared engine primitive — THE CRITICALITY SCAN

One computation feeds turning-points, only-moves, AND question-moments:
**MultiPV variance** — ask Stockfish for the top N moves at a position; the gap
between the best move and the field measures how much the eval *hinges on a
choice*.
- Big gap → a real decision → question-worthy / critical.
- Flat → nothing hinges → quiet, no question, light commentary.
- **Extreme** gap → an **only-move**.
- A turning point = a critical moment where the user *went wrong*.

Threshold **scales with the student's rating** (reuse slipDetector bands) so we
flag *their* critical moments — many, but never spam.

## The review structure (mirror his skeleton)

`re-frame the opening → find the turning point → ask (then answer) → compare
(your move ‖ the better move / your game ‖ the master's) → name the concept
from the delta → takeaway`. Running underneath: **selective depth, not silence**
— he talks on ~every move, but modulates: light one-line idea by default, the
deep beat on critical moments. Never the mechanical attack-map readout; never
truly silent (the no-silent-moves rule holds — the fix was the *content* of the
light register, not its existence).

## Teaching structures → grounded computers

1. **Opening re-frame** — name the opening + state its plan the moment it's
   *defined* (curated `keyIdeas` from repertoire.json + masters-DB theory
   lecture). Fire ASAP, not at move 7. (Diagnosed: the uncapped path calls
   `buildOpeningDevelopmentPlan(fen, color, {})` with empty opts, so it never
   gets the opening's ideas — pass `{openingName, curatedIdeas}` and gate on a
   curated opening being named.)
2. **Rhetorical Q&A register** — pose a question the board is *actually* posing,
   let it hang, then answer it ourselves. NOT the mistake-bucketing "why did you
   play that?" picker (that stays for tagging user slips). Each question = a
   template keyed to a **computed trigger**; asked only when the trigger is true:
   - ≥2 hanging pieces → "two pieces are hanging — what's the move?"
   - big piece en prise / material swing → "how much are you getting for the
     queen?" (answer = SEE/material tally)
   - two viable captures → "which one?"
   - forcing + exposed king → "is there a forced win?"
   - near-0 but sharp → "can this be held?"
   - only-move (extreme gap) → "there's one move — can you find it?"
   Overlays BOTH the user's game AND reference games (ask on the master's board
   too; answer = the master's real move).
3. **Only-move ability** (two modes):
   - **Passive walk** — chain only-moves out on the board to their terminus
     (chess.js proves the terminus: threefold repetition / perpetual / mate /
     stalemate). "Every one of these is the only move — and it dead-ends in a
     draw, neither side can escape."
   - **Interactive "find it" challenge** — coach: *"there's one move — show me,
     play it on the board."* User plays it (board input already exists). Grade
     by **eval** (a true only-move means alternatives measurably lose):
     - **Correct** (within tolerance) → *"that's it — clean."* The coach **still
       explains WHY it was the only move** (the proven delta / concept, spoken)
       — but does **NOT replay the line**: they already saw it to find the move,
       so a board replay is redundant. Speak the why, move on.
     - **Wrong** (off the cliff) → **step the move back, play the right one, and
       play the line out ON THE BOARD *while* explaining the delta** (via
       `compareTwoMoves`, or by playing out the refutation of their move) — they
       didn't see it, so show them.
     Adaptive depth: the board animation is spent only where it teaches
     (speak-only on right, speak-and-show on wrong). This is the locked
     guided-find-the-move pattern, triggered on only-moves and powered by the
     comparison engine.
4. **Master-game references, un-rationed** — Danya references other games
   CONSTANTLY. We already have the masters DB, the game-export proxy (real full
   PGNs), curated model-games, and pro-game-references. Surface a REAL matching
   game wherever one reaches the same structure (opening / middlegame / the
   tactic), not once per review. Show the real snippet on the board; cite real
   players/event/year/result. **G3:** every referenced game is real + every move
   chess.js-validated + every citation from real metadata; no game reaches the
   structure → show nothing.
5. **Name the concept** — a portable label ONLY on a proven boolean ("queen
   disease" = trap detector proves giving the queen wins more than its value;
   "can't survive without this bishop" = code proves it's the sole defender of
   the king's colour-complex). No provable condition → no name.
6. **Takeaway** — the one thing to remember, derived from the turning point.

## Build queue (each a "show David, then next" checkpoint)

- [x] `compareTwoMoves` foundation (material + passed-pawn ablation + honest
      null-with-line). Landed PR #838. Not wired yet.
- [ ] **#1 Criticality scan** (MultiPV variance; rating-calibrated) — the shared
      engine under questions / turning-points / only-moves. Build next.
- [ ] **#2 Only-moves** — passive walk (terminus via chess.js) + interactive
      find-it challenge (grade by eval → step-back + compareTwoMoves delta).
- [ ] **#3 Master-game references, un-rationed** (real games, real citations).
- [ ] **#4 Rhetorical Q&A register** (trigger catalog → ask → answer, user +
      reference boards).
- [ ] **#5 Widen `compareTwoMoves` delta types** (tactic-resource by refutation,
      king-safety, structure) via the verification tests above.
- [ ] **#6 Opening re-frame timing fix** (fire the opening plan when defined).
- [ ] **#7 Wire it all into the review** as the deep beats; keep the light
      register everywhere else; gate with the board-truth corpus sweep + the
      real-game experience audit.

## Guardrails (every slice)

- Prove it (engine number) or show it (play the line) or say nothing.
- Engine + chess.js do the reasoning; LLM voices only, through voiceFacts.
- Every referenced game/line/move real + chess.js-validated (G3).
- Board-truth corpus sweep stays green; the real-game experience audit is the
  bar for "done" (not a green feature-wire smoke).
- Never quote Danya's words — translate the established idea into original prose
  (plagiarism guard). His transcript is REFERENCE for which idea to teach.

## Next-session pickup

Start at queue #1 (criticality scan). The comparison foundation is landed and
proven; everything hangs off the criticality scan. The anchor game + Danya
transcript (gitignored `/tmp`, re-pull with yt-dlp + chess.com API) are the
tuning reference. Hold `plan first → show David → build → show David`.
