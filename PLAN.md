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

### FLAGGED — genuinely HARD/SHARP variations (NOT clean blundered-tails);
### do NOT risk an unsound autonomous rebuild — need deeper theory or David's
### call (rebuild on a sound line if one exists / relabel honestly / drop):
- pirc 150 Attack: -2.92 (Black castled into the h4-h5 mating attack). Best
  line I found (delay O-O, ...Qa5/...c5) is still -1.48 — the 150 is just
  White's most dangerous anti-Pirc weapon. Current lesson at minimum must stop
  showing Black walking into mate; honest reframe or a precise queenside-castle
  defense needed.
- two-knights Max Lange: -1.86 (the 5.O-O Max Lange; lesson's ...Qg6 defense
  sub-optimal). The SOUND Two Knights main is 5.e5 (-0.05) but that's a
  different line; the "Max Lange" tab needs Black's precise defense (deep) or
  a relabel to the 5.e5 main.
- semi-slav Botvinnik Deep: -2.93. One of the sharpest forced lines in chess —
  too treacherous to rebuild unsupervised; verify it's not following a known
  drawn-with-precision line, else needs theory.
- old-indian Be2 (-1.39) / Czech (-1.11): the Old Indian is a passive, cramped,
  slightly-worse-by-nature defense; bad-ish throughout (not a tail blunder).
  Verify narration doesn't claim equality; otherwise it's the opening's reality.
- benoni Taimanov f4/Bb5+ (-1.39): the Taimanov is the most dangerous anti-
  Benoni; tough for Black throughout. Same treatment as above.

### LEAVE (sharp gambit/sac showcases — negative eval EXPECTED, honest):
kings-gambit Muzio/Allgaier/Classical, two-knights/scotch Max Lange gem lines,
albin/schliemann gambits, sicilian-dragon Yugoslav (sharp). Per the soundness
rule: a sac showcase is meant to be engine-negative.

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
