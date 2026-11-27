# attackerDefenderCount — card

## A. Identity
- `attackerDefenderCount(fen, studentColorWB)` — `src/services/reviewTeachingPoints.ts:68-133` (M2); words `countSaid(reads, fen)` :141; `pieceHasSafeEscape` :169.
- Board computer `count` — `src/services/boardComputers.ts:4447-4470`, kind `count`, claims `count:<board>`, `tempo` idea claim, `loose:<sq>` claim; lesson / review / chat / learn-via-thought.
- Census: 211 fired / 140 said (review 70, lesson 141); held: already-said 30, in-flux 25, unsupported 9.

## B. Facts
### B1. Handed over (`CountRead`)
`text`, `square`, `tempo` (piece can step away — it's the opponent's move and it has a safe escape), `piece`, `attackers`, `defenders`.
### B2. Dropped
- `net` = pin-aware SEE gain (`legalSeeGainOn`, :115) — the material it actually wins is computed and not handed over (only "it falls").
- The capture `cap` (the first legal capture on the square, :113).
- `captureHasCounterTactic` result (:117) — candidates rejected because the capture walks into a counter-tactic: a computed "it looks outnumbered but taking walks into X" fact (the patternFails lesson) dropped.
- The ATTACKERS' and DEFENDERS' identities — only counts; "two attack it: the rook on c1 and the bishop on b2" not handed over.
### B3. Cheap
- The defender-side count for the student's own piece (deliberately skipped, :75-77, sacrifice collision) — compute it ONLY on a mistake turn where errorWhy says a piece was lost: "your knight on e5 was attacked twice and guarded once".
- Who added the decisive attacker (diff with fenBefore) → the move that made it fall.
### B4. Gates
- Enemy non-pawn non-king pieces only (offensive, :107); atk > def (:111); legal capture exists (:114); SEE > 0 (:116); no counter-tactic (:117); tempo split when it's their move and the piece can escape (:123-124).
- Pawns excluded (:107) — a pawn outnumbered never counts.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "count the attackers and defenders … more attackers than defenders, so it falls" | reorder rule-first; drop the "on their knight on e5" restatement lead |
| CONSEQUENCE | partly | tempo flag ("has to move, costs them the tempo") | net material (B2) |
| BETTER MOVE + JOB | no | — | "Rxe5 was the move — the second attacker wins it" (needs `cap` and who added it, B2/B3) |
| HABIT | yes | the count IS the habit | spotCue free-piece `underdefended` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AD-1 | calculate (their slip) | O's move left their piece outnumbered; S to move | reads non-empty, !tempo, O's move graded mistake+ | square, piece, atk, def, net | "Count before you trade: more attackers than defenders and the piece falls. Their knight on e5 is attacked twice and guarded once." / "Two against one wins. Their bishop on g5 has one guard and two attackers." | "Taking wins a piece." (net B2) | n/a (S to move — the move is held in Learn) | spotCue free-piece `underdefended` | Learn after THEIR mistake: the lesson + target, never the capture (the target square points at the student's next move — see §H1) | tempo=true (it can step away) → AD-3 | H + B2 |
| AD-2 | calculate (S missed it) | S played elsewhere while a read was !tempo; cost ≥ inaccuracy | read on fenBefore S move | same | "When their piece is attacked more than it's guarded, take it before it gets help. Their knight on e5 was outnumbered." | "It was a free piece." | "Nxe5 was the move — two attackers on one guard." (cap, once past) | count habit | after, past-only | still available after reply → hold | H + B2 |
| AD-3 | consequence (tempo) | O | tempo=true | — | "An outnumbered piece that can run costs a move: it has to step away." | "That's a tempo for you." | | | Review | — | H |
| AD-4 | prevent (own piece) | S's move left own piece outnumbered → lost | B3 own count, errorWhy lost-the-piece / abandoned-defender | own square, counts | "Count your own pieces too: your knight on e5 had two attackers and one guard." | "So it was lost." | errorWhy best ("Qd4 added the second guard") | "After every move, count attackers and guards on the pieces you just left." | after | sacrifice (errorWhy says it was planned: deepCombination) → silent | C |
| AD-5 | exception (counter-tactic) | both | candidate rejected by `captureHasCounterTactic` | B2 | "Outnumbered isn't always lost: taking can walk into a tactic. Look one move past the capture." | | | | Review; → patternFails card | — | B2 |
| AD-6 | knowledge (value, not count) | both | atk ≤ def but cheaper attacker (SEE>0) | — | "Counting isn't everything: a pawn attacking a knight wins it however many guards it has." | | | spotCue free-piece `attacked-by-smaller` | Review | the count rule would say "safe" | C (SEE with atk≤def — not this computer today) |
| AD-REC | record | — | `hung-material` / `missed-your-free-piece` | | RED/GREY full; AMBER "Their knight is outnumbered — two against one."; GREEN silent | | | | | | holdRate |
n/a: phase (any), strategize/plan (tactical count).

## E. Mistake link
- costReason `missed` motif `hanging_piece`/`free-piece` (S) → AD-2; seat O mistake (their move left it) → AD-1 (Learn after THEIR mistake).
- whyItFailed `lost-the-piece`, `abandoned-defender` → AD-4 (own count, B3).
- secondAttacker card covers the move that ADDS the attacker (AD-2 better-move job).

## F. Build changes
1. reviewTeachingPoints.ts:113-131 — add `net`, `capture {from,to,san}`, `attackerSquares`, `defenderSquares` to `CountRead` → AD-1/2.
2. :117 — collect rejected counter-tactic candidates as `refuted: {square, reply}` → AD-5 / patternFails.
3. New `ownCount(fen, square, student)` (same body, student's piece, no SEE gate) — called only from the mistake recipe when errorWhy kind ∈ lost-the-piece/abandoned-defender → AD-4.
4. `countSaid` deleted from speech; recipe table words it. Keep `loose:` / `tempo` claims for dedupe.

## G. Proof boards
- Voiced boards: vc-_4xbS0Crtic-12 (with secondAttacker: rook adds a 2nd attacker on e4 — the count line co-fires).
- Text (lines-0, review): "Count the attackers and defenders on their bishop on g5: two attack it and only one guards it — it's outnumbered, so it has to move, and that costs them the tempo." (AD-3); held: "…their knight on e5: one attacks it and nothing guards it — more attackers than defenders, so it falls." (AD-1).
- Guard: student's own sacrificed piece (AD-4 guard).

## H. Open questions
1. AD-1 is a lesson on the OPPONENT's mistake that the student can punish now — Learn speaks it after their move without naming the capture (target only). Confirm that is a "mistake turn by either side" the student should hear BEFORE they reply.
