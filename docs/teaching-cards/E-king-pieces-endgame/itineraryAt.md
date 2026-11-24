# Card — `itineraryAt` (the journey a piece took — fires on captures)

## A. Identity
- `src/services/reviewPieceItinerary.ts:131` `itineraryAt(fenBefore, history, san)` over `detectPieceItineraries(sans, color)` (:57); renderer `itineraryLine` (:138). Registry `boardComputers.ts:4348` (entry ends `:4363`) `pieceItinerary`, kind `judgement`, both seats; learn via thought, review via `coachFeatureService`.
- Census: 168 fired / 122 said (held already-said 46). Listed **S/F** in the teaching map ("fires on captures").

## B. Facts
- **B1** `PieceItinerary` (:24): `ply`, `pieceType` (n/b only in practice, :111), `route` (squares from origin), `text`. `itineraryAt` adds `mover`.
- **B2 dropped / wrong**: the route never records that a hop was a CAPTURE — `mv.captured` only deletes the victim's route (:79); a capture hop is pushed like any other (:91-93) and the stock text says "It reroutes… patience is the whole idea" (:118). It does not record whether a hop was a retreat from a kick (`h6` hit `Bg5`), nor the piece's scope before/after.
- **B3 cheap**: `lastHopCapture = !!mv.captured`; `kicked` = the piece was attacked by a pawn on the square it left (chess.js attackers on fenBefore at `mv.from`); `scope` before/after (`pieceScope`, as `pieceRoute.worstAtStart` already does).
- **B4 gates**: minor piece, ≥3 squares (≥2 hops), last square advanced (ranks 4–6 / 3–5, :50-53), first time per piece+origin (:113); `itineraryAt` requires the history to replay to fenBefore (:134).

**Pure run (chess.js, this card):** David's game `chesscom-1001055178` (g-0, studentSide white), history d4 d5 Nf3 Bg4 g3 Bxf3 exf3 Nc6 Bg2 e6 O-O Nf6 Bg5 Be7 b3 h6, move **Bxf6** → `{"ply":17,"pieceType":"b","route":["c1","g5","f6"],"text":"Follow the bishop's journey: by way of g5, it reaches f6. It reroutes … patience is the whole idea."}` — the defect, reproduced. The real lesson on that move is the dark-squared bishop traded off (colour complex, `findColorComplexWeakness`, family C).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | text is a stock praise of patience, true only for a quiet reroute | the job at the destination (what the piece does on arrival) |
| CONSEQUENCE | no | — | scope after / target hit (via pieceRoute's `worst`) |
| BETTER MOVE + JOB | no | — | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| IT1 | (none on a capture) | both | `lastHopCapture` | — | SILENT. The capture's lesson belongs to the trade/colour-complex/errorWhy readers | — | — | — | silent | always | C |
| IT2 | CONSEQ (a trip that wasted time) | S | route ≥3 squares, the student's last hop cost (mistake), and the piece ends on a square with lower or equal scope / it was kicked back | piece, route | "A piece that walks three moves to reach a square it could have reached in one has handed them two tempi." / "A trip is only worth it if the piece does more at the end: here the {piece} on {dest} covers fewer squares than before." | "They used those moves to develop." | errorWhy better move | "Before a long manoeuvre, ask what the piece will DO when it arrives." | "A long trip has to end somewhere better — this one cost time and the {piece} does less on {dest}." | scope after > before (then it's a real reroute: Review IT3) | C scope |
| IT3 | PLAN (a real reroute) | both | quiet route, scope after > before | — | Review only: "The {piece} took the long road to {dest}, where it does more: {scope}." | | | | silent in Learn (not a mistake) | | C (borrow pieceRoute.worstAtStart) |
| IT4 | seat O (their slow trip) | O | their route cost them | — | "Their {piece} spent {n} moves getting to {dest}: use the time." | | | | after their move only if it is graded their mistake | | C |
| — | record | — | RED/GREY full · AMBER "That trip cost time." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `misplaced-piece` (`positionalReason.ts:192`, the scope gap) on the last hop → IT2. Not `tempo-handed` (that tag means the move freed THEIR piece, :195); a trip whose cost errorWhy cannot name is `unexplained` → silent.
- A capture hop: never (IT1) — the capture's own cause (`costReason`, colour complex) speaks.

## F. Build changes
1. `reviewPieceItinerary.ts:81-93` — record `hops: Array<{to, captured: boolean, kicked: boolean}>`; a route whose LAST hop is a capture is not emitted (`if (mv.captured) continue` before the emit at :111). Miss board fixed: g-0 Bxf6 above (no line); guard: g-0 lines `lines-0.jsonl#685` ("by way of g3, it reaches h5" — quiet Nf1-g3-h5, must still fire in Review).
2. Delete the stock sentence (:118, "reroutes … patience is the whole idea") — it states, never teaches; replace by IT2 (mistake) / IT3 (Review, with the scope gain from `pieceRoute.worstAtStart`, :94-102 of pieceRoute.ts).
3. Merge the two route computers' claim keys (`itinerary:<dest>` and pieceRoute's) — one idea.
4. Recipe IT2 → `mistakeLesson.ts` (`positional:misplaced-piece`).

## G. Proof boards
- Defect: g-0 game 1 ply 17 Bxf6 (run above) — must go silent.
- IT3 (keep): `lines-0.jsonl#685`. Opponent-seat shape: `lines-0.jsonl#716` ("Their bishop came to g5 by way of e7").

## H. Open questions
- none — IT3 is a good move, so the WO's mistakes-only rule already makes it Review only.
