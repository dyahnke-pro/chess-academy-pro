# conceptForBoard — card

## A. Identity
- `conceptForBoard(fen, opts)` — `src/services/conceptEngine.ts:502-562`; line walker `conceptForLine` :680 (the same walker detectTacticType's step 1 uses — dual-use).
- Sources, in order: (0) the engine line (`conceptForLine`: landed tactic / delivered mate pattern via `classifyMatePattern` / endgame technique the line reaches — breakthrough, triangulation, won pawn race, queen vs seventh); (1) decisive tactics on the board (`DECISIVE_ON_BOARD` = mate_threat, back_rank, double_check :486, rendered by `renderTacticConcept` + `TACTIC_INVARIANT`); (2) the endgame principle/technique (`endgameConceptFor`: `MATCHUP_PRINCIPLE` per class :110-133, `DEFENDER_PRINCIPLE` :140, techniques: basic-mate, bishop-knight-mate, two-knights-no-mate, insufficient-material, key-squares, opposition, rook-pawn-corner, rule-of-the-square, pawns-defend-each-other, lucena, philidor, back-rank-defence, cut-off-king, rook-behind-passer, queen-vs-seventh); (3) positional concepts (`positionalConcepts` :872). Sorted by importance, `dropGenericLead`, `.slice(0, max)`.
- Board computer `conceptForBoard` — `src/services/boardComputers.ts:3180-3191`, kind `concept`, `max: 1`, positional and `bare` skipped, LIVE_READ.
- Census: 141 fired / 137 said (chat 103, learn 38): "You have mate in one with your queen …", "Your king has no square off the back rank …", Tarrasch's rule.

## B. Facts
### B1. Handed over (`ComputedConcept`)
`id`, `name`, `source` (tactic | mate | technique | endgame | positional), `squares`, `full` (instance + invariant), `short` (≤ 8 words), `instance`, `bare`, `importance`, `boardFen`, `line`.
### B2. Dropped
- `.slice(0, max)` with `max: 1` at the board computer (:3184) — every concept after the lead is dropped. Under G4.5 the ranking decides; here a fixed 1 decides (a CAP on computed facts). The lead is usually right, but a technique + a tactic on one board loses one.
- `importanceFromSwing` buckets (onlyMove/critical/notable) — WHY it leads is not handed over.
- Defender-side principle exists for only 2 classes (`DEFENDER_PRINCIPLE`, :140) — every other ending speaks the attacker's plan to both seats.
### B3. Cheap
- The mistake: the student played against the technique the board named (e.g. rook in front of the passer when `rook-behind-passer` names the plan; king walked off the key squares). Compare the played move with the technique's `squares`/line (the technique's own reader re-run on the board after the move: technique gone → the move broke it).
### B4. Gates
Line concepts need the analysis; decisive on-board tactics only (no static pin/fork); endgame only when an ending; positional only as support unless lead-eligible; board computer drops positional and bare leads.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | `full` (instance + invariant) | rule first, example inside — today instance first |
| CONSEQUENCE | partly | invariant tail | per technique: what breaking it costs (the draw, the lost race) |
| BETTER MOVE + JOB | no | — | technique's move (line[0]) once past |
| HABIT | partly | `short` cue works as a habit for techniques ("Count the race — yours queens first.") | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CB-1 | knowledge (endgame technique broken) | S mistake | technique T named on fenBefore, T absent after S's move (B3), errorWhy cost ≥ mistake | T, squares | rook-behind-passer: "Rooks belong behind passed pawns. Your rook went in front of the a-pawn, and now it can only block." / key-squares: "In a king-and-pawn ending the king must reach the key squares in front of the pawn." / opposition: "Take the opposition: kings facing with one square between, the side NOT to move gives way." / rule-of-the-square: "Count the square: if the king steps inside it, it catches the pawn." / lucena: "Build the bridge: the rook on the fourth shields the king from checks." / philidor: "Hold the third rank until the pawn advances, then check from behind." | per T: "Now it's a draw." / "The pawn can't be stopped." | the line's first move (once past) | `short` | after | T not reached on the line / not an ending | H + C |
| CB-2 | recognize (mate in one missed) | S | id mate_threat / mate source, S played other | squares | "When you have mate, look for it first — checks before anything." | "The game would have ended." | mate move (once past) | spotCue mate | after | — | H |
| CB-3 | prevent (back rank) | S mistake | back_rank concept, S's king | squares | "A king boxed in by its own pawns is mated by one rook on the back rank — give it a square." | | errorWhy best (luft) | spotCue mate `back-rank` | after | luft | H |
| CB-4 | knowledge (defender's plan) | S defending | ending class with DEFENDER_PRINCIPLE, S is the side without | — | "With only a king left against mating material, keep it in the centre as long as you can." | | | | after S's mistake in that ending | class lacks a defender principle → C: author | H (2) / C (rest) |
| CB-5 | knowledge (insufficient material / two knights) | both | technique id | — | "Two knights can't force mate on their own." | | | | Review | — | H |
| CB-6 | calculate (pawn race) | S mistake | won-pawn-race on fenBefore, S played other and lost the race | — | "In a pawn race, count the moves to queen for both sides before you push anything else." | | push (once past) | `short` | after | — | H |
| CB-REC | record | — | endgame-technique skill / motif tag | | RED/GREY full; AMBER `short`; GREEN silent | | | | | | holdRate |
n/a: their plan (CB-4 covers the defender seat), strategize middlegame (positional source dropped here — readPosition's card).

## E. Mistake link
- Endgame errors: errorWhy cost in an ending with no material costReason → CB-1/CB-4/CB-6 (positionalReason-like "broke the technique"); needs a `technique-broken` MistakeCause kind.
- mate: costReason `missed` mate / `allowed` mate → CB-2/CB-3 (shared with DT-M1/DT-B1 — dedupe by the mate claim).
- Tactics from the line (source 0) = detectTacticType's source → the motif recipes (tacticInvariant).

## F. Build changes
1. boardComputers.ts:3184 — drop `max: 1`; hand every concept to the door (G4.5: the ranking decides).
2. Add `techniqueBroken(fenBefore, fenAfter, student): ComputedConcept | null` — T named before, absent after, and the eval drop ≥ mistake (errorWhy cost) → cause kind `technique-broken`.
3. `DEFENDER_PRINCIPLE` — cover every `MatchupClass` the defender can hold (rook-endgame: Philidor/back-rank; opposite-bishops: blockade; rook-vs-minor: fortress) → CB-4. New text = owner approval (H).
4. Reorder `full` to rule-first in the recipe, not in the engine.

## G. Proof boards
- Text (lines-0, chat/learn): "You have mate in one with your queen — a forced checkmate is coming unless it is answered right now." (CB-2); "Your king has no square off the back rank, and the back rank can be invaded from e3 — …" (CB-3); "The rook on h4 stands behind the enemy h5 pawn — Tarrasch's rule …" (CB-1 knowledge).
- Guard: positional lead (dropped at the board computer).

## H. Open questions
1. F3: new defender-principle sentences for the remaining ending classes are new teaching text — David's approval.
2. F1: removing `max: 1` means two concepts may speak on one board in chat/Learn — fine under mistakes-only (only on a mistake turn)?
