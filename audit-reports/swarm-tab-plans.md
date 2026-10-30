# Tab plans — every tabia card shows a middlegame plan the games played (2026-10-29)

Branch `worktree-agent-aae44d5b1dbdd1bc2`. Not pushed, no ship-check, no prod
audit (shared CPU) — `npx vitest related`, both typechecks and lint only.

## The root cause, and the fix

The computed plan (`computedPlan.ts`) was read at whatever board a tab's line
ended on, or up to six plies **before** it. Most tab lines stop in the opening,
so most "plans" were the opening's own next moves read at an opening board, and
the structure line on the card was read there too ("win their weak pawn on a7"
on a pawn that had never moved).

Now the plan is read at a **middlegame board at or past the line's end**:

1. **Walk on to the middlegame** with the games course's own walk — exported as
   `gamesCourse.walkToMiddlegame` (the private `walk`, renamed; no second
   walker): the games' most-played moves from the line's end until the board
   is a middlegame. The moves walked are the plan's `approach` (new optional
   field on `MiddlegamePlan`); `lineMoves` stays the moves to where the plan
   line starts.
2. **One middlegame rule** — `isMiddlegameBoard`: both kings settled (castled
   *or castling given up*: `middlegamePly` reads the FEN's castling field) and
   no exchange half-played. Both-castled alone never came true on a line whose
   king had moved (the Grünfeld's …Qxd2+ Kxd2, the Nimzo's Bxf1 Kxf1), so the
   walk ran on waiting for a castle that could not happen; and a line ending
   on …exd4 with Nxd4 to come had its structure read as "your passed pawn on d4
   — push it". The walk plays the recapture first.
3. **Gate C, strictly**: the tabia is the line's end or the middlegame the
   games carry it on to — never a board the line has already left. The
   step-back (≤ 6 plies) is removed: read there, the plan was one the
   student's own line had just turned down (Grünfeld tab: line plays …Bd7, plan
   said "the bishop c8–g4–e6"; KIA: line plays e5, plan said "the exd5 break";
   Marshall: line plays …exd4/e5, plan said "…dxe4"). With it go `floorPly`,
   the "what the line plays past the tabia" filter and `MAX_STEP_BACK` — all
   only served the step-back (G8.5).
4. **Card continuity**: the card shows `criticalPositionFen` (the walked
   middlegame), writes the way there ("The way here: 7.g3 Be7 8.h4 cxd4 …",
   `numberedLine`), and "Watch the way here and the plan" plays it: the plan
   line starts at the tab line's end and plays the approach before the plan,
   through the same `GeneratedLinePlayer` path every built line uses (prefix =
   `lineMoves`).
5. **No plan, no opening board on the card**: with no plan the card shows the
   line's own end only when it is a middlegame board (`tabiaStructureShown`);
   a tab whose games run out before a middlegame shows nothing.
6. **The card's plan is one decision**, `tabPlans.tabiaPlanShown`: the
   hand-written plan anchored at the tabia, else the computed one — also on a
   main tab whose hand-written plans all sit on other lines (was blocked).

Refactor that the measure needed (behaviour-neutral, its own commit): the
84-resolver tab→plan chain moved from the page into `src/services/tabPlans.ts`
(page and measure read one chain); a tab's line in the leaf
`src/services/tabLine.ts`; `computedPlan.tabPlanFor` is the one "plan for a
tab" call (`builtPlanFor` caches it).

## Coverage, every tab (856: repertoire + pro + gambits + anti-openings)

`npx tsx scripts/all-openings/tab-plan-coverage.ts <label>` — the page's own
functions over the stored trees on disk. "Before" is the same script at
`631614e`.

| what the tabia card shows | before | after |
|---|---:|---:|
| hand-written plan | 418 | 418 |
| computed plan | 209 | **38** |
| — read at a middlegame board | 68 | **38** |
| — read at the line's own end | 83 | 20 |
| — read after walking on (approach) | 0 | 18 |
| — read up to 6 plies *before* the line's end (Gate C) | 126 | 0 |
| — a share of 100% | 21 | 0 |
| structure only | 48 | 17 |
| nothing | 181 | 383 |

Of the 38 after: 33 are on tabs that had a computed plan before (18 with the
same headline), 5 are new. Of the 176 before-plans now gone: 54 nothing clears
the bar once recaptures and inflated shares are out, 44 the middlegame board
has under 20 games, 78 the games run out before a middlegame.

**Honest reading:** "a plan read at a middlegame board at or past the line's
end" went from 30 (the before-plans that happened to be read at the line's end
on a middlegame board — some of them recapture headlines or 100% shares) to
38. The large drop in "computed" is the rejected class leaving: opening-board
plans, plans behind the line's end, recaptures called breaks, inflated shares.

## Why 383 tabs show nothing

| reason (where the walk stopped) | tabs |
|---|---:|
| the line's own end is not in the stored trees, before a middlegame | 130 |
| the line is in the middlegame but its end board has < 20 games | 114 |
| walked on, the games ran out before the kings were settled | 63 |
| middlegame board reached, nothing clears the 15% bar | 74 |
| walked on to a middlegame board with < 20 games | 16 |
| the line ends in mate | 3 |
| *(17 of these show the structure: the line ends on a middlegame board)* | |

