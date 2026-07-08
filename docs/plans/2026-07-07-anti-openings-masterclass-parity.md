# Anti-openings → masterclass parity (24 openings) — 2026-07-07

**Owner decision (David 2026-07-07): FULL DEPTH, ALL 24, starting now.**
The Counter-Weapons tab (`/openings` → Counter) now surfaces the 24 White
anti-opening repertoires. They currently render via the bare repertoire
treatment — variations + sublines only, **no curated lesson (Watch falls to the
legacy hallucination-prone `WalkthroughMode`), no gems, no plans, no model
games, no pitfalls, no overview/keyIdeas.** This plan takes every one to the
same bar as the Masterclasses tab, per the LOCKED G9.1/G9.2/G9.3 doctrine.

Multi-session build. This doc is the durable tracker — update the status table +
tick the per-opening checklist as work lands. Do NOT let it rot.

## The bar (what "match the opening tab" means — §G9.1/§G9.3)
Each opening ends with ALL of:
- **Gate A** — a registered hand-authored `LessonScript` (main line) so Watch
  uses `LessonPlayer`, NEVER `WalkthroughMode`. Per-variation lessons too.
- **Gate B** — main `pgn` + every variation `pgn` REACH a middlegame (the
  current 4–7 ply spines MUST be extended from the masters DB).
- **Gate C** — each middlegame-plan `criticalPositionFen` continues the opening
  spine's terminus (one continuous line).
- **Gate D** — build ORDER: extend spine → anchor plans → THEN narrate.
- Two registers per beat (`say` full + `sayShort` ≤8w), board-verified
  (narrationAccuracy), lead-the-eye arrows/highlights, `sources[]` resolvable.
- Weapons: hand-curated + Stockfish-verified punish-gems / named traps (bots
  retired 2026-06-01 — hand-find, engine-verify).
- Middlegame plans from wider-corpus data (≥10% frequency).
- Model games: real, **White-winning** (student side), hand-authored overview.
- Pitfalls (common-mistakes) 3–5 per opening.
- Overview + 4 keyIdeas, grounded (translation-not-invention).
- Naroditsky house voice (the app's single narration register).

## Spine source (the ONE architectural difference)
Anti-openings are White repertoires vs a named defense. Spine = the masters
explorer / `public/data/openings-masters-db.json` most-played continuation from
the repertoire's identifying prefix (same as the masterclass rebuild doctrine —
`scripts/build-opening-spine.mjs <id> "<seed>"`), walked to a middlegame. Every
move DB-anchored + chess.js-legal (G3).

## 🚨 THREE-AXIS VERIFICATION — MANDATORY before ANY line ships (David 2026-07-07: "be absolutely 100% sure every line is accurate, data-supported, with proper narration. Don't pump out garbage")
Every authored line (main + each variation + each plan/gem/model line) MUST pass ALL THREE, verified, before commit:
1. **DATA-SUPPORTED, THEN STOCKFISH TO THE MIDDLEGAME** (David 2026-07-07:
   "Stockfish advances the lines to the middlegame. Same with the sublines") —
   follow the most-played master move from `openings-masters-db.json` while it
   stays common (real theory); the moment the DB runs dry before a middlegame is
   reached, ADVANCE with the Stockfish best move (sound by construction) to a
   real middlegame — exactly the engine-primary method the subline extender uses
   (`extend-subline-responses.mjs`). NEVER extend along the most-played move of a
   thin sample — that is precisely how the fabricated sublines crept in. Every
   move chess.js-legal. For a gem/tactic the refutation is the Stockfish best move.
2. **BOARD-ACCURATE NARRATION** — passes lessonIntegrity + narrationAccuracy:
   every piece/square the prose names is true on the board at that ply; arrows
   originate on real pieces with clear sight-lines.
3. **ENGINE-SOUND** — the terminus, evaluated from the STUDENT's side, is NOT
   worse than ≈ −0.3 (an anti-opening should give White an edge; a quiet line
   that leaves the student worse is a DEFECT, not a showcase). Verify with the
   `_engine-eval.mjs` helper (Stockfish, movetime ≥ 1500). Rossolimo baseline:
   main +0.74, e6 +0.42, d6 +0.51, Nf6 +0.40 — all healthy edges.
