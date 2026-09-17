# Surface Map — standing-fact refrains (#40)

David 2026-09-16: *"Once a plan is announced we can use common language to
readdress it. 'Don't forget about the isolated pawn', 'don't forget about their
plan to pressure the open file.'"*

## 1. The evidence (measured, not remembered)

`audit-reports/review-overhaul-2026-09-16T22-01-53-813Z` — his Alapin, 33
narrated plies. Clauses repeated 3+ times:

| times | plies | clause |
|---|---|---|
| 11 | 15,16,17,19,21,22,23,24,26,38,39 | `… is isolated — a target you can pile on` |
| 8 | 12,15,18,27,30,33,36,39 | `the shift is positional` |
| 7 | 16,19,21,22,23,24,26 | `their pawn on d4 is isolated` |
| 4 | 27,30,33,36 | `the new pressure the move creates, and the lines it opened and what it gave up` |
| 3 | 22,27,36 | `1 attacker to 0 defenders` |

Seven CONSECUTIVE plies re-taught the same d4 pawn at full length. The verdict
word itself repeating ("you were clearly better", 7×) is correct — that is the
state of the game, not a lesson.

## 2. The composers

Both call the same STATELESS leaf, so neither can know it has said this before:

- `reviewPositionalAssessment.assessPositionalEdge(fen, seat, cp)` →
  `{verdict, reasons[]}`. The isolated-pawn string is one literal,
  `reviewPositionalAssessment.ts:122`. Seven reason kinds: bishop pair, outpost,
  open file, enemy isolated/doubled pawn, own passer, development lead.
- **per-ply** `reviewFullData.ts:415` → `[verdict] You're <word>: <reasons>.`
- **projection terminal** `coachFeatureService.ts:2779 verdictAtEnd` →
  `— and you're <word>: <reasons>`.

`[eval]`'s tail (`reviewFullData.ts:350`) is a different shape: its "reasons"
are POINTERS to facets already spoken in the same ply. Nothing to refer back
to — that one strips.

## 3. Why the existing machinery did not catch it

`REFRAINS` + `applyRefrainOnce` (coachFeatureService.ts:1274) already teaches a
principle once and strips the tail after. Two reasons it missed:

1. Neither clause is registered in the list.
2. It runs inside `buildReviewSegments` only, over facet strings. The projection
   terminals are composed later, in `augmentWithProjections`, which never sees
   it — 7 of the 11 repeats are projections.

## 4. Blast radius

`assessPositionalEdge` has THREE consumers, all review:
`reviewFullData` (per-ply facet), `coachFeatureService:2288` (the once-per-game
"step back and take stock" beat), `coachFeatureService:2782` (`verdictAtEnd`).
**No live/Learn/chat/tactics consumer.** So this change cannot reach Learn,
Play, the openings WLPP or the kid surfaces.

Gates/audits owed: `audit-review-overhaul-prod.mjs` (review), and per the
two-audits rule `audit-concept-gameplay-prod.mjs` (Learn) to prove it did NOT
reach there.

## 5. The design

A post-pass, not a fourth composer. `applyStandingRefrains(segments)` runs in
`generateReviewNarration` AFTER projections land, walking plies IN ORDER with
ONE ledger. That ordering is load-bearing: a ledger split across the two
composers would let a projection at ply 12 render a callback to a full form the
per-ply pass only speaks at ply 20 — a reference with no antecedent.

Keyed on `kind + square`, so a NEW isolated pawn re-teaches in full (d6 → d4 →
a3 → b4 in this one game) and only the SAME pawn shrinks.

## 6. Open, deliberately not built yet

The imperative form ("Don't forget about their isolated pawn on d4") needs two
things the terse form does not: a NEED GATE (silence it when the student is
already attacking or blockading the square — otherwise it is a scold) and a
CADENCE. It is also tense-odd in review's retrospective register. Build the
reference first, read it on a real game, then decide.

## 7. "A third composer bypasses the fold" — CHECKED 2026-09-17, it does not

Raised as a suspected hole and disproven by reading the call order, so nobody
re-derives it:

`assessPositionalEdge` has exactly three consumers and **all three land in
`segments[].narration` before the fold runs**:

| consumer | where | when |
|---|---|---|
| per-ply `[verdict]` facet | `reviewFullData:415` | inside `buildReviewSegments` |
| "step back and take stock" | `coachFeatureService:2297` | inside `buildReviewSegments` |
| projection terminal `verdictAtEnd` | `coachFeatureService:2791` | inside `augmentWithProjections` |

`generateReviewNarration` awaits `augmentWithProjections` (4048) and only then
runs the fold (4080). So the ordering the design called for is the ordering the
code has, and there is no fourth path. If a NEW composer is ever added it must
write to `segment.narration` before that line — that, and not the fold, is the
thing to check.
