# Computers batch 5 — trades, defence and conversion, principles

Branch `claude/computers-batch-5` (base `claude/reads-rotation`). One new leaf,
`src/services/exchangeIdeas.ts`, holds all sixteen board reads; a phrase bank,
`src/services/factImagery.ts`, holds the imagery. Every read is pure (chess.js,
the static exchange, engine lines handed in), carries a `Proof` (a legal line
played out, the squares marked, or a count), and speaks as one of three new fact
kinds through the one door.

## The one door

Three kinds, added to BOTH vocabularies (review `[tag]` and live `ClauseKind`),
so `FACT_ROLE` / `FACT_LAYER` / `FACT_PROOF` / `TIE_ORDER` answer once:

| kind | role | layer | proof | tie |
|---|---|---|---|---|
| `trade-idea` | teach | safety | proven | 66 |
| `defence-idea` | teach | safety | proven | 67 |
| `nugget` | teach | principle | proven | 29 |

Staked reads (the abandoned duty, the threat made to cost, the simplest win)
order by their stakes; the rest by the tie table.

**Surfaces.** `exchangeIdeas()` is the one aggregator.
- **Learn live / phase transitions / read-position / chat position reads** —
  `positionFacts.computePositionFacts` emits each read as a clause with its
  proof, squares, stakes and claim; the claim is returned in `remember`, so a
  standing read (duty parity) is said once a game. A read that names the
  student's next move (the simplest win, the wing-pawn line) speaks only where
  the door's move advice allows (`nameMove`, same gate as the depth).
- **Review** — `reviewFullData.computeMoveFacets` emits `[trade-idea]` /
  `[defence-idea]` / `[nugget]` facets with proofs, squares and stakes, keyed
  `hint:<claim>` so each is said once per game.

## Per act

| act | status | computer | diagnose |
|---|---|---|---|
| Trade off their only developed piece | built | `onlyDevelopedTrade` | not a miss (a choice, not an error) |
| The defender's trade (both seats) | built | `defenderTrade` (reads `kingSafety.countKingAttack`) | not a miss |
| Exchange sacrifice for the key attacker | built | `exchangeForAttacker` — only when the engine graded it clean (< 50 cp); ungraded = silent | not a miss (the engine already grades it) |
| Deny the exchange their setup relies on | built | `denyExchange` — "the setup relies on" is read as the capture that would double your pawns; no opening knowledge invented | a missed denial is not a centipawn error, so no honest held/broken outcome |
| The duty a recapture abandons | built | `abandonedDuty` (mate on the back rank, or the guarded unit falls) | **wired**: `captureAbandonsDuty` poses the question in `capabilityEvidence.capabilitiesPosed` → `missed-opponents-threat` (mate) / `hung-material` (piece), held/broken by the move's cost on every surface that records evidence |
| Can they decline the trade? | built | `tradeChoice` — the concrete form: if they take first, your only way back doubles your pawns | not a miss |
| Duty parity | built | `dutyParity` (said once a game) | not a miss |
| Maintenance trade | built | `maintenanceTrade` — "attacked more often than defended", the exact count, not "can't be held" | losing the pawn instead is already `hung-material` via the cost |
| Prepare the recapture | built (extends `recaptureChoice`'s ground, which runs only after the capture) | `prepareRecapture` | not a miss |
| Make the threat cost them | built | `threatCost` — the threat still stands, the answer exists only because of the move | not a miss |
| The simplest clean win | built (beside `conversionMethod`) | `simplestWin` — a forced mate, else a clean material grab, among two or more winning engine lines | preferring a harder win is not an error |
| Safe only because of an earlier move | built | `safeBecause` + `previousOwnMove` (counterfactual: the earlier piece put back) | not a miss |
| Wing pawn for centre pawn | built | `wingForCentre` along the engine line (live: the student's line when the move is earned; review: the line after the played move) | not a miss |
| Material arithmetic in words | built | `materialArithmetic` — said only when a capture made or changed an imbalance on a settled board, and only when the balance is level or a pawn; never a point total | not a miss |
| A knight is worth its squares | built | `knightSquares` — rim move (theirs, or yours when it cost) and back to the centre | a rim move that costs is already graded by cost |
| Don't block the c-pawn in d-pawn openings | built | `cPawnBlock` — never on the engine's own move | **skipped**: a blocked c-pawn rarely costs a mistake, so `movePlayedCleanly` would record "held" on the very move that blocked it; a false green is worse than none |
| Phrase bank (imagery) | built | `factImagery.imageryFor`, keyed on the fact kind, rotated on the position (`rotateStem`), with a quiet turn; wired onto every batch-5 read and the review's `[badbishop]` facet ("A walled-in bishop bites rock.") | phrasing only |

## Files

- `src/services/exchangeIdeas.ts` (new) — the sixteen reads + aggregator + `captureAbandonsDuty`.
- `src/services/factImagery.ts` (new) — the imagery bank.
- `src/services/reviewFacetRank.ts` — three kinds in the shared tables (additive).
- `src/services/positionFacts.ts` — three `ClauseKind`s; the live wiring; `remember`.
- `src/services/reviewFullData.ts` — the review wiring; `[badbishop]` imagery.
- `src/services/capabilityEvidence.ts` — the abandoned-duty question posed.

## Tests

`src/services/exchangeIdeas.test.ts` — 25 tests. Every read on a real,
chess.js-legal board with a silent case beside it; voice checks on every read
(no we/our, no point totals, no move numbers); the door tables; the move-naming
gate; review facets carry the proof; the Learn composer speaks duty parity and
returns its claim in `remember`; `capabilitiesPosed` carries the abandoned duty.