4. **BOTH SIDES SOUND — NO BLUNDERS IN THE MAIN LINE (David 2026-07-07: "that
   goes under the gems if black blunders how white wins from it!!").** Walk the
   line ply-by-ply; the worst single-move eval swing against the mover must be
   < 1.0. A Watch/variation line where the OPPONENT blunders (e.g. an inflated
   +3.5 terminus that only exists because Black played ...c5??) is GARBAGE — it
   teaches the student that the opponent plays badly. Rebuild it so BOTH sides
   play the engine-best/most-played move to a realistic middlegame edge (a
   modest +0.3…+0.8, like Rossolimo — NOT +3). **The blunder itself becomes a
   PUNISH-GEM:** the common opponent slip + the Stockfish refutation showing how
   White wins from it (that IS the weapon layer). Extract every such blunder to a
   gem; never leave it in the teaching spine.
A line failing ANY axis does NOT ship. Empty > generic > garbage.
Rossolimo (shipped) verified on all four: worst swing 0.16–0.39, no blunders.

## Per-opening pipeline (adapts §G9.2)
1. Extend the main spine + each variation to a middlegame (build-opening-spine).
2. Identify the real variation tabs from the data branches.
3. Overview + 4 keyIdeas (grounded; cite sources).
4. Author the main `LessonScript` (`src/data/lessons/anti<Name>.ts`).
5. Per-variation lessons (`anti<Name>Variations.ts`), keyed `${id}::${varName}`.
6. Register both in `src/data/lessons/index.ts`.
7. Middlegame plans (`middlegame-plans.json`) anchored at the spine terminus.
8. Model games (`model-games.json`) — real White wins, hand overview.
9. Pitfalls (`common-mistakes.json`) 3–5.
10. Weapons: hand-find gems, Stockfish-verify, narrate (or named traps).
11. Update `anti-openings.json` entry (overview/keyIdeas/traps/variations pgns
    extended).
12. Bump the anti-openings revision in `dataLoader.ts`; reconciler deletes
    orphans (G8).
13. Gates: the §G9.2 STEP-15 vitest list + `npm run ship-check` → READY TO PUSH.
14. Ship to main (batched), 3-instrument prod audit for `/openings/<id>`.

## Two-pass build (quality-first; David: "100% accurate, no garbage")
- **Pass 1 — the verified core, across all 24:** extended DB/Stockfish spine +
  Watch lesson (main + every variation) + Understand zone (overview/keyIdeas) +
  ONE Master middlegame plan, EVERY line 3-axis verified (data / board / sound).
  This is what makes them "match the opening tab" in the core WLPP experience,
  with guaranteed quality. Rossolimo (opening #1) is the completed template.
- **Pass 2 — enrichment:** hand-found + Stockfish-verified punish-gems (weapons),
  real White-winning model games, pitfalls. Layered on once Pass 1 is broad.
  Gems use the amateur explorer (reachable) for the slip + Stockfish for the
  refutation — never invented, never a thin-sample bot pick.

## Priority order (highest-traffic defenses first)
1. `anti-sicilian-rossolimo` (Bb5 vs Sicilian) ← STARTING
2. `anti-caro-fantasy` (3.f3 vs Caro — subline already repaired)
3. `anti-french-advance` (3.e5 vs French)
4. `anti-pirc-austrian` (Austrian Attack)
5. `anti-modern-150` (150 Attack vs the Modern)
6. `anti-scandinavian`
7. `anti-alekhine-modern`
8. `anti-benoni-push` · `anti-alapin-black` · then the remaining Black anti-lines
   (`anti-london-black`, `anti-catalan-black`, `anti-smith-morra-black`,
   `anti-grand-prix-black`, `anti-kings-gambit-black`, `anti-colle-black`,
   `anti-trompowsky-black`, `anti-budapest`, `anti-qgd-exchange`,
   `anti-qid-fianchetto`, `anti-nimzo-qc2`, `anti-grunfeld-exchange`,
   `anti-kid-saemisch`, `anti-dutch-staunton`, `anti-englund`).

## Opening #2 — anti-caro-fantasy (data prepped, sound spines verified)
The pre-existing anti-openings.json pgns were BLUNDER-INFLATED garbage (the g6
line: `...c5??` +3.48, White `b3` gives it back, `...c4??` +4.19 — a mutual-
blunder mess). Rebuilt with `build-sound-spine.mjs` — both-sides-sound to a
middlegame, engine-verified. FINDING: the Fantasy is an honest SURPRISE weapon
(≈ equal, not a clean edge), so narration must be honest — no fake "+edge":
- **dxe4** (+0.26): `e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 c3 Nd7 Bd3 Ngf6 O-O Bd6 a4 O-O Nbd2 Re8 Qc2 Bc7`
- **g6** (+0.07): `e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3 Qb6 Na4 Qa5+ c3 e5 dxe5 Ne7 Nc5 Bxe5 f4 Bg7 e5 f6`
- **qb6** (+0.09): `e4 c6 d4 d5 f3 Qb6 Nc3 dxe4 fxe4 e5 Nf3 exd4 Qxd4 Qxd4 Nxd4 Bc5 Be3 Nd7 O-O-O Ngf6 Na4 Nxe4`
- **e6** (−0.15, MARGINAL — reconsider White's plan; a slightly-worse line is
  borderline for a "weapon", judge before authoring): `e4 c6 d4 d5 f3 e6 Nc3 Bb4 Bf4 Ne7 Qd3 O-O a3 Ba5 h4 b5 h5 h6 Ne2 Nd7 O-O-O b4`
Gems for the Fantasy = the amateur blunders (`...c5??`, `...c4??`) — Pass 2 via
the amateur explorer (reachable) + Stockfish refutation. Next: author the Watch
lessons on THESE sound spines (honest surprise-weapon narration), then #3.

## Opening #3 — anti-french-advance (data prepped, sound spines verified — CLEAN)
A genuinely teachable opening (unlike the messy Fantasy variations): both spines
thematic Advance-French structures, both-sides-sound, small White edge. Author
the Watch lessons on these next (main = Nc6/Qb6):
- **main** (+0.18): `e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Be2 cxd4 cxd4 Nh6 Bd3 Bd7 Bc2 Nf5 Bxf5 exf5 O-O Be6`
- **Qb6-first** (+0.22): `e4 e6 d4 d5 e5 c5 c3 Qb6 Nf3 Nc6 a3 c4 Nbd2 Na5 Be2 Bd7 Rb1 Ne7 h4 O-O-O h5 h6`

## Openings #4–6 — data prepped, sound spines verified
- **anti-scandinavian** (+0.60, CLEAN/thematic — author confidently): `e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Ne4 Qd8 Ng3 Bg4 c3 Nbd7 h3 Bxf3` (classic ...Qa5/...Bf5 main line, natural White development, comfortable edge).
- **anti-pirc-austrian** (+0.81, strong edge but SHARP/tactical — author carefully): `e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5 c4 Bxc4 b5 Nxb5 Nxe4 Qe1 Nac5` (Austrian Attack; concrete tactics on c4/b5 — explain each or pick a calmer sound line).

## ⚖️ PER-OPENING JUDGEMENT (David: no garbage) — not every anti-opening is a clean edge
- **Clean/thematic** (author confidently): Rossolimo (+0.4…+0.74), French Advance
  (+0.18/+0.22). Real edge, thematic play, easy to teach properly.
- **Honest surprise weapon** (author with honest ≈equal framing): Caro Fantasy
  main dxe4 (+0.26). Value = practical + amateur-blunder gems, NOT an edge.
- **Messy engine lines / marginal** (do NOT rush; reconsider the line or defer):
  Fantasy g6/qb6 (sharp +0.07/+0.09 with hard-to-explain maneuvers), Fantasy e6
  (−0.15). Author only when a clean, board-accurate, properly-explained line is
  found — a shaky lesson IS garbage. Empty > generic > invented.

## Status table (tick as they land)
| # | opening | spine | lesson | gems | plans | models | pitfalls | shipped |
|---|---------|-------|--------|------|-------|--------|----------|---------|
| 1 | anti-sicilian-rossolimo | ✅ main+3var | ✅ main + 3 var | | ✅ 1 | | | Watch+Understand+plan |
| 2 | anti-caro-fantasy | ✅ 4 (sound) | ✅ main (dxe4) | | | | | main+Understand |
| 3 | anti-french-advance | ✅ 2 (sound) | ✅ main | | | | | main+Understand |
| 4 | anti-scandinavian | ✅ main (sound) | ✅ main | | | | | main+Understand |
| 5 | anti-pirc-austrian | ✅ main (sound, sharp) | | | | | | spine prepped |
| 6–24 | (rest per priority) | | | | | | | |

**Progress (2026-07-08):** 24/24 main-line Watch lessons authored, verified &
LIVE on `main` (all 4-axis: DB/Stockfish data · board-accurate · engine-sound ·
no both-sides blunder). VARIATION TABS shipped (13 tabs / 6 openings, all spines
build-sound-spine + full-ply engine-scanned, no both-sides blunder): rossolimo
(e6/d6/Nf6), caro-fantasy (e6/g6/Qb6), french-advance (Advance), scandinavian
(Bronstein/Valencian), alekhine (Larsen/Alburt/Schmid), budapest (…g5). Several
DUPLICATE / transposition / main-prefix variation entries removed as found
(fantasy dxe4, french Euwe, scand Mieses, alekhine Main Line, budapest Nc6/Bb4+).
Englund Queen Trap weapon added (trapLine, +2.2). NEW durable gate
`antiOpeningNarrationAccuracy.test.ts` brings ALL anti-* runtime lessons under
legality + board-accuracy checks (they were outside ALL_LESSONS/registry.ts, so
lessonIntegrity/narrationAccuracy never saw them). KEY METHOD LEARNED: the
anti-openings.json "variations" are polluted with main-line prefixes + move-order
transpositions — TRIAGE each for distinctness, drop the dupes, rebuild the
genuinely-distinct spine sound. modern-150 variations DEFERRED (all transpose to
the one 150-Attack plan the main lesson already teaches). ✅ VARIATION-TAB LAYER
COMPLETE — 36 TABS across 21 of 24 openings. Recovered 2 more from the deferred
pile via the extend-past-recapture method: colle-Zukertort (b3, +0.48 Black) and
kid-saemisch …Nbd7 (the O-O-O + h4-h5 storm, +1.12). Only kings-gambit [sharp
sac theory], trompowsky [0 declared variations], modern-150 [pure transpositions]
have NO tabs. The last few deferred sharp sub-lines (staun-Lasker, benoni-g6,
alapin-Nf3, kid-c5, englund-Nxe5) were re-tested with the extend method and
resolve to MURKY material-vs-compensation or sacrificial positions that don't
give a cleanly-narratable stable terminus — genuinely deferred per no-garbage,
not lazy.

NEXT LAYER = PITFALLS / GEMS (mining) — DE-RISKED THIS SESSION: the amateur
explorer proxy IS reachable from the web container
(`/api/lichess-explorer?...&ratings=1600,1800,2000&fen=...` → 200 with amateur
move data). So pitfalls (common-mistakes.json) and punish-gems can be MINED
honestly here — no CI fallback needed. Procedure per opening: at each
opponent-to-move node along the taught main + variation lines, query the
explorer for the common (amateur) reply, engine-check (`_engine-eval.mjs`, ≥1500ms)
which common replies BLUNDER (student-POV swing), keep the ones the engine
refutes with a clear line, author `fen/wrongMove/correctMove/explanation/
shortNarration/sources` (common-mistakes.json, keyed by openingId) + full
punish-gem narration where the refutation is a real weapon. Gate: board-accurate
per the antiOpeningNarrationAccuracy pattern + engine-verified refutation. THEN
middlegame plans (anchor `criticalPositionFen` at each variation's spine
terminus for Gate C continuity — the 36 spines are all in anti-openings.json now),
model games (real, student-side wins), and the Naroditsky-voice re-narration.

WEAPON-MINING FINDING (2026-07-08): a generic scan of an opening's MAIN LINE
yields ~no weapons — the spine follows the DB's SOUND continuation, so the
opponent doesn't blunder on it (verified: caro-fantasy / alekhine / pirc main
lines all clean). Weapons live in specific TACTICAL SIDELINES the opponent
commonly wanders into — e.g. the Scandinavian's early …Qh5?? queen sortie
(shipped) or the Englund …Qxb2 queen-grab (shipped). So mine per-opening by
targeting the sharp branch points (early queen sorties, premature pins/grabs,
gambit-accepted greed), NOT the positional main spine. Best yield: the tactical/
gambit anti-openings (englund done, scandinavian done; try smith-morra-accepted
greed, KG-accepted, budapest …Qf6/…d6 tricks, alekhine …Nb4/…Bxf3 lines). The
positional anti-openings (nimzo, qid, qgd, grunfeld, catalan, colle) will have
FEW or no forced amateur traps — that's expected, not a gap (empty > invented).
2 weapons shipped so far (englund, scandinavian); the layer continues by
targeted tactical mining, opening by opening.

REALITY CHECK (2026-07-08, after a targeted tactical mine of budapest/alekhine/
benoni/scandi branches): genuine FORCED tactical weapons are RARE in this set —
most anti-openings are positional systems where the opponent's inferior tries
just leave them "slightly worse / down a pawn" (a `mistake`-tier positional edge,
e.g. budapest 4…Bc5 → +2.5 but White merely keeps the gambit pawn), NOT a forced
material-winning trap. Per empty > generic, DON'T ship those marginal positional
edges as red TRAP weapons — only ship a weapon when the punish is a real forced
gain (englund …Qxb2 queen-trap; scandinavian …Qh5?? hxg4 piece-win). Expect ~2-4
real weapons total across all 24, concentrated in the tactical/gambit openings;
the positional ones (nimzo/qid/qgd/grunfeld/catalan/colle/london) legitimately
get ZERO. The weapon layer is therefore much smaller than the variation layer by
nature — that's correct, not incomplete.

✅ MODEL-GAMES LAYER COMPLETE (2026-07-08) — all 24 anti-openings now carry a
real, on-repertoire, student-side-WIN model game with a hand-authored overview,
pulled from the masters explorer + game-export proxy (both reachable) and
gate-verified (modelGames-orientation + modelGames legality, 643 tests green).
Many follow the exact lesson lines (Karjakin's Austrian, Mamedyarov's Benoni
…b5/Nxb5, Carlsen bt So in the Colle dxc5, Mamedyarov's Trompowsky …Ne4, the
Staunton …Nc6, the Englund …d6). Headline games: Firouzja MATES Carlsen in the
Scandinavian; Kasparov bt Kramnik (Nimzo) & Anand (Grand Prix); Caruana bt
Carlsen (Rossolimo) & Nepo (French) & Aronian (150); Carlsen bt Kramnik (QGD)
& Grischuk (Grünfeld, Sämisch). Procedure for future pros/openings: query
`?source=masters&play=<uci>` topGames, filter winner===studentColor, fetch full
PGN via `/api/lichess-game-export?id=<id>&format=pgn`, strip headers+comments to
bare SAN (try/catch each token — chess.js THROWS on illegal, doesn't return
null), verify studentSide-win + on-repertoire opening, hand-author a real
overview (boilerplate is filtered by isNarratedModelGame). REMAINING PARITY
LAYERS: middlegame plans (finicky — board-accurate playable lines + themes gate),
student-side pitfalls, and the Naroditsky-voice re-narration.

MIDDLEGAME-PLANS FINDING (2026-07-08): most anti-opening middlegames are SLOW
MANEUVERING positions with no crisp forcing plan — an engine-walk from the
french-advance a3 terminus just shuffles (Kf1/Kg1/Nf1/Be3), it does NOT play the
"thematic" b4-b5 storm (the …c4-fixed structure denies it). So a demonstrable
plan line (student move landing on a declared break/maneuver square, per the
themes gate) can only be authored for the openings that DO have a forcing plan —
the ATTACKING ones: kid-saemisch (O-O-O + h4-h5-hxg6 storm, the Nbd7 variation),
pirc Austrian (kingside piece-storm, Karjakin's model game shows it), benoni
(the space bind + f4-f5), 150 Attack (Bh6 + kingside). For the positional
systems (nimzo/qid/qgd/grunfeld/catalan/colle/french/scandinavian) the middlegame
is a slow squeeze that resists a crisp forcing line — anchor a plan there only if
you can author a SOUND thematic line by hand (engine-verify every move; do NOT
force non-top moves to hit a theme square = soundness risk). Expect this layer to
cover maybe 6-10 openings honestly, not all 24. Same empty > generic rule.

✅ MIDDLEGAME-PLANS LAYER — the demonstrable ones are DONE (2026-07-08). 5 anti-
opening plans shipped, each anchored at a variation/main spine terminus (Gate C
continuity), every move engine-verified sound + board-accurate, all gate-green
(middlegamePlanThemes / MiddlegamePlansSection / EndgamePlansSection /
middlegamePlanner, 72 tests): rossolimo (e-file squeeze, pre-existing), benoni-
Modern (e5 break + d6 passer), 150 Attack (hxg6 h-file + e5 clamp), pirc Austrian
(f5 break + Ra3 lift, a pawn up), alekhine (c5/b4 queenside space + bishop pair).
CONFIRMED not-demonstrable (slow squeezes, engine just shuffles — do NOT force a
plan): french-advance, qgd Carlsbad (minority attack is too slow to show
forcibly), czech-benoni, grunfeld, caro-fantasy. The plans layer is therefore
~5-6 openings by nature, like the weapons layer — that's correct. PITFALLS FINDING (2026-07-08): a student-side pitfall mine (student-to-move nodes
along the spine, common move ≥1.5 worse than best) of budapest/scandinavian/
caro-fantasy returned NOTHING — same reason as weapons: the spine follows best
play, so the common student alternatives at those nodes aren't blunders. Real
pitfalls (like the Scandinavian …Qh5?? weapon) live in specific TACTICAL branches
the student can wander into, which are rare in these positional systems. So the
common-mistakes layer, like weapons, is small by nature — mine the sharp branch
points opening-by-opening, don't expect a pitfall per opening.

REMAINING: the Naroditsky-voice re-narration pass — a large stylistic rewrite of
the authored lessons into the house voice (the lessons are already board-accurate
and in a clean teaching register; this is a polish/style layer, best done as a
focused pass). That is the last outstanding parity layer.

═══════════════════════════════════════════════════════════════════════════════
SESSION SUMMARY (2026-07-08): EVERY parity layer now has real, verified content —
• Main lessons 24/24 • Variation tabs 36 across 21/24 openings • Model games 24/24
(real elite student-side wins) • Weapons 2 (all genuine forced traps; positional
systems have none by nature) • Middlegame plans 5 (all demonstrable; slow-squeeze
openings have none) • NEW board-accuracy gate (antiOpeningNarrationAccuracy).
The "small by nature" layers (weapons/plans/pitfalls) are covered where genuine
content exists and documented where it doesn't (empty > generic). Only the
Naroditsky-voice re-narration remains. All shipped to main, all gate-green.
═══════════════════════════════════════════════════════════════════════════════ Added since the 26-tab note:
dutch-staunton(Nc6 gambit), smith-morra(Qe2), london(+Nf3), pirc(Dragon),
kid-saemisch(Nc6/a6), benoni(Modern/Czech), colle(c3/dxc5), englund(d6/
Zilbermints), alapin(a3), grand-prix(Bb5, extended past the queen-trade to a
stable terminus). METHOD for gambit/tactical lines: compute exact material at
every beat; only ship a STABLE (non-mid-capture) terminus — extend one ply past
a forced recapture if needed. NEXT LAYER: pitfalls (common-mistakes) across all
24, then gems + middlegame plans + model games + Naroditsky-voice rollout. The
handful of still-deferred sharp variations (staun-Lasker, kid-c5/Nbd7, benoni-g6,
colle-b3, englund-Nxe5, alapin-Nf3, kg lines) want a careful trim-and-reverify
pass like the grand-prix one.

Earlier note — 26 VARIATION TABS across 16 openings — rossolimo(3), caro-fantasy(3), french(1),
scandinavian(2), alekhine(3), budapest(1), grunfeld(1), qgd(1), nimzo(2),
qid(1), london(2: Steinitz c3+Nf3), catalan(1), dutch-staunton(1: Nc6 gambit,
material-verified), smith-morra(1: Qe2 gambit), pirc(1: Dragon), kid-saemisch(2:
Nc6 Panno + a6). Method for gambit/sharp lines: compute exact material per beat
so narration never misstates who's up a pawn; only ship lines with a STABLE
(non-mid-capture) terminus. DEFERRED — unstable mid-capture termini or too sharp,
need a careful trim+reverify pass: staunton-Lasker, grand-prix-Bb5 (…Qxd1),
kg-Kieseritzky (sac line), kid-c5 (…b5 Benko-sac), kid-Nbd7 (opposite-castling,
mid-exchange terminus), englund variations (gambit), benoni variations (mixed),
colle (6 garbage-tail auto-tabs), alapin (marginal), trompowsky (0 vars),
modern-150 (transpositions). NEXT: the deferred sharp/gambit variations (careful
pass), then pitfalls across all 24, then gems + plans + model games +
Naroditsky-voice rollout.

**Progress (2026-07-07):** 4 anti-openings have verified, gate-green main-line
Watch lessons on `main` (Rossolimo full incl. 3 variation tabs + a middlegame
plan). All 4-axis verified (DB/Stockfish data · board-accurate · engine-sound ·
no blunders). Openings #5-6 spines prepped. NEXT: pirc-austrian main (careful,
sharp), then continue main lessons for the clean openings; variation tabs + gems
(Pass 2) after the main-line breadth. Author only clean/thematic or honestly-
framed lines — defer messy/marginal ones (no garbage).

