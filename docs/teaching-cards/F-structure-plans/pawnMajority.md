# Card — `pawnMajority` (family F)

### A. Identity
- `pawnMajority(fenBefore, san, prior)` — `src/services/pawnMajority.ts:110-179`; `wingMajorities` :76 (exported, reusable), `pawnMajorityLine` :201 (the renderer), `IDEA_OF` :188, `pawnMajoritySquares` :182.
- Adapter `boardComputers.ts:4300-4320`, kind as idea (`majorityIdea`: created/advance → passed-pawn, crippled/gave-up → weakness). Surfaces per adapter (lesson/review/learn via thought, play/chat/think/tactics read).
- Census: 30 / 25 said (T).

### B. Facts
- **B1** `PawnMajority` :54-66 (`WingMajority` :38-52): `event` (created|crippled|gave-up|advance), `mover`, `to`, `majority: WingMajority` {side, wing, count, against, healthy, lead, doubled}, `split` (other side's majority made by the same trade), `now` {count, against}, `key`.
- **B2 dropped**: `levelNow`/`levelBefore`/`even` (:131-133) — why a material change is not a majority; nothing else of note — this computer hands over almost everything.
- **B3 cheap**: distance of `lead` to promotion; the enemy king's distance to the majority wing (who wins the race once it rolls — `pawnSquareRaceRead` in planRace); whether queens are on (already read for advance only, :170); the move that would have avoided `crippled`/`gave-up` (engine best on fenBefore).
- **B4 gates**: not in flux (`inFluxAfter`, :115); a capture needs `prior` (:118-119); created: level material and healthy OR split (:149-150); crippled/gave-up: level both sides (:154); crippled needs the majority healthy before and doubled after (:159); advance: a pawn leaving its 2nd rank, no queens on the board (:170).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | event + majority | the general rule is in the text ("pushed together, those pawns make a passed one") |
| CONSEQUENCE | partly | lead | race/king distance |
| BETTER MOVE + JOB | no | — | engine move that kept the majority healthy |
| HABIT | no | — | skill `passed-pawn-neglected` / `created-pawn-weakness` not tied |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PM1 | consequence — crippled own majority | S | S mover, event crippled, majority.side S, cost ≥ inaccuracy | doubled file | "Doubled pawns can't make a passed pawn: your queenside majority is four against three, but on only three files." / "A majority is only worth its files: the doubled c-pawns can't make a passer." | "In the ending they're a pawn up in effect." | "Taking back with the piece kept the majority healthy." (engine best) | "Before a recapture, ask what it does to your pawns on that wing." | after | cost < inaccuracy; a book trade that cripples by design (H1) | H + engine best |
| PM2 | gave-up | S side, event gave-up | | "Trade the wrong pawn and your majority is gone, and with it the passed pawn it could make." | — | engine best | PM1 habit | after | — | H |
| PM3 | O created one | O side created, S's move allowed it (S's trade/cost) | | "A pawn majority is a passed pawn waiting to be made: they have three against two on the kingside now, with the f-pawn in front." | race (B3) | — | — | after | — | H |
| PM4 | own plan — roll it | S healthy, queens off | event advance or standing majority | | "In the endgame, push your majority: the pawn with no pawn in front of it becomes passed." | | | | Review/chat; Learn as BM of a passive move | queens on | H |
| PM5 | knowledge — split trades | split | | "A pawn trade that gives each side a majority on a different wing is a race: whose majority is healthier and closer to queening?" | | | | Review | | H |
| PM6 | record | — | RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |
- Not applying: middlegame advance (gated to queens off — a majority rolled in the middlegame is a different story, the king's cover).

### E. Mistake link
- Cause names (errorWhy §D): PM1/PM2 → **E15 positional** concession `pawn-weakened`; PM3 → E15 on the student's move, or **E12 allowed-threat** when the majority's lead pawn runs at once; PM4/PM5 Review/chat.
- PM1/PM2: `positionalReason` concession `pawn-weakened` (→ `created-pawn-weakness`) on a recapture that doubles; seat S.
- PM3: O's created majority after S's mistake; positional `passed-pawn-neglected` when S's best kept the balance.
- PM4/PM5 Review/chat.

### F. Build changes
1. Add `toQueen: number|null` and `kingRace: 'mover'|'other'|null` to `WingMajority` (planRace's pawn-square read). Fills CONSEQUENCE.
2. `mistakeLesson`: `pawn-weakened` + event crippled/gave-up → PM1/PM2; O created after S mistake → PM3.
3. `pawnMajorityLine` (:201) stays for Review; Learn words from the recipe (no restatement of "four pawns against three" without the lesson clause).

### G. Proof boards
- created+split: `vc-33EpuPv4ULw-7` (`rnbqkbnr/ppp2ppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b`, Open Sicilian-type trade, PM5); gave-up: `vc-3nyxVHwDCTY-72` (`2r3k1/1p3p1p/3p2p1/3P4/1P1p4/5PP1/P6P/6K1 w`, PM2); advance: `vc-38QzSkFRn4E-31` (their queenside majority moving, seat O). No pure run made.
- Guard: material not level (a pawn won is the material's story, :126-133); trades in flux.

### H. Open questions
1. PM1 exception: a known book trade (Exchange Ruy) that cripples by design — silence by opening theory, or teach it anyway?
