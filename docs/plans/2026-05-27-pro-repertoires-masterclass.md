# Pro Repertoires → Masterclass Standard — PLAN

**Status:** PLANNING (awaiting David's call on scope + architecture). Do NOT
start authoring content until the open decisions below are resolved.

**Owner directive (David, 2026-05-27):**
1. "Make sure that whatever opening is being taught, the pro actually played it.
   I want their most common lines, things they actually play."
2. "Use the master DB and other tools to find games and build a plan."
3. "Use the internet (especially for influencers and pros that teach on YouTube
   for their lines and recommendations)."

So: every line in every pro opening must be **provenance-bound** to that
specific player — either a real game they played, a position that arises with
real frequency in their game tree, or a line they publicly teach/recommend.
No invented or assumed lines.

---

## 0. BUILD FRESH — discard current data (David 2026-05-27)

"The current stuff will ALL get replaced. We are building fresh." The existing
`pro-repertoires.json` (82 openings, flat schema) is NOT a source of truth and
will be fully replaced. Do NOT audit/preserve/migrate it. Every pro opening's
line set is determined ONLY from:
1. **What they actually play** — the harvested most-played-variation rankings
   (`docs/audit-runs/2026-05-27-pro-provenance/rankings.json`, 136,880 games).
2. **What they explicitly teach/recommend** — web/YouTube (for the teachers;
   honor a named taught line even if their blitz favors something else, e.g.
   Gotham teaches the London while personally blitzing the Trompowsky).
Each shipped line carries a `provenance` record (§4). Elites ground on their
serious/OTB games (online blitz is NOT their real repertoire — Carlsen proof).

## 1. (reference) Prior state being replaced

- `src/data/pro-repertoires.json`: 14 players → **82 openings** across 45
  opening families. Flat pre-masterclass schema: `overview` + 4 `keyIdeas` +
  prose-string `traps`/`warnings` + `variations[{name,pgn,explanation}]`
  (2–9 each, avg 3). Only 3/82 carry structured `trapLines`.
- They route through the SAME `OpeningDetailPage` as masterclasses
  (`App.tsx:270`) but every masterclass content layer keys off `opening.id`,
  and `pro-<player>-<line>` matches **nothing**: no lesson scripts → Watch/Learn
  fall to legacy `WalkthroughMode` dictation (`OpeningDetailPage.tsx:579-614`);
  no punish-gems; no model games; no `mp-*` plans; no named-trap beat-lessons;
  no checkpoint quizzes / common-mistakes; no manifest entry (still show under
  "Most Common", not Masterclasses).
- **Net:** pro openings are a pre-Vienna experience. They are blank not because
  tools were unreachable, but because they predate the masterclass pipeline and
  were never run through it.

### Provenance problem (the new, load-bearing finding)
The current pro lines were authored from assumption, not from each player's real
games. Some are surely right (Eric Rosen ↔ Stafford); many `keyIdeas`/`variations`
have never been checked against what the pro actually plays. **Phase 1 audits
this; ungrounded lines get corrected or dropped.**

---

## 2. Verified grounding toolchain (this sandbox, 2026-05-27)

| Source | Reachability | Role |
|---|---|---|
| Lichess `/player` explorer (direct) | 200 anon | per-player move-frequency tree (THE "what they actually play most" source) |
| chess.com archives API / lichess games API | 200 | full PGN of real games → verify lines + source model wins |
| Masters DB explorer (proxy) | 200 | OTB serious games for elites + topGames IDs |
| `/api/lichess-game-export` | 200 | full PGN + evals |
| WebSearch / WebFetch | works | YouTube/influencer taught lines + recommendations |
| Stockfish 16 (`/usr/games/stockfish`) | runs | gem mining + soundness grading |
| Local pro-game cache (`docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json`) | present | 2,000 games / 10 players — offline fallback + verification |
| `openings-lichess.json`, masters-db.json, book corpus | present | G3 spine, theory/frequency, idea grounding |

Gaps: cache missing gukesh/ericrosen/chesswithakeem/samayraina (fetch live).
Proxy doesn't forward `/player` — but direct works from sandbox, so no code
change needed for the build pipeline.

---

## 3. Player taxonomy → grounding source (per David's two rules)

