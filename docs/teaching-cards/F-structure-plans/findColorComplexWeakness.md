# Card — `findColorComplexWeakness` (family F)

### A. Identity
- Computer: `findColorComplexWeakness(fen)` — `src/services/positionReadingService.ts:997-1060` (helpers `findWeakSquares` :831, `minorSettles` :921, `landsSafely` :905, `squareColor` :585).
- Adapter: `boardComputers.ts:5792-5826` (`colourComplex`), CoachFactKind `complex` (FACT_GROUP → `structure`, `coachFact.ts:134`). Also read inside `positionalRead.ts:637-650` (readPosition's `complex` observation).
- Surfaces: lesson, review, play-read, chat (via thought), think, learn (via thought), tactics-read; weaknesses: not ("a reading of the board").
- Census: fired 437 / said 62 (`computer-map-raw.json`); not-said reasons: already-said 287, unsupported 54, in-flux 17, subsumed ~14, beside-mate 2.

### B. Facts
- **B1 handed over** (`ColorComplexWeakness`, :975-984): `side` (whose complex is weak), `complex` ('light'|'dark'), `squares` (the holes of that colour in the side's own half, rank 3-6, `findWeakSquares`), `by` ('knight'|'bishop' — the enemy minor that can settle on one).
- **B2 computed but dropped**
  - `hasBishopOfColor` (:1007) — which bishop the side still has (so the *other* bishop's survival — "you kept the light one" — is known and dropped).
  - `exploiter` (:1017) — the enemy piece type per colour; only `by` of the first passing hole survives.
  - The hole the minor actually settles on (`h` at :1046, the loop's winner) is dropped: `squares` returns ALL holes, not the one proven reachable. The adapter then says "five squares are holes" — the specific square the lesson needs is thrown away.
  - `minorSettles` returns the type, not the route/the piece square (`a`, `mid` at :956/:969) — "the knight on e7 reaches d5 via c6" is computed and dropped.
- **B3 cheap to compute** (chess.js, same board)
  - **Pawns of the side on the weak colour** attacked/eyed by the enemy's same-colour bishop (David's board: d4 on a dark square, hit by Bf6 along f6-e5-d4). Today pawns are never counted — a pawn is not a hole. `chess.attackers(pawnSq, enemy)` filtered to bishops of that colour + x-ray through own pieces.
  - **The trade event**: did the last move (either seat) remove the side's bishop of this colour? Compare `hasBishopOfColor` on fenBefore vs fenAfter — one extra call. This is the *mistake* trigger the computer lacks: it reads a standing board, never "your move gave it away".
  - **Who still has a bishop of that colour on the other side** (enemy same-colour bishop present → "their bishop rules those squares"); the bishop's mobility on that colour.
  - **The better move that kept the bishop**: from the saved engine read (`reads[ply].before[0]`), the retreat square and the next square on its pv (David: `g5c1` then `c1b2`) — "guarding d4 from b2" = `chess.attackers('d4','w')` after playing the pv's first two of the mover's moves.
  - **Own pawn moves that put pawns on the weak colour** (the pawn-moves-onto-the-colour lesson): pawns of the side on squares of `complex`.
- **B4 gates** (file:line, value)
  - Any bishop on the board (:1003) — else `[]`.
  - Hole zone ranks 3-6 (`findWeakSquares` :837), side's OWN half only (:1013-1014: white rank ≤4, black ≥5).
  - Side has NO bishop of that colour (:1037).
  - Enemy has an exploiter (knight, or same-colour bishop) (:1038).
  - **≥ 2 holes of that colour in the own half (:1040, `cHoles.length < 2`).**
  - At least one hole: not a/h file, empty, no own minor covering it, and the enemy minor `minorSettles` within two moves safely (:1046-1052).
  - **The miss (David, chesscom-1001055178, ply 17, 9.Bxf6 Bxf6):** after the trade, White's dark holes in own half = c3, a3 (2 → passes :1040). a3 is skipped as rim; c3 is covered by White's Nb1 (`ownerMinorCovers`) → `by` null → returns `[]` (run, §G). The lesson's real target is the **d4 pawn** on a dark square, which no gate ever looks at.

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `complex`, `squares`, `by` | the trade that caused it; the pawn targets on that colour; the one settling square; the enemy same-colour bishop by square |
| CONSEQUENCE | partly | `by` ("a knight belongs on one") | which square, which piece, what it hits from there; the first target pawn |
| BETTER MOVE + JOB | no | — | the move that kept the bishop (engine read) and its job (what it guards from where) |
| HABIT | no (no record tie) | — | a skill id: `colour-complex` / record hook; the fixed habit stem |

### D. Lesson recipes
Fields: CC = this computer; T = trade-event (B3); P = pawn targets on the colour (B3); E = enemy same-colour bishop (B3); BM = engine best move + its pv (saved read).

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CC1 | consequence (now) — bishop traded | S gave it | T: S's bishop of colour X left the board on S's move, S has none left of X, E present; P non-empty or CC fires | colour→"dark", first P→"d4", E square→"f6" | "Trading off your dark-squared bishop hands them the dark squares, and d4 is the first target." / "With your dark-squared bishop gone, their bishop on f6 has the dark squares to itself — and your pawn on d4 sits on one." / "A bishop guards one colour. Trade it, and every pawn of yours on that colour has lost its guard; d4 is the first." | "Their bishop on f6 already hits it." | "Bc1 kept it, guarding d4 from b2." | "Before you trade a bishop, ask which colour you're giving away." | said after the move, no move named ("Trading off your dark-squared bishop…" names the piece, not the move — allowed) | E absent (no one to rule the colour); S still has a same-colour bishop; trade won material ≥ a pawn (cost <50 → not a mistake turn) | C: T+P+E chess.js; BM H (saved read) |
| CC2 | consequence — O gave theirs | O | T on O's move, O lacks X, S has bishop or knight of X; CC fires for O, or P(O) non-empty | colour, hole/target | "Their dark-squared bishop is gone, so the dark squares around their king belong to your pieces now." / "Without that bishop they can never cover d6 again — it is a home for your knight." | "Your knight can reach d6 via e4 and nothing chases it off." | (Review) "Keeping your own dark bishop, not trading it, is what makes those squares count." | "When they trade off a bishop, look at the squares of its colour: that's where your pieces go." | said after THEIR mistake | no own exploiter; the hole is on the rim | H (squares) + C (route from `minorSettles` `a`,`mid`) |
| CC3 | identify — the settling square | either | CC fires, `by`=knight, proven hole `h` (B2) | h, knight square, route | "A hole of the weak colour is a home for a knight: from c3 nothing can ever chase it." | what it hits from h (chess.js attacks from h) | — | "Look for squares no pawn can attack; those are where knights live." | Review/after mistake only | route needs ≥2 moves through a safe stop (`holdsStop`) | C: expose `h`,`a`,`mid` |
| CC4 | prevent | S | S is about to trade (Review: the played move is BxN removing S's last X-bishop) and E present | colour | "Your dark-squared bishop was the only piece covering the dark squares: keep it, and their bishop has nothing to aim at." | — | BM | CC1 habit | Review only (before-move = names the next move → never in Learn) | — | H |
| CC5 | own plan — pawns onto the other colour | S weak on X | CC/P fires for S, S has pawns on X squares | pawn squares | "When you're weak on the dark squares, put your pawns on dark squares to guard them, or your bishop on the light ones has nothing to defend." (stem keyed: weak colour X → pawns ON X) | — | — | — | Review/chat only (no mistake attaches unless a pawn move left X) | — | C: pawn squares by colour |
| CC6 | their plan | O exploits | E present and its diagonal hits ≥1 P | E sq, P sq | "Their bishop on f6 is the piece the dark squares belong to: everything it looks at is a target." | "It's aiming at d4 now, and after c5 it hits it twice." (only if the saved pv has the lever) | — | — | after the trade (CC1 consequence) | pv absent → no "after" clause | C: attacks + saved pv |
| CC7 | strategize (when trading is fine) | either | trade removes S's X-bishop but O's X-bishop also gone or O has no exploiter | — | "Trading this bishop was safe: they have no piece left that can use the dark squares." | — | — | — | Review/chat only (not a mistake) | — | C |
| CC8 | knowledge — bad vs good bishop | S | the bishop S kept is blocked by own pawns on its colour (`findPieceQuality` bad bishop) | — | "You kept the bishop that's blocked by your own pawns and traded the one that guarded your weak squares — the wrong one to keep." | — | BM | CC1 habit | after the move | badbishop reader must agree | C: combine `findPieceQuality` |
| CC9 | knowledge — king's colour | S castled | the weak colour X contains S king's shelter squares (f3/g2/h3 or f6/g7/h6 colour X) and O has queen + X-bishop | squares | "With your dark-squared bishop gone, the dark squares around your king are the ones their queen and bishop will mate on." | "Watch h2 and g3 now." | BM | CC1 habit | after the move | O lacks queen; ending | C |
| CC10 | phase: endgame | either | ending, opposite-coloured bishops or minor ending, pawns of S on E's colour | P | "In a bishop ending, your pawns on its colour are its targets: put them on the other colour." | — | — | — | Review | no bishops (:1003 already) | C |
| CC11 | combine — minority/break | O | CC fires and O's lever (pawnBreak/leverPasser) hits P on X | lever target | "Their bishop on the dark squares and the c5 break hit the same pawn: d4 is under two attacks now." | — | — | — | after the move | both facts must name the same pawn | C: join with pawnBreak |
| CC12 | counterfactual | S | S's trade; BM is a bishop retreat | BM pv | (=CC1 BETTER-MOVE) | — | "Bc1 kept it, guarding d4 from b2." | — | after the move | BM not a bishop move → drop the slot | H |
| CC13 | exception — trade wins tempo / material | S | trade is the engine's best or within 30cp | — | silent (not a mistake) | — | — | — | — | — | H |
| CC14 | record | — | skill RED/GREY: full CC1; AMBER: "That trade gave them your dark squares."; GREEN: silent | | | | | | | | |
- Angles not applying: **calculate (count)** — a colour weakness is not a count; the count lives in the pawn-target attackers/defenders (frozenTarget/pictureTarget) and is joined via CC11. **Both seats** — covered by CC1/CC2. **timing before move** — Learn never speaks before the move.

### E. Mistake link
- **CC1/CC8/CC9/CC12** explain a student move that `errorWhy` marks positional with no material reason: today `positionalReason` has NO concession kind for it (`DrawbackKind` = defender-left | file-opened | piece-offside | pawn-weakened | outpost-conceded, `concessionBeat.ts:30-35`), so David's Bxf6 (−69cp) falls to a generic `misplaced-piece`/no-plan. New cause needed: `colour-conceded`.
- **CC2** explains the opponent's same mistake (seat O).
- **CC3/CC6/CC11** are consequence clauses attached to the above.
- **CC5/CC7/CC10** Review/chat only.

### F. Build changes
1. `positionReadingService.ts:975-984` — extend `ColorComplexWeakness` with `settle: { square, piece, from, via|null }` (expose `h`, `a`, `mid` from :1046/`minorSettles` :956/:969) and `bishopKept: Square|null` (from `hasBishopOfColor`, :1007). Enables CC3, CC8.
2. New pure `colourConceded(fenBefore, san)` beside it: returns `{ side, colour, traded: Square, enemyBishop: Square|null, pawnTargets: Square[] (side's pawns on that colour attacked or x-rayed by the enemy same-colour bishop), holes: Square[] }` when the move removed the side's last bishop of that colour. **This does not use the ≥2-hole gate** — the trade + an enemy same-colour bishop + ≥1 pawn target or ≥1 hole is enough. Enables CC1/CC2/CC6. Miss board it catches: David ply 17 (d4). Guard board it must not fire on: a trade where the enemy has no bishop of that colour (CC7), and `vc--Y5bZoD6TM0-55` style endings handled by the existing gate.
3. `concessionBeat.ts:30` — add `DrawbackKind 'colour-conceded'` and `positionalReason.ts:36` map it to a tag (`created-pawn-weakness` or a new `colour-complex` misconception tag — owner call H1). Makes it a `MistakeCause`.
4. Sensitivity of the standing read: `:1040` `cHoles.length < 2` → keep for the *standing* fact, but count **pawn targets on the colour** toward the threshold (`cHoles.length + pawnTargets.length < 2`). Catches David after 9…Bxf6 (holes c3,a3 + pawn d4); must still not fire on `vc-1rcEbI44WqE-99` (rook+bishop ending, no own-half holes usable — verify).
5. `boardComputers.ts:5800-5811` — delete the "five squares are holes" count renderers ("Their dark squares are weak: five squares are holes…") — board restatement; the recipe table (`mistakeLesson`) words CC1-CC12 from the typed fields.
6. Recipe rows CC1, CC2, CC3, CC6, CC8, CC9, CC11, CC12 → `mistakeLesson` `Record<MistakeCause, LessonRecipe>` under cause `colour-conceded`.

### G. Proof boards
- **Fires (needed, misses today):** David `chesscom-1001055178` ply 17 — FEN before `r2qk2r/ppp1bpp1/2n1pn1p/3p2B1/3P4/1P3PP1/P1P2PBP/RN1Q1RK1 w kq - 0 9`; saved read best `g5c1` +20 (pv `c1b2`), played `g5f6` −49 (69 cp). **Ran** `findColorComplexWeakness` (scratch vitest) on the board after `Bxf6 Bxf6` (`r2qk2r/ppp2pp1/2n1pb1p/3p4/3P4/1P3PP1/P1P2PBP/RN1Q1RK1 w kq - 0 10`): `findWeakSquares` white = [c3, a3, h3]; result `[]`. After the engine line `c3 Ne7 Qd3 c5`: still `[]` (holes now d3,a3,h3).
- **Fires today (standing read):** `vc-_X7t6o3o6JM-47` (`3R4/pp4k1/4br2/2nN3p/8/4P3/PPP5/1K3B1R b`) "Your dark squares are weak … g3 and h4"; `vc--Y5bZoD6TM0-31` "d5 and f5 are holes … Your bishop can work on them"; `vc-_X7t6o3o6JM-40` d6 and h6.
- **Guard:** knight endings (no bishops, :1003); `vc-1rcEbI44WqE-99` (said nothing usable — only states a count); a trade where the opponent's same-colour bishop is already gone (CC7 says "safe").

### H. Open questions (owner)
1. New misconception tag `colour-complex` vs filing under `created-pawn-weakness`?
2. Should CC1 speak on an *inaccuracy* (David's Bxf6 is 69 cp) or only from mistake strength (≥100)? The approved sentence implies yes at 69 cp.
3. CC5 ("pawns onto the weak colour") is generally taught but contested — keep it Review/chat only, or allow after a pawn move that left the colour?
