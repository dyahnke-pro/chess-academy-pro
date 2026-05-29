# Masterclass DATA-REBUILD Doctrine (2026-05-29) — locked

> David, 2026-05-29: *"Bring over the pro repertoire build rules to apply to
> this build. You have to still get every opening to the middle game — that's
> nonnegotiable. Make sure narrations change. It will change middlegame ideas.
> Traps stay the same. Deep theory = the line the most games actually follow;
> if no games reached the position it's not theory."*

This doctrine REBUILDS the 42 masterclass openings so every lesson spine is
**chosen by the data**, not authored by hand. It is the pro-repertoire
deep-build doctrine (CLAUDE.md §G9.1/§G9.2 +
`docs/plans/2026-05-28-pro-rep-deep-build-doctrine.md`) applied to the
masterclass set, MERGED with the masterclass playbook
(`docs/opening-masterclass-playbook.md`). Read all three; this doc is the
delta + the rollout.

---

## THE ONE ARCHITECTURAL CHANGE

**Spine source.** Pro-rep walks the most-played continuation in ONE player's
chess.com corpus. Masterclass walks the most-played continuation in the
**masters database** (Lichess explorer `source=masters`, strong-online
`source=lichess` ratings≥2000 fallback for depth). Everything else in the
pro-rep doctrine carries over unchanged.

**The engine is built:** `scripts/build-opening-spine.mjs <id> "<seed>"`.
It walks the most-played move while the position stays common (≥ `COMMON`
master games), then **mandatory-extends along the most-played move — never
below `LOWFLOOR=8` games, never to 0 — until a real middlegame is reached**
(`MIDGAME_PLY≥20`). It emits the spine, per-ply game counts, `reachedMiddlegame`,
and the real branch points (variation tabs). Output:
`data/sources/opening-spines/<id>.json`. Floors (locked from the Italian
pilot): `COMMON=60`, `LOWFLOOR=8`, `MIDGAME_PLY=20`.

**Why this is trustworthy (the whole point):** the walk can only step where
games already are. It CANNOT invent. Depth is an OUTPUT of the data — deep
where theory is forcing (Italian → move 20, 97 master games on the line;
Caro → move 11, hundreds), honest where it branches. The Italian pilot
proved it: the old hand-authored Italian died at move 18 on **1 game**; the
data line is move 20 with **97** — deeper AND common.

---

## THE NONNEGOTIABLE: every opening reaches the middlegame

The spine builder GUARANTEES it (mandatory-extend along most-played, never 0).
**The `lessonDepth` gate changes** from "≥20 plies, period" to "reaches a
middlegame position via the data" — `reachedMiddlegame === true` from the
spine builder. A sharp line that thins before move 10 extends along the
most-played move (thinner but real) until a middlegame structure exists; it
NEVER stops short of the middlegame, and it NEVER invents to get there. If a
line genuinely cannot reach a middlegame without dropping to 0 games, that's
an `ASK DAVID`, not a fabrication.

---

## WHAT CARRIES OVER FROM PRO-REP (do not re-derive — apply these)

### The three anti-fabrication rules (§1a/§1b/§1c of the pro-rep doctrine)
1. **TRAPS ARE MINED, NEVER AUTHORED (§1a).** Weapons come from
   `mine-punish-gems.mjs` (engine-first) + theory-verify, exactly as the
   gambit gems were built. NEVER hand-write a trapLine from memory.
2. **SHOW-YOUR-WORK (§1b).** Every move that ships must be traceable to a
   script's stdout (the spine builder's `counts[]`, the miner's output, the
   model-game export). If you can't point to the line in a tool's output, it
   doesn't ship.
3. **NARRATION FACT-CHECK (§1c).** chess.js verifies every board claim
   (`narrationFactCheck.test` / `narrationAccuracy.test`). A claim like "the
   f5-knight" with no knight on f5 is a hard fail.

