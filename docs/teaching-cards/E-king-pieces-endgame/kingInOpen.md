# Card — `kingInOpen` (a king off its shelter, with checks against it)

## A. Identity
- File: `src/services/kingInOpen.ts` — `kingInOpen` (:45), helper `checkingPieces` (:26).
- Registry `boardComputers.ts:7424` (standing-board read, `ctx.fen`), kind `king-read`; sets `skill: 'weakened-king-safety'` when the student's king (:7434). Surfaces: lesson/review/play/chat/think/learn (via moveThoughtFacts), weaknesses (`moveInsight.ts`).
- Census: 29 fired / 16 said (held already-said 11, same-idea 2).

## B. Facts
- **B1** `KingInOpen` (:22): `side`, `king`, `cover` (0/1 own pawns in front of king's files, `kingCover.present`), `checkers[]` (squares of N/B/R/Q that can check given the move), `text`, `squares`.
- **B2 dropped**: `checks` (number of distinct checks, :26-39) — computed, only used in the gate/text for one checker; the CHECK MOVES themselves (`m.san` list, :35-37) are dropped (the consequence "Qh5+ then Qxe8" lives there); `lineScore(ls[0], attacker)` (:67) — the engine's view; `rights` (:59) whether the king lost castling.
- **B3 cheap**: `shelterHome` — nearest square with ≥2 own pawns in front (`kingCover` on candidate squares, BFS for the king in 1–2 moves); `forkingCheck` — among the check moves, the one that also attacks an undefended piece (chess.js attackers on the landing square) = the concrete consequence; `howExposed` — which move drove/walked the king (fenBefore king square vs fenAfter).
- **B4 gates**: attacker has a queen (:50); king not castled-on-back-rank (:54); centre king with castling rights skipped (`detectCentralKingDanger`'s job, :60); `cover.present ≤ 1` (:61); ≥2 checking pieces or ≥3 checks by one (:64); engine line for attacker ≥ 0 when lines given (:67).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | text tail "a king like that matters more than a pawn" / "count that before you count pawns" — a real rule, but glued to a board census | rule first, example inside |
| CONSEQUENCE | no | — | the check that wins something (`forkingCheck`, B3) |
| BETTER MOVE + JOB | no | — | `shelterHome` or the errorWhy better move ("Kg1 took the king back behind the g- and h-pawns") |
| HABIT | no | — | record `weakened-king-safety` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KO1 | EVAL/KNOW | S defender | student's king in open after the student's costly move | king, checkers | "A king with no pawns in front is worth more than any pawn: your king on {king} can be checked by their {checkers}." / "An exposed king turns every check into a tempo for them." | "Each check comes with a threat, and one of them hits {target}." (forkingCheck) | "{best} kept the king behind its pawns." | "Before you take a pawn near your king, ask how many checks you hand them." | "A king with no pawns in front hands them a check every move — their {checkers} have them now." | cover ≥2; attacker no queen | H; C forkingCheck |
| KO2 | EVAL | S attacker | their king in open | — | "When their king is out in the open, material stops counting: checks and threats decide." / "Don't trade queens when their king is exposed — the queen is the piece that hunts it." | "Your {checkers} have {n} checks between them." | — | "With their king exposed, look at every check first." | after their mistake: "Their king on {king} is out in the open now." | — | H, B2 checks |
| KO3 | PLAN (defender) | S defender | shelterHome exists | home square | "An exposed king goes home first: walk it back behind its pawns before you do anything else." | — | "{best} started the walk to {home}." (once past) | KO1 | — | no home in 2 moves | C shelterHome |
| KO4 | STRAT (queens) | S defender | attacker has queen; errorWhy's better move is a queen trade (`bestSan` captures/offers the queen — chess.js on fenBefore) | — | "When your king is exposed, trading queens takes away their best attacker." | — | "{best} offered the queen trade." (once past) | "When your king is exposed, look for the queen trade first." | "Your king was exposed — trading queens takes away their best attacker." | trade loses material; better move is not the queen trade | C (chess.js: queen-trade move exists) |
| KO5 | CONSEQ (counterfactual: pawn grab) | S defender | the move that exposed it was a capture by the king's own pawn/king walk | — | "Grabbing a pawn with your king's pawns opens the doors: the pawn was worth less than the shelter." | — | — | KO1 | "A pawn taken with your king's cover costs more than it wins." (no move named) | not a capture | C howExposed |
| KO6 | combo + errorWhy | S defender | costReason allowed with a check in the blow line | — | "Checks on an open king come with threats: here the check on {sq} wins {target}." | "That's the {target} gone." | — | KO1 | "That left your king open to {first check}." (their move named) | — | H costReason |
| KO7 | exception | — | no queen for attacker | — | silent by gate (:50): "with queens off an open king is often an active king" — endgame cards own it | — | — | — | — | — | — |
| — | phase endgame | — | — | n/a — gated by the attacker's queen; kingActivityGap teaches the flip | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Your king is in the open — count their checks." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `weakened-king-safety` (`positionalReason.ts:157-165`, the shelter gap) → KO1/KO5; `costReason` allowed with checks in the blow → KO6.
- Opponent: their king exposed by their move → KO2 (student's chance).
- Student missed: `costReason` missed with checks on their open king → KO2 + "look at every check first".

## F. Build changes
1. `kingInOpen.ts:22` — add `checks: number`, `checkMoves: string[]` (SAN, :35-37), `lostRights: boolean` (:59) to the returned shape.
2. New pure `forkingCheck` (in `kingInOpen.ts`): the check move landing on a square that also attacks an undefended/higher-value piece. Enables KO1/KO6 consequence.
3. New pure `shelterHome(fen, side)` (king BFS ≤2 moves to a square where `kingCover.present ≥ 2`). Enables KO3.
4. Registry `boardComputers.ts:7427` reads a standing board; for the mistake turn compare fenBefore/fenAfter (`howExposed`) so the recipe ties to the move that exposed the king.
6. KO4 names the queen trade only as the better move once past (`pastBetterNameable`, `inaccuracyCall.ts:1610`, CLAUDE.md carve-out 3); its condition is errorWhy's own better move, never a separate search.
5. Text at :76-78 is replaced by recipes in `mistakeLesson.ts` for Learn; keep for chat.

## G. Proof boards
- KO1: `vc-1rcEbI44WqE-38` `1nkr3r/Qpp1bppp/4p3/1PP1P3/3P4/3bBN1P/P1q1BKP1/R6R w` — "Your king on f2 is out in the open… bishop on e7 and queen on c2 can both give check".
- KO2: `vc--Y5bZoD6TM0-56` `3r3r/p7/5Q2/2kB4/2p3p1/2N3P1/PPP5/6K1 w` — "Their king on c5 is out in the open"; Danya: chasing the fastest mate.
- Guard: `vc-1rcEbI44WqE-41` (same king, already said — say-once holds it).

## H. Open questions
- none — KO4's naming question moved to §F6 (answered by carve-out 3).
