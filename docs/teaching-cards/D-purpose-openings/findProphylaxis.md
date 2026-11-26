# CARD — `findProphylaxis` (stop it before it lands)

## A. Identity
`src/services/prophylaxis.ts:222` `findProphylaxis(fen)` (memo wrapper; the read is `findProphylaxisUncached :239`) → `Prophylaxis` (interface `:30`, not exported); helpers `theirWantedMoves :189`, `theirWantSentence`, `prophylaxisProof :284`, `prophylaxisLine`, `prophylaxisIdea :320` ("Watch …Bg4 — it would pin … One move stops it before it lands."), `prophylaxisThreatProof`, `prophylaxisKey`. Memo 512 boards (`:236`). Kinds `speedrun-read` (chat 36), `stop`, `two-jobs`, `timing` (census 51/49).

## B. Facts
- **B1** `{kind: pin|kick|fork, intent {san,from,to,piece}, victim {square,piece}, prevention {san,from,to,piece}, squares, threat {line, squares, motif}}`.
- **B2 dropped:** only the FIRST want × first quiet stop is returned (`:251-274`); every other want and every other stopping move is dropped; whether the prevention is a pawn-covers vs pin-no-longer-pins (`stillWorks`) is only in `prophylaxisProof.short` prose; the piece BEHIND a pin (`w.hits`) in squares only.
- **B3 cheap:** (a) **after the student's move**, did they play the prevention? If not, and the want then landed (their next move = `intent.san`, or errorWhy cause allowed-tactic with motif pin/fork on the same square) → that is a prophylaxis MISS, the lesson; (b) all wants (sorted) and all preventions per want, typed.
- **B4 gates:** quiet moves only — one-step pawn push or king step, no capture/check (`:247-249`); prevention must be safe itself (`:256`); order fork > pin > kick (`:244-245`); not in check (`:242`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `prophylaxisIdea` ("One move stops it before it lands") | stated BEFORE the move as advice; Learn mistakes-only needs it after the miss |
| CONSEQUENCE | yes | `threat` + `prophylaxisProof.full` | — |
| BETTER MOVE + JOB | yes | `prevention` + proof ("after h3 the pawn covers g4") | only once past |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | prevent (pin) | S mistake | board before student's move had `findProphylaxis` kind pin; student played other; errorWhy cause = allowed-tactic motif pin with the same pinner square | intent, victim, prevention | "A modest pawn move can stop a pin before it happens: take the square the bishop needs." / "The best defence against a pin is to never allow it." | "…Bg4 pins the knight to the queen." | "h3 took g4 away first." | "Every move, ask which of their pieces wants to pin yours." | same, prevention named only past | the pin must be the mistake's cause (same square) — not any prophylaxis on the board | C (B3a) |
| P2 | prevent (fork) | S mistake | kind fork, then fork landed | forker square | "A fork is stopped by covering the square the knight jumps to." | "…Nd4 forks the queen and rook." | "c3 covered d4." | "Check every square their knight can reach next move." | same | as P1 | C |
| P3 | tempo (kick) | S mistake | kind kick, kick landed and cost ≥ mistake | kicker | "A pawn kick is free time for them. When a pawn can hit your piece, move the pawn's square out of reach first, or put the piece elsewhere." | | "a3 stopped …b4." | "Ask whether a pawn can kick your piece next move." | same | kick must be errorWhy's cause | C |
| P4 | strategize (when) | S | prophylaxis existed and student played their own plan, no cost | | none (not a mistake → silent in Learn) | | | | silent | — | — |
| P5 | both seats | O mistake | THEY missed the prophylaxis and the student's pin landed | | **pointer at the student's move** → H1 | | | | held | | C |
| P6 | timing | S | the want landed several moves later | | "Prevention is cheapest early: one pawn move now saves three piece moves later." | | | | Review only | needs the ply gap | C |
| P7 | record | S | `missed-their-pin` / `missed-their-fork` tag RED/GREY | | full + habit · AMBER one clause · GREEN silent | | | | | | H |

Doesn't apply: endgame (prophylaxis reader is about pins/kicks of minors; endgame prophylaxis is a different computer); evaluate.

## E. Mistake link
errorWhy `allowed-tactic` (motif pin / fork) and `allowed-threat` (kick) when the allowed blow equals this board's `intent` — both seats; MissedTag `missed-their-pin` / `missed-their-fork` / `missed-opponents-threat`.

## F. Build changes
1. `prophylaxis.ts:30` — export `Prophylaxis`; add `findProphylaxes(fen): Prophylaxis[]` (all wants × all preventions, B2) behind the memo.
2. New join (in `mistakeLesson` input builder, not in the computer): `prophylaxisMiss(fenBefore, playedSan, cause)` = a `Prophylaxis` on fenBefore whose `intent.to` equals the cause's refuter square and whose `prevention` ≠ played move.
3. Learn: delete the before-move advice (`prophylaxisIdea` "Watch …Bg4 … One move stops it", the `stop` kind on Learn's turn) — Learn speaks after the move only (plan step 5). Chat (`speedrun-read`, 36 lines) keeps it (asked).
4. **Sensitivity** `prophylaxis.ts:247-249`: the prevention list is one-step pawn pushes and king steps only; a piece move that covers the square (Nd2/Bd2 against a pin, a knight to the fork square) or a two-step pawn push is never found, so on those boards P1–P3 have no BETTER-MOVE job. Old: pawn ±1 / king step → new: any non-capture, non-check move after which `stillWorks` (`:156`) is false, pawns ranked first, the same safety check (`:256`). Proof board: none in the saved set yet — the checker's run (below) found `findProphylaxis` null on the ply-14 pin board, so the build must search the 952 boards for a P1–P3 cause whose prevention is a piece move; guard: the Bxf7+ board's h3 must stay a non-cause (P1's guard is the join, F2, not this list). NB the ply-20 fork (Ne6) is NOT a prophylaxis case: before …Bh5 the bishop on g4 covered e6, so the fork did not exist on the board before the move — it is `moveLetsIn`'s (moveStops card), not this computer's.
5. P1–P3, P7 rows into `mistakeLesson.ts` under `allowed-tactic.pin|fork` / `allowed-threat.kick` with `better.job = 'prophylaxis'`.

## G. Proof boards
- Census, chat: "Watch Bg4 — it would pin your knight on f3. One move stops it before it lands." (`lines-2.jsonl:1942`); Learn: "Your c3 takes away b4: Qb4 would pin your knight on d2." (`lines-1.jsonl:3471`).
- Pure run on David's costly moves: 16 of 109 boards had a prophylaxis; most are NOT the mistake's cause (guard): chesscom-1012441262 ply 9 Bxf7+ (`r1bqk1nr/ppp1ppbp/2np2p1/8/2BPP3/5N2/PPP2PPP/RNBQK2R w KQkq - 2 5`) → "pin:Bg4 stopped by h3" while the mistake was the bishop sac (took-guarded) — P1 must NOT fire.
- P1 candidate: chesscom-1018307238 ply 14 …Nxd4 (`r1bqk2r/pppp2pp/2n2n2/2b2p2/2PP4/2N3P1/PP3PBP/R1BQK1NR b KQkq - 0 7`) — **checker ran `findProphylaxis` on it (chess.js only, 2026-11-23): `null`.** The pin Bg5 is created BY …Nxd4 (moveLetsIn), so it is not a prophylaxis miss — P1 has no proof board yet.
- Checker run, chesscom-1012441262 ply 20 …Bh5 board (`r2qkr2/ppp1p1bp/2np1np1/6N1/3PP1b1/2P3QP/PP3PP1/RNB1K2R b KQ - 0 10`): `findProphylaxis` = kick d5 (hits the knight on c6), prevention …e6 — not the game's punishment (the Ne6 fork, which …Bh5 itself created). Guard case for P3: the join (F2) must reject it because errorWhy's cause is the fork.

## H. Open questions
1. P5: their missed prophylaxis is the student's shot — Learn holds it until the student has played?
2. Is a prophylaxis lesson said when the pin landed but cost under 100cp (an inaccuracy)?