### The 16-step procedure (§G9.2), adapted
- **STEP −1** — build/copy the per-opening builder scripts BEFORE authoring.
- **STEP 0** — opening already in `repertoire.json` with correct `color`.
- **STEP 1 (CHANGED)** — instead of the chess.com tree, run
  `build-opening-spine.mjs <id> "<seed>"`. The seed = the opening's defining
  moves from `repertoire.json`. Output = the data spine + branches + counts.
- **STEP 2** — variation tabs = the spine builder's `branches[]` (every fork
  where the top move is a plurality and a sibling has ≥150 games). No
  hand-guessing the tab set; no asking David "how many" (playbook §0.1).
  **🔑 REFINEMENT (Italian pilot, 2026-05-29): the modal walk TRANSPOSES — so
  `branches[]` is the START of the tab set, not the whole of it.** After
  `3...Nf6` the most-played move 4 is `d3` (transposes into the Pianissimo),
  so the builder's top branch MISSES the structurally-distinct `4.Ng5` (Fried
  Liver / Traxler) — a famous, faced, named line that is simply sub-modal
  because the crowd transposes. So STEP 2 has TWO sources, both ground-bound:
  (i) the builder's modal `branches[]`, AND (ii) structurally-distinct NAMED
  lines from the explorer's move list at each fork that pass playbook §0.1
  (a)–(d) (real named line + faced ≥~3% or canonical + structurally distinct
  + student-side-winning game) even when they're not the #1 move. A sub-line
  that merely transposes into another tab's structure folds INTO that tab
  (playbook §0.1c); a sub-line with its OWN structure (4.Ng5) earns its own
  tab. Verify each against the explorer — never add a tab from memory.
- **STEP 3** — deep-build per variation: re-run the spine builder seeded at
  each branch's defining move to get THAT variation's data spine + counts.
- **STEP 4** — count middlegame/endgame plans HONESTLY using the WIDER-CORPUS
  rule (≥10% frequency at a key middlegame ply across the full variation
  corpus, NOT the 3-4 deepest games).
- **STEP 5** — gather voice corpus (book corpus + reputable online; record in
  `sources[]`). Modern openings: principles + consensus understanding,
  board-truth-gated (playbook §0.5 / CLAUDE.md book-corpus note).
- **STEP 6** — author the lessons ON the data spine (the LLM writes prose
  ONLY; it never picks a move). Two registers per beat: `say` (full Watch) +
  `sayShort` (≤8-word Learn cue). Lead-the-eye colour language (§5a). Sources
  on every unit.
- **STEP 7** — register in `registry.ts` OPENINGS (one line; auto-wires
  getLessonScript / variation lookup / gate registry / manifest).
- **STEP 8** — expand `repertoire.json` (overview, keyIdeas, variations[].pgn
  = the DATA spines, sources).
- **STEP 9** — author middlegame plans: anchored AT or PAST the spine
  terminus (Rule 1), every annotation hand-written prose (Rule 2), N plans =
  what the wider-corpus data shows.
- **STEP 10** — endgame plans only when the wider corpus supports (≥10% of
  games reach the endgame type). Empty > invented.
- **STEP 11** — common-mistakes / pitfalls (WLPP, two registers, FEN-keyed).
- **STEP 12** — multi-game model games per variation, student-side WINS only,
  hand-authored overview. Re-verify against the NEW variation set.
- **STEP 12.5** — route plans to their variation tabs (`<id>MasterclassTabs.ts`).
- **STEP 13** — `proRepertoireOpeningMap.json` (N/A for masterclass openings;
  they ARE the masterclass set).
- **STEP 14** — bump `BASE_DATA_REVISION` (reconcileBaseRepertoire reaches
  seeded devices; G8 orphan-delete).
- **STEP 15** — validate: `npm run ship-check` (all ⭐ content gates).
- **STEP 16** — push to `main` (no branch/PR — playbook §0.5) + the
  3-instrument audit (Playwright + audit-stream + listener), per-opening
  (`AUDIT_OPENING=<id>`).

### From the masterclass playbook (unchanged)
- §0.5 autonomous decision process (every pick → ground source + gate).
- §0.7 the Vienna file-by-file recipe (same files, same symbols).
- WLPP grammar (§1a), lead-the-eye colour language (§5a/§5b), sentence-grained
  reveal (§5c), the narration two-register coverage gates.
