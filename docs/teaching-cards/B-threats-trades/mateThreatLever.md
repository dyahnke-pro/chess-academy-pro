# mateThreatLever — the mate threat that wins something else

## A. Identity
- File: `src/services/mateThreatLever.ts` (57 lines): `mateThreatLever(fen, lines, student)` (27–56); renderer `teachingSentence.renderMateLever` (542–553).
- Registry: `boardComputers.ts` `mateThreatLever` (7769–7788), kind `tactic`, seat = side to move, skill `missed-tactic` filed for the student's lever.
- Reach: lesson, review, learn (via the thought), chat, tactics, weaknesses. Census: 12 lines (10 said; 2 held `already-said`). Run: 4 fires; 3 on mistakes — g-1002984876 ply 61 Bd6 (student, cost 229) handed Black the lever Bd4 → Re1#; g-1005776142 ply 56 …d3 (student, cost 260).

## B. Facts
- **B1** `MateThreatLever` (25): `side` (whose lever), `move` (the quiet move in the best line), `mate` (the mating move it threatens), `gain` (material the line wins, points), `text`, `squares` (move from/to + mate square).
- **B2 dropped:** the index `i` of the lever in the line (only `first` survives into the renderer); the defence the other side plays (`moves[i+1]`) and WHY it costs — the line's material swing is one number; `lineScore` of the line (the cp, 34).
- **B3 cheap:** the defence move (`moves[i+1]` is in `playLine`'s output) and what it gives up (the next capture of the lever side in the line) — the CONSEQUENCE "to stop it you give up the pawn on g6".
- **B4 gates:** the best line must not be a mate line (32), side to move must be ≥ 100 cp better in the line (34) and no move of the played line may mate (36); the gain ≥ 1 pawn by the line's end, ≤ 10 moves (35–39); the lever is one of the side's first three moves, quiet (no capture/check/promotion, 40–43); the null-move probe finds mate in one (44–47). Note: `gain` is the line's whole material swing, not proven to come from the defence of the mate — ML1/ML2's "stopping it costs you {gain}" needs F1 `gives` to be the first capture after the defence, else say the line's total without "stopping it costs".

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | renderer: "The mate is the lever, not the goal" / "A mate threat is how they turn pressure into material." | — |
| CONSEQUENCE | yes | `gain` | which piece / pawn the defence drops (B3) |
| BETTER MOVE + JOB | no | — | the move that prevented the lever (for the student's mistake) |
| HABIT | no | — | — |

## D. Lesson recipes
Causes: **ML-ALLOW** (S): the student's move gave the opponent the lever (it fires on the board after the student's move for THEM) and the student's move cost ≥ floor; **ML-MISS** (S): the lever was the student's (fires for the student on the board before their move) and the student did not play it (cost ≥ floor); **ML-O**: theirs, Review.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ML1 | consequence (their lever) | S | ML-ALLOW | move, mate, gain | "A mate threat doesn't have to mate to win: their {move} threatens {mate}, and stopping it costs you {gain}." / "When they can threaten mate, every defence is a concession." | "{defence} stops the mate and drops {what}." | "{best} kept {mate sq} covered." | "After your move, ask whether they can threaten mate next." | full; the lever's move named (it is theirs) | the student is already lost by more than the lever (a decided game — the cost is noise) | H + C: B3 defence |
| ML2 | strategize (use the threat) | S | ML-MISS | move, mate, gain | "Use the threat of mate to win something: {move} threatens {mate}, and their defence gives up {what}." / "The mate is the lever, not the goal." | "That's {gain} you didn't take." | "{move} — while they stop the mate, you pick up {what}." | "When you have a mate threat, look for what their defence has to give up." | full once past | the student's move won as much by another route (cost < floor) | H |
| ML3 | knowledge (Danya's rule) | both | any fire | — | "The threat of mate is a way of transforming an advantage, not only of ending the game." | | | | Review/chat | | H |
| ML4 | combination (+ mateThreatCostsYou) | S | the lever's defence also leaves a piece loose | — | owned by `theirMoveStructure` SM2 when the defence costs a piece; one recipe per board | | | | | | |
| ML5 | record | S | `missed-tactic` (ML2), `missed-mate-threat` (ML1) | — | RED/GREY full · AMBER "Their {move} threatens mate." · GREEN silent | | | | | | H |

Not applicable: structure / plan / phase (it is a tactical lever in any phase; the endgame needs no separate stem).

## E. Mistake link
- Student: ML1 = `costReason` **allowed** (the line's blow is the material the defence drops, motif null — the mate threat is the hidden reason; `errorWhy` today names only the material); ML2 = `costReason` **missed**.
- Opponent: their ML (the student defended and lost material) is ML1 seen from the student's side.

## F. Build changes
1. `MateThreatLever` (25): add `index` (ply of the lever in the line), `defence: string | null` (`moves[i+1]`), `gives: { piece, square } | null` (the first material the lever side wins after the defence) — B3.
2. `errorWhy`: when `costReason` **allowed** has motif null and `mateThreatLever` fires on the board after the student's move for the opponent, attach cause `mate-threat-lever` so the lesson says WHY the material falls.
3. Move `renderMateLever`'s stems into `mistakeLesson` for Learn; keep the renderer for Review.

## G. Proof boards (run, chess.js on saved lines)
- ML1: g chesscom-1002984876 ply 61 Bd6 (student White, cost 229) `4rn1R/p2k4/8/1N2B1p1/7p/4bP1n/PPP4P/1K6 w - - 5 31` → `{side b, move Bd4, mate Re1#, gain 8}`.
- ML1: g chesscom-1005776142 ply 56 …d3 (student Black, cost 260) → their Qg4 threatens Qxg7#, gain 2.
- ML2 shape (the student's lever): g chesscom-1042725180 ply 71 Qf7 (opponent, cost 162) → Black's Bd4 threatens Qxg1#, gain 6 — the student's chance after their mistake.
- Census: boards-0.jsonl:1951 vc-1rcEbI44WqE-104, lines-2.jsonl:357.

## H. Open questions
- none.
