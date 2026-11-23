# CARD — `moveJob` / `moveIntent` (what a move is for)

## A. Identity
- **moveIntent** — `src/services/moveIntent.ts:253` (`moveIntent`), helpers `denied :830`, `stopReason :~668`, `whatTheStopDid`, `whatItDoes`, `unlockedMoves :894`, `phrase :~528`, `intentRule :929`, `preventsNamedIdea :946`. Callers: `boardComputers.ts:6519`, `decisiveReason.ts:356`, `movePurpose.ts:40-41` (two passes: `DEFAULT_INTENT` then `{prepare:'line', prevent:'concrete'}`).
- **moveJob** — `src/services/bookMoveWhy.ts:807` → `rankedMoveJob :~846`: capture → castle(null) → check → king-guard → escape → attack(+guard) → rescue → guard → `stopsJob` → `prophylaxisJob` → `stopsPushJob` → develop+castle → `clearsRoadJob` → `preparesJob` → castlesNext → develop.
- **CoachFactKind:** `move-job`, `two-jobs` (census label `moveJob`: 1251 offered / 563 said; lesson 1060, review 191; dropped 492 same-idea, 167 restates).

## B. Facts
### B1. Handed over
- `MoveIntent` (`:166`): `prevents {uci, san, threatCp, mate?}`, `prepares {uci, san, gainCp}`, `text`, `squares`, `about`.
- `moveJob`: `{kind: attack|capture|castle|center|develop|fork|guard|nets|prepares|recapture|rescue|take-back-gain|tempo|wins-back, squares, clause, compact?, forms?, prepsCastle?, escapesCheck?}`.

### B2. Computed and dropped
| value | where | what |
|---|---|---|
| `stopReason(...)` as a TYPE | `moveIntent.ts:~668-700` | returned only as prose ("you cover d5 twice to their one" / "the pawn would just be lost on e5" / "the knight would just be taken") — the count (`mine`, `theirs`) and the kind (lost-by-count vs out-counted vs covered-king-square) are dropped |
| `threatDid` (`whatTheStopDid`) | `:505` | `{verb, castle, develops}` — prose verb only ("hit the knight on f5", "take the rook on h8") |
| `does` (`whatItDoes`) | `:510` | prepared move's point (castle / hit X / file) — prose verb |
| the pass line | `reads.passBefore` loop `:288` | which of their moves was the THREAT and its whole pass line (`line.moves`) — only uci/san kept |
| `gone` reason | `:318-324` | illegal now vs scored worse vs off the list — dropped |
| `mateGone` | `:331` | kept as `mate` |
| `unlocked` list | `:383` | every move unlocked, only the engine-played one kept |
| moveJob `kind` reaches Learn only via the door's `FACT_GROUP`; the **target** of a guard/attack is in `squares[0]` but not typed (piece type, attacker) | `bookMoveWhy.ts` guardJob/attackJob | |

