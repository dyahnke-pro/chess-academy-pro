# noSafeChecks — card

## A. Identity
- `noSafeChecks(fen, student)` — `src/services/noSafeChecks.ts` (63 lines; main :35; `checks(fen)` :22 = all checks / safe checks by SEE).
- Board computer `noSafeChecks` — `src/services/boardComputers.ts:7235-7255`, kind `tactic`, said once a game per side (key `no-safe-checks:<side>`), skill `missed-opponents-threat` when the student is the side out of checks.
- Census: 84 fired / 45 said (lesson 67, review 17); held already-said 39. Map: "P (odd wording)".

## B. Facts
### B1. Handed over
`side` (side to move, out of safe checks), `yourChecks` (all its checks — each gives the piece away), `theirSafeChecks` (the other side's safe checks/mates), `text`, `squares`.
### B2. Dropped
- `mateThreat` flag (:49) and `computeMustDefend(fen, side0).pieces` (:50, used only as a gate) — the REASON the side wants a check at all (it is under threat). The text never says what is threatened.
- That a "safe check" may be MATE ("while you still have Qxg7#") — the text lists a mate as if it were a mere check (the odd wording: a mate in one buried in a sentence about checks).
### B3. Cheap
- The quiet defence: the side's legal non-check moves that meet `computeMustDefend` (re-run after each) → "a quiet move that guards g7".
- The student's mistake: S was the side, played one of `yourChecks`, and lost the piece (errorWhy lost-the-piece / held-by-defender on a check).
### B4. Gates
Not in check; side to move has ≥1 check and every one loses the checker (SEE > 0 after, mate counts safe); the side is under threat (a piece to defend or a mate threat); the other side has ≥1 safe check.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes (student seat) | "Checks will not save you here — look for a quiet move or a deeper idea." | the threat that makes it urgent (B2) |
| CONSEQUENCE | partly | their safe checks listed | "and the bishop goes for nothing" |
| BETTER MOVE + JOB | no | — | B3 quiet defence / errorWhy best |
| HABIT | partly | the lesson clause | "When you're under threat, a check that loses the piece only delays it." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| NC-1 | strategize (panic check) | S mistake | side = S on fenBefore, S played one of `yourChecks`, errorWhy cost ≥ mistake | checks, threat (B2) | "When you're under pressure, a check that gives the piece away only delays it. Every check here lost the checking piece." / "Checks aren't always forcing: if they lose the piece, look for a quiet defence instead." | "The bishop went, and the threat on g7 is still there." | B3 quiet defence or errorWhy best ("Qg3 was the move — it guarded g7") | "Before a check, ask what it does after they answer it." | after | the check was a real save (SEE 0) → not this card | H + C |
| NC-2 | consequence (their only checks lose) | O | side = O, S is the one with threats/mate | theirSafeChecks | (Review) "They're out of useful checks — every check gives a piece away, and you still have the mate on g7." | — | | | Review only (not a mistake turn) — split the mate out (DT-M1) | — | H |
| NC-3 | knowledge | both | — | — | "A check is good only if it gains something; a check that loses the piece is just a lost piece." | | | spotCue (CCT) | | — | H |
| NC-REC | record | — | `missed-opponents-threat` | | RED/GREY full; AMBER "Checks won't save you here."; GREEN silent | | | | | | holdRate |
n/a: phase (any), plan, prevent (NC-1 covers the defence).

## E. Mistake link
- whyItFailed `lost-the-piece` / `held-by-defender` where the played move gave check and every check lost its checker → NC-1 lesson (the WHY behind the loss).
- costReason `allowed` mate after a spite check → NC-1 + mate consequence.

## F. Build changes
1. noSafeChecks.ts — expose `threat: {pieces, mate}` from the computeMustDefend / mateThreat already computed (B2).
2. Split `theirSafeChecks` into `mates` and `checks`; never list a mate as a check (the odd wording) — the mate is DT-M1's fact.
3. Add `quietDefences(fen, threat)` (B3) → NC-1 BETTER-MOVE.
4. Recipe `spite-check` attaches to errorWhy when the played move is in `yourChecks`.

## G. Proof boards
- Text (lines-0): "They have safe checks in Bd5+ and Rxe8+, and you are out of useful ones: your only check gives the checking piece away. Checks will not save you here — look for a quiet move or a deeper idea." (NC-1 shape); "Their only check gives the checking piece away, while you still have Qxg7#." (NC-2 — F2 defect: mate listed as a check).
- Guard: a check that is safe (SEE ≤ 0) exists → null.

## H. Open questions
1. none