- **OTB elites** — Carlsen, Caruana, Firouzja, Gukesh, Praggnanandhaa, Niemann
  (+ Hikaru classical): real repertoire = **serious games**. Masters DB +
  their game archives (filter to classical/serious; ignore bullet noise).
- **YouTube teachers** — Naroditsky, GothamChess (Levy), Eric Rosen, Anna
  Cramling, ChessWithAkeem, Samay Raina: real repertoire = **what they
  teach/recommend** (WebSearch/WebFetch their videos + Chessable/stated reps)
  cross-confirmed against their `/player` tree + archives.
- **Both** — Hikaru, Dubov (elite OTB AND massive streamers): use both, prefer
  serious games for the line, streams/recs for flavor.

---

## 4. The provenance contract (new gate)

Every variation/line taught in a pro opening must carry a `provenance` record:
```
{ kind: 'game' | 'tree' | 'recommendation',
  ref: <game URL> | <player-explorer freq, games, score> | <YouTube/article URL>,
  player: <playerId>, verifiedAt: <iso> }
```
- `game` — a real game the pro played reaching this line (URL).
- `tree` — the line arises in the pro's `/player` tree above a frequency floor
  (proposed ≥3% of games at its fork, ≥N games).
- `recommendation` — the pro publicly teaches it (video/article URL).
A line with no provenance does NOT ship. Output dataset:
`src/data/pro-line-provenance.json`. A new gate (`proLineProvenance.test.ts`)
fails if any shipped pro line lacks a resolvable provenance entry. This is the
machine-checkable form of "make sure the pro actually played it."

---

## 5. Decisions (RESOLVED 2026-05-27)

- **D1 = FULL STANDALONE.** Every pro opening is its own masterclass, authored
  from the PLAYER'S real line — own lessons, own gems mined from his line, model
  games = his real wins, own plans/traps/quizzes. No inheriting the generic base.
- **D2 = WAVE 1 PROOF FIRST.** Build ~4 end-to-end to prove the
  provenance→masterclass pipeline, THEN scale to all 14. Wave 1 =
  **Naroditsky, GothamChess, Eric Rosen, Carlsen** (3 YouTube teachers + 1 elite,
  so both grounding paths get exercised).
- D3 (frequency floor) / D4 follow during Phase 0; draft floor ≥3% at fork AND
  ≥20 games in tree, OR a documented recommendation.
- **D5 = PLAY/TEACH UX = BADGE + FILTER (David 2026-05-27).** Build a LARGE pro
  repertoire using BOTH played + taught lines. Each pro opening gets a
  `provenance: 'plays' | 'teaches' | 'both'` tag (+ game-count + video URL).
  ProPlayerPage keeps White/Black grouping, adds a provenance chip per card + a
  filter toggle (All / Plays / Teaches). NOT separate tabs — most signature lines
  are BOTH, which a hard split would orphan/duplicate.

