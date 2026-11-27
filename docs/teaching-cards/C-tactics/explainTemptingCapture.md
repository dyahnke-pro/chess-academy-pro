# explainTemptingCapture — card

## A. Identity
- `explainTemptingCapture(fen, chosenSan, perspective, lineSans, told)` / `temptingCaptureRead(...)` / core `temptingCaptureText` — `src/services/reviewTeachingPoints.ts:466-608`.
- Board computer `temptingCapture` — `src/services/boardComputers.ts:4425-4446`, kind `tactic`; lesson (moveThoughtFacts), review (projectedLineVoice), learn via thought.
- Census: 224 fired / 144 said (all lesson), held already-said 79.

## B. Facts
### B1. Handed over
`{ text, key }` — key = `from+to+victim` of the biggest capture (victim ≥ minor) the mover did NOT play.
Three outcomes (temptingCaptureText): (a) the capturer is TRAPPED and the line lets it go (`findTrappedPiece` branch, :562); (b) "NOT free — guarded by the X on Y, so Qxc7 just trades your queen for a rook" (`oppNet − victimVal ≥ 1`, :584); (c) a pawn recapture rips open a file at the mover's own king (`oppNet − victimVal == 0`, :595, recapturer a pawn, heavy piece on the file).
### B2. Dropped
- `oppNet` (:549, SEE the recapturing side gains) — the cost in material ("you'd lose 6 points") is only in "trades your queen for a rook".
- The recapturer square/piece (`recapFrom`, `recapNoun`) are in prose only — not typed.
- Only the SINGLE biggest capture (`caps[0]`, sort :533) is examined; other tempting captures dropped.
### B3. Cheap
- The mistake case: the mover DID take (today returns null when `chosen` = the capture, :543-544) → that is whyItFailed `held-by-defender` ("That took the X, but the Y takes back"). Same fact, opposite branch — the lesson stems apply.
### B4. Gates
Capture victim ≥ minor; mover chose something else; capturer Q/R — trapped branch; recap SEE net ≥ 1 (lose ≥ a pawn) for (b); even trade by a pawn opening a file to own king for (c). `told` say-once.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "only looks tempting … NOT free" | general rule first ("A piece is only free if nothing can take back") |
| CONSEQUENCE | yes | "just trades your queen for a rook" | net in words if not a straight trade |
| BETTER MOVE + JOB | n/a | — | fires when the mover played well; for the mistake (took it), errorWhy's best |
| HABIT | no | — | spotCue free-piece `general` / "check every recapture" |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC-1 | consequence (S took the guarded piece) | S mistake | whyItFailed `held-by-defender` with captured (S played the capture) | victim, recapturer | "A piece is only free if nothing can take back. The rook on c7 was guarded by the queen on b6, so taking it cost your queen." / "Before you grab, check every recapture: the knight on d4 had the bishop on c5 behind it." | "You traded your queen for a rook." | errorWhy best + job | "Before you grab, check every recapture." | after (never names the move just played: "that capture") | gambit / sac (deepCombination) | H (whyItFailed) + B2 |
| TC-2 | knowledge (good refusal) | S declined | today's fire (S chose elsewhere) | same | "Notice the rook on c7 isn't free — the queen guards it. Leaving it alone was right." | | | | Review / Learn praise path (not a mistake turn) | — | H |
| TC-3 | consequence (file opens at own king) | S took | branch (c), S played it | file, king | "A pawn recapture opens a file. Taking on e5 lets the pawn take back and opens the f-file straight at your king, with their rook already on it." | "Their rook gets a free road to your king." | errorWhy best | "Before a trade near your king, ask which file the recapture opens." | after | — | H |
| TC-4 | identify (trapped capturer) | S | branch (a) | trapped piece | "When your queen is trapped, the best capture is the cheapest way to let it go." | | | | Review | — | H |
| TC-5 | their seat | O | perspective 'they', O took the guarded piece (their mistake) | victim, recapturer | "Their queen took a guarded piece — the rook on c7 had the bishop behind it." | "That trade wins you the queen for a rook." | n/a (S to move — hold the recapture? the recapture is forced/obvious; hold only if not the only move) | | after THEIR mistake | — | H (whyItFailed mover-generic) |
| TC-REC | record | — | `hung-material` | | RED/GREY full; AMBER "That rook was guarded."; GREEN silent | | | | | | holdRate |
n/a: phase, plan, strategize. Combination: attackerDefenderCount (count) — the count says when a capture DOES win; this says when it doesn't.

## E. Mistake link
- whyItFailed `held-by-defender` (mover took a guarded piece) → TC-1 (S) / TC-5 (O). This computer is the NON-mistake twin; its stems are the lesson half of that mistake kind.
- Branch (c) has no errorWhy twin (an even pawn trade that opens a file is a positionalReason, not material) → TC-3 attaches to positionalReason `opens-file-to-king` if that kind exists; else Review only.

## F. Build changes
1. reviewTeachingPoints.ts:508-608 — return a typed read `{victim, victimSq, capturer, recapturer, recapFrom, oppNet, branch}` instead of only text.
2. Expose the TAKEN branch: when `chosen` IS the capture (:543-544) return the same read with `taken: true` → recipe TC-1 can read it beside whyItFailed (one source of the recapturer, no second prose).
3. Examine every capture ≥ minor, not only `caps[0]` (rot rule: a cap on computed facts) — the recipe picks.
4. Words → recipe `took-guarded-piece` / `trade-opens-file`; delete the three rotated stems.

## G. Proof boards
- Text (lines-0, lesson): "Notice the rook on c7 is NOT free — it's guarded by the queen on b6, so Qxc7 just trades your queen for a rook." (TC-2); "Taking on d7 only looks tempting: the king on e8 guards the bishop, so it is NOT free, and Qxd7+ just trades your queen for a bishop." (TC-2).
- Guard: capture with SEE ≥ 0 (actually free) → null (count / free-piece cards).

## H. Open questions
1. none
