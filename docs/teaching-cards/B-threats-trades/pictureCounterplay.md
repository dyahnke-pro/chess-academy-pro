# pictureCounterplay — each side's one resource (break or piece threat)

## A. Identity
- File: `src/services/pictureLedger.ts`: `pictureCounterplay(facts, fen, lines, side)` (1021–1023) → `counterplayOf` / `counterplaysOf` (925–978), `breaksOf`, `breakOpen` (899–918), `pieceCounterplay` (841–894), renderer `counterplayText` (1108–1140) → `teachingSentence.renderCounterplay` (753–772). Record half: `pictureAnswers` (1238–1265) files `allowed-counterplay`; `counterplayStillOn` (1213–1221).
- Registry: `boardComputers.ts` `pictureCounterplay` (8036–8070), kind `opponent-intent`, seat `opponent`, skill `allowed-counterplay` when the resource dies on ply 0 with the student to move (8047).
- Reach: lesson, review, learn (via the thought), chat, tactics, weaknesses (moveInsight). Census: 1,238 lines (lesson 1,067 / review 171), 665 said; held 469 `already-said`, 104 `same-idea` — the repetition class: "Their one resource is the pawn break …c5" is re-offered every ply it stays alive.

## B. Facts
- **B1** `Counterplay` (688–708): `side`, `kind` break | piece, `piece`, `from`, `to`, `hits[]` + `hitPieces[]` ('k' = mate threat), `state` alive | dead | unsettled, `ply` (the best-line ply it is played on / stopped on), `stoppedBy` (UCI), `factIds` (the board facts that name it).
- **B2 dropped:** `counterplaysOf` (931) builds EVERY resource and `counterplayOf` keeps only `[0]` (926, called from `pictureConclusions` 1038) — the second resource and the ranking (`rank`, 976) are lost; `breakOpen`'s count (918: `attackCount(g2, to, them) <= attackCount(g2, to, side)` — attackers vs defenders on the break square) is a boolean, the two numbers are dropped; the stopper's MECHANISM (why the stopping move kills it: guards the square, takes the pawn, blocks) — only its SAN survives (`stoppedBy`); for a piece resource, the `pieceThreat` targets are kept but not what the threat wins.
- **B3 cheap:** the break's exchange — play `from→to`, then the capture on `hits[0]`: which file opens, whether a pawn is left isolated (pilot card L CONSEQ rows); the defence count on the hit pawn (attackers vs defenders, chess.js); diff between the board before and after the student's move (`counterplayStillOn` already: alive now but dead before = the student's move ALLOWED it; dead before at ply 0 and still on = the student missed the stop — exactly what `pictureAnswers` files).
- **B4 gates:** said only alive or dead, never unsettled (1109); a break must still be a lever and not just drop the pawn (`breakOpen` 899–918); a piece resource must be played in the best line or named by a fact (`played || factIds`, 867); stopper named only as the move of the side it is stopped FOR (1127–1132). Record: `allowed-counterplay` broken only when `cpLoss >= PICTURE_MISSED_CP` (50, pictureLedger 1174).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | kind, from/to, hits | the rule about breaks ("a break is aimed at a pawn…") is not said; the board is |
| CONSEQUENCE | partly | state (alive: "it is coming") | what the break does when played (file / isolani / pawn won — B3) |
| BETTER MOVE + JOB | partly | `stoppedBy` (the stopper's SAN) | its job (guards / takes first / covers the push square) |
| HABIT | no | — | — |

## D. Lesson recipes
Causes: **CP-ALLOW** (S): before the student's move their resource was dead at ply 0 (the best move stopped it); the student's move left it on (`counterplayStillOn`) and cost ≥ mistake — the recorded `allowed-counterplay` broken. **CP-OPEN** (S): the student's move turned a dead/absent resource alive (diff of `pictureCounterplay` before and after). **CP-O** (O): their resource was alive and they did not play it (Review).

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CP1 | prevent (guard) | S | CP-ALLOW, kind break, stopper guards `hits[0]` | break, target pawn | "Against a pawn break, the simplest defence is to guard the target as many times as it's attacked: their {brk} hits your pawn on {hit}." / "Their {brk} is aimed at your pawn on {hit}; one more guard there and the break does nothing." | "Now it comes with {consequence: opens the {file} / leaves your {pawn} alone / wins it}." | "{stopper} — it guards {hit}." | "Every move, ask which pawn break they want and whether it's ready." | full | stopper's job ≠ guard (use CP2/CP3) | H + C: count on hit, stopper job |
| CP2 | prevent (take first) | S | CP-ALLOW, stopper captures on the break square | — | "You can meet a break by taking first: then you decide how the pawns change, not them." | same | "{stopper} took first." | same | full | — | C: stopper is a capture |
| CP3 | prevent (stop the push) | S | CP-ALLOW, stopper covers `to` | push square | "The best time to stop a break is before it's played: cover the square it needs, {to}." | same | "{stopper} covered {to}." | same | full | `to` is not covered after the stopper | C |
| CP4 | consequence (file) | S | CP-OPEN/ALLOW, B3 shows a file opens | file | "A pawn exchange opens a file, and the side whose rook gets there first owns it — their {brk} opens the {file}-file." | "Their rook is first." | — | — | full | no rook can reach (C) | C |
| CP5 | consequence (lone pawn) | S | B3 leaves a pawn with no neighbours | pawn | "When a pawn trade leaves a pawn with no neighbours, only pieces can guard it from then on." | — | — | — | full | — | C |
| CP6 | prevent (piece resource) | S | CP-ALLOW, kind piece | piece, to, hits | "Their {piece} wants {to}, hitting your {hits}. Take that square away before it gets there." / "A piece's best square is a target: cover {to} and their {piece} has nowhere to land." | "From {to} it hits {hits}." | "{stopper} covered {to}." | "Ask where their pieces want to go, not just where they are." | full | hits include 'k' → mate threat (detectNewThreat NT2 owns it) | H |
| CP7 | strategize (when to stop) | S | CP-ALLOW while the student had a plan of their own (pictureTarget fired for the student) | — | "Before you press your own plan, take away their one source of play." | "A won position is lost by ignoring the counterattack." | — | — | full | student's plan works faster (planRace says so) | H + planRace |
| CP8 | opponent seat | O | CP-O, their move ≠ the break and cost ≥ mistake for them | — | "When you have one source of play, use it before they close it: their {brk} was their chance." | — | — | — | Review only | — | H |
| CP9 | knowledge (chain base) | S | break hits the base of a chain | — | "Attack a pawn chain at its base; the base holds up the whole chain." (their break at your base) | | | | full | not a chain base (`chainBase`) | C |
| CP12 | strategize (the second resource) | S | CP-ALLOW where the student's move stopped `counterplaysOf[0]` but left `counterplaysOf[1]` alive (diff of the full list, F3) | second resource | "Stopping one source of play is not enough when they have two: with {brk1} gone, their {res2} is still on." | same as CP1/CP6 for the second | "{stopper} stopped both." (only when the best move kills both on ply 0) | "When you shut one door, check for the next one." | full | the second resource is `unsettled` | C: F3 full list, before/after |
| CP10 | record | S | `allowed-counterplay` hold state | — | RED/GREY full · AMBER "Their {brk} was ready — guard {hit}." · GREEN silent | | | | | | H (skill row exists) |
| CP11 | combination (+ king centre) | S | the break opens toward the student's uncastled king | — | "Don't let them open the centre while your king is still in it." | | | | | king castled | C + readPosition K |

Not applicable as a mistake lesson: the standing ALIVE read with no mistake (said today every ply — Review/chat only, never Learn); counterfactual earlier board beyond the one-move diff.

## E. Mistake link
- Student: `positionalReason` has no counterplay tag; the cause is the picture's own `allowed-counterplay` (pictureAnswers 1263) → needs a `MistakeCause` member (F1). When the break wins material, `costReason` **allowed** with the break as first blow (motif null) — CP1–CP5 explain WHY that pawn fell.
- Opponent: CP8 (Review only).

## F. Build changes
1. `MistakeCause`: add `allowed-counterplay` sourced from `pictureAnswers` (pictureLedger 1263) when the student cost ≥ the Learn floor; carries `Counterplay` + the stopper.
2. `Counterplay` (688): add `stopperJob: 'guards' | 'takes-first' | 'covers-push' | 'blocks' | 'other' | null` (compute in the walk at 970 / 889 by comparing `hits`/`to` against the stopping move), `count: { attackers, defenders }` on the break square (the numbers `breakOpen` 918 throws away), `opens: { file: string | null; isolates: string | null }` (play the break + capture on a copy of the grid).
3. `counterplaysOf` (926): export the full list to the recipe (the second resource is the lesson when the first is stopped).
4. Delete the alive-every-ply read from Learn (the 469 `already-said` holds are the symptom; under the mistakes-only rule the standing read never speaks in Learn).

## G. Proof boards
- Alive break: vc-_j8aiuqS4_0-6 `r1bqkb1r/pppnpppp/5n2/1B1P4/8/8/PPPP1PPP/RNBQK1NR w KQkq - 3 4` — "Their one resource is the pawn break …c6, hitting your pawn on d5. It is coming."
- Dead with stopper: vc-_WmByfLW-3g-16 `rn1q1rk1/pp1bppbp/5np1/3P4/2BP4/2N2N2/PP3PPP/R1BQK2R w KQ - 5 9` — "Their resource is the queen: from c7 it hits your bishop on c4. But your Qb3 stops it." (CP6's BETTER MOVE row: the stopper is the student's — Learn would hold it before the move).
- Piece resource: vc-_4xbS0Crtic-32 `r1b1r1k1/pp3p2/2pp1q1p/6p1/3b4/5BB1/P1P2PPP/1R1Q1RK1 w - - 0 17` — rook from e1 hits Re8.
- Guard (repetition): lines-0.jsonl:626, 659, 728 — the same alive break held `already-said`.

## H. Open questions
- CP-ALLOW at cost 50–99 is filed by the record today (PICTURE_MISSED_CP = 50). Does Learn speak it at 50, or only at the mistake floor?
