# secondAttacker — card

## A. Identity
- `secondAttacker(fenBefore, san)` — `src/services/secondAttacker.ts:43` (main fn, `mateByCapture` :91); words `secondAttackerLine(s, own, fen)` :117.
- Board computer `secondAttacker` — `src/services/boardComputers.ts:7053-7075`, kind `move-job`, seat = mover, `namesStudentMove: mine`; lesson-board / learn-via-thought / review via moveThoughtFacts.
- Census: 58 fired / 47 said (lesson 53, review 5); 1+ voiced boards.

## B. Facts
### B1. Handed over (`SecondAttacker`)
`target`, `targetPiece`, `newcomer` {square, piece}, `partner` {square, piece}, `attackers` (count after), `guards[]` {square, piece}, `gain` (SEE pawns after), `mate` (capture SAN that mates).
### B2. Dropped
- `gainBefore` (:71, SEE before the move, must be ≤ 0, :72) — the "it was safe one move ago, now it isn't" contrast is the lesson's hinge and is not said.
- Rejected cases: newcomer worth LESS than the target (`worth(mv.piece) < worth(cell.type)` skips, :70) — a pawn/minor joining against a rook is the stronger version ("a cheaper attacker") and is dropped by this computer.
### B3. Cheap
- The defender's answer: student moves (when the mover is the opponent) that add a guard or move the target so SEE ≤ 0 — chess.js over legal moves with `legalSeeGainFor`.
- Whether the student's ACTUAL reply met it: `legalSeeGainFor(afterReply, target, them) ≥ 1` → missed defence (the mistake).
### B4. Gates
Quiet move (no capture/promo), not a pawn or king move, no check; target non-king; ≥ 2 attackers including the newcomer, a partner already attacking; newcomer didn't attack it from its old square; newcomer worth ≥ target; SEE before ≤ 0; SEE after ≥ 1 or a mating capture. Best = mate, else highest gain.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | join + tally ("That's two attackers, and the bishop on c5 guards it") | the rule; today pure board restatement + count |
| CONSEQUENCE | yes | gain / mate ("Taking on g5 now wins a piece" / "They threaten … win a piece") | — |
| BETTER MOVE + JOB | no | — | for O's threat ignored: B3 defence "Be3 was the move — a second guard on d4" |
| HABIT | no | — | spotCue free-piece `underdefended` / `attacked-yours` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SA-1 | prevent (ignored threat) | O added the attacker; S's reply did not meet it (B3), cost ≥ mistake | secondAttacker(fenBeforeTheirMove, theirSan) non-null, SEE after S reply ≥ 1 | target, newcomer, partner, guards | "When they add a second attacker, add a second guard or move the piece. Their knight joined the queen against your knight on d4, and it had one guard." / "Count every new attacker: two against one, and your knight on d4 falls." | "They take on d4 and win a piece." | "Be3 was the move — the second guard on d4." (B3) | "After their move, ask what it attacks now, and count." | after S's reply (the mistake) | S's reply defended it; the attack was a sacrifice | H + C |
| SA-2 | own plan (found → n/a) | S | S's move added it | — | positive — not a mistake turn; Review only ("Your rook adds a second attacker on e4…") | gain | | | Review / Learn praise path | — | H |
| SA-3 | own plan (missed) | S | a second-attacker move existed on fenBefore (scan legal moves with secondAttacker), S played other, cost ≥ inaccuracy | target, gain | "One more attacker and the piece falls: their pawn on e4 had two guards and you had one more piece to bring." | "Two against one wins it." | "Re1 was the move — the second attacker on e4." (once past) | spotCue free-piece `underdefended` | after, past-only | — | C (scan) |
| SA-4 | calculate | both | — | B2 gainBefore | "One move ago the bishop was safe. A second attacker changes the count, and now it isn't." | | | | Review | gainBefore > 0 (was already winnable) | B2 |
| SA-5 | knowledge (mate on the square) | both | mate | mate san | "A second attacker on a square next to the king can mean mate, not material." | "Qxh7 would be mate." | | spotCue mate | after | — | H |
| SA-6 | knowledge (cheaper attacker) | both | newcomer worth < target (today skipped) | — | "A cheaper attacker wins even against a guard: a knight joining against a rook wins the exchange." | | | spotCue free-piece `attacked-by-smaller` | | needs gate change | C (lift gate) |
| SA-REC | record | — | `missed-opponents-threat` / `hung-material` | | RED/GREY full; AMBER "Their second attacker on d4 — count it."; GREEN silent | | | | | | holdRate |
n/a: phase (any), strategize (tactical count). Combination: attackerDefenderCount reads the same target after — dedupe by target square claim.

## E. Mistake link
- errorWhy / costReason `allowed` (S's reply failed to meet a threat) motif `hanging_piece` on `target` → SA-1 seat O. Today errorWhy has no "ignored a threat" kind; `causedByTheMove` would mark the loss as NOT caused by S's move (the threat pre-existed) — so this lesson needs its own cause kind `ignored-threat` (see whyItFailed card F).
- costReason `missed` (S) → SA-3.

## F. Build changes
1. secondAttacker.ts:71-88 — expose `gainBefore` (B2).
2. Add `meetsSecondAttacker(fenAfterReply, sa, defender): boolean` and `defences(fenAfterTheirMove, sa, student): {san, kind}[]` (B3) → SA-1.
3. Wire SA-1: on the student's reply, run `secondAttacker` on the opponent's PREVIOUS move; if not met and errorWhy cost ≥ mistake → recipe `ignored-second-attacker`.
4. `secondAttackerLine` deleted from speech; recipe words it rule-first; dedupe with `count` by `target`.
6. SA-6 ownership (moved from §H): the cheaper-attacker JOIN belongs here (it is a move that adds an attacker); the static "a smaller piece attacks a bigger one" read stays with attackerDefenderCount AD-6. One claim key on the target square dedupes them.
5. SA-6 sensitivity (secondAttacker.ts:70): allow `worth(mv.piece) < worth(target)` when SEE after ≥ 1 (old: skip; new: keep, word as cheaper attacker). Miss board to find on the data (census has none — open).

## G. Proof boards
- vc-_4xbS0Crtic-12 (voiced): "Your rook adds a second attacker on their pawn on e4, beside the knight on f6. That's two attackers, and the knight on c3 guards it. Taking on e4 now wins a pawn." (SA-2 shape; Review).
- Text (lines-0, lesson): "Their knight adds a second attacker on your knight on d4, beside the queen on d1 … They threaten to take on d4 and win a piece." (SA-1 candidate — check S's reply).
- Guard: the attack is a sacrifice offer (S's reply ignores it on purpose and the engine agrees) → errorWhy cost below mistake → silent.

## H. Open questions
1. none (checker 2026-11-23: the SA-6 ownership question was a build question — answered in F6).
