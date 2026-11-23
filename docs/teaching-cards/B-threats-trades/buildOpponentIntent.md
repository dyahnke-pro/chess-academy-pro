# buildOpponentIntent — their strongest try (engine fan)

## A. Identity
- File: `src/services/opponentIntent.ts` (101 lines): `buildOpponentIntent({analysis, fen, max=2})` (55–95), `opponentIntentFacts(oi)` (97–101).
- Registry: `boardComputers.ts` `opponentIntent` (2936–2950), kind `opponent-intent`, seat `opponent`, `claims: []`, proof `NO_PROOF.description`. Also built inside `positionFacts.ts` 734–736 (only when the opponent is to move and the opening is not quiet).
- Reach: learn door, chat, tapped — review/lesson/tactics **no**. Census: 323 lines, all chat (297 said, 26 held: 24 `in-flux`, 2 `beside-mate`). The one sentence it has: "keep an eye on the opponent's Qd3 — that's their strongest try here." — names a move, gives no reason (map: **P**).

## B. Facts
- **B1** `OpponentIntent.plans[]` (20–36): `opponentMove` (SAN of line k's first move), `studentReply` (SAN of ply 2), `evalCp` (white-POV, mate ±100000), `squares` (from/to of their move). Top 2 lines.
- **B2 dropped:** every ply past 2 of each PV (the line is in hand, 66–68); the gap between plan 1 and plan 2 (`evalCp` difference — whether their best try is the ONLY good one); `studentReply` is computed then withheld by the renderer (opponentIntentFacts uses only `plans[0].opponentMove`, 98–100); what the move captures / attacks (chess.js has the move object in `uciToSan`, 39–45, and throws it away).
- **B3 cheap:** what their move hits — `detectNewThreat(fen, fenAfterTheirMove, them)` on the same line; whether it is a capture and what it wins (`captured` from the chess.js move); the line's net (`settledNetForLine`); the eval swing from the current eval to `plans[0].evalCp` = what the student's last move allowed.
- **B4 gates:** null when no line has a move (64); de-dup by first move (93); in `positionFacts` only off the quiet opening and when the opponent is to move (734). No value floor: a quiet "Kh7" is named as their "strongest try".

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | it has no reason, only a move |
| CONSEQUENCE | partly | `evalCp`, the PV | what the move wins/threatens (B3) |
| BETTER MOVE + JOB | partly | `studentReply` (the student's answer to their try — not the better move the student should have played before) | the job of the reply |
| HABIT | no | — | — |

## D. Lesson recipes
On a mistake turn the position after the student's move has the opponent to move, so `plans[0]` IS the punishment — this computer is the **source of the refutation move**, not a lesson by itself. Every lesson it can carry needs a reason from another computer on the same line.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OI1 | consequence (the refutation) | S | student cost ≥ mistake, plans[0] is a capture or makes a threat (B3) | their move, what it hits | (lesson comes from the cause recipe — costReason motif) | "Their answer is {plans[0]}: it {hits/wins …}." | — | — | Learn: said after the student's move; their move named is allowed (it is theirs) | plans[0] neither captures nor threatens (a quiet best move explains nothing) | H + C: detectNewThreat on the line |
| OI2 | evaluate (only move for them) | O | plans[0] − plans[1] ≥ 150 for them, and they did not play plans[0] | gap | "When only one move works, the side that misses it pays: {plans[0]} was their only good try." | "Anything else let you back in." | — | — | Review | their move = plans[0] | C: gap of two evalCp |
| OI3 | calculate (their reply, your answer) | S | after the student's mistake, studentReply exists | studentReply | — | "They play {plans[0]} and your best is {studentReply}, already worse." | — | — | Review only (Learn never names the student's next move) | — | H |
| OI4 | habit (blunder check) | S | OI1 fires | — | "Before you let go of a move, ask what their best answer is." (owned by `methodBeat` / `blunderCheck` — one habit table) | | | | | | |

Not applicable: recognize / identify / knowledge / phase / record angles — the computer carries no pattern, only the engine's move; they belong to the computer that names what the move does (`detectNewThreat`, `costReason`).

## E. Mistake link
- Student mistakes of every cause: `plans[0]` is the first blow of `costReason` **allowed** (the same engine line). One source: on a mistake turn use `costReason.plies` — not a second read of the same fan.
- Opponent mistakes: OI2 (their only good move missed) — `costReason` **missed** from their seat.

## F. Build changes
1. Delete `opponentIntentFacts` (97–101) and the registry read `opponentIntent` (boardComputers 2936–2950) from every surface that speaks: it names a move with no reason (chat's "keep an eye on…" is the only speaker; chat's threat question already answers through `assembleThreatAnswer`). G8.5 rule 4: closing the lane deletes the producer.
2. Keep `buildOpponentIntent` as data: add `hits: string[]` and `captures: string | null` per plan (from the chess.js move already made in `uciToSan`, 41–43) so OI1's consequence is a field, and `onlyMoveGap: number` (plans[0] − plans[1] for the mover) for OI2.
3. `positionFacts.ts` 734: keep the call only if a consumer reads the new fields; else remove it (no consumer of the bare text remains after F1).

## G. Proof boards
- Census (chat): boards-0.jsonl:30 vc-_4xbS0Crtic-22 "keep an eye on the opponent's Qd3"; boards-0.jsonl:228 vc-_X7t6o3o6JM-33 "…Kh7" (a king move named as the strongest try — the guard case for OI1: no capture, no threat → nothing to say).
- OI1 (the refutation): g chesscom-1012441262 ply 15 (student, after Qf3) — the run's `computeMustDefend` shows …Bg4 hitting the queen on f3 (net 6) on the next ply; plans[0] on that board is the move that hits.

## H. Open questions
- Chat answers "what are they threatening?" today partly with this line. After F1 chat answers only from `assembleThreatAnswer` — confirm chat may lose "keep an eye on X" for quiet positions where no threat exists (silence vs "nothing direct").
