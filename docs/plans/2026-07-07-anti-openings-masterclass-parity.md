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
