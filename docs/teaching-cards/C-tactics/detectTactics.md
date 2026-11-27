# detectTactics — card

## A. Identity
- Computer: `detectTactics(fen)` — `src/services/tacticsDetector.ts:736` (cached wrapper), body `detectTacticsUncached` :748.
- Sub-detectors: `findForks` :86, `findPins` (pinGeometry), `findSkewers` :160, `findMateThreats` :226, `findBackRankWeakness` :297, `findTrappedPieces` :369 (→ `trappedPiece.trappedAt`), `findDiscoveredAttacks` :430, `findRemovableGuards` :489, `findOverloadedPieces` :623, `findBatteries` :665; plus `findHangingPieces` (tacticClassifier).
- Fact kind: `tactic` via board computer `boardTactics` — `src/services/boardComputers.ts:2281-2350` (`computer: 'detectTactics'`).
- Surfaces: Review only (`reviewFacetSurfaces()`, boardComputers.ts:8191 — lesson/learn/chat "owed"). Census: 122 fired / 105 said, all `s=review`.
- Also read raw by ~40 callers (misconceptionClassifier, learnRecordTerms, pinPressure, pinBreak, positionFacts:1325, conceptEngine:530 …) — it is the shared tactic vocabulary on the BOARD side.

## B. Facts
### B1. Handed over (`TacticPattern`)
- `type` ∈ fork · pin · skewer · mate_threat · back_rank · trapped_piece · discovery · removal_of_guard · overload · battery; `beneficiary` (colour); `involvedSquares` (ordered: actor first); `description` (English, colour-named).
- `hangingPieces: HangingPiece[]`; `highlights`.
- In `boardTactics.read`: fork verified by `verifyForkOnBoard` (tacticVerification.ts:49) → status `live|threat` + `winsPoints`; stakes from `exchangeStakes` (factStakes.ts:143); pin's consequence `pinConsequence` (lookaheadPlan.ts:163, "If their knight moves, their queen on d8 is open …"); proof `moverLineProof` / `threatProof`.

