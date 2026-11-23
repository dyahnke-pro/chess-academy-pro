# readConversion — how to win a won game, the step the board is on

## A. Identity
- File: `src/services/conversionMethod.ts` (167 lines): `readConversion(fen, student)` (46–157), `kingOpen` (161–167), `CONVERSION_EDGE = 3` (44). Steps: finish-development, attack-king, trade-pieces, make-passer, escort-passer, cut-off-king (32).
- Registry: `boardComputers.ts` `conversion` (2921–2933), kind `convert`, seat `student`, claim `convert:<step>`, skill `botched-conversion`. The DIAGNOSIS half is `conversionDetector` (`botched-conversion` tag, `capabilityEvidence` 494).
- Reach: learn door, review, lesson, chat, tapped, tactics. Census: 114 lines (84 said): chat 92, learn 12, review 10; held 18 `beside-mate`, 12 `in-flux`. Run: 152 fires (81 student-side boards, 71 when it was their move); 9 student moves costing ≥ 100 while ahead.

## B. Facts
- **B1** `ConversionRead` (34–41): `step`, `edge` (settled, pawns), `passer` (square | null), `text`.
- **B2 dropped:** `hangs` / `owed` (60–92) — what is about to be lost and so not counted; `theirPieces`, `theirPawns` (101–102); the attack counts in the attack-king step are in words only (`k.attackers.size`, `k.defenders.size`, 117); `outsidePasserDecoy` result beyond the text.
- **B3 cheap:** whether the student's move FOLLOWED the step (on the board before the move): finish-development → did the move develop a home minor / castle; trade-pieces → did it trade a piece (equal capture) or a PAWN (a pawn trade breaks the rule); make-passer → did it push toward a passer (a candidate pawn on a majority); escort-passer → did it push / support the passer; cut-off-king → did it take a file/rank from the lone king. One chess.js check per step on the move played.
- **B4 gates:** null when not ahead by ≥ 3 settled pawns (94; with the hanging/rescue accounting 60–93); null when the student is in check (68); step order (106–156).
- **Wording rule broken (V3, no statistic spoken):** `boardEdgeWords` (utils/countWords.ts 30) falls back to a POINT count whenever the material does not decompose ("You're up 5 points", census lines-0.jsonl:4590; "You're up 3 points" in the run on a board mid-trade, g-1012441262 ply 35).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | each step's text is Naroditsky's method ("trade pieces, not pawns") | — |
| CONSEQUENCE | partly | "the only way to lose is to get careless" | what the mistake gave back |
| BETTER MOVE + JOB | no | — | the move that did the step |
| HABIT | partly | the step rule | — |

## D. Lesson recipes
Cause **CV-BREAK** (S): the student was ahead (`readConversion` fires on the board before the move), the move cost ≥ floor, and it broke the step (B3). The step decides the lesson.

| id | step / angle | seat | condition | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|
| CV1 | finish-development (strategize) | S | CV-BREAK, the move did not develop / castle | "Up material, finish developing and get your king safe before anything else — the only way to lose is to get careless." | "{what the cost gave back}." | "{best} — {job: develops the {piece} / castles}." | "Ahead: develop, castle, then trade." | full | the move developed and still cost (then the cause is tactical — costReason) | C (B3) |
| CV2 | trade-pieces (knowledge) | S | CV-BREAK, the move traded a pawn or avoided a piece trade | "Ahead, trade pieces, not pawns: every piece that comes off makes your extra material count for more." | | "{best} traded a piece." | "Trade pieces when ahead; keep your pawns." | full | — | C |
| CV3 | attack-king (strategize) | S | CV-BREAK, the move traded while their king was open | "Ahead with their king short of defenders, don't cash in with trades — the attack is the fastest win." | | "{best} kept the attack." | | full | — | C |
| CV4 | make-passer (plan) | S | CV-BREAK, few pieces left, the move did not work toward a passer | "With few pieces left, the extra material wins by making a new queen: make a passed pawn." | | "{best} started the passer." | "In the ending, ask: where is my passed pawn coming from?" | full | — | C |
| CV5 | escort-passer (technique) | S | CV-BREAK, the passer lost support / was pushed onto an unsafe square | "Your passed pawn on {passer} is the win — escort it with the king, one safe square at a time." | | "{best}." | | full | the decoy case (outsidePasserDecoy) | C |
| CV6 | cut-off-king (technique) | S | CV-BREAK, the lone king escaped the edge | "Cut the lone king off: put your {piece} on a file it can't cross, then drive it to the edge." | | "{best} cut it off." | | full | — | C |
| CV7 | opponent seat | O | their conversion broken (they were ahead) | Review only | | | | | | |
| CV8 | record | S | `botched-conversion` | RED/GREY full · AMBER the step rule only · GREEN silent | | | | | | H |

Not applicable: calculate (a method, not a line); "their plan" (the step is the student's when ahead).

## E. Mistake link
- Student: `botched-conversion` (the record's tag) + whatever `errorWhy` names; CV1–CV6 add WHICH step of the method was broken. A tactical blunder while ahead is `costReason`'s; the conversion step is said only when the move broke the step (B3) — otherwise one cause, not two.
- Opponent: CV7.

## F. Build changes
1. `ConversionRead`: add `followed: (fenBefore, san) => boolean` per step (B3) — or a separate pure `conversionStepKept(fenBefore, san, read)`; the cause CV-BREAK requires `!kept`.
2. Wording: never fall back to "N points" — `boardEdgeWords` returns a material mix in words or "a clear material lead" (G board: lines-0.jsonl:4590 "You're up 5 points").
3. The standing read stops speaking in Learn every ply (`convert:<step>` once is the current say-once); under mistakes-only it speaks only on CV-BREAK.

## G. Proof boards (run)
- CV1 (ahead, a costly move): g chesscom-1012441262 ply 35 Bxf8 (student, cost 268) — the board read says "finish developing"; also a mid-trade "up 3 points" board (the F2 wording guard).
- CV5: g chesscom-1013773584 ply 77 c3 / ply 79 Rg7+ (student, decided game, escort-passer on h6) — guard: the cost there is noise in a decided position (engine ±9000); the recipe needs the contested gate (cost measured only while the game is not decided).
- Census: lines-0.jsonl:4388 (trade-pieces said in Learn), lines-0.jsonl:4473 (attack-king held beside a mate).

## H. Open questions
- Should Learn say a conversion lesson in a DECIDED position (student +9 and the move "cost" 300 but still wins easily)? The importance model's contested gate says no; confirm for mistakes-only.
