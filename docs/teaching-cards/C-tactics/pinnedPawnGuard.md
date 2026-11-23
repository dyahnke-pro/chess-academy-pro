# pinnedPawnGuard — card

## A. Identity
- `pinnedPawnGuard(fenBefore, san, mine)` — `src/services/pinnedPawnGuard.ts` (`pinnerOf`, `captureSquares`, main fn); text rotated 3 stems.
- Board computer `pinnedPawnGuard` — `src/services/boardComputers.ts:6820-6835`, kind `tactic`, stakes `gain` plies 1; lesson / learn-via-thought / review / chat.
- Census: 3 fired / 3 said; 1 voiced board.

## B. Facts
### B1. Handed over (`PinnedPawnGuardRead`)
`key`, `text`, `squares` [moved piece, target, pinned pawn, pinner], `mine`, `gain` (pawns won by the count), `proof`.
### B2. Dropped
- The counterfactual already computed: `unpinned` SEE (pinner removed) < `gain` — i.e. "if the pawn weren't pinned the target would be safe" (main fn) — this IS the lesson and is not said.
- `target` piece type is in words; the pawn's file (`cell.square`) as "the f7 pawn" yes; the king square not named.
### B3. Cheap
- For the victim's side: the move that would have unpinned (king step off the line, interpose) — chess.js on fenBefore.
- Whether the MOVER's opponent (victim) created the weakness by their own previous move (pinner arrived vs pawn arrived) — compare with the position two plies earlier.
### B4. Gates
- Move gives no check; a pawn of the other side pinned to its own king by a slider of the mover; the pawn's capture square holds a non-king piece of its side; the moved piece NEWLY attacks it (not from its old square); the pinner does not itself attack the target; SEE gain ≥ 1 and strictly larger than with the pinner removed.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | stem 3: "a pinned pawn can't recapture" | rule-first order |
| CONSEQUENCE | partly | gain | "so the knight on e6 is really loose" |
| BETTER MOVE + JOB | no | — | victim side: unpin move (B3); mover side when missed: errorWhy best |
| HABIT | no | — | spotCue free-piece `false-guard` ("check whether the guard is pinned") — exact fit |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PG-1 | identify (false guard) | O mover (S's piece is the target) | mine=false; S's previous move left the target relying on the pinned pawn, errorWhy cost ≥ mistake | target, pawn, pinner | "A pinned pawn guards nothing. Your h2 pawn is pinned to the king, so it doesn't really hold g3." / "A guard that can't take back isn't a guard. The pawn on e6 can't recapture — the bishop pins it to the king." | "So your bishop on g3 is loose, and their knight goes after it." | "Kh1 was the move — off the pin line, and the pawn guards again." (B3) | spotCue free-piece `false-guard` | after | S's move didn't create it (target or pin existed) → still say if cost, as "it was already loose" | H + C |
| PG-2 | own chance missed | S mover | target attackable, S played other, cost ≥ inaccuracy | same | "Look past a pawn guard: if the pawn is pinned to its king, the piece behind it is yours. Their f7 pawn is pinned, so e6 is weak." | gain → "It wins a pawn/piece." | "Rc6 was the move — it hit e6, which f7 can't defend." (once past) | same | after, past-only | — | H |
| PG-3 | counterfactual | both | B2 unpinned SEE | — | "Take the pinner off the board and the piece is safe — the pin is the whole reason it falls." | | | | Review | — | B2 |
| PG-4 | knowledge | both | — | — | "Pawns pinned to the king can't capture at all — not even to take back." | | | | | | H |
| PG-REC | record | — | `missed-their-pin`/`missed-your-pin`, or `hung-material` | | RED/GREY full; AMBER "The pawn guard is pinned — e6 is loose."; GREEN silent | | | | | | holdRate |
n/a: phase (any); strategize (tactical); plan (n/a).

## E. Mistake link
- costReason `allowed`, motif `pin` (detectTacticType 2a `pinnedDefendersOnly`, missedTacticService.ts:279) — the same fact from the classifier side → PG-1 seat O.
- costReason `missed` motif `pin` / `hanging_piece` → PG-2 seat S.
- whyItFailed `held-by-defender` is the INVERSE: its `realGuards` filter drops pinned guards (`pinnedToMore`, whyItFailed.ts:140) — one concept, three readers (this, pinnedDefendersOnly, pinnedToMore).

## F. Build changes
1. pinnedPawnGuard.ts — return `unpinnedGain` (B2) and the pawn's king square → PG-3.
2. One "pinned guard" reader: `pinnedToMore` (whyItFailed.ts:140), `pinnedDefendersOnly` (missedTacticService.ts:279) and `pinnerOf` here answer the same question three ways (pinned to king vs to more). Fold into one exported `pinnedGuard(board, sq, by)` in pinGeometry → shared vocabulary for teach + catch (rot rule).
3. Victim-side caller: run on the opponent's move (`mine=false`) when it attacks the student's piece, and on the student's mistake turn check the target was S's.
4. Words → recipe `pinned-guard`; delete the rotated stems.

## G. Proof boards
- PG-1: vc-1PI3xfMiUE4-34 `r4rk1/pp3ppp/6n1/2bN3q/2B1P1b1/3P2B1/PPPQn1PP/R4R1K w - - 13 18` (their queen pins h2; their Ne2 goes after Bg3) — said.
- Text (lines-2): "Their g-pawn hits your pawn on f5. The e6 pawn guards it, but their bishop pins it to the king, so it can't take back." (PG-1).
- Guard: pinner itself attacks the target (rejected, main fn) — then it is a plain attack.

- **Pure-function run (chess.js only, scratch vitest, deleted after):** `pinnedPawnGuard(before vc-1PI3xfMiUE4-34, 'Ne2', false)` → key `pinned-guard:h2:g3`, gain 3, squares [e2, g3, h2, h5] — reproduces the said line.

## H. Open questions
1. none
