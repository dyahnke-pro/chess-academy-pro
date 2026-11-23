# computeBoardDelta — every other change the move caused

## A. Identity
- `src/services/boardDelta.ts:66` `computeBoardDelta(fenBefore, san, outSquares?)` → clause strings; reads the relation snapshot (`relations.ts` `snapshot`). Registry `boardDelta` `boardComputers.ts:2086-2100`, kind `delta`, claim `delta:<i>`, Review facet only; also `speedRunReads.ts`. Census 537 fired / 39 said (437 held `unsupported` — descriptions without a teaching point).

## B. Facts
- B1: clauses (with squares through `outSquares`): UNCOVERS ("the bishop on c1's line just opened — it now reaches h6, hitting …"), BLOCKS ("the move shuts in the bishop on c1"), queen+bishop diagonals opened, ABANDONS ("the move walks away from the pawn on h6 — no defender left"), WEAKENS ("the pawn gives up e6 and g6 for good"), RIGHTS ("gives up castling short").
- B2 dropped: every clause's KIND — the categories exist in the code (`uncovered`, `blocked`, `abandoned`, `gaveUp`, `lostShort/lostLong`) but leave as prose; whose pieces were uncovered (color).
- B3 cheap: whether the abandoned piece can be won (SEE) → the consequence is real; whether a weakened square is reachable by an enemy knight/bishop (the hole matters) — chess.js reach in 2 moves.
- B4: uncovered only when the gained reach hits an enemy piece or a central square (:~118); blocked when ≥ 2 squares lost beyond `to`; abandoned skips home-rank pawns nobody eyes; weakened only squares now `uncovered` by own pawns.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | | descriptions |
| CONSEQUENCE | partly | abandons / weakens / castling given up | typed kind + B3 proof that it matters |
| BETTER MOVE + JOB | no | | |
| HABIT | no | | |

## D. Lesson recipes (CONSEQUENCE supplier, both seats)
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BD1 | abandons | both | mistake; kind abandons; B3 SEE > 0 | piece, sq | (cause: abandoned-defender) | "It walked away from your {piece} on {sq}, and nothing guards it now." | | MB2 habit | CONSEQUENCE | SEE > 0; one claim `loose:<sq>` | C |
| BD2 | weakens | both | mistake; kind weakens; B3 a minor of theirs reaches the square in ≤ 2 | squares | "A pawn move is forever: the squares it passes can never be guarded by a pawn again." | "{sq} is now a home for their {piece}." | | "Before a pawn moves, look at the squares it stops guarding." | after move | reach proven | C |
| BD3 | rights | S | mistake; castling given up; king still central | | "Castling is a right you lose for good: give it up only for something real." | "Your king stays in the middle." | | | | not in an ending | H |
| BD4 | blocks | both | mistake; kind blocks | piece | "A piece that shuts in your own bishop costs you that bishop's whole diagonal." | | | | | ≥ 2 squares lost | H |
| BD5 | uncovers (their seat) | O | their move opened a line onto a student piece | target | (opponent-intent family) | "Their {piece}'s line opened onto your {target}." | | | Learn: only as consequence of the student's earlier mistake | | H |
| BD6 | description alone | — | no teaching point | | n/a — silent (the 437 `unsupported` holds are correct) | | | | | | — |

## E. Mistake link
- positionalReason `defender-left` (BD1), `pawn-weakened`/`outpost-conceded` (BD2), `file-opened` (uncovers onto the king), castling-rights (principle `king-left-in-centre`).

## F. Build changes
1. `boardDelta.ts:66` return `{ kind: 'uncovers'|'blocks'|'opens-both'|'abandons'|'weakens'|'rights', text, squares, side }[]` (B2); the string API wraps it.
2. Add B3 checks (`abandonedWinnable`, `weakSquareReachable`).
3. Recipe CONSEQUENCE rows BD1–BD4 in `mistakeLesson`; one claim per square (`loose:<sq>`, `hole:<sq>`) shared with contrastMoves/blunderCheck.

## G. Proof boards
- Pure run: 350 boards, 64 on mistake plies. g:1001055178#56 O `…g5` loss 113, `1rr5/1p2qkp1/p1p1pb1p/5p2/5P2/3R1BP1/P1Q2PKP/1R6 b - - 9 28` → "walks away from the pawn on h6 — no defender left" + "gives up f6 and h6 for good" → BD1/BD2 (their seat).
- g:1001055178#58 O `…Rc7` loss 157 → "walks away from the rook on b8" → BD1.
- g:1001055178#46 O `…f5` → "gives up e6 and g6 for good" → BD2 (verify reach at build).

## H. Open questions
- None.
