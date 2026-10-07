# Questions for the swarm (from David, 2026-10-07)

1. ONE COACH: design the single thinking chain every computer feeds
   (Rulebook F0, F0b, F0c, F18) — goal / reason / obstacle / remove-it /
   tempting choice + why it fails / the line / the habit — and how every
   surface (Learn, Review, Play-on-ask, chat, Tactics, Openings) runs it.
   Inputs: docs/plans/2026-10-07-duplicate-census.md, swarm-inputs/52-errors.md,
   the tapes.
2. MASTER-GAME REFERENCES, DETERMINISTICALLY: can the coach cite a real master
   game that matches what it is teaching beyond exact opening positions?
   Idea to test: index master games offline by computed fingerprints (pawn
   structure, material, tactic just played, castling sides) and look them up
   live. Credit the game or move only (Rulebook F0d) — never "he teaches".
   Sources on hand: the explorer proxy (topGames per position), the masters
   DB (opening aggregates only), pro-game-references.json.
   MUST FEEL NATURAL (David): a reference is seasoning, not a template. Rare,
   only where the real game makes the teaching land harder (the same idea
   working, or the same mistake punished), chosen by the one decider like any
   other fact, said once — never "here's what the masters do" on every move.
   STRONGEST IN OPENINGS (David): that is where exact master positions exist
   and where a real game teaches the idea best — start there.
   DAVID'S EXAMPLE: while teaching the Catalan — "here's how Magnus plays the
   Catalan", then a live example: one of his real games walked on the board
   (credit for the game, never "he teaches"). Only a real game from the DB.
   SOURCES, MEASURED: public/data/pro-game-references.json = 2,209 real games,
   8 pros (naroditsky 530, gothamchess 403, caruana 317, carlsen 300, aman 247,
   ericrosen 237, samayraina 116, hikaru 59), tagged by opening (Carlsen has
   15 Catalans) — answers "how does X play this opening". The live masters
   explorer (proxy) returns named top games for an EXACT position — answers
   "a famous game reached this position". The bundled masters DB holds move
   counts only (no names, no games).
