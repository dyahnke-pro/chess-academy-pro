# computeMustDefend — the null-move threat probe

## A. Identity
- File: `src/services/threatOut.ts`. Functions: `computeMustDefend(fen, subject)` (122), `mustDefendPieces` (132), internal `mustDefendRead` (136), `boardFact` (113); sibling `newThreat` (188), `hasMateThreat` / `mateThreatsAgainst` (63–73).
- Registry read: `boardComputers.ts` `mustDefend` (3105–3141), kind `must-defend`, seat `opponent`, renderer `teachingSentence.renderMustDefend` / `renderMustDefendHit` (461–470).
- Reach (`docs/computer-reach.json`): learn **yes** (focus runner), review, lesson, chat, tapped, tactics — all yes. 30 other modules call it (threatProof 8, counterThreat 5, boardUrgency 5, groundedAnswer 5, obligationLifted 3, opponentMoveReads 4, tradeKept 2, tensionRelease 2 …).
- Census: Learn 74 lines (60 said, 14 held `in-flux`), chat 149 (110 said; 39 held, 47 `in-flux` + 6 `beside-mate` across both). Every Learn line is the PRE-MOVE warning ("Their pawn on d4 attacks your bishop on c5, and nothing defends it — and you can take the attacker…"), which the new Learn deletes.

## B. Facts
- **B1 handed over** (`MustDefend`, 24–31): `net` (biggest SEE-loss in points, 0 = nothing), `pieces[]` each `{square, piece, value = min(capture value, SEE gain) (175), attacker (cheapest legal capturer), attackerSquare, defenders (count of subject guards)}`, highest value first.
- **B2 computed and dropped:**
  - `hanging[].gain` from `findHangingBySee` (172) — the SEE net is folded into `value = Math.min(VALUE, gain)` (175); the exchange order is walked inside `legalSeeGain` (positionReadingService.ts) but never returned by it, so exposing the line needs `legalSeeGain` to return its sequence too (not free).
  - `hanging[].defended` (`HangingPiece.defended`, positionReadingService.ts 408) — whether the piece is GUARDED and loses the exchange to a cheaper attacker vs plain undefended — is dropped by the `.map` at 175. This is exactly the MD3 vs MD4 split ("loses the exchange" vs "hangs"), already computed.
  - `boardFact` sorts every capture (`caps`, 117) and keeps only the cheapest; the number of attackers is never returned (only `defenders`).
  - `probeFen` (the null-move board) is used and thrown away — the board on which the threat is proven.
  - Whether the subject was the side to move (null-move used, 142–153) — i.e. "it's a THREAT next move" vs "it hangs NOW (they're to move)".
- **B3 cheap to add (chess.js on the same board):**
  - `attackers` count (`b.attackers(square, foe).length`) beside `defenders` → the count lesson.
  - `midTrade`: the piece just captured something worth ≥ itself and can be taken back without loss (the test `detectNewThreat` already runs, groundedAnswer.ts 7616–7628) — today a piece in the middle of a trade is reported as hanging (run: Bxf6 g-0 ply 17, Nxh5 ply 33, Bxf8 ply 35 — all trades in progress).
  - `wasHanging`: the same piece hung on the board before the move (diff of two calls — `counterThreat` already does it, counterThreat.ts 47–51) → tells "you left it" from "you didn't answer it".
  - `moved`: the hanging piece is the one that just moved (square === move.to).
  - `answers[]`: the ways the board meets it — `describeThreatPrevention` (groundedAnswer) already returns escape / hit-guard / add-defender / step-off.
- **B4 gates:** null when the subject is to move and in check (149); null when the flip is illegal (`flipSideToMove`); kings excluded (174); a piece counts only when its SEE net > 0 (176). The registry speaks only `net >= 3` (boardComputers 3113) — pawns never speak. "Winning" framing at `studentCp >= 200` (3116). Downstream veto `boardState.boardVeto` 'in-flux' (164) is what holds 47 of the census lines — the computer itself has no trade-in-progress guard.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | piece, square, attacker, defenders | the rule is never said; only the board ("X attacks Y, nothing defends it") |
| CONSEQUENCE | partly | `net` (points) | the exchange line (B2), "next move" vs "now" |
| BETTER MOVE + JOB | no | — | the answer that kept the piece (`describeThreatPrevention` exists, not joined) |
| HABIT | no | — | a habit string keyed to the cause (`threat-ignored`, `left-hanging`) |

## D. Lesson recipes
Causes: **IGN** = a piece hung to their move before the student's move and still hangs after it (`wasHanging && stillHangs`, cost ≥ mistake); **LEFT** = the student's move made a piece hang that did not (`!wasHanging && hangs && !midTrade`); **OPP-LEFT** = their move left a piece of theirs hanging and the student's move did not take it (student cost ≥ mistake, `computeMustDefend(fenAfterTheirMove, them)` net ≥ 3, the student's best move captures it).

