# CARD — `positionalReason` (why a move cost when nothing is won or lost)

## A. Identity
`src/services/positionalReason.ts:231` `positionalReason({fen, playedSan, bestSan, namesBetterMove, student})` → `PositionalReason {tag: MisconceptionTagId, note}` (`:32`). Order: `concessionReason :122` (`findStudentDrawback`, `concessionBeat.ts:377`, 5 `DrawbackKind`s mapped by `CONCESSION_TAG :36`) → `boardReason :137` (the largest gap between the board after the played move and after the better move, each past its bar) → `bestJobReason :200` (names the better move; only when the surface may). Readers: `errorWhy` (`inaccuracyCall.ts:1563`, `.note` only) and the record (`slipCause`). No census label of its own (it speaks inside errorWhy's line).

## B. Facts
- **B1** `tag` + `note`.
- **B2 dropped:** in errorWhy the `tag` is dropped (`:1563`); and errorWhy never calls it when the better move is named (`:1559 !should`) — on David's live costly moves 26 of 87 had a tag no one read; the `gap` sizes (`push(gap/bar)`, `:146`) and the per-reading numbers (shield pawns, open files near king, centre distance, activity counts) are dropped.
- **B3 cheap:** all readings, not just the largest (a list of gaps, `gaps` `:196`); the concession's `DrawbackKind` itself (`findStudentDrawback(...).kind`).
- **B4 gates:** board bars: development 1 (opening only), king shelter 1 (not endgame), endgame king 1 / passer 1 (endgame), passive rook 1 (best is a rook to an open file), space 2, activity 4 with a 3-square piece shift (`:148-195`).
- **Defect:** every board note names the played move (`movedSan`, `:139`: "The king on h1 is less sheltered after Kh1 than after the better move", "…d6 gives up space…", "Your bishop on c8 reaches 5 fewer squares after …Bg7"). On David's 87 live costly moves 31 notes named it — illegal in Learn. The `bestJobReason` fallbacks ("The rook belonged on g8.", "a6 was the move the position asked for.") are verdicts with no reason.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | tag | a lesson per tag |
| CONSEQUENCE | partly | note | names the played move; compares to "the better move" abstractly |
| BETTER MOVE + JOB | partly | bestJobReason | fallback is no reason |
| HABIT | no | — | — |

## D. Lesson recipes (keyed on `tag` — the positional half of `MistakeCause`)
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PR1 | neglected-development | S/O | board/development gap | | "A piece still at home can't fight: get the last minor out before you start operations." | "Your bishop on c8 is still at home." | better develops | "Count your pieces at home." | same, no move named | opening | H |
| PR2 | weakened-king-safety / king-stuck-center | S/O | king-shelter gap | king square | "Every pawn move in front of your king is a hole you can't take back." / "Castle before the centre opens." | "Your king on h1 has less cover than it needed." | castling / the shelter move | "Is your king safe if the position opens now?" | same | not endgame | H |
| PR3 | passive-king-endgame | S/O | endgame king gap | | "In the endgame the king is a fighting piece: bring it to the centre." | | "Ke3 marched toward the centre." | "In the endgame, every king move should go toward the centre." | same | endgame | H |
| PR4 | passed-pawn-neglected | S/O | passer gap | | "Passed pawns must be pushed: a passer standing still is a target." | | | | same | endgame | H |
| PR5 | passive-rook | S/O | rook gain | file | "Rooks belong on open files." | | "Rd1 took the open d-file." | "Ask where each rook sees the most." | same | named file | H |
| PR6 | space-conceded | S/O | space gap ≥ 2 | | "Giving up the centre gives their pieces room to come in." | | | | same | | H |
| PR7 | misplaced-piece | S/O | activity gap ≥ 4, piece shift ≥ 3 | piece, squares | "A piece is only as good as the squares it reaches." / "Improve your worst piece first." | "The knight on g8 has six fewer squares than it needed." | better square | "Before you move, find your worst piece." | same | piece named | H |
| PR8 | tempo-handed | S/O | their piece freed | piece | "A move that frees their worst piece helps them more than you." | "Their rook on e8 comes alive." | | | same | | H |
| PR9 | concessions (5) | S/O | `findStudentDrawback` kind | | defender-left: "A piece that guards something has a job." · file-opened: "Opening a file next to your own king invites their rooks." · piece-offside: "A piece far from your king can't help defend it." · pawn-weakened: "A pawn that can't be defended by another pawn needs a piece to babysit it." · outpost-conceded: "A square no pawn can attack is a home for their knight." | the concession's `said` (already in seat words) | | per kind | same | | H |
| PR10 | no-plan / bestJob fallback | S/O | `bestJobReason` only | | silent | | | | silent | no board reason | H |
| PR11 | missed-tactic (bestJob check) | S | best is a check | | → errorWhy missed-win | | | | | | — |

## E. Mistake link
errorWhy cause kind `positional` (D0 of the errorWhy card) — the whole positional half, both seats.

## F. Build changes
1. `positionalReason` returns `{tag, note, kind: DrawbackKind | BoardReading, gaps: {reading, gap}[]}`.
2. `boardReason` notes drop `movedSan` (`:139`) — the recipe's CONSEQUENCE words the reading without the move.
3. `bestJobReason` returns the tag only (no note) for the no-reason fallbacks; recipe PR10 = silent.
4. errorWhy calls it even when the better move is named (errorWhy card F5).

## G. Proof boards (errorWhy run on David's games)
- PR9 defender-left said: chesscom-1042725180 ply 42 …e5 `r1q1r1k1/1b5p/ppn1pbp1/2pp4/1PP2P2/P2PBB1P/4N1P1/1R1Q1R1K b - - 0 21` → "It took your last defender off d5."
- PR7 (tag dropped, better named): chesscom-1001055178 ply 48 …Rdc8 `1r1r2k1/1p2q1p1/p1p1p2p/2b2p2/5P2/5BP1/P1Q2P1P/3R1R1K b - - 1 24` → note "Your rook on c8 reaches 8 fewer squares after …Rdc8 than after the better move." (names the move — F2).
- PR2: chesscom-1001055178 ply 41 Kh1 → "The king on h1 is less sheltered after Kh1 than after the better move." (but the cause is allowed-capture c5 — positional is second).
- PR10 guard: chesscom-1012441262 ply 26 …Kg8 → "The rook belonged on g8." (silent).

## H. Open questions
1. When the largest gap is small (just past its bar), is a positional lesson worth a Learn turn, or Review only?
