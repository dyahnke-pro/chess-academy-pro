# temptingRefuted — the natural move that fails (on a move just played)

## A. Identity
- `src/services/weighedMoves.ts:420` `temptingRefuted(args)` (one pick), `temptingRefutations` :445 (all), core `refutationsWithReal` :451, `refuteCandidate` :511, the one-move form `refutationOf` :583.
- Registry `temptingRefuted` `boardComputers.ts:3535-3554`, kind `refuted`, claims `temptingKey(uci)` + `rule-out:<sq>` / `rule-out:mate:<sq>`, stakes = cost, both seats, `namesStudentMove:false`. Census 120/64 (lesson; many held already-said/same-idea).

## B. Facts
- B1: `TemptingRefuted { san, uci, eye, costCp, reason: CostReason, text, because, squares, proof, key, claims }` (:365-386). `reason` is the ONE cost walker (`costReason`: seat, kind allowed, mate, plies, ledger, netForWinner, trust, motif).
- B2 dropped: `real` (the human-model probability, :454 used for the pick, stripped); `look` (`tryLooksLike` :393 — "looks like a pin/fork") only woven into text; `hoped` (`countingOn` — the reply the player expects), `missShape` (`easyToMiss` — why the refuter is overlooked) only in text.
- B3 cheap: nothing — this is already the richest refuter; what is missing is the PLAYED move: `readCandidates` skips `playedUci` (:295), so the move the student actually played is never refuted here. `refutationOf({fen, uci: played, reads, …})` (:583) refutes exactly that move against the best read.
- B4: candidate eye ≥ 4% or real ≥ 4% (`CANDIDATE_BAR` :95) or mate-walk; real ≥ 0.3% (`TEMPTING_P_FLOOR` :106); `temptingTry` (:321: obvious eye, capture/check, direct attack); cost ≥ 100 (`TEMPTING_COST_CP` :98); costReason `allowed` and `trust.name` (:528); a piece simply given away (net ≥ 4 on the first reply) skipped (:494).

## C. Sentence readiness (the played move as the tempting try)
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | lead stems "looks like a pin, but it fails" / "counting on …Bxb2" | the play-specific lesson exists only for an UNPLAYED try; for the played move use `refutationOf` |
| CONSEQUENCE | yes | `because` (the line + "you win a bishop") | |
| BETTER MOVE + JOB | no | — | best + bestWhy from deliberation |
| HABIT | partly | `easyToMiss` sentence ("Rfb1 is the move that's easy to overlook, because it takes nothing and gives no check") | that is a real habit — expose it typed |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TR1 | recognize (look) | both | `refutationOf(played)` non-null, `look` set | look | "A move that looks like {a pin} is only a pin if it holds. This one fails to {reply}." | because | best + bestWhy | "Before the move that looks good, find their best reply." | after move; "this move", never its SAN | trust.name (lineTrust) | H (via refutationOf) |
| TR2 | calculate (counting on) | both | `hoped` set | hoped reply | "Don't play a move that only works if they answer the way you hope. You were counting on {hoped}; they had {reply}." | because | best | "Check their best reply, not the one you want." | after move | hoped ≠ refuter | H (typed) |
| TR3 | habit (easy to miss) | both | `missShape` set | shape | "The refutation was a quiet move: quiet moves are the ones we miss, because they take nothing and give no check." | | | "After every candidate, look for their quiet answer too." | after move | missShape computed at rating | H (typed) |
| TR4 | consequence (mate) | both | reason.mate | | "A move that walks into mate loses everything else it does." | "it's mate" (line) | best (stops the mate) | "Check every check they have." | | | H |
| TR5 | their seat (tempting for them, unplayed) | O | today's read (an unplayed try of theirs) | | Review only — the try was not played; a mistakes-only Learn is silent | | | | silent | | H |
| TR6 | their seat (played) | O | refutationOf(their played move) | | "Their move looked natural, but it fails: {because}." | | the punish is the student's next move → Learn holds the line, says the lesson | — | Learn: lesson words, no move (pointer rule) | | H |
| TR7 | record | S | | | RED/GREY full · AMBER one clause · GREEN silent | | | | | | H |
| — | endgame / plan | — | the plan-target lead ("going straight at {target}") is the plan family's; included via `planAim` | | | | | | | | |

## E. Mistake link
- costReason `allowed` (every motif the one classifier names, + mate) — this computer is the error computer's own walker used on a try; for a played mistake TR1–TR4 explain the SAME cause errorWhy explains, with the "why it looked good" half errorWhy lacks. Both seats.

## F. Build changes
1. Mistake turn: call `refutationOf({ fen: fenBefore, uci: playedUci, student, reads, priorMove, rating })` (weighedMoves.ts:583) — it already measures against the best read.
2. Return typed `look`, `hoped`, `missShape` on `TemptingRefuted` (B2) instead of only inside `text` (:540-575).
3. Keep `real` on the type (the pick reason) for the recipe priority.
4. Learn: registry row for unplayed tries stays Review/lesson only (TR5); mistakes-only Learn reads TR1–TR4/TR6.
5. Recipes into `mistakeLesson`; `text` stays Review's.

## G. Proof boards
- Pure run, 12 games: 67 hits, 2 on mistake plies: g:1015773958#41 O `Kf2` loss 110 → "Be3 was tempting for them … you play Bd4 … you win a bishop" (an UNPLAYED try of theirs — TR5); g:1042725180#72 S `…Nf8` loss 136 → "…Bf8 looks natural, but … Qxd7 — they win a knight" (unplayed — the played …Nf8 itself is not refuted: B3 gap).
- Danya vc-_j8aiuqS4_0-6, vc--FRuDd_oXz4-32.
- Have-check misses (Danya ideas the computer should carry): mysterious-gm-moves#3 "25.g4? is futile after …fxg4"; the-art-of-setting-traps#0 "31.Nxe7+ Rxe7 32.Rd1 a5 gives no relief"; blunders-a-grandmasters-perspective#0 "48…Ke7?? throws the win".

## H. Open questions
- None.
