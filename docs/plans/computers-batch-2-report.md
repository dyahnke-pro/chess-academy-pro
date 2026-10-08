# Computers batch 2 — reading their move, prevention, method, review

Branch `claude/computers-batch-2` (base `claude/reads-rotation`). Source acts:
`docs/plans/swarm-inputs/digests/teach-brief.md` §D, §E, §K and the batch-2
list. Every computer below is a pure leaf (chess.js + the engine lines the
surface already holds; no Dexie, no LLM, no randomness — stems rotate on the
FEN through `rotateStem`/`stemKeyOf`), every claim carries a `Proof`
(`proof.ts`), and every one has a negative test where it must stay silent.

## The shared tables (small, additive)

- `FacetTag` + `FACET_RANK`/`FACET_ROLE` (reviewFacetRank.ts): `their-read`,
  `prevent-test`, `game-end`, `murky`, `attack-pattern`.
- `ClauseKind` (positionFacts.ts) + `CLAUSE_ROLE`/`CLAUSE_TIE`: `their-read`,
  `prevent-test`, `attack-pattern` — the same names, so one vocabulary.
- `FACT_LAYER`, `FACT_PROOF` (all `proven`), `clauseKindForTag`
  (`their-read` → `opponent-intent` for the weakness join).
- `LiveHabit` + `LIVE_HABIT_STEP` (thinkingSteps.ts): `look-again`,
  `calc-now`, `mark-line`.

## How each reaches the door

- **Learn live** — the one producer `thinkAloud.depthClauses` (→
  `positionFacts` → `coachTurn`) now calls `readTheirMove`, `playItAnyway`
  and `knownAttack`; `DepthClause` carries `proof` and the clause map passes it
  on. A read that names the student's move (`namesMove`) waits for the door's
  `nameMove`, like the speed-run reads.
- **Chat position read** — `positionReadComposer` now hands
  `computePositionFacts` their last move (`lastMoveOfLine.lastMoveIfOpponent`,
  new), so the same reads reach a tapped read. Play is silent by design and
  passes no opponent move — unchanged.
- **Review** — `reviewFullData.computeMoveFacets` calls the same producer on
  the opponent's ply with the review's engine line after their move, plus
  `playItAnyway` and `knownAttack`; `coachFeatureService.buildReviewSegments`
  computes `gameEndReads` once per game and pushes each on its ply. Say-once
  rides the existing `hint:` identity ledger.

## Per act