### B3. Cheap to compute — THE PASS-IN-YOUR-HEAD TEST (the fix to `stopReason`)
Two questions, both from reads the surface already holds:
1. **Skip the move → what would they play?** `reads.passBefore[0]` (null move before) — already read; keep its whole line `line.moves` and its score `threatCp`.
2. **Let them play it after your move → why does it fail now?** Today `stopReason` (`:~688`) plays the stopped move ONE ply on the board after the move and asks `legalSeeGainFor(c.fen(), m.to, mover) <= 0` → "the pawn would just be lost on e5". That is a one-move board check. When the real refutation is a line (David's board: …e5 failed to dxe6, opening the d-file), it says a false or thin reason. The engine already has the line: `reads.after.find(l => l.moves[0] === prevents.uci)?.moves` (MultiPV after the move) or `reads.everyAfter.replies.find(r => r.uci === prevents.uci)?.pv` (`ifTheyPlay.ReplyRead.pv`, `ifTheyPlay.ts:51`). Read that line with the ONE ledger (`costReason({fenBefore: fenAfter, playedSan: prevents.san, mover: opp, …, after: {uci: pv.slice(1)}})`) → kind + motif + what it wins/opens. Name the line only on `lineTrust`. If neither read lists the move → no reason (silent), never the one-ply guess.
3. Typed result: `StopProof = {kind: 'lost-on-square'|'out-counted'|'covered'|'line', count?: {mine, theirs}, line?: CostReason}`.

### B4. Gates
`THREAT_CP = 100 :181` · `PREPARE_CP = 50 :183` · `STOPPED_PLIES = 6 :187` · `PREPARED_PLIES = 6 :193` · `GONE_CP = 60 :195` · reply played = not stopped `:342` · line plays it within 3 moves `:345-349` · book: stop must be x/+/# `:450` · prepared piece move needs `whatItDoes` `:457` · hitting move → not prepares `:462` · saved piece → not prepares `:478` · take-back → not prepares `:488` · quiet stop needs a reason `:508`.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | the job kind exists (prevents / prepares / guard / develop …) but no general lesson keyed on it |
| CONSEQUENCE | partly | `threatDid`, `stopReason` prose | the stop reason is one ply, not the line (B3) |
| BETTER MOVE + JOB | **yes — this is its main use in a mistake turn** | run on the BETTER move (`bestSan`) instead of the played one | must be run on the better move with the same reads (errorWhy `boardHalfReason` partly does) |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| J1 | prevent | S mistake | played move had no `prevents` AND `passBefore[0]` threat ≥ THREAT_CP is still on after it (errorWhy cause allowed-threat/allowed-tactic) | threat san, target | "Before your own plan, ask what they would play if you passed. Their …Bg4 was coming, and it pins your knight." / "Every move answers a question: what is their threat?" | "Now …Bg4 lands." | "h3 took g4 away first." (moveIntent on bestSan, `prevents`) | "Before every move, ask: if I passed, what would they play?" | same, better move only once past | threat must not be the move they then played (`:342` inverted: it IS what they played → proven) | H passBefore |
| J2 | calculate (the stop's proof) | S/O | better move `prevents` + StopProof.line | line kind | "A move stops a threat when the threat now loses: count it, or play it out." | "If they push …e5 now, dxe6 opens the d-file onto the queen." (StopProof line, named on `lineTrust`) | | "Play their idea out in your head after your move: does it still work?" | same | StopProof from the engine line only, never the one-ply SEE when a line exists | C (B3) |
| J3 | count | S/O | StopProof `out-counted` | mine, theirs | "A pawn break needs more support than the square has guards." | "You cover d5 twice to their once, so …d5 just loses the pawn." | | "Count attackers and defenders on the break square." | same | mine > theirs > 0 | H (prose) → type it |
| J4 | own plan (prepares) | S mistake | better move `prepares` a break/development the played move left impossible | prepared move | "The quiet move first, then the break: prepare it so the pawn lands supported." | "Without it, …d5 just drops the pawn." | "c6 prepared …d5, so the pawn comes with support." | "Before a break, ask what supports the landing square." | prepared move named only past | `prepares` in engine line ≤ 6 plies | H |
| J5 | develop | S mistake | better = develop job, played = non-developing, phase opening | piece | "In the opening, every move should bring a piece out or fight for the centre." | "A piece left home can't fight." | "Nf6 brought the knight out." | "Count your pieces at home." | same | opening only | H |
| J6 | guard (knowledge) | S mistake | errorWhy abandoned-defender / the better move's `guard` job on the lost piece | guarded piece | "A guard you take away is a piece you hand over." | | "Rd8 kept guarding the d-pawn." | "Before a piece moves, ask what it guards." | same | job's target = errorWhy lostSquare | H |
| J7 | rescue | S mistake | better = `rescue` of the attacked piece, played elsewhere | piece | "An attacked piece moves first — then your plan." | "They take the bishop on g4." | "Bg3 moved the bishop before the knight took it." | "Every move, check whether something of yours is attacked." | same | piece was attacked before the move | H |
| J8 | tempo (attack) | S/O | better = `attack`/`tempo` job | target | "The best moves do two things: develop and attack something." | | "d5 hit the knight and gained the time." | — | — | — | H |
| J9 | castle | S mistake | better clears/does castling, king in centre | — | "Castle before the centre opens." | | "Nf3 cleared the way to castle." | "Ask if your king is safe if the centre opened now." | same | `castlesNext` | H |
| J10 | their plan | O | their move `prepares` X (good move, no mistake) | | Review/chat only (Learn speaks only on mistakes) | | | | silent in Learn | no mistake | H |
| J11 | both seats (their miss) | O mistake | their move did not stop the student's threat (pass test from their seat) | | "They didn't ask what you threatened." — **pointer at the student's next move** → H2 | | | | held (owner call) | never name the student's threat move | H |
| J12 | exception (stop isn't real) | — | `stopReason` one-ply "would just be lost" but engine line says it works | | guard only: never said | | | | | StopProof line contradicts one-ply → silent | C |

Doesn't apply: endgame phase specific (jobs are phase-agnostic; the endgame king/passer jobs live in other computers); evaluate.

## E. Mistake link
- Explains **allowed-threat / allowed-tactic** (errorWhy E10/E12) through J1 (the threat you did not stop), both seats.
- Fills **BETTER MOVE + JOB** for every errorWhy cause where the better move's job is a stop/guard/rescue/develop/prepare (J2–J9).
- Positional `no-plan` / `neglected-development` (E15) via J4/J5.

## F. Build changes
1. `moveIntent.ts:~668` `stopReason` → return `StopProof` (typed); add the `line` kind read from `reads.after`/`reads.everyAfter` pv for the stopped move, through `costReason` (B3). The one-ply SEE stays only when no engine line for that move exists, and is dropped when a line exists and disagrees (J12).
2. `moveIntent.ts:166` `MoveIntent` — add `stopProof: StopProof | null`, `threatDid: PreparedPoint | null`, `does: PreparedPoint | null`, `passLine: string[]` (the threat's pass line).
3. `bookMoveWhy.ts:807` `moveJob` — add typed `target: {square, piece} | null` and `attackerOf?` for guard/rescue/attack kinds.
4. `inaccuracyCall.ts` `boardHalfReason :290` / errorWhy better reason — call `moveIntent`/`moveJob` on `bestSan` with the same reads, map job kind → `BetterJobKind` for `MistakeCause.better.job`.
5. Recipes J1–J9 into `mistakeLesson.ts`, keyed `cause.kind × better.job`.
6. Delete in Learn: the stand-alone "You play X — it attacks …" good-move lines (Learn speaks only on mistakes).

## G. Proof boards
- Census, Learn: "You play Nbd2 — it prepares e4: after it, your pawn can come to e4 and hold there." (`lines-0.jsonl:597`) — J4 shape; "Your h3 stops …Qe5, which would pin your knight on e2 against your king." (moveStops, `boards-1.jsonl:2319`, b=vc-1zfJ7ABoh8k-13).
- J1 (mistake, threat not stopped): chesscom-1012441262 ply 32, …Qb5, FEN `r4rk1/pppq2Np/3p1npB/n2Pp2b/4P3/2P1Q2P/PP1N1PP1/R3K2R b KQ - 2 16` — errorWhy "it let them play Ne6, which attacks the rook on f8"; posTag missed-opponents-threat.
- J7: chesscom-1001055178 ply 62 …Kg6 (`1r6/1pr1qk2/p1p1pb1p/5p2/5p2/3R1BP1/P2R1PKP/3Q4 b - - 1 31`): better Qb4 "move the queen out of danger".
- J12 / the stopReason defect: David's reported board (…e5 → dxe6 opening the d-file) is not in the saved census lines (no "would just be lost on e5" line from moveIntent was offered on the 16 games); the build's test must be built from that board when found. Census has 46 breakStopped lines with the one-ply wording "The pawn would just be lost there now" (`lines-*.jsonl`, e.g. "…e6 takes the d5 break away from you") — each must be re-proven with the line.
- Not run: moveIntent needs four engine reads per move (no saved passBefore/passAfter reads in g-*.jsonl).

## H. Open questions
1. Learn speaks only on mistakes: are the good-move "stops/prepares" lines (563 said today) all removed from Learn, or kept on a move that is the ONLY move?
2. J11: telling the student their opponent did not stop the student's own threat points at the student's next move — speak it after the student has played it, or never?
