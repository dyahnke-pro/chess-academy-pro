# Card — `kingSacrifice` / `describeSacBreaksKingShield` (the sacrifice at the king)

## A. Identity
- `src/services/kingSiege.ts:537` `kingSacrifice(fenBefore, san, line, moverCp, moverMate)`; renderer `kingSacrificeLine` (:611), `kingSacrificeSquares` (:633). Registry `boardComputers.ts:4093` (kind `sac-why`, needs `sacLineNamed` :1595 — the line trusted); also `deepCombination.ts:179/288` (excludes / reuses it).
- `src/services/reviewSacrifice.ts:160` `describeSacBreaksKingShield(fenBefore, san)`; registry `boardComputers.ts:1965` `sacKingShield` (Review facets, kind `sac-why`) and `:4688` `sacShield` (walk surfaces, kind `sac`). Both hand `seat: 'student'` and the clause opens "You give up…" (:187-189) whoever moved.
- Census: 3 / 3 (Review 2, lesson 1).

## B. Facts
- **B1** `KingSacrifice` (:503): `mover`, `san`, `given` (piece), `took`, `accepted` (reply SAN), `opens` (`king-out` square / `shelter` pawn square / `defender` piece), `follow[]` (mover's forcing moves after), `line[]` (proved SAN), `outcome` (`mate` / `ahead` / `material` / `attack`), `key`. describeSacBreaksKingShield → a clause string.
- **B2 dropped**: `given` net points (:550 `given = value(piece) − value(captured)`); `balance(end)` vs `balance(before)` (:586-593) — the exact material result; the mate-threat stop (:573-577, "a quiet move that threatens mate"); in the shield clause, `isExchange` (:185) and the captured piece type are said, but `attackersLeft` (:181) which pieces remain is dropped.
- **B3 cheap**: `followTarget` — whether each `follow` move lands in the king's neighbourhood (`kingNeighbourhood`) or elsewhere — the census row "…Nxe4 gives up your knight to rip away the pawn on e4… After dxe4, …Qxb2 follows, and the attack is worth more than the piece" calls a queenside grab an attack (F.4); `declineLine` — the defender's alternative to accepting (the line's second-best reply is not read) — the lesson "you don't have to take".
- **B4 gates**: move lands within 2 of the king or gives check (:548); gives ≥2 points, not a king (:551); the engine reply takes it (:553-556); not a straight recapture trade (:560); ≥1 forcing follow-up (:581); outcome resolves (:593-594); material outcomes need ≥2 follow moves (:597); something opened (:599-607). Registry: `sacLineNamed` (line trusted). Shield: a capture on a square beside the king (:173-176), an attacker left (:183).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "gives up your knight to rip away the pawn in front of their king" — what it opened (a reason), but stated as this move's description | general rule ("a sacrifice at the king pays when the follow-up is forcing") |
| CONSEQUENCE | yes | "After Kxh7, Ng5+ follows, and it ends in mate" | — |
| BETTER MOVE + JOB | no | — | for the DEFENDER's mistake (accepting): the decline move |
| HABIT | no | — | record (sacrifice / king-safety) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KX1 | CALC (accepted, lost) | S defender | THEIR kingSacrifice, the student's acceptance was the costly move (costReason allowed) | opens, follow | "A piece offered at your king is bait: before you take, look at what the capture opens — here the {opens}." / "Taking a sacrificed piece near your king is only safe if their follow-up runs out of checks." | "After the capture, {follow} {outcome}." | "{decline} kept the king's shelter." (once past) | "Before you take a piece near your king, count their checks after it." | "That capture opened your king: {follow first} follows." (their move named) | outcome `material` with no king follow (B3) | H; C declineLine |
| KX2 | KNOW (missed sac) | S attacker | costReason missed with bestSan a kingSacrifice | opens | "When their king's shelter has one key defender, a sacrifice that removes it can be worth a piece — the follow-up must be checks or mate threats." | "{follow} {outcome}." | "{best} gave the piece to {opens}." (Review / after) | "When your pieces gather near their king, look at the sacrifice on the shelter pawn." | "There was a sacrifice at their king." | — | C kingSacrifice(fenBefore, bestSan, line) |
| KX3 | CALC (unsound sac) | S attacker | student sacrificed, no kingSacrifice (outcome null) + cost | — | "A sacrifice needs a forced follow-up: without checks or a mate threat after the capture, it's just a piece lost." | — | "{best} kept the piece." | "Before you sacrifice, play the line to the end: checks, captures, mate threats." | "The sacrifice had no follow-up." | not a sacrifice (given < 2) | C (run with the student's san: null + given ≥2) |
| KX4 | KNOW (shield) | S | describeSacBreaksKingShield on the move | — | "Giving the exchange for the piece beside the king is a classic: the king loses its guard and the attack goes on." | — | — | — | Review only (a good move) | seat: clause is hardwired "You" — never on THEIR move until fixed | H |
| KX5 | exception | — | straight recapture (:560) | — | silent: "a trade, not a sacrifice" | | | | | | |
| — | phase | — | gated by "near the king"; endgame cases rare (shield gate needs an attacker left) | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "That capture opened your king." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student defender: `costReason` allowed (mate / attack) after accepting → KX1.
- Student attacker: `costReason` missed with the sacrifice as the best move → KX2; the student's own unsound sacrifice (`whyItFailed` `lost-the-piece`) → KX3.
- KX4 Review only.

## F. Build changes
1. `kingSiege.ts:503` — add `givenPoints`, `balanceBefore`, `balanceAfter`, `followNearKing: boolean[]`.
2. `kingSiege.ts:593` — sensitivity: outcome `attack` requires at least one `follow` move landing in `kingNeighbourhood(king)` or giving check; old: engine ≥150 alone; miss board (false today): `lines-1.jsonl#6323` (…Nxe4 … …Qxb2 called "the attack"); guard: the Greek gift Bxh7+ Kxh7 Ng5+ (follow next to the king).
3. `reviewSacrifice.ts:160` — take a REQUIRED `who: 'you' | 'they'` (the mover's seat); `boardComputers.ts:1970/4691` pass it instead of `seat: 'student'`.
4. Pure `declineLine(fenBefore, san, lines)` for KX1's better move.
5. Recipes KX1–KX3 → `mistakeLesson.ts`.

## G. Proof boards
- KX1/KX2 shape: `lines-1.jsonl#6323` (…Nxe4 gives up the knight; Qxb2 follow — the F.2 case).
- KX4: `lines-2.jsonl#6539` ("You give up the knight, but you tear the pawn away from beside their king").

## H. Open questions
- Should "the attack is worth more than the piece" ever be said when the engine score is the only proof (no mate, no material back)? F.2 narrows it; David may want it silent entirely.
