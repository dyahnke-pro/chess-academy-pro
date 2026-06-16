# Line-accuracy fix-list (2026-06-16) — the sold-repertoire soundness campaign

Whole-program audit (`scripts/audit-all-line-accuracy.mjs`) + deep re-eval
(depth 22) + re-anchor finder (`scripts/find-line-reanchor.mjs`). Every
recommended line legality + soundness checked from the student's side.

**Headline:** 3,564 lines · **0 illegal** · 9 gambits (negative expected) ·
19 depth-12 noise (fine at depth 22) · **25 genuinely worse than −1.0**.

Policy (David 2026-06-16): accurate + winning; re-anchor passive-but-worse lines
to the most solid continuation; **keep aggressive-by-design lines** (the
surprise-weapon thesis), labeled honestly; fix genuine *move* errors.

## A. FIX — genuine errors with a clear better move (clean, data-checkable)
| Opening | Defect | Re-anchor | Notes |
|---|---|---|---|
| `pro-carlsen-modern` Classical Nf3 | …e5 (−1.27) | **…c5** (−0.44) | pro-rep variation; re-anchor the line |
| `two-knights-defence` Polerio | …Nxd5 (−1.29) | **…b5** (−0.21) | the Fritz/Ulvestad …b5 |
| `four-knights-game` 4.Bc4 | Bxf7+ sac (−2.09) | **4.d4** (+0.36) | re-anchor off the unsound sac |

## B. KEEP — aggressive by design (label honestly, do NOT neuter)
Traxler (…Bc5 sac), KID main + Fianchetto, Pirc Austrian + 150, Sicilian Dragon
Yugoslav + Dragadorf, Najdorf 6.Bg5, Benoni (Modern/Taimanov/Czech), Alekhine
main, Vienna lines, Caro Advance, `pro-carlsen-kid` Sämisch, `pro-naroditsky-kid`
Four Pawns + Fianchetto, `pro-caruana-nimzo` Rubinstein. These are fighting/sharp
choices (objectively a touch worse, practically dangerous) — the product's edge.

## C. TRIM — solid line over-extends into a worse tail (lesson-tail doctrine)
No opening-phase culprit, but the line walks deep into a worse position:
Petrov Classical, Caro-Kann main, Old Indian (Be2/Czech/Seirawan/Main-d5/Janowski),
Philidor (Modern-d3/Antoshin/Nimzowitsch-Rellstab ×3), QGD Vienna, Semi-Slav
Anti-Meran, Scandinavian main + Bronstein/Gubinsky sublines, `pro-carlsen-scandinavian` main.
→ Trim each lesson line back to the equal point (don't ship the worse tail).

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
