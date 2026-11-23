# readTheirMove — seven reads of their last move, from the student's seat

## A. Identity
- File: `src/services/opponentMoveReads.ts` (612 lines). Entry `readTheirMove(args)` (586–612) runs seven reads: `quietDanger` (121–176), `obligationLifts` (264–320), `bishopOffPlan` (336–405), `wronglyExpected` (438–476), `helpedYou` (483–544, skipped when wronglyExpected fired), `ideaCondition` (183–244), `wedgedPawn` (551–580). `READ_FACT_KIND` (52–55) files each as `their-read`, `their-trigger` (idea-condition) or `prevent-test` (wedged-pawn).
- Registry: `boardComputers.ts` `theirRead` (5988–6005, the `their-read` ones, seat `opponent`, `namesStudentMove: r.namesMove`) and a second row at 6007ff for the trigger/prevent kinds.
- Reach: learn door, review, lesson, chat, tapped, tactics. Census: 158 lines (114 said): lesson 108 (71 said; held 28 `same-idea`, 9 `refused`), review 50 (43 said; 5 `in-flux`, 2 `beside-mate`). Run on 804 plies: helped-you 25, wrongly-expected 7, obligation-lifts 5, idea-condition 2, quiet-danger 2, wedged-pawn 2, bishop-off-plan 1.

## B. Facts (per read; every read returns `{kind, text, proof, squares, stakes?, namesMove, claim}` (57–69))
- **quietDanger** — their QUIET move (no capture, no check, 129) sets up mate in one (`matesInOne` on the null-move board, 137–139) when they also had checks available (133) and no mate already (135). Dropped: the list of checks they did not play (`checks`, 133) and the mating move's piece. `namesMove false`.
- **ideaCondition** — a second-best line (≥ 100 cp worse, 194) whose rook/queen move puts a piece on a knight's fork square (fork ≥ 3 points, unsafe for the student). The condition move IS the student's mistake if played. `namesMove false`. Dropped: which line (index), the cp gap.
- **obligationLifts** — a piece that hung before the student's move, the student guarded it, and their move took the attacker off (279–290). Duplicates `obligationLifted.ts` (see that card).
- **bishopOffPlan** — branch 1 (`theirMoveFlagged === true`, 356): their bishop runs into its own pawn(s); branch 2: one pawn of the student's shuts the bishop's diagonal within a pawn of best (namesMove TRUE). Dropped: `reach` length (the bishop's forward squares, 355).
- **wronglyExpected** — their capture lost: SEE says the square is not winning for the student (`signedLegalSeeFor ≤ 0`, 446) but the engine is ≥ 150 cp above the material (449), and the engine's reply is NOT the recapture (452). namesMove TRUE (the student's punishing move).
- **helpedYou** — the engine's best move for the student now hits the piece they moved (gain of time) or became possible / stopped dropping material (494–528). namesMove TRUE.
- **wedgedPawn** — the best move takes a pawn on the student's third rank next to their king and no pawn can retake (560–566). namesMove TRUE.
- **B3 cheap:** their move's cost is passed in only as a flag (`theirMoveFlagged`, used only by bishopOffPlan) — the cp value itself is in hand at every caller; the student's move after theirs (to say "you found it" vs "you missed it") is not an input.
- **B4 gates:** listed per read above; all null when it is the student's move on `fenBefore` (reads of THEIR move). wronglyExpected's 150 cp floor (449); ideaCondition's 100 cp gap (194) and fork ≥ 3 (220); bishopOffPlan's 50 cp band (366).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | each read's text carries a rule fragment ("the quiet move is the real danger", "looked free to them") | the general lesson is mixed into board prose, one stem each |
| CONSEQUENCE | yes | proof line + stakes | — |
| BETTER MOVE + JOB | partly | the named punishing move (wrongly-expected, helped-you, wedged) | held in Learn before the move; nothing says the student found / missed it |
| HABIT | no | — | — |

## D. Lesson recipes
On a mistake turn: **RT-O** their move was a mistake (cost ≥ floor) — said after the student's reply, past tense; **RT-MISS** the student's reply then missed the punishment the read names (student cost ≥ floor) — a student mistake; **RT-WALK** the student's move WAS the condition move (ideaCondition) or ignored the quiet danger.

