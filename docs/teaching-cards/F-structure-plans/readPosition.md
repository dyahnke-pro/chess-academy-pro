# Card — `readPosition` (family F) — pilot card 2 re-cut into the template

### A. Identity
- `readPosition(fen, studentColor)` — `src/services/positionalRead.ts:798-846`; per-side `observationsFor` :302-697; the proven joins `joinsFor` :716-790; the single-sentence face `buildPositionalRead` :848-884; `leverStem` :886; `RANK` :214-~222; `OPPONENT_PENALTY = 5` :224.
- Adapter `positionRead` `boardComputers.ts:5615-5642`, kind `structure-plan` (key `<kind>|<key>`). Surfaces: chat (groundedAnswer), play (positionFacts), **learn (wired via positionFacts)**, lesson (read), tactics (composer); review: not; think: not.
- Census: 2,578 fired / 1,961 said (chat 1,961 of them); not-said in-flux 296, beside-mate 34, many `subsumed` by plan lines. Teaching map: **P (half state)**.

### B. Facts
- **B1** `PositionalObservation` :180-~211: `key`, `aliases`, `side` (student|opponent), `kind` (`ObservationKind` :169-178: plan, king, development, piece, structure, lever, minority, passer, complex, file, pair), `rank`, `text`, `heldText` (king only), `squares`, `target`.
- **B2 dropped** — per kind, the variable that carried the why:
  - king: `kingSafetyRead` result `king` (:317) — `castled`, `openFilesNearKing`, `exposed`; `castleIsOneMoveAway` (:328-329); `roads` (:366); `castle` (:374) / `onto` (:375) — kept only as prose.
  - development: `asleep`, `lead`, `moveNo` (:399/:406/:407) — counts in prose only.
  - piece: `quality` notes (:421), `outpost.work` (:430 — the target the good piece hits), `strandedAt` squares (:453), `bad` kind/why (:473).
  - pair: `pair.rival` (:484).
  - structure: `weak.isolated/doubled/backward` (:497), `doubledRead.loose/tied` (:544-559).
  - lever: `breaks[0]` (:581) and `hit` (:586) only — `breakContacts` gives the TARGET, but no consequence is computed (no file, no SEE, no lone pawn, no defence). `planSaysIt` suppresses the student's own break on the student's turn (:590).
  - minority / passer / complex — the sub-computers' own dropped fields (see their cards).
  - file: `entry` square (:680), `entryFree` (:681).
