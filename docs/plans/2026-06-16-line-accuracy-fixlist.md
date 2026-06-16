# Line-accuracy fix-list (2026-06-16) — the sold-repertoire soundness campaign

## 🔒🔒🔒 NON-NEGOTIABLE — VERIFIED WHY OR FIX THE LINE (David 2026-06-16)
"Don't make shit up. If you don't know the why, we fix those lines." We compete
with pro-hand-picked repertoires — a plausible-sounding reason is NOT good enough.
- **Every recommended line needs a VERIFIED why**, reduced to concrete atoms the
  machine checks: tactical claims → Stockfish-verified at the exact position;
  structural claims (open file, pawn center, bishop diagonal) → chess.js
  board-verified; plan claims (a break/maneuver) → the actual masters continuation
  + engine-approved.
- **If the why can't be reduced to verified atoms → the line is FIXED** (re-anchor
  to a line whose why IS verifiable), never shipped on assertion.
- This binds the BUILD and the NARRATION (the `explainBestMoveGrounded` +
  `narrationAccuracy` grounding). LLM prose voices verified facts only; it never
  invents the reason. The win% is the practical VALIDATION, not the reason.
- ⚠️ The "10 worst-kept" chess reasons below were written from consensus/training
  and are NOT yet atom-verified — treat as UNPROVEN until engine/board-checked.


## 🔒🔒 FINAL "WELL-TAUGHT LINE" GATE (David 2026-06-16 — practical results, supersedes equal-or-better)
Eval alone is too blunt. A line is **well-taught if the student scores ≥ ~45% at
masters OR at the student's club level (~1400-2000)** — AND it isn't
catastrophically lost (eval floor ≈ ≥ −2.0) on an **adequate sample (≥ ~30 games)**.
- **Win% (results) is the verdict; eval is a sanity floor.** A line that wins at
  the buyer's level is good even at a negative engine eval. (Tooling:
  `check-line-winrate.mjs`, `SOURCE=masters|lichess`.)
- **This validates the surprise-weapon thesis with data:** Stafford −2.58 scores
  **46% at club level on 26k games** → a real weapon, kept (labeled surprise).
  Caro Advance, Four Pawns, KID Fianchetto, Carlsen Modern, etc. all rescued by
  club results — they're good practical recommendations.
- **Eval-floor + min-sample guard against false rescues:** Philidor Lion shows
  "48%" on only 20 games at −6.25 — a lost line; the floor/sample catches it.
- **Aggression earns its place by WINNING at the buyer's level, not by eval.**

