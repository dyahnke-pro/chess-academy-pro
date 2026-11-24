# CARD — `openingAnnouncementForGame` (the opening's name, the book departure)

## A. Identity
`src/services/openingAnnouncement.ts:228` `openingAnnouncementForGame(det, history, spokenName, studentColor, transposed)` → string; reads `bookDeparture`, `planFor`, `openingAnnouncement`; siblings `studentJustLeftBook :254`, `openingNameForBoard :262`, `leftBookSentence`. Census 7/7 (Review), kind `opening` ("It's the King's Gambit Accepted." / "You left the book with the pawn to h4.").

## B. Facts
- **B1** the name, and the departure sentence.
- **B2 dropped:** `dep` (ply, mover, mainSan, fen) — the departure's main move is typed in `bookDeparture` but only the sentence leaves.
- **B3 cheap:** the departure ply + `mainSan` + the engine cost of the departure = openingSlip's input (owned there).
- **B4 gates:** spoken name not re-said unless the departure is new (`:236`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | name only | — |
| CONSEQUENCE | no | — | — |
| BETTER MOVE + JOB | partly | `dep.mainSan` | its job |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AN1 | knowledge (name) | — | any | | silent in Learn mistakes-only; Review/Theory | | | | silent | not a mistake | H |
| AN2 | left book with a cost | S mistake | `studentJustLeftBook` AND cost ≥ mistake | mainSan | → openingSlip (one computer) | | | | | | — |

## E. Mistake link
Only via openingSlip (departure that cost).

## F. Build changes
1. Expose `bookDeparture`'s `dep` on the announcement result so openingSlip / errorWhy read one departure (no second `bookDeparture` call).
2. Learn mistakes-only: the name is not said in Learn (owner H1).

## G. Proof boards
- Census: "You left the book with the pawn to h4." (`lines-0.jsonl:3634`); "It's the Traxler Counterattack of the Two Knights Defense." (`lines-2.jsonl:6207`).

## H. Open questions
1. Is the opening's name ever said in mistakes-only Learn (e.g. once at game start)? It is not a mistake turn.
