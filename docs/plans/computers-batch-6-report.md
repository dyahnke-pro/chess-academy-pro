# Computers batch 6 — structure, squares, pieces and plans

Branch `claude/computers-batch-6` (base `claude/reads-rotation`). Acts from
`docs/plans/swarm-inputs/digests/teach-brief.md` §2–§3 (lines 322–616).

## Shape

Three pure leaf computers plus one composer, all returning ONE shape
(`structureJudgementKit.StructureRead`: text, squares, a REQUIRED `Proof` —
`squaresProof`, `legalLineProof` or an engine `count` — a say-once key,
stakes where a move's cost is known, and a HELD tag where a correct choice
answers a student-model question):

| file | computers |
|---|---|
| `src/services/pawnJudgement.ts` | secondWeakness, keyPawn, fixOnBishopColour, recaptureSealed, enPassantStructure, formation, breakTradesWeakPawn, dontRepair, mirroredAsymmetry |
| `src/services/squareJudgement.ts` | restriction, pieceBlocksOwnPawn, semiOutpost, maskedWeakness, safeSquareRoute, fileEntryCovered, dontPlugFile, unmovedUnits, mutualRestriction, fileOpenedForDefender |
| `src/services/planJudgement.ts` | rightIdeaWrongPiece, keepPlanChangeRoute, planOverOneMove, placementFutureLine, smallEdges, fightingLine |
| `src/services/structureReads.ts` | composed by WHEN: `studentMoveStructure`, `theirMoveStructure`, `boardStructure`, `linesStructure`, `gameStructureTrend` |
| `src/services/structureJudgementKit.ts` | the shared shape + board geometry |

Reused, not copied: `outpost.isOutpost / noPawnCanChallenge / relativeRank`
(the one outpost test), `positionReadingService.findWeakPawns / pressureCount
/ capturesWinMaterial / legalSeeGainFor`, `keySquares.CENTRAL_SQUARES`,
`proof.*`, `factStakes.costStakes`, `andList`, `rotateStem`.

## Wiring (both ways)

- **One vocabulary:** review facet tag `judgement` (FacetTag) — FACET_RANK 47,
  FACT_ROLE `teach`, FACT_LAYER `plan`, FACT_PROOF `proven`; TIE_ORDER derives
  from FACET_RANK. Learn lane `structureJudgement` (LEARN_LANES lead 54, DNA beat
  `point`, COMPUTER_ROLES entry: held → `recordTeachingEvidence`, broken → the
  live slip capture, askable → `isPositionAssessmentQuestion`).
- **Registry:** `boardComputers` gains `structureMove`, `structureTheirMove`,
  `structureBoard`, `structureLines`, each answering every surface.
- **Learn:** student move via `learnBoardTeaching.studentMoveTeaching` (with
  stakes now passed to the door and HELD evidence recorded); their move and the
  pre-move board/MultiPV via `readBoardAll` in `CoachTeachPage`.
- **Review:** `reviewFullData.computeMoveFacets` emits `[judgement]` facets
  (squares, proof, stakes) on both seats; `smallEdges` rides the review closing
  (`coachFeatureService.generateReviewNarrationSegments`, new exported
  `studentMoveCosts`).
- **Chat:** `groundedAnswer.assemblePositionAssessment` appends the board
  judgements with their squares.
- **Diagnose:** a correct choice records HELD on its own tag — `dont-repair` →
  `greedy-pawn-grab`, `semi-outpost` → `misplaced-piece`, `break-trades-weak-pawn`
  → `mistimed-pawn-break`. Misses (`dont-plug-file`, `right-idea-wrong-piece`,
  `keep-plan-change-route`, `plan-over-one-move`, `en-passant` taken at a cost,
  `file-opened-for-defender`) carry the move's cost as stakes and are recorded
  BROKEN by the existing live slip capture — never twice. Board descriptions
  (`key-pawn`, `second-weakness`, `restriction`, …) pose no question of the
  student's, so there is no row to write.

## Per act

| act | status | computer |
|---|---|---|
| Second weakness | built | `secondWeakness` — a held weak pawn + a weak pawn ≥3 files away |
| Restriction | built (half) | `restriction` — fianchetto diagonal ending on a pawn-guarded pawn. SKIPPED half: "h5 freezes their kingside pawns" needs a lever-race read that is not computed yet |
| Right idea, wrong piece | built | `rightIdeaWrongPiece` — same piece type, same square, other origin; names what the played piece guarded |
| Keep the plan, change the route | built | `keepPlanChangeRoute` — the same knight reaches a square next to the failed hop by the engine's route |
| Plan over the one-move shot | built | `planOverOneMove` — a check or pin that cost vs a quiet best move gaining a central square |
| Placement judged by its future line | built | `placementFutureLine` — a low-scope bishop the PV's own pawn moves open |
| Keep tactical chances in a closed position | SKIPPED | needs a sacrifice the engine can prove LATER from a move NOT played now; no line in hand proves "stays in the air" |
| Their recapture sealed your weakness | built | `recaptureSealed` — their pawn capture lands in front of your weak pawn on a file that was open |
| En passant as structure | built | `enPassantStructure` — declined with engine agreement (clamp kept) / taken at a cost (clamp lost) |
| Semi-outpost | built | `semiOutpost` — a supported post a pawn could challenge only through a covered or blocked path |
| Fix their pawns on your bishop's colour | built | `fixOnBishopColour` |
| The key pawn | built | `keyPawn` — proven by removing the pawn and re-counting the exchange |
| Structure library (formations) | built (half) | `formation` — triangle, chain, phalanx. SKIPPED half: "choosing between pawn moves" needs a formation comparison over candidate pushes (no such computer) |
| Break that trades off your weak pawn | built | `breakTradesWeakPawn` |
| Don't repair their structure | built | `dontRepair` — the capturable pawn that buries their bishop (scope gain ≥3), declined with engine agreement |
| Keep their piece clogging their system | EXTENDED via `pieceBlocksOwnPawn` | the clog itself is computed; the "your move keeps it there" half would need their plan, not computed |
| Piece in front of its own pawn | built | `pieceBlocksOwnPawn` |
| The wedge that pays later | SKIPPED | the payoff ("covers c3 so their knight can't block your check") is a future check line no engine line in hand proves at the move |
| Square valued for safety and routes | built | `safeSquareRoute` — unhittable square + the PV moves it on |
| Masked weakness | built | `maskedWeakness` — their minor covers ≥2 holes; a safe pawn push chases it |
| Mirrored-square asymmetry | built | `mirroredAsymmetry` |
| File entry squares | built | `fileEntryCovered` |
| Don't plug your own open file | built | `dontPlugFile` |
| Squares your unmoved units leave open | built | `unmovedUnits` (their move) |
| Mutual-restriction ledger | built | `mutualRestriction` — both seats |
| A file opened for the defender | built | `fileOpenedForDefender` |
| Small edges accumulate | built | `smallEdges` (review closing) |
| Fighting line or peaceful line | built | `fightingLine` — level, two close lines, one imbalanced (B for N, doubled pawns) |

## Tests

`src/services/structureJudgement.test.ts` — 26 tests, each a real
chess.js-validated position with a positive case and a negative case where the
computer must stay silent; every read is checked against the voice rules (no
we/our/us, no percentages, no move numbers) and must carry a proof.
`boardComputers.test.ts` holds each new registry "wired" claim to a real call
site.
