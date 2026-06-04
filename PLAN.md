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
- 5 genuinely-hard/sharp variations (pirc 150, two-knights Max Lange, semi-slav
  Botvinnik, old-indian, benoni Taimanov) — see SOUNDNESS SWEEP RESULTS above.
- Endgame authoring across the ~6 structural openings (data prepped above).
- London/Scotch/Vienna/Caro mains etc. = sound showcases, correctly LEFT.

## LAYER STATUS VERIFIED (2026-05-30) — what's complete vs the remaining gap
- MIDDLEGAME PLANS: COMPLETE. 42/42 masterclass openings have plans, 0 floor
  gaps. Gate-verified (middlegamePlanner/Themes in ship-check).
- NARRATIONS: re-authored on every rebuild; all pass narrationAccuracy/Grounding.
- SOUNDNESS: comprehensively swept. 6 secretly-losing lessons FIXED; 5 hard/sharp
  flagged (Pirc 150, Two Knights Max Lange, Semi-Slav Botvinnik, Old-Indian,
  Benoni — need deeper theory / David's call). Sharp gambit showcases left.
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
