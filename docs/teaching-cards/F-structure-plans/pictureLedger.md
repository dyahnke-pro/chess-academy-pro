# Card — `pictureLedger` (family F)

### A. Identity
- `pictureLedger(facts, fen, lines)` — `src/services/pictureLedger.ts:1016` → `ledgerOf` :427 (assets / weaknesses / unreached per side, `accessOf` :398, traits `weakPawnTraits` :222, `weakPieceTraits` :242, `weakKingTraits` :261, `assetTraits` :330, `tiedGuardOf` :296); renderer `ledgerText` :1048, `worstWeakness` :1069.
- Adapter `boardComputers.ts:8013-8040`, kind `stock`; skill `missed-opponents-threat` when the student is to move and their target-now exists; record wired. Census: 1,102 / 666 said. Map: **P (list)**.

### B. Facts
- **B1** `Ledger` {fen, w, b: SideLedger {assets, weaknesses, unreached}}; `LedgerEntry` {side, kind, object, square, piece, traits, factIds, access {attackers, levers, defenders, pawnGuards}, tied, working}.
- **B2 dropped**: `unreached` weaknesses are kept but never said (correct — they don't count); `access` counts dropped from the text ("You can get at their weak spot: the pawn on e4" — no count, no why); `traits` reduced to a noun ("isolated").
- **B3 cheap**: ledger diff across a move — an entry ADDED to the student's weaknesses (or an asset lost) by the student's move = the move's positional cost, itemised.
- **B4 gates**: entries only from facts with ledger roles (`LEDGER_ROLES` :396, filter :433) on the same board; a weakness counts only when reached (`reachable(access)`, :449/:459) — else `unreached`.

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
| LG1 | consequence — S's move added a weakness | S | B3: new S weakness entry after S's move, cost ≥ inaccuracy | entry, trait, access | `Record<WeakTrait, stem>` (pictureLedger.ts:200-205, exhaustive) — isolated: "A pawn no other pawn can guard needs a piece to babysit it." · piece-guarded / `tied`: "A pawn held only by a piece ties that piece down." · hole: "A square no pawn can guard is a home for their knight." · doubled: "Doubled pawns can't guard each other." · backward: "A backward pawn on a half-open file is a target, and the square in front of it is theirs." · open-file: "A pawn at the end of an open file is the rooks' first target." · outnumbered: "Count it: more of their pieces hit it than yours guard it." · no-safe-square: "A piece with no safe square is lost the moment it's attacked." · loose: "A piece nothing guards can be taken for free." · king-centre: "A king left in the centre is a target once lines open." · king-file: "A king on an open file is waiting for a rook." | access ("their knight reaches it") | engine best | "Before every move, ask what new weakness it leaves." | after | entry ends `unreached` | C (B3) |
| LG2 | asset lost | S | an S asset entry gone after S's move | | `Record<AssetTrait, stem>` — open-file: "Don't trade your working piece: the rook on the open e-file was your best piece." · outpost: "A knight on an outpost is worth more than the piece you traded it for." · passed: "A passed pawn is an asset you keep, not one you trade." | | best | | after | | C |
| LG3 | their weak spot reached | O | (the standing list) | | (existing ledger text) | | | | chat/Review only | | H |
| LG5 | both seats — their move added a weakness | O | B3 diff on THEIR move (new O weakness, reachable by S, their cost ≥ mistake) | entry, trait | the same `Record<WeakTrait>` stem, seat flipped ("…ties their bishop down") | | — | — | Learn: lesson only, the target square held while reaching it is the student's next move | entry `unreached` | C (B3) |
| LG4 | record | — | RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- Cause names (errorWhy §D): LG1 → **E15 positional** concessions `pawn-weakened` / `outpost-conceded` / `piece-offside` by trait, or **E6 left-hanging** for `loose`/`no-safe-square` when it falls in the window; LG2 → E15 (no tag names "traded the good piece"; `bad-trade` is the nearest record tag); LG5 their side.
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
