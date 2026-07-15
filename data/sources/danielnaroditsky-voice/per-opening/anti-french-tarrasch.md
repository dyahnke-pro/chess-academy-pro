# Anti-French: the Tarrasch (White) — video-grounded teaching notes

Mined 2026-07-15 from "How to Kill the French Defense" (JKxlT73xpYo) +
"Mastering the Rubenstein Defense" (tWGrKGoNNEA, pulled). PARAPHRASED ideas —
never his sentences. Corpus tree: `data/sources/danielnaroditsky-trees/
anti-french-white.json` — 2,361 games, 65.6% (his BIGGEST anti-opening corpus).

## The frame (direct from the video)

- His taxonomy of White's options vs the French: **Nc3** = incredibly
  theoretical ("don't touch with a ten-foot pole"), **Exchange** = same,
  **Advance-Nimzowitsch** (e5 + Nf3 instead of the automatic c3, allowing
  cxd4 — deep positional point) = his previous speedrun rec (the app's
  existing `anti-french-advance` covers the Advance structure), and the
  **TARRASCH (3.Nd2)** = "the line I've played for most of my life" —
  straddles the bridge: not too theoretical, real venom against the
  unprepared. THE TREE CONFIRMS: 2,361 games on Nd2.
- Black's two mains vs the Tarrasch: **…c5** (the modern GM choice) and
  **…Nf6** (the traditional French move).
- vs …Nf6: **e5**, then **Bd3** ("the most natural square"), and when …c5
  comes, NOW **c3** — the Advance pawn structure but with completely
  different piece configurations (his key teaching distinction).
- vs …c5 (his tree spine): `Ngf3 cxd4 Nxd4 Nc6 Bb5 Bd7` — the open Tarrasch
  with Nxd4 recapture and the Bb5 pin-question.

## Engine verification (2026-07-15)

- MAIN …c5 open: `e4 e6 d4 d5 Nd2 c5 Ngf3 cxd4 Nxd4 Nc6 Bb5 Bd7` + engine
  extension `Nxc6 bxc6 Bd3 Bd6 O-O Qc7 h3 Nf6 c4 O-O Qc2 dxe4` → +0.03 at
  24 plies. Honest framing: objectively level, practically venomous, 65.6%
  across the biggest corpus in the set.
- VAR …Nf6 closed: `e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2` +
  `cxd4 cxd4 f6 exf6 Nxf6 O-O Bd6 Nf3 O-O Bg5 Qb6 Nc3` → +0.40 at 25 plies.

## Build notes

- New entry `anti-french-tarrasch` NEXT TO the existing `anti-french-advance`
  (two systems, like battery/austrian for the Pirc) + curated LessonScript in
  the red-target grammar. Key teaching beats: why Nd2 over Nc3 (no …Bb4 pin —
  the d2-knight blocks nothing Black can exploit, and sidesteps ALL the
  Winawer/Classical theory), the c5/Nf6 fork in the road, the "same pawns,
  different pieces" Advance-structure distinction.
- counter-repertoire: French family gains the Tarrasch as a recommendation
  (styleTags solid/positional next to the KIA aggressive option; consider
  replacing the Advance slot or keeping 2 max per the schema).
- Rubinstein transcript (…dxe4 lines) mined next pass — likely a variation.
