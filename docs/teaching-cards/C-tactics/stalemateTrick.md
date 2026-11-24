# stalemateTrick — card

## A. Identity
- `stalemateTrick(fenBefore, san)` (the losing side's bait — every capture of it stalemates), `stalemateTraps(fenAfter)` (a natural move that walks into a stalemate check two deep), `stalemateWatch(fen, student)` (the winning side's stalemating moves) — `src/services/stalemateWatch.ts` (`stalemateWatch` :24, `stalemateTrick` :62, `stalemateTraps` :122).
- Board computer `stalemateTrick` — `src/services/boardComputers.ts:3859-3896`, kind `tactic`, under-promotions skipped; deep trap first, then trick.
- Census: 2 fired / 2 said (review 1, lesson 1): "Careful — taking the pawn on d4 would be stalemate … Leave the bait alone."

## B. Facts
### B1. Handed over
- StalemateTrick: `side` (behind side), `captures[]` (SAN that stalemate), `squares` (bait), `key`.
- StalemateWatch: `text`, `squares`, `moves[]`.
- StalemateTrap: `natural`, `check`, `capture`, `squares`, `bait`, `checkFrom`, who falls in.
### B2. Dropped
- Material edge (`behind ≥ CONVERSION_EDGE`, stalemateWatch.ts:69; watch :31) — "you're winning, so the only way to lose it is this" — the stake.
- The stalemated king's square and the reason it has no move (which squares are covered) — chess.js has them after the capture.
### B3. Cheap
- The student's mistake: S (winning) played a stalemating capture / a move allowing the trap → the game result went to draw (`isStalemate` on the board after S's move or one move later).
- The winning alternative (the saved read's best) that keeps the win — errorWhy best.
### B4. Gates
Behind side ≥ conversion edge down (trick) / student ahead (watch); a capture that stalemates on the board after the move; no under-promotion; not game over.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "Winning on the board is not a win until it is mate, so leave the king a square." | — |
| CONSEQUENCE | yes | "a won game becomes a draw" | — |
| BETTER MOVE + JOB | no | — | errorWhy best when S stalemated / walked in |
| HABIT | yes | "leave the king a square" | "Before every capture in a won ending, check their king has a move after it." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ST-1 | prevent (S stalemated / walked in) | S mistake | S winning, S's move = a stalemating capture or allowed the trap (B3), errorWhy cost ≥ mistake (the eval drops to 0) | captures, bait | "When you're winning, the only way to throw it away is stalemate: check that their king still has a move. Taking the pawn on d4 left the king with none." / "A cornered king with no pieces left to move is bait for stalemate. Leave it a square." | "A won game became a draw." | errorWhy best ("Kc3 kept the win — it left the king b1") | "Before every capture in a won ending, check their king still has a move." | Learn: "When you're winning, the only way to throw it away is stalemate. That capture left their king with no move." (the captured square — the move just played — not named) | the game is not won (edge < conversion) | H + C |
| ST-2 | their trick avoided | S | today's warning (before) | — | Review / chat only (before-move warning removed from Learn) | | | | Review | — | H |
| ST-3 | knowledge (stalemate trick) | O | O set a trick (bait offered) | bait | "A side that's lost looks for stalemate: a piece offered next to a king with no moves is a trap." | | | | Review | — | H |
| ST-4 | phase | both | ending | — | "In the endgame, a king with no legal moves and nothing else to move is stalemate — a draw." | | | | | — | H |
| ST-REC | record | — | stalemate skill (the Campaign's endgame miss) | | RED/GREY full; AMBER "That capture stalemates."; GREEN silent | | | | | | holdRate |
n/a: their plan (n/a), calculate (one-move check), combination with mate computers (matingNet) — the alternative is the mate.

## E. Mistake link
- errorWhy on a winning→draw drop (cost from the eval, no material costReason) → ST-1. No costReason kind covers stalemate today — the cause kind `stalemate` must be added to `MistakeCause`.
- The Campaign endgame card's one miss (§ MISSIONS) is the same fact.

## F. Build changes
1. MistakeCause gains `stalemate` (errorWhy: the board after the played move or the reply is stalemate, or the reply line stalemates within 2 plies) → recipe ST-1.
2. stalemateWatch.ts — expose the stalemated king square and covered squares (B2) for the LESSON's specific clause.
3. Before-move warning (`stalemateWatch` text) leaves Learn (WO); kept for Review/chat.

## G. Proof boards
- Text (lines-0): "Careful — taking the pawn on d4 would be stalemate. Their king would have no move and nothing else of theirs could move, so a won game becomes a draw. Leave the bait alone." (ST-1 shape if played).
- Guard: student not ahead by the conversion edge → null.

## H. Open questions
1. none
