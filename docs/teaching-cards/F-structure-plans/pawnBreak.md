# Card — `pawnBreak` (family F)

### A. Identity
- `pawnBreak(fenBefore, san, whose, lastTo, namesStudentMove)` — `src/services/pawnBreak.ts:130-266`; THE one break definition `isPawnBreak` :43 (read by `computedPlan`), `BREAK_FROM_MOVE = 6` :70, `FREED_SQUARES = 3` :72.
- Adapter `boardComputers.ts:3633-3655`, kind `pawn-break` (also `two-jobs` when joined). Surfaces: lesson, **learn (LEARN, direct)**, review, play-read, chat, tactics-read, think; weaknesses: not ("timing is breakRace's question, mistimed-pawn-break").
- Census: 96 / 88 said — already a teacher (T). Says the move just played (both seats).

### B. Facts
- **B1** `PawnBreak` :75-83: `text`, `squares` [from, to, struck, opened-for pieces], `proof` (legal line break + capture), `key`. Everything else lives only in prose.
- **B2 dropped (all computed, none typed)**
  - `struck` (:169/:179/:186) the pawn hit; `base` (:191, `isChainBase`) and `centre` (:192) — what kind of pawn.
  - `opens[]` (:197) — per file: `open` vs half-open (:211), `toKing` (:212), the rooks on it (:199/:210); per bishop: freed (:220-228).
  - `line` (:168/:178/:185) — the trade; `choice` (:147, set :162) — whether recapture was forced; `traded` board (the end of the exchange, `exchangeEnd`).
  - `attacks` vs offer-a-trade (:242-243).