- **B3 cheap** (chess.js on the same board; the pilot's "data to compute" list): the break's consequence (file opened, lone pawn, SEE on the target) and the three ways to meet it; colour-complex pawn targets (findColorComplexWeakness card); attackers vs defenders on the weak pawn / the good piece's target; the king's way to castle; the next piece to develop (`squareChoice`); heavy piece to the file (`heavyPieceToFile` :910 exists); the worst piece's route (`pieceRoute`); the square in front of a weak pawn and who reaches it. And THE MISTAKE VIEW — the same read on fenBefore vs fenAfter of a move (which observation the move CREATED for the other side).
- **B4 gates**: king reads need queens on (:316-317); own "castle" only when castling is one move away; theirs from move 8 (:328-329); king-open-file needs an enemy heavy piece able to use the file (:366); development needs queens on, ≥2 home minors and a lead ≥2 (or ≥1 from move 6) (:398-408); no lever talk with ≥3 own minors at home (:581); a break must have a pawn to name (:586-591); weak pawns only when `canBeAimedAt` (:513); doubled only when one is loose/tied (:544-559); file only for the student, a rook able to step on, entry square empty and uncovered (:663-683); `racingPasser` (:822) mutes all but passer/king; joins supersede bare piece facts (:822); a lever/piece about a pawn the structure read already names is cut (:835-838).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `text` per kind; joins (`plan`) teach | most kinds STATE ("you have a pawn break on f4"); the rule clause is written for king/development/file, missing for lever/structure/pair; the MOVE that caused the observation is never known (a standing read) |
| CONSEQUENCE | partly | king (road), file (entry), complex (`by`) | lever (nothing after "challenges your pawn on d4"), structure (what falls), piece (what the good piece wins) |
| BETTER MOVE + JOB | no | — | it is a standing read with no move; only `heavyPieceToFile`/`castleOffFile` point at a move (held in Learn) |
| HABIT | no | — | no skill per kind |

### D. Lesson recipes
The pilot's grid (docs/teaching-cards/pilot-cards.md CARD 2, kinds K, D, G, B, S, L, X) is the full angle list; every pilot row is kept, with the build key below. Rows marked "Learn before move" in the pilot are DELETED (Learn speaks only after the move). The mistake trigger for every row is the DIFF: the observation is new on the board after the move (fenAfter has it, fenBefore did not) and the move cost ≥ inaccuracy — `readPosition(fenAfter)` minus `readPosition(fenBefore)`, matched by `key`.

| id | angle | seat | condition (diff + fields) | slots | LESSON stems (2–3) | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RP-K1 | consequence — king left in centre | S | new `king` (S) after S's move, cost ≥ inaccuracy, best = O-O | | "A king in the middle is in the way of every line that opens." / "Castle before the centre opens, not after." | "The e-file opens after …e5, and your king is on it." (if a break toward it, B3) | "Castling first got the king off the e-file." | "Every move, ask: if the centre opened now, would my king be safe?" | after | ending / queens off (:316) | H + C |
| RP-K2 | their king stuck | O | `king` (O) stuck, S's move failed to open lines (best = the break toward it) | | "When their king is stuck in the centre, open lines toward it before it gets out." | | engine best | | after | O can castle | H |
| RP-K3 | open file at S king | S | new `king-open-file` after S's move | road | "An open file next to your king is the road an attack comes down." | heavy piece that uses it | engine best (castle off / contest) | | after | no enemy heavy piece (:366) | H |
| RP-D1 | development — moved twice / pawn move | S | new `development` (S behind) after S's move | asleep | "A piece still at home can't fight: you're two pieces behind." / "Moving the same piece twice in the opening hands them a free move." | | engine best (a developing move) | "In the opening, ask which piece isn't out yet." | after | the move threatens something (ruleException) | H |
| RP-D2 | ahead — punish | O behind | `development` (O) and S's move was a slow pawn move | | "When you're ahead in development, open the position before they catch up." | | engine best (the break) | | after | | H |
| RP-G1 | good piece traded / let go | S | `piece` good (S) on fenBefore, gone on fenAfter by S's trade | | "Don't trade your best piece for one of their worse ones." | | | | after | the trade won material | C diff |
| RP-B1 | worst piece left | S | `piece` bad (S) and S's move didn't improve it, best = its route | | "Your weakest piece decides how well your whole army plays: improve it first." | | engine best (the route) | "Every quiet move, ask which piece is doing the least." | after | | H + pieceRoute |
| RP-J1 | the join — the pawn that frees the bad bishop | S | `plan` join on fenBefore, S played other, best = the join's pawn move | piece, pawn | "A bad bishop is freed by moving the pawn in its way: here the c-pawn was the bishop's move." | | "c5 freed it." | | after | | H |
| RP-S1 | structure — weak pawn made | S | new `structure` (S iso/doubled) after S's move | | "A pawn no other pawn can guard needs a piece to babysit it." / "Doubled pawns can't guard each other." | "Their rook can aim at it down the half-open file." | engine best | "Before a pawn capture, ask which pawn ends up alone." | after | harmlessWeakPawns holds (guard row) | H |
| RP-L1 | their break, consequence | O | new `lever` (O) after S's move, S's move cost ≥ inaccuracy | target | "Against a pawn break, the simplest defence is to guard the target as many times as it's attacked." / "A pawn exchange opens a file, and the side whose rook gets there first owns it." | B3: file / SEE / lone pawn | engine best | "Every move, ask which pawn break each side wants." | after | — | C (pawnBreak card B3) |
| RP-L2 | knowledge — chain base | either | `lever` target is a chain base (`isChainBase`) | | "Attack a pawn chain at its base." | | | | as LESSON clause | | C |
| RP-X1 | pair given | S | new `pair` (O) after S traded a bishop | | "Two bishops grow stronger as the board opens: giving up yours hands them the pair." | | engine best | | after | | H |
| RP-X2 | colour complex | S | see findColorComplexWeakness CC1 | | | | | | | | |
| RP-X3 | minority / passer / file | either | see findMinorityAttack, passedPawnPush, file rows | | | | | | | | |
| RP-K4 | their king left in the centre (O mistake) | O | new `king` (O) stuck after THEIR move (their cost ≥ mistake, they skipped castling) | | "A king that skips castling has to survive every line that opens." | | — | — | Learn: lesson only, the break toward it held (student's next move) | O castles next move anyway | H |
| RP-S2 | their weak pawn made | O | new `structure` (O iso/doubled) after THEIR move | | "A pawn no other pawn can guard needs a piece to babysit it: theirs on c6 does now." | | — | — | Learn: lesson only | harmlessWeakPawns holds | H |
| RP-REC | record | — | per kind's skill: RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |
- Not applying: the standing read itself on a non-mistake turn — under this WO it is chat/Review only; Learn never speaks a bare observation (the "half state" lines).

### E. Mistake link
- Cause names (errorWhy §D): every RP row is an **E15 positional** tag row (king-stuck-center / weakened-king-safety / neglected-development / misplaced-piece / pawn-weakened) or, when the cost lands in the window, **E13 king-hunt** (RP-K1/K3) and **E11 allowed-capture** (RP-S1/RP-L1). RP-K4/RP-S2 are their side.
- RP-K1/K3: `positionalReason` `king-stuck-center` (`positionalReason.ts:210`) and concession `file-opened` → `weakened-king-safety`. Seat S. RP-K2 seat O.
- RP-D1: `neglected-development` (`positionalReason.ts:154`). RP-B1/RP-J1: `misplaced-piece` (`positionalReason.ts:192/:223`) / `no-plan`. RP-S1: `pawn-weakened` → `created-pawn-weakness`. RP-L1: costReason `allowed` / `file-opened`; RP-X1: no cause today (bishop pair conceded → same new cause as `colour-conceded`, or its own).

### F. Build changes
1. `positionalRead.ts:180-211` — add a typed payload per kind (`facts: KingFacts | DevFacts | LeverFacts | …`) carrying the B2 variables, so recipes never parse `text`.
2. `positionalRead.ts:581-600` (the lever rung) — compute the break's consequence (file opened after the capture, SEE on `hit`, lone pawn after) via the pawnBreak card's new `meetBreak` / exposed fields; the current text "it challenges your pawn on d4" (no consequence) is a restatement — delete it from Learn.
3. New `readPositionDiff(fenBefore, fenAfter, student)` — observations new after the move, by `key` → the mistake trigger for every RP row.
4. Learn path (positionFacts `learn: wired`) — speak readPosition only through `mistakeLesson` rows; remove the standing-read speech from Learn.
5. Delete `leverStem` (:886, "c5 is a pawn break for you now.") from Learn — pure restatement.

### G. Proof boards
- **Ran** `readPosition` (scratch vitest) on David `chesscom-1001055178` after 9.Bxf6 Bxf6 (`r2qk2r/ppp2pp1/2n1pb1p/3p4/3P4/1P3PP1/P1P2PBP/RN1Q1RK1 w kq - 0 10`): **no observations at all** — the move's real lesson (the dark squares, d4) is invisible to the read. After the engine line `c3 Ne7 Qd3 c5`: one observation, `opponent lever` "Their pawn break is the push to e5: it challenges your pawn on d4." — the pilot's no-consequence complaint, reproduced. Same run: `boardPlanFacts` levers = develop b1 / break c4 at d5 / rook to the e-file; `boardStructure` [], `frozenTarget` null, `pawnCentre` null.
- Census rows (chat): "Your king is still in the centre and castling is one move away — tuck it in before the centre opens." / "You still have 2 minor pieces at home…" (computer-map-raw samples).
- Guard: racing passer boards (:822 mutes all but passer/king).

### H. Open questions
1. The king in the centre on a NON-mistake turn (castling one move away, nothing lost yet): silent under the WO, or the one standing warning kept?
2. RP-X1 (bishop pair given up) — its own cause, or folded into `colour-conceded`?


## Restored from the pilot grid (David approved these; the re-cut dropped them)
Each row keeps its angle, condition, data, lesson and guard. These join §D and are written to the same voice and recipe rules.

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| CONSEQ | central file open / opening | H | Once a central file opens, a king still in the middle can be checked down it. | file open or break pending |
| IDENT | which side safer | H (castlingWing) | Castle on the side where the pawns in front of your king are still home. | — |
| PLAN | castling blocked | C: piece between king and rook | Clear the way to castle: the last piece out is often the one blocking it. | piece on f1/g1 or b1–d1 |
| PLAN | can't castle | H (castleByHand) | When you can't castle, walk the king to safety by hand. | lost rights |
| combo: + development lead | S king centre, O ahead | H | Behind in development with your king in the centre is the worst combination: castle and develop before anything else. | — |
| STRAT (behind) | S behind | H | When you're behind in development, keep it closed and catch up. | — |
| IDENT | which piece next | C: home minor + best square (squareChoice) | Develop the piece with the fewest good squares first: the others can wait. | — |
| exception | twice with a threat | H (ruleException) | Moving a piece twice is fine when it wins something or forces a reply. | the move threatens |
| KNOW | always | H | Knights before bishops; castle early; don't bring the queen out too soon. | opening |
| phase | middlegame on | — | doesn't apply after development is complete — reason: no home minors | — |
| RECOG | good piece found | H | Know which of your pieces is doing the most: that's the one to keep and build around. | — |
| IDENT | target on its line | H | A piece is strong when it hits something. Name what it's aiming at. | target exists |
| CALC | target loose | H | An attacked piece with no guard is a target right now. | no defenders |
| PLAN | heavy piece can join | C: heavyPieceToFile | Doubling on a file doubles the pressure: the second piece wins the target. | piece can reach |
| CONSEQ | target pinned / tied | C: pin & tied readers | A pinned piece can't escape, so pile on it. | pin holds |
| seat O | their best piece | H | Their best piece is the one to trade off. | — |
| combo: + their worst | S best vs O worst | H | Trade their good piece, keep their bad one: the game turns on the pieces left. | — |
| PLAN | has a route | C: pieceRoute/pieceWish | Find the route that brings your worst piece into the game. | route legal |
| PLAN (pawns) | bad bishop, own pawns | C: pawn moves that free it | Move your pawns off the bishop's colour to free it. | — |
| KNOW | always | H | Improve your worst piece. | — |
| IDENT | the square in front | C: square ahead + who can land there | The square in front of an isolated pawn is the best home for an enemy knight. | knight can reach |
| CALC | attackers vs defenders | C: count | Count the pressure on the weak pawn: when attackers outnumber defenders, it falls. | — |
| IDENT | target pawn | H | A break is aimed at a pawn: find which one. | — |
| CONSEQ (wins pawn) | SEE after push > 0 | C: SEE | A break that hits a pawn guarded fewer times than it's attacked just wins it. | SEE ≥ 100 |
| KNOW (named) | named structure | H (namedPawnStructure) | Every pawn structure has its typical breaks: in the [name], it's [break]. | name matches |
| seat O | their break | H | Ask every move: which break do they want, and is it ready? | — |
| timing: Learn | S to move, S break | H | Learn: "Their pawn on e4 is the one to challenge." (push held) | never name the push square before the move unasked |
| combo: + their king centre | S break opens toward their king | H | The break that opens the centre is the attack when their king hasn't castled. | king uncastled |
| STRAT (pair) | S has pair | H | Two bishops work best in an open position: open lines for them. | — |
| CONSEQ (pair given up) | trade gives up pair | H | Giving up a bishop gives up control of its colour. Ask which squares you're giving away. | — |
| IDENT (complex) | bishop gone, theirs remains | H + C: targets on that colour incl. pawns | When your bishop of one colour is gone, their bishop of that colour rules those squares. Watch your pawns on that colour. | their same-colour bishop on board |
| PLAN (complex) | a minor can settle | H | Plant a piece on the weak colour's squares: they have nothing to chase it with. | piece reaches the hole |
| PREV (passer, O) | their passer | H | Blockade a passed pawn: the square in front of it is the place to stop it. | — |
| KNOW (passer) | passer | H | The best blocker of a passed pawn is a knight. | — |