- The full gate roster (§GATES) + the 3-instrument interactive audit (§9).

---

## THE CASCADE — what changes when a spine moves (verify each, every opening)

1. **Narration is re-authored** on the new spine moves (David: "narrations
   change"). Old beats are discarded; new beats written on the data line.
2. **The variation SET changes** — tabs come from `branches[]`, replacing
   hand-picked tabs. Old variation lessons that no longer match a real branch
   are dropped.
3. **Middlegame plan critical-FENs re-point** to the new terminus (David: "it
   will change middlegame ideas"). Re-derive plans from the new structure.
4. **Pitfalls / common-mistakes** are FEN-keyed — re-verify each is still on
   the new line; drop ones that aren't.
5. **Model games** re-checked against the new variation set (content stays;
   mapping verified; still student-side wins only).
6. **TRAPS STAY THE SAME (David)** — gem/named-trap DATA is unchanged and
   validated separately. BUT re-verify each trap still SURFACES on the right
   tab (gems surface by prefix-matching the tab spine via
   `getPunishGemsForTab`; a moved spine can change which tab a gem lands on).
   Content unchanged, surfacing re-checked.
7. **Manifest floors** re-declared honestly (never a target; catches deletion).

---

## SCOPE — the 42 masterclass openings (pro-rep openings are OUT, already data-driven)

Rollout in waves (deepest-mainstream first to harden the pipeline, then the
sharper/sub openings). Status: `pilot-proven` / `pending`.

**Wave 0 — pilot (proves the pipeline end-to-end):**
1. `italian-game` — spine generated (move 20, 97 games, 8 branches). [pilot-proven, spine done; narration rebuild pending]

**Wave 1 — deep mainstream e4 (highest payoff, most-trafficked):**
caro-kann, ruy-lopez, french-defence, scotch-game, vienna-game, four-knights-game, petrov-defence, two-knights-defence, scandinavian-defence, philidor-defence

**Wave 2 — Sicilians + Indian/closed mainstream:**
sicilian-najdorf, sicilian-dragon, sicilian-sveshnikov, sicilian-alapin,
nimzo-indian, kings-indian-defence, grunfeld-defence, queens-indian,
qgd, qga, slav-defence, semi-slav, catalan-opening

**Wave 3 — systems + offbeat + gambits:**
london-system, kings-indian-attack, reti-opening, english-opening,
trompowsky-attack, birds-opening, dutch-defence, benoni-defence,
old-indian-defence, alekhine-defence, pirc-defence, queens-gambit

**Wave 4 — sharp gambits (sharpest, thin earliest — extend-to-middlegame
matters most here):**
kings-gambit, evans-gambit, benko-gambit, budapest-gambit,
albin-countergambit, schliemann-defence

(All 42 = the `opening-manifests.json` keys. The ~3,000 non-masterclass
DB-only openings keep the code-generated fallback — out of scope. Pro-rep
openings in `pro-repertoires.json` are already built this way — out of scope.)

---

## PER-OPENING DEFINITION OF DONE
Spine from `build-opening-spine.mjs` (reachedMiddlegame=true) → variation tabs
from `branches[]` → narration re-authored on the data spine (two registers +
sources) → middlegame plans re-anchored → pitfalls/model-games re-verified →
traps re-surfaced on correct tabs → all ⭐ ship-check gates green → on `main`
→ 3-instrument `AUDIT_OPENING=<id>` audit green. Then the "reached in N games"
reassurance is TRUE natively and can be surfaced.

## STATUS TRACKER
- [x] Method proven (Italian pilot) + spine engine committed
      (`build-opening-spine.mjs`) + diagnostic (`diagnose-lesson-tails.mjs`)
- [x] Doctrine written (this doc)
- [ ] `lessonDepth` gate changed to reachedMiddlegame-via-data
- [ ] Wave 0 — Italian full rebuild (the template)
- [ ] Waves 1–4 — per the list above, one opening at a time, pushed to main + audited
