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

---

## ANCHOR TUNING PASS 1 — his-vs-ours on the Grand Prix game (2026-07-23)

Method (David): pull his real game by chess.com username → reconstruct →
run OUR review → compare to HIS narration. His side = the 5 distilled
`danya-teachings.json` notes citing video `YXz0xSbhY70` (the anchor game
`74342999351`, Dalibor6709 vs FrankfurtAirport/Danya, Grand Prix, 0-1).
Ours = `audit-review-real-game.mjs` on the same PGN, student=Black.

His 5 beats vs ours (grounded, move-by-move):

| # | His beat | Ours | Verdict |
|---|---|---|---|
| 1 | Name the **Grand Prix Attack**; Black's ...d6/...e6 setup; **plan = ...b6/...Bb7 then ...d5/...e5 break** | "King's Pawn"→"Sicilian: Closed"; generic development; no plan | ❌ MISS |
| 5 | move 12 **...Ba6 mistake**, ...Bb7 supports ...d5 (method of comparison) | ply 24 [INACCURACY] "stronger was Bb7… line runs Bb7,f5,exf5…" | ✅ HIT |
| 2 | move 15 **...f4 dual-purpose** — hits e3 AND blocks kingside, gains tempo | ply 30: offense only ("wins the bishop…") | ⚠ PARTIAL |
| 3 | endgame **prophylaxis** — ...Rc4 safer than ...Rxe4 | ply 46 [INACCURACY] flags ...Rxe4 (right moment) but offers Bc8, no prophylaxis frame | ⚠ PARTIAL |
| 4 | the win **...Nf3+ fork** | audit capped at 60 steps → finish (55-66) uncaptured; product silence UNCONFIRMED | ⏳ RE-RUN |

Cross-cutting: ours fires the deep engine readout on ~every move (12 deep
projections / 66 plies); Danya modulates (light idea default, deep on the
hinge). Register = engine-dump vs teacher.

KNOBS (confirmed):
1. **Opening name depth** — `detectOpening` tops out at "Sicilian: Closed"
   for all plies; never "Grand Prix Attack". (openingDetectionService / DB)
2. **Opening plan** — `buildOpeningDevelopmentPlan` speaks generic
   development, not the side-specific ...d5/...e5 counter-break plan. Prod
   path DOES pass {openingName,curatedIdeas,seed} (coachFeatureService:1451),
   so the gap is inside the plan-builder / missing curated ideas for this
   opening, NOT the wiring.
3. **Dual-purpose synthesis** — pawn move that attacks AND blocks → say both + tempo.
4. **Prophylaxis frame when ahead** — inaccuracies while winning get "consolidate first".
5. **Selective depth** — deep projection only on the hinge; quiet moves one light line.
6. (artifact, not product) audit walk cap was 60 → raised to 90 to capture full finish.

NEXT: confirm beat 4 (re-run w/ 90 cap), then turn knobs 1+2 first (loudest
misses), re-run anchor, re-compare. Then validate on the 9 pulled games.

---

## GROUNDING ARCHITECTURE — locked (David 2026-07-23): his games primary, masters DB backup

David: "use his games as the primary source, then when he doesn't have any
games we use the master DB." + "Master DB should be the backup." + corpus =
BOTH accounts merged.

The ungrounded generic development template ("the knight belongs on c6… get
the king castled") that fired on EVERY game is KILLED. Opening-plan grounding
chain (empty > generic):

1. **His games (PRIMARY)** — merged corpus of `frankfurtairport` (speedrun /
   teaching) + `danielnaroditsky` (main, ~140k). Aggregate the most-played
   continuation / plan at the review game's opening structure (pro-rep §G9.1
   spine + middlegame-pattern extraction, widened past the 2 hand-built
   openings to a broad opening→plan index shipped as JSON).
2. **Masters DB (BACKUP)** — `public/data/openings-masters-db.json` (37MB) /
   lichess masters explorer: most-played master continuation for the
   structure, ONLY when he has no games there.
3. **Nothing** — neither has it → say nothing. Never the generic template.

Build steps:
- [in progress] pull both corpora (fetch-chesscom.mjs frankfurtairport +
  danielnaroditsky).
- build a broad `his-opening-plans` index (opening/FEN-prefix → his spine +
  most-played middlegame plan + W/D/L), shipped as JSON, loaded by the review.
- masters-DB backup query (FEN/prefix → top continuation) — reuse the
  masterPlayLookup path.
- wire into resolveCuratedOpeningIdeas / buildOpeningDevelopmentPlan: his →
  masters → null; DELETE the devClause generic fallback.
- gates + re-run anchor (Grand Prix must now speak HIS plan) + validate on the
  9 pulled games.

Scorecard update (beat-4 re-run, cap raised 60→90): the ...Nf3+ fork IS
narrated (plies 63-64) — beat 5 = ✅ HIT; the silence was the audit cap, not
the coach. Remaining misses: Beat 1 (opening plan — THIS grounding build),
Beat 3 (...f4 dual-purpose), Beat 4 (prophylaxis frame), register density.
