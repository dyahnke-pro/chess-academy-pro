# PLAN — Middlegame plans must START where the opening leaves off

**Branch:** `claude/vienna-middle-game-plans-ldrf7a`
**Opened:** 2026-06-23 · David
**Status:** design locked, awaiting seam decision (see Decisions log) before Phase 1 build.

## The problem (David, verbatim intent)

> "In the Vienna game, the middle game plans end where the opening ends. The
> middle game plans need to start where the opening leaves off. And all I want
> in middle game plans are key pawn breaks and ideas."

Two defects to fix on every affected plan:

1. **Continuity** — the plan's `criticalPositionFen` sits at or BEFORE the
   opening Watch lesson's terminus, so the plan REPLAYS moves the student
   already watched and terminates at the same move. It must instead start at
   the opening's terminal position and go FORWARD.
2. **Accuracy (NOT reduction) — David 2026-06-23: "I do not want a reduction
   everywhere, I want accurate middle game plans throughout my app."** The
   content TYPE is key pawn breaks + ideas (not an opening replay), but each
   plan must be as RICH and COMPLETE as the position genuinely is — all the
   real breaks (surface every one when 2+), all the real ideas (typically ≥2),
   and the real piece maneuvers/plans where they exist (piece plans ARE ideas —
   do NOT strip them). A rich position gets a full plan; a simple/positional one
   gets fewer breaks (or 0 — empty beats invented). The bar is TRUTH for that
   position, never a mechanical trim to a stub. The Vienna proof was rebuilt to
   this bar: e5 + …d5 breaks, the f5 outpost, the Bc2-Qd3 battery, the h4 answer
   to …g6 — kept the queen-lift + outpost maneuvers, did not reduce.

Proof case (`mp-viennagame-classical`): the Vienna Watch (`vienna.ts`) walks
`…Ne2 Bb6 c3 Nc5 Bc2 Bg4 Ng3 Nh5 d4 …Nf5`; the plan anchors at move 8 (before
`Ne2`) and replays those exact 10 plies — overlap = 10. Both finish on `d4`.

## Detection — how the affected plans were found

Read-only sweep (`scratchpad/overlap-report.json` + `overlap-summary.md`):
for each opening, replay its lesson family (main + variation `moves[]` arrays)
with chess.js into a set of board-FENs; for each of the 529 plans, replay its
`playableLines[0].moves` from `criticalPositionFen` and count how many of those
positions fall INSIDE the opening's FEN set. Anchor-inside-opening + early moves
re-treading taught positions ⇒ OVERLAP.

**Results: 529 scanned → 66 OVERLAP · 461 CLEAN · 2 no-lesson · 0 unknown/error.**
35 openings have ≥1 overlap. 59 of 66 have the anchor itself sitting inside the
taught FEN set (strong signal); 47 re-tread ≥3 plies.

Caveat (from the sweep): detection is a FLOOR not a ceiling — multi-id variation
files over-include FENs, which can only hide a real overlap (false negative),
never invent one. Re-run the detector after fixes to confirm CLEAN.

### Affected plans (full list)

See `scratchpad/overlap-summary.md` for the table. Worst offenders:
ruy-lopez (10), nimzo-indian (4), benko-gambit / birds-opening /
scandinavian-defence / sicilian-dragon (3 each). The deep replays:
`mp-birdsopening-main` (11), `mp-nimzoindian-saemisch` (11),
`mp-sicilianalapin-main` (11), `mp-frenchdefence-exchange` (10),
`mp-viennagame-classical` (10), `mp-evansgambit-main` (9),
`mp-ruylopez-breyer`/`-zaitsev` (8–9).

### Two sub-categories to handle separately
- **`-endgame` plans (≈7, mostly ruy-lopez):** overlapPlies 0 but flagged
  because `playableLines[0]` starts from move 1 and walks the whole opening to
  show the opening→endgame transition. These are ENDGAME plans
  (`EndgamePlansSection`), governed by the endgame doctrine (Gate C: anchor at
  the transition FEN). Triage in a dedicated phase; do NOT lump with middlegame.
- **`bird-opening` vs `birds-opening` id typo:** `mp-bird-classical-attack` and
  `mp-bird-stonewall-formation` use `bird-opening`; the lesson + sibling plans
  use `birds-opening`. This mis-routes in the app. Fix the id (Phase 0).

## The fix — per overlapping plan

1. **Re-anchor** `criticalPositionFen` to the opening Watch lesson's TERMINAL
   position for that variation (the FEN the last beat leaves the student on).
   Opening→middlegame is one continuous line (G9.3 Gate C).
