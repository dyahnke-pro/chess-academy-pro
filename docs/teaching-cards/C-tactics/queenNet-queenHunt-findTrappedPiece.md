# queenNet / queenHunt / findTrappedPiece — card (one concept: the piece with no safe square)

## A. Identity
- `queenNet(fenBefore, san)` — `src/services/queenNet.ts:70` (+ its own `queenSafeSquares` :43, SEE rule); words `queenNetLine` :101. Board computer `queenNet` boardComputers.ts:3835-3850, kind `tactic`.
- `queenHunt(fenBefore, san, line)` — `src/services/queenHunt.ts:97` (shapes boxed | one-square | escape; `trapMove` :71, `pinnedToKing` :87, a SECOND exported `queenSafeSquares` :47 with a different rule); words `queenHuntLine` :158. Board computer `queenHunt` boardComputers.ts:7025-7043, kind `move-job`.
- `findTrappedPiece(fen, side, lineUci)` / `trappedOnBoard` — `src/services/reviewTeachingPoints.ts:855-895` (trappedOnBoard :870) over the ONE trapped computer `trappedAt` (`src/services/trappedPiece.ts:31`). Board computer `trappedPiece` boardComputers.ts:5694-5715, kind `trapped`, skills `missed-your-trapped-piece` / `hung-material`.
- Shared claim `queen-run:<sq>` between queenNet and queenHunt (one says it).
- Census: queenNet 15/10, queenHunt 10/8, findTrappedPiece 3/2.

