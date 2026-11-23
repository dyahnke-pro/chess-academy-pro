# exchangeIdeas — sixteen trade / defence / nugget reads

## A. Identity
- File: `src/services/exchangeIdeas.ts` (881 lines). Entry `exchangeIdeas(input)` (822–881) runs: on the student's move `onlyDevelopedTrade` (160), `defenderTrade` (182), `exchangeForAttacker` (223), `denyExchange` (274), `abandonedDuty` (298), `tradeChoice` (370), `spoilTheirPawns` (393), `maintenanceTrade` (419), `prepareRecapture` (437), `threatCost` (478), `safeBecause` (575), `materialArithmetic` (668), `knightSquares` (725), `cPawnBlock` (765); on their move `defenderTrade`, `materialArithmetic`, `knightSquares`; on the board `simplestWin` (533, only when `nameMove`), `wingForCentre` (639). `IDEA_KIND` (48–) files each as `trade-idea` | `defence-idea` | `nugget`. An `imageryFor` tail ("A knight on the rim is dim") is appended per id (876–879).
- Reach: learn door, review, chat, tapped, tactics (lesson no). Census: 189 lines (146 said): chat 80, learn 49, review 60; held 39 `in-flux`, 4 `beside-mate`. Run (student moves): trade-idea 21, defence-idea 22, nugget 18; 16 of them on student moves that cost ≥ 100.

## B. Facts
- **B1** `ExchangeIdea`: `id`, `kind`, `text`, `squares`, `proof` (a legal line or squares), `stakes?`, `claim`, `imagery`, `namesMove?`.
- **B2 dropped:** each read decides on a SEE / a square count / a line and returns only words + proof: e.g. `knightSquares`' counts ("four squares, against eight") are in the text, not fields; `tradeChoice`'s doubled file; `threatCost`'s grab line is the proof only; `safeBecause`'s earlier move (`previousOwnMove`) is in the text.
- **B3 cheap:** expose the decisive number of each read as a field (counts, the file, the earlier move square); the student's move cost is already an input for 5 of the 16 reads — pass it to all.
- **B4 gates:** cost gates exist on only five reads — `exchangeForAttacker` (cost < 50, 224), `denyExchange`, `maintenanceTrade`, `prepareRecapture` (cost < 50 when known, 275/420/438), `knightSquares` (the student's rim move only when it COST ≥ 50, 749). `defenderTrade`, `onlyDevelopedTrade`, `spoilTheirPawns`, `threatCost`, `safeBecause` have NO cost gate — the run found them PRAISING mistakes: g-1012441262 ply 33 Nxh5 (cost 115) "Taking on h5 trades off one of the pieces aimed at your king…", ply 35 Bxf8 (cost 268) "Taking on f8 removes one of their attackers…" (F1).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes (most reads end on a principle: "A knight is worth the squares it reaches") | `text` | the cause it explains is not typed |
| CONSEQUENCE | partly | proof line | — |
| BETTER MOVE + JOB | partly (cPawnBlock takes `bestSan`) | — | for the mistake reads |
| HABIT | partly | the imagery tail | — |

## D. Lesson recipes
Split by whether the read explains a MISTAKE (said in Learn) or praises a GOOD idea (Review/chat only under mistakes-only).

| id | read | angle | seat | condition | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EI1 | knightSquares | knowledge (rim) | S | the student's knight move to the rim cost ≥ floor | "A knight is worth the squares it reaches: on {sq} your knight has {n}, against eight in the centre." / "A knight on the rim is dim — {sq} gives it only {n} squares." | "It does nothing from there for several moves." | "{best} — the knight kept {n'} squares." | "Before a knight move, count its squares there." | full | the rim move wins material / is the only defence (cost < floor, already) | H (counts in text → field F2) |
| EI2 | knightSquares (theirs) | knowledge | O | their rim knight, the student's move did not exploit it and cost ≥ floor | "Their knight on {sq} reaches only {n} squares: attack the pieces it can't defend." | | | | full | — | H |
| EI3 | tradeChoice | consequence (they choose the trade) | S | it fired on the student's move and cost ≥ floor | "When they can choose the trade, they choose the one that hurts you: if they take first, only a pawn can take back, and your pawns end up doubled." | "Doubled pawns for the rest of the game." | "{best} kept a piece ready to recapture." | "Before you leave a piece where it can be traded, ask how you'd take back." | full | — | H |
| EI4 | prepareRecapture / denyExchange (the missed form) | prevent | S | the engine's best IS a prepare-recapture / deny-exchange move and the student's move allowed the doubling (cost ≥ floor) | "Prepare the recapture first: put a piece where it can take back, so a pawn never has to." | | "{best} — so a {piece} takes back on {sq}." | same as EI3 | full | — | C: run the read on (fenBefore, best) |
| EI5 | abandonedDuty | consequence (their recapture abandons a duty) | S | their natural recapture would abandon a duty and the student's move missed the follow-up (cost ≥ floor) | "When a piece takes back, check what it was guarding: their {piece} leaves {sq} undefended." | "You win {what}." | "{best} — then {follow}." | "When they recapture, look at what the recapturing piece stopped guarding." | full | — | H |
| EI6 | simplestWin | strategize (simplest win) | S | the student had the simplest win (mate / material, nothing hanging) and played something else, cost ≥ floor | "When you're winning, the simplest clean win is the best one: {best} wins with nothing left hanging." | | "{best}." | "Ahead, look for the move that wins and leaves nothing loose." | full once past (`nameMove` false before) | — | H |
| EI7 | cPawnBlock | knowledge (opening plan) | S | the student's knight blocked its own c-pawn in a d-pawn opening and cost ≥ floor | "In a d-pawn opening the c-pawn break is the plan: a knight in front of the c-pawn blocks it." | | "{best} kept c-pawn free." | | full | — | H |
| EI8 | defenderTrade / onlyDevelopedTrade / exchangeForAttacker / spoilTheirPawns / maintenanceTrade / wingForCentre / materialArithmetic / safeBecause / threatCost / denyExchange / prepareRecapture (good form) | evaluate (good idea) | S/O | cost < floor | the read's own text | | | | **Review / chat only** (a good idea is not a mistake turn) | cost ≥ floor → silent (F1) | H |
| EI9 | materialArithmetic | calculate (counting) | S | the student's trade left material uneven against them (settled) and cost ≥ floor | "Count the material after the exchange in pieces: your {gave} for their {got} — that's {verdict}." | | | "Count what each side gave before you start a trade." | full | the count is level (then not the mistake) | H |
| EI10 | record | — | S | per id tag | RED/GREY full · AMBER one clause · GREEN silent | | | | | | H |

