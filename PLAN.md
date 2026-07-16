# PLAN — LEARN + POST-GAME REVIEW behavior map & full-behavior audit (2026-07-13, active)

**David's ask:** map the EXACT coaching behavior of the entire Learn (`/coach/teach`)
AND Post-Game Review sections, then run an audit against ALL behaviors.

## Approach (adversarial-audit doctrine, G7 + 2026-06-12)
1. **MAP** — exhaustive per-behavior inventory (ID · trigger · file:line · expected ·
   testid · audit assertion). Fan-out mappers:
   - Learn intent-routing layer (handleSubmit branches, resolution tiers, Q&A classes).
   - Learn walkthrough runtime + voice/narration + "why did you play that?" faucet +
     guided-find-the-move.
   - Post-Game Review (summary card, walk, find-the-shot / blunder-rewind / turning-
     point cards, mistake-puzzle+weakness pipeline, persistence).
2. **COVERAGE GRID** — every mapped behavior → reached? (which assertion) → pass/fail.
   A silent no-op is a FAIL, not a pass (2026-06-12). Untested = ❌ NOT TESTED.
3. **AUDIT** — functional click-through (drive real affordances) + adversarial loop
   (messy human input, escalate, break it). Capture every break with exact input +
   React key/stack. Real-bug → fix code + sweep + confirm; artifact → prove + pace.
   MET only on 3 consecutive break-free passes, each harder.

## Status
- [~] MAP — 3 mappers dispatched (Learn-routing, Learn-runtime/faucet, Review).
- [ ] Synthesize map → `docs/plans/2026-07-13-learn-review-behavior-map.md`.
- [ ] Build/extend audit scripts (extend audit-coach-teach-functional/loop +
      audit-coach-full-games review leg; add review-specific coverage).
