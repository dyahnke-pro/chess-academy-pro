# newTiedDefender — card

## A. Identity
- `findTiedDefenders(fen, student)` / `newTiedDefender(fenBefore, fenAfter, student)` — `src/services/tiedDefender.ts` (whole file, 78 lines); proof `tiedDefenderProof`, line `tiedDefenderLine`.
- Board computer `tiedDefender` — `src/services/boardComputers.ts:2352-2368`, kind `their-read`, student's move only (guard at :2359), must still hold after their reply (:2362).
- Census: 99 fired / 88 said (lesson 85, review 14).

## B. Facts
### B1. Handed over (`TiedDefender`)
`defender` {square, piece}, `target` {square, piece}, `attackers`, `defenders` counts. Proof `kind:'count' exact`.
### B2. Dropped
- WHY it is tied: the counterfactual `lifted(fen, g)` → SEE > 0 without that guard (`findTiedDefenders`). The line says "the guard that holds it" but not "if it moves, the pawn on e6 falls" — the consequence is computed and implied only.
- All ties after the first (`.find`), and all ties of the STUDENT's own pieces (reverse seat never computed — `findTiedDefenders` only reads `them` pieces).
### B3. Cheap
- Reverse seat: `findTiedDefenders(fen, them)` = the student's pieces tied down by the opponent.
- The PAYOFF move: a student move that attacks the tied defender, or forces it to move (check it can't ignore) → deflection; chess.js scan over legal moves: after it, the target's SEE > 0.
### B4. Gates
Target non-king, attacked, not already loose (SEE ≤ 0); guard non-king whose removal makes SEE > 0; created by the student's move (absent before); still holds after their reply; never said on the opponent's own move (:2359).
Census line "That is what pressure buys — a piece that cannot leave." — a lesson tail, but the lead is a board restatement.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "what pressure buys — a piece that cannot leave" | rule-first; the consequence of leaving (B2) |
| CONSEQUENCE | partly | counts | "if the bishop leaves, the pawn on e6 falls" |
| BETTER MOVE + JOB | no | — | for a mistake that untied it / moved it: errorWhy |
| HABIT | no | — | spotCue overload / free-piece `false-guard` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TD-1 | consequence (they moved the tied guard) | O mistake | O's move = tied defender moving (a tie in findTiedDefenders(fenBefore O move, S) with defender.square = O move from) AND O's move graded mistake+ (errorWhy abandoned-defender for O) | defender, target | "A defender that's tied to a job can't leave it. Their bishop on d7 was the only thing holding e6 — and it just left." / "Pressure ties pieces down; when a tied piece moves anyway, something drops." | "Now e6 falls." | n/a (Learn: S to move — target only) | "After their move, ask: which of their pieces just stopped guarding something?" | after THEIR mistake, target named, capture held | the guard was replaced (SEE still ≤ 0) | H + C |
| TD-2 | prevent (own tied piece moved) | S mistake | reverse seat: findTiedDefenders(fenBefore, them) has S's guard = S's move from; errorWhy `abandoned-defender` | own defender, target | "A piece doing a guard job is tied to it. Your knight was the only guard of d4, so it couldn't go." | "Once it left, d4 fell." (whyItFailed line) | errorWhy best + job | "Before a piece moves, ask what it is guarding." | after | — | C |
| TD-3 | strategize (pressure) | S | S's move created a tie (today's fire) | defender, target | "Pressure isn't only about winning material: it ties their pieces to guard duty." | "The bishop on d7 can't join the fight now." | | | Review / Learn positive path (not a mistake turn) | — | H |
| TD-4 | own plan (exploit) | S missed | tie existed, a deflection move existed (B3), S played other, cost ≥ inaccuracy | defender, payoff | "Hit the tied defender and what it guards falls. Their rook on a8 held the knight on b8 alone." | "Chasing the rook wins the knight." | "Bc6 was the move — it hit the rook that held b8." (once past) | spotCue overload | after, past-only | — | C |
| TD-REC | record | — | `missed-your-overload` / `missed-their-overload` | | RED/GREY full; AMBER "Their bishop is tied to e6."; GREEN silent | | | | | | holdRate |
n/a: phase (any), their plan (n/a). Combination: detectTactics overload (DT-O1) when one tied guard has two jobs.

## E. Mistake link
- whyItFailed `abandoned-defender` — mover-generic (errorWhy runs for either seat): O-seat → TD-1; S-seat → TD-2. This computer explains WHY the defender couldn't leave (it was tied), whyItFailed says WHAT fell.
- costReason `missed` motif `deflection`/`overloaded_piece` → TD-4.

## F. Build changes
1. tiedDefender.ts `TiedDefender` — add `falls: {square, gain}` (SEE without the guard) → TD-1/2 consequence.
2. Export `findTiedDefenders` for either holder (already takes `student` — call with `them` for TD-2; no code change, a new call site).
3. Add `deflectors(fen, tie, mover)` (B3) → TD-4.
4. Learn: drop the before-move/after-own-move positive line (TD-3) from Learn speech (WO); recipes `tied-guard-left` (TD-1/TD-2) attach to whyItFailed abandoned-defender.

## G. Proof boards
- Text (lines-0, lesson): "Their bishop on d7 is tied down now: you hit the pawn on e6 once and it is guarded twice — the bishop is the guard that holds it." (TD-3 fire).
- "Their rook on a8 is tied down now: you hit the knight on b8 once …" (TD-4 candidate).
- Guard: their guard leaves but a second guard covers (SEE ≤ 0) → TD-1 silent.

## H. Open questions
1. none