| id | angle | seat | condition | slots (field → word) | LESSON stems (rotated) | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MD1 | recognize | S | IGN | piece, square, attacker | "Their threat comes before your plan: the {attacker} still hits your {piece} on {sq}." / "Answer what they threaten first — your {piece} on {sq} is still under the {attacker}." | "Now they just take it: {net} points." | "{best} kept it — {job: escape/guard/hit-guard}." | "Every move, start with their last move: what does it attack?" | lesson + consequence; no move names | midTrade; their capture loses to a counter-tactic (`captureHasCounterTactic`) | H: piece/attacker; C: wasHanging (2 calls) |
| MD2 | count | S | IGN or LEFT, attackers > defenders ≥ 1 | attackers n, defenders m | "A guarded piece can still fall: two attackers beat one defender, and your {piece} on {sq} has one." / "Guarded isn't safe — count: {n} of theirs on it, {m} of yours." | "They take, you take back, they take again." | "{best} added the second guard." | "Count attackers against defenders, not just 'is it guarded'." | same | attacker count from chess.js, pinned guards excluded (`legalSee`) | C: attackers count |
| MD3 | knowledge (cheaper attacker) | S | value(attacker) < value(piece), defenders ≥ 1 | attacker, piece | "A defender doesn't help when the attacker is cheaper: their pawn on {a} wins your {piece} for a pawn." / "When a pawn attacks a piece, the guard behind it doesn't matter — you lose the difference." | "You get a pawn back, they keep {piece}." | "{best} moved it." | "When a cheaper piece hits yours, move it — don't count guards." | same | attacker value ≥ piece value | H: attacker, piece |
| MD4 | recognize (left it) | S | LEFT, the moved piece hangs | piece, square, attacker | "A piece is only safe where nothing can take it for free: on {sq} the {attacker} takes your {piece}." / "Before a piece lands, ask who can take it there." | "{net} points for nothing." | "{best} — the square {to} was covered." | "Before you let go, ask: what can take it where it lands?" | same | midTrade (C); the piece is defended enough after SEE (net 0) | C: moved |
| MD5 | recognize (left another) | S | LEFT, a piece that did NOT move hangs | the moved piece (was its guard), the hanging piece | "Moving a piece can leave another one bare: your {piece} on {sq} lost its guard." | same | "{best} kept the guard." | "Before you move a defender, ask what it was guarding." | same | overlaps `whyItFailed` 'abandoned-defender' — one cause, one recipe | C: diff of guards (`whyItFailed` already) |
| MD6 | opponent seat | O | OPP-LEFT | their piece, square | "When they leave a piece undefended, take it before anything else: their {piece} on {sq} was free." / "Free material is the first thing to check after their move." | "That was {net} points on the board." | "{best} took it." | "After their move, look for what they left loose." | Learn: after the student's move only | the capture walks into a counter-tactic; mid-trade (their piece is about to be taken back anyway) | H + C: best move captures sq |
| MD7 | prevent / strategize (winning) | S | IGN while studentCp ≥ 200 | standing | "When you're winning, the only way to lose is to let them hit back: your {piece} on {sq} was still loose." | "A won game becomes a fight again." | "{best} took the risk away." | "Ahead, ask first what they can hit." | same | — | H: winning flag |
| MD8 | combination (+ counterThreat) | S | IGN but the student's move hit a bigger piece | — | handled by `counterThreat` (answer a threat with a bigger one); MD1 must not fire | — | — | — | — | counterThreat fires | H |
| MD9 | consequence after the exchange | both | net from SEE < piece value | net | "The exchange still loses {net} — the recapture doesn't make it even." | — | — | — | — | net == value (plain loss, no exchange to explain) | C: SEE line (B2) |
| MD10 | phase: endgame | S | IGN/LEFT, few pieces | — | "In the endgame a lost piece is usually the game — there's nothing left to win it back with." | — | — | — | — | queens on / > 2 pieces each | C: material count |
| MD12 | combination (+ mate threat) | S | IGN/LEFT and `hasMateThreat(fenAfter, student)` (threatOut.ts 69) | — | "When a piece hangs and they also threaten mate, the mate comes first: they don't need the piece." | "…they can mate instead of taking." | "{best} met the mate threat." | "Before you count material, look for their checks." | same | mate threat absent; mate cause (E1) already owns the turn | H: `hasMateThreat` |
| MD13 | evaluate (hanging vs loses the exchange) | S | IGN/LEFT, `defended` true (B2) | piece, attacker | "A guarded piece can still be lost to a cheaper attacker: the guard only gets a pawn back." | "You get the {attacker} back, not the {piece}." | — | MD3 habit | same | `defended` false → MD4 wording ("nothing guards it") | C: pass `defended` through (F1) |
| MD11 | record | S | — | — | RED/GREY full · AMBER "Their threat first — your {piece} on {sq}." · GREEN silent | | | | | | H (`holdState` on `threat-ignored` / `hanging-piece` tags) |

