# patternFails — card

## A. Identity
- `patternFails(fen, lines, playedSan)` — `src/services/patternFails.ts` (`patternOf` = forking-check | free-grab; main walks lines[1..]).
- Teaching fact via `orderTeaching.ts:114-115` (`computer: 'patternFails'`, kind `refuted`, evidence tag `calculation-depth` posedImportance 70, event `coach_pattern_fails`); role `computerRoles.ts:80` (held wired, broken = SLIP, askable via orderReads).
- Census: 4 fired / 4 said (lesson).

## B. Facts
### B1. Handed over (`PatternFail`)
`text`, `tempting` (SAN), `pattern` forking-check|free-grab, `target`, `counter` (their counter-check), `loses` (words: ledger-named or count, or "the game to mate"), `proof`, `squares`.
### B2. Dropped
- `bestCp − cp` gap (≥ 150cp) — how much worse the pattern is than the best.
- `worst` vs `end` material dip (the line may lose more mid-way than at its end).
- The `mated` flag is folded into words.
- The PLAYED move is explicitly skipped (`if (playedSan && strip(playedSan) === strip(san)) continue;`) — the one time the pattern failure is a MISTAKE (the student played it) this computer stays silent and leaves it to errorWhy.
### B3. Cheap
- Run with `playedSan = null` and filter to the played move's line (saved read after the played move) → the played pattern's failure in the same words.
### B4. Gates
≥ 2 lines; the alternative ≥ 150cp worse than best and ≤ +50 for the mover; the first move is a check hitting a loose or bigger piece (forking-check) or a capture of an undefended non-pawn (free-grab); the line loses ≥ 1 pawn or mates within 6 plies; proof legal.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "looks like a fork, but here it loses …" | the rule ("a pattern is only as good as their reply") |
| CONSEQUENCE | yes | `loses`, `counter` | — |
| BETTER MOVE + JOB | no | — | errorWhy's best when it was played |
| HABIT | no | — | "Before the pattern, check their checks first" (spotCue fork `check` / free-piece `landing-square`) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PF-1 | evaluate (S played the false fork) | S mistake | patternOf(fenBefore, played) = forking-check AND the played line (B3) loses | target, counter, loses | "A fork is only a fork if they can't answer with something bigger. The check hitting the rook on a8 runs into their counter-check on c2." / "The pattern your eye goes to isn't always the move: check what they do back first." | "It costs a queen for a bishop." | errorWhy best | "Before a forking check, look at their checks after it." | after | the played move's cost < mistake | C (B3) |
| PF-2 | evaluate (S grabbed the loose piece) | S mistake | pattern = free-grab, played | target, loses | "A piece left loose is sometimes bait. The rook on a8 only looked free — grabbing it loses the queen." | loses | errorWhy best | spotCue free-piece `loose` / "ask why they left it" | after | — | C |
| PF-3 | knowledge (avoided trap) | S | today's fire (S didn't play it) | — | "The obvious grab here fails — the rook on a8 is bait." | | | | Review / Learn praise path | — | H |
| PF-4 | their seat | O | run on O's board (their tempting pattern fails) | — | "Their forking check doesn't work: your counter-check comes first." | | | | Review | — | C |
| PF-REC | record | — | `calculation-depth` | | RED/GREY full; AMBER "That fork has a counter-check."; GREEN silent | | | | | | holdRate |
n/a: phase, plan. Combination: poisonedPiece (grab → mate) and deepCombination (the bait was a sac) — dedupe by target square.

## E. Mistake link
- whyItFailed `answered-by-tactic` (in-between check hits the attacker) — the same mechanism as PF-1/PF-2; this card supplies the PATTERN name ("looks like a fork") for the lesson stem.
- costReason `allowed` after the student played a check/grab → PF-1/PF-2.

## F. Build changes
1. patternFails.ts — add `mode: 'alternative' | 'played'`; when `playedSan` is given AND its own line is passed, read it instead of skipping (B2/B3) → PF-1/PF-2.
2. Expose `gapCp`, `worstDip`, `mated` typed.
3. Words → recipe `false-pattern` (forking-check/free-grab); errorWhy's `answered-by-tactic` line becomes the CONSEQUENCE, this the LESSON.

## G. Proof boards
- Voiced: vc-1PI3xfMiUE4-35 (said: "Nf6 with check and the grab on h5 is the pattern your eye goes to, but here it loses a bishop to the counter-check …Nxg3+.").
- Text (lines-0): "The rook on a8 only looks loose: Qxa8, but here it loses a queen and a pawn for a rook." (PF-2/PF-3); "The check …Nc2+ hitting the rook on a1 looks like a fork, but here it loses two pawns." (PF-1).

## H. Open questions
1. none