| Act | Result | Computer | Diagnose (b) |
|---|---|---|---|
| Quiet danger | **built** | `opponentMoveReads.quietDanger` — their quiet move (no check, no capture) creates a mate in one that was not there, the moved piece takes part, while their checks were on the board. Proof: the exact mating move from the null-move board. | **wired**: `capabilityEvidence.capabilitiesPosed` now poses `missed-opponents-threat` whenever the opponent has a mate in one on the board; `movePlayedCleanly` files held/broken. One vocabulary with the ignored-threat fundamental. |
| Their idea's one condition | **built** | `ideaCondition` — a knight jump that forks nothing today forks the moment a rook/queen of yours lands on one square, and the engine rates that move ≥100cp below its best. Proof: the legal line (condition, fork). | via the existing slip path: playing the condition move is graded by cpLoss and the fork is recorded by the mistake pipeline (`captureMisconception`/`autoAnalyzeGame`). The posed half needs engine lines `capabilitiesPosed` does not hold. |
| An obligation lifts | **built** | `obligationLifts` — a piece of yours hung (null-move) before your move, still hung after it, and their reply moved its attacker away. Proof: the squares (attacker from/to, the piece). | n/a — the lift is about their move; spending a move guarding a piece no longer attacked shows up as cpLoss on the student's move. |
| A threat's real purpose | **skipped** | Needs the opponent's threat line played to its end (a null-move engine search to an endgame transition). No surface hands that line in; inferring "the purpose" from a one-ply read would be a guess. | — |
| Their move against their own setup | **built** | `bishopOffPlan` — (a) their bishop's forward diagonals run straight into their own pawns; (b) one safe pawn push of yours, within half a pawn of the engine's best, shuts its longest forward diagonal right in front of it. "By reflex" is not claimed (unprovable). | n/a (a description of their move); (b) names the student's move, so a missed chance is cpLoss-graded. |
| What they wrongly expected | **built** | `wronglyExpected` — their capture cannot be taken back (exchange count), yet the engine reads the position at least a pawn and a half better for you than the material says, and its move is not a recapture. Proof: the engine line (said short — engine proof). | via the slip path (failing to punish is cpLoss + missed-tactic mistake puzzle). |
| When their move helped you | **built** | `helpedYou` — the engine's move for you now hits the piece they just moved with gain of time, or was impossible / lost material before their move. Never a take-back. | via the slip path. |
| "Can you play it anyway?" | **built (extended)** | `opponentMovePurpose.playItAnyway` — after `threatStoppedBy` says their reply stopped your threat, the same move is still in the engine's lines within a third of a pawn of its best. Proof: that line. | n/a (a test of their prevention, not a question posed to the student before they move). |
| The wedged pawn by your king | **built** | `wedgedPawn` — their pawn on your third (sixth) rank beside your castled king; the engine's move captures it and no pawn of theirs can come back to the square. Proof: the capture, exact. | via the slip path (leaving the wedge is cpLoss-graded); no dedicated tag exists and adding one would split the vocabulary. |
| More method habits | **built (extended)** | `methodBeat.liveMethodBeat` gains `look-again` (the plain defence of an attacked piece fails by ≥150cp in the engine's lines — `methodSignals.naturalDefenceFails`), `calc-now` (three forcing plies from the first move, after the forcing scan was taught — `forcingLine`), `mark-line` (the engine's move is a sacrifice; every reply forced or not — `markSacrificeLine`). Each carries its line as proof; say-once per game. | habits map to thinking steps (`LIVE_HABIT_STEP`); the slips they warn about are recorded by the existing attributor. |
| Why they resigned | **built** | `gameEndReads.whyItEnded` — on the final board, the winner threatens mate in one and there is no defence, or exactly one that loses a piece to an exchange-proven capture. Spoken as "why it was over" (the review does not know the game ended by resignation, so it never says so). | n/a (looking back). |
| The piece that did nothing | **built** | `idlePiece` — in a game won by three pawns or more, a knight of theirs that arrived inside the first twenty plies and never moved again for at least twenty, with at most one move at the end and its own pawn on one of its squares. Knights only (bishops' "roads" need a second definition). | n/a. |
| The quiet move that decided it | **built** | `quietDecider` — the read goes from under one pawn to two or more and stays there, and the swing lands on THEIR move; your move just before was quiet, the engine's own choice, and took a square from a piece of theirs (safe for it before, losing after). | n/a. |
| An invitation to explore | **built** | `exploreInvite` — after a move, the side to move has three or more legal moves and every one allows mate in one; checked only where the engine already reads a decisive edge. Once a game. | n/a. |
| Honest murkiness (F18) | **built (review)** | `murkyRead` — you played exactly the engine's move, and its two reads of that one position (best-move eval before, eval after) fall in different bands; decided positions excluded. Bands in words, never numbers. Learn live skipped: it holds one read per board, so instability is not measurable there without a second search. | n/a. |
| Known attacking structures as a library (F18) | **built** | `attackLibrary.knownAttack` — entry `opposite-storm`: both kings castled on opposite wings, queens on, a hook in their shelter your pawn reaches (`moveInsight.pawnHook`, extended not copied), never from a worse position. The Greek gift stays its own computer (`moveInsight.greekGift`). | n/a (knowledge). |
| Their clock and speed | **skipped (per brief)** | no clock data. | — |

## Files

New: `src/services/opponentMoveReads.ts`, `gameEndReads.ts`,
`attackLibrary.ts`, `methodSignals.ts`.
Extended: `opponentMovePurpose.ts` (`playItAnyway`), `methodBeat.ts`,
`thinkingSteps.ts`, `thinkAloud.ts`, `positionFacts.ts`, `reviewFacetRank.ts`,
`reviewFullData.ts`, `coachFeatureService.ts`, `capabilityEvidence.ts`,
`lastMoveOfLine.ts`, `positionReadComposer.ts`.

## Tests

`opponentMoveReads.test.ts`, `opponentMovePurpose.anyway.test.ts`,
`methodSignals.test.ts`, `attackLibrary.test.ts`, `gameEndReads.test.ts`,
`batch2Wiring.test.ts` (Learn producer, the nameMove hold, chat's last move,
review facets with proofs, the game-end pass through `buildReviewSegments`,
the posed mate-threat question, and the shared tables). All on chess.js-legal
boards; engine lines are handed in, as the surfaces do.

## Owed / not done

- The two-defence "and it fails" branch of `whyItEnded` has no fixture test
  (the zero-defence branch and the negatives are tested).
- The live surfaces other than Learn and chat's read pass no opponent move, so
  the reads of their move do not reach Play (silent by design) or phase
  narration.
- No prod audit was run from this session (the branch is merged by another
  session); the standing pair (`audit-concept-gameplay-prod`,
  `audit-review-overhaul-prod`) should read the new kinds after merge.