Angles that do not apply: *own plan / their plan* (no plan computed — a single-move probe; plans come from pictureCounterplay); *calculate a line* beyond the SEE (the probe is static; the line is `provenThreatLine`'s card); *counterfactual timing* (one board).

## E. Mistake link
- Student: `costReason` **allowed** + motif `hanging_piece` (MD4/MD5), `whyItFailed` **lost-the-piece** (MD4), **abandoned-defender** (MD5), the "ignored threat" case — a `costReason` **allowed** whose first blow captures a piece that hung BEFORE the move (MD1–MD3; today no `MistakeCause` member names it: see F1).
- Opponent: `costReason` **missed** for the student (their piece was free and the student didn't take it) → MD6. Their mistake of leaving a piece hanging that the student DID take is not a mistake turn (silence).
- Review/chat only: the pre-move warning (every line Learn says today).

## F. Build changes
1. `threatOut.ts` 24–31: add to each piece `defended: boolean` (pass through `HangingPiece.defended`, 175 — free), `attackers: number`, `exchange: string[] | null` (needs `legalSeeGain` to return the capture order it walks — positionReadingService.ts; one extra array per call), `midTrade: boolean`, `moved: boolean | null`; add top-level `probeFen`, `asThreat: boolean` (subject was to move). Enables MD2, MD3, MD4, MD9 and the guard. Cost: one `attackers()` call per piece.
2. `threatOut.ts`: add `export function mustDefendDiff(fenBefore, fenAfter, subject): { ignored: Piece[]; left: Piece[]; answered: Piece[] }` — the IGN/LEFT split (two calls, already done ad hoc in `counterThreat` 47–51 and `obligationLifted`); one function so the three callers share it.
3. `errorWhy` / `MistakeCause`: add `threat-ignored` (IGN) as a cause distinct from `allowed hanging_piece` — the run found 18 student-side threats on boards where the opponent's move threatened and the student then lost ≥ 100 (g-1012441262 ply 16 …Bg4 hitting Qf3).
4. Mid-trade guard IN the computer (not only `boardState` 'in-flux', 164): copy `detectNewThreat`'s `midTrade` test (groundedAnswer 7616–7628). Miss board it must not fire on: g-1001055178 ply 17 `Bxf6` (r2qk2r/ppp1bpp1/2n1pn1p/3p2B1/3P4/1P3PP1/P1P2PBP/RN1Q1RK1 w kq - 0 9): "bishop on f6 hangs to the g7 pawn" — it is the trade.
5. Delete the pre-move Learn warning renderer path (`renderMustDefend` 'winning'/'takeable' framing) from Learn; keep it for chat ("what are they threatening?") and Review.
7. (moved from §H, a build question) An ignored threat whose cost is paid only after a forced line the probe can't see belongs to `costReason` (`allowed`, `blowPlies` > 2) — this card fires only when the probe itself finds the piece on the board after the student's move; the cause picks the deeper reader when both exist.
6. Recipes MD1–MD7, MD12–MD13 go into `mistakeLesson` keyed on the causes above; the computer keeps no prose for Learn.

## G. Proof boards (run on saved games, chess.js only)
- MD1/MD6 (their threat): g chesscom-1012441262 ply 16 …Bg4, fen before `r1bqk2r/ppp1p1bp/2np1np1/6N1/3PP3/2P2Q2/PP3PPP/RNB1K2R b KQ - 0 8` → `{net 6, f3 queen, attacker bishop g4, defenders 2}`.
- MD3 (cheaper attacker): g chesscom-1001055178 ply 16 …h6 (`r2qk2r/ppp1bppp/2n1pn2/3p2B1/3P4/1P3PP1/P1P2PBP/RN1Q1RK1 b kq - 0 8`) → bishop g5 hit by pawn h6, defenders 0.
- MD6 (their piece loose): g chesscom-1012441262 ply 44 …Nxe4 cost 255 → their knight on e4 `net 3, defenders 0, attacker knight d2`.
- Guard (mid-trade, must not fire): g-1001055178 ply 17 Bxf6; g-1012441262 ply 35 Bxf8 (rook taken, …Rxf8 is the recapture).
- Census: lines-0.jsonl:363 (held in-flux), lines-0.jsonl:1650 (winning framing said).

## H. Open questions
- Should Learn, after the student's move, say MD6 (their piece was free) when the student played a fine move that still won less than the capture (cost 50–99)? The goal says "only on a mistake": what is the cp floor for "mistake" in Learn — inaccuracy (50) or mistake (100)?
