# Card — `shoulderOn` (the king or rook that cuts a king off from a pawn)

## A. Identity
- `src/services/shoulderRead.ts:126` — `shoulderOn(fen, student)` (the read where one piece costs a king the most), `shoulderLine(r, student)` (:169), `shoulderSquares` (:201); helpers `attacked`, `kingSteps` (BFS with the moving king a ghost), `standsBetween`, `rookWall`. Endings with kings, pawns and rooks only. Registry `boardComputers.ts:~7943` (entry ends `:7951`), kind `technique` (census).
- Census: 59 fired / 26 said (held already-said 28, beside-mate 5).

## B. Facts
- **B1** `ShoulderRead`: `mode` (`path` — in front of the other side's passer / `guard` — beside its own), `side` (blocker's owner), `by` (k/r), `bySquare`, `king` (kept away), `pawn`, `steps` (with the blocker; null = can't get there), `free` (without it), `key`.
- **B2 dropped**: every other read (`reads[]` sorted, only [0]); the cost `steps − free` (only in the sort); the rook's wall kind (file vs rank) is computed again in the line only.
- **B3 cheap**: the MISTAKE trigger — the student's move REMOVED their own shoulder (fenBefore had a read with `side = student`, fenAfter none / lower cost) or let theirs in (fenAfter has `side = them` with king = student's king); the move that would cut off (the student's rook moves to a file between, rookWall) for the better move.
- **B4 gates**: only k/p/r on the board; a passed pawn; the king not already there (steps ≠ 0); the blocker stands between; lifting it, the king gets there (free ≥1) and saves ≥2 moves (steps − free ≥2).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "Your rook on g4 cuts their king off from your h-pawn along the g-file." + the count | the rule ("cut the king off by a file") |
| CONSEQUENCE | yes | "it cannot get in front of the pawn… Without your rook there, it would take four moves." | — |
| BETTER MOVE + JOB | no | — | the cut-off move (B3) |
| HABIT | no | — | record `passive-rook` / `passive-king-endgame` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SH1 | PLAN (lost own cut-off) | S | fenBefore read (side student, cost c) lost by the student's costly move | by, line, king | "In rook endings, cutting the king off by a file is worth more than a pawn: your rook on {by} kept their king {c} moves from the pawn." / "Don't give up a cut-off — the king you let back stops your pawn." | "Their king reaches {pawn} now." | "{best} kept the rook on the {line}." (once past) | "Before moving a rook in an ending, ask whose king it's keeping out." | "That let their king back toward your pawn." | the move won material | C trigger |
| SH2 | PREV (let theirs in) | S | fenAfter read with side them, king = student's | — | "Their rook cuts your king off along the {line}: stop it before it settles." | "Your king needs {steps} moves instead of {free}." | "{best} kept your king on the right side." | SH1 habit | "A king cut off by a file can't stop a pawn — theirs now cuts yours off along the {line}." | — | C |
| SH3 | KNOW (shoulder) | both | SH1 or SH2 fires with `by = k` (the cut-off was a king shoulder) | — | "Shoulder the other king: stand your king between it and the pawn." | — | — | SH1 habit | same | no SH1/SH2 (a standing shoulder is Review only) | H |
| — | phase | — | endings only | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Their rook cuts your king off." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `passive-rook` / `passive-king-endgame` / `passed-pawn-neglected` (`positionalReason.ts:170/172/186`) → SH1/SH2; costReason allowed (the pawn lost) → SH2.

## F. Build changes
1. Return `all: ShoulderRead[]` and `cost`; `wall: 'file' | 'rank' | null` typed.
2. Pure `cutOffLost(fenBefore, san, student)` / `cutOffAllowed` (B3).
3. Recipes SH1/SH2 → `mistakeLesson.ts`; the count stays as CONSEQUENCE.

## G. Proof boards
- SH (theirs on the student's king): `lines-0.jsonl#4157` ("Their rook on e4 cuts your king off from your h-pawn along the e-file … it would take five moves"); student's: `lines-0.jsonl#4132`.

## H. Open questions
- None.