**Opening #1 progress (anti-sicilian-rossolimo):** main-line Watch `LessonScript`
authored (`antiSicilianRossolimo.ts`, 6 beats to move 15) + registered — Watch
now uses `LessonPlayer` (Gate A) on the DB-grounded middlegame-reaching spine
(Gate B). Passes lessonIntegrity + narrationAccuracy + lessonSources + lessonDepth
+ wlppNarration. STILL TODO for #1: per-variation lessons (e6/d6/Nf6 tabs),
gems, middlegame plans, model games (White wins), pitfalls, overview/keyIdeas,
extend the variation pgns in anti-openings.json.

## Already shipped this session (context)
- 20 fabricated sublines re-extended + false narration removed (main `f6ae844`).
- Academy opening-courses removed; Counter-Weapons tab added; wisdom/book
  de-dup; `/academy` = books/library (main `f6ae844`, `bebc00c`).

## Next-session pickup
Start at the first opening without all boxes ticked. Follow the per-opening
pipeline. Read `docs/opening-masterclass-playbook.md` +
`docs/pro-rep-efficient-build-recipe.md` first. Data first — never author from
memory. Empty > generic > invented. Anti-opening data lives in
`anti-openings.json` + `course-sublines.json`; spine extends from the masters DB.

## SUBLINE PER-MOVE NARRATION (2026-07-08) — David: "sublines neglected, per-move narrations, use Naroditsky's teaching"

