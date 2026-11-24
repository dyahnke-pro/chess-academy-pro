# Card — `castlingWatch` (the STOP when not castling cost; the early reminder)

## A. Identity
- `src/coach/focus/castlingWatch.ts` (pure; constants :26/:36/:40): `castleWhatIf` (:122) (the board after the move with king+rook on castled squares), `castleProbe` (what the page must read), `castleVerdict` (STOP when `drop ≥ CASTLE_DROP_CP`=100 and `gain ≥ drop`), `castleLookAhead` (`urgent` when castling beats every other listed move by `CASTLE_URGENT_CP`=100), `hungMaterial`, `isAttack`, the four fixed lines `castleStopLine(losing, attack)`, `castleRewindAsk/Button`, `rewindTarget`/`castleSound`, `reminderDue` + `CASTLE_REMINDER_LINE`.
- Runner: `focusRunner.ts:641-700` (`onCastleRead` :641, `castleStop` :662 — records `king-stuck-center` via `record-castle`, says the STOP, holds the board with the rewind; `goOn` — the reminder), `:893-910` (look-ahead `urgent` → STOP on that move; backstop probe). Learn focus games only (§ LEARN FOCUS). Not in the census (no `c` rows: its lines go through the focus owner channel, not the composer) — audit rows `castle-watch` (`audit-learn-focus-prod.mjs`).

## B. Facts
- **B1** `CastleRow` (to the audit/record): `ply`, `verdict` (`stop` / `quiet` / `no-read` / `reminder` / `ahead-quiet`), `side`, `bestCp`, `realCp`, `whatIfCp`, `drop`, `gain`, `losing`, `attack`, `rewindPly`, `rewindMoves`, `why` (`what-if` / `urgent`). Spoken: one of four fixed STOP lines (+ the rewind ask naming how many moves), or the fixed reminder.
- **B2 dropped from speech (on the row only)**: `drop`/`gain` cp; the castled side (`k`/`q`); WHY the uncastled king cost — which line opened, which enemy piece now hits the king's square (not computed at all — the what-if proves THAT castling held, not WHY).
- **B3 cheap**: `whyCost` — on fenAfter, the open/half-open central file through the king (`describeStructure.pawns.openFiles` includes the king's file) and the enemy heavy piece / bishop that now hits the king or a square next to it (`kingSiege.attackers`, `enemyKingStuckInCenter` with mover = opponent); the castled what-if's same count (attackers on the castled king's ring) = the contrast.
- **B4 gates**: watch over once no right (`watchOver`); not a castling move; read present; `drop ≥ 100`; no hung material (`hungMaterial`); castling open on the board after (`castleOpen`: right, king/rook home, path empty and unattacked); castled king not in check; STOP needs `gain ≥ drop`; look-ahead needs ≥2 lines, castling ready, castle line − next ≥100; rewind only to a board where castling was sound (in the read, within 100 of best, not losing) and ≤ `REWIND_MAX_MOVES`=3 moves back; reminder only plies ≤24, once a game, castling sound on the board.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | the fixed line "You're not castled, and that just cost you! You need to castle first!" — fixed ON PURPOSE (habit) | a general lesson with this board's example (which line, which piece) — `whyCost` (B3) |
| CONSEQUENCE | partly | "you're now in a losing position" (losing variant) | the line that opens on the king |
| BETTER MOVE + JOB | yes | the rewind: "Want to go back two moves and castle?" (O-O is the better move, offered as a takeback) | — |
| HABIT | yes | "You need to castle first!" / "castle before you attack" (the habit, fixed) | the record gate (RED/GREY) — today said whatever the record |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CW-1 | CONSEQ (what-if STOP) | S | `castleVerdict.stop` | whyCost file, piece | (before the fixed line) "A king in the middle is in the way of every line that opens: the {file}-file is open, and their {piece} already looks down it." | fixed losing/cost head | rewind ask (fixed) | fixed "You need to castle first!" | the fixed STOP line + the lesson clause | hung material (tactics owns it) | C whyCost |
| CW-2 | STRAT (attack before castling) | S | stop + `isAttack` | — | "Attack after you castle, not before: an attack with your king in the centre opens lines for them too." | fixed | rewind | fixed "castle before you attack" | fixed line | — | H isAttack |
| CW-3 | PREV (look-ahead) | S | `castleLookAhead.verdict === 'urgent'` | — | "When castling is the best move by a pawn, every other move is a step closer to the centre opening on your king." | — | the one-move rewind | fixed | fixed STOP | `hung` | H |
| CW-4 | KNOW (reminder) | S | `reminderDue` | — | the fixed reminder "You could have castled there. Get your king safe before the centre opens." | — | — | — | NOT a mistake turn — see H | — | H |
| CW-5 | exception | — | castling not open / unsafe what-if | — | silent (no claim) | | | | | | |
| — | seat O | — | n/a — the watch is the student's king only (their stuck king is enemyKingStuckInCenter) | | | | | | | | |
| — | phase | — | opening/middlegame until rights are gone | | | | | | | | |
| — | record | — | today: said whatever the record; `king-stuck-center` filed on every STOP (dual-use) | | | | | | | | |

## E. Mistake link
- The STOP IS a mistake turn: costReason none/positional — `positionalReason` `king-stuck-center` (`positionalReason.ts:164`, `bestJobReason` "Castling was the move here" :210). The watch outranks `enemyKingStuckInCenter` EK5 and `castlingTakenAway` CT2 on the same move (one claim, `king-centre`).

## F. Build changes
1. `castlingWatch.ts` — add pure `whyCost(fenAfter, student): { file: string | null; piece: {square, type} | null }` (open central file through the king + the enemy piece bearing on the king ring) and put it on `CastleRow`.
2. `focusRunner.ts:672` — the STOP effect text becomes: lesson clause (CW-1/CW-2, from `mistakeLesson.ts`) + the fixed line + the rewind ask. The fixed line stays word-for-word (§ LEARN FOCUS / § MISSIONS exemption).
3. Keep `castleVerdict`/look-ahead thresholds (100 / 100 / 3) — no sensitivity change (David's measured values, 2026-10-22).

## G. Proof boards
- Not in the census data (no composer rows). Measured by the focus audit: `castle-watch` rows in `scripts/audit-learn-focus-prod.mjs`; the look-ahead's 23 skips in 22 of David's 342 games (constant comment, `CASTLE_URGENT_CP`). The 7.Nf3 reminder guard (castling legal but dropped d4) is cited at `reminderDue` doc.

## H. Open questions
- Under mistakes-only, the early REMINDER (CW-4) is said on a move that cost nothing. Keep it (the watch's own rule), or drop it?
- The fixed STOP lines are exempt from "specific" by David's rule — is adding a specific lesson clause (CW-1) before the fixed line allowed, or must the STOP stay exactly four fixed lines?
- Should the STOP respect the record (GREEN on `king-stuck-center` → no clause, fixed line only)?
