# detectLatentDanger — the pin waiting behind one of your pieces

## A. Identity
- File: `src/services/latentDanger.ts` (279 lines): `detectLatentDanger` (92–98) → `detectLatentDangers(fen, studentColor, {latentOnly})` (104–158); renderer `latentDangerClause(d, fen, viewer)` (252–279) → `teachingSentence.renderLatentPin`.
- Registry: `boardComputers.ts` `latentDanger` (2839–2863), kind `latent-danger`, BOTH seats (2845: the student's danger with skill `missed-their-pin`, their line as the student's chance with `missed-your-pin`), `latentOnly: true` (2847), proof `NO_PROOF.description`, `claims: []`.
- Reach: learn door, chat, tapped, weaknesses; review / lesson / tactics **no**. Census: 22 lines (17 said): chat 19, learn 3 (held 5 `in-flux`). Run (latentOnly OFF, so live pins included): 79 fires; 18 on mistake plies (9 each seat).

## B. Facts
- **B1** `LatentDanger` (24–43): `frontSquare/frontPiece` (the student piece that would be pinned), `backSquare/backPiece` (king or queen behind), `enemySquare/enemyPiece` (their r/b/q), `line` file | rank | diagonal, `latent` (one student shield between), `shieldSquare/shieldPiece`.
- **B2 dropped:** the ray squares (`onRay`, 122–126) — the EMPTY squares between are not returned (the student needs them for "block"); the `worth` score (156); whether the front piece is ATTACKED once the line opens (pin + attack = it falls) — not computed.
- **B3 cheap:** after the shield moves, is the pinned piece attacked more than defended (`attackers()`), i.e. does the pin WIN something; which student moves "unpin" (move the back piece off the line, block with a cheaper piece, attack the pinner) — chess.js on the same grid; the student's move that just made `latent` → live (diff before/after the student's move: the shield was the piece that moved).
- **B4 gates:** the back piece must be king or queen and worth more than the front (130–132); a pawn front on a file is skipped (133); at most one shield, the student's own, and not a pawn on a file (135–137); with one shield a pawn front is skipped (138); `latentOnly` drops already-open lines (in the registry). No cp gate.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "Heads up: their bishop looks through your knight at your queen — move the knight and the bishop is pinned" | the rule is implicit |
| CONSEQUENCE | partly | "is pinned" | what the pin wins (B3) |
| BETTER MOVE + JOB | no | — | the unpinning move |
| HABIT | no | — | — |

## D. Lesson recipes
Causes: **LD-OPEN** (S): the student's move WAS the shield moving (latent before, live after) and cost ≥ floor — the student opened the line onto their own queen/king; **LD-STEP** (S): the student's move put the king/queen BEHIND a piece on an enemy line (live after, absent before); **LD-MISS** (S, their pin): the student had the line against them (`missed-your-pin` seat) and their best move exploited it.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LD1 | recognize (open the line) | S | LD-OPEN | shield, front, back, enemy | "Moving a piece can open a line onto your own queen: your {shield} was holding their {enemy} off your {front} and {back}." / "A piece in front of your king or queen is a shield — move it and what's behind it is pinned." | "Your {front} is pinned{and falls: B3}." | "{best} kept the line shut." | "Before you move a piece, look at the line behind it." | full; "your move", never the name | the opened pin wins nothing and costs < floor | C (diff) |
| LD2 | recognize (walk behind) | S | LD-STEP | front, back | "Never line your king or queen up behind a piece on their bishop's (rook's) line: your {back} now sits behind your {front}." | same | "{best} kept the {back} off that line." | "When your queen or king moves, check every line their bishops and rooks see." | full | — | C |
| LD3 | prevent (unpin) | S | live pin after their move, the student ignored it and cost ≥ floor | — | "A pin is broken three ways: move the piece behind, put something cheaper in between, or hit the piece that pins." | "The pinned {front} falls." | "{best} {unpin kind}." | — | full | — | C (B3 unpin moves) |
| LD4 | knowledge (absolute vs relative) | S | back = king vs queen | — | king: "A piece pinned to the king can't move at all — it's frozen." · queen: "A piece pinned to the queen can move, but the queen goes." | | | | | | H |
| LD5 | opponent seat (their latent pin = your chance) | O | LD-MISS shape for them: their move opened a line onto their own queen/king, the student did not exploit and cost ≥ floor | — | "Their {shield} moved and left their {front} pinned to the {back}: pile on the pinned piece." | "That was a piece." | "{best} attacked the pinned {front}." | "When a piece is pinned, attack it again." | full | — | H (`missed-your-pin`) |
| LD6 | combination (+ detectTradeCreatesPin) | S | the shield move was a capture | — | owned by `detectTradeCreatesPin` (one recipe) | | | | | | |
| LD7 | record | S | `missed-their-pin` / `missed-your-pin` | — | RED/GREY full · AMBER "That opened a pin on your {back}." · GREEN silent | | | | | | H |

Not applicable: phase (geometry is phase-free), plan / structure.

## E. Mistake link
- Student: `costReason` **allowed** with motif `pin` (LD1–LD3) or `skewer`; `whyItFailed` **abandoned-defender** when the shield also guarded; **missed** with motif pin (LD5).
- Opponent: LD5 (their opened line).

## F. Build changes
1. `LatentDanger` (24): add `between: string[]` (the empty ray squares, B2) and `wins: number` (SEE on the front piece once the line opens — B3), so the recipe never warns about a pin that wins nothing.
2. Add `openedBy(fenBefore, san, student): LatentDanger | null` — the diff that makes LD-OPEN / LD-STEP a cause (today the computer only reads one board, the cause is invisible).
3. `MistakeCause`: map LD-OPEN/LD-STEP to `costReason` motif pin when its blow uses the line; else the computer's own cause `opened-pin`.
4. Delete the pre-move "Heads up" Learn speak (the census Learn lines are pre-move warnings).

## G. Proof boards (run)
- LD1/LD2 (student, live pin after the move): g chesscom-1020779996 ply 55 Nxb7 (student White, cost 122) → their queen g6 pins the bishop g2 to the king g1 (file).
- LD1 (latent, shield = queen g3): g chesscom-1020779996 ply 63 Rxg2 (cost 217) → front rook g2, back king g1, shield queen g3.
- LD5 (their pin, the student's chance): g chesscom-1002984876 ply 18 …Bb4 (opponent cost 309) → bishop g5 pins knight f6 to the king d8.
- Census: lines-1.jsonl:269 (chat, said); lines-0.jsonl:7255 (held in-flux).

## H. Open questions
- none.