2. **Rebuild the content ACCURATELY for the new (post-opening) position — not a
   trim.** Replace the opening-replay with the REAL plan from the terminus:
   `pawnBreaks` (every break the position genuinely has), `pieceManeuvers` (the
   real piece plans — keep them, they're ideas), `strategicThemes` (all the real
   ideas, typically ≥2). The `playableLines` demo must START at/after the
   terminus and DEMONSTRATE the plan (a student move landing on a declared
   break/maneuver goal square — `middlegamePlanThemes` gate), with lead-the-eye
   arrows/highlights whose targets are NAMED in each move's annotation and whose
   vision arrows have a genuinely CLEAR sight-line (`middlegamePlanner` gate —
   verify sightlines with chess.js, a blocked diagonal arrow fails). Rich
   position → full plan; simple/positional → fewer breaks (or 0). Truth, not a
   stub.

## How the two things are determined + sourced

**Pawn breaks — from DATA, never memory (G3):**
- Take the opening's terminal FEN. Query the masters explorer through our own
  proxy — `/api/lichess-explorer?source=masters&play=<uci>` — for what masters
  actually play FROM that position. Frequency-rank; the recurring PAWN levers
  are the candidate breaks.
- Read the terminal pawn skeleton to see which levers structurally EXIST; keep
  only the ones masters actually employ. chess.js-validate every move.
- **2+ breaks:** list them all when the data shows more than one.
- **Positional structures:** if piece maneuvers/prophylaxis dominate and pawn
  levers are rare or score badly, the plan is maneuvering — return 0 breaks and
  say so. Empty > invented.
