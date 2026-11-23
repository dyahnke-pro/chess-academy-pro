# CARD — `buildReviewMoveTeachingFact` (the board teacher: the move's one job)

## A. Identity
`src/services/reviewMoveTeaching.ts:529` `buildReviewMoveTeachingFact(fenBefore, san, moverIsStudent, phrases)` → `MoveTeachingFact {text, squares, claim?, idea: IdeaKind, restates?}` (`:508`); wrapper `buildReviewMoveTeaching :517`; `pieceEyes`, `sayIdea` (phrase memory), castling/opposite-wings branch (`:562`), capture-taken-back guard (`:589`), winnable-target branch (`:609`). The largest producer in this family: census 1812 offered / 922 said (lesson 1571, review 241), kinds `board-teacher`, `two-jobs`; dropped 590 same-idea, 115 by-product, 86 restates. Verdict "P (generic 'joins the fight')".

## B. Facts
- **B1** `text`, `squares`, `idea` (one of the 31 `IdeaKind`s, `ideaKind.ts:14`), `restates`.
- **B2 dropped:** `moverEyes` (enemies / friends / squares the piece sees, `:605`), `winnableTarget` (loose or bigger enemy piece, `:609-615`), `minorAttacksPiece`; these decide the sentence then vanish.
- **B3 cheap:** this computer reads ONE move and says its job. For a mistake: run it on the BETTER move — its `idea` is the better move's job kind (`BetterJobKind` = `IdeaKind`), and its text the BETTER slot's job when nothing sharper (errorWhy's own `reason`) exists. Run it on their reply for the CONSEQUENCE only when `idea ∈ {threat, tactic, check, win-material, pressure}`.
- **B4 gates:** a capture whose piece is taken back says nothing from its square (`:589`); minors skip the developing gloss only on a real target; phrase memory says an idea in full once.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | `idea` | the descriptions ("develops to d7, joining the game", "adds its weight to c4") are board restatements — David's "joins the fight" complaint |
| CONSEQUENCE | partly | on their reply, threat ideas only | — |
| BETTER MOVE + JOB | **partly** | text on bestSan | generic for develop/center ideas |
| HABIT | no | — | — |

## D. Lesson recipes
The teaching rows are keyed on the better move's `idea` (used by errorWhy's BETTER slot and positional cause):

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RT1 | develop | S mistake | better idea = develop, positional `neglected-development`/`no-plan`, opening | piece | "In the opening every move should bring a new piece out." | | "Bd2 brought the last bishop out." | "Count the pieces still at home." | same | opening phase only | H |
| RT2 | castle | S mistake | better idea = castle | | "Castle before the centre opens, not after." | | "O-O got the king out of the centre." | "Is your king safe if the centre opens now?" | same | | H |
| RT3 | opposite wings | S/O | castling to opposite wings (`:568`) | kings | "With the kings on opposite wings, the race is on: throw your pawns at their king, fast." | | | | Review/chat unless a mistake | | H |
| RT4 | threat / pressure | S mistake | better idea = threat with winnable target | target | "The best quiet move often makes a threat: it forces their reply and keeps the move." | | "Bb7 hit the rook on f3." | | same | target winnable | H |
| RT5 | file / diagonal / outpost | S mistake | better idea ∈ {file, diagonal, outpost}, positional `passive-rook`/`misplaced-piece` | | file: "Rooks belong on open files." · diagonal: "A bishop on an open diagonal reaches both wings." · outpost: "A knight on a square no pawn can hit is a monster." | | | | same | | H |
| RT6 | (description) | — | idea ∈ {center, space, develop} on a good move | | silent | | | | silent | no mistake | H |

## E. Mistake link
BETTER slot for every positional cause; CONSEQUENCE on their threatening reply (`allowed-threat`). Not a cause source itself.

## F. Build changes
1. Return `moverEyes` and `winnableTarget` typed (B2).
2. errorWhy: `cause.better.job` = this computer's `idea` on `bestSan` when errorWhy's own `reason` is a route/guard-less fallback; the BETTER slot text comes from here only for RT1–RT5 ideas.
3. Learn: no stand-alone board-teacher lines (1,571 lesson lines today, most descriptions).
4. RT1–RT5 recipes into `mistakeLesson` (positional rows), keyed by `IdeaKind`.

## G. Proof boards
- Census descriptions to delete: "You go Bd7, which develops to d7, joining the game." (`boards-3.jsonl:3062`); "They go Ra4, which adds its weight to c4, keeping your queen off it…" (`boards-3.jsonl:506`).
- RT1: chesscom-1020779996 ply 43 b4 (S, cost 187) `2kr3r/1ppbq2p/p1n1p1p1/P3Pn2/3pNP2/2PP3Q/1P4BP/R1B2RK1 w - - 4 22` → best Bd2 "completes your development" (principleContrastLine said so) — but at move 22 this is a middlegame: RT1's opening guard must use `openingWindowOpen` (true while a minor is home) — owner question H1.

## H. Open questions
1. A move-22 "complete your development" lesson (a minor still home): opening rule or middlegame `misplaced-piece` lesson?
