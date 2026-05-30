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
