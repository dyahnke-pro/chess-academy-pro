# Card — `backRankWeakness` (no luft, one guard)

## A. Identity
- File: `src/services/kingSiege.ts` — `backRankWeakness` (:342), `backRankLine` (:393), `backRankSquares` (:405). Also read by `kingReadsOn` (:649 → chat `groundedAnswer.ts:1887`).
- Registry `boardComputers.ts:4034` (`backRankWeakness`), kind `king-read` → group tactics. Fires only on the move that CREATES it (`backRankWeakness(fenBefore)` → skip, :4043). `namesStudentMove: true` when the student is the attacker (the mating check is the student's move → held in Learn).
- Census: 8 fired / 7 said (held once `beside-mate`).

## B. Facts
- **B1** `BackRank` (:317): `defender`, `king`, `check {san, from, to}` (the attacker's rook/queen check on the home rank, :369-370), `guard {square, piece}` (the ONE piece every answer uses, :377-378), `key`.
- **B2 dropped**: the luft scan (:351-360) knows, per square in front of the king, whether it is blocked by an OWN piece (`continue`, :356) or attacked (`hit`, :357) — i.e. WHY there is no luft (own pawns vs their control) is dropped. `found[]` (:371) may hold several mating checks / guards; only `found[0]` is handed (:390). Heavy pieces adjacent to the king excluded (`close`, :363) — dropped reason.
- **B3 cheap**: `luftMoves` — for each own pawn on the king's file ±1 directly in front, push it one step on a probe board and re-run `backRankWeakness`; a push that returns null is the luft move (chess.js only). `guardJobs` — what else the guard defends (attackers/defenders on squares it covers) → the "overloaded" consequence. `secondGuard` — whether a second piece covered the rank on fenBefore (the move that removed it is the cause).
- **B4 gates**: king on its home rank (:348); every square in front occupied by own piece or attacked (:351-360); attacker has a rook/queen not adjacent to the king (:364-365); the check is not already mate (:370); no king reply (:376); exactly one guarding piece (:378); guard removed ⇒ same check mates (:382-386). Registry: new on this move only.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `backRankLine` has the rule's pieces ("no luft", "only your bishop guards the back rank") | phrased as a general rule; why no luft (own pawns) |
| CONSEQUENCE | yes | "if it leaves, Rxf1 is mate" | (Learn must not name the student's mating move: attacker seat already held) |
| BETTER MOVE + JOB | no | — | `luftMoves` (B3): "h3 gave the king h2" |
| HABIT | no | — | record `back-rank` / `missed-opponents-threat` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR1 | KNOW/RECOG | S defender | new weakness after the student's move (cost attached) | king, guard | "A king on the back rank with no luft is one guard away from mate: only your {guard} holds the rank now." / "Your own pawns are a wall that also traps the king: with no luft, the {guard} is all that stops mate." | "If the {guard} has to leave, {check} is mate." (their move — may be named) | "{luft} gave your king a square and the {guard} its freedom." (once past) | "When one piece holds your back rank, make luft before it has another job." | "Your back rank has one guard now — the {guard}." | weakness existed before the move (registry skip) | H; C luftMoves |
| BR2 | CONSEQ (tied) | S defender | guard also guards another piece (B3 guardJobs) | guard, its other job | "A piece holding the back rank can't do anything else: your {guard} guards the rank, so {target} is really undefended." | "Take it away from {target} and the rank falls." | — | BR1 habit | — | guardJobs empty | C |
| BR3 | IDENT (attacker) | S attacker | their move made it (their mistake) | guard | "When one piece holds their back rank, that piece is the target: chase it, trade it, or overload it." | "Without the {guard}, the check on the back rank mates." | — | "Look at their back rank every time a rook or queen can reach it." | after THEIR move: "Their back rank has one guard now." (mating move held, `namesStudentMove`) | fact names the student's mating move → Learn holds the check | H |
| BR4 | CONSEQ (the trade/move that removed the 2nd guard) | S defender | `secondGuard` on fenBefore, student moved/traded it | removed piece | "Every trade near your back rank counts its guards: after the {piece} left, one piece is all that holds it." | as BR1 | "{best} kept both guards." | BR1 | — | — | C secondGuard |
| BR5 | combo + errorWhy mate | S defender | costReason allowed mate on the home rank | — | "Back-rank mates come from the move that takes the last guard away — here it was the {guard}'s duty that lost." | "It's mate." | "{luft}" | BR1 | "That let a back-rank mate in." | — | H costReason |
| BR6 | counterfactual missed | S attacker | costReason missed, line is the back-rank check | — | "Their king had no luft and one guard: a back-rank king is always a target for a deflection." | — | "{deflection} pulled the {guard} away." (Review) | BR3 | — | — | H |
| BR7 | phase | both | any phase, queens off | — | "In rook endings the back rank still kills: a king with no luft loses to one rook check." | — | — | — | — | — | H |
| BR8 | exception | — | luft square attacked by their piece | — | "Luft only counts if the square is safe: h2 is covered by their bishop, so it is no luft at all." | — | — | — | — | own pawn blocks luft (then it's BR1) | B2 (expose why) |
| — | STRAT/PLAN own | — | n/a — the plan form is BR3/BR6 | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "One guard on your back rank — make luft." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `costReason` `allowed` + mate (back-rank line) → BR5; `allowed` + material where the line deflects the guard → BR2/BR4; `positionalReason` none today (no tag) — owed: `back-rank` slip tag if the record has one (H).
- Opponent's mistake: BR3 (student's chance, mating move held).
- Student missed: `costReason` `missed` + mate on their rank → BR6.

## F. Build changes
1. `kingSiege.ts:351-360` — record `luftBlocked: Array<{square, by: 'own' | 'attacked'}>` on `BackRank`. Enables BR1 second stem, BR8.
2. `kingSiege.ts:390` — hand `all: BackRank[]` (every mating check/guard pair) instead of `found[0]` only.
3. New pure helpers in `kingSiege.ts`: `luftMoves(fen, defender)` (B3) and `guardJobs(fen, guard)`; typed fields on the fact. Enables BR1/BR2 better move.
4. `boardComputers.ts:4043` — keep "new on this move", and add `secondGuardRemoved: {square, piece} | null` from fenBefore (BR4).
5. Recipes BR1–BR6 into `mistakeLesson.ts` (causes `allowed+mate:back-rank`, `allowed+deflection`, `missed+mate`). `backRankLine` is kept for chat; in Learn the recipe replaces it.

## G. Proof boards
- BR1 (student's king): `vc-_X7t6o3o6JM-47` `3R4/pp4k1/4br2/2nN3p/8/4P3/PPP5/1K3B1R b` — said "only your rook on h1 stops Rxf1 from being mate"; review `lines-0.jsonl#4080` ("Only your bishop on d3 guards the back rank").
- BR3 (their king): `vc-3nyxVHwDCTY-68` `2r3k1/1p3p1p/3p2p1/3Pp3/1P2q3/6P1/P2Q1P1P/6K1 w` — "Only their queen on d2 guards the back rank — pull it away and Rc1 is mate".
- Guard: `lines-2.jsonl#403` held `beside-mate` (a mate already on the board — the mate card speaks instead).

## H. Open questions
- Is it David's call to name the luft move ("h3") in Learn after a back-rank blunder, since it is the better move once past? (Card assumes yes, per carve-out 3.)
