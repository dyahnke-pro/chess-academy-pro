# opponentHabits — what they keep doing (their seat of habitsOf)

## A. Identity
- File: `src/services/thinkAloud.ts` `opponentHabits(sans, opp, sound)` (197–199) = `habitsOf(sans, opp, 'their', sound)`. Registry `theirHabit` (`boardComputers.ts` 5927–5951) adds THE TEMPO COMPUTER `tempoCount(history, student)` (tempoCount.ts 81ff) spliced before the "still at home" habit (5932–5935).
- Reach: learn door, review, lesson, chat, tapped, tactics. Census: 621 lines (51 said): lesson 609 (41 said; 567 held `already-said`) — the largest repetition in the family. Said: "That's two times now they've left a piece loose under your attack — they don't check what their move leaves behind. After every move of theirs, look first for what they left loose."

## B. Facts
- Same as `habitsOf` B1–B4 for the opponent's side (including the defeated `sound` gate: Learn passes `NO_SOUND_PLIES`, so their sound sacrifice counts as a loose piece — habitsOf F3), plus `tempoCount`'s "their bishop's third move already, and you have two minor pieces out to their one" (opening only, `TEMPO_OPENING_PLIES`).
- **B2 dropped:** as habitsOf — which of their moves left pieces loose (the student's missed chances), only the count.
- **B3 cheap:** for each `looseAt` instance, whether the STUDENT took it (the next ply captured that square) — the dual-use half: their habit is the student's repeated chance.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | the text ends on a habit ("After every move of theirs, look first for what they left loose") | — |
| CONSEQUENCE | partly | — | which of those chances the student took / missed |
| BETTER MOVE + JOB | n/a | — | — |
| HABIT | yes | — | — |

## D. Lesson recipes
Cause **OH-MISS** (S): their move left a piece loose (an instance), the student did not take it and cost ≥ floor — the student's mistake; the habit names the pattern in the opponent.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OH1 | habit (their loose pieces) | S (their pattern, your miss) | OH-MISS | piece, square | "They keep leaving pieces loose — their {piece} on {sq} was free again." / "Against an opponent who doesn't check what they leave behind, look for the loose piece first, every move." | "That's the piece you didn't take." | "{best} took it." | "After every move of theirs, look first for what they left loose." | full | the capture walks into a counter-tactic (SEE / counter-tactic check) | C (B3) |
| OH2 | strategize (punish the king pawns) | S | kind king-pawns, the student's move ignored the holes and cost ≥ floor | hole | "Every pawn they push in front of their king leaves a hole: aim at {hole}." | | "{best} aimed at it." | | full | queens off | C |
| OH3 | strategize (punish slow development) | S | kind undeveloped/tempo, the student's move was slow and cost ≥ floor | — | "When they leave pieces at home, punish it fast: open lines before they develop." | | "{best} opened the position." | | full | — | H |
| OH4 | record | S | `holdState` on `missed-loose-piece` | — | RED/GREY full · AMBER "Their piece was loose again." · GREEN silent | | | | | | H |

Not applicable: calculate / phase beyond the counters' own gates.

## E. Mistake link
- Student: `costReason` **missed** motif `hanging_piece` (OH1) — the habit gives the PATTERN behind repeated misses; OH2/OH3 = `positionalReason` no-plan when the engine's best attacked the weakness.
- Opponent: their own mistakes are the instances; never said as "their mistake" alone (that is MD6's turn).

## F. Build changes
1. As `habitsOf` F1 (instances, not counts), F3 (real sound plies) and F2 (speak on an instance that the student missed, not every ply — the 567 holds).
2. Add `tookBy: {ply, took: boolean}[]` per instance (B3) → OH1.
3. `tempoCount` stays a separate computer; the splice at 5932–5935 keeps one "their habit" turn.

## G. Proof boards
- Census: lines-0.jsonl:1022 (said), lines-0.jsonl:8632 (held, three times), lines-0.jsonl:1563 (tempoCount said).
- Run: opponent-seat loose instances from `computeMustDefend/leftHanging` (opponent): g chesscom-1012441262 ply 44 …Nxe4 (their knight on e4 loose, cost 255) and ply 46 …Rxf2 (cost 147) — two instances in one game; OH1 fires on the student's following move if it did not take.

## H. Open questions
- Same as `habitsOf` H (the count words). 