### B2. Computed internally, dropped
- Fork: `targets[]` with types (:98-105) and the `winnable` subset (:121-124) — WHICH target falls is computed, only the shape is said. `forkerToMove` (:134) decides "now vs coming" and is dropped (re-derived by verifyForkOnBoard).
- Back rank: NOT dropped (checker 2026-11-23) — `invader` (:347) is handed over as `involvedSquares` `[kingSq, invader.to, invader.from]` (:358). Only the `survives` verdict (:332) is a gate, not a field.
- Removal of guard: `takers` (:511, piece TYPES only — `attackersOfSquare` returns `PieceSymbol[]`, never the taker's square), `guardIsDefended` (:524), `cheapestTaker` (:525, a value) — the kind of taker is computed and dropped; the taker's SQUARE is not computed at all (B3).
- Overload: `soleDuty` map (:629) — the two jobs; consequence "whichever it recaptures on, the other falls" lives only in the doc comment (:618-622).
- Battery: `target` piece (:700, handed over as involvedSquares[2]) and line word — said, but not WHAT the battery wins (exchange count on target not run).
- Discovery: the `withTempo` move (:466, a boolean `.some()` — the move itself is never kept) — the unveiling move that checks/captures is found and dropped; only "in waiting" said.
- Mate threat: the mating move IS handed over (`involvedSquares: [mate.from, mate.to]`, :253); only its SAN/check-vs-mate shape is dropped. `mateThreatIsUnstoppable` (:267) is a gate for the side not to move (:242), not a field.

### B3. Cheaply computable
- Count on the battery target: `chess.attackers(target)` both colours → "two against one" (secondAttacker's count shape).
- Removal of guard: the taker's square — `chess.attackers(guardSq, color)` (squares) in place of `attackersOfSquare` (types).
- For a fork: the piece that is saved vs lost = highest-value winnable target (already in `targets`).
- Prevention square: the square a fork/pin needs (forker's `to`) and whether the student could have covered it on fenBefore (`before.attackers(sq, student)`).
- Whether the tactic is NEW this move: `detectTactics(fenBefore)` signature diff (the pattern already exists in reviewMoveBriefing.ts:142-143).

### B4. Gates
- Fork: targets ≥ knight value (:103); winnable ≥1 if forker to move, ≥2 otherwise (:125); forker-safety SEE when defender to move (:135). Board computer re-verifies: only `live`/`threat` said (boardComputers.ts:2324-2333).
- Pin on a pawn that wins nothing dropped (`isScenicPawnPin`, boardComputers.ts:2337).
- Discovery: target ≥ rook or king, blocker has a tempo move off-ray (:445, :466-470).
- Back rank: no luft (:313-320) + a surviving check (:347-354).
- Battery: must point at an enemy piece (:700-701).
- Mate threat said once (`skipMateAgainst`, boardComputers.ts:2320).
- Census held: `in-flux` 13; mate subsumed 3.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `type` + `involvedSquares` | the rule each motif teaches; today it restates the shape ("form a battery … bearing down on your knight") |
| CONSEQUENCE | partly | fork `forkConsequence`, pin `pinConsequence`, stakes | battery/overload/removal/discovery consequence not said; overload's "whichever it takes, the other falls" only a comment |
| BETTER MOVE + JOB | no | — | not this computer's; needs errorWhy's best move + "it covered <square>" from B3 prevention square |
| HABIT | no | — | spotCues by motif (`spotCueLine(motif, seat, board)`, spotCue.ts:278) not wired here |

## D. Lesson recipes
Seat: S = tactic benefits student, O = benefits opponent. Fields: T=`type`, SQ=`involvedSquares`, W=winnable target (B2), V=`verifyForkOnBoard`.

| id | angle | seat | condition | slots (field → word) | LESSON stems (rotated) | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DT-F1 | knowledge (fork) | O | T=fork, V=threat\|live, O to move after S's move | SQ[0]→forker, W→targets | "A fork is two attacks with one piece: they can only save one. Their knight on c2 hits your king and rook." / "One piece hitting two of yours means one is lost. Their knight on c2 does it to your king and rook." | "The rook on a1 goes." (lowest-saved = W minus king) | "Rb1 was the move — it took the rook off the fork square's line." (errorWhy best + B3 job) | spotCue fork `attacked-yours`/general | after S's move only; target squares named, never S's next move | V not live/threat; forker capturable | H (T,V), C (W ordering) |
| DT-F2 | consequence | S | T=fork, S benefits, S just played it | forker, targets | "A fork wins whatever they can't save. Your knight on c7 hits king and rook — the rook comes off." | material from V.winsPoints | n/a (S found it) | silent | Learn: praise path only (not a mistake turn) → Review only | — | H |
| DT-P1 | knowledge (pin) | O | T=pin, beneficiary O, behind = Q/R | SQ (pinner, pinned, behind) | "A pinned piece is a frozen piece. Your knight on f3 can't move without giving up the queen on d1." / "A pin turns a defender into a target: your knight on f3 is stuck in front of the queen." | `pinConsequence` | "Be2 was the move — it put a piece between the knight and the queen." (C: interpose square) | spotCue pin | after move | `isScenicPawnPin`; pin breakable (`findPinBreaks`) → defer to that card | H + C |
| DT-P2 | identify (pinned guard) | O→S | pinned piece is the only guard of a S piece | pinned sq, guarded sq | "A pinned piece guards nothing. Your bishop on d2 looks like it holds c3, but it can't leave the pin." | "So c3 is really loose." | — | spotCue free-piece `false-guard` | after | pinned piece's move is legal (absolute vs relative) → use `pinnedToMore` | C |
| DT-S1 | knowledge (skewer) | O | T=skewer | slider, front, back | "A skewer is a pin in reverse: the big piece in front must move and the one behind falls. Their bishop drives your queen off and takes the rook on a8." | back piece lost | — | spotCue skewer | after | `isRealSkewer` false | H |
| DT-M1 | recognize (mate threat) | O | T=mate_threat, beneficiary O, unstoppable=false (stoppable) | mating piece | "When they threaten mate, nothing else on the board matters. Their queen on h4 mates next move." | "Every other plan waits until it's stopped." | "Nf3 was the move — it covered h2." (C: square the best move covers) | spotCue mate | after | `skipMateAgainst` already said it | H + C |
| DT-B1 | knowledge (back rank) | O | T=back_rank, king S | king sq, invader from | "A king with no escape square is mated by any rook that reaches its rank. Your king on g1 has no luft and their rook on e8 can get to e1." | "One check on the rank and it's over." | "h3 was the move — it gave the king a square." (C: luft pawn move) | spotCue mate `back-rank` | after | luft exists; invader dies (`survives`) | H + C |
| DT-R1 | knowledge (removal of guard) | S/O | T=removal_of_guard | guard, target | "A piece held by one guard falls when the guard goes. Their bishop on e7 is the only thing holding the knight on f6." | "Take the guard and the knight is loose." | (S missed) "Bxe7 was the move — it took the knight's only guard." | spotCue removing-the-guard | after | guard is king (:516); target recaptures guard (:523) | H (guardRemovalLine) |
| DT-O1 | knowledge (overload) | S/O | T=overload | guard, 2 targets | "A piece guarding two things guards neither: take one and it can't hold the other. Their queen on d8 holds both the bishop on g5 and the knight on d7." | "Whichever it takes back on, the other falls." (from comment :606 → field) | — | spotCue overload | after | targets < 2 | B2 → H |
| DT-D1 | knowledge (discovery) | O | T=discovery, tempo move exists | blocker, slider, target | "A discovered attack is two threats in one move: the piece that moves makes its own threat while the one behind it hits too. Their knight on e5 unmasks the bishop on b2 at your rook." | "You can answer one threat, not both." | — | spotCue discovered-attack | after | no tempo move (:479) | B2 (tempo move) |
| DT-BT1 | calculate (battery) | O | T=battery, target attacked ≥ defended | pair, target | "Two pieces on one line count twice. Their queen and bishop on the diagonal hit your knight on g5 twice; it is guarded once." | "One more and it falls." | — | spotCue free-piece `underdefended` | after | count shows target safe → SILENT (furniture rule :654) | C (count) |
| DT-T1 | trapped piece | O | T=trapped_piece | piece | → defer to `findTrappedPiece` card (same `trappedAt`) | | | | | dup | H |
| DT-H1 | hanging | O | hangingPieces after S move, S colour | piece | → defer to `explainTemptingCapture` / errorWhy lost-the-piece | | | | | dup | H |
| DT-X1 | prevent (new this move) | O | pattern ∉ detectTactics(fenBefore) | sig diff | "Every move changes what the other side can do. Your last move let their knight reach c2." | | best move | spotCue | after | pattern already existed → errorWhy's `causedByTheMove` says it was not caused | C (reviewMoveBriefing.ts:142 pattern) |
| DT-PH | phase (endgame) | both | T=fork/skewer, queens off | — | "In the endgame a king fork or skewer by a rook decides it: every piece left matters." | | | | | — | C (material count) |
| DT-M2 | both seats (their slip allows mate) | S | T=mate_threat, beneficiary S, S to move, after O's move | mate.from piece | "When their king has no room, look at every check first: one of them may leave no square." | "There's a mate on the board." | (Review only: the mating move) | "Checks first, every move." | Learn: the move and square HELD — the student's find (errorWhy E1o) | never name mate.from/mate.to before S moves | H (involvedSquares) |
| DT-REC | record | — | hold rate of motif tag | — | RED/GREY full; AMBER: "Their knight forks king and rook." (one clause); GREEN: silent | | | | | | holdRate |
Angles n/a: own plan / their plan / strategize — this computer reads static shapes, not plans (see pictureVerdict/planThread). Counterfactual handled by DT-X1. Exception: fork of two DEFENDED pieces wins nothing — already a gate (:105), never said.

## E. Mistake link
- costReason `allowed` + motif fork/pin/skewer/back_rank/discovered_attack/overloaded_piece/removing_the_guard/trapped_piece (motif from `detectTacticType`, costReason.ts:227): DT-F1/P1/S1/B1/O1/R1/D1/T1, seat O (student's mistake allowed it).
- costReason `missed` + same motifs: DT-F2/R1/O1 seat S (Review "you had").
- whyItFailed `abandoned-square` / declared `walks-into-fork`: DT-F1 + DT-X1.
- mate: DT-M1/DT-B1.
- Battery DT-BT1: Review/chat only unless the count shows a loss (then attackerDefenderCount owns it).

## F. Build changes
1. tacticsDetector.ts:121-151 — add `winnable: Square[]` and `forkerToMove` to the fork `TacticPattern` (optional typed `detail` field on TacticPattern, types/tacticTypes.ts) → DT-F1 consequence names the falling piece.
2. :347-359 back rank — invader is already in involvedSquares; add typed `detail.invader` so the recipe does not index by position → DT-B1; compute luft move (pawn in front of king that can step) for BETTER-MOVE.
3. :511 removal — replace `attackersOfSquare` (types) with `chess.attackers(guardSq, color)` (squares) and carry the cheapest taker's square → DT-R1 better-move.
4. :629-660 overload — carry both targets as `duties` and emit consequence field "whichever it takes, the other falls" → DT-O1.
5. :466 discovery — turn `.some` into `.find` and carry the tempo move (from/to, gives check?) → DT-D1.
6. boardComputers.ts:2343 — stop saying the description sentence; hand `{type, squares, detail}` to the recipe table `mistakeLesson` keyed by motif — translated through `tacticVocabulary.ts` (`discovery`→`discovered_attack`, `removal_of_guard`→`removing_the_guard`, `overload`→`overloaded_piece`; the recipe keys on `TacticType` only, never the board-side `TacticPatternType`); delete battery sentence unless DT-BT1 count condition holds (B4 furniture rule extended to "and it wins nothing").
7. Surfaces: Learn reads this through errorWhy's motif only (mistake turns); keep `learn: { not }` for the free-standing shape.
8. HABIT: recipe reads `spotCueLine(motif, seat, spotBoard)`; record gate via holdRate of `tagsOfMotif`.

## G. Proof boards
- No saved board in boards-?.jsonl (computer is Review-only, games). Text proofs (lines-0.jsonl, review): "Their queen and bishop form a battery on the diagonal, bearing down on your knight on g5." (DT-BT1 candidate — must pass count); "Their knight on g6 is the only defender of their knight on e5 — and it can be taken." (DT-R1); held: "Your queen is overloaded — it's the only defender of both your dark-squared bishop and your light-squared bishop." (DT-O1).
- Guard: pinPressure board vc-_X7t6o3o6JM-30 `2r2r1k/pp2Npb1/4bnp1/2n1N2p/5BPP/4PP2/PPPq4/1K1R1B1R w - - 1 16` — pin of e-pawn to bishop (pin to a minor): must route to pinPressureConcept, not DT-P1 queen-pin wording.
- Not run (no scratch run needed — logic read).

## H. Open questions
1. Is a battery that wins nothing ever a lesson (furniture) — keep it Review-only or delete? (David's 2026-08-16 call covered aim; the count condition is new.)
2. Should a tactic that EXISTED before the student's move (not caused) be said on the mistake turn at all, or only the caused one (errorWhy `causedByTheMove`)?
