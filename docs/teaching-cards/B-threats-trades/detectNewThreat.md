# detectNewThreat — the threat a move creates

## A. Identity
- File: `src/services/groundedAnswer.ts`, `detectNewThreat(fenBefore, fenAfter, moverWB)` (7523–7642); helpers `captureThreatIsAnswerable` (7650), `describeThreatPrevention` (7799), `landingIsSafe`, `legalSeeGain`, `captureHasCounterTactic`.
- Registry: `boardComputers.ts` `newThreat` (6091–6118), kind `threat`, seat = mover; renderer `teachingSentence.renderNewThreat` (436–441).
- Reach: learn door, review, lesson, chat, tapped, tactics (registry says Learn reads it through its threat lane + move aspects, not this row). Callers: `opponentMovePurpose.threatStoppedBy` (64), the threat lane, `reviewMoveBriefing`.
- Census: 18 lines, all Review (15 said; 2 held `beside-mate`, 1 subsumed by a pin). Run on 804 plies: 28 fires (15 student moves, 13 opponent), 4 on an opponent move that cost them ≥ 100.

## B. Facts
- **B1** `DetectedThreat` (7496–7516): `san` (the threatening follow-up), `detail` (words: "forks the queen on d8 and rook on h8", "wins a queen for a knight", "delivers checkmate"), `kind` mate | fork | capture, `from`, `landing`, `targets[]` + `targetSquares[]` (fork victims), `guards[]` (the mover's pieces guarding the landing square), `rank`.
- **B2 dropped:** `net` of a capture threat is folded into `rank` (7597) and never named as points; whether the threat was **forcing** is recomputed by the renderer (`isForcingThreat`, teachingSentence 437); the `prior` threat (7639) — when the same threat existed before, the function returns null and drops the fact that it was ALREADY there (i.e. an ignored standing threat); `tradedByVictim` (7570) and `midTrade` (7628) verdicts are dropped (the "why it's not a threat" facts); `captureThreatIsAnswerable` (7614) drops the escape square.
- **B3 cheap:** the student's reply to an opponent threat is in hand on every mistake turn — `describeThreatPrevention(fenAfter, t, studentReply, them)` returns how a reply meets it (escape / hit-guard / add-defender / step-off / rules-out); `null` there = the reply did NOT meet it → the "ignored a new threat" cause. Also cheap: the fork's total (`forkPoints`, already in the registry stakes).
- **B4 gates:** null if the side to move after the move is in check (7529); capture threats need SEE net ≥ 3 and no counter-tactic (7597–7598); a capture threat the victim can walk from is dropped (7614); a fork needs king+major or two majors, landing safe, not traded off by a victim (7560–7574); mid-trade threats dropped (7615–7629); a threat that existed before the move is dropped (7637–7640). Pawn-forks of two minors are NOT found (majors only) — knights forking B+N never fires.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | kind, detail, targets | the rule ("a knight fork hits two pieces that can't both move") is never said |
| CONSEQUENCE | yes | detail ("wins a queen for a knight") | — |
| BETTER MOVE + JOB | partly | `describeThreatPrevention` returns the job for a given defence | not joined to the engine's best reply on the mistake turn |
| HABIT | no | — | habit per kind (fork / mate / capture) |

## D. Lesson recipes
Causes: **NT-IGN** (S): their move created threat T; the student's move did not meet it (`describeThreatPrevention(fenAfter, T, studentSan)` null) and cost ≥ mistake. **NT-WALK** (S): the student's move created a threat for THEM (call with mover = opponent on the board after the student's move — i.e. the student's move allowed their fork/mate) — today this needs the null-move call with the opponent as mover on `fenAfter`, which the function supports. **NT-O** (O): their move created a threat that the student could have punished? (no — see guard).

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| NT1 | recognize (fork) | S | NT-IGN, kind fork | piece at from, landing, targets | "A knight fork hits two pieces and you can only move one: their knight on {from} was threatening {landing}, hitting your {targets}." / "When their knight can jump to a square that hits two of your pieces, take that square away first." | "{detail}." | "{best} — {prevention job: covers {landing} / steps the {piece} off}." | "After their move, look at every square their knight can reach next." | full; no student move named | prevention says the reply met it; the fork is traded off (already filtered) | H + C: prevention on the student's move |
| NT2 | recognize (mate) | S | NT-IGN, kind mate | landing, from | "A mate threat comes before everything: their {piece} was threatening mate on {landing}." / "When they threaten mate, nothing else on the board matters until it's stopped." | "Mate next move." | "{best} covered {landing}." | "Every move, ask: can they mate me next move?" | full | the student's move gave check / mated first | H |
| NT3 | recognize (capture) | S | NT-IGN, kind capture | detail | "Their move created a new attack: {detail}. A new attack has to be answered before your own idea." | "{detail}." | "{best} {job}." | "After every move of theirs, ask what it attacks now that it didn't before." | full | overlaps computeMustDefend MD1 — one cause, one recipe (this card owns forks + mates; MD owns plain hanging) | H |
| NT4 | prevent (guard the landing) | S | NT-IGN, `guards` non-empty | guards | "A threat lives on its landing square: their {landing} is guarded only by {guards} — take that guard and the threat dies." | — | "{best} hit the guard." | "Find the square the threat needs, then attack or cover it." | full | guard removal costs more than the threat | H: guards |
| NT5 | knowledge (walk into a fork) | S | NT-WALK (their threat exists only after the student's move) | targets | "A square is only safe if their knight can't fork from next to it: your move put {targets} a knight's jump apart." | "{detail}." | "{best} kept them apart." | "Before you move a big piece, check the knight jumps around it." | full | `whyItFailed` 'walks-into-fork' fires (same cause, one recipe) | C: call with mover = them on the student's fenAfter |
| NT6 | opponent seat (their threat ignored by THEM) | O | the student's threat T was answerable and they did not answer (cost ≥ mistake) | — | owned by `threatStoppedBy` / `playItAnyway` (the student's threat stands) | | | | Review only | | |
| NT7 | strategize: answer with a bigger threat | S | NT-IGN but the student's move created a bigger threat | — | owned by `counterThreat`; NT1–3 must not fire | | | | | | H |
| NT8 | combination (+ pin, `latentDanger`) | S | kind fork and a target is pinned | — | "A pinned piece can't step out of a fork." | | | | | pin geometry from latentDanger | C |
| NT9 | record | S | — | — | RED/GREY full · AMBER "Their move threatened {san}." · GREEN silent | | | | | | `holdState` tags `missed-fork-threat`, `missed-mate-threat` |

Not applicable: *plan / strategize when* (one-move threat), *endgame-specific* (no phase logic; a fork in the endgame is the same lesson), *counterfactual earlier board* (the "prior" result is dropped — see F2).

## E. Mistake link
- Student: an `errorWhy` **allowed** cost whose first blow is T (motif fork / checkmate / hanging_piece) when T was ALREADY threatened before the student's move → NT1–NT3 (ignored); **walks-into-fork** (`whyItFailed`) → NT5.
- Opponent: nothing of its own; their ignored threat is `threatStoppedBy`'s card.

## F. Build changes
1. `groundedAnswer.ts` 7637–7640: return the standing threat instead of dropping it — `{ ...threat, standing: true }` when `prior.san === threat.san`, and let callers that want only new threats filter. Enables NT-IGN without a second scan (today the ignored case is invisible).
2. `DetectedThreat` (7496): add `net: number` (capture net), `forcing: boolean` (move `isForcingThreat` in), `vetoed: 'traded-by-victim' | 'mid-trade' | 'answerable' | null` for Review's "it looks like a threat but isn't" (detectBluff's lesson).
3. `mistakeLesson`: cause `threat-ignored` with sub-kind from `kind` (fork / mate / capture) → NT1–NT3; cause `walks-into-fork` → NT5 (shared with `whyItFailed`).
4. Join: on a student mistake turn, call `describeThreatPrevention(fenAfterTheirMove, T, bestSan, them)` for the BETTER MOVE job (it already returns the job words).
5. Sensitivity (B4): minor-piece forks (knight hitting bishop + knight, unprotected) are not threats here — leave as is (the `computeMustDefend` card covers each loose piece); widening is not needed for any recipe here.

## G. Proof boards
- NT1 (their fork, student must stop): g chesscom-1018307238 ply 33 Bxb7 (opponent) `r3r1k1/ppp3pp/3p4/5b2/2P3n1/2N3P1/PP4BP/R3R1K1 w - - 0 17` → threat Bc6 forking Ra8 + Re8; the student answered …Rab8 (threatStoppedBy says it stopped it) — the guard board (met → silent).
- NT1 fire: g chesscom-1020779996 ply 58 …Bc6 (opponent) → Bxg2 "wins a bishop and forks the queen on h3 and rook on f1"; the student's Rf2 met it (guard). 
- NT2: g chesscom-1005776142 ply 71 Qf4 (opponent, the student Black) → Qh6#; …Rxh3+ met it.
- Student-seat threat (Review "You're now threatening"): g chesscom-1012441262 ply 13 Qf3 → Nf7 forks d8/h8 (lines-0.jsonl:2451 is the census twin, Nc2 forking a1/e1).
- Guard (mid-trade must stay silent): the census held line lines-0.jsonl:7075 (subsumed by the pin).

## H. Open questions
- In Learn, an opponent's NEW threat the student answered correctly is not a mistake — silent. Is a threat answered by the wrong method (e.g. moving the queen when a free capture existed) a mistake turn at cost 50–99?
