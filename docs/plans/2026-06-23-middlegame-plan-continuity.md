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
2. **Scope** — plans should carry only **key pawn break(s) + ideas**, nothing
   more. Surface ALL breaks when the data shows 2+. Most positions have ≥2
   ideas. A genuinely positional/maneuvering structure can correctly come back
   **0 pawn breaks** — empty beats invented.

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
2. **Reduce to key pawn break(s) + ideas.** Keep `pawnBreaks` (all that the data
   supports) and `strategicThemes` (≥2 where the position has them). Drop the
   long replayed maneuver `playableLines` that re-taught the opening. (Any
   retained playable line must begin at/after the terminus and must satisfy the
   `middlegamePlanThemes` gate — a student move landing on a declared
   break/maneuver goal square.)

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
