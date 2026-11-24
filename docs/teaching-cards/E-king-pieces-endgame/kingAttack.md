# Card — `kingAttack` (a move that brings the attack to their king)

## A. Identity
- `src/services/kingAttack.ts:95` `kingAttack(fenBefore, san, namesStudentMoves, namesPlayedMove, linesAfter)`; counter `countKingAttack` / `shelterSquares` (`kingSafety.ts`). Registry `boardComputers.ts:4993`, kind `rule`, BUNDLE surfaces; **fires only when `cpLoss < 100`** (:4998) — a good or near-good move.
- Census: 19 fired / 12 said (kinds `rule` 12, `two-jobs` 7).

## B. Facts
- **B1** `KingAttackPoint` (:30): `kind` (`strips-shelter` / `removes-defender` / `adds-attacker` / `heads-for-king` / `opens-lines` / `opens-file`), `text`, `squares`, `attackers` (count after), `defenders` (count after), `next?` (the hop).
- **B2 dropped**: `b` (counts BEFORE the move, :121) — the delta (attackers +1, defenders −1) is the move's point and is only used in gates; `could` (:177, the piece could not reach before); `hops` from the engine lines (:175).
- **B3 cheap**: `delta = {attackers: a−b, defenders: a−b}`; the mirror on THEIR move (same function, mover = them) — the attack the student must answer next; the seat: text hardwires "your"/"their" (:146-187), so calling it on the opponent's move needs a `who` parameter.
- **B4 gates**: not mate (:118); mover has a queen or ≥2 attackers (:125); strips-shelter: pawn capture on a shelter square (:143); removes-defender: non-pawn capture within 2 of the king, a defender before, fewer after, not recaptured, ≥2 attackers (:152-153); pawn moves: opens-file / opens-lines (+2 attackers) (:156-165); quiet piece: adds-attacker (≥2 after) or heads-for-king (engine line plays the hop, :172-190). Tally only when attackers > defenders (:137).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "brings your knight into the attack… two of your pieces against only one defender" | it praises a good move; mistake-only Learn never hears it |
| CONSEQUENCE | partly | the tally | for THEIR move: what the new attacker threatens next |
| BETTER MOVE + JOB | no | — | the defence the student's next move needed (errorWhy better move) |
| HABIT | no | — | record `missed-opponents-threat` / `weakened-king-safety` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KT1 | PREV (their attack ignored) | S defender | THEIR previous move was a kingAttack point (mirror), the student's reply cost (costReason allowed on the king) | kind, piece | "When they bring a piece to your king, your next move answers it: count their attackers against your defenders before anything else." / "Every piece that joins an attack on your king asks for a defender in return." | "{attackers} against {defenders} now, and the next one breaks through." | "{best} brought a defender to {sq}." (once past) | "After every move of theirs near your king, ask: what did that piece add?" | "A piece that joins the attack on your king asks for an answer — their {piece} got none." | their move had no kingAttack point | C mirror call |
| KT2 | CONSEQ (shelter stripped) | S defender | their move `strips-shelter` or `removes-defender` and the student recaptured elsewhere / ignored | — | "A capture in front of your king is never just a pawn: it is the door." | — | — | KT1 | — | — | C |
| KT3 | STRAT (attacker, missed) | S attacker | costReason missed where best move is a kingAttack point (`adds-attacker` / `opens-file`) | — | "In an attack, bring one more piece before you strike: the attack works when attackers outnumber defenders." | — | "{best} brought the {piece} in." | "When you attack the king, ask which piece isn't in it yet." | "Your attack needed one more piece." | — | C call kingAttack on bestSan |
| KT4 | praise (today) | S | good move | — | Review only (earned praise). Learn silent under the mistake-only gate | | | | | | |
| KT5 | exception | — | the capture is a recapture / trade (gate :152-153) | — | silent | | | | | | |
| — | phase endgame | — | gated by queen/2 attackers; endgame attack is the king-race cards | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Their piece joined the attack on your king." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student defender: `costReason` allowed (mate / material at the king) right after their kingAttack move → KT1/KT2; `whyItFailed` `abandoned-defender` (king ring).
- Student attacker: `costReason` missed with the attacking best move → KT3.

## F. Build changes
1. `kingAttack.ts:95` — add a REQUIRED `who: 'student' | 'opponent'` seat parameter; the texts (:146-187) name "your/their" from it (today hardwired to the mover = student).
2. Return `before: {attackers, defenders}` (from `b`, :121) so the delta is a typed field.
3. `boardComputers.ts:4998` — keep the cpLoss gate for the praise read; add a mistake-turn read: on the student's costly move, call kingAttack on the OPPONENT's previous move (KT1) and on the student's `bestSan` (KT3).
4. Recipes KT1–KT3 → `mistakeLesson.ts`.
5. KT4 (the praise read, cpLoss < 100) leaves the Learn turn with the mistake-only gate; Review keeps it. No code in this computer changes for that — the gate is the voice door's.

## G. Proof boards
- Praise shape: `lines-0.jsonl#97` ("Nh5 brings your knight into the attack"), `lines-2.jsonl#384` ("…Rg8… two of your pieces against only one defender").
- Guard (`beside-mate`): `lines-1.jsonl#2894`.
- KT1: owed — a board where their attacker joined and the student's reply cost; to be found in `g-*.jsonl` once the mirror call exists.

## H. Open questions
- none — the KT4 praise question is already decided by the WO (Learn speaks only on a mistake, `docs/plans/2026-11-23-learn-mistakes-only.md`); moved to §F5.
