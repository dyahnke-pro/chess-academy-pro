# Pro-Rep Middlegame-Plan DEPTH Sweep (2026-05-30)

David's directive: pro-rep middlegame plans are too short (2-4 moves). Deepen
**every** pro-rep plan to **8 real plies**, anchored at a **real middlegame
(~move 13)**, where **every move comes from an actual played game** (HARD RULE —
never hand-author or engine-pick a line). "Do the same as the masterclasses."
Use a winning position; eval-filter so the student is genuinely on top at the
demo's end (not a game he only salvaged later).

## The LOCKED pipeline (proven on Caro-Advance, live on prod)
1. **Ground** in real games — `scripts/ground-plan-lines.cjs` scans the raw
   chess.com archive (`data/sources/<player>-chesscom/`, gitignored) + the
   deep-build `topModelGames` (`data/sources/<player>-deep/`). For each plan it
   finds a real game in the variation and takes the game's moves from a
   masterclass-depth anchor (ply ≥24 ≈ move 13) for 8 plies. Collects up to 8
   candidate WINNING games per plan.
2. **Eval-select** — `scripts/select-sound-lines.cjs` evals each candidate's
   move-~17 endpoint from the STUDENT's side and keeps the line where the student
   is genuinely on top (Stockfish only PICKS the real line; never generates moves).
3. **Narrate** the real moves — masterclass-concise per-move note + ≤8-word learn
   cue + arrows/highlights. Board-accurate (gated).
4. **Gate-validate** — `middlegamePlanFenCoherence`, `middlegamePlanThemes`,
   `proRepPlanAccuracy` (new this sweep), `MiddlegamePlansSection`.

## Persisted artifact (survives container reclaim)
`scripts/pro-repertoire/grounded/plan-lines.json` — 107 eval-selected real 8-ply
lines `{planId: {fen(anchor@~move13), moves[8], endFen, url, opponent, outcome}}`.
Regenerate via the two scripts above (needs the gitignored archives on disk).

## Coverage (of 156 short pro-rep plans)
- **~99 ready**: real, deep (move 13→17), eval-sound (student on top), all-real-moves.
- **8 flagged** (grounded, not sound @17 — he won later): need "walk back to the
  winning position" — anchor deeper in the won game where he's actually on top:
  french-rubinstein-qxd4, pronaroKID-classical-kingside/-c5/-makogonov-kingside,
  pronaroKIA-vs-b6-expand, antisic-g6-d4break, pronaroJob-a6c5-rad1,
  pronaroKID-fianchetto-simplify.
- **49 ungrounded**: their anchor position never occurs in his real games
  (synthetic) — re-anchor to a real game in the same variation. Worst openings:
  naroditsky rossolimo(0/10), najdorf(0/6), ruy(0/5), kia(1/10), alekhine(1/6).

## DONE (committed/shipped to main)
- `proRepPlanAccuracy` gate + fixed 6 hyphenated + 18 false bishop-pair claims (the
  Trompowsky-class error) across both pros. **Shipped + live.**
- Caro-Advance 3 plans deepened to the full standard. **Shipped + live**
  (bundle index-CMnDTnnF.js). REVIEW SAMPLE for the standard.
- Grounding + eval-selection tooling + persisted grounded lines.

## REMAINING (the grind)
- **Narrate ~99 ready plans**, opening-by-opening, committed batches. Use the
  grounded line + `node -e` move-by-move facts (piece/from→to/capture/check) to
  narrate accurately. Validate gates per batch.
- **8 walk-back** + **49 re-anchor** edge cases (extend the scripts).
- **Plan-set CURATION finding**: the original (earlier-session) pro-rep plan set
  has redundant / mis-anchored plans surfacing during deepening — e.g. the
  Italian's `evans-style` and `twoknights-kside` share the EXACT same anchor (and
  `evans-style` got a Two-Knights line). Merge duplicates / re-ground mismatches as
  you go; don't just lengthen blindly.

## Next-session pickup
1. Pick a fully-grounded opening (english/london/vienna/trompowsky/fantasy/french/
   scandinavian/italian/ponziani/qgd/pirc/closed-sicilian/caro-kann; naroditsky
   kid/alapin/caro). 2. Dump its grounded lines' move facts. 3. Author a patch
   script setting criticalPositionFen + 8-ply playableLine + per-move
   annotations/learnCues/arrows/highlights + overview/themes (theme goal square =
   a student move's landing square). 4. `npx vitest run` the 4 plan gates.
   5. Commit. Batch the deploy + audit per the cap policy.
