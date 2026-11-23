# detectSetUpChance — card

## A. Identity
- `detectSetUpChance(fen, topLines, student, horizon)` — `src/services/setUpChance.ts:298-316`; `strikeOf` (quiet move → strike down the engine line), `pinOf` (quiet move pinning to K/Q), record `setUpPosed` :330, skill `setUpSkill` :337 (motif's `yours` tag).
- Words: `setUpClause` (names move) / `setUpHeldClause` (held) — setUpChance.ts end of file.
- Board computer `setUpChance` — `src/services/boardComputers.ts:3087-3104`, kind `latent-chance`, `namesStudentMove: true`, `heldForm.points` = motif skill (pointer rule), surfaces `LIVE_READ`.
- Census: 23 fired / 21 said (chat 18, learn 5); 8 voiced boards. All said lines are the PIN branch ("quietly pins their knight to their king …").

## B. Facts
### B1. Handed over (`SetUpChance`)
`kind` strike|pin, `motif` (MotifId via `MOTIF_OF_TACTIC[detectTacticType]`), `uci`/`san` (the quiet move — held), `depth` (2 = next move, 3 = after), `gain` (pawns, 100 = mate), `mates`, `captured`, `strikeTakes`, `frozen` (pinned piece has no legal move), `targets`/`squares`, `line`.
### B2. Dropped
- The STRIKE move itself (`strike = line[strikeIdx]`) and its index — computed, never exposed; the lesson "the quiet move makes X possible next" needs it (Review).
- The opponent's reply in between (`nextReply = line[1]`) — why the set-up survives their one move.
- `threatens(...)` verdict (quiet move threatens nothing at once) — the very reason it is easy to miss ("it threatens nothing, so the eye skips it").
- `prize.from` origin tracking (the piece that will be won, where it stood when the quiet move was played).
### B3. Cheap
- Whether the student's played move kept the set-up alive: run `detectSetUpChance` on the board after their move + reply with the same line minus? — or simpler: did their played move equal `uci` (found) vs not (missed).
- What the pinned piece guards (for the pin branch): `attackers(sq, them)` of each of their pieces including the pinned square → "the knight on f6 was the only guard of h7".
### B4. Gates
- `SET_UP_SOUND_CP = 50` (line within 50cp of best); `SET_UP_GAIN = 2` pawns; `tacticNow` → silent if a shot already exists (≤3 moves); quiet = no capture/promo/check (`quietMove`); first move threatens nothing (`threatens`); depth 2..horizon; line trusted (`lineTrust`) beyond depth 2 at full horizon; gain holds to line end (`holdsToTheEnd`); prize ≥ minor or mate; pin branch: front not a pawn, back = K or Q, pin new, pinned piece can't take the pinner.
- Pin branch wins NOTHING by construction (`gain: 0`) — the census lines are this branch: "pins their knight … whatever it guards is guarded no more" with nothing named as guarded = generic.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | motif, targets, payoff words | the general rule ("the strongest move often threatens nothing yet") |
| CONSEQUENCE | partly (strike) / no (pin) | gain, depth, mates | pin: what is no longer guarded (B3) |
| BETTER MOVE + JOB | yes (once past) | `san` + `doesWords` | job wording exists; must be gated to after the move (`pastBetterNameable`) |
| HABIT | no | `setUpSkill` tag | spotCue for motif (the set-up habit: "ask what one quiet move would make possible") |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SU-1 | strategize (quiet move) | S missed | kind=strike, S played ≠ uci, errorWhy cost ≥ mistake | motif→word, targets, depth | "The strongest move often threatens nothing yet: it sets up the next one. Here a quiet move set up a fork of their queen and rook." / "Not every good move attacks. One quiet move here made a fork possible next move." | gain → "It wins material on your next move." / mates → "It ends in mate." | "Re1 was the move — it set up the fork on d6." (san + strike square, B2) | "Before you settle for a safe move, ask what one quiet move would make possible." | after the move only; move named only if `pastBetterNameable` | `tacticNow` (a shot was already there → that's a missed shot, other card); line untrusted | H + B2 |
| SU-2 | calculate (depth) | S | depth=3 | depth | "Count it forward: quiet move, their reply, then the strike two moves later." | | | | Review | depth 2 → SU-1 | H |
| SU-3 | knowledge (pin set-up) | S missed | kind=pin, pinned piece guards something (B3) | targets, guarded sq | "A pin is a set-up, not a win: it freezes a defender so you can hit what it guards. Pinning their knight on f6 would leave h7 with no guard." | "Then h7 falls." (only if line shows it) | "Bg5 was the move — it froze the knight that holds h7." | spotCue pin | after; Review | pin guards nothing → SILENT (census lines say "whatever it guards" with nothing named — delete) | C (B3) |
| SU-4 | their plan | O | run with student = opponent on the board after S's move | motif | "Their quiet moves are setting something up. Their rook to d1 lines up a pin next move — ask what it prepares." | | "Your best answer was to move the queen off the d-file." | spotCue (theirs) | after S's mistake that allowed it | requires calling with opponent seat (today only student) | C |
| SU-5 | evaluate | S | gain ≥ 2, sound within 50cp | gain | "When a quiet move and a forcing move lead to the same place, the quiet one is easier to miss — and just as strong." | | | | Review | | H |
| SU-6 | habit (record) | S | `setUpSkill` RED/GREY | tag | full SU-1; AMBER one clause "A quiet move set up a fork here."; GREEN silent | | | | | | holdRate |
n/a: phase (any phase, line-based); exception (tacticNow already excludes direct shots); counterfactual = SU-1 (played vs uci).

## E. Mistake link
- costReason `missed` with motif from the set-up line (a strike that lands two moves on) — kind `missed`, seat S: SU-1/SU-2/SU-3.
- `allowed`: only via SU-4 (opponent seat, not run today).
- errorWhy `betterMoveFact` already names a better move's job; SU-1 supplies the job "it set up X" for a quiet best move whose own job reader finds nothing (boardHalfReason fallback).

## F. Build changes
1. setUpChance.ts `strikeOf` return — add `strikeUci`, `strikeSan`, `replyUci` (B2) to `SetUpChance`.
2. `pinOf` — add `guards: Square[]` (pieces the pinned piece is the only guard of, chess.js `attackers`); if empty AND gain 0 → return null (deletes the generic "whatever it guards is guarded no more" census lines).
3. boardComputers.ts:3092-3101 — Learn must not speak it before the move (WO); route the fact to `mistakeLesson` recipe `missed-set-up` when errorWhy's best move === `su.uci`.
4. errorWhy: when bestSan's job reader returns null and `detectSetUpChance(fenBefore, [bestLine], mover, 'full')?.uci === best` → reason "it set up <whatWords>" (closes the quiet-better-move gap).
5. Allow `student` param to be the opponent (SU-4): the board-turn check (:300) already requires the seat to move — call on the board after S's move with `student = them`.

## G. Proof boards
- SU-3 (pin): vc-_4xbS0Crtic-15 `rnbqr1k1/pppp1pp1/5n1p/2b5/3NP2B/2N5/PPP1BPPP/R2QK2R b KQ - 1 8` (said "Bb4 quietly pins their knight to their king" — check what the Nc3 guards: e4 → the lesson "e4 loses its guard"); vc--PSQS88VdZU-8 `r1bqkbnr/ppp2ppp/2np4/8/2BpP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 5` (Bb5 pin on c6 to king).
- Queen-behind pins: vc-_JQ-AH3OYQ4-14 `rn1q1rk1/pbpp1ppp/1p2pn2/8/3PP3/P1NB4/1PP2PPP/R1BQK2R w KQ - 1 8` (Bg5), vc-_zT8aWZh2x0-45.
- Guard: any board where `tacticNow` holds (a direct shot) — the shot cards own it.
- Not run (needs engine topLines; saved bench reads exist in audit-reports/.fixtures/danya-bench but not loaded here).

## H. Open questions
1. A missed set-up usually costs ≤ an inaccuracy (the engine line is +2 vs a safe move ≈ the same eval sometimes) — is a missed set-up a Learn mistake turn when errorWhy grades it below "mistake"?
2. Pin set-ups that win nothing yet (gain 0): delete from speech entirely, or keep in Review as a plan?
