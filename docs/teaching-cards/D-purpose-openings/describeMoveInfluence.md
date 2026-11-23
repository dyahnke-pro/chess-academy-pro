# CARD — `describeMoveInfluence` (what the moved piece now hits)

## A. Identity
`src/services/moveInfluence.ts:23` `describeMoveInfluence(fenBefore, fenAfter, san, squaresOut?, shapeOut?)` → string; `INFLUENCE_LOOSE_TAIL_RE :17`; reads `squareRole`. Census 90 offered / 41 said (Review only), kind `does`; 20 dropped `unsupported`, many `subsumed by` the count/fork/attack lines.

## B. Facts
- **B1** a sentence: enemy pieces now eyed (loose or worth more), central squares fought for (with `squareRole`), "and nothing guards it".
- **B2 dropped:** `pressReason {loose, target}` (`:53`) leaks only via `shapeOut.loose`; the list of eyed targets typed is not returned (prose).
- **B3 cheap:** for a MISTAKE — run on THEIR reply after the student's move: their moved piece now hits a loose student piece → the consequence; and the reverse on the played move: the student's piece moved to a square where IT is the loose one (whyItFailed lost-the-piece already).
- **B4 gates:** only loose or bigger enemy targets (`:57-63`); king only loose; centre squares only with a role (`:75-82`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | — |
| CONSEQUENCE | partly | on their reply | typed targets |
| BETTER MOVE + JOB | partly | on bestSan | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MI1 | recognize (loose piece) | S mistake | their reply hits a loose student piece = errorWhy allowed-threat/allowed-capture target | target | "A piece nothing guards is the first thing they'll hit." (focus clue habit wording) | "Their bishop on g4 now hits the queen." | | "Before every move, check each piece: attacked, guarded?" | same | target = cause target | C |
| MI2 | (description) | — | centre-square fights only | | silent | | | | silent | no cost | H |

## E. Mistake link
`allowed-threat` (loose piece hit) — the lesson belongs to errorWhy E12/E6; this computer supplies the target only.

## F. Build changes
1. Return typed `{targets: {square, piece, loose}[], fights: {square, role}[]}` alongside the text (or retire the text).
2. Learn: none of its lines speak (Review-only today; Review keeps it as a description subsumed by the ranker).
3. Feed its target into errorWhy's `allowed-threat` cause when their reply is the mover (MI1).

## G. Proof boards
- Pure run on David's costly moves (on the PLAYED move, 40 of 109): chesscom-1012441262 ply 16 …Bg4 `r1bqk2r/ppp1p1bp/2np1np1/6N1/3PP3/2P2Q2/PP3PPP/RNB1K2R b KQ - 0 8` → "The bishop on g4 now attacks the queen on f3, which is worth more than the bishop." (a mistake move describing its own attack — guard: never said as the mistake's lesson).
- Census: subsumed examples in `samples` (why="subsumed by …count the attackers…").

## H. Open questions
None.
