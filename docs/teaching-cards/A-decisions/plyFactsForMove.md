# plyFactsForMove — what the move did (captures, check, tactic landed, file opened)

## A. Identity
- `src/services/pvPlayback.ts:929` `plyFactsForMove(fenBefore, san, prev, moverIsStudent)` → `computePlyFacts` → `plyFactsSentence` :947. Registry `plyFacts` `boardComputers.ts:2075-2085`, kind `move`, claim `move:<san>`, Review facet. Census 198 fired / 0 said (all held `unsupported`).

## B. Facts
- B1: one sentence ("You take their rook and win material." / "You take their bishop and unleash a discovered attack.").
- B2 dropped: the `PlyFacts` object — `captured`, `materialGained`, `gaveBack`, `isCheck`, `isMate`, `promotion`, `tacticLanded` (TacticType), `outpostGained`, `newPassedPawns`, `passedPawnsHanded`, `newOpenFiles`, `shieldLost`.
- B3 cheap: n/a — the facts are complete; they are DESCRIPTIONS of the move, which the new Learn never restates.
- B4: silent on a bare capture with nothing gained (`factsOnlyRestate`); a lone check speaks only with its answers (`checkAnswers`).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | | restates the move |
| CONSEQUENCE | partly | `passedPawnsHanded`, `shieldLost`, `newOpenFiles` (as typed facts) | typed exposure |
| BETTER MOVE + JOB | no | | |
| HABIT | no | | |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PF1 | consequence (handed a passer) | both | mistake; `passedPawnsHanded` non-empty | sq | "Pawn trades decide who gets the passed pawn." | "It hands them a passed pawn on {sq}." | | | CONSEQUENCE | | H (typed) |
| PF2 | consequence (shield) | both | mistake; `shieldLost` > 0 | n | "The pawns in front of your king are its walls." | "{n} pawn(s) gone from your king's cover." | | | | | H |
| PF3 | consequence (file opened) | both | mistake; newOpenFiles toward the mover's king | file | | "It opens the {f}-file toward your king." | | | | the file reaches the king | C |
| PF4 | restatement | — | captures / check / tactic landed on the student's own move | | n/a — Learn never says what the student just played | | | | silent | | — |

## E. Mistake link
- positionalReason `file-opened`, `pawn-weakened` (shield), passer handed (no cause today → `passer-handed`).

## F. Build changes
1. Export `plyFacts(fenBefore, san, prev): PlyFacts` typed (the object is already computed at :937); the sentence stays Review's.
2. PF1–PF3 are CONSEQUENCE rows keyed on their typed facts; PF4 deleted from spoken Learn.

## G. Proof boards
- Pure run: 220 boards, 35 on mistake plies: g:1012441262#9 S `Bxf7+` → "You take their pawn and give check." (PF4, silent — the cause is countMethod/blunderCheck); g:1012441262#35 S `Bxf8` → "You take their rook and win material." (PF4 silent; the mistake is the in-between move, inBetweenMove IB1).

## H. Open questions
- None.
