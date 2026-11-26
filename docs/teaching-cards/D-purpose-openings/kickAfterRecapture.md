# CARD — `kickAfterRecapture` (the recapture lands where a pawn kicks it)

## A. Identity
`src/services/kickMap.ts:128` `kickAfterRecapture(fenBefore, san, reply, bestPvUci)` → `KickLine {sans[3], squares, kick, text}`; prospective twin `kickLineRead :~108`; core `kickLine`. Census 2/1, kind `kick`.

## B. Facts
- **B1** `sans` (capture, recapture, kick), `kick {piece, square, landings}`, text.
- **B2 dropped:** `landings` only in prose (`landingClause`); the tempo gained isn't valued.
- **B3 cheap:** mistake inversion — THEIR recapture landed on a kick square because the STUDENT then did not kick (missed tempo, cost ≥ mistake); or the student recaptured onto a square their pawn kicks (the student's piece gets chased) = errorWhy allowed-threat kick on a recapture.
- **B4 gates:** both moves captures (`:129`); the engine's best line from before plays capture-recapture-kick (`:132-133`); kicked piece > pawn (`:102`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | text ("right where c6 kicks it") | general lesson |
| CONSEQUENCE | yes | landings | — |
| BETTER MOVE + JOB | yes | sans[2] | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| K1 | calculate (exchange then tempo) | S (good) | as today | | Review only (good move) | | | | silent | not a mistake | H |
| K2 | tempo | S mistake | B3: student recaptured onto a pawn-kick square, errorWhy allowed-threat | piece, square | "Before you recapture, look at where your piece will land: if a pawn can kick it there, recapture with something else." | "…c6 kicks the knight and they gain the time." | "Recapturing with the pawn kept the knight home." | "Before you take back, ask what hits the square." | same | kick must be their engine reply | C |
| K3 | missed tempo | S mistake | the student did not kick after their recapture, cost ≥ mistake | | "When their piece lands where your pawn can hit it, kick it: free time." | | "c6 would kick the knight." | | past only | | C |

## E. Mistake link
`allowed-threat` (kick) on recaptures (K2), `missed-win`/positional `tempo-handed` (K3). Fires rarely (2 lines in the census).

## F. Build changes
1. Add `recaptureIntoKick(fenBefore, playedSan, replyLine)` (K2 inversion) using `kickLine`.
2. K2/K3 recipes; K1 leaves Learn.

## G. Proof boards
- Census: "Their knight took back on d5, right where c6 kicks it — and it has to find a new square." (`lines-0.jsonl:3129` lesson said, `:2471` review).
- K2/K3: no board in the 109 costly moves; to search in the build.

## H. Open questions
None.
