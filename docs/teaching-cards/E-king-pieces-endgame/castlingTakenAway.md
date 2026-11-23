# Card — `castlingTakenAway` / `castleByHandMove` / `kingReadsForBestLine` (castling: denied, by hand, the king reads of the best line)

## A. Identity
- `src/services/castlingTakenAway.ts:64` `castlingTakenAway(fenBefore, san, student)`; renderer `sentence` (:109). Registry `boardComputers.ts:6840` `castlingTaken`, kind `king-read`, NOT_ENDING, learn via thought.
- `src/services/kingWalk.ts:67` `castleByHand(fen, me)` (the plan) and `:179` `castleByHandMove(fenBefore, san, who)` (the move's part: plan/prep/step/done). Registry `boardComputers.ts:3318`, kind `castling`, `skill: 'king-stuck-center'` on the student's seat; held form for Learn (`heldForm`, :3327) because the route names the student's next moves.
- `src/services/kingAttackReads.ts:772` `kingReadsForBestLine(fen, me, bestLineUci)` = `kingAttackReads` (:746) minus `material-not-mate`/`probing-check`; sub-reads `mateOrMaterial` :136, `sacrificeConditions` :525, `kingSquareByChecks` :594, `stopsCastling` :266, `lureKing` :329, `breakChooser` :443, `kingDiagonalWalk` :693, `ownPieceShelter` :643, `sacrificeTarget` :486, `ownCastlingBlocked` :298, `stormRace` :735. Registry `boardComputers.ts:1929` `kingReadsBestLine` (Review facet only, student to move, `namesMove` reads only, prefixed "Here, …"); weaknesses `moveInsight.ts:814`.
- Census: castlingTakenAway 18/17; castleByHandMove 20/16; kingReadsForBestLine 12/10 (all Review).

## B. Facts
- **B1** `CastlingTaken` (:37): `denied`, `wing`, `ownGoal`, `squares [coverer, transit sq]`, `key`, `text`. `KingWalkStep` (:136): `kind`, `text`, `squares`; `CastleByHandPlan` (:44): `king`, `target`, `steps[]`, `nextKingSquare`. `KingRead` (:56): `id`, `text`, `squares`, `proof`, `stakes?`, `namesMove`, **`idea`** (the lesson without the move — already exists on stops-castling, lure-king, centre-strike, wing-lever, sacrifice-conditions, king-square-checks, mate reads), `claim`, `lines`.
- **B2 dropped**: castlingTakenAway — `moved` (piece moved vs line opened, :90-91) is folded into prose only; `role` (cross vs land, :114); the `legalSeeGainFor` check result (:95). castleByHand — route kind (A via f7 vs B via f8+g-pawn, :102/:113) and the knight-check square avoided in `prep` (:227). kingReadsForBestLine — the registry discards every read with `namesMove: false` (:1932) and never reads `idea` (the Learn-ready lesson).
- **B3 cheap**: `ownGoal` + the mover's own move = the cause of a "you took your own castling away" mistake; `castleByHandMoves` count (steps.length = tempi the king walk costs) → "castling by hand costs three moves"; for kingReadsForBestLine: compare the played move to `bestSan` — the read is a MISSED idea exactly when played ≠ best (counterfactual), from the same line.
- **B4 gates**: castlingTakenAway — side not in check (:77), right still held (:79), transit square uncovered before (:81), empty (:85), coverer not a king (:93), denied side can't win the coverer at once (`legalSeeGainFor > 0` → null, :95). castleByHand — no rights (:71), their queen on (:73), king on e/f home or 2nd rank (:87), g- and h-pawn shelter (:93), route squares not attacked (:109). castleByHandMove 'plan' only on a quiet move (:240). kingReadsBestLine — student to move, `namesMove` only.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `KingRead.idea` ("Look for a move that covers f8 — their king has to cross it", "Before the king moves, count the checks…"); castling texts are board statements | castlingTakenAway has no rule ("a bishop on the diagonal to f1 shuts the king in"); `idea` unused |
| CONSEQUENCE | partly | "so you can't castle short while it stays there" | the cost: "castling by hand now takes three moves" (B3 steps) |
| BETTER MOVE + JOB | partly | `KingRead.text` names the best move with its job (Review "Here, …") | for castlingTakenAway: the move that kept castling (errorWhy better move) |
| HABIT | no | `idea` ≈ habit for some reads | record `king-stuck-center` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CT1 | CONSEQ (own goal) | S | `ownGoal`, student's move | coverer, sq | "Your own move can take castling away: once {sq} is seen by their {coverer}, the king can't cross it." / "Before you open a line near your king, check which castling squares it hands them." | "Now castling by hand costs {n} moves." | "{best} kept {sq} covered and castling alive." | "Before a pawn move near your king, ask: can I still castle after it?" | "That opened {sq} to their {coverer} — you can't castle {wing} now." | SEE wins the coverer back (gate :95) | H + C steps |
| CT2 | CONSEQ (their move denies) | S denied | their move, not own goal, student had a cost before (didn't castle in time) | — | "Castle while you can: a single piece on the diagonal to {sq} takes the right away." | "Your king stays in the centre." | "O-O last move was the moment." (once past, Review) | "When castling is ready, castle before they cover the square." | — (castlingWatch owns the Learn line on the student's skip) | castling wasn't ready | H |
| CT3 | STRAT (attacker) | S denies them | student's move denied their castling | — | "Stopping their castling is worth a tempo: a king stuck in the centre is a target for every file you open." | "Open the centre next." | — | — | after the move: no line (it's the student's good move — Learn speaks only on mistakes); Review only | — | H |
| CH1 | PLAN (by hand) | S | `castleByHand` live after the student lost castling | steps | "A king that can't castle still wants the corner: walk it there a step at a time, a rook coming across behind it." | "It costs {n} moves, so start now." | Review: "{steps}". | — | held form (:3327): "Your king has lost castling — walk it to safety by hand." | queens off (gate) | H |
| CH2 | PREV (prep) | S | `prep` kind | the knight square | "Take away their checks first: one pawn move can stop the knight from hitting the square your king needs." | — | "{prep move} took {x} from their knight." | — | held form | — | H |
| CH3 | counterfactual (mistake on the walk) | S | castleByHand live before, student's move cost and is not a step | — | "With your king uncastled, every move that isn't part of the walk leaves it in the centre a move longer." | — | "{best} was the next step." | CH1 | — | the move was a step | C (step vs not) |
| KR1 | KNOW/HABIT (idea) | S missed | kingReadsForBestLine read, played ≠ best (cost) | `idea` | the read's `idea` IS the lesson: "Before the king moves, count the checks it walks into on each square." / "Their king hasn't castled yet — aim your pieces at h7, where it goes." / "Answer a flank attack in the centre." / "The centre is locked — the play is on the wings." | from `text` minus the move | `text` ("King to g1, not f1 — there their queen checks and wins time") once past | the `idea` | `idea` only (move held) | played = best (then it's their good move: silent) | H idea |
| KR2 | KNOW (sacrifice-conditions) | S | `sacrifice-conditions` | bishop, h7 | "The Greek gift needs a knight to g5 and a queen to the h-file: without both, castling into the bishop is safe." | — | — | "Before you castle into their bishop, check the sac on h7." | idea | — | H |
| KR3 | KNOW (own-piece-shelter) | S | read with namesMove false (dropped today) | — | "A king hiding behind your own piece is a discovered check waiting." | — | — | — | — | — | H (dropped by :1932) |
| — | phase endgame | — | castling reads NOT_ENDING; kingDiagonalWalk is an endgame read → kingActivityGap/kingRace cards | | | | | | | | |
| — | record | — | RED/GREY full · AMBER one clause ("You can't castle short now — their bishop sees f1.") · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `king-stuck-center` (`positionalReason.ts:164`, `bestJobReason` :210 "Castling was the move here") → CT1/CT2/CH3; castlingWatch's `king-stuck-center` miss (same skill) — CT2 and the watch share the claim.
- costReason `missed` with the best line's king read → KR1 (the read is WHY the best move was better).
- Opponent: their move denied the student's castling → CT2 (no student mistake unless the student delayed); student denied theirs → CT3 Review only.

## F. Build changes
1. `castlingTakenAway.ts:37` — add `moved: boolean`, `role: 'cross' | 'land'`, `coverer: {square, piece}` typed fields (today only in prose).
2. `kingWalk.ts:44` — add `route: 'via-f7' | 'via-f8'` and `tempi = steps.length` (CT1/CH1 consequence).
3. `boardComputers.ts:1932` — stop discarding `namesMove: false` reads for the mistake turn and hand `idea` as a typed field; KR1 reads `idea` in Learn, `text` in Review.
4. Recipes CT1, CT2, CH1–CH3, KR1, KR2 → `mistakeLesson.ts` (causes `positional:king-stuck-center`, `missed:<KingReadId>`).
5. Keep `sentence()` (:109) for Review/chat; Learn uses the recipe.

## G. Proof boards
- CT (their move denies yours): review `lines-0.jsonl#1594` "You can't castle long now: their queen covers d1"; `lines-2.jsonl#1764` "their queen covers f1".
- CH1: `vc-1rcEbI44WqE-35` `2kr3r/ppp1bppp/2n1p3/1PP1Pb2/3P4/Q3BN1P/P1q1BKP1/R6R b` — "castle by hand: a rook to e1 or f1, then the king to g1"; step `vc-1rcEbI44WqE-39` (Rhe1).
- KR1: `lines-1.jsonl#2943` "on f1 the king walks into a check from their queen… g1 is the square"; `lines-0.jsonl#3768` lure-king (e5 opens Bd3 toward h7).
- Guard: CT gate :95 (coverer winnable) — no saved board found that hits it.

## H. Open questions
- When THEIR move takes the student's castling away and the student had castled-ready the move before, is that the student's mistake (the skipped castle) to be said on THEIR move, or only through castlingWatch's line on the skip?