- **B3 cheap**
  - **Who wins the exchange on the struck square** (SEE on `traded`): a break that wins a pawn vs one that trades evenly vs one that loses the pawn.
  - **The three ways to meet it** (for the defending seat): add a guard to `struck` (count attackers vs defenders), take first (`exchangeEnd` from the defender's capture), let it trade and own the file first (who reaches the opened file first: rook moves to the file — `heavyPieceToFile`, `positionalRead.ts:910`).
  - **After the trade**: does the defender get an isolated/backward pawn (findWeakPawns on `traded`) — the lone-pawn consequence.
  - **Timing**: mover's king uncastled when the file opens toward its own king (`rights`, king square) — the mistimed-break warning.
- **B4 gates**: fullmove ≥ 6 (:131); a real break (`isPawnBreak` :132 → :43-61: not a recapture of their last move, not an en-passant answer); not a check/promotion/piece capture (:139); must strike a chain base OR open something (`opens.length === 0 && !base` → null, :236).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | prose ("attacks the base of the pawn chain", "opens the d-file") | typed base/centre/opens; the general rule clause ("attack a chain at its base", "the side whose rook gets there first owns it") |
| CONSEQUENCE | partly | opens | who wins the struck pawn (SEE); the lone pawn after; who gets the file first |
| BETTER MOVE + JOB | no | — | for a break the defender ignored: the guarding/taking move from the engine read |
| HABIT | no | — | skill `mistimed-pawn-break` exists (positionalReason) but not tied |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PB1 | consequence (file) — their break landed | O breaks, S's last move was the mistake | O break opens/half-opens a file toward S's camp; S's previous move cost ≥ mistake | file, rook | "A pawn exchange opens a file, and the side whose rook gets there first owns it: the c-file is theirs now." / "Every pawn break is a question about a file: when it half-opens the c-file and their rook is behind it, the file is theirs." | "Their rook comes to c8 and hits c3." (if the file leads to a target) | "Rc1 would have got there first." (engine best moves a rook to the file) | "Ask every move which pawn break they want, and is it ready." | after the move | S's rook reaches the file first (count) | C (B2+B3) |
| PB2 | prevent — guard the target | S meets O break badly | O's break on the board (last move), S's reply didn't guard / take, cost ≥ mistake | struck, counts | "Against a pawn break, the simplest defence is to guard the target as many times as it's attacked." / "d4 is hit twice and guarded once: it needed one more guard." | SEE → "d4 falls." | "Nf3 added the guard d4 needed." | PB1 habit | after | SEE ≤ 0 → not a mistake | C |
| PB3 | prevent — take first | S | as PB2, engine best = capture on the break square | | "You can meet a break by taking first: you choose how the structure changes, not them." | | "cxd5 first took the tension on your terms." | | after | best not a capture | H (read) |
| PB4 | knowledge — chain base | either | base (B2) | struck | "Attack a pawn chain at its base: the base holds up the whole chain." | "Without c4, d5 has no pawn behind it." | — | — | as LESSON clause of PB1/PB6 | base false | C (expose) |
| PB5 | consequence (lone pawn) | either | B3: after the trade the defender has an isolated pawn | | "When a pawn trade leaves a pawn with no neighbours, only pieces can guard it from then on." | | | | after | — | C |
| PB6 | timing — S mistimed own break | S breaks | S's break cost ≥ mistake (positionalReason `mistimed-pawn-break` or costReason allowed) | | "Prepare your break: the push works when the square it lands on is supported." / "Don't open the centre while your own king is still in it." (if file toward S king, uncastled) | costReason line | "Castling first made the break work." / engine best | "Before you break, count: is the square it lands on guarded enough?" | after | — | H costReason + C |
| PB7 | knowledge — bishop freed | either | freed bishop (B2) | | "A pawn break can be about a piece: trading this pawn frees your dark-squared bishop." | | | | Review | — | C |
| PB8 | toward king | O | file toward S king (`toKing`) | | "The break that opens a file beside your king is the start of their attack." | | | | after | S king not on/next to the file | C |
| PB9 | phase — endgame | either | ending | | "In the endgame a pawn break is how you create a passed pawn." | (join leverPasser) | | | Review | — | C join |
| PB11 | both seats — their mistimed break | O | the PB6 check on THEIR break (their cost ≥ mistake: the struck pawn's exchange favours S, or their king is in the opened file) | | "A break played before it's supported just gives the pawn away." / "Opening the centre with your king still in it invites the attack." (their king) | | — | — | Learn: lesson only, the capture that punishes is the student's next move, held | their break is the engine's best | C (`exchangeOnStruck` F2) |
| PB10 | record | — | `mistimed-pawn-break` RED/GREY full; AMBER one clause "The break was early."; GREEN silent | | | | | | | | |
- Not applying: "before the move" variants (Learn never speaks before the move; the pilot's "Learn: their pawn on e4 is the one to challenge" is DELETED under this WO).

### E. Mistake link
- Cause names (errorWhy §D): PB6 → **E15 positional** `mistimed-pawn-break`, or **E11 allowed-capture** when the break drops the pawn; PB1/PB8 → E15 concession `file-opened` (`weakened-king-safety`) or **E12 allowed-threat**; PB2/PB3 → **E7 abandoned-defender** / E11 on the struck pawn; PB11 their side of PB6.
- PB6: `positionalReason` tag `mistimed-pawn-break` (`positionalReason.ts:219`) — S's own break. Also costReason `allowed` when the break drops a pawn.
- PB1/PB2/PB3/PB8: seat O break that lands after S's mistake — the cause is S's previous move (`whyItFailed` `abandoned-defender`/costReason `allowed` on the struck pawn, or positionalReason `file-opened` → `weakened-king-safety`).
- PB4/PB5/PB7: clauses joined to the above; PB9 Review.

### F. Build changes
1. `pawnBreak.ts:75-83` — expose typed fields: `struck`, `strikes: 'base'|'centre'|'other'`, `attacks: boolean`, `opens: {file, open, toKing, rooksOn}[]`, `freedBishop: Square|null`, `trade: string[]`, `forcedRecapture: boolean`. Enables every recipe without parsing prose.
2. Add `exchangeOnStruck: number` (SEE pawns, mover's gain) and `loneAfter: Square|null` (findWeakPawns on `traded`).
3. New `meetBreak(fenAfterBreak, defender)` → `{ guardsNeeded, takeFirst: san|null, fileFirst: 'mover'|'defender'|null }` — B3 three ways. Enables PB2/PB3/PB1 consequence.
4. `mistakeLesson`: cause `mistimed-pawn-break` → PB6; `file-opened` concession with an O break → PB1/PB8.
5. The rotated stems at :250-265 stay for Review/lesson; Learn speaks from the recipe.

### G. Proof boards
- `vc-_X7t6o3o6JM-14` (`rnbq1rk1/pp2ppb1/5np1/2pp3p/3P1B1P/2N1PN2/PPPQ1PP1/R3KB1R w KQ -`) "…c5 attacks your pawn on d4 … half-opens the c-file for their rooks" — PB1 board (seat O).
- `vc-0ipLPOAN_m8-36` "…b5 attacks their pawn on c4, the base of the pawn chain" — PB4.
- `vc-1rcEbI44WqE-50` "…fxe5 … opens the f-file for their rooks, toward your king" — PB8.
- Guard: fullmove < 6; a recapture on `lastTo`; a break that opens nothing and strikes no base (:236).

### H. Open questions
1. PB3 "take first" — is it said as the better move only when the engine prefers the capture, or also as a general option?
