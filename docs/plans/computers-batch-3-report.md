# Computers batch 3 — tactics and geometry (report)

Branch `claude/computers-batch-3` (base `claude/reads-rotation`). One leaf
computer, `src/services/tacticGeometry.ts`, holds acts 2–13; act 1 already
existed. Every read is the engine's own line played out (its first move — never
argued with) or a geometry certain on the board, and every read carries a
`Proof` (`lineProofFromUci` / `legalLineProof` / `squaresProof`). A read that
cannot build its proof is not emitted. Phrasing rotates on the move number
where stems vary; no `Math.random`, no caps.

## Wiring (one producer, every surface)

- **Registry:** `boardComputers.ts` gains `tacticGeometry` (context
  `GeometryContext`), answering all six surfaces. `BoardRead` gained three
  optional fields: `motif`, `namesMove`, `idea`.
- **Learn + read-position (chat position reads), phase narration, live
  coach:** `thinkAloud.depthClauses` asks the registry on the student's turn and
  emits a new clause kind `tactic` (proof, stakes, squares, motif, say-once
  claim). A read that names the engine's move speaks only where the move is
  earned (`nameMove`); elsewhere its `idea` (the habit, no answer) rides as a
  `speedrun-read`. `positionFacts` maps the proof and motif through to the one
  door (`coachTurn`), so `CoachTeachPage`'s `queueSpokenHint` gets the proof.
- **One vocabulary:** `tactic` is now a `ClauseKind` with the same name as
  review's `[tactic]` facet (as `refuted`/`rule`/`trade` already are):
  `CLAUSE_ROLE.tactic = 'teach'`, `CLAUSE_TIE.tactic = FACET_RANK.tactic`;
  FACT_LAYER/FACT_PROOF already carried `tactic` (safety / proven).
  `matchClauseKind('tactic')` joins the pin/skewer holes exactly as review's
  facet did through `clauseKindForTag`, so review's ranking is unchanged.
- **Weakness join (teach side):** `positionFacts.clauseHole` joins a `tactic`
  clause with a motif to `analysis:tactic:<motif>` (`matchTag`).
- **Review:** `reviewFullData.computeMoveFacets` reads the registry on student
  plies from `fenBefore` with `bestLineUci`, in the retrospective register; a
  read naming the best move never speaks when the student played it (matched
  by coordinates, G4.5.2). `[tactic]` facet with proof, squares, stakes and the
  say-once key.
- **DIAGNOSE (record side):** the one tactic classifier,
  `missedTacticService.detectTacticType`, asks `geometryMotif` when its engine
  walker names nothing on a real line (≥3 plies). Deflection (and the decoy,
  whose analysis home is `deflection`), interference and clearance now reach
  the record as `analysis:tactic:<motif>` instead of the sentinel.
  `TACTIC_TYPE_AUTHORITY` gains a `'geometry'` authority for those three;
  `TACTIC_TYPE_REV` bumped to `2026-10-08-line-tactics` so persisted rows are
  re-tagged by the scheduled backfill.

## Per act

