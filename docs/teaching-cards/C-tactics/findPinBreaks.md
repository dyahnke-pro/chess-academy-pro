# findPinBreaks — card

## A. Identity
- `findPinBreaks(fen, side?)` — `src/services/pinBreak.ts` (main loop over `detectTactics` pins; `tempoOf`, `worstAfterEscape`, `bestCaptureMove`); words `pinBreakLine` + `pinBreakProof`.
- Board computers `pinBreakOwn` (student's pinned piece) and `pinBreakTheirs` (their pinned piece the student pins) — `src/services/boardComputers.ts:1764-1789`, kind `tactic`, all surfaces via composer.
- Also a GATE inside pinPressure.ts:123 (a pile-on is dropped when the pin breaks).
- Census: 5 fired / 2 said (held `in-flux` 3); 1 voiced board.

## B. Facts
### B1. Handed over (`PinBreak`)
`side` (pinned side), `pinner`, `pinned`, `behind`, `pinnedPiece`, `pinnerPiece`, the escape `san/from/to`, `how` (check|threat|discovery), `pinnerHangs`, `line` {reply, cap} (exact 3-ply proof).
### B2. Dropped
- `pinnerHangs` — computed (every holder reply leaves the pinner capturable) and NEVER said; it's the strongest consequence ("and then the bishop that pinned it is lost").
- `worst` vs `base` balance (material after the escape) — the net is not said.
- Pins to the king are skipped (`shield.type === 'k'`, the loop) — correct (absolute pin can't break with a pinned move), but a break by the KING moving isn't this computer's.
### B3. Cheap
- For the HOLDER's mistake (S pinned something and leaned on it): did S's next move rely on the pin (piled on / moved the defender) and the break punished it? → compare the student's move with `findPinBreaks(fenAfterSmove, them)`.
### B4. Gates
- Only pins detected by `detectTactics`; behind piece not the king; escape must gain tempo (check, hits a piece worth ≥ behind, or a discovery on ≥ behind); worst-case balance after holder's best reply + 2-ply captures ≥ base (no material lost).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "Before you lean on a pin, check every move the pinned piece has." | conclusion leads; principle should lead |
| CONSEQUENCE | partly | `line.cap` | `pinnerHangs` (B2) |
| BETTER MOVE + JOB | partly | `san` (the escape — for the pinned side) | for the holder's mistake: errorWhy best |
| HABIT | yes | same sentence | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PB-1 | evaluate (false pin, leaned on) | S holder; S's move leaned on the pin and cost ≥ inaccuracy | findPinBreaks(fenAfter S move, them) non-empty | pinned, how, cap | "A pin holds only if the pinned piece has no move with tempo. Their pawn on c3 can leave with a threat, so the pin was never there." / "A piece that can leave with check isn't pinned. Their knight on d4 takes on f3 with check and the pin is gone." | cap: "and you lose the bishop" / pinnerHangs: "and the piece that pinned it hangs." | errorWhy best | "Before you lean on a pin, check every move the pinned piece has." | after | S's move did not use the pin | H + B2 |
| PB-2 | own resource missed | S pinned (own piece), S passive, cost ≥ inaccuracy | findPinBreaks(fenBefore, S) non-empty, S played ≠ san | san, how | "Your pinned piece isn't stuck if it can leave with check. Your knight on d4 could take on f3 with check and walk out of the pin." | "And their bishop would have been loose." (pinnerHangs) | "Nxf3+ was the move — out of the pin with check." (once past) | "When you're pinned, look for a move of the pinned piece that checks or threatens more." | after, past-only | still available after reply → hold | H |
| PB-3 | knowledge (how) | both | how | — | check: "A check comes first: a pinned piece that gives check is free." threat: "A bigger threat beats a pin." discovery: "Moving the pinned piece can unmask another attacker." | | | | Review | | H |
| PB-4 | combination (pinPressure) | both | pile-on rejected because pin breaks | — | "Piling on a pinned piece fails when it can simply leave with tempo." | | | | Review | | H |
| PB-REC | record | — | `missed-your-pin` / `missed-their-pin` | | RED/GREY full; AMBER "That pin doesn't hold — it leaves with check."; GREEN silent | | | | | | holdRate |
n/a: phase (any), strategize (tactical), their plan (n/a — a resource, not a plan).

## E. Mistake link
- costReason `allowed` with motif from the escape (e.g. `discovered_attack`, `fork`) where S's move relied on a pin → PB-1 (seat O exploits).
- costReason `missed` (seat S) where best = escape → PB-2.

## F. Build changes
1. pinBreak.ts — expose `net = worst - base` and say `pinnerHangs` (B2) → PB-1/2 consequence.
2. Caller for PB-1: on the student's move, `findPinBreaks(fenAfter, them)` with `pinner` belonging to the student AND errorWhy cost ≥ inaccuracy → recipe `pin-breaks`.
3. `pinBreakLine` deleted; recipe words principle-first.

## G. Proof boards
- PB-1 shape (O piece walks out): vc-0ipLPOAN_m8-51 `r4rk1/4ppb1/3p2pp/qb1P3P/1p2PNP1/2P5/P2Q1PB1/R3R1K1 b - - 0 24` (their c3 pawn "looks pinned … cxb4", your best Qa6).
- Text (lines-1, held): "Their knight on d4 looks pinned, but it can leave with check — Nxf3+ …".
- Guard: pin to the king (shield = k) → skipped.

## H. Open questions
1. none
