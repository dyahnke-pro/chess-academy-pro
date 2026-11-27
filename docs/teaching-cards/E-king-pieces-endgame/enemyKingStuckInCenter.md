# Card — `enemyKingStuckInCenter` (their king in the centre, a central file open)

## A. Identity
- File: `src/services/reviewSacrifice.ts:113` — a boolean predicate `enemyKingStuckInCenter(fen, moverColorWB)` (true about the OTHER side's king).
- Registry: `boardComputers.ts:4717` `kingHuntCue` (kind `king`, walk surfaces; fixed text "Look at their king — still in the centre… throw your pieces at it") and `:5490` `kingInCentre` (kind `king`, learn/lesson/review/play; fixed text "Their king is stuck in the centre with a central file open on it."). Both always pass `student` as mover → ONLY the opponent's king is read here. Other readers (gates, not speakers): `reviewConcepts.ts:221` (`open-lines-at-king`, both seats via `ctx.moverColor`), `nextPlans.ts:369`, `planChoice.ts:81`, `planStopped.ts:61`, `coachFeatureService.ts:4131/4157`, `boardComputers.ts:2025` (suppresses a majority plan).
- Census: 284 fired / 14 said. Held: already-said 145, **unsupported 103** (the fact carries `squares: []`, so the door's support rule drops it — `boardComputers.ts:5494`), in-flux 14, beside-mate 8.

## B. Facts
- **B1**: a boolean only.
- **B2 dropped inside the predicate**: `kingSq` (:118), which central file is open (`s.pawns.openFiles` includes d/e, :143), `fullmove` (:117), `castledLong`/`fFileOut` exceptions (:123-131), whether the king's side could castle on its move (:139). The registry facts drop all of it and hand `squares: []`, which is WHY 103 of them are held `unsupported`.
- **B3 cheap**: `rightsLeft` (chess.js `getCastlingRights` for the enemy) — "can't castle anymore" vs "hasn't yet"; `lineToKing` — the student's rook/queen able to reach the open file (one move, chess.js); `breakToOpen` — a student pawn capture/push on d/e that opens the second central file (`reviewConcepts.ts:200-214` already computes `centralCapture`/`breakPush`); `devLead` — `developedCount` diff (same file, :216).
- **B4 gates**: fullmove ≥ 8; king on c–f file on its own two back ranks, not castled long with rook on d, not on f with no h-rook (:123-134); its side to move cannot castle right now (:139); d- or e-file open (:143).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | kingHuntCue text is a real lesson ("throw your pieces at it, before they wriggle to safety") but generic, no square | the king square, the open file |
| CONSEQUENCE | no | — | `lineToKing` ("your rook reaches e1 and checks down the file") |
| BETTER MOVE + JOB | no | — | errorWhy better move + job ("Re1 put the rook on the open e-file") |
| HABIT | no | — | record (attacking an uncastled king) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EK1 | STRAT | S attacker (student missed it) | predicate true on fenBefore, student's move slow (costReason missed / positional cost) | king square, open file | "When their king is stuck in the centre and a central file is open, speed beats material: open more lines toward the king on {king} before it castles." / "A king still on {king} with the {file}-file open is a target — bring a rook to the file." | "Next move they castle and the chance is gone." | "{best} put your {piece} on the open {file}-file, facing the king." (once past) | "Every move, ask: can their king still castle? If not, attack it now." | "With their king stuck on {king} and the {file}-file open, the attack couldn't wait." | they can castle on their move (gate); fullmove < 8 | C kingSq, file |
| EK2 | CONSEQ (their mistake) | S attacker | THEIR move kept the king in the centre (lost rights / opened the file) | — | "A king that gives up castling stays in the line of every file that opens." | "Your rooks only need the open file." | — | EK1 | after their move: "A king that can't castle stays in the way of every file — the {file}-file is open at theirs." | rightsLeft still true | C rightsLeft |
| EK3 | PLAN | S attacker | breakToOpen exists | the pawn | "The pawn break that opens the centre IS the attack on an uncastled king." | — | "{best} opened the {file}-file." | — | "Against an uncastled king, the pawn break was the attack." (no move named) | break loses material | H reviewConcepts |
| EK4 | combo + dev lead | S attacker | devLead ≥2 | lead | "Ahead in development against a king in the centre is the moment to open the position." | — | — | — | — | lead < 2 | C developedCount |
| EK5 | PREV (own seat) | S defender | predicate with mover = opponent (student's own king), student's move delayed castling | — | "A king in the middle is in the way of every line that opens: castle before the {file}-file fills with their rooks." | "Their rook reaches {file}1 and checks." | "O-O took the king off the {file}-file." | "Castle before you open the centre." | "A king left in the middle is in the way of the {file}-file — castling comes first." | queens off (exception) | C call with opponent as mover; overlaps castlingWatch (that card owns the Learn STOP) |
| EK6 | exception | both | queens traded | — | "With the queens off, a king in the centre is often fine." (silent in Learn) | — | — | — | — | — | C queen count |
| EK7 | exception (castled long / f-file king) | — | gates :123-131 | — | silent — documented exceptions | — | — | — | — | — | — |
| — | phase endgame | — | — | n/a — in the endgame the king belongs in the centre (kingActivityGap / kingFromCentre cards) | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Their king is still in the centre — open a file." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student missed (costReason `missed` or positionalReason gap while the predicate holds on fenBefore) → EK1/EK3/EK4.
- Opponent's mistake (lost castling, opened the file) → EK2.
- Student's own king (EK5): `positionalReason` `king-stuck-center` (`positionalReason.ts:164`, `bestJobReason` :210) — shares the Learn turn with castlingWatch (that card's STOP wins on the same move).

## F. Build changes
1. `reviewSacrifice.ts:113` — add `enemyKingCentreRead(fen, mover): { king, openFiles: ('d'|'e')[], rightsLeft: {k,q}, fullmove } | null`; keep the boolean as a wrapper for the gate readers (no reader changes).
2. `boardComputers.ts:5494` / `:4720` — hand `squares: [king, ...file squares]` so the door's support rule stops dropping it (103 `unsupported`). Both texts are replaced in Learn by recipes EK1/EK2 in `mistakeLesson.ts`; `kingInCentre`'s board restatement is deleted from the Learn turn.
3. Add the student-seat call (mover = opponent) as recipe EK5's condition, sharing the claim key `king-centre` with castlingWatch so one is said.
4. `lineToKing`, `breakToOpen` (lift `reviewConcepts.ts:200-214` into an exported helper) as typed fields.

## G. Proof boards
- EK1/EK2: review `lines-0.jsonl#1522` (held `unsupported` — the bug in F2). Danya `vc-1Rejj6niwvo-20` `r1bq1rk1/pp3ppp/4p3/1Bbp4/4n3/N2P1n1N/PPP2PPP/R1B1K2R w KQ` (their king e1, can castle → gate must hold it silent; guard).
- Guard: any board where their side can castle next move (`:139`), e.g. the chesscom-1040709576 13…Qxd4 case cited at :136-138.

## H. Open questions
- Should EK1 speak on a student's slow move when the cost is under a mistake (an inaccuracy) — i.e. is "you let their king castle" a mistake on its own?