### ✅ THE 7 FIXES — all fixable, exact re-anchor lines (grounded masters-mainline + win%-verified, 2026-06-16)
Each flagged line was a sub-optimal DEVIATION from main theory; re-anchor to the
masters-most-played mainline (all clear the gate: club ≥45%, eval ≥ −0.8):
- **Philidor Lion** (−6.25) → `e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8` — −0.30, 52%/52%.
- **Alekhine main** (−1.99) → `e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7` — −0.72, 38%/50%.
- **Petrov Classical** (−1.82) → `e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4` — −0.28, 43%/50%.
- **KID main** (−1.53) → `d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7` — −0.76, 43%/47%.
- **KID vs Sämisch** (−1.43) → `d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 c5 Nge2 Nc6 d5` — −0.42, 46%/54%.
- **Philidor Nimzowitsch** (−1.26) → `e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Re1` — −0.48, 44%/48%.
- **Bird's main** (−1.8) → ✅ DONE: re-anchored to the modern **Leningrad** with the
  aggressive e4 break: `f4 d5 Nf3 g6 g3 Bg7 Bg2 Nf6 O-O O-O d3 c5 Nc3 Nc6 e4 dxe4
  dxe4 Qxd1 Rxd1 e5` — engine **+0.29 for White**, masters **64%** / club **59%**
  (vs the old e3 Classical's −1.8 / 38% masters). Lesson rebuilt by hand
  (`birdsOpening.ts`, 6 beats, describable purpose per move: clamp e5 → prep e4 →
  develop → e4 break for the e4+f4 duo + open d-file → White keeps the pull after
  the queen trade). Move order chosen to anchor 12 plies in the lichess DB
  (Leningrad Formation). No sound *aggressive* main line exists vs best defence
  (Black trades queens), so this is the honest "go solid" case — narrated as
  aggressive-in-intent, positional-pull in execution. Gates green.
Each edits a hand-authored lesson → apply = swap line + re-author narration (one
unit). Target lines LOCKED here for the narration pass. Tool: `find-best-line.mjs`.

### Progress (2026-06-16): 7 of 7 fixed ✅
✅ Philidor Lion (cut), ✅ KID main (re-synced), ✅ Petrov Classical (re-synced),
✅ Two Knights Max Lange (re-synced), ✅ Carlsen Sämisch (rebuilt → ...c5/...Ne5),
✅ Bird's main (rebuilt → Leningrad +e4 break, +0.29 / 59-64%),
✅ **Alekhine main** — re-anchored off the over-extending …Nc6 + d5-break exchange
   tail (31% masters / 34% club) to the sound early-…dxe5 resolution:
   `e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 exd6 cxd6 Nc3 O-O h3 Bh5` —
   engine −0.80, masters 42% / **club 49% (6,523g)**. Lesson tail rebuilt by hand
   (`alekhineDefence.ts`, 8 beats: provoke → trade the e5-spearhead → open c-file →
   keep the pin, easy active game). Old repertoire pgn was 40 plies of
   over-extension; synced to the 20p sound line. Gates green.

   ⬜ Philidor Nimzowitsch-Rellstab was already covered by the Philidor re-anchors;
   the 7-defect list is the locked set and is now CLOSED. Next: apply this
   per-line analysis to the remaining program (the narration-pass campaign, win%
   gate as acceptance).

All 7 ship-check green (typecheck + lint 0 errors + content gates + changed-file
tests). ⚠️ The pre-existing narrationFactCheck "fork" violations (semi-slav/scotch/
alapin, a parallel session's) remain — not in the blocking gate set; flagged above.

⚠️ PRE-EXISTING (not this campaign, flag to David): `narrationFactCheck` reports 3
stale "fork" claims from a parallel session — `semi-slav::Botvinnik Variation Deep`
(bo4, queen-a6 "fork"), `mp-scotchgame-steinitz` (knight-b5 "fork"), `mp-sicilian
alapin-d5` (knight-b5 + queen-d8 "fork"). Confirmed failing on HEAD without my
changes; not in the ship-check blocking gate set.

### Genuine defects after the win% gate (~7 — bad at BOTH levels / eval-floor):
Philidor Lion (−6.25, lost), Alekhine main (29%/34%), Petrov Classical (40%/38% —
Petrov is solid, so the line is wrong), KID main (42%/38%), Carlsen Sämisch f3
(33%/38%), Philidor Nimzowitsch-Rellstab (35%/39%), Bird's main (45%/39%,
borderline). These are the real re-anchor/cut targets (down from 25). Each still
edits a hand-authored lesson → fix WITH the narration pass, gated by this rule.

## THE STANDARD (David 2026-06-16, consolidated — superseded by the win% gate above for "good line")
**Every taught line must end EQUAL OR BETTER for the student.** Concretely (chess
reality: White moves first, so sound Black defenses are a hair negative at best
play — that IS equality): the student ends **balanced (≈ −0.3/−0.4 or better),
never clearly worse**. Rules:
1. **No clearly-worse lines.** Anything materially negative (≈ < −0.5) is re-anchored
   or cut — including "fighting defenses" (a KID/Pirc line at −1.5 does NOT qualify).
2. **Aggressive-preferred among GOOD lines.** Among equal-or-better options, pick the
   sound *aggressive* one; fall back to solid only if no good aggressive line exists.
   Aggression is the tiebreaker, never a cover for a worse line.
3. **No trim-to-fake-equal.** Don't trim a bad line to an earlier equal point. If no
   genuinely equal-or-better line exists for an opening/subline, **don't teach it.**
4. **Gambits get their OWN researched bar (David 2026-06-16) — NOT equal-or-better.**
   A gambit sacrifices a pawn (≈ −1.0 raw); compensation pulls the eval back toward 0.
   Researched bar (consensus: full comp ≈ within ~50cp of equal; a pawn ≈ 100cp +
   our own engine evals of the gambit set):
   - **Sound gambit (core recommendation): gambiteer ≥ ~−0.5** — full compensation
     (Scotch +0.31, Smith-Morra +0.77, Danish +0.01, Vienna 0.00, Evans). Gold tier.
   - **Acceptable/respected sacrifice (teachable, labeled a true gambit): −0.5 to ~−1.0**
     — real accepted long-term comp (e.g. Marshall −1.17 is borderline-respected).
   - **Dubious / surprise-only (NOT a solid recommendation): worse than ~−1.0**
     (Stafford −2.93, Max Lange −2.60, Halloween −1.37) — explicitly-labeled surprise/
     trap weapon only, never sold as "sound."
   So gambits are judged on the gambit bar (≥ ~−1.0 to be a recommendation, ≥ −0.5
   to be "sound"); normal lines on equal-or-better.
The −1.0-threshold triage below was the FIRST screen; the real campaign re-derives
every clearly-negative line to equal-or-better (aggressive-preferred). Bigger scope.


Whole-program audit (`scripts/audit-all-line-accuracy.mjs`) + deep re-eval
(depth 22) + re-anchor finder (`scripts/find-line-reanchor.mjs`). Every
recommended line legality + soundness checked from the student's side.

**Headline:** 3,564 lines · **0 illegal** · 9 gambits (negative expected) ·
19 depth-12 noise (fine at depth 22) · **25 genuinely worse than −1.0**.

Policy (David 2026-06-16): accurate + winning. **We do NOT trim a bad line to a
fake-equal earlier point — if a line isn't genuinely good, we don't teach it
(cut it or replace it).** Fix genuine move-errors (re-anchor to the good move).
**Keep aggressive-by-design lines** — those ARE good lines by the practical/
surprise-weapon standard (sound, GM-played, dangerous); the negative eval is the
honest nature of an aggressive choice, not a bad line. A *passive* line that just
drifts worse with no aggressive justification is NOT good → remove/replace.

**Selection rule when re-anchoring/replacing (David 2026-06-16):** among the
GENUINELY GOOD options for an opening/subline, **prefer a sound *aggressive*
line; fall back to solid only if no good aggressive option exists.** Aggression
is the tiebreaker between good lines — never a cover for a bad one. (Tooling note:
`find-line-reanchor.mjs` currently proposes the engine's single best/most-solid
move; extend it to surface the aggressive moves within ~0.3 of best + sound, and
prefer those.)

## A. FIX — genuine errors with a clear better move (clean, data-checkable)
| Opening | Defect | Re-anchor | Status |
|---|---|---|---|
| `four-knights-game` Italian 4.Bc4 | Bxf7+ sac (−1.55, **7% masters**) | **fork-trick** `Nxe4 Nxe4 d5 Bd3 dxe4 Bxe4 Bd6 O-O O-O Re1 Re8 d3 h6 c3` (−0.18, balanced) | ✅ DONE — DATA RE-SYNC (the lesson already taught the sound fork-trick; only repertoire.json's variation pgn was the stale Bxf7 sac) |
| `two-knights-defence` "Polerio" | …Nxd5 → Fried-Liver walk (−1.29, 35% club) — DOUBLY wrong (…Nxd5 is the *slip* the Fried Liver punishes; the real Polerio is …Na5) | **Fritz …Nd4** `…Nd4 c3 b5 cxd4 bxc4 dxe5 Qxd5 exf6 Qxg5` (+0.16, **55% club / 13.8k g**) + renamed tab → "Fritz Variation 5...Nd4" | ✅ DONE — re-anchor + rename (sound aggressive, distinct from the existing …Na5 + …b5 tabs; manifest floor 8 held) |
| `pro-carlsen-modern` Classical Nf3 | deep terminus −1.27 | (…e5 is −0.41 / **58% masters** at 14p — the defect is only the DEEP tail) | ⬜ DEFERRED — pro-rep, needs careful deep look; …e5 itself scores 58% masters, not a clean swap |

## B. KEEP — aggressive by design (label honestly, do NOT neuter)
Traxler (…Bc5 sac), KID main + Fianchetto, Pirc Austrian + 150, Sicilian Dragon
Yugoslav + Dragadorf, Najdorf 6.Bg5, Benoni (Modern/Taimanov/Czech), Alekhine
main, Vienna lines, Caro Advance, `pro-carlsen-kid` Sämisch, `pro-naroditsky-kid`
Four Pawns + Fianchetto, `pro-caruana-nimzo` Rubinstein. These are fighting/sharp
choices (objectively a touch worse, practically dangerous) — the product's edge.

## C-SCREEN (2026-06-16) — win%-gate run over the Section-C openings
Most Section-C lines are RESCUED by the win% gate (club ≥45%) — they're keeps, not
defects. Screen (`screen-sectionC.mjs`, eval@20 + masters/club win%) found only a
few genuine defects (fail BOTH levels). Status:
- ✅ **Philidor Antoshin** — was the …g6 fianchetto into Be3/Qd2/O-O-O storm,
  narrated "dynamic equality" but actually −0.94 / 33% M / **38% club (7,561 g)** —
  a worse line dressed up as sharp. Re-anchored to the TRUE textbook Antoshin
  (…Nf6 …Be7 small-centre + …d5 break): −0.15, 52% M / 55% club. Lesson rebuilt by
  hand (5 beats, describable purpose per move), data pgn + sublines synced. Gates green.
- ✅ **Old Indian: Tartakower** — was the slow …g6 plan (31% club). Re-anchored to
  the resilient …exd4 small-centre (…Re8/…Bf8): **48% club** (best practical for this
  inherently passive opening; eval −1.03, within floor; data-only re-sync, no lesson).
  ⚠️ CAVEAT: the Old Indian is passive by nature — no variation here is clearly +eval;
  this is "least-bad, clear practical improvement (31%→48%)," not a +eval triumph.
- ✅ **Philidor Modern d3 Hybrid** — confirmed deep over-extension: sound through
  move 10 (…Bxc4 dxc4, −0.44) then …Nd4?? craters it to −1.82. Re-anchored to the
  sound …Nb4-a6 reroute targeting White's doubled c-pawns: −0.48, 58% M / 49% club
  (data-only re-sync). The win% 'keep' was masking a fixable tail blunder.
- KEEPS confirmed by club ≥45%: Caro main/Classical/Advance/Panov/Fantasy/Exchange/
  Tartakower; Old Indian Czech/Janowski/Ukrainian/Main-d5/Seirawan/Be2; Philidor
  main/Hanham/Nimzowitsch/Exchange/Counter-Gambit; Scandinavian main/Qa5/Icelandic/
  Tiviakov/Portuguese/Gubinsky. (Small-sample "check" tabs: Caro Two-Knights/Short,
  Scand Nf6-Modern/Qa5-Bd2 — low club% but <60-game samples; revisit if flagged.)

## C. REMOVE / REPLACE — not a good line (do NOT trim to fake-equal)
No opening-phase culprit, the line walks deep into a worse position, and it is NOT
aggressive-by-design — so it's simply not a good recommendation. Per the policy we
do NOT trim it to an earlier equal point; we either CUT it from the recommended
set or REPLACE the recommendation with a genuinely good line for that opening:
Petrov Classical, Caro-Kann main, Old Indian (Be2/Czech/Seirawan/Main-d5/Janowski),
Philidor (Modern-d3/Antoshin/Nimzowitsch-Rellstab ×3), QGD Vienna, Semi-Slav
Anti-Meran, Scandinavian main + Bronstein/Gubinsky sublines, `pro-carlsen-scandinavian` main.
**Per opening: confirm there's no genuinely good main line in the data → if a sound
line exists, recommend THAT; if not, drop the opening from the sold set.** Each
edit is a hand-authored lesson (see constraint below), so this runs with the
narration/rebuild pass.

## D. GAMBITS — expected negative, NOT defects
Stafford, Two Knights Max Lange, Philidor Counter-Gambits, Hamppe-Muzio,
Halloween, Carlsen King's Gambit. Honest sacrifices.

## ⚠️ Execution constraint — EVERY fix is entangled with deferred narration (confirmed)
Verified 2026-06-16: even the A-fixes have hand-authored lessons
(`proCarlsenModern.ts`, `twoKnightsDefenceVariations.ts`,
`fourKnightsGameVariations.ts`). So there is NO blind-data-swap path — re-anchoring
or trimming ANY flagged line edits its hand-authored lesson move-skeleton, which
desyncs the authored narration and trips `narrationAccuracy`. **Therefore the
entire A/B/C fix campaign runs WITH the per-opening narration/rebuild pass**
(data-rebuild + lesson-tail doctrines), not as standalone pgn edits. This doc is
the work-order for that pass. Do NOT blind-edit these lines on the sold product
ahead of the narration work — it would break the board↔voice contract.

## Toothless traps (16) — separate sweep
Pro-Naroditsky gem/trap lines evaluating ≤0 for the student (e.g. "Nxf6+
premature trade" −6.28). These read like mis-classified warnings or wrong-side
gems — review classification (weapon vs warning) before shipping as weapons.
