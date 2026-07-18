# The Danya Review Build (David 2026-07-18: "IF YOU CAN MAKE THIS REAL")

Companion to `2026-07-18-danya-review-standard-gap.md` (the measured gap).
This is the execution plan for the painted picture, in ranked order. Every
phase is G0-clean: facts computed (engine PV, DBs, eval trace, buckets),
voice only phrases.

David's refinement (locked): before the coach plays a winning line out, it
ASKS the student to SPOT THE SEQUENCE first — play their calculation on the
board, judged ply-by-ply against the PV. Failing deep in the line is not
"wrong", it's DATA: tag a `calculation-depth` weakness bucket ("long
tactical sequences") with the depth they reached. The spot-first flow is
the diagnostic; the playback is the teaching.

## Phase 1 — PV playback + spot-the-sequence (THE CORE)
- `src/services/pvPlayback.ts`: compute the full winning/punishment line
  from a review position (Stockfish PV at review time, chess.js-validated),
  with per-move grounded narration facts (captures, checks, threats,
  material delta) for the voice.
- Extend find-the-shot: after the first move is found/revealed, the coach
  asks "can you see the follow-up?" → student plays THEIR line for the
  mover's side on the board, engine answers for the defender; each student
  ply judged vs the PV (exact or eval-equivalent = credit). Reach the end →
  full credit, prosody spike. Fall off at ply N → capture
  `calculation-depth` bucket entry {reachedPlies, totalPlies, fen, pv} and
  the coach plays the WHOLE line out with narration.
- "Watch it play out": animate the PV on the walk board (arrows + voice),
  auto-paced, cancellable.
- Bucket: add `calculation` category entry to the weakness/misconception
  capture with sequence-depth metadata; surfaces in /weaknesses + drills.

## Phase 2 — model-game injection
- Theme-match the paused review position (motif signature: outpost /
  kingside storm / structure / endgame type + opening family) against
  `model-games.json` (646) + `pro-game-references.json`; when a match
  clears the bar, offer "watch how a GM handled this exact idea" → play the
  matching stretch on the board, then return to the review.

## Phase 3 — principle distillation
- Hand-authored principle text per misconception tag (G0: the tag is
  computed; the principle is curated, not LLM-invented), spoken at the
  reveal + "that's the Nth time this month" from bucket counts.

## Phase 4 — theory-departure moment
- Find the divergence ply vs `openings-lichess.json` (+ masters DB counts),
  offer "book ended here — want to see the main line?" → play the book
  continuation on the board, then return.

## Phase 5 — theme of the game
- Classify the dominant motif from the eval trace + mistake clusters +
  structures; open and close the review with it.

## Ship cadence
One phase = one landing on main, gates green, review tests extended each
phase. Phase 1 first — it carries David's refinement and the biggest gap.

## Status: Phase 1 in progress.
