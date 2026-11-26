# Card — `pieceRoute` (the trip down the line that follows)

## A. Identity
- `src/services/pieceRoute.ts:38` `pieceRoute(fenBefore, san, line)`; `worstAtStart` (:104, via `nextPlans.findWorstPlacedPiece` / `worstReason`, `pieceScope`). Registry `boardComputers.ts:6416` `moveRoute` (kind `point`, FACT_SET surfaces: lesson / moveThoughtFacts), and `reviewMoveBriefing.ts:588`.
- Census: 10 fired / 9 said (lesson). Teaching map: P ("no 'does when it arrives'").

## B. Facts
- **B1** `PieceRoute` (:25): `text` ("sending the knight on to h5, by way of g3"), `verb`, `path[]`, `worst {reason, scopeBefore, scopeAfter} | null`.
- **B2 dropped**: `endFen` (:52/:72) — the board on arrival, used only for `worst`; nothing is read on it about what the piece attacks or controls there.
- **B3 cheap**: `arrivalJob` on `endFen` — what the piece attacks at `dest` (chess.js attackers from dest: enemy pieces/pawns, king ring squares, an outpost square no pawn can hit — `outOfReach.pawnCanReach`); `tempi = path.length − 1`.
- **B4 gates**: line ≥2 (:39); not castling, not a capture first move (:44); stops on a capture of the piece (:56), when chased (:58/:66), a wait of 2 moves (:61-64), a capture by it unless recapture (:69); path ≥3 (:79). `worst` only if the piece was the side's worst AND scope grows (:107-110).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `worst.reason` + scope gain ("rescuing the worst-placed knight, which … covers 6 squares instead of 2") — a real "improve your worst piece" lesson | without `worst`, only the route |
| CONSEQUENCE | no | — | `arrivalJob` |
| BETTER MOVE + JOB | n/a | it is the line's own future (the played move's plan) | — |
| HABIT | partly | worst-piece habit implied | record `misplaced-piece` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PR1 | PLAN (better move's trip) | S mistake | errorWhy better move starts a pieceRoute (run on bestSan + best line) with `worst` | piece, dest, scope | "Improve your worst piece: the {piece} on {from} covered {before} squares, and the trip to {dest} gives it {after}." / "When nothing is happening, the plan is the piece doing least." | "On {dest} it hits {target}." (arrivalJob) | "{best} started the {piece}'s trip to {dest}." (once past) | "Every quiet move, ask which piece is doing least." | after the student's slow move: "When nothing is happening, the plan is the piece doing least — that was your {piece} on {from}." | worst null; better move still playable keeps {dest} unsaid | C run on bestSan |
| PR2 | KNOW (route) | both | lesson walk (taught line) | — | lesson/Review only: the route + arrivalJob | | | | Learn: n/a — Learn has no line ahead (header :12) | | H |
| PR3 | seat O | O | their best move's trip (their worst piece) and they played another (their mistake) | — | Review/chat only — the Learn lesson on their worst piece is theirWorstPiece TW1/TW2 (one claim) | | | | silent | | C |
| — | phase | — | any; king trips in endings belong to kingActivityGap / kingRace | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Your {piece} on {from} was doing least." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `misplaced-piece` / `no-plan` (`bestJobReason` piece move, `positionalReason.ts:223`) → PR1 (the better move's trip is its job).
- Opponent: PR3 pairs with theirWorstPiece.

## F. Build changes
1. `pieceRoute.ts:25` — add `arrival: { attacks: Square[]; outpost: boolean }` computed on `endFen`; add `tempi`.
2. Call `pieceRoute(fenBefore, bestSan, bestLine)` in the mistake turn (errorWhy's better move) — the trip IS the better move's job; `namesStudentMove` held until past.
3. Text "sending the X on to Y, by way of Z" stays for lessons; Learn uses PR1.
4. Share the claim key with itineraryAt (one idea).

## G. Proof boards
- `lines-0.jsonl#656` "You go Nf1, sending the knight on to h5, by way of g3." (route); `lines-1.jsonl#1690` ("by way of c2 and e1").
- PR1 owed: a student slow move where best starts a worst-piece trip — find in `g-*.jsonl` after F.2.

## H. Open questions
- None.
