# CARD — `preparesBreakClause` (covers the masters' break square)

## A. Identity
`src/services/mastersPlanRead.ts:332` `preparesBreakClause(fenBefore, san, read, moverIsStudent)`; `preparesBreakBeat :357`. Reads `MastersPlanRead` (white/black break: san, square, from, share). Census 23 offered / 7 said (lesson 18, review 5; 13 dropped same-idea).

## B. Facts
- **B1** `{clause: "prepares d4: your knight on f3 covers the square, and masters push it in 59% of their games from here", squares}`.
- **B2 dropped:** nothing beyond the coverer count; the WHY of the break (what d4 does) is not read — the reason given is a STATISTIC ("masters push it in 59%") — census verdict "P (stat as reason)".
- **B3 cheap:** the break's job via `pawnBreak(fenAfterPrep, brk.san)` (strikes/opens) — same as breakPrep's dropped `aim`; whether the square was lost before and safe after (as `breakPrep` reason `guards-square`). With that, this is a duplicate of `breakPrep` with a database source for WHICH break.
- **B4 gates:** the moved piece must attack the break square (`:348`); not when the break is this move (`:346`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | stat | a statistic is not a lesson (CLAUDE.md "A REASON, NOT A STATISTIC") |
| CONSEQUENCE | no | — | the break's aim |
| BETTER MOVE + JOB | partly | clause on bestSan | stat as reason |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PB1 | own plan | S mistake | best move = preparesBreakClause for the side's break AND played move does not cover it AND errorWhy cause positional `no-plan`/`mistimed-pawn-break` | brk, aim | "In this structure the game turns on one break: point your pieces at its square first." | "Without the support, …d5 drops the pawn." (B3 SEE) | "Nf6 covered d5 for the break." | "Ask which break the structure wants, and support it." | same | aim from `pawnBreak`, never the share | C |
| PB2 | knowledge | S/O | named opening + break | | (readPosition's named-structure row owns it) | | | | | | — |

Doesn't apply: most angles — this is a source of WHICH break, not a lesson computer; the lesson lives in breakPrep/BP1.

## E. Mistake link
`positional` `no-plan` / `mistimed-pawn-break` (better move = break support), S seat mostly.

## F. Build changes
1. Fold into `breakPrep`: `breakPrep` takes an optional `preferBreak` (the masters' break) so one computer says "prepares the break" with a board reason; `preparesBreakClause` stops producing its own sentence.
2. Remove the share from every spoken clause (`:349-353`) — a statistic is never the reason.
3. Learn: no good-move lines.
4. (moved from §H) Source split: the masters' break (`MastersPlanRead`, a database read — G3: the DB owns the moves) picks WHICH break; `pawnBreak` on the board gives its WHY. Answer: yes, that is the shape `breakPrep(…, preferBreak)` in F1 implements.

## G. Proof boards
- Census: "They go Nf3, which prepares d4: their knight on f3 covers the square, and masters push it in 59% of their games from here." (`lines-2.jsonl:672`, said); "It also prepares e5: your knight on d7 covers the square, and masters push it in 76%…" (`boards-3.jsonl:1201`).
- Guard: any of these on a good move → silent in Learn.

## H. Open questions
none — the former H1 ("masters' break picks WHICH break, the board gives WHY") is a build question, answered in §F4.