| id | read | angle | seat | condition | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RT1 | quietDanger | recognize | S | RT-WALK: the student's reply did not stop the mate | "The most dangerous move is often the quiet one: their {piece} to {to} set up mate on {mateSq}, and checks were a distraction." / "Don't only watch their checks — a quiet move can threaten mate." | "{mate} is mate." | "{best} covered {mateSq}." | "After every quiet move of theirs, ask: does it threaten mate?" | full | the student's move gave check that wins (counterattack first) | H |
| RT2 | ideaCondition | knowledge (fork needs a target) | S | RT-WALK: the student's move = the condition move (rook/queen to cond.to) and the fork landed | "A knight fork needs two targets: your {piece} on {to} gave their knight on {jump} its second one." / "Before a heavy piece lands, check the knight jumps that would hit it." | "{fork} wins {points}." | "{best} kept the {piece} off {to}." | "Before you put a rook or queen down, check every knight jump onto it." | full | `whyItFailed` 'walks-into-fork' fires (one recipe, this read supplies "it needed your move") | H |
| RT3 | wronglyExpected | consequence (a grab that isn't free) | O | RT-O | "A piece is only free if nothing can hit back: they took the {piece} on {sq}, and {reply} punishes it." | "The grab costs them {stakes}." | (their mistake — the student's move named only once past) | — | after the student's move; if the student played the reply: silence on the student, one line on their mistake | their capture recaptures a piece the student just took (a TRADE — see G, F2) | H |
| RT4 | wronglyExpected | habit (missed it) | S | RT-MISS: the student did not play the punishing reply | "When they grab, look for the hit-back first: {reply} was there." | "They keep the {piece}." | "{reply} — {job}." | "When they take something, ask: what can I hit now?" | full | — | H |
| RT5 | helpedYou | consequence (gain of time) | O→S | RT-MISS: helped-you fired and the student did not play best | "A piece that just moved can be hit again with tempo: their {piece} on {sq} walked into {best}." / "Their move made {best} work — before it, it dropped material." | — | "{best} — {reason}." | "After their move, ask what it made possible for you." | full | the reason is "makes castling possible" (not a gain — G shows a false-flavour line) | H |
| RT6 | bishopOffPlan (branch 1) | knowledge (bad bishop) | O | RT-O, their move flagged | "A bishop that runs into its own pawn develops nothing: their bishop on {to} is stuck behind {pawn}." | "It stays bad until the pawn moves." | — | — | Review; Learn only as their mistake | — | H |
| RT7 | bishopOffPlan (branch 2) | prevent (shut the diagonal) | S | RT-MISS: the student's reply ignored the one-pawn shut and lost ≥ floor | "One pawn can take the sting out of a bishop: {push} shuts its diagonal toward {aim}." | — | "{push} — and the pawn is safe there." | — | full | — | H |
| RT8 | wedgedPawn | knowledge (king safety) | S | RT-MISS | "A pawn wedged next to your king is a spearhead: take it while no pawn can come back to {sq}." | — | "{best} — no pawn retakes on {sq}." | — | full | — | H |
| RT9 | obligationLifts | — | — | — | owned by `obligationLifted` (one computer, F3) | | | | | | |
| RT10 | record | — | S | — | RED/GREY full · AMBER one clause · GREEN silent, keyed to `missed-mate-threat` (RT1), `walks-into-fork` (RT2), `missed-tactic` (RT4/RT5) | | | | | | H |

Not applicable: plan / endgame-phase angles (each read is one move deep); the student's-move seat for RT3/RT6 (reads of their move).

## E. Mistake link
- Student: **walks-into-fork** (RT2), an ignored quiet mate threat = `costReason` **allowed** + motif checkmate (RT1), `costReason` **missed** when their grab or their move left a shot (RT4, RT5, RT7, RT8).
- Opponent: their **allowed** — the grab that isn't free (RT3), the self-blocked bishop (`positionalReason` misplaced-piece for their seat, RT6).

## F. Build changes
1. `opponentMoveReads.ts` 586: add `theirCostCp: number | null` (replace the boolean `theirMoveFlagged`) and `studentReply: string | null` so each read can say "found / missed" (RT4, RT5, RT7, RT8 need it).
2. `wronglyExpected` 438–476: skip when their capture RECAPTURES on a square the student just captured on (the prior move captured on `mv.to`). Board it must not fire on (run): g chesscom-1002984876 ply 12 …Kxd8 `rn1Qkb1r/ppp2ppp/5n2/4p3/4P1b1/5N2/PPP1BPPP/RNB1K2R b KQkq - 0 6` → said "The queen on d8 looked free to them" — the queens were being traded.
3. Delete `obligationLifts` (264–320) here; keep the one `obligationLifted.ts` computer (both run on every surface: the census has 41 obligationLifted + 5 obligation-lifts lines saying the same claim).
4. `helpedYou` 516–518: the "it makes X possible" reason fires on castling (run: g chesscom-1012441262 ply 38 …Qxb2 "it makes castling short possible") — restrict "possible" to moves that win material or check (a legal-move change alone is not a favour).
5. Each read returns `cause` (its `MistakeCause` member) and the rule-stem key; the renderers' prose moves to `mistakeLesson`.

## G. Proof boards (run)
- RT1: g chesscom-1005776142 ply 71 Qf4 (opponent; student Black) `4rk2/5p1p/5P2/8/1PP1P3/r4Q1P/1b1p4/6RK w - - 0 36` → quiet-danger, mate Qh6.
- RT2: g chesscom-1020632112 ply 55 Nxc7 → "it becomes a fork the moment your rook goes to d8".
- RT3: g chesscom-1013773584 ply 56 …fxg3 → "They took the knight on g3 expecting it to be free — the rook taking on g4 hits back."
- RT5: g chesscom-1012441262 ply 20 …Bh5 (cost 393) → "before it, the knight to e6 dropped material, and now it works."
- RT6: g chesscom-1036689856 ply 39 Bf3 (cost 582) → "Their bishop on f3 is blocked by its own pawn on e4."
- RT8: g chesscom-1005776142 ply 81 Kxf4 → wedged pawn on f6.
- Guard (F2): g chesscom-1002984876 ply 12 …Kxd8.

## H. Open questions
- RT3/RT6 describe THEIR mistake: after the student's reply, if the student punished correctly, does Learn still say the lesson about their mistake (either side), or stay silent because the student found it?
