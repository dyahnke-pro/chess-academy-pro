# detectTradeCreatesPin — a capture that walks into a pin

## A. Identity
- File: `src/services/latentDanger.ts`: `detectTradeCreatesPin(fen, studentColor)` (185–187) → `detectTradesCreatingPin` (193–218); renderer `tradeDangerClause(d, fen)` (227–243) → `renderTradePin`. Origin comment 176–183.
- Registry: `boardComputers.ts` `tradeDanger` (2864–2884), kind `latent-danger`, seat `opponent`, skill `bad-trade`, said about the board after the capture.
- Reach: learn door, chat, tapped, weaknesses (review/lesson/tactics no). Census: 15 lines (6 said): learn 7 ("Before you take on e3, look past the trade: your dark-squared bishop would stand between their queen and your queen, all on one file — a pin."), chat 8; held 9 `in-flux`. Run: called on the board AFTER each move it returned nothing every time — it only reads a board where the student is to move (196), i.e. it can only warn before a capture, never explain one played.

## B. Facts
- **B1** `TradeDanger` = `LatentDanger` + `tradeFrom`, `tradeTo` (the capture that creates the alignment).
- **B2 dropped:** captures that LOSE material are skipped (215) — the reason is not kept; the list beyond `[0]` (186); the `before` set (the lines that already existed).
- **B3 cheap:** the same scan for the move PLAYED (one capture, not all): `createsPin(fenBefore, playedSan, student)` — that turns the pre-move warning into a post-move cause; whether the pin then wins material (SEE on the front piece).
- **B4 gates:** student to move only (196); captures that lose material by SEE skipped (215); a NEW alignment only (198 `before`, 219). One ply only — "the recapture-creates-it case (2 ply) is a later refinement" (183).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "look past the trade: … a pin" | — |
| CONSEQUENCE | partly | "a pin" | what it wins |
| BETTER MOVE + JOB | no | — | the move that avoided it |
| HABIT | partly | "look past the trade" | — |

## D. Lesson recipes
Cause **TP-PIN** (S): the student's capture created the alignment (B3 on the played move) and cost ≥ floor; **TP-PIN2** (S, F2): the recapture created it.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TPN1 | consequence (look past the trade) | S | TP-PIN | front, back, enemy, line | "Look past the trade: after it, your {front} stands between their {enemy} and your {back} — a pin." / "A capture can line your own pieces up for a pin; check the line it lands on." | "The {front} can't move{, and it falls}." | "{best} took differently / didn't take." | "Before you capture, look at the square you land on: what lines run through it?" | full; "your capture", never its name | the pin wins nothing (SEE ≤ 0) | C (B3) |
| TPN2 | knowledge (recapture order) | S | TP-PIN2 | — | "Which piece takes back matters: the wrong recapture lines up your {back} behind it." | | "{best} recaptured with the {piece}." | | full | — | C (F2) |
| TPN3 | opponent seat | O | their capture created a pin on themselves, the student missed it | — | "Their capture lined their {back} up behind their {front}: pin it." | | "{best} pinned it." | | full | — | C (call with their colour) |
| TPN4 | record | S | `bad-trade` | — | RED/GREY full · AMBER "Look past the trade." · GREEN silent | | | | | | H |

Not applicable: plan / phase / structure.

## E. Mistake link
- Student: `costReason` **allowed** motif `pin` whose first blow lands on the line the student's capture created; skill `bad-trade` (shared with `tradeJudgement` — one tag, two causes: F3).
- Opponent: TPN3.

## F. Build changes
1. Add `createsPin(fenBefore, san, student)` (B3): the post-move form; the pre-move scan of every capture stays for chat ("is this trade safe?") only.
2. Two-ply: replay the recapture on the line (`tradeTo` recaptured by the opponent's cheapest, then the student's recapture) — closes 183's TODO for TPN2.
3. The skill `bad-trade` is filed by both this and `tradeJudgement` (computerRoles 102) for different causes — split into `trade-into-pin` here so the record says which habit failed.
4. Delete the pre-move "Before you take on e3" Learn speak (all 7 Learn census lines).

## G. Proof boards
- Census (Learn, said): lines-0.jsonl:2558 "Before you take on e3 … your dark-squared bishop would stand between their queen and your queen, all on one file"; lines-0.jsonl:7282 "Before you take on a3 … your d-pawn".
- Held: lines-1.jsonl:242, 1334 (`in-flux`).
- No played-move board yet: the computer has no played-move form (the run's after-move calls all returned empty, by design at 196). F1 must land before a mistake board can be listed; the census pre-move boards above are the boards to replay with F1.

## H. Open questions
- none.
