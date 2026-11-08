# wire-19 — the 19 Learn-only computers (David 2026-11-08)

One line per computer as it is settled. Branch `wire-19`.

- detectBehaviors (piece-activity wish) — MERGED with Review's worst-piece facet: one computer `pieceWish` (src/services/pieceWish.ts). Review's old line ("your worst-placed piece is … reroute it somewhere it actually does a job") is deleted with its producer `worstPlacedFriendlyPiece`. Spoken (Review, SI5q0VJz 18…Qxb2, Black): "Your knight on a5 is stuck on the rim. It wants c4, an outpost no pawn can chase it from, and the d-pawn backs it up." The rest of the Danya registry stays Learn's (see report).
- movePlan — MERGED into the one error computer and DELETED. Its two ideas (castle first, strike the centre) are the better move's job, which `errorWhy`'s better-move reason already says in Review and in Learn's look back once the move is past ("O-O was the move — it would castle your king into safety and swing the rook toward the center.", Italian 4.a3 instead of O-O). It glued "The real priority here was getting the king to safety — castling first." onto Learn's grade after a hung knight, and named a central break the student could still play.
- drillReasons (wrongMoveReason) — MERGED into the one wrong-try computer the puzzles read (`puzzleTeaching.refuteWrongTry`, via `coachDrillService.drillWrongTryReason`); `wrongMoveReason` deleted. With no engine line the one computer now reads the board's own answer, a mate in one first (`inaccuracyCall.boardAnswerUci`) — its old no-line path called Scholar's mate "comes with check and hits your knight on f6". Spoken (drill, Scholar's mate on, …Nf6?): "Nf6? Then they play Qxf7# — they mate you." The rest of drillReasons (goodButWeakerBeat, judgeAlternative, hintBeat) is the drill's own and stays.
- buildRejectedTempting — LEARN-ONLY BY DESIGN for its question before the move ("Why not Nxe4?"); after the move the idea is `weighedMoves.temptingRefuted`, read by Review and Learn. The two keyed one claim two ways ('tempting:Nxe4:<board>' vs 'tempting:f6e4'), so the say-once ledger heard two; both now key `conceptKey.temptingKey(uci)`. Spoken (Review, 8urm2D1HhX8 7…Ng4): "Nxe4 is tempting here, but it fails: they play dxe4 — they win a knight for a pawn."
- backwardLook — ADAPTER (already one computer): its why is `errorWhy`, its concession `findConcession`, both read by Review's walk. Spoken (Review/Learn look back, Italian 4.a3?): "O-O was the move — it would castle your king into safety and swing the rook toward the center."
- callInaccuracyDetailed — ADAPTER of `errorWhy` (whether a move is called, and the verdict's seat).
- hangingPieceLine — ADAPTER: Review says the same fact on their move ([loose] facet + threatCost, "Your bishop on d3 is now hanging.").
- learnMoveReason — ADAPTER of `decisiveReason` (Review reads it).
- theirDeepFactTeaching — ADAPTER of `threeFacts.deepFact` (Review reads it both seats through moveThoughtFacts).
- learnFundamentalNarration — ADAPTER of `principleAttribution` + `principleVoice.renderFundamentalVerdict` (Review's [principle] facet).
- mistakeTurnLine — ADAPTER: Learn's mistake-turn composition; its one-loss-once rules (fundamentalReply, sameReplyAsGrade) are read by Review's walk.
- opponentGap — ADAPTER: Review says their slip and what it allows on their move (`errorWhy`, both seats).
- buildInstantReplyLine — ADAPTER of `matePatterns.mateDescription` (Review's mating ply, deliveredMateNarration).
- playedConcept — ADAPTER: Review's [tactic] facet says the new tactics on the board, both seats.
- moveReason — LEARN-ONLY BY DESIGN for the reward layer and the record; its spoken clause is a free-play line held while a focus owns the game. OPEN: two verdict wordings (moveReasonClause vs errorWhy/praiseWhy).
- tacticalReadFromLines — LEARN-ONLY BY DESIGN: the read of the student's options before the move.
- threatAnswer — LEARN-ONLY BY DESIGN: what to do about a threat, asked live before the move.
- weaknessAnalyzer — LEARN-ONLY BY DESIGN: the stored weakness profile, a record read for the greeting fallback (and the training plan screen), not a teaching voice.
- slipQuestion — SKIPPED (being changed elsewhere); its habit already feeds Review's method beat.
- computer-reach: label 'held' → 'door' (computed in a Learn turn and decided by Learn's turn door); 'wiredNowhere' → 'offTheSixSurfaces'; every door-only row now says why (`door`: adapter of …, with each wrapped computer's reach, or learn-only). 18 door-only, 0 unexplained.
