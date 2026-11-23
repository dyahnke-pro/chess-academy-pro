# deepCombination — card

## A. Identity
- `deepCombination(fenBefore, san, line, moverCp, moverMate)` — `src/services/deepCombination.ts` (main fn, `shortestAt`, `forcing`, `netWon`); words `deepCombinationLine` (rotated stems).
- Board computer `deepCombination` — `src/services/boardComputers.ts:4119-4135`, kind `sac-why`, gated by `sacLineNamed` (lineTrust); both seats.
- Defers to `kingSacrifice` (kingSiege) when the sac opens the king (main fn, last check).
- Census: 9 fired / 9 said (review 4, lesson 5).

## B. Facts
### B1. Handed over (`DeepCombination`)
`mover`, `san`, `given` {piece, square}, `lead` (moves before the offer), `offered` {san, color, to}, `accepted` (offer → take), `takenFen`, `follow` (forced follow-up), `line`, `outcome` mate|ahead|back, `won`, `net`, `key`.
### B2. Dropped
- `followed` count of forcing moves after the take and `lastForcing` — "every move after the take was a check or a capture, so they never got time" is the mechanism and is not said.
- `b0` balance and the dip size (`balance(walk) ≤ b0 − 2`) — HOW MUCH was given (the sacrifice size) is in `given.piece` only.
- The forcing kind per follow-up move (check / capture / mate threat via `hasMateThreat`).
### B3. Cheap
- Motif of the follow-up (detectTacticType on `follow` from `takenFen`) → "it's a fork after the take".
- For the defender's seat: was declining possible and better? (engine reads have the alternative replies' cp — saved `replies[1]`).
### B4. Gates
Engine ≥ +150cp (`DEEP_COMBO_CP`) or mate for the mover; sacrifice within the first 4 plies and ≥ 2 points; the offered piece not simply hanging before (`legalSeeGainFor(fenBefore, offered.from) > 0` → null); the move after the take is not a recapture on the same square; ≥1 forcing follow-up; outcome mate / net ≥ 1 / net 0 (back + clearly better); not a king sacrifice; the line trusted (`sacLineNamed`).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "gives up … on purpose" / "looks like it drops … but it doesn't" | the rule ("a sacrifice is sound when every move after it forces") |
| CONSEQUENCE | yes | outcome + won ("You win a queen and a pawn for a bishop") | — |
| BETTER MOVE + JOB | partly | `san` | when S missed it: once past; when O sacked: S's best defence (B3) |
| HABIT | no | — | spotCue (motif of follow-up) / "count what you get back, not what you give" |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DC-1 | calculate (S missed a sac) | S | errorWhy `missed`, best = d.san with d non-null | given, follow, won | "A sacrifice works when every move after it forces: check, capture, or a threat they must answer. Giving the bishop on f7 led to a check every move and won the queen." / "Don't count what you give — count what you get back. The bishop on f7 comes back as a queen." | outcome/won | "Bxf7+ was the move — the sacrifice that opens it." (once past) | "When a capture looks like it loses a piece, play the line forward: if every move forces, it works." | after, past-only | untrusted line; kingSacrifice owns it | H |
| DC-2 | evaluate (O sacked, S accepted into it) | O mover | O's move is a combination (d.mover = O), S's take was forced (only reply) | given, follow | "When they give a piece for free, look for the follow-up before you take: their bishop on f7 was bait, and the check on d8 comes next." | won | if declining held (B3): "Kf8 was the move — declining kept the queen." | spotCue (motif of follow) | after S's take, only if declining was better (cost) | taking was best anyway → silent (no mistake) | C |
| DC-3 | prevent (S allowed it) | O | costReason `allowed`, the reply is d.san for O | — | "Before you move, check their captures that look like they lose — those are the sacrifices." | | errorWhy best | "Before you move, check their checks and captures, even the bad-looking ones." | after | — | H |
| DC-4 | knowledge (back = compensation) | both | outcome back | — | "A sacrifice can just get the material back and leave you better — that's still a good trade." | "clearly better" | | | Review | — | H |
| DC-5 | knowledge (mate) | both | outcome mate | — | "The best sacrifices end in mate: the piece doesn't matter if the king falls." | "It ends in mate." | | spotCue mate | | — | H |
| DC-6 | exception (looks like a blunder) | both | `accepted` non-empty | — | "A piece that looks hanging is sometimes a trap: ask why they left it." | | | | → poisonedPiece / patternFails | — | H |
| DC-REC | record | — | motif tag of follow-up | | RED/GREY full; AMBER "The sacrifice works — every move after it is a check."; GREEN silent | | | | | | holdRate |
n/a: phase (any; endgame sacs rare, no rule computed), strategize (n/a — concrete).

## E. Mistake link
- costReason `missed` (S) with best = a sacrifice → DC-1.
- costReason `allowed` (S's move allowed O's combination) → DC-3.
- S's acceptance of a sacrifice when declining was better → DC-2 (needs B3; not wired).
- whyItFailed never explains a sac (it explains own losses) — DC complements it.

## F. Build changes
1. deepCombination.ts — expose `followed`, `forcingKinds: ('check'|'capture'|'mate-threat')[]` per follow-up move → DC-1 LESSON ("every move after it forces").
2. Add `followMotif` via detectTacticType(takenFen, follow[0], follow) → spotCue key.
3. DC-2 caller: on S's take (S's move captures `given.square` after O's offer), compare the saved engine reads of S's alternatives (replies[]) — if a decline is ≥ inaccuracy better, recipe `took-the-bait`.
4. `deepCombinationLine` deleted from speech; recipe words rule-first; keep `lineShape` key-moves for CONSEQUENCE.

## G. Proof boards
- Text (lines-0, review): "After Qc8+ and …Qd8, Bxf7+ looks like it drops your bishop on f7, but it doesn't. After …Kxf7, you play Qxd8. You win a queen and a pawn for a bishop." (DC-1/DC-6); "Bb4+ gives up their bishop on b4. After …axb4, they play Rxb2 and you answer Bxb2. They win a queen for a rook and a bishop." (DC-2/DC-3 O seat).
- Guard: offered piece already hanging before the move → null (not a sac).

## H. Open questions
1. DC-2: the student taking a sacrificed piece is often the best move even when the sac works (forced) — speak DC-2 only when declining was measurably better, yes?