## B. Facts
### B1. Handed over
- QueenNet: `queen`, `queenColor`, `taken[]` (squares the move took away), `left[]` (≤1), `hits`, `piece`, `to`.
- QueenHunt: `shape`, `queen`, `hunter`, `exit` (one safe square), `net` (the move that traps it on its exit: san, from, to, `pins`), `squares`.
- Trapped: `square`, `piece` (Q/R only), `attackerSquare`, `attackerPiece`; only when the engine line takes it (`lineTakesPiece`).
### B2. Dropped
- **ROT: two `queenSafeSquares` with different rules** — queenNet.ts: "safe" = SEE on landing < 1; queenHunt.ts: unsafe if any attacker worth < 9 (cheaper), else safe only if defended (= trappedAt's escape rule). Same board, two answers to "how many squares does the queen have". The queenNet one also ignores the "defended by own" nuance.
- trappedAt's rescue test (trappedPiece.ts:43-45, `stillWinnable`) — "no rescue" is the full proof; only "every escape square is covered" is said.
- queenNet `beforeSafe` (squares before the move) — the count drop ("it had four squares, now one").
- findTrappedPiece: knights and bishops excluded (Q/R only, `trappedOnBoard`, reviewTeachingPoints.ts:879) though `trappedAt` handles any non-pawn — the trapped-minor lesson is only in detectTactics' `trapped_piece` (Review).
### B3. Cheap
- The owner's mistake move that walked the piece in: did the student's own move put the queen there (mv.piece === 'q' and `queenSafeSquares(after, mv.to)` ≤ 1 AND opponent then hunts)? → "the queen raid" mistake.
- The escape the student missed: queenHunt `escape` shape run on the student's alternatives (best move = a queen retreat).
### B4. Gates
- queenNet: not a king move, no check; queen not captured; ≤ 1 safe square after; the move covered ≥1 of them; queen in the mover's half (a raid) OR hit with 0 squares.
- queenHunt: escape shape = mover's queen moves off a square where a trapping move existed; hunt = a cheaper hunter, newly attacking, hunter not lost, ≤1 exit; one-square gets the trapping `net` on the exit.
- trapped: attacked by a cheaper piece or undefended; every move of it unsafe; no other move rescues; line takes it.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | habit stems "Count your queen's squares before it goes raiding." | the rule first ("a queen deep in their half needs an exit") |
| CONSEQUENCE | yes | "It's coming off the board" / "Its only safe square is c2" / net "traps it" | — |
| BETTER MOVE + JOB | partly | queenHunt escape `net` ("there, Ra1 would have trapped it") | for S's raid mistake: errorWhy best ("Qd2 kept the queen home") |
| HABIT | yes | "Count the queen's squares." / "List the queen's escapes." | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| QN-1 | prevent (queen raid) | S mistake | S moved the queen into their half and after O's reply queenNet/queenHunt/trapped fires on it; errorWhy cost ≥ mistake | queen, taken, left, hunter | "A queen deep in their half needs a way home. Your queen on h3 has one square left, h4, after their rook took h3's cover." / "Before your queen goes raiding, count its squares back." | "One more move and it's trapped." / trapped: "It's lost." | errorWhy best | "Count your queen's squares before it goes raiding." | after | queen safe (≥2 squares) | H + C |
| QN-2 | own chance missed | S | O's queen had ≤1 square and the trapping move (queenHunt `net` / pawnHit) existed; S played other | queen, exit, net | "When their queen has one square left, take that square away. Their queen on b2 could only run to c2." | "Then it's trapped." | "Rc1 was the move — it took c2." (once past) | "List the queen's escapes." | after, past-only | — | H |
| QN-3 | consequence (trapped, any piece) | both | trappedAt fires for a rook/minor | piece | "A piece with no safe square is as good as lost — even if nothing takes it yet." | "It's coming off the board." | | spotCue trapped-piece | after the mistake that allowed it | line doesn't take it (gate) | H |
| QN-4 | knowledge (cheaper hunter) | both | hunter worth < queen | hunter | "A queen can't stand next to a minor piece that attacks it: the minor wins it even when the queen is defended." | | | | | — | H |
| QN-5 | own escape (good) | S | queenHunt escape shape | net | "Your queen got out in time: on that square, a rook move would have trapped it." | | | | Review / praise path | — | H |
| QN-6 | strategize (trap the queen) | S | queenNet hits=false, taken ≥ 2 | taken | "Hunting a queen means taking squares away one move at a time: each quiet move takes another escape." | | | | Review | — | H |
| QN-7 | exception (rescue) | both | trappedAt second-pass rescue found | — | "A piece with no square can still be saved by a block or a counter-threat — look before you give it up." | | | | Review | — | B2 |
| QN-REC | record | — | `missed-your-trapped-piece` / `hung-material` / `missed-their-trap` | | RED/GREY full; AMBER "Your queen has one square left."; GREEN silent | | | | | | holdRate |
n/a: phase (any — queen traps mostly middlegame; no phase rule computed).

## E. Mistake link
- costReason `allowed` motif `trapped_piece` (S's piece) → QN-1/QN-3, seat O.
- costReason `missed` motif `trapped_piece` (their piece) → QN-2.
- whyItFailed `lost-the-piece` when the lost piece had no square (not just hanging) → QN-3 lesson stem instead of "hanging".

## F. Build changes
1. ONE `queenSafeSquares`: delete the copy in queenNet.ts and import queenHunt.ts's (the trappedAt escape rule) — or better, derive both from `trappedAt`'s escape test (`trappedPiece.ts`, the move loop) exported as `safeEscapes(fen, sq)` for any piece. Fixes two answers to one question (rot rule).
2. findTrappedPiece (`trappedOnBoard`, reviewTeachingPoints.ts:879) — include N and B (trappedAt already handles them); the "minor trapped" lesson is then said where the line takes it.
3. Expose `beforeSafe.length` in QueenNet → QN-6 ("four squares to one").
4. trappedAt (trappedPiece.ts:43) — return the rescue that was checked (today a boolean that returns null) → QN-7.
5. QN-1 wiring: on the student's queen move, run queenNet/queenHunt on the OPPONENT's reply (they hunt) and attach to errorWhy when cost ≥ mistake (recipe `queen-raid`).
6. Words → recipes; keep the `queen-run` shared claim.

## G. Proof boards
- QN-1 (S queen): text lines-0 "Count your queen's squares before it goes raiding. Your queen is running short of squares: their rook on c3 covers h3. Its only safe square left is h4."; lines-1 "Your queen on g3 has no safe square. Their rook on g8 hits it, and every square it could run to is covered."
- QN-2 (O queen): vc--4hTQEnwa7s-40 `2kr4/ppp2pp1/2n5/3p4/P3p1bq/BP2P1b1/R1PP2B1/1N1QR1K1 w - - 1 21` ("Your bishop on g4 hits their queen on d1. Its only safe square is c1." — queenHunt one-square); lines-0 "Their queen on f4 is trapped — attacked by the bishop on e5, and every escape square is covered." (findTrappedPiece).
- Guard: queen with ≥ 2 safe squares → null.

- **Pure-function run (chess.js only, scratch vitest, deleted after):** on vc--4hTQEnwa7s-40 (before → Bg4): `queenHunt` → `{shape:'one-square', queen:d1, hunter:b g4, exit:c1, net:null}`; `queenNet` → null (queen not in the mover's half and not boxed); both `queenSafeSquares` copies return `[c1]` here — they diverge only on a square attacked by a cheaper piece and defended (queenNet's SEE rule calls it safe when the trade is even); F1 still stands (one rule).

## H. Open questions
1. none
