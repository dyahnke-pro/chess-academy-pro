# Card — `castlingWing` (which way to castle, read off their pawns)

## A. Identity
- `src/services/castlingWing.ts:50` `castlingWing(fenBefore, san, student)`; helper `pawnlessFiles` (:35). Registry `boardComputers.ts:6860`, kind `king-read`. Fires only on a castling move, either seat.
- Census: 5 fired / 5 said (Review 2, lesson 2, Danya 1).

## B. Facts
- **B1** `CastlingWingRead` (:26): `kind` (`into` / `away`), `key`, `text`, `squares` (king + the open-file squares on the back rank for `into`), `mover`.
- **B2 dropped**: `here` / `there` file lists (:60-61) are only in prose; `hasRook(enemy)` (:58) true but which rook can reach the file is not computed.
- **B3 cheap**: `rookToFile` — enemy rook/queen moves landing on a `here` file (chess.js, one move) = the concrete consequence; `pawnStorm` — their pawns on the wing they would push (`here` empty but `there` has pawns advanced) for the opposite-castling race (`planRace.oppositeWingsRace` exists); `couldCastleOther` — the other wing was legal on fenBefore (so the choice was real).
- **B4 gates**: castling move (:54); enemy has a rook (:58); `into` when ≥2 of the king's wing files lack their pawns (:69); `away` when 0 here and ≥2 there (:79).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "…where their pawns are gone, so their rooks have roads to it" (rule + example inside) | general form first |
| CONSEQUENCE | partly | "roads to it" | which rook reaches which file (`rookToFile`) |
| BETTER MOVE + JOB | no | — | the other castling, when `couldCastleOther` ("O-O-O kept the king off the open g- and h-files") |
| HABIT | no | — | record `weakened-king-safety` / `king-stuck-center` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CW1 | KNOW / CONSEQ | S castles `into`, cost on the move | files | "Castle away from the open files: where their pawns are gone, the {files} are roads for their rooks to your king." / "A file with none of their pawns on it points their rooks straight at your king." | "Their rook reaches the {file}-file next." | "{other castle} kept the king off those files." (once past, if legal) | "Before you castle, look at which files their pawns have left." | "Castling beside files their pawns have left gives their rooks a road — the {files} lead to your king." | no enemy rook; cost < mistake | H + C rookToFile |
| CW2 | STRAT | O castles `into` | their castle, the student to exploit | "When they castle beside open files, put your rooks on those files first." | — | — | — | after their move: "They castled beside open files — the {files} are a road for your rooks." (their mistake only when it cost; the student's rook move is never named) | — | H |
| CW3 | KNOW (good choice) | S `away` | no cost | — | Review only: "You castled away from the files their pawns left." | — | — | — | silent in Learn (no mistake) | — | H |
| CW4 | combo + race | both | opposite castling + `pawnStorm` | — | "With kings on opposite wings, the race is pawn storm against pawn storm: count whose arrives first." (planRace owns the count) | — | — | — | — | — | C |
| CW5 | exception | — | `into` but enemy rooks off | — | silent (gate :58): "Open files matter only if they have rooks to use them." | | | | | | |
| — | phase endgame | — | n/a — castling happens in the opening/middlegame | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Your king castled beside open files." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: castling move with a cost → `positionalReason` `weakened-king-safety` (shelter gap) or `costReason` allowed via the open file → CW1. If the cost is zero, CW1 is Review only.
- Opponent: CW2.

## F. Build changes
1. `castlingWing.ts:26` — add `files: string[]` (here) and `otherFiles: string[]` (there) as typed fields.
2. Add pure `rookToFile(fen, enemy, files)` and `couldCastleOther(fenBefore, mover)` (chess.js) for CW1 consequence/better move.
3. Recipe CW1/CW2 → `mistakeLesson.ts` (cause `positional:weakened-king-safety` with a castling move).

## G. Proof boards
- CW1 shape (their seat): `lines-0.jsonl#6782` ("They castle short, away from the b- and c-files…" — an `away`). `lines-1.jsonl#4966` (student `away`, a good choice → CW3, Review only).
- No saved `into` board with a cost found in the census (5 rows only).

## H. Open questions
- None beyond the general Learn rule; CW1 in Learn depends on the castle being graded a mistake.