Almost all of it is DATA: the curated tab lines (pro lines especially) run 16–30
plies, past where the stored trees hold their boards (master tree: 10+ master
games to move 20; online tree: 30+ games). The step-back hid this by reading
earlier boards. More plans need deeper/broader trees (an offline build), not a
looser reader.

## The 30-plan read (`scripts/all-openings/tab-plan-read.ts`)

Every claim checked with chess.js on the board it is made about: the board is
the line + approach replayed; it is a middlegame board; Gate C (the plan's line
moves are the whole tab line); every break the student's seat (…X for Black)
with a pawn on its file; every route a student piece on its first square with
legal geometry per hop; every share ≤ 100%; the plan line legal from the line's
end, through the approach, arrows aligned; the card's structure sentence (each
pawn named is there, owned, isolated/passed as said; start-square pawns
flagged; each lever named has a pawn on its file); then read by eye with the
board. Full read with boards: `audit-reports/tab-plan-read-after.md`.

**Round 1** (walk added, step-back still on) — 0 failed mechanical checks, but
the eye found five classes that read wrong; each fixed at its producer:

| read wrong | producer fix |
|---|---|
| "The axb4 break — 100% played axb4" (English Ultra-Symmetrical: the recapture of …cxb4); London/Nimzo-Larsen "dxe5", Najdorf "…dxe5", Moscow "axb6", Reti "bxa3", Nimzo "exd4", Ruy "cxd4" after …exd4: taking what the opponent just put there | `isPawnBreak(fen, san, lastTo)`: a capture of the piece/pawn that landed with the opponent's last move, or en passant, is not a break (required param, threaded through the walk) |
| Grünfeld "bishop c8–g4–e6" while the line plays …Bd7; KIA "exd5" while the line plays e5; Marshall "…dxe4" while the line plays …exd4 | the step-back removed (Gate C) |
| "100% played axb5" (Sämisch: 11 of 42 games) — a thin board's unwalked replies handed to the one walked | shares are of ALL the board's games (unwalked replies keep their share out) |
| "French-type pawn chain — you hit d4 with …c5" after …cxd4 cxd4 (no c-pawn) | `nextPlans.namedPawnStructure`: a lever is named only while its pawn exists (…c5: c7/c6/c5; …f6: f7/f6); none → not named |
| KID "your passed pawn on d4 is the trump — push it" on …exd4 with Nxd4 to come | `isMiddlegameBoard`: no exchange half-played; the walk plays the recapture |

**Round 2** (final code) — 30 of 38 computed plans read: **30/30 pass every
mechanical check**, and by eye every claim is true on its board and from the
student's seat. Sample: Alapin 2…e6 "…f6 break, 59% of 252" with "French-type
chain — you hit e5 with …f6"; KID Classical "…f5 break, 98% of 902"; French
(Eric Rosen, Nd2) way here 9 plies → "knight f6–e4–g5, 25% of 418", structure
"They have the isolated pawn on d4"; Caro-Kann (Carlsen) way here O-O →
"bishop c8–g4–h5, 48% of 215"; Anti-KID Sämisch "axb5 break, 18% of 42" (the
b5 pawn had stood two moves).

Notes from the read (not wrong, worth knowing): some headlines are low shares
(Grünfeld …f5 17%, Nimzo-Larsen c4 16%) — the top fact over the 15% bar; four
plans have an approach but no playable line (< 4 plan moves had 10+ games) —
the card writes the way, and its button opens the plan study ("Watch the plan
from here"); two Samay Italian tabs and two Aman Nimzo tabs end on one board,
so they show the same plan (their lines are the same in the data).

## Tests (each fails on the old code)

- `computedPlan.test.ts`: walks an opening-board line to the middlegame (board,
  `lineMoves`, `approach`, the plan line starts at the line's end and plays the
  approach); no plan when the games run out before castling (old: "the d4
  break" at the opening board); no plan before the middlegame a few plies back;
  no plan on a board the line has left; a recapture is not a break; shares over
  all games (18%, old 100%); a mid-exchange end is walked through.
- `gamesCourse.test.ts`: `middlegamePly` (castling given up counts),
  `isMiddlegameBoard` (exchange half-played), `walkToMiddlegame`.
- `tabPlans.test.ts`, `TabiaCard.test.tsx` (the way written, numbered; the
  button label), `OpeningDetailPage.wiring.test.ts` (the card reads
  `tabiaPlanShown`, gated by `tabiaStructureShown`; no resolver re-typed in the
  page), `positionReadingService.test.ts` (French levers), `numberedMove.test.ts`.

## Audit contract updated, not run

`scripts/audit-all-openings-page-prod.mjs` B2: its positive control was the
Mengarini …e6 tab, whose plan was read at an opening board — it now shows no
plan and no card (negative), and the positive control is Naroditsky's
Caro-Kann main line (stops at move 7, walked 6 plies to the middlegame; the
card must show the plan and "The way here"). Run it on prod after merge.

## For David

- **The step-back is gone** (behaviour): 126 tabs showed a plan read up to six
  plies before their line's end; in the sample, 3 of 12 contradicted the line
  the student had just learned. Gate C reads "the terminal position or one
  continuing it". If you want plans on boards the line passed through, that is
  your call — it would bring back about 40 tabs.
- **Shares are counted, not estimated**: unwalked replies no longer inflate a
  share (100% → 18% on the Sämisch). This lowered some plans under the 15% bar.
- **Most tabs need more data, not code**: 244 tabs' lines run past the stored
  trees on their own moves.