**KEY FINDING — the neglect is worse than "sparse."** Many sublines carried
GENERIC copy-paste beats ("h4 — storm the kingside", "O-O — king safe", "Rh3 —
rook lift to attack", "Bd3 — aim at the king") that were board-WRONG for their
specific line. In anti-french-advance alone, 6 constants had intros/beats that
described a DIFFERENT line than the moves actually play (e.g. "storm the
kingside" when Black castles QUEENSIDE; an intro about a …Bb5/c4 break on a line
with no such moves; "Nxa5 grabs the pawn" when it's a knight trade). Fixing
these board-lies is higher-value than merely adding beats — it IS the neglect
David sensed. **Every future family: read each subline's ACTUAL move list +
per-ply FENs before touching narration; do not trust the existing beats.**

**DONE — anti-french-advance: ALL 15 subline keys (14 constants N106-N119)**
densified to genuine per-move, board-accurate teaching in the house voice,
engine-checked termini (all sound: +0.3..+1.1 White, except Wade N114 a
sanctioned -0.5 sharp gambit framed honestly). Removed a stale inline-beats
override on the 73% Nc6@7 key that was masking the densified N115. Gates green
(sublineNarration 42501 tests + antiOpeningNarrationAccuracy), typecheck clean.
Shipped main `f66fc12` (4 top lines) + `8c96a76` (remaining 10).

**METHOD (locked for the rollout):** per subline — (1) dump the real move list
from course-sublines.json; (2) `node` a chess.js walk to print per-ply FENs;
(3) engine-check the terminus from the STUDENT's POV (`scripts/_engine-eval.mjs`,
`score cp` is side-to-move — a sound line is ≥ ~-1.0; a negative eval is only OK
for an honest sharp gambit, framed as such); (4) author a beat on EVERY move
from the trigger onward, each saying something TRUE about that move in THAT
position (plan/idea/why), ≤8-word `sayShort` cue; (5) arrows only from a PIECE
with a clear sight-line (pawn-origin arrows auto-convert to highlights), else
highlights (KEY yellow / SOFT blue); (6) sources = valid concept ids
(verify against chess-concepts.json — pos-space/pawn-chain/pos-center/
pos-initiative/pos-development/pos-bishop-pair/pos-outpost/att-kingside-storm
exist; pos-weak-pawns/pos-weakness do NOT) + a reputable URL.

**REMAINING (~522 subline keys across ~40 families) — multi-session.** Big
counts first: anti-colle-black 60, anti-kid-saemisch 50, anti-alekhine-modern
39, anti-benoni-push 39, anti-caro-fantasy 38. E4-family sublines live in
`sublineNarrationE4Other.ts` (caro-fantasy N87-N105, grand-prix N120+,
scandinavian N168+, caro-kann N209+, alekhine N0-N9); E4E5 + D4Flank in their
own files. Also sweep the 26 inline `{ ...Nxxx, beats: [...] }` overrides — most
are legit (shared intro, per-line beats) but each likely carries the same 3
generic stale beats and needs the same board-accurate densification.

## SUBLINE ROLLOUT — anti-caro-fantasy COMPLETE (2026-07-08 cont.)

**DONE — anti-caro-fantasy: ALL 38 subline keys (28 constants N78-N105)** densified
to per-move, board-accurate teaching. Replaced the generic 3-beat stubs (which
routinely overclaimed a winning attack / "castle into the attack" with queens
off / "storm the kingside" against a central king). Every terminus engine-checked
from the STUDENT's POV: winning lines taught as wins (N97 queen-trap +5.3, N93/N99
passed-pawn/pawn-up, N102/N94 attacks), pleasant edges as edges, and the genuinely
EQUAL lines (N92/N104/N83/N105/N100) + the one slightly-worse line (N78 −0.47)
framed HONESTLY ("it's level, don't overpress") rather than sold as advantages.
The sharp king-walk line (N91/N103) taught as a queenless small-edge endgame.
Arrow sight-line checker run on every batch — caught + fixed ~9 slider arrows
drawn through a blocking pawn/knight across the family. Gates green (42498),
typecheck clean. Shipped main f545c9c (top-8) + 34556ac (mid-8) + [this commit]
(final-8).

