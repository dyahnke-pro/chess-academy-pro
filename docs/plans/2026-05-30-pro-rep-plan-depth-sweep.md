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

---
## PROGRESS UPDATE (2026-05-31)
**106 plans deepened** to real 8-ply (move 13->17) lines from the pros' actual
WINS, each narrated (concise per-move note + <=8-word cue + lead-the-eye
arrows/highlights), all gates green, committed. Covers EVERY cleanly-groundable
plan: GothamChess (all 18 openings) + Naroditsky Alapin/Jobava-bd3/Alekhine-modern/
KID(10)/Caro-Kann(5). 15 duplicate-anchor plans re-pointed to distinct eval-sound
candidate wins. Applier: scripts/pro-repertoire/apply-plan-narration.cjs;
per-opening data in scripts/pro-repertoire/openings/*.cjs.

### REMAINING: 62 short plans (the harder tail)
1. ~49 NEVER-grounded (mostly Naroditsky Rossolimo/Najdorf/Ruy/KIA-subvars/
   Jobava-french-slav/Alekhine-sublines + a few Gotham: caro-panov, antisic-accel/
   e6, mb-declines/advance, stafford-e5space, kia-e5/sicilian). Their synthetic
   FEN never occurs in the pro's games -> exact-FEN grounding found nothing.
   FIX: re-anchor by opening/variation PREFIX -- scan archive for a student WIN in
   the variation, eval-pick a sound deep anchor, ground+narrate. Needs a
   prefix->opening map (derive from each opening's pgn in pro-repertoires.json).
2. ~10 flagged/murky (deferred): french-rubinstein-qxd4, french-tarrasch-b5gambit,
   pirc-150-b5, qgd-tartakower-b6, qgd-carlsbad-e5 (true dup), KID-classical-kingside,
   KID-classical-c5 (dup), KID-makogonov-kingside, KIA-vs-b6-expand, Job-a6c5-rad1,
   KID-fianchetto-simplify. FIX: David's WALK-BACK -- real wins, but the move-13->21
   window leaves the student worse (he won later). Re-scan each won game, eval
   move 13->30, anchor the 8-ply window where the student is genuinely on top
   (>= +0.8). Stockfish only LOCATES the window; moves stay real.

---
## FINAL STATE (2026-05-31, full-autonomy run)
**Naroditsky archive FETCHED** (140,530 games; chess.com was reachable after all).
Re-grounded across both pros' 172k-game archives -> **136 of 168 pro-rep plans now
deep** (real winning-game 8-ply move-13->17 lines, narrated, all gates green,
shipped to main + G1-audited 23/0, bundle DPlxFmIM).

### The 32 that remain (NOT safely auto-deepable -- need a focused per-plan pass)
**A) 25 SYNTHETIC positions** -- the authored criticalPositionFen does NOT occur in
172k games at ANY ply (confirmed by ground-relaxed.cjs). Their TITLES name real
variations Naroditsky plays; the FENs are earlier-session inventions. Re-derive each
from a real sub-variation game (set a new criticalPositionFen + 8-ply line, narrate
to the ACTUAL moves). Per-opening prefixes for the next pass:
  - pro-naroditsky-rossolimo (7): Ross-nc6-* -> `e4 c5 Nf3 Nc6 Bb5`; Ross-e6-* ->
    `e4 c5 Nf3 e6`; Ross-bd7-* -> `e4 c5 Nf3 d6 Bb5+ Nd7`; Ross-g6-* -> `e4 c5 Nf3 g6 Bb5`.
  - pro-naroditsky-alekhine (5): `e4 Nf6 e5 Nd5` + (twoknights `Nc3`, modern `d4 d6`, quiet `Nf3`).
  - pro-naroditsky-kia (4): `Nf3 Nf6 g3` (symmetric/Reti setups -- dedup for distinct games).
  - pro-naroditsky-jobava-london (3): `d4 d5 Nc3 Nf6 Bf4` + (french `...e6`, slav `...c6`).
  - pro-naroditsky-najdorf (2): `e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6` + (english `Be3`, adams `Be2`).
  - pro-naroditsky-ruy-lopez (2): `e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3` + `d3`.
  - pro-naroditsky-fantasy-caro (1): `e4 c6 d4 d5 f3`.
  - pro-gothamchess-anti-sicilian (1): antisic-e6-open `e4 c5 Nf3 Nc6 Bb5 e6`.
  Caveat: move-order transpositions mean exact-prefix matching misses games -- match
  by a position fen4 reached via the prefix, not by literal first-N-SANs.
**B) 7 FLAGGED** (real games, but the grounded window is negative/tactically murky --
need David's WALK-BACK: eval the won game move 13->30, anchor where the student is
genuinely on top): french-rubinstein-qxd4, qgd-tartakower-b6, pirc-150-b5, caro-panov,
Naj-classical-development, Jobava-central-queen-attack, KID-makogonov-kingside.

Tooling for both: scripts/pro-repertoire/{ground-plan-lines,ground-relaxed,select-sound-lines,
dedup-grounded,apply-plan-narration}.cjs + openings/*.cjs. The applier + gates make each a
data-only add.

---
## SESSION 2026-05-31 (cont.) — build unblock + audit triage
- **BUILD WAS RED** (parallel gambit session): danishGambit/viennaGambit + 4
  *Variations.ts files had TS6133/TS6196/TS7006 (unused untyped A() arrow helper,
  untyped H/b). FIXED types-only (kept A typed in marshall which uses arrows;
  removed unused A/VIS in the other 3). Build green, DEPLOYED (bundle advanced).
- **9 variation sources** (stafford/qgd/ponziani/anti-sicilian tabs) were missing
  sources[] → filled with resolvable book+chess.com+wikipedia. Pushed 8aaf17f1.
- **AUDIT METRIC CORRECTION**: my audit-dump used a naive <20-ply "SHORT" flag →
  76 false alarms. The REAL standard is `reachesMiddlegame` (≥14 plies OR castled
  OR both sides developed ≥2 minors). That gate is GREEN; baseline only 13 keys.
  So "short" lines that are castled/developed are FINE. Real ply backlog = the 13
  baselined lines only.
- 163/168 plans deep (5 not-sound deferrals stand). All on main, live.

### Remaining audit passes (user wants personal linear walk):
1. CONTINUITY (G9.3 Gate C): each variation's middlegame-plan criticalPositionFen
   should connect to where that variation's pgn ends. Build a checker.
2. NARRATION both registers + board-accuracy: covered by proRepPlanAccuracy +
   middlegamePlanThemes gates (green). Spot-walk beats by hand for voice quality.
3. The 13 baselined-shallow lines: extend along player's most-played real
   continuation (extend-shallow.cjs drafted; container reset lost /tmp — rebuild).
