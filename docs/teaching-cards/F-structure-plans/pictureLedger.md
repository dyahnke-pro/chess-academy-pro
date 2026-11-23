# Card — `pictureLedger` (family F)

### A. Identity
- `pictureLedger(facts, fen, lines)` — `src/services/pictureLedger.ts:1016` → `ledgerOf` :427 (assets / weaknesses / unreached per side, `accessOf` :398, traits `weakPawnTraits` :222, `weakPieceTraits` :242, `weakKingTraits` :261, `assetTraits` :330, `tiedGuardOf` :296); renderer `ledgerText` :1048, `worstWeakness` :1069.
- Adapter `boardComputers.ts:8013-8040`, kind `stock`; skill `missed-opponents-threat` when the student is to move and their target-now exists; record wired. Census: 1,102 / 666 said. Map: **P (list)**.

### B. Facts
- **B1** `Ledger` {fen, w, b: SideLedger {assets, weaknesses, unreached}}; `LedgerEntry` {side, kind, object, square, piece, traits, factIds, access {attackers, levers, defenders, pawnGuards}, tied, working}.
- **B2 dropped**: `unreached` weaknesses are kept but never said (correct — they don't count); `access` counts dropped from the text ("You can get at their weak spot: the pawn on e4" — no count, no why); `traits` reduced to a noun ("isolated").
- **B3 cheap**: ledger diff across a move — an entry ADDED to the student's weaknesses (or an asset lost) by the student's move = the move's positional cost, itemised.
- **B4 gates**: entries only from facts with ledger roles (:395); a weakness counts only when reached in two moves.

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | list ("On your side of the ledger: the rook on e8 …") | the lesson per trait; it is a balance sheet |
| CONSEQUENCE | partly | access | — |
| BETTER MOVE + JOB | no | — | — |
| HABIT | partly (skill) | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LG1 | consequence — S's move added a weakness | S | B3: new S weakness entry after S's move, cost ≥ inaccuracy | entry, trait, access | per trait — isolated: "A pawn no other pawn can guard needs a piece to babysit it." / held-only-by-piece (`tied`): "A pawn held only by a piece ties that piece down." / hole: "A square no pawn can guard is a home for their knight." | access ("their knight reaches it") | engine best | "Before every move, ask what new weakness it leaves." | after | entry ends `unreached` | C (B3) |
| LG2 | asset lost | S | an S asset entry gone after S's move | | "Don't trade your working piece: the rook on the open e-file was your best piece." | | best | | after | | C |
| LG3 | their weak spot reached | O | (the standing list) | | (existing ledger text) | | | | chat/Review only | | H |
| LG4 | record | — | RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- LG1: `created-pawn-weakness` / `outpost-conceded` (concessionBeat) — the ledger diff itemises which. LG2: `misplaced-piece` / no cause for "traded the good piece". Skill `missed-opponents-threat` already filed by the adapter.

### F. Build changes
1. New `ledgerDiff(before, after)` → added weaknesses / lost assets per side (B3) — the shared positional-cost itemiser for LG1/LG2.
2. Delete the balance-sheet text from Learn ("On your side of the ledger: …") — a restatement (P, 1,102 fired).
3. `mistakeLesson`: concession kinds → LG1 by trait.

### G. Proof boards
- `vc-_JQ-AH3OYQ4-9` "Your weak spot they can reach is the pawn on d4, held only by the knight on e2." (tied — LG1 board when created by a move).
- `vc-_4xbS0Crtic-12` "On your side of the ledger: the rook on e8 … You can get at their weak spot: the pawn on e4." (the list — F2).

### H. Open questions
- none.
