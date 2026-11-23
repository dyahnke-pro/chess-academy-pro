# detectTacticType — card (the ONE tactic classifier — the motif vocabulary every tactic lesson keys on)

## A. Identity
- `detectTacticType(fen, bestMoveUci, pvUci?, previous?)` → `TacticType` — `src/services/missedTacticService.ts:131-139`; `detectTacticLine` :162-178 (name + `setup`); core `nameLine` :185-273; helpers `firstLandedTactic` :294, `discoveredCheckWins` :330, `xRayRecaptureWins` :358, `runsToPromotion` :385, `pinnedDefendersOnly` :279; authority table `TACTIC_TYPE_AUTHORITY: Record<TacticType, …>` :81-105.
- Vocabulary: `TacticType` (types/index.ts:1944-1970, 20 members) → `MOTIF_OF_TACTIC` (tacticMotifs.ts:103, 17 MotifIds + null for `tactical_sequence`) → record tags `MOTIFS[m].yours/theirs`, `SPOT_CUES[m]`, `levelOf`. Live side bridge `TACTIC_TO_PATTERN` (tacticVocabulary.ts:147).
- Callers: costReason.ts:227 (the MISTAKE CAUSE's motif), motifNaming.ts:33, setUpChance.ts:248, mistakePuzzleService (630/922/1333), tacticClassifierService (292/417), tacticAlertService, tacticCreateService, tacticTypeBackfill.
- Not a speaking computer (census 0/0) — it is the KEY.

## B. Facts
### B1. Handed over
One `TacticType`: promotion | hanging_piece | fork | pin | skewer | discovered_attack | discovered_check | back_rank | double_check | removing_the_guard | overloaded_piece | trapped_piece | checkmate | clearance | x_ray | deflection | interference | zwischenzug | tactical_sequence. `detectTacticLine` adds `setup` (deflection / interference the line opens with when it lands something else).
### B2. Dropped
- The `landed` flag (whether a tactic the line LANDS named it vs a set-up / mechanics name) — returned by `nameLine` but `detectTacticType` keeps only `.type`. A recipe needs it: "the fork lands" vs "the line is a deflection".
- WHICH ply landed it and its squares (`firstLandedTactic` returns only the type; `computePlyFacts(...).tacticLanded` has the squares) — the lesson's example (which piece forks what) is recomputed by every consumer, or lost.
- `walkerTactic` vs `first` disagreement (the biggest-gain motif vs the first landed) — two answers, the second dropped.
### B3. Cheap
- Return `{ type, landed, ply, squares, agent, targets }` from `firstLandedTactic` (computePlyFacts already has them).
### B4. Gates (tier order)
0 promotion (mechanics) → 1 engine walker `conceptForLine` max 4 (mate → back_rank|checkmate; mate threat on back rank → back_rank) → 1a first landed tactic of the mover (plus discovered check ≥ 2 pawns in 3 plies, x-ray recapture) → walker's tactic → 1b geometry (`geometryMotif`, pv ≥ 3) → 1c zwischenzug (`inBetweenMove`) → 2 hanging piece (undefended capture) → 2a pinned defenders only → 2b runs to promotion → 3 `tactical_sequence` sentinel. Measured on 15k Lichess puzzles (WO-MOTIFS-01 M4; `scripts/motif-readers-merge.mjs`).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `type` → tacticInvariant rule (11 of 20) | rule for 9 types (tacticInvariant card F2); the example squares (B2) |
| CONSEQUENCE | no | — | from the line (lineWins) |
| BETTER MOVE + JOB | no | — | the move it classified IS the better move for `missed`; its job = "it forks …" from B3 squares |
| HABIT | yes (via key) | `SPOT_CUES[MOTIF_OF_TACTIC[type]]` | `tactical_sequence` → null motif → no habit, no rule |

## D. Lesson recipes
The classifier itself teaches nothing; every row is "the motif → the recipe family". One row per motif decides which card owns the words:
| id | motif (TacticType) | seat | owner card for LESSON | example source (B3) | HABIT key |
|---|---|---|---|---|---|
| TT-1 | fork | both | detectTactics DT-F1 / detectLatentFork / trickSidestepped | landed agent + targets | spotCue fork |
| TT-2 | pin | both | pinPressureConcept / pinnedPawnGuard / harmlessPin | pinner, pinned, behind | spotCue pin |
| TT-3 | skewer | both | detectTactics DT-S1 | slider, front, back | spotCue skewer |
| TT-4 | discovered_attack / discovered_check | both | detectTactics DT-D1 / geometryReads loadedLine | blocker, slider, target | spotCue discovered-attack / -check |
| TT-5 | double_check | both | tacticInvariant | — | spotCue double-check |
| TT-6 | back_rank / checkmate | both | conceptForBoard CB-2/CB-3, detectTactics DT-M1/B1 | mating piece | spotCue mate |
| TT-7 | hanging_piece | both | explainTemptingCapture / attackerDefenderCount | victim | spotCue free-piece |
| TT-8 | removing_the_guard | both | guardRemovalConcept | guard, target | spotCue removing-the-guard |
| TT-9 | overloaded_piece | both | detectTactics DT-O1 / newTiedDefender | guard, duties | spotCue overload |
| TT-10 | trapped_piece | both | queenNet/queenHunt/findTrappedPiece, pawnHit | piece | spotCue trapped-piece |
| TT-11 | deflection / interference / clearance | S (O via geometry seat flip) | geometryReads GE-1..4 | the geometry read | spotCue deflection/interference/clearance |
| TT-12 | zwischenzug | both | geometryReads GE-8 | — | spotCue zwischenzug |
| TT-13 | x_ray | both | tacticInvariant (new rule) | the screening piece | spotCue x-ray |
| TT-14 | promotion | both | tacticInvariant (new rule) / conceptForBoard race | pawn | spotCue promotion |
| TT-15 | tactical_sequence | both | NONE — silent LESSON; consequence only (lineWins) | — | none |
| TT-16 | setup + landed (detectTacticLine) | both | "two ideas": the set-up's rule then the landed one ("First the rook deflects the queen, then the knight forks.") | both | both cues |
| TT-REC | record | — | `tagsOfMotif(motif)` hold rate decides full/one-clause/silent | | |
n/a angles: the classifier answers WHICH, not why/when — every angle lives in the owner card.

## E. Mistake link
- It IS the motif of `costReason` (allowed/missed) — the key of `MistakeCause` for every material cause. A mistake with `tactical_sequence` has no named lesson: CONSEQUENCE only.
- Dual use: the same call files the record (`tacticClassifierService`, `mistakePuzzleService`) and names the lesson — one vocabulary both ways (the reason the recipe table must key on TacticType/MotifId, not on the live `TacticPatternType`).

## F. Build changes
1. missedTacticService.ts — export `detectTacticRead(fen, uci, pv, previous): { type, landed, setup, ply, squares, agent, targets }` (B2/B3); `detectTacticType` stays a thin `.type` wrapper (callers unchanged).
2. costReason.ts:227 — store the full read (`motifRead`) on `CostReason` so `MistakeCause` carries the example squares (no consumer re-derives them).
3. `MistakeCause` (Phase 2 F1) keyed on `MotifId` (via MOTIF_OF_TACTIC) — exhaustive `Record<MotifId | 'none', LessonRecipe>`; `none` = consequence-only.
4. Fix the vocabulary split at the rule table: tacticInvariant F1 (`MOTIF_RULE: Record<MotifId, Register>`).

## G. Proof boards
- The 15k Lichess puzzle measure (WO-MOTIFS-01 M4) is this computer's proof; not re-run here (shards ~10 min, CPU shared).
- Not run in this pass.

## H. Open questions
1. none