### (archived) D1. Architecture: standalone vs inherit-base vs hybrid
45 of 82 families already have a full generic masterclass (Scotch, Vienna, Caro,
Italian, Ruy, French, Najdorf, KID, …). A pro opening teaches the PLAYER'S
specific line, not generic mainline theory.
- **A. Full standalone** per pro opening (lessons/gems/games/plans/traps/quizzes
  authored from the player's line). Faithful, enormous (82 builds).
- **B. Inherit base + overlay** — pro opening reuses the base masterclass's
  engine-verified layers, overlays player voice/keyIdeas. Cheap, but dilutes
  "his actual line" when the pro diverges from mainline.
- **C. Hybrid (recommended)** — the pro's LINE is provenance-sourced and drives
  the lesson spine + model games (his real wins) + gems mined from his line;
  shared engine/theory layers are reused where the line coincides with the base.
  Best fidelity-to-effort, directly honors "his most common lines."

### D2. Scope / order
All 82, or a priority wave first? Proposed wave 1 = the YouTube teachers whose
provenance is richest + most on-brand (Naroditsky, GothamChess, Eric Rosen) +
one elite (Carlsen), to prove the pipeline end-to-end before scaling.

### D3. Frequency floor for `tree` provenance
What % / game-count makes a line "a line he actually plays" vs a one-off? (Draft:
≥3% at the fork AND ≥20 games in his tree, OR any documented recommendation.)

### D4. Pro vs generic relationship on the page
Is the pro section a distinct "learn how <player> plays X" experience (implies
A/C), or a player-flavored entry into openings already taught generically
(implies B)? D1 follows from this.

---

## 5b. WAVE-1 BUILD LIST (from harvest + taught recs, 2026-05-27)

Grounded in `rankings.json` (games/serious/score) + web-confirmed taught lines.
"played" = data-dominant; "taught" = web/YouTube recommendation. Each opening
becomes a full standalone masterclass built from the player's own line.

**Naroditsky** (teacher+elite, 12,269 games)
- White: Alapin Sicilian (300g+, taught ✓), Four Knights Scotch (409g C47, taught
  "Four Knights Scotch" ✓), Jobava/London (164g+), Caro-Kann Exchange (73g),
  Sicilian Canal (67g)
- Black: Accelerated Dragon (220g+), King's Indian Defence (200g+)

**GothamChess** (teacher, 12,261 games)
- White: Trompowsky (950g — signature, played), Vienna C29 Paulsen (103g, NAMED by
  David ✓, played+taught), London System + anti-KID plan (taught ✓, NAMED by David
  — 3.Nc3/Qd2/Bh6/h4), Levitsky/Jobava (151g)
- Black: Scandinavian (450g+, signature taught ✓), French Rubinstein (315g),
  Modern Defence (290g), Caro-Kann Two-Knights (104g)

**Eric Rosen** (teacher, 12,057 games)
- White: London System / Accelerated London (dominant, signature taught ✓)
- Black: Stafford Gambit / Petrov (378g C42, signature taught ✓), QGD Exchange,
  Catalan

**Carlsen** (elite, 9,623 games) — ⚠️ online = varied blitz, NOT his real
repertoire (0 serious per line). DO NOT build from online blitz. Needs OTB /
masters-DB sourcing first; propose his OTB mainstays (Ruy Lopez as White, etc.)
pending that grounding step. Flagged as the elite-path proof.

Build order (cleanest-grounded first): Eric Rosen Stafford → Naroditsky Alapin →
Gotham Vienna/London → Carlsen (after OTB sourcing).

## 5c. BUILD DOCTRINE per pro opening (David 2026-05-27)

Full Vienna-recipe standalone, with these sources nailed down:
- **Deep middlegame plans — always.** Every pro masterclass carries deep
  middlegame plans ("no reason not to"). Plan IDEAS + structures are mined from
  the pro's OWN games in the harvested 136k-game DB (the structures they actually
  reach and how they play them), oriented to the student side, lead-the-eye +
  Stockfish-sound.
- **Trap/weapon section = the masters-vs-amateur gem miner.** Keep the
  engine-first punish-gem pipeline: amateur-explorer blunders refuted by
  Stockfish, masters-DB false-weapon veto. Named traps layered on top.
- **Model games = the pro's REAL wins.** We HAVE these — the harvested games +
  the local pro-game cache. Source each variation's model game from the player's
  actual student-side wins (never fabricate; never a loss/draw).
- **The harvested game DB feeds variation DISCOVERY too** — beyond the
  top-frequency lines, mine the pro's games for additional real variations they
  play, each provenance-bound.

## 6. Phased plan (once decisions land)

- **Phase 0 — Provenance harvest.** For each player: resolve handles; pull
  `/player` frequency tree (both colors) + archives; WebSearch/WebFetch taught
  reps for the teachers; build `pro-line-provenance.json`. Extend the cache to
  the 4 missing players. (Tooling all verified; runnable now.)
- **Phase 1 — Audit current data vs provenance.** Flag every existing pro line
  that isn't confirmed. Produce a per-opening verdict: keep / correct-to-real-line
  / drop. Report counts to David.
- **Phase 2 — Per-opening rebuild** through the Vienna recipe (playbook §0.7
  STEP 0–9), grounded in provenance: lessons (two-register narration), model
  games = the player's real wins, gems mined from his line, lead-the-eye plans,
  named traps, quizzes, manifest entry. Per architecture decision (D1).
- **Phase 3 — Gates + audits.** `npm run ship-check` content gates +
  `proLineProvenance.test.ts` + per-opening interactive audits (3 clean rounds),
  audit-stream pull. Push to `main`, post-deploy audit (G1).

## 7. Next-session pickup
Decisions D1–D4 are the gate. Once set, start Phase 0 (provenance harvest) — all
sources verified reachable in-sandbox 2026-05-27; no laptop handoff needed.
