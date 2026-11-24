# habitsOf — what you (or they) keep doing in this game

## A. Identity
- File: `src/services/thinkAloud.ts`: `habitsOf(sans, side, seat, sound)` (210–245), counts from `habitReads(sans, opp, sound)` (250–277), development count `homeMinorCount`. `opponentHabits` (197–199) is the same function for their seat (own card).
- Registry: `boardComputers.ts` `yourHabit` (5953–5970, computer `habitsOf`, kind `your-habit`, seat `student`, claim `habit:your:<kind>`, proof `NO_PROOF.description`, squares `[]`); `theirHabit` (5926–5951) for the other seat.
- Reach: learn door (`thinkAloud`), review, lesson, chat, tapped, tactics. Census: 277 lines (27 said): lesson 272 (23 said; held 242 `already-said`, 7 `same-idea`), review 5. The said lines are within-game counts: "That's two times now you've left a piece loose under their attack…", "Two of your minor pieces are still at home…".

## B. Facts
- **B1** `Habit` (187): `kind` tempo | undeveloped | loose | king-pawns, `text`. Counts: `looseMoves` (moves of `side` that left a non-pawn piece winnable by ≥ 2 by SEE, excluding captures, checks and plies the grader called sound, 258–264), `kingPawnPushes` (pawn pushes beside a castled king while the attacker has a queen, 265–273), home minors after up to 24 plies (238–239).
- **B2 dropped:** WHICH moves left pieces loose (the plies and squares) — only the count survives (263); which pawns were pushed (the hole squares); the move numbers.
- **B3 cheap:** the plies list (`looseAt: {ply, square, piece}[]`) — the same loop; the hole squares beside each push (the pawn's from-file neighbours on its old rank).
- **B4 gates:** loose ≥ 2 (225); king pawns ≥ 2 (230); undeveloped at ply ≥ 16 with ≥ 2 minors home (238); a sound move never counts (`sound`, 259). 🔴 Checker: the sound gate is DEFEATED on every surface but Review — `thinkAloud.ts` 345/352, `boardBundle.ts` 469–470 and `moveThoughtFacts.ts` 583–584 pass `NO_SOUND_PLIES` / an empty set, so in Learn and the lessons a sound sacrifice counts as "left a piece loose". Only `reviewFullData.ts` 1125–1137 passes the grader's `soundPlies`.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | each `text` ends on a habit rule ("Before every move, check what it leaves without a guard") | — |
| CONSEQUENCE | partly | "every push leaves a hole beside it" | the specific square (B3) |
| BETTER MOVE + JOB | n/a | — | a pattern across moves, not one move |
| HABIT | yes | the texts ARE habits | — |

## D. Lesson recipes
A habit is said only when the move just played is the newest instance AND it was a mistake (cost ≥ floor) — **HB-AGAIN**: the student's move is the Nth (N ≥ 2) loose-piece / king-pawn move, and this one cost.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| HB1 | habit (loose pieces) | S | HB-AGAIN, kind loose, the move just played is in `looseAt` | piece, square | "A piece is only safe where nothing can take it for free — your {piece} on {sq} is loose again." | "{n} times this game." *(see H)* | — | "Before every move, check what it leaves without a guard." | full | the move is `sound` (already) | C (B3 plies) |
| HB2 | habit (king pawns) | S | HB-AGAIN, kind king-pawns | pawn, hole | "Every pawn push in front of your king leaves a hole beside it: {hole} is one now." | — | — | "Leave the pawns in front of your king at home unless the push wins something." | full | queens off (already) | C (holes) |
| HB3 | strategize (development) | S | kind undeveloped and the student's move cost ≥ floor moving an already-developed piece | — | "A piece at home can't join the fight: {n} of your minor pieces are still there." | — | "{best} brought one out." | "Develop first, attack second." | full | the move won material (a tempo spent on a gain) | H + C |
| HB4 | record | S | the record's `holdState` on `hanging-piece` / `king-pawn-push` / `neglected-development` | — | RED/GREY: full · AMBER: the habit clause only · GREEN: silent | | | | | | H |

Not applicable: calculate, plan, phase (the counters already gate the phase: king pawns only with queens on; development before ply 24).

## E. Mistake link
- Student: `costReason` **allowed** + motif `hanging_piece` (HB1), `positionalReason` **neglected-development** (HB3), king-cover concessions (HB2 — `theirMoveCost`'s structure kind for the student seat).
- Opponent: `opponentHabits`' card.

## F. Build changes
1. `habitReads` (250): return `looseAt` and `pushes` lists (B3), not counts only.
3. Learn's callers (`thinkAloud.ts` 345/352, `boardBundle.ts` 469–470, `moveThoughtFacts.ts` 583–584) must pass the game's graded sound plies, not `NO_SOUND_PLIES` (make `sound` come from the graded game, never a constant empty set): otherwise HB1 calls a sound sacrifice a loose piece. Guard board: any `sound`-graded sacrifice ply in David's games.
2. The habit speaks only on HB-AGAIN (the move just played is an instance and a mistake) — today it is offered every ply once the count is ≥ 2 (the 242 `already-said` holds are the symptom).
4. The count words ("That's two times now") move behind the owner's answer in H.

## G. Proof boards
- Census said: lines-0.jsonl:1872 "Two of your minor pieces are still at home…"; lines-0.jsonl:1864 held `same-idea` (the rotated twin).
- Run: `computeMustDefend/leftHanging` on student moves gives the loose instances on David's games: g chesscom-1012441262 ply 33 Nxh5 (cost 115) and ply 35 Bxf8 (cost 268) — both trades in progress (`habitReads` excludes captures, 260, so neither counts — correct).

## H. Open questions
- CLAUDE.md (2026-10-28): the record steers what is taught and is never read back ("you've walked into this before" deleted). Is a within-game count ("That's two times now you've left a piece loose") a recital of the record (cut it, keep only the habit), or allowed because it is this game?
