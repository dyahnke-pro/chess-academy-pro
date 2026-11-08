# Phase 2 · L5 — today's Learn measured against how he teaches (2026-11-08)

Branch `phase2-l5-r1`. Two yardsticks, both read on today's code (cut from main a627fe9):

1. **The Danya bench** (held-out half of his 7,477 voiced notes, word-idea scoring) — the composer at Learn length.
2. **The scoreboard** — six of his games replayed move for move through the real Learn page (dev server, real engine, David's record loaded, muted, `scripts/audit-learn-replay.mjs --sans … --id …`), every computed and spoken line kept (`EVERYTHING=1`), scored per moment against his own teaching moves at the same plies (`his-bank-tags.json`, the live-game segment), and every spoken line read by hand.

Games (his voiced videos): NqtT3roFaBs Scotch Gambit (Black, 13 turns) · p5WLA70fXMM Open Sicilian, Fischer Bc4 (White, 35) · cmJbc_BzTp8 Caro-Kann (Black, 36) · 7uxRcomJo7I King's Indian (Black, 26) · i9lgxqlkUgQ Four Knights, center fork trick (White, 20) · uJCgrG90u8A Najdorf vs the English Attack (Black, 24). 154 turns; 6BHS8KMqLkU and xYJRC7aOrJ0 were queued and not run (time). Replays: `audit-reports/learn-replays-l5/` (local).

## 1. The bench (held out, EVERY=3, 2,488 notes; Review's walk source excluded — 5 s a note, 83% of a run — and REACH off)

2,488 notes (1,386 on the student's move), his 25 words a note, 2,981 s on today's code (HEAD a7e3b46, before the §4 fixes). Report: `audit-reports/danya-bench/report-l5.json` (local).

| held-out half | his ideas said | his lead idea | words |
|---|---|---|---|
| **today: the one composer** (as spoken) | **44%** | **33%** | 25 |
| **today: the one composer · Learn length** (30-word budget) | **42%** | **32%** | 24 |
| today: the lesson beat | 44% | 33% | 28 |
| his order · learned sources · 1 a step · Learn length | 55% | 38% | 39 |
| his order · learned sources · 2 a step · Learn length | 55% | 40% | 40 |
| his order · learned sources · 1 a step · Review length | 62% | 43% | 59 |
| his order · learned sources · 2 a step · Review length | 68% | 49% | 77 |
| Review's whole pool | 59% | 43% | 101 |
| everything built (the ceiling) | 83% | 68% | 419 |

Against the last numbers in PLAN.md: the composer **40.9% / 30.3% → 44% / 33%** (+3 / +3 since C2–C5 and the voice batches); his order at Learn length **53% / 38% at 42 words → 55% / 38% at 39 words**. The gap that remains at Learn length: 13 points of his ideas, 6 of his lead, for 15 more words. (This run leaves out Review's walk as a source — the earlier runs had it — so "learned sources" here cannot pick Review's lines; the composer rows do not read it either way.)

Where the composer is thinnest against what the computers already build (the composer column vs BUILT, all notes): the plan 4% of 158 vs 99% · move order 5% of 171 vs 92% · the trade 8% of 156 vs 60% · defending 11% of 252 vs 53% · attack 16% of 394 vs 64% · the weakness 4% of 163 vs 37% · prevention 3% of 113 vs 21% · the habit 1% of 107 vs 26% · the line 22% of 179 vs 65% · the capture 29% of 594 vs 66%. Built nowhere: structure (0% of 67), theory 0–9% of 78, the trap 3% of 38.

## 2. The scoreboard — his teaching moves, SAID and COMPUTED, per moment

A turn = the student's move at ply p and the coach's reply at p+1; his moves are the codes on his words at those plies (144 of the 154 turns carry his words, 616 teaching moves).

| | his moves | SAID | COMPUTED | we said | where he made none |
|---|---|---|---|---|---|
| the turn door's kept facts (`learnMoments.measure.test.ts`) | 616 | 139 = **23%** | 251 = **41%** | 527 | 388 (74%) |
| every door's "said" (`score-learn.mjs`, includes the moment door and the focus) | 616 | 166 = 26.9% | 251 = 40.7% | 796 | 630 |

The Scotch Gambit game alone, the head replay of 2026-11-05 vs today: 33.3% / 53.3% both times (`score-learn`): the C2–C5 work did not move this game's score.

**Per part of the turn** (share of his 616 moves a fact of that part made, said / computed; our lines said and the share he would not say there):

| part | said | computed | ours said | not his |
|---|---|---|---|---|
| their move read | 76 (12%) | 122 (20%) | 269 | 72% |
| your move | 21 (3%) | 53 (9%) | 87 | 76% |
| the question before your move | 14 (2%) | 27 (4%) | 116 | 88% |
| the build (sets up a tactic) | 31 (5%) | 95 (15%) | 63 | 51% |
| the bait | 0 | 0 | 0 | — |
| aside | 11 (2%) | 11 (2%) | 20 | 45% |

**Per moment kind** (the L2 split): quiet·middlegame 298 of his moves — 24% said / 43% computed · capture·middlegame 117 — 15% / 36% · quiet·opening 100 — 30% / 47% · castle·middlegame 25 — 20% / 32% · quiet·endgame 25 — 28% / 36% · capture·opening 23 — 17% / 30% · check·middlegame 19 — 16% / 26%.

**The four moments (C0's measure on these replays):** spoke on 147 of 154 turns; 92 turns (60%) said more than one moment (C0 on 11-07: 57 of 105, 54%); their move read on 115 of 145 posed, the question on 68 of 110, the build on 58 of 145, the bait posed 0 times.

**Words:** 9,733 spoken over 154 turns — 63 a turn (954–2,097 a game); 7 silent turns. Reply on the board in 1.9–2.4 s on average, first word 2.2–3.7 s.

**Computed but held** (the 18-point gap between SAID 23% and COMPUTED 41% is the door's choice, not a missing computer): his moves the turn had a fact for and did not say — the plan 19 of 71, the evaluation 14 of 28, the verdict 12 of 41, the habit 12 of 14 (the focus says its own habit lines outside the door, so the turn door's count reads 0 there), what their move is for 8, what a quiet move is for 8, the structure 7. This is L4's input: the matrix decides these seats.

### What he does that Learn does not (his moves Learn says least, of the ones he makes ≥ 6 times)

| his move | his | said | computed | what it is in his words |
|---|---|---|---|---|
| S-SQUARE-CHOICE | 26 | 0% | 0% | "you can put it on d6 or b6, both good — I like d6" · "take with the bishop, not the knight" — **instrument note:** Learn says square choices 11 times in these games, but `squareChoice` is filed under kind `contrast` (→ H-TWO-GOOD / M-REFUTED), so the scoreboard cannot see them. Owed: a kind of its own. |
| M-PURPOSE-PREVENT | 19 | 0% | 0% | "you could play a5 and stop b4, but you don't need to" |
| M-RECAPTURE | 14 | 0% | 0% | "recapture toward the centre", "with the bishop, not the knight — the knight lets them trap your e6 bishop" |
| T-HANG / T-LINE / T-MATE / H-CALC | 12 / 9 / 7 / 11 | 0% | 0% | the line out loud, what hangs, the mate |
| M-VERDICT | 41 | 15% | 44% | "an instructive blunder — not as bad as books say, but much worse" |
| H-CANDIDATES | 25 | 4% | 12% | "the other move I thought of was …Qe7 or …Qc6" |
| T-TACTIC | 14 | 0% | 29% | the metal detector: "taking drags the queen onto d4, x-rayed by your g7 bishop" |
| P-STRUCTURE | 19 | 0% | 37% | "ruin their structure, weaken their king, create an isolated pawn" |
| M-REPLY-TREE / T-TRAP-AHEAD | 7 / 6 | 0% | 0% | "that contains a pretty vicious trap" |

The pattern on the board, not just in the codes: **the thread.** His Najdorf plan (Bg5 removes the d5 defender → Bxf6 → Nd5 → Nd2 → c3 → f4) reached Learn as separate true facts on four of six moves and never as one plan; 15.f4, the move it all built to, was a silent turn. His KID ideas (f3 leaves the e3 bishop loose → lever e4; the metal detector; remove the single defender) — Learn said the last one, as a pointer before the move. His sacrifices (Najdorf 17…b3, 19…Rxa2) were silent or clued as a miss.

### What Learn says that he would not (the 74%)

The question before the move (88% not his) and their move read (72%) carry most of it. Repeated formulas across the six games: "Another move was worth the same here — …" (10 times in 5 games, the other move never named; twice "the other puts the piece where it does more", which contradicts "worth the same"), "The timing of X matters — a move earlier, their pawn would have taken on X" (3 games), "Take back their … and your … and this is the …" (2 games), "A real crossroads: from here master games split into …" (5 times in 3 games, twice naming the line already on the board), "— pieces behind a strong center reach either wing in a move or two" (8 times in 5 games, tacked onto unrelated lines), their capture led with what it prevents ("Their …Bxf6 (a recapture): it takes your Bxe5 away", "Their …Bxd5 stops your Nxf6+", "Their Bxf7+ stops your …cxb2", "Their Nxc3 does two jobs: it stops your …Nxd1").

## 3. Every spoken line read — flags (game · ply)

### False claims (fixed at their producers, each with a test that fails on the old code — §4)

1. **Scotch Gambit · ply 12** (after 7.Qd5+): "Your bishop on c5 survives on a tactic, not on its guards — recheck it every move" — the same turn says they win it; Stockfish d18 confirms it falls. `speedRunReads.heldByTactic` read the raw SEE with Black in check (0 read as "taking loses").
2. **Scotch Gambit · ply 16** (8…d6): "Nce7 looks natural, but it doesn't work: they play Nxc3 — they win a pawn" — d6 lost the same c3 pawn (they played Qxc3). d16: d6 −0.72, Nce7 −2.42; the pawn is in both lines. `costReason` explained a cost with an absolute gain, never against the move it is measured against.
3. **Najdorf (White) · ply 13** (before 7.Nf3): "You could have castled there. Get your king safe before the centre opens." — …e5 hit the d4 knight; O-O was legal and drops it (d16 O-O −3.19, Nf5 +0.82). `castlingWatch.reminderDue` read legality only.
4. **Najdorf (White) · ply 65** (after 33…Rh8+, of the block 34.Rh5): "Test the slow plan with Rh5 by its best case: even if everything goes right, it only gets you level" — the same turn: "Rh5? That drops the rook"; d16 Rh5 = mate in 20 against. `bestCasePlan` never checked the slow line was level.
5. **Caro-Kann · ply 56** (29.Re7): "They play Re7, taking your pawn on e6, where it hits your knight on e5" — Re7 takes nothing; Rxe6 is the next move. `deepFact` said a next-move capture with no "next".
6. **King's Indian · ply 18** (9…c6): "c6 prepares c5, which would kick their knight on d4" — …c5 was there from c7 in one move. The door kept it and held the true line its principle computer had: "Your c6 prepares d5 — when the d-pawn goes forward, it will be supported" (his own idea). `pawnKickNext` never asked whether the pawn could already reach the square.
7. **Four Knights · ply 7** (4.Nxe5, the center fork trick): "Hold on — that move leaves a piece of yours loose" — Nxe5 is the best move (d18 +0.68; he: "your reaction should be automatic"). The page judges the focus before the price lands (cpLoss null) and `leftLoose` never read the board's own read. Same root: **Najdorf (Black) · ply 38**, the exchange sacrifice 19…Rxa2 (d16 +1.36, best) clued "leaves a piece of yours loose".
8. **Four Knights · ply 29** (15.Bxe5 dxe5): "They play dxe5 — they win a bishop" — a recapture. `decisiveReason`: when the take-back sentence was not trusted, the generic win branch counted the recapture from the board after Bxe5.

### Misleading or wrong lead (not fixed here — listed for the matrix / the voice work)

- Scotch Gambit · ply 10: "…dxc3 opens lines at their king — 2 of your pieces now bear on it" on a −0.9 move into a known trap (he: "a pretty vicious trap"); "Their Bxf7+ stops your …cxb2" — its point is Qd5+ forking the king and the c5 bishop (said one turn later).
- Najdorf (Black) · ply 40: "Their weak e3, f4 and h4 hide behind the bishop on g5; chase it with h6" — names the student's move before he plays (squareJudgement has a held form; the door spoke the full one) beside "There is something here for you now" (…Qxb3).
- Caro-Kann · ply 46: "What's the priority here? Their pawn on c2" then "That plan came before winning their weak pawn on c2" — two computers disagree in one turn.
- Caro-Kann · ply 42: "bxa5 has a cost for them: no pawn of theirs can cover c5 again" — bxa5 was eight moves earlier (the story offers a hole until heard).
- King's Indian · ply 30 / Four Knights · ply 23: "it throws away three or four points of advantage" when they had none (d16 −0.66 → −4.53; the cost is right, "of advantage" is not).
- Four Knights · ply 23: "h3 builds nothing; another pawn move makes a phalanx" — h3 chased the knight that fell two moves later; f4 (kicks the e5 bishop) is better by a pawn, said for its formation.
- Caro-Kann · ply 14: "Their dxc5 opens the d-file for the rooks" — half-opens (…d5 stands; the pawn-break computer in the same turn says so).
- Square choices said in the present tense of squares the piece never went to: "Their knight went to f3 — on e2 it blocks their light-squared bishop" (8 lines).
- "forks your both rooks" (King's Indian · ply 30, `latentFork`).
- Routes as reasons: "Bf6 was their move — it would head on to d8", "Qd3 … would head on to b5".

### Robotic marks (approximate; a few lines counted in both written and spoken form)

semicolon 24 · dash chain 23 · over 32 words 21 · stock opener ("Anything else, like …") 15 · square named three times 4 · "eyeing" 4. The plan finder said in full twice in two turns (King's Indian · plies 26/28); "Blunder check before you let go of a piece: run CCT for them — … Habit: "Is my move safe?"" (Najdorf · ply 65).

### By design, not flagged

The focus clue and the question repeat word for word ("Hold on — something of theirs is loose. Count attackers against defenders." ×5 in one game) — fixed lines on purpose. "Last time here you played Re8 and it cost you about half a point" — kept on David's call.

### Good (his idea, said)

h6 takes g5 so Kf7 walks without a check · the bishop stays home to block a queen check · the Ng6 fork two moves out · castle by hand · …Nf6 unpins g7 · the battery on f6 · b4 costs them c3 ("what square does this weaken") · …Qc7 covers c4 three times to one · …e5's price: no pawn can cover d5 · Be7 unpins · b5 prepares b4 · the d4 fork in the Four Knights · Re8 on the half-open file · d5 cracks the centre · Rxe5 wins a pawn · Bxc3 removes the only defender · the mate counts and the end line.

## 4. Fixes (on the branch)

Each fix is at the computer that produced the claim, so every surface that reads it changes at once; each has a test on the real board from the replay that FAILS on the old code (10 tests, all red on HEAD, green after).

| # | producer | the root | the fix | test |
|---|---|---|---|---|
| 1 | `speedRunReads.heldByTactic`, `takeTheSting` | a "safe / held / no longer works" claim read the raw SEE, which is 0 when the side is in check | read through the safety door (`captureRead` → null in check) | `speedRunReads.test.ts` (the Scotch Gambit board after 7.Qd5+; a Qb3+ check that only delays …Rxe4) |
| 2 | `costReason` (+ its seven callers) | a cost is a difference, its reason was an absolute gain | REQUIRED `against`: the other move's line; a blow is the reason only past what that line also gives (`otherNet`); wired in `errorWhy`, `decisiveReason` next-best, `ifTheyPlay`, `weighedMoves` ×2, `refutedAlternative`, and Review's projections (`reasonFor` — the seventh, found by the required field, not by grep) | `costReason.test.ts` (8…Nce7 vs 8…d6, with the Nxe5 control) |
| 3 | `castlingWatch.reminderDue` | "you could have castled there" read legality only | the rewind's own soundness rule, one function `castleSound` (in the board's read, under `CASTLE_DROP_CP` of best, not losing); REQUIRED `lines` | `castlingWatch.test.ts` (the board before 7.Nf3) |
| 4 | `speedRunReads.bestCasePlan` | "level" checked only from above | the slow line within half a pawn of level, either way | `speedRunReads.test.ts` (34.Rh5) |
| 5 | `threeFacts.deepFact` | a capture on the very next move had no time word | "taking … next" | `threeFacts.test.ts` (29.Re7) |
| 6 | `pawnKickNext` | a push the pawn could already make was called prepared | refused when the pawn reached that square in one move from where it stood | `reviewWalkOct1.test.ts` (9…c6) |
| 7 | `focusChances.leftLoose` | the page judges before the price (cpLoss null) and the read was never asked | the board's own read prices the move (`castlingWatch.costOf`, the one cost-from-read) | `focusChances.test.ts` (4.Nxe5; covers 19…Rxa2) |
| 8 | `decisiveReason` | an untrusted take-back fell through to "they win X" | a recapture is never counted as a win | `decisiveReason.recapture.test.ts` (15.Bxe5 dxe5) |

Decision baseline regenerated and every changed line read (`src/test/fixtures/decision-baseline.json`, 21 lines): Learn, chat and lesson rows on colle800, sicilianClosed1000 and gotham-jelena lose the false "Test the slow plan with … only gets you level" five times and one tempting move whose pawn the played line lost as well (sicilianClosed1000 · 34…Bd4+, "Bd7 … they win a pawn"); the counts on those rows move with them. Review's rows are unchanged on all four games and the rev fingerprint gate passes, so REVIEW_NARRATION_REV stays 54 (the gate's four games never reach these producers on Review; the plan's R4 owes Review's own read of them). Commit c0eebcb.

Behaviour that changes with fix 3 (David's to confirm): "You could have castled there" is now said only where the board's own read (six lines on Learn's board) lists castling within a pawn of its best and not losing — the rewind's rule. Where castling was legal but unsound, or the read had not come back, the reminder waits for a later board.