**Two families now fully done:** anti-french-advance (15 keys) + anti-caro-fantasy
(38 keys) = 53 subline keys at per-move parity. ~470 keys remain across the other
~38 families. Method unchanged (see the block above). Next biggest untouched:
anti-colle-black (60), anti-kid-saemisch (50), anti-alekhine-modern (39),
anti-benoni-push (39). E4-family remaining constants in sublineNarrationE4Other.ts;
E4E5 + D4Flank families in their own files.

## SUBLINE ARCHITECTURE MAP + ROLLOUT STATE (2026-07-08 — READ THIS FIRST next session)

**The merge (sublineNarration.ts `_SUBLINE_NARRATION`, later spread WINS):**
base `E4E5 → E4OTHER → D4FLANK`, then override passes
`HELP_A → A2 → B → C → D → E → FIXES → HELP_F`, then all the `PRO_*` maps. A key
defined in HELP_F beats the same key in a base file. My french-advance +
caro-fantasy edits live in E4OTHER and are NOT overridden by any HELP/FIXES key
(verified) — they render live. ✅

**🚨 The ENTIRE subline corpus is SPARSE (~2-4 beats/key), base AND HELP files
alike.** The HELP_A-F pass (David 2026-06-19 "covers completely") only means
every key has an intro + a FEW beats — NOT per-move. E.g. HelpF `AGE_BG7_5`
(anti-grunfeld) = 2 beats on a 20-ply line. So per David's "per-move / explain
every step" bar, EVERY family still needs densification — being HELP-covered
does NOT mean done. (HELP families at least have board-CORRECT sparse beats;
several base-file families additionally have board-WRONG copy-paste beats — the
worse neglect — which is why french-advance/caro-fantasy were the right first
targets.)

