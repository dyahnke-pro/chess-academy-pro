# pinPressureConcept — card

## A. Identity
- `pinPressureConcept(fen, student)` — `src/services/boardTeachConcepts.ts:28-62`, over `findPinPressure(fen, holder)` — `src/services/pinPressure.ts:97-148`.
- Board computer `pinPressure` — `src/services/boardComputers.ts:3194-3200`, kind `concept`, surfaces `LIVE_READ`. (There is no `isPinPressureMove`; the record's pin skills `missed-their-pin`/`missed-your-pin` are written by the `pins` board computer, boardComputers.ts:2845, and `moveFundamentals.ts:212` `pile-on-pin`.)
- Census: 27 fired / 27 said (learn 9, chat 18); 9 voiced boards.

## B. Facts
### B1. Handed over (`PinPressure`)
`side` (holder, to move), `pinner`, `pinned`, `behind`, `pinnedPiece`, `moves[]` (san, from, to, piece, `byPawn`) — every move that adds an attacker AND wins the piece (pawns first).
`BoardConcept.full` text, `squares`, `pinMove {fen,san}`.
### B2. Dropped
- `before` attacker count (pinPressure.ts:114) and the after-count (:121) — the arithmetic ("one attacker, two defenders → two and two") is the proof and is never said.
- Rejected moves and why: `winsOnCapture(fenAfter, m.to, them)` (the piler is itself lost), `pawnCanKick(fenAfter, pinner)` (the pinner gets kicked), `findPinBreaks` (pin breaks) — the three ways a pile-on fails are computed and dropped (:131, :137, :140).
- `behind` piece type for the consequence (K → absolute, Q/R → "the queen behind it").
### B3. Cheap
- Defender count on `pinned` before/after the pile-on (`chess.attackers` both colours) → CALC row.
- For the opponent's pile-on: the student's ways out — interpose on the pin line, move `behind` off the line, add a defender, kick the pinner with a pawn (`pawnCanKick` already exists, run for the student).
### B4. Gates
- Pins from `detectTactics` (beneficiary = holder) (:108); pinned not king (:113); move must add an attacker (:121), keep the pin (:123-126), win the piece (pawn: any non-pawn victim; else SEE) (:127-129); piler not lost (:131), pinner not kickable by a pawn (:137), pin not breakable (:140).
- Concept picks the student's pile-on first, else theirs (boardTeachConcepts.ts:35-37). The student's version NAMES THE MOVE ("Qf3 adds a second attacker") — before the move this breaks LEARN NAMES NO MOVE UNASKED; the WO deletes before-move speech.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | `PIN_PRESSURE_PRINCIPLE` / `_WARNING` + pin line | the lesson leads with "X pins Y to Z" (board restatement) — reorder: principle first |
| CONSEQUENCE | partly | `moves[0]` | what is lost: the pinned piece (name) + count (B2) |
| BETTER MOVE + JOB | partly | `moves[0].san` | for the student's miss: "Qf3 was the move — the second attacker"; for the opponent's: the student's way out (B3) |
| HABIT | no | — | spotCue pin |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PP-1 | consequence (prevent) | O holds pin, S's move ignored it | findPinPressure(fenAfter S move, them) non-empty AND errorWhy cost ≥ mistake | pinned, behind, moves[0] | "A pinned piece is a target: it can't run, so they just attack it again. Your knight on f3 is pinned to the queen and their pawn can hit it." / "Pins get worse, not better. Your bishop on e2 is stuck in front of the king, and a second attacker wins it." | "The knight falls — it can't step away." | "Be2 was the move — it broke the pin by putting a piece in the line." / "Qd2 was the move — it stepped the queen off the line." (B3 way-out kind) | spotCue pin (theirs) | after S's move | not caused by S's move AND pin pre-existing with no pile-on before → still say only if S's move allowed the pile-on (`moves` empty on fenBefore) | H + C |
| PP-2 | own plan (missed) | S holds pin | findPinPressure(fenBefore, S) non-empty, S played ∉ moves, cost ≥ inaccuracy | moves[0] | "When you pin a piece, attack it again — it has nowhere to go. Their knight on f6 was pinned to the queen." | "A second attacker would have won it." | "Qf3 was the move — the second attacker on f6." (once past) | spotCue pin `pile-on` (if present) | after, `pastBetterNameable` | pile-on still available after reply → hold the move (still the student's to find) | H |
| PP-3 | calculate | both | — | counts B2 | "Count it: one attacker against one defender holds; two against one wins — and the pinned piece can't leave." | | | | Review | — | C |
| PP-4 | knowledge (pawn pile-on) | both | moves[0].byPawn | — | "The cleanest way to win a pinned piece is a pawn attack: a pawn costs nothing to trade." | | | | | — | H |
| PP-5 | exception | both | candidate rejected by `pawnCanKick` | pinner | "A pin only lasts while the pinner is safe: a pawn kick on the pinner ends it." | | | | Review (exception noted) | — | B2 |
| PP-6 | exception | both | rejected by findPinBreaks | — | → defer to findPinBreaks card | | | | | | |
| PP-7 | knowledge (absolute vs relative) | both | behind = K vs Q/R | behind | K: "A piece pinned to the king can't move at all." / Q: "A piece pinned to the queen can move — but it hands over the queen." | | | | | — | H |
| PP-REC | record | — | `missed-their-pin` / `missed-your-pin` hold rate | | RED/GREY full; AMBER "Their pin on f3 is about to win the knight."; GREEN silent | | | | | | holdRate |
n/a: phase — pins in every phase, no phase rule computed; strategize — tactical not strategic.

## E. Mistake link
- costReason `allowed` motif `pin` where the line's win is the pinned piece (seat O): PP-1.
- costReason `missed` motif `pin` (seat S): PP-2.
- whyItFailed `held-by-defender` with a pinned guard (`pinnedToMore`) — the reverse case; teaches PP-7 consequence.

## F. Build changes
1. pinPressure.ts:114-141 — add `countBefore`, `countAfter`, `defenders` to `PinPressureMove` (B2) → PP-3.
2. pinPressure.ts:131-140 — record rejection reasons per candidate (`rejected: {san, why: 'piler-lost'|'pinner-kicked'|'pin-breaks'}[]`) → PP-5/6 exception rows.
3. New `pinWaysOut(fen, pin, student)` (pinPressure.ts): interpose / step off / add defender / pawn kick, each a legal move found by chess.js → PP-1 BETTER-MOVE job word.
4. boardTeachConcepts.ts:44-51 — delete the composed sentences; return the typed `PinPressure` + seat; recipe table words it principle-first. Learn: no before-move speech (WO).
5. Caused check: PP-1 fires only when `findPinPressure(fenBefore-their-reply-board)` was empty (the student's move allowed the pile-on).

## G. Proof boards
- PP-1 (O seat): vc-_X7t6o3o6JM-30 `2r2r1k/pp2Npb1/4bnp1/2n1N2p/5BPP/4PP2/PPPq4/1K1R1B1R w - - 1 16` (their queen pins e-pawn → Nd5 pile-on); vc-1rcEbI44WqE-37 `1nkr3r/Qpp1bppp/4p3/1PP1Pb2/3P4/4BN1P/P1q1BKP1/R6R b - - 0 19` (their queen pins the bishop to the king; Bd3 pile-on).
- PP-2 (S seat): vc-1tbpB-Qrqds-18 `r1bqk2r/p2p1pp1/p1n1pn1p/4P1B1/3P4/2P5/P4PPP/R2QK1NR w KQkq - 0 10` (Bg5 pins f6 to queen; Qf3); vc-1zfJ7ABoh8k-41.
- Guard: a pin where the pinner can be kicked by a pawn (PP-5) — rejected by pinPressure.ts:137.

- **Pure-function run (chess.js only, scratch vitest, deleted after):** `findPinPressure(after vc-1tbpB-Qrqds-18, 'w')` → pinner g5, pinned f6 (knight), behind d8, moves `[Qf3]` — PP-2 board confirmed.

## H. Open questions
1. PP-1 when the pile-on is coming but the student's move was otherwise fine (cost < mistake): silent in Learn (mistakes only) — confirm.