- **Verify** the chosen breaks against the internet (web search of the
  variation's mainstream plans) AND the book corpus before locking.

**Ideas — book corpus is the source of truth, then mainstream understanding:**
- Author from `chess-concepts.json` / `opening-book-pages.json` (Lasker /
  Capablanca etc.) for the universal principles, plus the established
  consensus understanding of the line ("right ideas, elegantly taught" —
  translate, don't invent). Modern openings: corpus covers the PRINCIPLES even
  when not tagged by name.
- ≥2 ideas where the position has them.
- Record every idea's `sources[]` (`concept:` / `book:<id>` / reputable URL).
  `narrationSources` must resolve them; `narrationAccuracy` keeps the prose
  board-true.

## Gates that must stay green
`middlegamePlanThemes`, `middlegamePlanner`, `MiddlegamePlansSection`,
`EndgamePlansSection`, `narrationAccuracy`, `OpeningDetailPage.wiring`,
`npm run ship-check`. Re-run the overlap detector after each batch → CLEAN.

## Scope (David 2026-06-23): ALL 529 plans, accurate
Not just the 66 overlaps. Every middlegame plan must be accurate: start where the
opening leaves off + carry the real breaks/ideas. The 66 overlaps need
re-anchoring + content rebuild; the 461 "clean" ones start correctly but need a
breaks/ideas accuracy pass. "However long it takes."

## PROGRESS (2026-06-23)

### DONE — all 60 MIDDLEGAME overlap plans re-anchored + rebuilt to the accuracy bar
Every one now starts at the opening terminus (0 replay), real breaks from the
masters-explorer FEN endpoint + book-corpus/theory grounding, lead-the-eye
arrows with verified sightlines, two-register cues, resolvable sources — all
gate-green (`middlegamePlanner` + `middlegamePlanThemes` + `MiddlegamePlansSection`
+ ship-check). By cluster: vienna; french-exchange; ruy breyer/chigorin/zaitsev/d4;
nimzo x4; scandi x3; alekhine x2; pirc x2; sicilian najdorf x2 / sveshnikov x2 /
dragon x3 / alapin x2; benko x3; benoni; dutch x2; kid; old-indian; qga;
semi-slav; four-knights x2; evans; scotch; kia; london; trompowsky; pro-aman
anti-caro x2 / french x2 / open-sicilian / rossolimo x2 / ruy x2; pro-gothamchess
caro-panov; pro-naroditsky caro / fantasy-caro; pro-samay french / ruy;
birds-opening x3. Also fixed the **bird-opening→birds-opening id typo** on 2
plans (+ gave them playableLines).

### REMAINING
1. **6 `-endgame` plans** (ruy-lopez berlin/breyer/chigorin/exchange/open/zaitsev
   `-endgame`). These are ENDGAME-section plans whose `playableLines[0].fen`
   currently starts from move 1 (walks the whole game). They need the ENDGAME
   doctrine (§ENDGAME LAYER): re-anchor `criticalPositionFen` to the opening→
   endgame TRANSITION fen and set the playable line to the real endgame tail of
   a master game that played the SAME variation (`scripts/pick-endgame-game.mjs`).
   NOT a middlegame rebuild — separate, per-plan game research.
2. **The 461 "clean" plans** — already start in the right place; need a
   breaks/ideas ACCURACY review per the recipe above. The bulk of the "all 529"
   scope; multi-session.

### Reusable tooling built this pass
- `scratchpad/suggested-anchors.json` — opening terminus per overlapping plan
  (anchor-gen harness: `getAllLessonScripts()` → deepest beat terminal FEN →
  match each plan to the deepest lesson line containing its old anchor).
- The build recipe is a self-contained node script per cluster: define plan
  objects → validate (legality + lead-eye sightlines via `sightClear` + themes
  demo + PROMISE-ending check + array-length parity) → splice one object in place
  (find id → `  {` → next `  },`) keeping other entries byte-identical → run the
  two gates. Explorer data via the FEN endpoint
  `GET /api/lichess-explorer?source=masters&fen=<encoded>`.


## The PROVEN per-plan recipe (battle-tested on Vienna + French Exchange)
1. **New anchor** — from `scratchpad/suggested-anchors.json` (the anchor-gen
   harness: import `getAllLessonScripts()`, deepest beat per lesson → terminal
   FEN; match each plan to the deepest lesson line containing its old anchor).
   For the 461 non-overlap plans the anchor is already right — skip step 1.
2. **Real continuation + breaks** — query the explorer FEN endpoint:
   `GET /api/lichess-explorer?source=masters&fen=<encoded FEN>` → frequency-ranked
   master moves from the anchor. Pawn moves = candidate breaks; rook/piece moves
   = the maneuvering plan. Thin data (deep/rare anchor) → lean on book corpus +
   web + mainstream theory (still verify, never invent).
3. **Ideas** — ground in `chess-concepts.json` (`pos-open-file`, `pos-center`,
   `pos-outpost`, `pawn-minority-attack`, …) + `book:<id>` (classical openings) +
   reputable URL. Record in `sources[]`; every source must resolve
   (`isResolvableSource`).
4. **Author** breaks + pieceManeuvers + ≥2 themes + ONE demo `playableLine` from
   the anchor that DEMONSTRATES the plan (student move lands on a declared
   break/maneuver square). Keep piece plans — accuracy, not a stub.
5. **Validate locally BEFORE splicing** — legality (chess.js), lead-eye
   groundedness (every vision-arrow target + yellow highlight NAMED in that
   move's annotation; vision arrows have a CLEAR sight-line via the `sightClear`
   helper — a blocked diagonal arrow fails `middlegamePlanner`), themes demo,
   array-length parity, last annotation not a PROMISE phrase.
6. **Splice** one object in place (find id line → `  {` open → next `  },` close),
   keeping the other entries byte-identical. Re-run
   `middlegamePlanner.test.ts` + `middlegamePlanThemes.test.ts`.

Done so far: `mp-viennagame-classical`, `mp-frenchdefence-exchange`.

## Phased plan
- **Phase 0 — scaffolding** (`pending`): commit this doc; fix the
  `bird-opening` id typo; commit the detector to `scripts/` so it's repeatable.
- **Phase 1 — Vienna proof** (`pending`): fix `mp-viennagame-classical` end to
  end (re-anchor + breaks-from-data + ideas-from-corpus + verify). This nails
  the exact pattern/voice before scaling. Get David's eyes on it.
- **Phase 2 — batch the remaining ~58 middlegame overlaps** (`pending`),
  grouped by opening, worst-overlap first (ruy-lopez, nimzo, the 11-ply
  replays). Re-run detector per batch.
- **Phase 3 — `-endgame` plans** (`pending`): re-anchor to the transition FEN
  per the endgame doctrine.
- **Deploy:** batched at completion, then the 3-instrument post-deploy audit on
  the openings surface.

## Decisions log
- **2026-06-23 — OPEN, awaiting David:** When the Watch lesson already plays the
  signature break itself (Vienna plays `d4` in-lesson), the seam is either
  **A)** plan starts AFTER that break (owns the follow-up levers; smallest
  change; doesn't touch validated Watch lessons/gates), or **B)** trim the Watch
  back to the structural setup so the plan owns the main break. **Recommend A**
  — it honors "start where the opening leaves off" literally and avoids
  re-opening every gated Watch lesson. Needs David's call as it sets the rule
  for all 35 openings.

## Sequencing logic
Vienna first because it's the named proof case and the masterclass voice
reference — locking the pattern there de-risks the batch. Endgame plans last:
different section, different doctrine (transition-FEN anchor), don't conflate.

## Next-session pickup
Detector output in `scratchpad/overlap-*.{json,md}` (re-run after edits to
confirm CLEAN). Start at Phase 1 once the seam decision lands. The fix recipe
per plan: terminal FEN → explorer breaks → corpus ideas → verify → strip
playable replays → gates green.