**anti-* families by owning file (where to edit) — DONE / TODO:**
- ✅ DONE (per-move, this session): anti-french-advance (16, E4OTHER),
  anti-caro-fantasy (38, E4OTHER).
- TODO in E4OTHER (base, generic — warm file, same pattern/helpers as done work):
  anti-alekhine-modern (39), anti-modern-150 (27), anti-scandinavian (24),
  anti-grand-prix-black (20), anti-smith-morra-black (20), anti-alapin-black (19),
  anti-kings-gambit-black (16), anti-sicilian-rossolimo (16), anti-pirc-austrian (2).
- TODO in D4FLANK (base, generic, C-prefixed constants): anti-colle-black (60).
- TODO in HELP files (sparse-but-correct; lower priority — densify after the
  generic base families): anti-benoni-push (39, HelpB), anti-kid-saemisch (50,
  HelpF/A), anti-qgd-exchange (20, HelpB), anti-london-black (20, HelpB),
  anti-catalan-black (16, HelpB), anti-dutch-staunton (21), anti-nimzo-qc2 (25),
  anti-englund (20), anti-qid-fianchetto (13), anti-grunfeld-exchange (6),
  anti-budapest (10). Edit the HELP constant that WINS the merge, not the dead
  base one.

**NB — beyond the anti-* task:** course-sublines.json ALSO has the masterclass
base openings (french-defence 100, ruy-lopez 90, sicilian-najdorf 90, …) and all
pro-rep families (pro-carlsen-*, pro-hikaru-*, …), thousands of keys, same sparse
state. Those are separate tasks (masterclass / pro-rep), not task #5 (anti-*).

