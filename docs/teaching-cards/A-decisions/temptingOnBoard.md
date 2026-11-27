# temptingOnBoard — the tempting move on the board, before anything is played

## A. Identity
- `src/services/weighedMoves.ts:621` `temptingOnBoard({fen, student, rating, reads, priorMove, considered})` → `TemptingRefuted[]` (same walker as temptingRefuted, measured against the best read). Fallback `standingRefutations` :876 (tries refuted by the RESULT, not material).
- Registry `temptingNow` `boardComputers.ts:3555-3592`, kind `refuted`, same claims as temptingRefuted (one claim before/after). Learn: `not` ("names the student's own next move"). Also `pictureVerdict` reads it as "the but", `boardReadFacts.ts`, `playCommentary.ts`. Census 351/297 (lesson).

## B. Facts
- B1: same as temptingRefuted; the standing form `StandingRefuted { san, uci, costCp, reply, text, squares, key, reasonKey, reasonText, claims, data: TryData }` (:641-662).
- B2 dropped: as temptingRefuted (`real`, look/hoped/missShape typed); standing: `lastMechanismKey` is a module-level variable (:724) — a computed reason key passed by side-channel, not a field.
- B3 cheap: whether the student then PLAYED one of these tries — join on uci with the move played; that turns a pre-move read into the post-move mistake lesson (exactly temptingRefuted TR1 with this read's words).
- B4: as temptingRefuted (eye/real bars, cost ≥ 100, trust); standing adds `resultShift` (band changes) / `smallerShift` (≥ 50 cost, "achieves nothing").

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "Nxg7 looks natural, but …Kxg7 meets it" | a pre-move read; in new Learn it becomes the post-move lesson ONLY when the student played that try |
| CONSEQUENCE | yes | because / resultShift ("throws the win", "gives back a big part of your edge") | |
| BETTER MOVE + JOB | no | best san only via bestOfReads | job from deliberation |
| HABIT | partly | easyToMiss | |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TO1 | recognize → played | S | a try on the pre-move list = the move played | as TR1 | TR1 stems | because | best + bestWhy | TR habit | after move | uci match exact | C (join) |
| TO2 | evaluate (result) | S | standing try = played, resultShift non-null | shift | "A move can cost the game without losing a piece: this one {throws the win / gives back the edge} because {reasonText}." | resultShift | best | "Before you play it, ask what it does to the result, not just to the material." | after move | reasonText non-null (no bare "gives back part of your edge") | H |
| TO3 | strategize ("achieves nothing") | S | standing smallerShift, cost 50–99 | | "A forcing move that wins nothing is a wasted move: the trades leave the material level." | | best | | only if inaccuracies are Learn turns (else Review only) | | H |
| TO4 | their seat | O | their played move ∈ their pre-move list | | TR6 | | held | | | | C |
| TO5 | pre-move warning | S | the list before the move, not played | | n/a in new Learn (banned: before the move) · Review/chat/lesson keep it | | | | silent | | H |
| TO6 | record | S | | | RED/GREY full · AMBER one clause · GREEN silent | | | | | | H |
| — | endgame/phase | — | same walker all phases | | | | | | | | |

## E. Mistake link
- errorWhy: TO1 → `allowed-tactic`/`allowed-capture`/`allowed-mate` (E10/E11/E1); TO2 → `unexplained` today (no material cause) until F4 `result-shift`, so TO2 is Review/chat only until then; TO3 inaccuracy (Review only); TO5 Review/chat/lesson only.
- Same causes as temptingRefuted (costReason `allowed`, all motifs, mate) plus TO2's result-only cause (no material) → needs cause `result-shift` (the try changes the band with a board reason: `reasonKey`).

## F. Build changes
1. Mistake turn: join the pre-move list (cached per board — `conclusionsOf` already caches, `boardComputers.ts:368`) with the played uci → TO1/TO2/TO4.
2. Replace the module variable `lastMechanismKey` (:724) with a returned field on `StandingRefuted`.
3. Learn registry stays `not` for the pre-move form; add the post-move join as the Learn read.
4. Add MistakeCause `result-shift { reasonKey }`.

## G. Proof boards
- Pure run: 93 boards with a list, 20 on mistake plies. g:1012441262#44 O `…Nxe4` loss 255: list starts "…Rf7 was the obvious try for them … you play Rfb1 and Qxd2 a move later … Rfb1 is the move that's easy to overlook" (the played …Nxe4 was not on the list — B3 join finds nothing → errorWhy alone).
- g:1012441262#35 S `Bxf8` loss 268: list "c4 is the obvious try … Qxb2" (not played).
- Danya: vc-_JQ-AH3OYQ4-22 ("exf6 looks natural, but …g6 meets it … gives back a big part of your edge"), vc-_WmByfLW-3g-34.
- Have-check misses (17, most of any computer): how-to-ruin-your-pawn-structure#1 "19.h3 fails: …hxg4 fxg4 Bxg4 leaves the h1 rook hanging"; positional-combinations#4 "27.Rc7 achieves nothing because …Rf7"; how-to-ignore-a-threat-and-win#3 "the autopilot 32…Qe6 fails to 34.Qxf5".

## H. Open questions
- None.