## E. Mistake link
- Student: EI1 = `positionalReason` **misplaced-piece** (the knight's square count is the specific why the generic note lacks); EI3/EI4 = a structural concession (doubled pawns) — `positionalReason` has no tag (new cause `trade-doubles`); EI5/EI6 = `costReason` **missed**; EI7 = **no-plan** in an opening; EI9 = `costReason` **allowed** (material).
- Opponent: EI2, EI5.

## F. Build changes
1. Cost gate at the entry (`exchangeIdeas` 829): every POSITIVE read (EI8 list) takes `costCp` and returns null when the student's move cost ≥ 50 (as the five gated reads already do); the run boards g-1012441262 ply 33 Nxh5 (115) and ply 35 Bxf8 (268) must go silent; guard board g-1001055178 ply 7 exf3 (cost 4, "trades off their only developed piece") must still fire in Review.
2. `ExchangeIdea` gains `facts` per id (B3: `{squares: n, centre: 8}` for knightSquares, `{file}` for tradeChoice, `{earlier}` for safeBecause) and `cause` for the mistake reads (EI1, EI3, EI5, EI6, EI7, EI9).
3. Add the "missed" form (EI4): run `prepareRecapture` / `denyExchange` on the engine's best move when the student's move allowed `tradeChoice`.
4. The imagery tail ("A knight on the rim is dim") becomes the HABIT slot of EI1 (recipe table), not appended prose.

## G. Proof boards (run)
- EI1: g chesscom-1001055178 ply 29 Ne1 (student, cost 90) → "On e1 your knight reaches only four squares, against eight in the centre."
- EI8 false praise (guard): g chesscom-1012441262 ply 33 Nxh5 (cost 115), ply 35 Bxf8 (cost 268), g chesscom-1020632112 ply 18 Qd4+ (cost 372, "one of their own attackers is gone").
- EI8 legit (Review): g chesscom-1001055178 ply 7 exf3 (cost 4) only-developed; ply 21 f4 (cost 24) safe-because.
- EI5-shape threat-cost: g chesscom-1018307238 ply 26 …Re8 (cost 120) "Now if they go ahead with Rxf5 anyway, you take their pawn on e3 — the grab gains them nothing" (a defence idea on a move that cost 120 — guard F1).
- Census: lines-0.jsonl:4395 (spoil-their-pawns said in Learn).

## H. Open questions
- none beyond the Learn floor.
