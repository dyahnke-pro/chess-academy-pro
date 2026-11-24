# CARD — `intoTheirCamp` (infiltration, lifts, connecting the rooks)

## A. Identity
`src/services/intoTheirCamp.ts:198` `intoTheirCamp(fenBefore, san)` → `IntoTheirCamp` (`:49`), kinds `CampKind = 'infiltration'|'seventh-doubled'|'lift'|'swing'|'connect'|'cut-off'` (`:39`); readers `infiltration :149`, `rooksOnSeventh`, `findRookLift`, `rooksSeeEachOther`; `campIdea`, `campNamesDeep`. Census 87/72 (lesson 63, review 24); verdict P.

## B. Facts
- **B1** `{kind, moved, route (open/half-open file | hole), targets [{piece, square, won?}], boxedKing, rooks, between, squares, seventhText?, key}`.
- **B2 dropped:** nothing big — the fields are typed; the `won` flag per target is present; what is dropped is the PURPOSE in Learn: "cut-off" fires on the move that LEFT the rooks cut off (a description) with no cost.
- **B3 cheap:** the mistake inversions — (a) **their infiltration allowed**: after the student's move their best reply is an `intoTheirCamp` infiltration with `won` targets (run on their reply) = consequence; (b) **the better move was the infiltration** (positional `passive-rook` / `missed-weak-target`) — 2 of 109 of David's costly moves had `campBest = connect`.
- **B4 gates:** check/game over → null (`:207`); a capture or an unsafe landing skips the infiltration/seventh/lift readers (`:212-214`, `legalSeeGainFor === 0`); `cut-off` is said ONLY on the side's move 12 exactly (`CUT_OFF_MOVE :85`, `:265`) — a description keyed to a move number, not to a cost (C3's guard replaces it).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | kind | — |
| CONSEQUENCE | yes (on their reply) | targets/won | — |
| BETTER MOVE + JOB | yes (on best) | kind + route | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | prevent (open file) | S mistake | their reply = infiltration by open file with won target, cost ≥ mistake | file, targets | "An open file is a road into your camp: guard its entry square or put a rook on it first." / "A rook on the seventh eats pawns and shuts the king in." | "Their rook lands on d7 and takes the pawn on b7." | "Rd1 contested the d-file." | "Ask who owns each open file." | same | target `won` | C (B3a) |
| C2 | own plan (seventh / file) | S mistake | positional `passive-rook`, best = infiltration/lift | | "Rooks belong on open files, and the seventh rank is the goal." | | "Rd7 went straight to the seventh." | | same | | C (B3b) |
| C3 | knowledge (connect) | S mistake | best = `connect`, played left rooks cut off, opening phase, errorWhy positional `neglected-development` | between pieces | "Your rooks aren't in the game until they see each other: finish development so the back rank is clear." | | "Bd2 would connect the rooks." | "Count the pieces still between your rooks." | same | phase opening/early middlegame | H |
| C4 | knowledge (lift) | S | best = lift/swing | | "When the files are closed, lift the rook up the board and swing it across." | | | | Review only unless cost | | H |
| C5 | hole | O/S | infiltration via hole | hole | "A square no pawn can attack is a home for their knight: don't leave one in your camp." | | | "Before a pawn moves, ask what square it leaves forever." | same | | H |

## E. Mistake link
`allowed-threat`/`allowed-capture` when the punishment is an infiltration (C1, C5), positional `passive-rook`, `neglected-development` (C2, C3).

## F. Build changes
1. Run `intoTheirCamp` on THEIR best reply after a costly move (consequence input to `mistakeLesson`), and on `bestSan` (better job).
2. Learn: the `cut-off` description ("Your rooks are still cut off…: the bishop on c1 stands between them") is said only as C3 on a cost, never alone.
3. Recipes C1–C5.

## G. Proof boards
- Census: "Your rook lands deep in their half through the open d-file. It hits their rook on c7 and their queen on e7." (`lines-1.jsonl:1284`); cut-off description: `boards-3.jsonl:1012` (vc--Y5bZoD6TM0-23).
- Pure run: chesscom-1001055178 ply 41 Kh1 (S, cost 113) `1r1r2k1/1p1q1pp1/p1p1p2p/2P5/3b1P2/6P1/P4PBP/1R1Q1RK1 w - - 1 21` → best Qh5 = connect (but errorWhy's cause was c5 lost — guard: C3 must not override a material cause).

## H. Open questions
1. C3 (connect the rooks) on a move whose cost is material elsewhere: never, or as the second cause?