**REUSABLE TOOL built this session — the arrow sight-line checker.** Slider
arrows (B/R/Q) drawn THROUGH a blocking pawn/knight are the #1 board-accuracy bug
(caught ~14 across the two families). Before shipping any subline batch, run the
checker: per constant, replay the line to each beat's atMove and confirm every
`A(from,to)` has a clear path (knights/kings/pawns exempt). Snippet is in the
session transcript; it should be promoted to a committed test or script.

## CORRECTION — file-ownership ≠ generic; density spot-check (2026-07-08)

The owning-file map above tells you WHERE to edit, NOT whether a family needs
work. Spot-checked the E4OTHER "TODO" families: ALL are ~3.0 beats/key (sparse,
not per-move), but they split into two quality tiers:
- **Generic copy-paste stubs (board-WRONG risk — TOP priority, same as
  caro-fantasy was):** anti-alekhine-modern, anti-scandinavian, anti-modern-150,
  anti-sicilian-rossolimo — carry the tell-tale phrases ("gain space, kick",
  "storm the kingside", "keep the big centre") and may misframe their actual line.
- **Well-written but sparse (like anti-pirc-austrian — lower priority; existing
  beats are board-correct, just need the in-between moves filled to per-move):**
  anti-grand-prix-black, anti-smith-morra-black, anti-alapin-black,
  anti-kings-gambit-black, and anti-pirc-austrian itself (already rich, 2 keys —
  effectively fine; leave unless doing a full per-move sweep).

So the priority order for the per-move rollout: (1) the generic-stub families
above (board-accuracy + density), (2) anti-colle-black (60, D4Flank — check its
tier), (3) the well-written-but-sparse families (density only), (4) the HELP-file
families (sparse-but-correct). Always ENGINE-CHECK each terminus (student POV) and
run the ARROW SIGHT-LINE CHECKER before shipping — both caught real bugs every
batch. Per-family: dump moves → FEN-walk → eval terminus → per-move beats → arrow
check → valid concept sources → gate + typecheck → ship to main → verify prod.

**Session tally (2026-07-08):** anti-french-advance (16) + anti-caro-fantasy (38)
= 54 keys taken to per-move parity, board-verified, engine-sound, shipped to main
(commits f66fc12 → 31f26a4) and verified live on prod. ~470 anti-* keys remain
(multi-session); method + architecture + priority order all locked above.
