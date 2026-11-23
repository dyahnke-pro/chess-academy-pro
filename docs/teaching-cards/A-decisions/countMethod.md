# countMethod — count before you take / before you land

## A. Identity
- `src/services/countMethod.ts`: `countMethod(fenBefore, playedSan, student, costCp)` :29; asked form `countWarning(fen, student)` :61 (chat only).
- Registry `countMethod` `boardComputers.ts:2675-2686`; kind `method`; key `countKey(square)`; stakes `{points: |net|, plies 0}`; seat `student`; role `teach`.
- Surfaces: lesson LESSON_READ, learn LEARN, review REVIEW, play/chat COMPOSER, tactics, weaknesses WEAK_PLAYED_JUDGED, think. Census: 5/5 said, review only.

## B. Facts
- B1: `{ text, square, net }` (:24) — net = signed SEE for the student, in points.
- B2 dropped: `att`, `def` counts (:41-42, :48-49); the captured piece type `m.captured` (:44); the moved piece type `m.piece` (:53); which enemy pieces are the attackers/defenders (chess.js `attackers()` lists them, only the length is kept).
- B3 cheap: the attacker/defender SQUARES and piece types (`before.attackers(sq, x)` already returns them); the cheapest attacker (why "guarded is not safe": cheaper attacker); what one more attacker would have changed (count +1 → SEE ≥ 0?) — a "prepare first" lesson; the move that adds that attacker (scan legal moves for one that raises `attackers(sq, student)` with SEE ≥ 0 afterwards).
- B4: `costCp >= MISTAKE_CP` (100, :30); student to move (:34); not a king move or e.p. (:38); capture branch: `def > 0 && att <= def` and net < 0 (:43-45); landing branch: `att > def` and SEE gain > 0 (:50-52).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | text: "Count before you take on f7: one … one …. Not enough" | names the counts, not the pieces; reads as a restatement + verdict, not a general rule with example |
| CONSEQUENCE | partly | net | words for what is lost ("you lose the bishop for a pawn") — compute from captured/moved piece + net |
| BETTER MOVE + JOB | no | — | best move from the grade; job "adds a second attacker" when B3 finds it |
| HABIT | partly | "Count before …" | is the habit, but fixed and record-blind |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CM1 | calculate (count) | S | capture branch fires | piece taken, sq, att, def | "A capture is only good if you come out ahead after all the trades. On {sq} you had {att} attacker against {def} defender, so the exchange runs against you." / "Count before you capture: the side with more pieces on the square wins the trades. On {sq} it was them." | "You give up the {moved} for the {captured}." (net) | "{best} kept the material." (grade) | "Before you capture, count attackers and defenders on that square." | after move; no square read twice | pins: count uses raw attackers, SEE uses legal — speak only when both agree (already gated) | H + C (net words) |
| CM2 | calculate (landing) | S | landing branch fires | piece, sq, att, def | "A piece is only safe where you have as many guards as they have attackers. On {sq} they had {att} against your {def}." | "The {piece} is lost in the trades." | best | "Before a piece lands, count who attacks the square and who guards it." | same | not when the landing is a deliberate sac the engine approves (cost gate covers) | H |
| CM3 | knowledge (cheaper attacker) | S | capture branch, def ≥ att but the cheapest attacker of theirs is worth less than the piece you put there | attacker type | "Guards don't help when the attacker is cheaper: a pawn takes your bishop and a guard only takes back a pawn." | — | — | CM1 habit | | only when piece values differ ≥ 2 | C (attacker types) |
| CM4 | prevent / own plan | S | B3 finds a move that adds an attacker so SEE ≥ 0 | that move, its piece | "When the count is one short, add an attacker first. Then the capture works." | — | "{adder} first would have made the capture work." | "Count, and if you are one short, bring one more piece." | after move only | adder must be legal and not itself hang (SEE on its square) | C |
| CM5 | their seat | O | their capture/landing loses the count | — | "They took without counting: {att} against {def} on {sq}. The trades leave you ahead." | "You win material in the exchange." | the student's punishing recapture is the student's next move → held in Learn | — | Learn: name the square, not the recapture | needs a mover param (student-only today :34) | C |
| CM6 | record | S | | | RED/GREY full · AMBER "Count before you take on {sq}." · GREEN silent | | | | | | H |
| — | endgame / phase | — | same rule in every phase; no phase variant needed | | | | | | | | |
| — | strategize, their plan | — | n/a — the count is tactical arithmetic, no plan facts in its inputs | | | | | | | | |
| — | exception | S | sound sac (engine price < 100) | — | never said (cost gate :30) | | | | | | H |

## E. Mistake link
- Teaches `whyItFailed: held-by-defender` (capture branch) and `lost-the-piece` (landing branch); costReason `allowed` with no motif (plain exchange). Student seat today; opponent after CM5's param.

## F. Build changes
1. `countMethod.ts:24` add fields `attackers: Square[]`, `defenders: Square[]`, `moved: PieceSymbol`, `captured: PieceSymbol|null` (from :41-53, already computed).
2. Add `mover` param (REQUIRED) replacing the `before.turn() !== student` reject at :34; registry passes seat.
3. New pure helper `addsAttacker(fenBefore, sq, student)` → the legal move after which SEE on `sq` ≥ 0 (CM4).
4. Sentence moves to `mistakeLesson` (CM1–CM5); keep `countWarning` as chat-only.
5. Align with `principleVoice` `loose-piece` guarded branch ("Guarded is not safe") — one cause `held-by-defender` gets ONE recipe (CM1/CM3), the other lane is subsumed by claim `count:<sq>`.

## G. Proof boards
- g:1012441262#9 S `Bxf7+` loss 288, `r1bqk1nr/ppp1ppbp/2np2p1/8/2BPP3/5N2/PPP2PPP/RNBQK2R w KQkq - 2 5` → CM1 (1 v 1, the king takes back; net −2).
- g:1005776142#74 S `Rh2+` loss 634, `4rk2/5p1p/5P2/8/1PP1PQ2/7r/1b1p2K1/6R1 b - - 1 37` → CM2 (2 attackers, 0 guards; net −5).
- g:1005776142#36 S `b4` loss 206 → CM2 (pawn). g:1015773958#32 S `Nxe4` loss 126 → CM1.
- Guard: no hit on any capture with loss < 100 in the 12 games (4 hits total, all ≥ 126).

## H. Open questions
- CM5 (their capture that loses the count) in Learn: say it, or leave it to the student to find the punish silently?
