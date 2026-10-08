# Computers batch 4 — attack, sacrifices and kings

Branch `claude/computers-batch-4` (base `claude/reads-rotation`).

## The shape

One new pure leaf, `src/services/kingAttackReads.ts` (chess.js + the engine
lines handed in; no Dexie, no LLM, no randomness — stems rotate on the move
number). Every read returns a `KingRead` whose `proof: Proof` is REQUIRED: a
read that cannot build its proof (a played line through `legalLineProof`, the
squares through `squaresProof`, or an exact count) returns null.

**One new fact kind, `king-read`**, added to both vocabularies (FacetTag and
ClauseKind, like `method`), with one entry in each shared table:
`FACET_RANK` 79 · `FACET_ROLE`/`CLAUSE_ROLE` teach · `FACT_LAYER` safety ·
`FACT_PROOF` proven · `CLAUSE_TIE` = its facet rank. `matchClauseKind` joins it
to the student's checkmate / back-rank / missed-threat holes (the need term).

**TEACH wiring**
- Live (Learn live, phase/read-position, "Why?" — every caller of
  `computePositionFacts`): the one producer `thinkAloud.depthClauses` calls
  `kingAttackReads` on the student's move and emits `king-read` clauses with
  squares, stakes, claim, lines and the proof. `DepthClause.proof` is new and
  `positionFacts` carries it onto the `ClauseItem`, so the door sees it. Where
  the move is held back, the read's IDEA speaks and its proof is
  `NO_PROOF.withheld` (a proof must not hand over the find).
- Review: `reviewFullData` §7e — on a student ply whose move was not the
  engine's best, the move-naming reads computed from the best line
  (`kingReadsForBestLine`) become `[king-read]` facets with squares, proof and
  stakes. Never on the move they played (G4.5.2). The two reads one line cannot
  prove (`material-not-mate`, `probing-check`) are excluded there.

**DIAGNOSE wiring** — `moveInsight.positionPosed` (the one "what did this
position pose" computer every evidence writer calls) now runs the same reads
and maps each to a capability through `KING_READ_POSED`
(`Record<KingReadId, …>`, so a new read fails to compile until it is decided).
`autoAnalyzeGame` passes the annotation's best line so the mate read can play
it out. Held/broken is decided by the existing `recordCapabilityEvidence`.

## Per act

| act | status | computer |
|---|---|---|
| Mate or material | **built** — `mateOrMaterial`: the best line played to checkmate on the board (exact) + a rook-or-more capture that is not the mate → "Leave their rook on d4 — … starts a mate they can't stop". Converse only when NO handed-in line mates, the best takes a rook+ with check and the king is under fire. Diagnose: `missed-tactic` / `overvalued-attack`. | new |
| Attack race across wings | **built** — extended `planRace` with `storm-race`: opposite-side castling, each side's running, already-started storm pawn, unit = pushes until it attacks a pawn of the king's cover (same plan kind, same terminal event — G4.5.3). Mover wins a tie. Speaks in review through the existing `[plan-race]` facet and live as a `king-read`. Diagnose: none — a standing race the move does not answer. | extended `planRace` |
| Castling geometry | **built** — `stopsCastling` (the best move newly covers a transit square of a wing they can still castle to: "Bishop takes b4 — and it sees f8, so they can't castle short") and `ownCastlingBlocked` (your right, their piece on your transit square). Diagnose: `missed-tactic` (stops-castling). | new |
| Break chooser | **built** — `breakChooser`: a central d/e lever answers a two-pawn flank build-up; a flank lever when the d/e pawns are locked head to head. Diagnose: `mistimed-pawn-break`. | new |
| Lure the king | **built** — `lureKing`: their king uncastled with the short right, the best move (quiet) opens your bishop/queen onto h7/g7 (h2/g2). Said as aim, never as intent ("exactly where their king lands if they castle short"). | new |
| Probing check | **built** — `probingCheck`: best is a non-capturing check, no mate in the line, the king has two or more squares and the engine's reply is a king move. Proof: the king's squares. | new |
| Division of labour | **built** inside `mateOrMaterial`: each student piece followed square to square through the mate line; pieces given up on the way are dropped ("Your rook goes to h7 and your other rook to a8 — mate."). | new |
| Sacrifice's conditions in defence | **built** — `sacrificeConditions`: when castling short is best and their bishop eyes h7/h2, the sacrifice is PLAYED (Bxh7+ Kxh7, then Ng5+ Kg8) and the missing piece is named (no knight reaches g5, or the queen cannot reach the h-file). Silent when the attack has both. Diagnose: `king-stuck-center`. | new (sibling of `moveInsight.greekGift`, which teaches the attacking side) |
| Sacrifice ledger (worst case, declined branch) | **skipped** — needs a second engine search on the accepted AND declined branches ("at worst a perpetual" is a claim about both). No caller supplies those lines and `onlyMoveSequence.ts` does not exist on this base. Computing it from one PV would fake the declined half. | — |
| Standing sacrificial target | **built** — `sacrificeTarget`: a square beside their castled king or on its cover two ranks in front (h6 / g3) holding their piece, attacked by 3+ of yours, defended by fewer, and no plain capture wins (that is a hanging piece, not a target). Hedged: "may land". | new |
| King's square by future checks | **built** — `kingSquareByChecks`: the best move is a king move; another king square lets them check; the check is played as the proof. Diagnose: `missed-opponents-threat`. | new |
| King sheltering on the attack line | **built** — `ownPieceShelter`: their king on your slider's line with exactly one of YOUR pieces between, and that piece has a legal move off the line (a discovered check in waiting). Distinct from `tacticClassifier.detectDiscovery`, which fires only after the move. | new |
| King's diagonal walk | **built** — `kingDiagonalWalk`: queenless ending, best is a diagonal king step nearer both their pawn and yours, and no straight step does both. Exact count proof. Diagnose: `passive-king-endgame`. | new |

## Files touched
- `src/services/kingAttackReads.ts` (new), `src/services/kingAttackReads.test.ts` (new)
- `src/services/planRace.ts` — `StormRace`, clause, proof
- `src/services/thinkAloud.ts` — `DepthClause` gains `king-read` + `proof`; producer hook
- `src/services/positionFacts.ts` — `ClauseKind` + rank + proof carried
- `src/services/reviewFacetRank.ts` — the `king-read` row in each table
- `src/services/weaknessSignal.ts` — need join
- `src/services/reviewFullData.ts` — §7e review facets
- `src/services/moveInsight.ts` — `KING_READ_POSED` + `positionPosed`
- `src/services/autoAnalyzeGame.ts` — best line into `positionPosed`

## Tests
`kingAttackReads.test.ts` — 33 cases on chess.js-validated positions, each read
with a firing case and a silent one, plus the storm race (fires on opposite
wings, silent on the same wing), the producer handing the proof to the door,
the held-move case speaking the idea with the proof withheld, the diagnose path
recording `missed-tactic`, and review excluding what one line cannot prove.
