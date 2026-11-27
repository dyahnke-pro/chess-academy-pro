# CARD — `openingStoryAt` (the opening's story beats)

## A. Identity
`src/services/openingStory.ts:384` `openingStoryAt(i: OpeningStoryInput)` → `StoryBeatFact[]` (`:89`, `CoachFact & {kind, storyBeat}`); beats `StoryBeat = 'fork'|'identity'|'their-setup'|'branch-choice'|'structure-cost'|'structure-paid'|'character'|'key-break'|'consequence'|'horizon-plan'` (`:45`); `STORY_KIND`, `BEAT_GROUNDS` (board/name/plan), `planHere`, `holeAccess`, `mastersPlanRead`. REQUIRED `theory` and `namesStudentMoves` flags (CLAUDE.md §OPENING THEORY). Census 1006 offered / 167 said (lesson 960; 801 dropped already-said), kinds opening-story 600, opening-theirs 200, opening 129, opening-fork 32, opening-cost 23.

## B. Facts
- **B1** each beat as a CoachFact with stakes, seat, squares, proof.
- **B2 dropped:** for `structure-cost` the hole square and the enemy piece route (`holeAccess`) are typed inside the fact's text only ("…fxe6 has a cost for them: no pawn of theirs can cover e4 again. Your knight on c3 is one move from it"); `character` (both kings same side) repeated (most of the 801 already-said).
- **B3 cheap:** `structure-cost` IS a mistake lesson when the pawn move that left the hole cost ≥ mistake (errorWhy positional `created-pawn-weakness` / concession `pawn-weakened`/`outpost-conceded`) — join on the hole square; `consequence` (what their move gave away) is the O-seat mistake lesson.
- **B4 gates:** `theory: false` holds name/plan beats (Review walk); a beat naming a student move is dropped when `namesStudentMoves` false (`:419`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | structure-cost / character texts carry general ideas ("Pushing the pawns in front of your own king only weakens it") | — |
| CONSEQUENCE | yes (structure-cost) | hole + knight route | — |
| BETTER MOVE + JOB | partly | structure-paid (on the move that guards the hole) | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OS1 | structure cost | S mistake | beat structure-cost on the student's pawn move AND errorWhy positional (concession pawn-weakened/outpost-conceded) on the same hole | hole, route | "A pawn move is the one move you can't take back: the square it stops guarding is a hole for good." / "When no pawn can cover a square, it's a home for their knight." | "Their knight on c3 is one move from e4." | better keeps the pawn / guards the hole | "Before a pawn moves, ask what square it leaves behind." | same | the cost must be the move's (errorWhy) | H |
| OS2 | their structure cost | O mistake | consequence/structure-cost on their move | | "Their pawn move left a hole: the square no pawn can guard is your piece's target." | | | | **pointer at the student's knight route** → H1 | | H |
| OS3 | character | S mistake | errorWhy positional weakened-king-safety via a pawn storm with kings on the same side | | "With both kings on the same side, pushing the pawns in front of your own king only weakens it." | | | | same | kings same side | H |
| OS4 | key-break / horizon-plan / identity / fork / branch | — | not a mistake | | silent in Learn mistakes-only; Review Theory button | | | | silent | | H |

## E. Mistake link
positional `created-pawn-weakness` / concessions `pawn-weakened`, `outpost-conceded` (OS1, both seats), `weakened-king-safety` (OS3).

## F. Build changes
1. Expose `structure-cost` fields `{hole, coverLost, enemyPiece, routeMoves}` typed (B2).
2. Cause join: errorWhy positional concession + structure-cost on the same hole → OS1.
3. Learn: all other beats silent (801 already-said repeats and the "both kings" refrain go).

## G. Proof boards
- Census: "…fxe6 has a cost for them: no pawn of theirs can cover e4 again. Your knight on c3 is one move from it. From there it would hit their knight on f6." (`boards-0.jsonl:3034`, vc-358seoKegqA-19) — OS2 shape; "Both kings live on the kingside. A pawn storm there would only weaken your own king…" (`boards-0.jsonl:2789`) — OS3 refrain (said once max).
- OS1 board on David's games: to join in the build (concession pawn-weakened rows are in errorWhy's `positional` set).

## H. Open questions
1. OS2: their hole = the student's next plan (a pointer). Speak only after the student uses or misses it?
