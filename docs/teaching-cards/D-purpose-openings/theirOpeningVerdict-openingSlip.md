# CARD — `theirOpeningVerdict` / `openingSlip` (leaving the book, and does it matter)

## A. Identity
- `openingSlip(i)` — `src/services/openingSlip.ts:327` → `OpeningSlip {kind: 'order'|'square'|'line', bookSan, text, squares, created: Shot|null, lost: Shot|null}` (`:76`); `Shot {kind: 'mate'|'hangs'|'fork'|'pin', clause, squares}` (`:69`); helpers `createdShot`, `lostShot`, `orderLine`, `orderReason`, `bookJob` (→ `bookMoveWhy`), `plainBook`; REQUIRED `plain` (Learn true: it speaks inside the correction only on a cost; the Play rung false). Registry `boardComputers.ts:2414` (`bookMove`, skill `left-book-early`), surfaces lesson/learn. Census 1/1 (chat).
- `theirOpeningVerdict(history, studentColor, cpLoss, coachChose)` — `src/services/openingAnnouncement.ts:285` → string; `SIDELINE_FAIR_CP 30`, `SIDELINE_DUBIOUS_CP 80`; callers `CoachTeachPage.tsx:13415`, `boardComputers.ts:4649`. Census 2/2 (Review).

## B. Facts
- **B1 openingSlip:** kind + book move + Shot created/lost (typed kind!) + text ("Your knight belongs on f6 here. Nf6 is the book move — it …"). **theirOpeningVerdict:** "That is a dubious choice — the knight to f3 is the move here, and this one costs them about a point."
- **B2 dropped:** openingSlip `bookJob` result kind (the book move's job, via `bookMoveWhy`) is prose; theirOpeningVerdict reads NO reason at all — only the cost (census verdict P): the WHY of their sideline is never computed, though `openingSlip` (mirror seat) would compute it.
- **B3 cheap:** run `openingSlip` for THEIR departure (seat flipped) inside `theirOpeningVerdict` → the created/lost shot and the book move's job — one computer both seats.
- **B4 gates:** openingSlip — the move is the student's (`:340`), book non-empty and played ∉ book; order/line silent unless a shot changes (or `plain`); theirOpeningVerdict — only on the departure ply, opponent only, cost ≥ 30 (fair below), dubious ≥ 80; coach's own real slip → the coach-verdict lane.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | Shot kind (hangs/fork/pin/mate) + book job | general lesson stems; texts name the played move ("Nd5 comes a move early", "not d5") — Learn violation |
| CONSEQUENCE | yes | created Shot clause | — |
| BETTER MOVE + JOB | yes | bookSan + bookJob | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SL1 | move order | S mistake | kind order + created/lost shot, cost ≥ mistake | shot | "In the opening, move order matters: played a move early, the knight can be pinned before you've castled." / "The same moves in another order can hand them a tactic." | created.clause | "Bd3 first kept the knight out of the pin." (the better order's job is the shot it avoids — `lost`/`created` Shot, never "more flexible") | "Ask what changes if you play your moves in a different order." | same; never "Nd5 comes early" → "your move comes a move early" | shot must change | H |
| SL2 | square | S mistake | kind square, cost ≥ mistake | book square, job | "Every opening piece has its best square: put the knight where it fights for the centre, not where it blocks." | (created: "and the knight hangs there") | "Nf6 was the book square — it hits e4." | "Before a piece develops, ask what it does from there." | same | job or created shot | H |
| SL3 | different line | S mistake | kind line, created shot | | "Leaving the book is fine until it hands them a shot: check their tactics before you try something new." | created.clause | "The book plays Nf6 here." | | same | created/lost | H |
| SL4 | gave up a shot | S mistake | kind line, lost shot | | "The book move here had a point — it pinned the knight — and your move gives that up." | | book + its point | | same | lost | H |
| SL5 | their sideline | O mistake | theirOpeningVerdict + B3 seat-flipped openingSlip | their shot | "When they leave the book, ask what it gave you: a move off the main line often leaves a piece loose or a square weak." | | (their book move — Review only) | | Learn: lesson only, the student's punishment held | cost ≥ 80 (dubious) | C |

## E. Mistake link
errorWhy cause + `left-book-early` skill (opening, both seats); created shot = `allowed-tactic` (hangs/fork/pin/mate) — the opening-phase wording of errorWhy E6/E9/E10.

## F. Build changes
1. `openingSlip.ts` texts — stop naming the played move (`X = sayMoveNoun(played.mv.san)`, `:342`, and `:307` in the order line, used in "X comes a move early", "not d5") when the surface is Learn: the recipe words it ("your move").
2. `theirOpeningVerdict` — call `openingSlip` seat-flipped for the reason (B3); a verdict with a cost and no reason stays silent in Learn.
3. `OpeningSlip` — export, and add `bookJob: IdeaKind` (the job kind) for the recipe.
4. One departure: read `bookDeparture` once (shared with openingAnnouncementForGame).

## G. Proof boards
- Census chat (openingSlip): "Nothing guards your bishop on f7, and their king on e8 can take it. The book plays castling short here." (`lines-2.jsonl:1947`) — SL3 shape (created hangs).
- theirOpeningVerdict Review: "That is a dubious choice — the knight to f3 is the move here, and this one costs them about a point." (`lines-2.jsonl:4905`); "It is a weaker choice than the bishop to d3 — it costs them a little." (`lines-0.jsonl:6594`) — no reason: SL5 build target.
- David's game: chesscom-1012441262 ply 9 Bxf7+ `r1bqk1nr/ppp1ppbp/2np2p1/8/2BPP3/5N2/PPP2PPP/RNBQK2R w KQkq - 2 5` is the matching board for the chat line (Bxf7+ left the book, the bishop is taken by the king) — SL3/E3 overlap: one cause, the opening wording only adds "the book plays O-O".

## H. Open questions
1. In mistakes-only Learn, does a book departure that costs less than a mistake (an inaccuracy, the common case: "a little") ever speak?
