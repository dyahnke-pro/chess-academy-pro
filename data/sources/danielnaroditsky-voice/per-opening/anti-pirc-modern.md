# Anti-Pirc / Anti-Modern (White) — video-grounded teaching notes

Mined 2026-07-15 from the flagged video (David's screenshots):
**"EPIC Endgame Analysis!! | Belgrade Gambit" (youtube 2jXSWOTKx8M, ~27:00-30:00)**
plus supporting transcripts pulled (gitignored, reference-only):
`austrian-attack-hippo.en.vtt` (CnODsrMCQQg), `pirc-classical-deepdive.en.vtt`
(TIpUDMzQVmU). All notes below are PARAPHRASED ideas — never his sentences.
Every move must be chess.js-validated + Stockfish-verified before authoring
(engine is a first-class build tool per the 2026-07-15 doctrine).

## The recommended main line (the Learn tab's line)

Against the Magnus-style Pirc/Modern setup he recommends the traditional
dark-square battery, NOT the Austrian:

- Move order (via 1.e4 d6 2.d4 Nf6 3.Nc3 g6 or the Nc6/Nf3 transposition):
  **Be3, then Qd2** ("traditional style").
- **The conditional he stresses: if Black CASTLES, White plays d5,** meeting
  ...Nb8 with **Bh6** — he cites a real game of his vs a strong GM
  (Grandelius) reaching this; assessment: theoretical and better for White,
  unpleasant for Black.
- Typical continuation: Black chips at the centre with **...c6**; White
  **castles QUEENSIDE**. (He explicitly invites checking the continuations
  with the engine — our build does exactly that.)

## The Ng4 gem (mid-lesson gem → Watch excursion or weapons gem)

Common misconception he corrects: with the Be3/Qd2 battery up, **...Ng4 is
not scary**:
- Reply **Bg5** (Bf4 also fine). After **...h6 Bh4 g5**, Black runs out of
  tempo moves; later White plays **h4** and rips open the weakened g5/h6
  pawns (this is the exact frame David flagged — h4 arrow + red targets on
  g5/h6).
- Rule of thumb: take ...Ng4 seriously mainly when Black already has the
  pawn on h6 (the bishop has fewer squares).

## Related Belgrade-gambit teaching in the same segment (for the future
Scotch/Belgrade build — tier-1 corpus gap)

- Vs the ...d5 counter: exd5/Nxd5 Nc3 — an "inferior Scandinavian" for
  Black; vs ...Qa5 the punish is **Bb5! Bd7 d4** (bad for Black).
- Vs ...a6: **Bxc6 Bxc6 Ne5** hitting c6 + f7, then the thematic **b4!**
  queenside expansion and **Qf3** — dual threats (Rb1 pin-win + the b7
  attack — David's first screenshot frame).

## Build notes (per the 2026-07-15 walkthrough structure doctrine)

- MAIN LINE for the Watch/Learn: the Be3+Qd2 system with the castles→d5
  branch — engine-extend to a middlegame terminus (Gate B), anchored plans
  (Gate C).
- VARIATIONS/SUBLINES: every line he shows — the d5/Bh6 punish line, the
  ...c6 + O-O-O structure, the Ng4→Bg5→h4 excursion (painted with the red
  target grammar), and the h6-first caveat line.
- CROSS-CHECK with his real games: `data/sources/danielnaroditsky-trees/
  anti-pirc-white.json` (793 games, 68.0%) + `anti-modern-white.json`
  (1,483 games, 64.8%) — cite frequencies where his games reach these
  positions; where the taught line is thin in his own games, label it
  taught-not-played (instructional-content doctrine) and ground on
  masters DB + engine.
- The existing `anti-pirc-austrian` (f4) and `anti-modern-150` lessons stay;
  this build ADDS his taught system (or supersedes per David's call at
  review time). Update `counter-repertoire.json` to point at the new build
  once it ships.