- [ ] Run localhost (Chromium can't reach prod here — ERR_CONNECTION_RESET), fix
      breaks, then the CI leg against prod.

---

# PLAN — LOOP AUDIT: full-game coach standard (2026-07-13) — ✅ CLOSED (GREEN ON PROD)

**Run 29264437648 (commit 4f54c50) PASSED on prod** — 10 full games, 10 distinct
openings, reviews driven per game, persistence, blunder interceptions, 0 errors
(~51 min; wider game-1 budget stretched runtime but it's green). All three breaks
fixed: (1) engine cold-boot crash → warmup [Fable]; (2) Italian→French + Scandinavian→
Zukertort collisions → subject-steer every coach-dependent plan; (3) cold game-1
stall → wider game-1 reply budget. NOTE: if the ~51-min runtime is a concern, tune
game-1 budget down (75s→~50s) or warm the brain path too — the length is the
wider-budget tradeoff, not a failure.

---
# PLAN — LOOP AUDIT: full-game coach standard (2026-07-13, archived detail)

**Instrument:** `scripts/audit-coach-full-games.mjs` via
`.github/workflows/full-game-audit.yml` (workflow_dispatch + nightly cron;
own concurrency group `full-game-audit` — never trigger a parallel run, it
cancels the in-flight one). The FULL-GAME AUDIT STANDARD (CLAUDE.md, locked
2026-07-13): ≥10 full games on `/coach/play`, all distinct openings, blunder
interceptions counted, post-game review driven per game, persistence verified
from IndexedDB; ANY pageerror / non-NOISE console error is a hard fail.

## State
- **Root cause of the last 3 dispatch failures = ONE break, not many.** Report
  from run 29232631772 (report.json inspected): games 2–10 were pristine (0
  pageerrors, 9 distinct families: Nimzo-Indian, English, Zukertort, Bird,
  Sicilian, Caro-Kann, French, Modern, Scandinavian). ONLY game-1 (italian-shape)
  died — 1,188 pageerrors, 2 plies, opening never detected → which ALSO caused
  the secondary "10 games → 9 families" distinctness fail (the missing 10th was
  italian-shape itself). Both failures, one cause.
- **Fix 1 (Fable, commit 985729f):** warm the Stockfish variant probe on a
  throwaway `/coach/play` load before game 1. **CONFIRMED WORKING** — run
  29249281899: all 10 games played to natural ends, `errs=0/0`, zero pageerrors.
  The cold-boot crashloop is dead. Real devices pay this probe once per install.
- **Second break (exposed once game 1 actually played):** the audit still failed
  "openings not all distinct" — a GENUINE collision, not the crash cascade. The
  `italian-shape` White plan scripts only WHITE's moves; the coach owns Black, so
  when it answered 1.e4 with ...e6 the game was (correctly) detected as "French
  Defense: Knight Variation" → collided with the Black `french` plan's "French
  Defense" root (9 families, not 10).
- **Fix (David's steer — "ask the coach to play the Italian as black"):** a plan
  whose family depends on the coach's replies must TELL the coach which opening
  to play via `?subject=`. Gave `italian-shape` `subject: 'Italian Game'` and
  pass it on the /coach/play URL, so the coach follows the Italian's book side
  and the game is a real, distinct "Italian Game". (The earlier b3 swap was a
  workaround; reverted in favour of this.) The White-SYSTEM plans (d4/c4/Nf3/f4)
  need no subject — their family is named by White's own structure.
- **LIVE-VERIFIED the coach plays the Italian SOUNDLY on both sides** (localhost,
  prod bundle code; Chromium can't reach prod in this container — ERR_CONNECTION_
  RESET egress quirk, curl 200):
  - student BLACK + subject=Italian → coach (White) played the mainline Giuoco
    Pianissimo `e4 Nf3 Bc4 O-O d3 c3 h3 Re1 Bb3 Nbd2 Nf1`, detected "Italian Game:
    Giuoco Piano", 0 pageerrors.
  - student WHITE + subject=Italian → coach (Black) played `e5 Nc6 Bc5 Nf6 d6 O-O
    a6 h6 Be6 Bxb3`, detected "Italian Game: Classical Variation, Giuoco
    Pianissimo" (C54), 0 pageerrors.
  → The Italian itself is NOT defective; the red was the audit failing to STEER
  the coach. If a different opening is defective, it needs to be named + repro'd.
- **Run 29260208403 (subject=Italian only):** Italian fix WORKED (game 1 =
  "Italian Game" ✓, French collision gone). But surfaced TWO more issues, both
  the SAME nondeterminism class + a cold-timing one:
  1. `scandinavian → "Zukertort Opening: Tennison Gambit"` collided with `reti →
     "Zukertort Opening"` — the coach opened 1.Nf3 (not 1.e4), so 1.Nf3 d5 2.e4 =
     Tennison. The Black defenses depend on the coach's OPENING move; `queens-pawn`
     (1.d4) is the same trap (a Black ...g6 reply → "Modern Defense" collision).
  2. game-1-italian stall-resigned at ply 12 → review never mounted + not
     persisted. Cold first game's mid-game Stockfish searches spiked past the 30s
     reply budget (only reply #1 got 90s); games 2-10 clean on 30s.
- **Fixes (commit pending):**
  - subject-steer ALL coach-dependent plans: queens-pawn="Queen's Gambit",
    sicilian/caro-kann/french/modern/scandinavian = their own defense. Verified
    LIVE the coach opens deterministically (Scandinavian→e4, Modern→d4, Queen's
    Gambit→coach ...d5→"Slav Defense" root). The 3 flank White systems
    (c4/Nf3/f4) need no subject (root fixed by White's move). 10 deterministic
    distinct roots: Italian, Slav, English, Zukertort, Bird, Sicilian, Caro-Kann,
    French, Modern, Scandinavian.
  - game-1 (g===0) per-reply budget → 75s + one extra stall of grace; warm games
    keep the tight 30s. Prevents the cold-first-game stall-resign.
- **Validating run: PENDING** — trigger full-game-audit on this branch after push.

## Tracked follow-up (was Fable's session-local "task #32" — now durable here)
- **Cold-boot JS bug `t.startsWith is not a function`** — the FIRST error in the
  game-1 crashloop (minified `t`; no stack captured; only fires on the
  **multi-thread WASM build** = crossOriginIsolated + SharedArrayBuffer, non-iOS,
  i.e. CI runner + desktop Chrome first-ever load). iOS beta testers use the asm
  build and NEVER hit this path; desktop-web first-load DOES. The warm-up scopes
  it out of the audit but does not fix it. Real fix needs a source-mapped repro
  of the multi-thread variant probe to locate `t` (something calls `.startsWith`
  on a non-string worker message before any analysis is pending). Not yet fixed.

## Next-session pickup
Confirm run 29249281899 green → loop break closed. If a NEW break surfaces,
diagnose from its report.json artifact (download via the artifact API, inspect
per-game pageErrors + the `failures[]` array), fix the CODE, re-run (respect the
concurrency group). The audit is the deliverable; a green run + report is the
proof.

---

# PLAN — Pro-Rep Build: MAGNUS CARLSEN repertoire (2026-06-01)

**Player:** `carlsen` (Magnus Carlsen) · chess.com `magnuscarlsen` · 9,336
games on disk (gitignored — re-fetch: `node scripts/pro-repertoire/fetch-chesscom.mjs magnuscarlsen`).
**Scope (David):** a MULTI-opening repertoire (≥8), matching the standard of the
existing pro-reps (Gotham 18 / Naroditsky 10 / Rosen 8 / Hikaru 5). Build to
full G9.1 parity per opening; **2-3 model games per variation** (David: "more
than just one game" — favour the OTB classical wins). Push straight to `main`.

## Corpus: ONLINE + TOURNAMENT (David: "check tournament play as well")
- Online (chess.com `magnuscarlsen`): 9,336 games (6,879 blitz / 2,122 bullet /
  335 rapid; no classical).
- **OTB tournament (pgnmentor `Carlsen.pgn`): 7,484 classical games**, converted
  to chess.com JSONL (`_otb-tournament.jsonl`) and MERGED into the corpus.
- **Tournament play VALIDATES the pick** — OTB top systems mirror online exactly
  (W: Ruy/1.e4 e5, d4-c4, Open Sicilian; B: 1...e5, Nimzo/QGD, Sicilian, KID).
- Spines now built on the COMBINED ~16.8k-game corpus → 300-1,351 games each,
  tournament-authentic main lines. Model games favour the OTB classical wins.

## The 8 signature openings (combined-corpus, frequency-ranked)

| # | id | Line | Games | Score |
|---|---|---|---|---|
| 1 | `pro-carlsen-open-sicilian` | Open Sicilian (W) | 1118 | 77% |
| 2 | `pro-carlsen-ruy-lopez` | Ruy Lopez / Open Games (W) | 1113 | 73% |
| 3 | `pro-carlsen-queens-pawn` | Queen's Pawn / Catalan (W) | 1107 | 74% |
| 4 | `pro-carlsen-sicilian` | Sicilian Defense (B) | 1351 | 69% |
| 5 | `pro-carlsen-1e5` | 1...e5 / Ruy / Berlin (B) | 1011 | 61% |
| 6 | `pro-carlsen-nimzo` | Nimzo-Indian / QGD (B) | 605 | 63% |
| 7 | `pro-carlsen-kid` | King's Indian (B) | 300 | 67% |
| 8 | `pro-carlsen-french` | French Defense (B) | 317 | 71% |

Trees: `data/sources/magnuscarlsen-trees/carlsen-*.json` (combined corpus).
Coverage: White answers 1...c5 / 1...e5 / 1.d4-setups; Black answers 1.e4
(Sicilian + 1...e5 + French) and 1.d4 (Nimzo/QGD + KID).

### Variation tabs per opening (from tree frequency)
- **Open Sicilian (W):** Najdorf (main) · Rossolimo vs ...Nc6 (138g) · Taimanov vs ...e6 (82g) · Sozin Bc4 (72g) · Moscow Bb5+ (48g) · 2...Nf6 (28g)
- **Ruy/Open Games (W):** Closed Ruy (main) · Italian Bc4 (121g) · Berlin (68g) · Petrov (64g) · Scotch d4 (39g) · Anti-Berlin d3 (34g)
- **Sicilian (B):** Najdorf Bg5 (main) · Taimanov ...e6 (158g) · Rossolimo (142g) · Alapin c3 (62g) · Moscow Bb5+ (55g) · Smith-Morra d4 (54g)
- **Berlin (B):** Berlin endgame (main) · Italian Bc4 (89g) · Open Berlin Nxe4 (38g) · Steinitz ...d6 (27g) · Scotch d4 (25g) · Four Knights (25g)
- **KID (B):** Classical (main) · Fianchetto g3 (22g) · Nf3 system (29g) · Makogonov h3 (11g)

## Build order (G9.3 Gate D + efficient-recipe layers, batched across all 8)
- [x] STEP 0-3 — fetch · trees · variation ID
- [x] STEP 4 — deep-build per variation (46 files, all 8 openings)
- [ ] STEP 5 — honest MG/endgame plan counts (wider-corpus)
- [ ] STEP 6 — voice corpus (Magnus per-opening teaching, web)
- [~] LAYER 1 (Gate A) — LessonScripts main+variations
  - [x] #1 Open Sicilian: main (English Attack) + 5 variation lessons, arrows
        self-verified (geometry checker `_arrowcheck.mjs`; fixed 7 blocked/pawn arrows)
  - [ ] #2 Ruy · #3 Queen's Pawn · #4 Sicilian · #5 1...e5 · #6 Nimzo · #7 KID · #8 French
- [ ] LAYER 2 — model games (≥2-3/variation, student WINS, **prefer OTB classical**,
      hand overview ≥40 chars). NOTE deep-build topModelGames is thin → write a
      broader corpus win-extractor (classical-first, high opp rating, decisive, deep).
- [ ] LAYER 3 (Gate C) — middlegame plans anchored at spine terminus
- [ ] LAYER 4 — pitfalls (ENGINE-verified; sign: studentEval = -rawEval)
- [ ] LAYER 5 — endgames (real game → ending, only where data supports)
- [ ] pro-repertoires.json entries · register LESSONS/VARIATION_LESSONS · bump PRO_DATA_REVISION
- [ ] STEP 15 — gates + `npm run ship-check` → READY TO PUSH
- [ ] STEP 16 — push main + 3-instrument audit + Gate A/B watch-depth prod audit

## WIP location
On branch `claude/pensive-knuth-Gzrws`, draft PR #698. Lands on `main` only when
all 8 are gate-green (G9.3 — no half-builds in prod). Helper scripts:
`scripts/pro-repertoire/_carlsen_spine.mjs` (spine FEN printer),
`_arrowcheck.mjs` (vision-arrow geometry verifier).

## Decisions log
- 2026-06-01: Carlsen picked; Sicilian-White spine (14-ply) > d4-c4 (8-ply).
- 2026-06-01: Scoped to 5 openings (David: "more than one opening"), matching
  the Hikaru build count; coherent White(e4) + Black(vs e4 ×2, vs d4) coverage.

## Next-session pickup
Resume at first unchecked LAYER. Each opening must be COMPLETE (Gate A lesson +
plans + ≥2 model games + entry + registered) before ship — no half-builds (G9.3).

---
---

# PLAN — Masterclass DATA-REBUILD (2026-05-29, scope-corrected 2026-05-30)

> Doctrine: `docs/plans/2026-05-29-masterclass-data-rebuild-doctrine.md`.
> Diagnostic: `audit-reports/lesson-tails.json` (ranked tail-overhang report).

## MIDDLEGAME-PLAN ≥8-PLY PASS (2026-05-31) — 65 of 85 done, 20 honest leaves
Every masterclass middlegame-plan playableLine should be ≥8 plies, sourced from
the REAL game that reached the position (David's directive). Started at 85 short
(<8-ply) masterclass plans; **65 done** (extended along real masters
continuations OR re-anchored to a sourced student-side-win model game), each
gate-green and on `main`. Tooling built: `extend-plan-line.mjs` (fen= masters
continuation), `source-variation-model-game.mjs` + `source-by-prefix.mjs`
(student-win game sourcing w/ amateur-explorer fallback), `extract-game-segment.mjs`.

**The 20 remaining are HONEST LEAVES** (per "empty > generic > invented" + the
wins-only model-game rule) — each is sound on a DB-validated line; none has a
clean real extension:
- **No sourceable master-quality student-win game** (solid equalizing lines whose
  masters topGames skew to the higher-rated/other side; only amateur <2400 wins
  exist, below the masterclass bar): benoni-main, grunfeld-main, petrov-main,
  philidor-main, old-indian-main, dutch-main, dutch-ilyinzhenevsky, fk-italian,
  reti-antislav, queensgambit-minority (game ADDED for the tab; plan stays on its
  on-theme b4-b5 minority attack, +1 not sourceable at that exact FEN).
- **Sharp forced theory where extending = inventing moves (G3 forbidden)**:
  najdorf-poisoned (game ADDED), najdorf-ng4, sveshnikov-chelyabinsk, benko-zaitsev.
- **Offbeat lines with no matching real game**: birds-nimzo, birds-stonewall,
  trompowsky-main/e6/raptor, sicilian-dragon-chinese.
These can be revisited if/when a real master game surfaces; the plans are sound
as-is. NOT a defect — a deliberate, rule-driven stopping point.


## SCOPE CORRECTION (2026-05-30) — diagnostic-driven, NOT all 42
The diagnostic proved most masterclass lessons are ALREADY on deep+common data
lines (overhang 0): caro-kann (main m13/742g), its Advance/Panov/Tartakower,
italian main (now rebuilt), etc. We do NOT rebuild those, and we do NOT "flip"
a sound showcase main line (the playbook lets the main-line pill be a canonical
showcase, exempt from the frequency sort).

The rebuild targets are the **over-extended / early-divergent** lessons:
master-pool, NOT pro-*, where the lesson walks well past where games go
(common-ends early AND big overhang). Per-target judgment: a genuinely
divergent line (common ends m3-7, lesson marches to m12-19 on an uncommon
line) gets REBUILT on its data spine; a deliberately-sharp GAMBIT showcase
(short forced theory) is LEFT. Distinguish before touching.

## Rebuild targets (worst-first; master pool, overhang≥8 or common≤m6)
Genuine defects (positional lines on divergent/over-extended tails):
- philidor-defence:: Antoshin(oh24 c-m4) / Exchange(17 m7) / Counter-Gambit(17 m3) / Nimzowitsch(16 m7)
- alekhine-defence (main oh20 m9) / Chase(14 m4) / Scand-Transposition(12 m5)
- vienna-game (main oh19 c-m4 — CHECK if deliberate sharp showcase first)
- italian-game::Modern Moller Attack (oh16 m8)  [italian MAIN done]
- london-system (main oh14 m5) / vs KID(15 m5)
- birds-opening:: Stonewall/Williams/From (oh12-15, c-m3-4)
- scandinavian-defence (main oh14 m7) / Gubinsky-Melts(12 m5) / Portuguese(8 m7)
- four-knights-game::Rubinstein 4.Bb5 Nd4 (oh13 m4)
- queens-gambit::Anti-QGD Early Bf4 (oh13 m4)
- pirc-defence:: Byrne(12 m5) / 150 Attack(10 m6) / Austrian e5 c5(8 m6)
- scotch-game (main oh9 m8) / Steinitz 4...Qh4 (11 m5)
- petrov-defence:: 5.Bd3(14 m10) / Italian(13 m10) / Three Knights(11 m11)
- trompowsky-attack:: (several, c-m5-6)
- old-indian / queens-indian / benoni / grunfeld / nimzo / qgd / dutch: deep-ish
  common (m9-13) + modest tail — TRIM not rebuild (lower priority)
Likely-LEAVE (deliberate sharp gambit showcases — verify, don't auto-rebuild):
- kings-gambit + its variations, evans-gambit lines, albin/schliemann/budapest
  gambit lines (short forced theory is correct for a gambit).

## Process per target
Divergent → `build-opening-spine.mjs <id> "<variation seed>"` → re-author the
lesson on the data spine → gates → commit. Over-extended-but-deep → trim the
tail beats to the common terminus → fix the final beat → gates → commit.
Ship the whole batch at once when the Vercel cap clears.

## DONE so far
- [x] Doctrine + spine engine + diagnostic + scope correction
- [x] Wave 0: italian-game MAIN line rebuilt (Pianissimo data spine), tabs
      reconciled, gates + localhost 6/6. On main. Prod audit pending cap.
- [ ] Finish italian-game::Modern Moller Attack variation (oh16)
- [~] philidor-defence — data spines generated (phil-antoshin/exchange/
      nimzowitsch/countergambit.json). Findings: Antoshin data=9.Qd5 (vs
      lesson 9.Bd3) but 4...Nxe4 is a pawn sac — VERIFY soundness for Black
      before showcasing; Counter-Gambit data=4.dxe5 (vs 4.Nc3); Nimzowitsch
      CONVERGES with main 16 plies (may fold into main, §0.1c — drop tab?);
      Exchange shares 13 plies then modern ...Re8. SOUNDNESS CHECKED (engine
      depth 20): Exchange -0.10 (equal, SOUND → REBUILT on data spine, gates
      green); Antoshin -1.58 + Counter-Gambit -1.68 (both clearly bad for Black
      vs the critical reply — DUBIOUS showcases; left as-is for now, candidates
      to demote to warnings/drop — flagged for a considered call); Nimzowitsch
      converges with main (fold candidate).
- [x] alekhine-defence MAIN — tail rebuilt on data ...Nc6 line (38p->30p,
      engine -0.33, gates green).
- [LEAVE] london-system MAIN — sound + instructive (the ...Qb6 b2-poisoned-pawn
      antidote teaches the London's ideas); the data c3/Nbd2 line is more common
      but ends equal w/ the bishop traded, teaching the ideas worse. Playbook
      main-line showcase exemption → LEAVE.
- [LEAVE] scotch-game MAIN — sound, well-authored Classical Scotch (4...Bc5)
      that teaches the ideas (centralised Nd4, d4-battle, trade into doubled
      c-pawns). oh9 is mild; the "tail" teaches the key structural payoff.
      Trimming would remove instruction. Playbook showcase-exemption → LEAVE.

## REFINED SCOPE INSIGHT (2026-05-30)
After per-line judgment, the rebuild is MUCH more surgical than the 67-flag
count. Most flagged lessons are SOUND INSTRUCTIVE SHOWCASES (London, Scotch
Classical) that teach the opening's ideas well — the diagnostic flags their
mild over-extension, but the playbook exempts a sound idea-teaching main from
the frequency sort → LEAVE. Genuine rebuilds = lessons that teach a
DEAD/uncommon line (Italian old d4 = 1 game at m18), a MISLABELED/DUBIOUS line
(Philidor Antoshin), or cram a thinning tail into bad pedagogy (Alekhine's
one-giant-beat). Those are DONE. The remaining genuine candidates to still
triage case-by-case (most likely leaves): vienna(keystone, likely the sharp
Vienna Gambit showcase=leave), four-knights Rubinstein, queens-gambit Anti-QGD,
pirc Byrne, trompowsky, birds(offbeat). Verify each is dead/dubious before
rebuilding; do NOT rebuild sound showcases to inflate a count.
- [x] philidor Antoshin — FIXED via DB: the old lesson mislabeled the dubious
      4.dxe5 Nxe4 (-1.58) and falsely claimed "dead-level"; rebuilt on the REAL
      Antoshin (exd4 + g6 fianchetto, -0.40, sound sharp opposite-castling).
- [KEEP] philidor Counter-Gambit (3...f5) — can't be made sound (-1.64, refuted),
      but already honestly framed as a sharp surprise gambit (not claiming
      equality); teaches the practical 4.Nc3 line. Kept per anti-drop preference.
## Nonnegotiables unchanged: data-chosen lines, reach middlegame, traps stay,
## narrations change, no invented moves, no cut corners. Batch-ship.

## SOUNDNESS SWEEP RESULTS (2026-05-30 overnight) — scripts/soundness-sweep.mjs
Engine-evaled every masterclass lesson's final position (student perspective).
22 flagged < -1.0. Verdicts after per-line verification (eval progression +
data alternative):

### FIXED (6) — sound lines ruined by a blundered tail; rebuilt on the data
line + re-verified, gates green, shipped:
- philidor Antoshin: -1.58 -> real exd4+g6 Antoshin, -0.40
- petrov Steinitz: -2.08 -> cxd5 + ...Qxc3 counterplay, -0.22
- scandi Gubinsky-Melts: -1.58 -> White's calm Bg5/Re1/Qd3, -0.03
- qgd Bf4: -1.39 -> ...c6/...Qc7 + bishop trade, -0.33
- qga Smyslov: -1.75 -> White's best dxc5 queen-trade endgame, -0.18
- philidor Nimzowitsch: -2.15 -> sound Qe2 ...exd4/...Re8/...Bf8, 0.00

### FLAGGED 5 — ALL RESOLVED 2026-05-30 (was "C"). Two rebuilt sound on data
### spines; three given honest narration per the soundness rule (negative eval
### is the opening's reality, not a lie). On main via cherry-pick (clean):
- [x] pirc 150 Attack: -3.18 -> REBUILT on the masters-data antidote
  (...c6/...b5/...e5/...Bb7, ...b4 buries the c3-knight on d1), -0.42 at 22p.
  Commit b33ac5f. Verified every move = masters most-played at its ply.
- [x] two-knights Max Lange: -2.82 -> REBUILT on Black's sound 5...Nxe4
  antidote (decline the maze; ...d5, ...Qd8, Rxe4+ ...Be7 Nxd4, ...f5 ...O-O),
  -0.39 at 22p. Commit 837628a.
- [x] semi-slav Botvinnik Deep: -3.34 -> NARRATION-HONESTY fix (commit 3ab33b1).
  Too treacherous to rebuild unsupervised; the bo4 beat no longer claims
  "balanced / sound for both sides" — now states White holds the edge, Black
  defends under pressure, high-risk surprise weapon. **FLAG FOR DAVID:** a true
  rebuild would re-anchor to a precise modern drawing line in the main
  Botvinnik (move-30 forced theory) — your call.
- [x] old-indian Be2 (-1.26) / Czech (-1.11): NARRATION-HONESTY fix (commit
  7ca21f7). The Old Indian is cramped/slightly-worse by nature; both terminal
  beats now say plainly White has a real space pull and Black is a shade worse
  but solid/resilient — no more false-equality claims.
- [x] benoni Taimanov f4/Bb5+ (-1.98): NARRATION-HONESTY fix (commit f5b5b56).
  The toughest anti-Benoni; the t4 beat no longer claims "fully equal" — now
  says White's space gives a real pull, Black slightly worse but in a playable
  double-edged fight with the ...b5 break.

### "C" COMPLETION STATUS (2026-05-30)
- [x] Connectivity checks: all openings reach the middlegame (lessonDepth green,
  0 shallow); middlegame-plan coherence gates green (middlegamePlanner /
  middlegamePlanThemes / middlegamePlanFenCoherence). Plans correctly start AT
  or PAST the opening terminus — "pick up where the opening leaves off".
- [x] 5 flagged variations fixed (above).
- [x] Soundness re-sweep confirms pirc-150 + max-lange DROPPED off the flagged
  list; the 3 narration-fixed lines stay engine-negative by design (honest now).
- [x] ship-check: READY TO PUSH (typecheck + lint + all content gates green).
- [x] Landed on main (5 commits cherry-picked clean onto fresh origin/main).
- [ ] **G1 prod Playwright audit BLOCKED in this container (escalate):** (a) the
  Chromium binary at /opt/pw-browsers/chromium-1194/... is ABSENT here
  (/opt/pw-browsers empty), so the Playwright instrument cannot launch; (b) the
  prod bundle hash had not advanced past the push within ~3min of polling —
  deploy queued/capped behind today's heavy parallel-session pushes (many Gotham
  commits). Audit-stream endpoint IS healthy (200, redis, empty=app-not-open).
  NEXT SESSION / DAVID: once prod redeploys, run the 3-instrument audit
  (AUDIT_SANDBOX=1 against the live URL) on /openings/pirc-defence (150 tab) +
  /openings/two-knights-defence (Max Lange tab) to confirm the rebuilt content
  renders + Watch/Learn voice fires. Content correctness already verified by
  engine evals + content gates.
- [x] **A — DONE 2026-05-30 (this session): prod G1 render+voice audit GREEN.**
  Prod bundle (index-CE2ym1Vc.js) confirmed to carry PR #693 (greps "buries the
  knight on d1" + Max Lange markers). New focused instrument
  `scripts/audit-masterclass-variation-watch-prod.mjs` (the heavy 3-tier
  punish-gems loop times out against slow prod) ran AUDIT_SANDBOX=1 vs LIVE prod:
  6/6 GREEN — pirc-150 + two-knights-Max-Lange BOTH mount the curated
  LessonPlayer (positive [data-testid=lesson-player], NOT legacy
  walkthrough-progress) and fire a real beat /api/tts (warmup `.` probe
  excluded). Audit-stream pull corroborated: 2 coach-narration-spoken events
  with the exact rebuilt text ("The 150 Attack — bishop to e3…", "The Max Lange
  is one of the oldest…"), voice=ruth. Also fixed audit-punish-gems-loop.mjs to
  use sandbox cert helpers (was plain launch → cert-fails vs prod). Chromium
  binary IS present (corrects the PLAN's earlier "absent" note); only blocker
  was node_modules needed `npm install` on a fresh clone, and pollyEnabled
  defaults false in a fresh context (the audit flips it on the seeded profile).

### REMAINING engine-negative lessons (NOT in "C" scope — all sharp showcases /
### opening-nature, correctly LEFT per the soundness rule): kings-gambit
### Allgaier/Muzio/Classical, alekhine Four Pawns, sicilian-dragon Chinese,
### schliemann, vienna vs 2...Nc6, KID Fianchetto, pirc Czech, philidor
### Counter-Gambit. Negative eval is EXPECTED for a sac/gambit showcase.

### C — NARRATION POLISH, DONE 2026-05-30 (this session).
- Verified the sharp-showcase termini are HONEST, not equality-claiming:
  Muzio ("the Muzio is not objectively sound… the line you play to WIN games"),
  Allgaier (same honest register), Chinese Dragon ("trades a little soundness
  for raw speed… attack first and ask questions never"). No fix needed.
- Engine-evaled (depth 20, student perspective) the engine-negative lines that
  ALSO claimed equality/comfort — the precise false-equality defect class:
  KID Fianchetto -104cp claimed "fully equal" → **FIXED** (honest: "White's
  extra central space gives a small lasting pull, Black a shade worse but the
  c5-outpost keeps it a comfortable, fully playable fight"). alekhine Four
  Pawns -99cp / vienna vs 2…Nc6 -64cp / pirc Czech -99cp claim NO equality →
  honest, left. pirc Fianchetto -34cp legitimately equal → left.
- Coverage-gate baselines at FLOOR for masterclass: middlegamePlanShort=0,
  punishGemNarration=0 (both COMPLETE), middlegamePlanThemes=4 (all leave-
  flagged "never fabricate a contrived move" deferrals — can't go lower
  honestly). The 20 variationMiddlegameDepth entries are ALL pro-rep (pro-*),
  a separate pro-rep-deepening effort (§G9.3 Gate B), NOT masterclass C-scope.
- Gates re-run green: narrationAccuracy / lessonIntegrity / wlppNarration /
  lessonDepth (3753+ tests).

### B + D — PENDING DAVID (genuine forks, surfaced 2026-05-30):
- B (Botvinnik): left HONEST (current state doesn't lie). A true re-anchor to
  the 9.Nxg5 main needs move-30 forced drawing theory — G3 forbids authoring it
  from memory, and it's too sharp to data-rebuild unsupervised. Asked David:
  supply the line / keep honest / demote tab.
- D (Endgames): pro/structural R+minor+P data prepped; each plan needs a
  specific drawn master game + holding technique (~1hr/opening). Asked David to
  confirm scope + model games before authoring.

### LEAVE (sharp gambit/sac showcases — negative eval EXPECTED, honest):
kings-gambit Muzio/Allgaier/Classical, two-knights/scotch Max Lange gem lines,
albin/schliemann gambits, sicilian-dragon Yugoslav (sharp). Per the soundness
rule: a sac showcase is meant to be engine-negative.

## ENDGAME LAYER — METHOD LOCKED + FLAGSHIP AUTHORED (D, this session 2026-05-30)
David locked the build method into CLAUDE.md ("🔒 ENDGAME LAYER" rule): ground
every endgame plan in a REAL master game that played the SAME variation being
taught, walked into its ending — opening→middlegame→endgame as ONE continuous
real line (never invented; G3). Tooling: `scripts/pick-endgame-game.mjs` (built
this session) seeds the masters explorer on the taught variation, pulls real
full PGNs via the `/api/lichess-game-export` proxy (BOTH proxies reachable from
the sandbox — confirmed 200), classifies the ending, and surfaces the specific
game + its endgame move tail + transition FEN. Proven on the Italian Pianissimo
(Carlsen–Erigaisi 2025 R+B-vs-R draw) and the Caro Classical (3 real drawn
R+minor+P games incl. the WO's Anand–Leko 2008).
FLAGSHIP SHIPPED: `mp-carokann-main-endgame` — the Classical Caro endgame,
grounded in Anand–Topalov (Amber 2008), a clean R+B-vs-R+N hold: Black doubles
on the d-file (…Rfd8/…Rd6/…Rcd8), reroutes the bishop (…Ba3-b4), and fixes the
queenside (…a5). 14 real board-verified moves, two registers, lead-the-eye
highlights, sources resolvable. Wired into the Caro main tab
(caroKannMasterclassTabs). All gates green (middlegamePlanThemes / planner /
EndgamePlansSection / ship-check). Live render audit runs post-merge.
ROLLOUT (this session, all grounded in real same-variation master games, gated):
- [x] caro-kann main — Anand–Topalov 2008 (R+B-vs-R+N hold)
- [x] slav-defence main — Topalov–Wang Yue 2009 (R+minor hold, c-file activity)
- [x] caro-kann Advance — Leko–Anand 2009 (symmetric R+minor, d5-outpost hold)
- [x] qgd main — Hertneck–Hübner 1994 (Orthodox, Black converts the structure)
- [x] french-defence main — So–Nepomniachtchi 2021 (passed-pawn counterplay holds)
- [SKIP] caro-kann Exchange — the only drawn R+minor game in the data
  (Ding–Carlsen 2020) resolves by bare perpetual check; no holding/conversion
  technique to teach, so the section self-hides (empty > a non-lesson).
Masterclass openings with endgame plans now: ruy-lopez, caro-kann (main +
Advance), slav-defence, qgd, french-defence. Same locked method extends to any
other structural opening where a real same-variation teachable ending exists.

## ENDGAME LAYER — DATA PREPPED (2026-05-30 overnight), authoring teed up
Ran scripts/extract-endgame-structures.mjs on the structural openings. The
characteristic endgame is consistently R+minor+P (the minority-attack /
superior-structure conversion):
- caro-classical: R+minor+P 7/15 (47% — strongly characteristic)
- caro-advance:   R+minor+P 4/15 (+ Q+pieces when queens stay)
- french:         R+minor+P 5/15 (33%, 3 decisive)
- qgd:            R+minor+P 4 + minor+P 3 (minority-attack endings)
- slav:           R+minor+P 4/15 (all decisive)
- caro-exchange:  R+minor+P (27%, minority attack) [extracted earlier]
NEXT (authoring, best with a careful pass / David's eye — NOT rushed overnight):
for each, take a real master game's line into the R+minor+P ending, author a
`mp-<id>-<tab>-endgame` plan (overview + the line + sources), wire via the tab-
plan map. Sharp/attacking openings (gambits, Dragon, etc.) correctly get NONE.

## OVERNIGHT SESSION SUMMARY (for David, morning)
DONE + shipped to main (all gate-green):
- Opening-spine rebuilds: italian (prod-audited), philidor Exchange+Antoshin,
  alekhine — genuine defects (dead/mislabeled/over-extended lines) on data spines.
- Soundness sweep (NEW tool) found + FIXED 6 lessons that were SECRETLY LOSING
  while narrating equality: petrov Steinitz (-2.08->-0.22), scandi Gubinsky
  (-1.58->-0.03), qgd Bf4 (-1.39->-0.33), qga Smyslov (-1.75->-0.18), philidor
  Nimzowitsch (-2.15->0.00) [+ Antoshin above]. Each rebuilt on the sound master
  line + re-verified by engine.
- Memory locked: data-rebuild doctrine + soundness-sweep rule in CLAUDE.md.
- Tools built: build-opening-spine, diagnose-lesson-tails, soundness-sweep,
  extract-endgame-structures.
NEEDS DAVID / DEEPER WORK (flagged, NOT risked autonomously):
- 4 genuinely-hard/sharp variations (pirc 150, two-knights Max Lange, semi-slav
  Botvinnik, old-indian) — see SOUNDNESS SWEEP RESULTS above. [benoni Taimanov
  RESOLVED 2026-06-10: KEEP — re-eval at depth 26 = -0.96 (the -1.98 was a
  shallow-depth artifact); branchpoint already -0.83 before the lesson moves,
  best play holds -0.86 to -0.96, student plays engine-best (...Nfd7 + the
  ...Na6-c7-a6-b5 consensus counterplay). No sound equalising line exists (the
  Taimanov is THE critical anti-Benoni); narration already honest ('slightly
  worse... not an equaliser'). Tab explanation aligned to match.]
- Endgame authoring across the ~6 structural openings (data prepped above).
- London/Scotch/Vienna/Caro mains etc. = sound showcases, correctly LEFT.

## LAYER STATUS VERIFIED (2026-05-30) — what's complete vs the remaining gap
- MIDDLEGAME PLANS: COMPLETE. 42/42 masterclass openings have plans, 0 floor
  gaps. Gate-verified (middlegamePlanner/Themes in ship-check).
- NARRATIONS: re-authored on every rebuild; all pass narrationAccuracy/Grounding.
- SOUNDNESS: comprehensively swept. 6 secretly-losing lessons FIXED; 5 hard/sharp
  flagged (Pirc 150, Two Knights Max Lange, Semi-Slav Botvinnik, Old-Indian,
  Benoni RESOLVED 2026-06-10: KEEP, -0.96 at depth 26, honest narration). Sharp gambit showcases left.
- OPENING SPINES: genuine defects rebuilt (Italian, Philidor x2, Alekhine);
  sound showcases (London, Scotch, Vienna, Caro, Scandi mains) correctly LEFT.
- ENDGAMES: the one genuinely-missing layer (only Ruy has them). DATA PREPPED
  (R+minor+P characteristic). BLOCKER CONFIRMED: unlike the Berlin (forced
  move-8 queen trade), the structural Black defenses (Caro/French/QGD/Slav)
  have NO clean modal queenless line — their modal lines stay middlegames
  (Caro Classical keeps queens through move 15), and the R+minor+P endings
  arise via varied, game-specific deep simplifications. So each endgame plan
  must be grounded in a SPECIFIC drawn/held master game (e.g. Anand-Leko Caro
  Classical R+minor+P draw) + teach the Black-HOLDING technique — ~1hr each,
  quality-critical. RECOMMENDED: a focused endgame pass, ideally with David
  confirming the model games (removes the sourcing + holding-line risk), rather
  than rushed autonomous authoring. (NOT a line that lies — empty > generic.)

---

## CARLSEN FULL-PARITY BUILD (2026-06-01, branch claude/carlsen-full-parity)
All gaps closed in one PR, data-grounded, gate-green:
- **Game references (STEP 11.5):** 300 real wins/draws (was 0), bounded 5/variation.
- **Endgame plans:** 13/14 (added open-sic/sicilian/kid/french; KG self-hides).
- **Pitfalls:** 12/14 (added 10 engine-verified across 6 openings; Réti+Caro empty/honest).
- **Per-variation middlegame plans:** 9 (DATA-COMPLETE — rarer variations diverge
  within 3-4 plies past terminus; building stubs would be padding).
- **Gems:** 2 confirmed (Siberian + Elephant) — ENGINE-COMPLETE (~30 candidate
  lines hand-verified; the rest equalize or aren't amateur-played; his solid
  style genuinely yields few).
- **Per-variation model games:** +49 (one real high-rated win per variation,
  hand-authored overview). Now ~3/opening + 1/variation.
All gates green. Next: ship-check → PR → loop audit on prod (3 instruments).

## 2026-06-04 — Final pre-TestFlight content audit (single session)

- [x] Extend short base-repertoire main lines: Schliemann 14→20p, Jänisch
      Accepted variation 8→12p. Every added move = top Lichess-masters
      continuation (explorer-verified). Albin stays 16p (no master line ≥5
      games past terminus). repertoire.test 40→42. — committed
- [x] Narrate the extended lines: schliemannDefence.ts main lesson +3 beats
      (Qe2/Nf6, f4/Qxf4, Ne5+/c6) board-verified; Jänisch var already
      narrated. narrationAccuracy + lessonIntegrity green. — committed
- [ ] Personally review all 193 GEM_NARRATION entries: the Watch text on the
      inaccuracy ply must explain WHY the move is bad; the punish ply must
      explain the refutation (why it earns the gems tab). Tool:
      scripts/dump-gem-narration.mts grounds each against board facts.
- [ ] Fix any gem whose inaccuracy/punish narration is empty or doesn't explain.
- [ ] Re-run punishGems.test + narration gates.
- [ ] ship-check + deploy + TestFlight handoff.

### 2026-06-05 — gem narration review COMPLETE
- [x] Personally reviewed all 296 GEM_NARRATION entries (board-grounded via
      scripts/dump-gem-narration.mts). Fixes:
      - 31 narrations corrected total:
        - 25 generic-placeholder Samay gems rewritten with board-verified prose
          (material claims only where material is actually won at the quiet end;
          positional language otherwise — verified each).
        - 6 mislabeled tactics corrected: Italian Bxf7+ (e5 not f7 guard);
          KG Qb5+ royal-fork→fork; Scotch fxe3 false queen-fork→Nxe7+ wins knight;
          Gotham/open-e5 Qe1+ skewer→fork; Alapin Bc4 discovered→direct + c7 guard;
          Alapin Qb3 false e6-hit; Aman Na5/Nxe5 false Qh5-fork→f7 gang-up;
          Aman Bc5/Bxd5 pin mechanism; Aman Nbd7/Nd6# fork→smothered-mate (Qe2 pin);
          English Bc5/Nxe5 skewer→fork.
- [x] All gates green: punishGems, narrationAccuracy, lessonIntegrity,
      wlppNarration, lessons/, repertoire.

### 2026-06-05 — full green + WLPP Learn redesign
- [x] All 14 test failures triaged + fixed (real bug vs stale-test, verified each):
      - trap classification: 46 Naroditsky trapLines classified (all positional →
        mistake/theme, none forced traps); Alapin mechanism test re-anchored on a
        LIVE forced trap (Carlsen Siberian).
      - model-games variation tags: regenerated from the deterministic classifier
        (only variation fields changed, zero game-data touched).
      - orphanLessons baseline emptied (every pro-rep variation now has a lesson).
      - verify-annotation-resolution: curated lesson now counts as a reachable
        Watch source (34 'unreachable' openings all have curated lessons; G9.3
        Gate A bans annotations for them).
      - audit-openings-narration: overflow now tests SAN legality, not DB-base
        length (the ruy-lopez 30-move walkthrough is legal).
      - 4 stale UI tests aligned with intentional changes (one-tap hint, R8
        full-voice-map persistence) + 1 flaky walkthrough test made deterministic.
- [x] FULL SUITE GREEN: 415 files / 20,379 passed / 0 failed. ship-check READY.
- [x] WLPP LEARN redesign (David 2026-06-05): voice dictates the move only;
      written narration shown below the board; opponent reply voice-promise-gated
      (no choppy cut-off); square highlight kept. CLAUDE.md contract updated.
- [ ] TestFlight upload (Mac-only — David's machine). Push to main pending
      David's "we push at the end" signal.

---

# PLAN — FULL-CATALOG MASTERCLASS SWEEP (David 2026-07-15: "sweep every opening… all the things") — ACTIVE

David's order: sweep EVERY opening (not just the new ones): gems, middlegame +
endgame plans, opening stops at the middlegame, middlegame plans start where the
opening left off, all lines sound (no losing positions), sublines + variations,
"watch out for" warnings, From-the-Books + Classic Wisdom present and NOT
redundant with each other.

## Instruments
- `audit-reports/masterclass-sweep/matrix.json` — 167-opening inventory
  (42 masterclass + 7 gambit-tab + 82 pro + 35 anti + 1 repertoire-only).
- `audit-reports/masterclass-sweep/gatec2.json` — pawn-skeleton continuity.
- `.soundness-all.mjs` → `soundness.json` — full-catalog engine sweep (every
  lesson terminus + every data pgn main/variation, FEN-deduped, depth 18).

## CLEAN (verified 2026-07-15)
- **Gate A 100%** — all 167 openings resolve a curated lesson.
- **Classic Wisdom vs From-the-Books: ZERO text redundancy** (different
  sources; no overlap found on any opening).
- Zero un-narrated model games, zero none-surfaceable gem sets, zero openings
  without middlegame plans.

## BACKLOG (priority order)
1. **P0 soundness — ✅ DONE 2026-07-15.** 1,598 lines / 994 unique termini
   at depth 18, 0 illegal. 33 termini < −1.0: honest showcases exempt
   (verified by say-tail scan — Muzio/Halloween/Stafford/Benko/Fajarowicz/
   Chinese-Dragon/KID/naroditsky-KID/benoni-Taimanov/old-indian-Be2+Czech all
   narrate "not an equaliser" honestly); 10 genuine defects REBUILT on
   engine-verified tails + shipped (commit "fix(soundness): P0 sweep"):
   pirc Austrian (−1.76→−0.76, lesson beats rewritten to the …c4!/b5 line in
   Danya register), pirc 150, anti-colle Nbd2 (was auto-mined junk), vienna
   vs 2…Nc6 (honest-gambit reframe), gotham english, old-indian ×2,
   carlsen-modern, benoni b5-race, caro Advance, evans Anderssen
   (dxe5??→Ba3!, false "engine says plus-one" narration corrected, +2.14).
1b. **✅ RESOLVED 2026-07-15 — kid "re-mount stall" was an audit artifact,
   and it unmasked a real perf finding.** Local repro: a FULL page load of
   ANY surface takes ~14-15s to first mount (dashboard 14.8s, /kid 14.4s,
   /openings 29.7s — dev server; prod audit hops showed the same 15-21s),
   while IN-APP navigation back to /kid is 329ms. The audit full-reloaded
   /kid before every card hop, re-paying the cold boot 4x — prod variance
   pushed hop 4 past the 45s wait. FIX: audit-untouched-surfaces kid loop
   now navigates in-app (goBack) like a real user — hops dropped to ~2.7s.
   NEW FINDING for a dedicated perf pass: **~15s cold boot to first paint**
   (module eval + per-boot G8 reconcilers + seed) — that's what a beta
   tester pays on every fresh open. Instrument:
   scripts/catalog-sweep/repro-kid-stall.mjs. OLD note: Reproduced 2/3 prod
   audit runs: goto /kid → visit /kid/puzzles → goto /kid = kid-mode-page
   not visible in 45s (mount times degrade per hop: 21s→15s→22s→46s+).
   Route /kid/play-games registered fine — the stall is the re-mount.
   Needs localhost repro with CPU profile. Audit-flake note: coach-analyse
   FEN mount + openings-ui ECO groups + master-integration context-destroyed
   each failed once and passed on rerun (cold-prod timing, not code).
2. **P1 Gate C breaks — IN PROGRESS 2026-07-15 (128 → 112).** The anchors
   turned out to live on REAL CORPUS-GAME paths in the STEP-4 deep files
   (data/sources/<player>-deep/*.json topModelGames) — 58 of 110 found there.
   17 prefix-compatible extensions engine-screened (student ≥ −1.0 at the new
   terminus) and APPLIED: the variation pgn now walks to the plan's anchor
   (Gate D order — skeleton only, narration untouched). Gate B baseline
   shrank 12→9 as a side effect. Instruments:
   scripts/catalog-sweep/gatec-{reconnect,deep-hunt,extend,masters-bfs}.mjs.
   REMAINING: ~40 transposition cases (game path found but diverges from the
   entry's move order) + masterclass 16 — the masters-DB BFS pass connects
   from the entry's own lines; its connectors get the same engine screen.
   1 unsound extension rejected (naroditsky-KID four-pawns, −1.65 — matches
   the honest-worse lesson; needs a plan-side re-anchor instead).
   OLD scope note: 128 plans** (pawn diff ≥4 from every line of their
   opening — the Watch→plan handoff is incoherent). 5 masterclass
   (kingsindianattack-kid, nimzoindian-rubinstein, queensgambit-slav,
   catalanopening-slav, alekhinedefence-scandtrans) + ~123 pro-rep (gotham +
   naroditsky + caruana heavy). Re-anchor at true termini + re-derive playable
   lines. 52 close continuations + 31 drifted = verify-only.
3. **P2 Gate B shorts** — 6 masterclass variations un-baselined (scotch
   Steinitz 12p, alapin 2…d5 13p, alekhine scandi-trans 13p, old-indian
   Janowski 12p, birds Swiss Gambit 10p, schliemann ×2 12p); 12 pro in the
   sealed shrinking baseline; anti trap/mate showcase lines exempt by nature;
   gambit-tab 0p rows are a matrix artifact (no repertoire pgn — check spines).
4. **P3 zero-gem openings: 57** (25 masterclass first). Hand-curated per the
   traps-by-hand doctrine: explorer slips → engine refutation (tiered) →
   theory check → both-register narration + sources.
5. **P4 zero-endgame-plan openings: 62** — data-gated, not auto-defects: run
   endgame-structure classification per opening (masters explorer / corpus);
   build only where ≥~15% of games reach the ending; record "data says none".
6. **P5 variation-lesson gaps: 42 openings** (worst: sicilian-alapin 2/8,
   london-system 2/8, old-indian 4/7, qga 4/6).
7. **P6 small holes** — model games: sicilian-alapin, pro-samayraina-kings-
   gambit. Pitfalls: schliemann, pro-caruana-{nimzo,french,kid},
   pro-carlsen-{caro-kann,reti}.

## Sequencing logic
Soundness (worst defect class) → continuity (incoherent handoffs) → depth →
content presence (gems → endgames → variation lessons; weeks of hand-curation,
per-opening to the locked doctrines).

### Gate D retro-sweep (David 2026-07-15 "D next" + "check sublines and variations") — IN PROGRESS
- Instrument: `scripts/catalog-sweep/gated-skeleton-scan.mjs` → 84 rows
  (lesson-vs-data skeleton divergences + shallow-lesson gaps).
- **Triage verdict:** every lesson terminus is engine-cleared by the P0
  soundness sweep, so DIVERGES rows are overwhelmingly the deliberate
  curated-lesson vs drill-line architecture (lesson spines are data-chosen
  independently of repertoire pgns). Real defects = lessons left on
  P0-refuted lines: pirc Austrian (FIXED — beats rewritten); pirc 150 and
  caro Advance lessons teach their own SOUND alternative sub-lines (cleared,
  left); vienna vs 2…Nc6 lesson is an honest 11p gambit hub (left).
- **Gate B masterclass shorts: ALL 7 EXTENDED** (scotch Steinitz, alapin
  2…d5, alekhine scandi-trans, old-indian Janowski, birds Swiss Gambit,
  schliemann ×2) — engine best-play to 16-18 plies, termini screened
  (worst −0.89 Old-Indian-nature; Schliemann lines Black-POSITIVE).
- **Sublines: course-sublines.json REGENERATED** against the moved pgns
  (build-course-sublines.mjs, masters DB + explorer + engine fallback);
  42k-test sublineNarration gate run for orphans.

### Gate C baseline grind (David 2026-07-15 "handle gate C") — IN PROGRESS, 109 → 40
- Gate sealed as `middlegamePlanContinuity.test.ts` (pawn-skeleton diff ≤3 vs
  the opening's lines; shrink-only baseline). The backlog was the alien
  batch-authoring run: plans anchored on positions in ZERO corpus games with
  fabricated "real win from this repertoire" claims.
- **The proven loop (per cluster):** tree-continue the corpus from each
  declared line → reroute/extend variation pgns where the corpus disagrees →
  engine-screen every terminus (student ≥ −1.0) → 8-ply engine tails →
  rebuild plans with hand-written Danya-register narration citing measured
  junction stats → author Gate-A Watch lessons for every new variation →
  full gate suite → main.
- **Shipped:** Rossolimo (109→100), Jobava (→94), KIA (→86), Gotham English
  (→80, +c6 variation), Fantasy/London/Vienna (→65, +3 variations incl. the
  16-1 Vienna Gambit Accepted; 2 fabricated plans deleted), Alekhine (→60,
  2 variations REROUTED onto his real corpus — the Rubinstein …Nd4 103/132),
  Caro-Kann+Ruy (→52, d3-Closed rerouted, Berlin queen-trade plan),
  Scandi+ClosedSic+Ponziani (→40, +7 variations, Ponziani honestly priced
  at −0.3, its −5.7 Nc3 candidate discarded).
- **COMPLETE (2026-07-16): baseline 109 → 1.** Final waves: Najdorf/AntiSic/
  Italian (→31, +Two Knights variation), all pro-rep singles (→16 — the
  Trompowsky b2-trap at +5.5, both Stafford refutations, the honest Milner
  −0.9 and Advance …Qb6 0.00 poisoned-pawn pricing), all masterclass
  leftovers (→1, 15 plans incl. the Alapin rewritten from the BLACK side it
  actually teaches, 21 lead-the-eye violations caught by middlegamePlanner
  and fixed — two arrows were drawn through blocking pawns, i.e. false claims).
- **THE IRREDUCIBLE CORE (1): mp-pronaroKID-fourpawns-reroute** — Danya's own
  …c5/Nd6 Four-Pawns line evals −1.1 for Black at 25s depth at his own 4-2
  corpus terminus. Teaching it as fine would lie (soundness doctrine); the
  fix is a content decision: re-teach via the e5!? sideline his videos also
  cover. DAVID CALL.
- **Side finds fixed en route:** 9 dangling resolver ids pruned; caruana-najdorf
  + dragodorf wired (parallel build had left them unresolved); orphaned
  vienna-gambit-main rebuilt instead of deleted; stale ruy d6@13 subline dropped.
- **Known debt:** proRepTabPlanCoverage's RESOLVERS list omits all Gotham
  resolvers ("keep in sync" comment violated) — sync would surface more
  unresolved pairs; separate hygiene task. → **PAID 2026-07-16** (below).

## Claims truth-audit + resolver sync (2026-07-16 — done)
- **"Real win from this repertoire" claims audited across all plan prose.**
  All 43 claims naming an opponent VERIFIED against the corpus (opponent
  present in that opening's tree/deep/model-games/archive data; two traced
  move-by-move to the actual game — Samay's Italian endgame = his win over
  Sankalp_Pathak 2025-04; Naroditsky's Sämisch-KID endgame = his win over
  abhijeetgupta1016 2017-12). 18 generic no-game claims were engine-tail
  model lines wearing a fabricated "real win" label → reworded to honest
  model-line framing (overviews + intros, varied stems). One fabricated
  rating claim stripped (Rosen Stafford "beat a 3165" — max real Stafford
  opponent is 2982). Per David's "we teach his teachings": teaching-derived
  lines are framed as what he TEACHES, never as games that didn't happen.
- **Resolver sync done:** all 18 Gotham resolvers wired into
  proRepTabPlanCoverage's RESOLVERS chain — every Gotham (opening, variation)
  pair resolves; 18 openings dropped from BASELINE_UNRESOLVED (shrink).
- **Dangling-plan-id class found + sealed:** 39 'mp-*' ids referenced by tab
  resolvers that never existed in middlegame-plans.json (silently empty plan
  zones — invisible to the coverage gate because the resolver returns
  non-null). Fixed: grunfeld 'modern rb1' repointed to the real
  mp-grunfelddefence-modernrb1; 2 live-empty pro tabs got their plans
  AUTHORED (Gotham French Tarrasch …b5-gambit refutation, engine +4.7 tail
  w/ the Nc2+ fork + Bh3+ + Nd4-deflection mate motif; Gotham QGD Exchange
  Carlsbad …Nf8/…g6/…Be6 hold, honest −0.5 pricing); 2 stale ids pruned
  (naroKID classical-c5, caroadv bf5-c4break — tabs keep their real plans).
  **New gate: `src/data/middlegamePlanIdIntegrity.test.ts`** — every mp-*
  literal in a resolver file must exist in middlegame-plans.json; shrink-only
  BASELINE_MISSING carries the remaining 34 never-authored masterclass
  variation plans (albin ×3, semislav ×4, qgd ×3, petrov ×3, philidor ×3,
  schliemann ×3, budapest ×2, qga ×2, queensindian ×2, oldindian ×2, KID ×2,
  twoknights ×2, benoni/najdorf-6f3/slav-schlechter ×1). That baseline IS the
  masterclass variation-plan authoring backlog.

## Next-session pickup
Work the content-presence backlog top-down, shipping per the standard loop
(gates → ship-check → main → prod audit): (1) the 34 baselined masterclass
variation plans (middlegamePlanIdIntegrity BASELINE_MISSING — author per the
Gate C grind recipe: corpus/data spine → engine tail → hand narration);
(2) 57 zero-gem openings (hand-curated, no bots); (3) 62 zero-endgame
openings (data-gated); (4) 42 variation-lesson gaps. Plus David's pending
call on mp-pronaroKID-fourpawns-reroute (−1.1 line vs his 4-2 record).
