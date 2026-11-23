# theirTarget — what their last move aims at

## A. Identity
- File: `src/services/threeFacts.ts`: `theirTarget(theirLast, moverIsStudent, plainSeen)` (327–366), `stays` (309–313), `moveHit` (318–325), partner `bindingFact` (380–420, how the reply answers the aim).
- Registry: `boardComputers.ts` `theirAim` (6240–6258; computer `theirTarget`, kind `opp-target`, idea `threat`, weight 45) — requires the target to really fall (`computeMustDefend`, 6251) and the reply in the line NOT to answer it (6252); `binding` (5264–5292, computer `bindingFact`, kind `point`). Also `reviewMoveBriefing.ts` 648.
- Reach: learn door, review, lesson, chat, tapped, tactics. Census: 165 lines, 2 said (both lesson), 162 held `same-idea` — map: **Q**, "strong teacher held quiet". Run on 804 plies: 226 fires (117 on opponent moves, 109 on student moves); 22 on an opponent move that cost them ≥ 100.

## B. Facts
- **B1** `TheirTarget` (56–66): `text` ("their Bg4 is aimed at your queen on f3"), `square` (the target), `by` (the attacker's landing square), `plain?` (a plain hit the record says the student sees).
- **B2 dropped:** the attacker/guard counts on the target are computed (354–355) and used only for the pawn filter; the runner-up target (the loop keeps the most valuable only, 357); the `threatVisibility` verdict detail beyond `plain`; "newly" (352: the attackers grew) — the old attacker count is dropped.
- **B3 cheap:** whether the target really falls (the registry already calls `computeMustDefend` — return its `net`); whether the student's reply answered it (`bindingFact` / `replyAnswers`, the same board).
- **B4 gates:** null on check (339), when the moved piece is taken straight back (`stays` false, 345), kings excluded, a pawn only when guards < attackers (356), the most valuable target kept; `theirAim` adds: the target falls (SEE) and the line's reply does not answer it; `plainSeen` (the record's `plainThreats` green) marks a plain hit so `bindingFact` stays silent on its guard.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | text (piece → target) | the habit-rule "every move of theirs aims at something" is not said |
| CONSEQUENCE | partly | via the registry's must-defend check (net not exposed) | `net` |
| BETTER MOVE + JOB | partly | `bindingFact` ("and this covers it" / "goes after the piece doing it") | joined only to the student's PLAYED move, not the better move |
| HABIT | no | — | — |

## D. Lesson recipes
This card owns the **attacker named as their last move** ("their Bg4 is aimed at …"); the hanging/ignored logic is `computeMustDefend`'s (MD1). One cause, one recipe: **TT-IGN** = MD1 where the attacker is the piece their last move moved (`target.by === theirLast.to`).

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TT1 | recognize (their last move) | S | TT-IGN, student cost ≥ mistake | their move, target | "Every move of theirs aims at something — {their move} was aimed at your {piece} on {sq}, and it was still hanging." / "Start with their last move: {their move} hit your {piece} on {sq}." | "{net} points." | "{best} — {binding words: covers it / goes after the piece doing it}." | "Before your move, ask what their last move attacks." | full | `plain` true and the record is GREEN on plain threats (silent); the student's move answered (bindingFact non-null) | H + C: net, binding on best |
| TT2 | identify (pawn short of guards) | S | TT-IGN on a pawn (`guards < attackers`) | pawn, counts | "A pawn needs as many guards as attackers: their {move} put a second attacker on your pawn on {sq}." | "The pawn falls." | "{best} added the guard." | "Count attackers on your pawns after each of their moves." | full | — | H + C counts (B2) |
| TT3 | prevent (go after the attacker) | S | TT-IGN, best move attacks `by` | attacker | "When a piece attacks yours, you can also chase the attacker: their {piece} on {by} was the one to hit." | — | "{best} goes after the {piece} doing it." | — | full | the chase loses material | H (`bindingFact` 'threat') |
| TT4 | opponent seat (they ignored YOUR aim) | O | the student's move aimed at X (call with moverIsStudent=false for their reply), their reply did not answer, they lost ≥ mistake | your move, target | "Your {move} was aimed at their {piece} on {sq}, and they let it go." | "That's {net} for you." | — | — | Review; Learn only as the student's chance after their mistake (not a student mistake → silent unless the student then missed the capture = MD6) | — | H |
| TT5 | record | S | `plainThreats` hold rate | — | RED/GREY full · AMBER "Their {move} hit your {piece}." · GREEN silent (already `plainSeen`) | | | | | | H |

Not applicable: plan / phase / calculate a line (one-move aim); counterfactual (the aim is the last move's).

## E. Mistake link
- Student: the ignored-threat cause (`computeMustDefend` card F3 `threat-ignored`) — TT1–TT3 phrase it when the attacker is their last move. `errorWhy` **allowed** with motif `hanging_piece` whose blow takes `square`.
- Opponent: TT4 (Review); in Learn only through MD6.

## F. Build changes
1. `TheirTarget` (56): add `attackers`, `guards` (already computed, 354–355), `net` (from the registry's must-defend call, 6251), `runnerUp: { square, type } | null` (the second-most valuable target in the loop).
2. One cause: `threat-ignored` carries `attackerIsLastMove: boolean` and, when true, `theirTarget` supplies the LESSON words; `computeMustDefend` supplies the rest. The `theirAim` row stops being a separate Learn fact (the 162 `same-idea` holds are the symptom of two computers saying one claim).
3. `bindingFact` (380): accept the engine's best move as `san` on a mistake turn (today called with the move played) so BETTER MOVE + JOB reads "{best} covers it".

## G. Proof boards (run, chess.js only)
- TT1: g chesscom-1012441262 ply 16 …Bg4 `r1bqk2r/ppp1p1bp/2np1np1/6N1/3PP3/2P2Q2/PP3PPP/RNB1K2R b KQ - 0 8` → `{text: "their Bg4 is aimed at your queen on f3", square f3, by g4}`.
- TT2 (a pawn): g chesscom-1018307238 ply 26 …Re8 (student, Black) → "your Re8 is aimed at their pawn on e3" (student seat — the guard row TT4).
- Opponent mistake that aimed: g chesscom-1012441262 ply 46 …Rxf2 (cost 147) → aimed at the rook on f1.
- Guard (taken straight back → null): any capture in a completed trade, e.g. g chesscom-1001055178 ply 17 Bxf6 (no target returned for it).
- Census: lines-0.jsonl:742 "Their Nxe5 is aimed at your queen on g4" held `same-idea`.

## H. Open questions
- When their last move aims at a piece AND the student's move answered it correctly, nothing is said (no mistake). Confirm Learn never says "you covered it" (praise of a defence) — today `binding` says it.
