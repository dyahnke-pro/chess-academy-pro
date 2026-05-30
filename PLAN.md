# PLAN — Masterclass DATA-REBUILD (2026-05-29, scope-corrected 2026-05-30)

> Doctrine: `docs/plans/2026-05-29-masterclass-data-rebuild-doctrine.md`.
> Diagnostic: `audit-reports/lesson-tails.json` (ranked tail-overhang report).

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
REMAINING (same locked method, turnkey): caro-advance, french, qgd, slav,
caro-exchange — each: pick a real same-variation drawn game via the tool,
author the holding plan, wire its tab, gate, ship.

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
