# Questions for the swarm (from David, 2026-10-07)

THE BAR (David): it must sound and feel like a real grandmaster chess coach is
sitting next to the student, TEACHING them. Law: RULEBOOK.md.
TEACHING = showing how to think: RECOGNIZE, IDENTIFY, PLAN, PREVENT,
STRATEGIZE, and the CONSEQUENCES of a move (F01) It also hands over the KNOWLEDGE that takes years to find alone: geometry (how a knight or bishop covers squares, the square of a pawn, opposition), technique and rules (knight-and-bishop mate, which material can and can't force mate), named patterns, and the GOLDEN NUGGETS hidden in chess's arithmetic (count attackers vs defenders before you take; a king walks a diagonal as fast as a straight line, so it can chase two goals at once; whoever has the move in a pawn race wins the tie). — never just telling them what to do.

PRIORITY (David, F02): THE OPENING — "the thing that pulled me from 800 to
1300 in under a year". Weigh opening teaching and traps first.
THE PROGRESSION (F03): traps HARD and OFTEN early, with principles, theory and
good habits; the record shifts the weight to thinking and strategy once traps
stop deciding the student's games.
ONE TRAP LIBRARY (F04): today ~8 separate trap systems. One definition (a
natural move opponents really play at the student's level that loses to a
forced, engine-proven sequence winning AT LEAST A PIECE OR MATE within a few
moves), one library, every surface reads it. MEASURED: only 54 of 344 gems
clear that bar (median gain ~1.3 pawns; 106 under a pawn) — re-check all, cut
the rest. Hand-build first: Bishop's Opening, Jobava London (0 gems each;
Jobava has hand-written trap lessons in a separate system).
FIRST OPENING ITEM — THE GEMS (David: "those gems that have never fucking
worked"): punish-gems must be reachable (not stuck behind the unlock ladder —
a June prod probe pressed unlock and no gem surfaced), plentiful (only
hand-narrated gems surface today, few openings have any), and proven working
end to end on prod (every audit run so far ended DEFERRED). They are the
heart of opening teaching: the slip your opponent makes and how you punish it.
ACCEPTANCE TEST (David: "i have never NEVER heard my app teach me a gem"):
done = David HEARS a gem taught, in a real game and in the opening lessons.
Start by tracing why none has ever reached him: gem data → surfacing →
unlock → Learn's live gem detection → the voice.
MEASURED: 344 gems over 86 openings (src/data/punish-gems.json). The Bishop's
Opening has ZERO — it is not a built opening (only 40 raw DB entries, generic
walkthrough). David: "so many ways black can go wrong … most noticeably with a
bishop sac on f7". Build it properly, gems found BY HAND (no bots), every
Bxf7 slip engine-verified, taught per F01.
FIRST GEM (David's, "OH MY GOD WHAT A BEAUTIFUL TACTIC"; he learned it a month
ago): 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4? 4.Bxf7+! Kxf7 5.Ng5+ Ke8 6.Qxg4 —
chess.js-legal (verified 2026-10-07); engine value to verify at build. The
nugget to TEACH: a pin only holds while the pinned piece can't move WITH
CHECK — the knight leaves with check, the pin breaks, the pinning bishop hangs.

0. TEACHING TRACK: learn HOW the reference coach teaches (voiced corpus
   public/data/voiced-teachings.json — 7,477 notes from 428 videos; the
   speed-run study docs/plans/2026-09-24-speedrun-target.md; the teaching
   census docs/plans/2026-09-27-naroditsky-teaching-census.md; the transcript
   swarm-inputs/*.vtt), compare to our tapes, and design how the one thinking
   chain teaches that way on every tab. His name is never used (F0d).

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
   ALREADY BUILT (David): the Openings Masterclass/Elite tab carries 8
   depersonalised repertoires built from real pro games — "The Universal
   Grandmaster Repertoire" = Carlsen's 300 games (incl. 15 Catalans), "The
   Speedrun Attacking Repertoire" = Naroditsky's, etc. The missing piece is
   the coach reaching INTO them while teaching (cite a real game, credit the
   game/move). Names still leak in the lesson text inside them (F0d).
   The coach already SEARCHES by player in chat (`lookup_player_games`, test
   `lookupPlayerGames.magnus-catalan`). The pipeline that built the
   repertoires (fetch-chesscom / fetch-otb-games → build-game-references) can
   add any player. Gap = Learn, Review and lessons never reach for a game on
   their own.

3. OPEN QUESTIONS — propose answers for David to decide (do not build without his yes):
   a. When the coach ASKS instead of tells (Review asks at turning points; Learn?).
   b. Explaining a term (pin, outpost, zwischenzug) the first time, and knowing which terms the student knows.
   c. Rhythm: how much it says on routine moves vs decisions.
   d. Spaced repetition of IDEAS, not just opening moves.
   e. What great middlegame and endgame teaching looks like after move 15.
   f. A check that every spoken line does one of the F01 verbs (teaching vs description).
   g. Speed: thinking out loud must arrive in time (review prep ~7 s today).
