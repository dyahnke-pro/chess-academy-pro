# characterTurn — the position's character changes (sharp / quiet / conversion / defence)

## A. Identity
- File: `src/services/positionCharacter.ts` (309 lines): `characterTurn(state, said, r)` (177–199) → `characterOf` (69–78), `stepCharacter` (149–155), `provenTacticLive` (65–67), `sharpGap` / `bestMoveGap` (42–55), `looseOnBoard` (168–174). Stems: `SWITCH` (91–113), `TACTICAL_WHY` (127–136). Constants `DECISIVE_MATERIAL = 3`, `SHARP_GAP_CP = 150`, `DECIDED_CP = 300` (33–38). Second half `BoardKind` reads (drawing-chances / locked / no-counterplay, 209–).
- Callers: `CoachTeachPage.tsx` 11714 (Learn steps it on its live read) and `coachFeatureService.ts` 2302 (Review). Reach (computer-reach: coachFact 437 lists it): review, learn. Census: 11 review lines (9 said, 2 `beside-mate`) — "You are down material now — the job is to make it hard: keep pieces on…", "The position has turned sharp — there is a tactic on the board, so check every capture and check before anything quiet."

## B. Facts
- **B1** `CharacterStep` (115–119): `next` (state: `current`, `pending`), `switched {to, text} | null`. `Character` = tactical | positional | conversion | defence.
- **B2 dropped:** the inputs that decided the character — `quietBalance` (material, 72), `tacticLive`, `gap` — are not returned; WHY a switch was suppressed (`mateOnBoard`, `quietOnCheck`, `quietButConcrete`, 190–198) — returns `switched: null` with no reason; which move made the change (`lastSan` is an input only).
- **B3 cheap:** on a mistake turn, whether THE MISTAKE caused the switch (the character before the student's move ≠ after, and the cause is material: positional → defence, or tactical with the tactic created by the move) — one extra `characterOf` on the board before the move.
- **B4 gates:** a switch is announced only after holding two reads (`pending`, 152–154); the first read settles silently (150); suppressed beside a forced mate, "quiet" on a check, "quiet" while a tactic / a wide gap / loose material is on the board (190–198); sharp = a proven tactic or a best-move gap ≥ 150 (not when both lines are decided the same way, 44).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | each stem is a plan rule ("Behind on material, trades help them — keep the position complicated") | — |
| CONSEQUENCE | yes | the switch IS a consequence ("You are down material now") | the cause (which move) |
| BETTER MOVE + JOB | n/a | — | — |
| HABIT | partly | "calculate before you move" | — |

## D. Lesson recipes
The switch is the **CONSEQUENCE slot** of a mistake when the mistake caused it (B3). Its own lessons:

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CH1 | consequence (now defend) | S | the student's mistake turned positional/tactical → defence (B3) | — | (the mistake's own lesson first) | "You're down material now, so the plan changes: keep pieces on and make it hard." | — | — | consequence slot, after the cause recipe | the switch is pending (one read only) — then nothing (two-read rule) | C (B3) |
| CH2 | habit (sharp position) | S | the character was TACTICAL on the board before the student's move (proven tactic or gap ≥ 150), and the student's move cost ≥ floor | reason | "In a sharp position one move is far better than the rest: calculate before you move." / "When a tactic is on the board, look at every check and capture before anything quiet." | — | "{best}." | "When the position turns sharp, slow down and calculate." | full | `readCriticalMoment` / `methodBeat` "slow down" fires (one habit table) | H (character before the move) |
| CH3 | strategize (conversion) | S | conversion character, mistake | — | owned by `readConversion` (CV rows) — one recipe | | | | | | |
| CH4 | opponent seat | O | their mistake turned the student's character to conversion | — | "You're up material now — the job changes to trading down and converting." | | | | after the student's reply, as the consequence of THEIR mistake | — | H |
| CH5 | evaluate (board kind) | both | `BoardKind` drawing-chances / locked / no-counterplay | — | Review/chat only (standing reads) | | | | | | H |
| CH6 | record | S | — | — | RED/GREY full · AMBER one clause · GREEN silent | | | | | | `holdState` on `missed-critical` |

Not applicable: calculate a line, structure (the character is a summary of other computers).

## E. Mistake link
- Student: the consequence of any material mistake that flips the game (CH1); a mistake in a sharp position (CH2 — the same signal as `readCriticalMoment` and `methodBeat`'s slow-down, so the habit is one row in the habit table).
- Opponent: CH4.

## F. Build changes
1. `CharacterStep`: add `inputs {balance, tacticLive, gap}` and `suppressed: 'mate' | 'check' | 'concrete' | 'pending' | null` (B2).
2. Add `causedBy(fenBefore, fenAfter): boolean` (B3) so the switch is attached to the mistake that made it, as its CONSEQUENCE, instead of being said as its own turn a ply later (the two-read rule delays it — under mistakes-only it rides the mistake turn, or stays silent).
3. CH2's habit joins the one habit table (`liveMethodBeat` / `methodBeat`), keyed on `sharp-position`.

## G. Proof boards
- Census: lines-0.jsonl:123 (defence switch said), lines-2.jsonl:1702 (sharp, tactic reason), lines-2.jsonl:1817 (positional).
- Run (characterTurn not run — it needs the story state): its CH2 trigger is the gap ≥ 150 on the saved read; e.g. any student mistake board where `before[0].cp − before[1].cp ≥ 150` in `g-*.jsonl` (to be listed by the build's tape step).

## H. Open questions
- none.
