# Card — `minorMatchup` (knight against bishop — which the board favours)

## A. Identity
- `src/services/minorMatchup.ts` — `shape` (one knight vs one bishop, rest even, pawns within one), `settled`, `verdict` (knight better: bad bishop, or closed centre with locked pawns on the bishop's colour + an outpost; bishop better: no queens, no locked pawns, pawns on both wings, bishop free, no outpost), `minorMatchupOn` (standing), `minorMatchup(fenBefore, san, student)` (the move that MAKES it, incl. the wrong-bishop rook-pawn corner via `endgameTechnique.detectRookPawnCorner`). Registry `boardComputers.ts:~3985` (entry ends `:3992`) (kind `judgement`), `seat` = winner.
- Census: 5 fired / 2 said (held already-said 3).

## B. Facts
- **B1** `MinorMatchupRead`: `text`, `squares` (both minors, bad-bishop blockers, fixed pawns, the outpost), `winner`, `key`. `MinorMatchupBoard`: `knight`, `bishop`, `better`, `badBishop[]`, `outpost {square, standing}`, `locked` files, `fixed[]`.
- **B2 dropped**: `trade` (the move was a capture of N/B — the decision) is only in the lead; `was` verdict (before) vs `now` — a matchup CHANGED by the move is the mistake signal and is not typed; `bothWings`, `free`, `queens` reasons computed in `verdict` and folded.
- **B3 cheap**: `moverLoses = winner !== mover` (the mover traded into the worse minor — the mistake); `altRecapture` — on a trade, the other recapture or not trading (chess.js legal moves) for the better move.
- **B4 gates**: shape exact (one N vs one B, other pieces even, pawns ±1); settled (neither minor takeable for no loss); a verdict (knight / bishop; mixed → null); new vs before; not mate / non-capture check.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | reasons are rules with the board inside ("The board is open … your bishop on f5 covers either side at once. Their knight has no square to settle on…") | the decision framing for the mover who chose the worse minor |
| CONSEQUENCE | yes | "X is worth more than Y now" | — |
| BETTER MOVE + JOB | no | — | `altRecapture` / errorWhy better move |
| HABIT | no | — | record (bad-trade) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MM1 | STRAT (traded into the worse minor) | S | `trade` and `moverLoses`, student's move, cost | better, reasons | "Knights love closed boards and outposts; bishops love open boards with pawns on both wings — trade into the minor the board favours." / (bishop better) "On an open board with pawns on both wings, a bishop beats a knight: it covers either side at once." | "Their {better} is worth more than your {worse} now." | "{best} kept your {minor} instead." (once past) | "Before you trade a knight for a bishop, ask: open or closed?" | "That trade left you the worse minor piece." | `winner === student` (good trade → silent) | C moverLoses |
| MM2 | KNOW (wrong bishop) | S attacker | `wrong-bishop` after the student's trade/push with an extra pawn | bishop, corner | "A rook's pawn with the wrong-coloured bishop is a draw: the king in the corner can't be driven out." | "The extra material doesn't win." | "{best} kept a pawn on another file." (once past) | "Before you trade into bishop and rook's pawn, check the queening square's colour." | "Your bishop is the wrong colour for this pawn." | — | H |
| MM3 | KNOW (wrong bishop, defender) | S defender | their trade into the wrong bishop | — | Review only (good for the student) | | | | silent | | H |
| MM4 | PLAN (outpost) | S knight side | `outpost` not standing, student's move cost and errorWhy's better move heads the knight for `outpost` | — | "A knight on a square no pawn can kick beats a bishop shut behind its pawns: take it to {outpost}." | — | "{best} headed for {outpost}." | — | "A knight with an outpost to reach beats a bishop behind its pawns — yours had one." (only once past, `pastBetterNameable`; else a pointer → silent) | the knight move still playable | H |
| — | phase | — | any, mostly endings; queens gate the bishop branch | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "That trade left the worse minor." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: trade cause / positional drop → MM1; endgame trade with a cost → MM2; `positionalReason` `misplaced-piece` with the outpost → MM4.

## F. Build changes
1. Add `trade`, `moverLoses`, `was` to `MinorMatchupRead` (typed).
2. Pure `altRecapture(fenBefore, san)`.
3. Recipes MM1/MM2/MM4 → `mistakeLesson.ts`; the reason sentences stay as LESSON stems.

## G. Proof boards
- `lines-0.jsonl#2478` (bishop better, their knight: "the board is open … your bishop on f5 covers either side at once"); guards `lines-0.jsonl#3172/#3192` (already-said).

## H. Open questions
- None.
