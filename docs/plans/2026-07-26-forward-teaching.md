# Forward-teaching build (task #31, David 2026-07-26: "I like 31!")

Today's coach teaches REACTIVELY — it responds to a move already on the board
("that move threatens X", "that was a blunder, better was Y"). Forward-teaching
flips it: teach the student to SEE AHEAD and FEEL THE CHOICE before they commit.
Coach-tab only (Learn `/coach/teach` + Review); no opening-tab spill.

## G0/G3 (supreme law) — the design constraint

Every forward claim is COMPUTED in code (chess.js legality + Stockfish eval +
`pieceQuality` / `boardStructure` / the `DetectedThreat` machinery in
`groundedAnswer.ts`). The LLM only VOICES the computed facts. No route, capture
consequence, or decision fork is ever invented by the model. This EXTENDS the
existing threat computers — do not reinvent:
- `groundedAnswer.ts`: `DetectedThreat`, `describeStudentThreat`,
  `describeThreatRecognition` (spot it), `describeThreatPrevention` (defend it).
- `pieceQuality.ts`: outpost / bad-piece / mobility evaluation → route TARGETS.
- `boardStructure.ts` / `describeStructure`: pawn-structure delta → capture
  consequences. `explainTemptingCapture` already computes why-NOT-to-take; the
  conditional-capture computer is its forward twin (if you take, THEN …).

## The four pieces

### 1. Piece-route threats — "the knight's journey, not one move"
Teach that a piece has a multi-move ROUTE to a strong square, so the student
sees the plan behind a quiet move. NEW pure computer
`forwardTeaching.computePieceRoute(fen, fromSquare)`:
- target = the best reachable strong square for that piece (outpost / active
  post) from `pieceQuality` (a hole in the enemy camp a knight can occupy and
  can't be chased by a pawn; an open diagonal/file for B/R/Q).
- route = the shortest legal hop-sequence to it (BFS over the piece's own legal
  moves on an otherwise-frozen board; chess.js-validated each hop).
- Returns `{ piece, from, target, route: Square[], why }` or null. LLM voices:
  "the knight wants f5 — it goes d2, e3, then f5, eyeing the weak light squares."
- Board-true by construction; gated by a unit test (route legality + target is a
  real strong square). Pure chess.js — no Stockfish, fully testable.

### 2. Conditional captures — "if you take, then …"
Forward if→then teaching at a capture decision. NEW computer
`forwardTeaching.explainConditionalCapture(fen, captureSan)`:
- apply the capture + the best recapture (Stockfish 1-ply, or SEE for the quiet
  case), diff `describeStructure` before/after → the consequence (opens the
  c-file for the rook / hands you the bishop pair / creates a protected passer /
  wrecks your own pawns). Returns `{ consequence, evalDelta }`.
- LLM voices present-tense: "if you take on d5, the recapture opens the c-file —
  your rook comes alive." Verified by the same static-claim nets as review.

### 3. Beat reordering — setup before payoff
A pedagogy-sequencing pass over a lesson's authored beats so the SETUP/tension
beat is spoken before the PAYOFF beat, instead of strict move-order when the two
diverge. Transform over the beat array (NOT a fact-computer): detect a
"payoff" beat (names a tactic/threat that a prior quiet beat set up) and ensure
its setup is voiced first. Never reorders MOVES (G3) — only the NARRATION
emphasis/preamble ordering within a beat group. Conservative: only when a
provable setup→payoff pair exists; else leave order untouched.

### 4. Decision-tension voicing — "feel the fork"
At a genuine decision point, voice the TENSION (two real plans competing) BEFORE
the answer. NEW computer `forwardTeaching.detectDecisionPoint(fen)`:
- Stockfish multipv (top 2-3); a decision point = 2+ moves within a small eval
  band (~≤ 0.4) that lead to STRUCTURALLY different positions (different pawn
  break / side of the board). Returns `{ competing: {san, eval, theme}[] }`.
- LLM voices: "two roads here — take on d4 and open it up, or hold with c6 and
  keep it closed. Both are fine; the character changes." NEVER hands the answer
  first (mirrors the clean-probe honesty). Silent when there's one clear move.

## Where it plugs in (coach-tab only)
- Learn walkthrough narration: the per-move why (`plyFactsForMove` /
  `buildReviewMoveTeaching`) + the `generateOpeningFromDbNarration` prose prompt
  gain a forward-teaching fact when the computer fires. Present-tense register.
- Review: the same shared computers surface in the retrospective register.
- Both consume the pure computers; the register lives in the surface, not the
  computer (the two-register law of 2026-07-19).

## Sequencing (one fact-computer per PR, gate after each)
- Phase 1: `computePieceRoute` (#1) — pure, self-contained, unit-tested. FIRST.
- Phase 2: `explainConditionalCapture` (#2) — extends boardStructure delta.
- Phase 3: `detectDecisionPoint` (#4) — Stockfish multipv.
- Phase 4: beat reordering (#3) — the narration-sequencing transform.
- Phase 5: wire each into Learn + Review narration; clone the real-game audit.

## Status
- [x] Phase 1 computePieceRoute — DONE (6 unit tests).
- [x] Phase 2 explainConditionalCapture — DONE (3 unit tests; if→then structure
  delta: opens/rips a file, hands a passer, saddles the enemy with a weakness,
  with an HONEST downside when the capture damages the mover's own pawns).
- [x] Phase 3 detectDecisionPoint — DONE (4 unit tests). Pure core: caller
  supplies Stockfish multipv candidates; fires only when the top two are within
  the eval band AND lead to different pawn-structure signatures (a real break /
  commitment), else stays silent. The engine multipv call is a Phase-5 concern.
- [ ] Phase 4 beat reordering — pending.
- [ ] Phase 5 wire into Learn + Review narration + real-game audit — pending.

## Decisions log
- 2026-07-26: coach-tab only; every forward claim computed in code, LLM voices
  (G0). Extends the existing `groundedAnswer` threat computers + `pieceQuality`
  + `boardStructure` — no reinvention.

## Next-session pickup
Start at Phase 1: `src/services/forwardTeaching.ts` `computePieceRoute` +
`forwardTeaching.test.ts`. Then Phase 2. Do NOT wire into a surface until the
computer is unit-green. Do not touch opening-tab code.
