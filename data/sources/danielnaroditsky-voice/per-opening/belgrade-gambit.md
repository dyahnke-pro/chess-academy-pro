# Belgrade Gambit / Four Knights Scotch (White) — video-grounded teaching notes

Mined 2026-07-15 from "Mastering the Belgrade Gambit | Scotch Accepted"
(youtube Ov4J-FZWoQg) + the "EPIC Endgame Analysis" stream (2jXSWOTKx8M).
PARAPHRASED ideas only — never his sentences. Every line must be
chess.js-validated + Stockfish-verified before authoring. Corpus tree:
`data/sources/danielnaroditsky-trees/belgrade.json` — 158 games, 70.9%.

## The frame

- Line: 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.d4 exd4 **5.Nd5!?** — the Belgrade
  Gambit, a surprise weapon he rates far more dangerous than its reputation
  ("buried under a pile of rubble since the 1970s"). He has real
  semi-competitive credentials in it (rapid vs a 2700-level GM, others).
- HIS KEY POINT: the ORIGINAL Belgrade treatments (Bf4, rushing to regain the
  pawn) are close to losing. His modern, engine-checked treatment revives it —
  chiefly **Bd3!** setups, virtually unknown moves that give White real play.
  (This maps EXACTLY onto his corpus spine: `...Be7 6.Bd3 O-O 7.O-O d6 8.h3` —
  the 158-game tree.)

## Black's six responses (the variation panel)

1. **…Nxe4** — "most dangerous": grabs a second pawn, White gets a massive
   initiative. (Engine-verify the modern line before authoring.)
2. **…Nxd5 exd5** — the simplifier (a 2700 GM tried it vs him and didn't
   equalize). Teaching point: Nxd5 is almost always in WHITE's favor — exd5
   kicks the c6-knight, gains time and space.
3. **…Nb4** — the book move nobody finds over the board. Tree: 42g @ 69%,
   his continuation `Nxf6+ Qxf6 a3 Nc6 Bd3 d6 Bb5`.
4. **…Be7** — the modest book move; THE MAIN LINE (his spine): `6.Bd3 O-O
   7.O-O d6 8.h3` then Nxd5/exd5 ideas, Ne5 met by Nxd4.
5. **…h6** — stops Bg5 (a main White idea, pressuring f6). His treatment:
   Bd3 anyway, later repositioning to g5-adjacent play; vs …d6 take on f6 and
   reroute the bishop to b5 to regain d4. …Bc5 instead risks the a3/b4
   queenside storm (driving the bishop off the d4 defense + opening b2 for a
   fianchetto) and long-term Bxh6 sacrifices once Black castles.
6. **…Bc5 / …Be6** — minor tries (tree: 7g each, 78.6%/71.4%).

## Build notes

- Main Watch/Learn line = the Be7/Bd3 spine (tree-grounded, 158g). Variations:
  Nxe4, Nxd5 simplifier, Nb4 book, h6. Every line engine-verified; his "old
  Belgrade loses" caveat makes the soundness sweep NON-negotiable here.
- The gambit is an honest SURPRISE WEAPON — narrate soundness honestly per the
  teach-both rule (practical danger vs objective eval).
- Related mined material (the 1…Nc6/d5 "inferior Scandinavian" + Bb5/Ne5/b4/Qf3
  vs …a6 punish) lives in the endgame-analysis transcript notes
  (anti-pirc-modern.md §Belgrade) for the same build.
- New opening entry (not in app): candidate id `belgrade-gambit`, White, vs
  1…e5 — also add to counter-repertoire `open-e5` family as the sharp second
  recommendation next to the Ruy (style contrast: positional Ruy vs sharp
  Belgrade).
