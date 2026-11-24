# Card — `nameEndgamePhase` (the ending's type and its main rule)

## A. Identity
- `src/services/reviewMoveTeaching.ts:975` `nameEndgamePhase(fen)` → phrase | null (queen / clean rook / minor-piece / king-and-pawn ending; mixed majors → null), over `describeStructure(fen).material.endgameType`. Registry `boardComputers.ts:~4759` `endgamePhase` (entry ends `:4766`) (kind `endgame`), text "You've reached {phrase}.", `squares: []`, claim per board. Said once a game by the caller (per the doc comment :1059).
- Census: 60 fired / 8 said. Held: already-said 42, refused 8, same-idea 2.

## B. Facts
- **B1**: the phrase, rule included ("a rook endgame — activity over material, rooks belong behind passed pawns"; "a king-and-pawn endgame — every tempo counts"; "a minor-piece endgame — the better piece and the outside pawn win it"; "a queen endgame — king safety and precision decide it").
- **B2 dropped**: the counts `wq bq wr br wm bm` (:987) and which TYPE (no enum, only prose).
- **B3 cheap**: `type: 'queen' | 'rook' | 'minor' | 'pawn'` enum; per type the RULE's board test (rook: is the student's rook behind a passed pawn — `findPassedPawns` + same file behind; pawn: whose move it is / opposition — kingRace / keySquareRead; minor: an outside passer `findPassedPawns` on the far wing; queen: checks available against the student's king).
- **B4 gates**: `endgameType` non-null; queens both → queen; no queens, rooks, no minors → rook; no majors → minor / K+P; mixed → null.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | the rule is IN the phrase | as a lead for a mistake, with this board's example |
| CONSEQUENCE | no | — | per-type board test (B3) |
| BETTER MOVE + JOB | no | — | errorWhy better move |
| HABIT | no | — | record per type (`passive-rook`, `passive-king-endgame`, `passed-pawn-neglected`) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EP1 | KNOW (rook ending) | S | type rook, student's costly move, `passive-rook` (rook in front of / beside instead of behind a passer) | rook, passer | "In rook endings, activity beats material: rooks belong behind passed pawns, and your rook on {sq} is in front of it." | "From in front, it only blocks." | "{best} put the rook behind the {file}-pawn." (once past) | "In a rook ending, ask where the passed pawns are and get behind them." | "Your rook is in front of the passer — rooks go behind." | rook already behind | C B3 |
| EP2 | KNOW (pawn ending) | S | type pawn, costly move | — | "In a king-and-pawn ending every tempo counts: one wasted move loses the race." | — | "{best} kept the tempo." (once past, only when kingRace/defenderInTime/keySquare give the count; otherwise no better-move clause) | "Count every tempo in a pawn ending." | "In a pawn ending every tempo counts — that move spent one." | — | H (kingRace / defenderInTime give the count) |
| EP3 | KNOW (minor ending) | S | type minor, outside passer neglected (`passed-pawn-neglected`) | — | "In minor-piece endings the outside passed pawn wins: it drags their king away." | — | "{best} pushed the {file}-pawn." (once past) | "In a minor-piece ending, ask which passed pawn is furthest from their king." | "The outside passer was the winning plan here." | no outside passer on fenBefore | C |
| EP4 | KNOW (queen ending) | S | type queen, errorWhy `allowed-*` / `king-hunt` with ≥1 check in the blow line | — | "In queen endings, king safety decides it: one loose king gives them a perpetual or the queen." | "Their checks start with {first check}." | errorWhy better move (once past) | "In a queen ending, before every move count their checks." | "In a queen ending a loose king loses first — that let their checks in." | no check in the blow | H |
| EP5 | KNOW (trade into the wrong ending) | S | the student's capture CHANGED the type with cost (e.g. traded rooks into a lost pawn ending) | before→after | "Trading into a pawn ending is final: count the race before the last piece comes off." | — | "{best} kept the rooks on." | "Before the last trade, count the pawn ending." | "Trading into the pawn ending was final — and it counts against you." | type unchanged | C (type on fenBefore vs fenAfter; `pawnEndingCounted` registry `boardComputers.ts:4935` already counts it) |
| — | record | — | RED/GREY full · AMBER the phrase alone · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `passive-rook` (EP1), `passive-king-endgame` (EP2/kingActivityGap), `passed-pawn-neglected` (EP3); costReason allowed in a queen ending (EP4); the pawn-ending trade (`pawnEndingCounted` registry entry `boardComputers.ts:4935`; :1014 is its input type) → EP5.

## F. Build changes
1. `reviewMoveTeaching.ts:975` — return `{ type, phrase, counts }` (typed enum); keep the phrase.
2. Per-type board tests (B3) as pure helpers. EP1's cause: `positionalReason` `passive-rook` reads only rook files (`positionalReason.ts:180-186`); "rook behind the passer" needs its own branch (same F as rookOnSeventh F5). recipe rows EP1–EP5 → `mistakeLesson.ts`; the phrase is the LESSON stem.
3. Registry `:4761` — `squares` from the per-type test (fixes the "You've reached…" standalone statement being said without a teaching point).

## G. Proof boards
- `vc-_ZmPtTJHfNI-66` `6k1/4Q3/p2P2pp/8/1ppq4/7P/2P2PPK/8 w` (queen ending); `vc-38QzSkFRn4E-74` `1k6/7p/pp3p2/P4p1P/8/5K2/8/8 w` (K+P); review `lines-0.jsonl#4123` (rook ending).

## H. Open questions
- Should the ending's name be said at all in Learn under mistakes-only, or only as the LESSON lead of an ending mistake (EP1–EP5)? (Card assumes the latter.)