| # | act | status | computer | diagnose half |
|---|---|---|---|---|
| 1 | Pin broken with tempo (+ "can the escaped piece just be taken": the 5.Ng5+ Qxg5 case) | **already built** — `pinBreak.ts` (worst-reply search) via registry `pinBreakOwn` / `pinBreakTheirs`, Learn-wired, tested in `pinBreak.test.ts`. Nothing copied. | `pinBreak` | the pin motif is the engine walker's |
| 2 | The would-be pinner is itself pinned | built — `pinnerIsPinned` (absolute pin + the square it would pin from, off the pin line, not a legal move) | new | motif `pin` joins the teach ranking; nothing to record (it is a resource the student has, not a miss) |
| 3 | Interference both ways | built — `falseMateBlock` (the check that isn't mate because the checker cuts your own cover of every escape; live: the tempting non-engine check, review: the check the student played) and `interferenceCut` (the engine's move cuts their guard line and its line takes the guarded piece) | new | `interference` recorded via `geometryMotif` |
| 4 | Clearance with tempo | built — `clearanceTempo` (your blocker leaves with check / a capture / a hit on the queen and the long piece's line pins or wins) | new | `clearance` recorded |
| 5 | Decoy and deflection, live | built — `decoyDeflection` (bait, their capture, the follow-up hits the lured piece or lands on the square it stopped guarding; line must net ≥2) | new (tacticClassifier:457 has a one-ply deflection shape with no line; this reads the engine line) | `deflection` recorded (decoy too — the record has no `decoy` motif) |
| 6 | Discovery audit | built — `discoveryAudit` (a non-engine pawn kick whose kicked piece fronts their long piece; the exit must check, or take while the line wins your piece) | new | `discovered_attack` joins the teach ranking; the record half for a kick the student PLAYED is the engine's punishing line, already classified |
| 7 | Their in-between move, one step further | built — `zwischenzugRefuted` (they owed a recapture worth ≥3, checked instead; the engine's answer is a king step after which the owed piece is safe and the line keeps the material) | new | motif `zwischenzug` joins the teach ranking; **not recorded** — the miss would be the king step, which the classifier sees as the move itself, and `detectTacticType` has no previous-move input. Left theme-only. |
| 8 | The fork that serves a plan | built — `forkForPlan` (a real double attack, the line wins nothing, their answer leaves a piece with no defender) | new | none — it is a plan, not a missable win |
| 9 | Their usual reply is unavailable | built — `kickFails`: every pawn kick against the engine's posted piece loses material to a capture the kick itself created. **"Usually" is not said**: frequency needs population data the board does not carry (refutedAlternative owns DB-backed "players usually"); the kick is named as the natural reaction. | new | none — knowledge about their option |
| 10 | Counterfactual pattern | built — `counterfactualFork`: a safe knight jump that checks the king and covers an empty square their queen can step to (never a real fork, never a discovered check) | new | motif `fork` joins the teach ranking only |
| 11 | A pushed pawn can't block a check | built — `pawnBlockGone` (diagonal engine check; their pawn on that file already past the block square; no pawn can block anywhere on the line). The Moscow Sicilian is the test. | new | none |
| 12 | Interposition between facing pieces | built — `interposeFacing` (the engine's quiet move lands between your long piece and theirs that see each other; stakes when yours was hanging) | new | none |
| 13 | The loaded line | built — `loadedLine` (a lone pawn between a long piece and the enemy king, with a move off the line = discovered check; both seats) | new | motif `discovered_attack` joins the teach ranking |

## Rot fixed on sight

`nextPlans.isPinnedPiece` called a piece pinned when it was not on any line
with its king (the walk from the king ran off the board, then read whatever
slider lay beyond the piece): a rook on d6 "pinned" to a king on g1 by a queen
on b8. Now it requires the file/rank/diagonal first. Used by `speedRunReads`,
`deliberation`, `nextPlans` and this computer. Test in
`tacticGeometry.test.ts`.

## Measured

Model-game sweep (8 games, 748 plies, each ply's next six moves as the line):
~14 ms per ply for all thirteen reads together; the noisiest read
(`kickFails`) fired on 20 plies before say-once. The sweep found and fixed: a
kick "punishment" unrelated to the kick, rank-check "blocks", a decoy onto a
pawn, a queen "forking" a defended queen, a discovered check counted as the
knight's own check, and the `isPinnedPiece` defect above.

## Files

- new: `src/services/tacticGeometry.ts`, `src/services/tacticGeometry.test.ts`
- `src/services/boardComputers.ts` (registry entry, `BoardRead` optional fields)
- `src/services/thinkAloud.ts` (the producer emits `tactic` clauses)
- `src/services/positionFacts.ts` (`ClauseKind` += `tactic`; proof/motif mapped; weakness join)
- `src/services/reviewFacetRank.ts` (`CLAUSE_ROLE` / `CLAUSE_TIE` += `tactic`)
- `src/services/weaknessSignal.ts` (`matchClauseKind('tactic')`)
- `src/services/reviewFullData.ts` (the review read)
- `src/services/missedTacticService.ts` (tier 1b, `'geometry'` authority)
- `src/services/tacticTypeBackfill.ts` (`TACTIC_TYPE_REV`)
- `src/services/tacticTypeUnification.test.ts` (theme-only list; geometry fixtures)
- `src/services/nextPlans.ts` (`isPinnedPiece` alignment)

## Tests

`tacticGeometry.test.ts` — 37 tests: each act's positive on a chess.js-validated
board (two from real master games in `model-games.json`, one the Moscow
Sicilian) with its exact sentence and a real proof, and a silent negative per
act; `pvGain`; the `isPinnedPiece` fix (fails on the old code); the classifier
naming interference/deflection/clearance; and the wires — the registry, the
Learn/read-position producer (named vs held: the idea only), the one-vocabulary
tables, and Review (retrospective, and silent when the student played the
move). Engine lines are handed in, as the computer's contract says; the
decoy's "declined" negative is the line Stockfish actually plays there.

## Owed

- Live prod audit of a Learn game where one of these fires (not run in this
  session: branch work, merged by another session).
- Play stays silent (`PLAY_VOLUNTEERS_COACHING`); the registry marks it owed on ask.
- Zwischenzug record half (needs the previous move in the classifier's input).
