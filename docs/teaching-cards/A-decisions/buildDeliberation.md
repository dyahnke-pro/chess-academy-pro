# buildDeliberation — the moves you'd weigh, and why each falls short

## A. Identity
- `src/services/deliberation.ts:236` `buildDeliberation({analysis, fenBefore, moverColor, maxCandidates, excludeSan, prevCapture, priorMove, named})`; renderers `deliberationFacts` :429, `ruleOuts` :628, `shortfallText` :374, `bestMoveReason` :651, `moveWhy` :747.
- Registry `deliberation` `boardComputers.ts:3208-3259`, kind `deliberation` (+ `line` placement for the best line), two reads: on the move (`words`: rule-outs of the OTHER top moves, `excludeSan = played`) and live (`isRealChoice`, heldForm). Also `positionFacts.ts`, `boardTurnAnswer.ts` (chat). Census 322/266 (lesson, chat, learn).

## B. Facts
- B1: `Deliberation { best: Candidate, alternatives: Candidate[], isRealChoice, bestWhy, bestLine, bestLineSans, bestLineProof, bestLineAfter, bestReply, named?, namedWhy? }`; `Candidate { san, evalCp, deltaCp, shortfall: drops-material|clearly-worse|less-precise|trades-queens, drops?, leaves?, proof?, proofSans?, refutation?, tradeSans? }` (:97-160).
- B2 dropped: `leaves` is computed only for the `named` move (:313-318), never for alternatives or the played move; `loose` drops the engine does not punish are discarded (:291); `moreSpace`/`attacking` flags (:297) that justify the queen-trade shortfall are not returned.
- B3 cheap: the PLAYED move as a candidate — call with `named` = the played move's line (the after-read's PV prefixed by the played uci), so a mistake gets the same drop / proof / leaves computers as a candidate (`named` path :296-326 already does all of it); `leaves` for every alternative (one `computeMustDefend` each).
- B4: `DEFAULT_MAX = 3` (:84) → lines 2–3 only are weighed; drop counts only when the gap ≥ 150 (`CLEARLY_WORSE_CP` :87); queen-trade shortfall needs gap ≥ 40 (:93) and space/attack; best line played out only at ≥ 3 plies (:331).

## C. Sentence readiness (for the move played being a mistake)
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `shortfall` + `proof` of a candidate ("Bxh7+? Then they play Nxh7, and the bishop is lost.") | the played move is EXCLUDED on the move read (`excludeSan`, registry :3219); measured: on 125 mistake boards the played move was a weighed alternative 29 times, with a proof 2 times |
| CONSEQUENCE | yes when proof/drops | `proof`, `drops.line` | |
| BETTER MOVE + JOB | yes | `best.san` + `bestWhy` (filled on 112 of 125 mistake boards) | — |
| HABIT | no | — | candidates habit from methodBeat (`CANDIDATES_HABIT`) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DL1 | consequence (drops) | both | played move as `named` → shortfall drops-material | piece, line | "Every move changes what is guarded. After this one your {piece} on {sq} had no answer to {line}." / "A piece left without a guard is the first thing they look for: your {piece} on {sq} falls to {line}." | "the {piece} is lost" | "{best} — it {bestWhy}." | "Before you play it, ask what each of their captures does." | after move; never names played move ("this move") | drop counted only when the eval agrees (:282) | C (named = played) |
| DL2 | calculate (proof line) | both | named → `proof` | proof | "Look one reply further: the move fails to {reply}, and {result}." | proof result | best + bestWhy | CANDIDATES_HABIT | after | proof measured against best's own line (`refutationProof`) | C |
| DL3 | strategize (queen trade) | S | named shortfall trades-queens | — | "With more space or an attack going, keep the queens on: every trade shrinks your edge." | "The queens come off and the edge goes with them." | best | "When you're attacking, don't trade the attackers." | after | moreSpace/attacking true | C |
| DL4 | evaluate (clearly-worse, no reason) | both | shortfall clearly-worse, no proof, no drops | — | silent — "clearly worse" with no reason is a verdict, not a lesson; the error computer's cause speaks instead | | best + bestWhy (still valid as B slot) | | | never say "X is clearly worse" alone | H |
| DL5 | candidates | S | `isRealChoice` true on the board before AND played ≠ best AND cost ≥ mistake | — | "When there are several reasonable moves, name them all first and compare." | | best | CANDIDATES_HABIT | after | isRealChoice | H |
| DL6 | their seat | O | their move = named alternative with a proof | | "Their move fails to a reply: {reply}, and {result}." | | the reply is the student's → held in Learn | — | Learn: lesson words only, no move | | C |
| DL7 | best line | both | best = played, bestLine wins material | | Review/lesson only (good move) | | | | silent in Learn | | H |
| DL8 | record | S | | | RED/GREY full · AMBER one clause · GREEN silent | | | | | | H |
| — | endgame / phase | — | no phase fact; same rules in all phases | | | | | | | | |
| — | their plan | — | n/a (no plan fact) | | | | | | | | |

## E. Mistake link
- errorWhy: DL1 → `left-hanging` (E6); DL2 → `allowed-tactic`/`allowed-capture` (E10/E11) with the named line; DL3 → `positional`; DL5 frames any cause; DL7 Review only.
- DL1 = `whyItFailed: lost-the-piece` / costReason `allowed` blowPlies short; DL2 = costReason `allowed` with a named line; DL3 = principle `wrong-trade-for-material` (situation ahead/attacking). The B slot (`bestWhy`) serves EVERY cause — it is the family's best supplier of "better move + its job".

## F. Build changes
1. Mistake turn: call `buildDeliberation` with `named = { lineUci: [playedUci, ...afterRead.pv], evaluation, mate }` instead of `excludeSan` (registry `boardComputers.ts:3219`), so the played move gets drops / proof / leaves (DL1/DL2).
2. Return `leaves` for every alternative (B2, `deliberation.ts:276-301`) and the `moreSpace`/`attacking` flags (DL3).
3. Expose `bestWhy` as the typed `BetterMoveJob` the recipe table's B slot reads (one source for "better move + job" across causes).
4. Delete the "less-precise" filler path for spoken text (the less-precise branch of `shortfallText` :374) on mistake turns — DL4 silent.
5. `DEFAULT_MAX = 3` → the fan the surface has (5 on David's reads) when the played move is outside lines 2–3 — measured: played among weighed lines 29/125.

## G. Proof boards
- g:1002984876#21 S `Nxe2` best `Rxd7+` loss 177 — played is a weighed alternative, `clearly-worse`, no proof → DL4 (silent), B slot `bestWhy`.
- g:1001055178#41 S `Kh1` best `Qh5` loss 113: bestWhy "protects your pawn on c5" → B slot.
- Danya vc-_JQ-AH3OYQ4-22 ("Bxh6? Then they play gxh6, and the bishop is lost.") → DL1 wording on a candidate.
- Guard: DL4 — 16 of the 29 played-as-alternative mistakes are `clearly-worse` with no reason.

## H. Open questions
- None (DL4 silence follows the existing "empty > generic" rule).
