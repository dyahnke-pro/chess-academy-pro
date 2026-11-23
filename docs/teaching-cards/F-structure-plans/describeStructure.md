# Card — `describeStructure` (family F)

### A. Identity
- `describeStructure(fen)` — `src/services/boardStructure.ts:245-260` (`computePawnFacts` :95, outposts, king facts, material facts); plus `structureSignature` / `lockedPawnPairs` :287 in the same file.
- Adapter `boardComputers.ts:~1985-1999` (key `structure-state`, kind `structure`, `NO_PROOF.description`) — a joined description ("passed pawns white d5 · isolated pawns …").
- A SHARED DATA SOURCE: 56 production call sites (`describeStructure(`) — passedPawnPush, pawnMajority-adjacent reads, gameThemeClassifier, pvPlayback.
- Census: 648 fired / **0 said** (review only; unsupported 498, in-flux 99, beside-mate 51) — the teaching map's "computed and never said".

### B. Facts
- **B1** `StructureFacts` :65-70: `pawns` {pawnFiles, islands, openFiles, halfOpenFiles, passedPawns, doubledFiles, isolatedPawns} per side; `outposts` [{color, piece, square}]; `kings` {kingSquare, kingWing, oppositeWings, shieldPawns}; `material` {balance, nonPawnTotal, queensOn, endgameType}.
- **B2 dropped**: none inside — the fact is a pure read; the adapter drops everything into a "·"-joined string with no proof.
- **B3 cheap (the diff)**: `describeStructure(fenBefore)` vs `(fenAfter)` of a move gives every structural CHANGE: an island added, a file half-opened, an isolani made, a passer created, a shield pawn lost. That diff is the cause of most structure mistakes and nothing computes it in one place.
- **B4 gates**: valid FEN only.

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | description only | the change (B3) and the rule per change |
| CONSEQUENCE | no | — | — |
| BETTER MOVE + JOB | no | — | — |
| HABIT | no | — | — |

### D. Lesson recipes (all via the B3 diff — the computer itself never speaks)
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DS1 | knowledge — islands | S | islands[S] +1 by S's move, cost ≥ inaccuracy | count | "The fewer pawn islands you have, the easier your pawns are to defend: that trade made a third island." | | engine best | "Before a capture with a pawn, count your islands." | after | other computers already explain the same pawn (frozenTarget, isolated) → subsumed | C diff |
| DS2 | shield | S | shieldPawns[S] dropped, queens on | | "Every pawn that leaves your king's cover is a door that won't close." | | engine best | | after | ending | C diff |
| DS3 | half-open file given | S | halfOpenFiles[O] gained a file, O has a rook | file | "When your pawn leaves a file, their rook gets it: the c-file is half-open for them now." | | | | after | O no rook | C diff |
| DS4 | opposite wings | either | oppositeWings became true | | "Kings on opposite wings means a race: whoever opens lines first wins." | | | | Review | | H |
- Not applying: everything else — the standing description itself is never said (deleted from Learn).

### E. Mistake link
- DS1-DS3 are the shared detector for `positionalReason` concessions `pawn-weakened` / `file-opened` (concessionBeat) — describeStructure's diff can CONFIRM them; the lesson words come from the specific computers (frozenTarget, pawnBreak, centreDuo).

### F. Build changes
1. Add `structureDiff(fenBefore, fenAfter): StructureChange[]` beside `describeStructure` (islands, files, isolani, passers, shield) — one shared change reader for every structure recipe.
2. Delete the `structure-state` description fact (boardComputers adapter) from Learn and Review voice (it is never said — 0/648 — and is pure description).

### G. Proof boards
- Never said; nothing to prove. The diff is to be proven in the build on David's Bxf6 game (no structure change — guard: DS rows silent) and on any recapture that doubles a pawn.

### H. Open questions
- none.
