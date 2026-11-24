# tacticInvariant — card

## A. Identity
- `tacticInvariant(type)` — `src/services/conceptEngine.ts:901-904` over `TACTIC_INVARIANT: Record<Exclude<TacticPatternType,'none'>, Register>` :89-101 (`full` + `short`), names `TACTIC_NAME` :103-108; say-once key `definitionKey` (`def:<type>`).
- Board computer `tacticRule` — `src/services/boardComputers.ts:2132-2145`, kind `rule`, text "Remember — <full>", `squares: []`; Learn wired via CoachTeachPage.
- Census: 3 fired / 3 said (review).

## B. Facts
### B1. Handed over
`Register {full, short}` per pattern: fork, pin, skewer, discovery, double_check, back_rank, removal_of_guard, trapped_piece, mate_threat, overload, battery.
### B2. Dropped / missing
- Keyed on the LIVE pattern vocabulary (`TacticPatternType`), not the record vocabulary (`TacticType`) the mistake cause carries (costReason.motif = detectTacticType). Bridge `TACTIC_TO_PATTERN` (tacticVocabulary.ts:147-171) maps 9 TacticTypes to **null**: `hanging_piece`, `promotion`, `deflection`, `clearance`, `interference`, `zwischenzug`, `x_ray`, `checkmate`, `tactical_sequence` → for those mistake causes the LESSON slot has NO rule. `discovered_check` collapses onto `discovery`.
- The rule is a definition, not a lesson with this board's example — the example must come from the cause's squares (the recipe).
### B3. Cheap
- An exhaustive `Record<MotifId, Register>` (17 motifs, tacticMotifs.ts) — the record's own vocabulary — so every motif a mistake can carry has a rule; geometryReads' `idea` strings already exist for deflection/interference/clearance/zwischenzug (tacticGeometry.ts) and spotCues for all 17.
### B4. Gates
`type === 'none'` → null; unknown type → null; said once per type per game (`definitionKey`).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `full` (the rule) | 9 record motifs have none; needs the board example spliced (recipe) |
| CONSEQUENCE | partly | rule implies it ("so the other falls") | — |
| BETTER MOVE + JOB | n/a | — | not this computer |
| HABIT | no | — | spotCues (`SPOT_CUES[motif]`) is the habit table — same keying |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TI-1 | knowledge (rule) — every motif | both | cause.motif = M (costReason), rule(M) exists | M → rule; cause squares → example | rule(M) with example: "A fork hits two targets at once and only one can escape — their knight on c2 hits your king and rook." (the rule is the frame, the board is inside) | from the rule's tail | (other computers) | spotCue(M) | after | already said this game (definitionKey) → the short form | H (11) / C (9 missing) |
| TI-2 | record (fade) | both | M's hold rate | | RED/GREY: `full` + example; AMBER: `short` ("Fork — two targets, one falls."); GREEN: silent | | | | | | holdRate |
| TI-3 | knowledge (missing motifs) | both | M ∈ {free-piece, deflection, interference, clearance, zwischenzug, x-ray, promotion, mate, discovered-check} | — | free-piece: "A piece is only free if nothing can take back." deflection: "A piece doing a job can be made to leave it." interference: "A guard that works along a line can be cut by a piece dropped on the line." clearance: "Your own piece in the way can move with a threat and open the line." zwischenzug: "Before you recapture, look for a stronger move first." x-ray: "A long piece hits through the piece in front of it." promotion: "A passed pawn near the end is worth a piece — count who stops it." mate: "When mate is on the board, nothing else matters." discovered-check: "A discovered check lets the moving piece take anything — the king must answer first." | | | | | — | C (author from spotCues + geometry ideas; G0: board-free principles are allowed fixed prose, reviewTeachingPoints doctrine (3)) |
n/a: seat (rules are seat-free; the recipe seats the example), phase, plan, calculate.

## E. Mistake link
- The LESSON frame for EVERY material costReason with a motif (allowed and missed, both seats). This is the one place a motif's rule lives — the recipe table reads it by motif.

## F. Build changes
1. conceptEngine.ts:89 — replace `TACTIC_INVARIANT: Record<TacticPatternType…>` with `MOTIF_RULE: Record<MotifId, Register>` (tacticMotifs' vocabulary, exhaustive — a new motif fails to compile until it has a rule); `tacticInvariant(type)` maps a pattern through `PATTERN_TO_TACTIC` → `MOTIF_OF_TACTIC`. Keeps battery/mate_threat (live-only patterns) in a small side table.
2. Author the 9 missing rules (TI-3) as board-free principle sentences.
3. boardComputers.ts:2132-2145 — "Remember — " prefix deleted; the rule is the recipe's LESSON frame with the board example spliced, not a stand-alone line.

## G. Proof boards
- Text (lines-2, review): "Remember — a discovered attack unveils a second attacker by moving the piece in front, so two threats land at once."; "Remember — removing the guard takes away the piece defending a key square, and what it protected falls." (bare rule, no example — the TI-1 change adds it).
- n/a guard: rule never false; the guard is the say-once ledger.

## H. Open questions
1. TI-3 wording for the 9 missing motifs is new teaching text — David to approve the 9 sentences before the build bakes them.
