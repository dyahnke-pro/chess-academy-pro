# Lichess-Match Audit

For every opening annotation file, verifies that its main-line SAN sequence matches a prefix of a Lichess ECO opening PGN.

Files scanned: **1915**

| Finding | Count |
|---|---:|
| No plausible Lichess parent | 0 |
| Diverges from parent mid-sequence | 38 |
| Annotation shorter than Lichess parent (OK) | 0 |

## Divergences (sorted by move# — earlier = more suspicious)

| File | Lichess parent (ECO) | Move# | File SAN | Lichess SAN | Lichess line (first 10) |
|---|---|---:|---|---|---|
| london-system.json | London System (A48) | 4 | `Nf6` | `g6` | `d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6` |
| catalan-opening-closed-zagoryansky-variation.json | Catalan Opening: Closed, Zagoryansky Variation (E08) | 5 | `d5` | `Nf3` | `d4 e6 c4 Nf6 Nf3 d5 g3 Be7 Bg2 O-O` |
| queens-gambit-declined-harrwitz-attack-two-knights-defense-blockade-line.json | (no mapped parent) () | 5 | `d5` | `(unknown)` | `` |
| birds-opening.json | (no mapped parent) () | 6 | `g6` | `(unknown)` | `` |
| reti-opening.json | (no mapped parent) () | 6 | `Nc6` | `(unknown)` | `` |
| trompowsky-attack.json | Trompowsky Attack (A45) | 6 | `d5` | `(unknown)` | `d4 Nf6 Bg5` |
| zukertort-opening-reversed-gr-nfeld.json | Zukertort Opening: Reversed Grünfeld (A08) | 6 | `e6` | `Nc6` | `Nf3 d5 g3 c5 Bg2 Nc6 d4 e6 O-O` |
| benoni-defense-classical-variation-main-line.json | Benoni Defense: Classical Variation, Main Line (A73) | 7 | `dxe6` | `Nc3` | `d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6` |
| benoni-defense-kings-pawn-line-with-be3.json | Benoni Defense (A56) | 7 | `dxe6` | `(unknown)` | `d4 Nf6 c4 c5` |
| benoni-defense-pawn-storm-variation.json | Benoni Defense: Pawn Storm Variation (A66) | 7 | `dxe6` | `Nc3` | `d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6` |
| englund-gambit.json | Englund Gambit (A40) | 7 | `Bf4` | `(unknown)` | `d4 e5` |
| r-ti-opening-anglo-slav-variation-gurevich-system.json | Réti Opening: Anglo-Slav Variation, Gurevich System (A11) | 7 | `b3` | `Nc3` | `c4 c6 Nf3 d5 e3 Nf6 Nc3 e6 b3 Bd6` |
| rubinstein-opening-classical-defense.json | Rubinstein Opening: Classical Defense (D05) | 7 | `dxc5` | `Bd3` | `d4 Nf6 Nf3 e6 e3 c5 Bd3 d5 b3 Nc6` |
| zukertort-opening-double-fianchetto-attack.json | Zukertort Opening: Double Fianchetto Attack (A05) | 7 | `Bg2` | `Bb2` | `Nf3 Nf6 g3 g6 b3 Bg7 Bb2 O-O Bg2 d6` |
| english-opening.json | English Opening (A10) | 8 | `Bb4` | `(unknown)` | `c4` |
| vienna-game.json | Vienna Game (C25) | 8 | `O-O` | `(unknown)` | `e4 e5 Nc3` |
| queens-indian-defense-buerger-variation.json | (no mapped parent) () | 9 | `c5` | `(unknown)` | `` |
| queens-indian-defense-kasparov-petrosian-variation-kasparov-attack.json | (no mapped parent) () | 9 | `d5` | `(unknown)` | `` |
| alekhine-defence.json | Alekhine Defense (B03) | 10 | `e6` | `(unknown)` | `e4 Nf6 e5 Nd5 d4 d6 c4` |
| gambit-kings-gambit.json | (no mapped parent) () | 10 | `g4` | `(unknown)` | `` |
| old-indian-defence.json | Old Indian Defense (A53) | 10 | `Be7` | `(unknown)` | `d4 Nf6 c4 d6` |
| kings-indian-defense-four-pawns-attack-fluid-attack.json | (no mapped parent) () | 11 | `c5` | `(unknown)` | `` |
| scandinavian-defence.json | Scandinavian Defense (B01) | 11 | `Bc4` | `(unknown)` | `e4 d5 b3` |
| scotch-gambit.json | (no mapped parent) () | 11 | `exf6` | `(unknown)` | `` |
| nimzo-indian.json | Nimzo-Indian Defense (E20) | 12 | `d5` | `(unknown)` | `d4 Nf6 c4 e6 Nc3 Bb4` |
| caro-kann-defense-classical-variation-seirawan-variation.json | Caro-Kann Defense: Classical Variation, Seirawan Variation (B19) | 13 | `h5` | `Nf3` | `e4 c6 d4 d5 Nd2 dxe4 Nxe4 Bf5 Ng3 Bg6` |
| philidor-defence.json | Philidor Defense (C41) | 13 | `Re1` | `(unknown)` | `e4 e5 Nf3 d6 Bc4 Be7` |
| dutch-defence.json | Dutch Defense (A84) | 14 | `Qe8` | `(unknown)` | `d4 f5 c4` |
| italian-game.json | Italian Game (C50) | 14 | `Bxd2+` | `(unknown)` | `e4 e5 Nf3 Nc6 Bc4` |
| kings-indian-defense-orthodox-variation-classical-system-benko-attack.json | (no mapped parent) () | 14 | `Nc6` | `(unknown)` | `` |
| smith-morra-gambit.json | (no mapped parent) () | 14 | `Nf6` | `(unknown)` | `` |
| benoni-defense-kings-pawn-line-with-bg5.json | Benoni Defense (A56) | 15 | `dxe6` | `(unknown)` | `d4 Nf6 c4 c5` |
| grunfeld-defence.json | (no mapped parent) () | 15 | `Be3` | `(unknown)` | `` |
| queens-gambit.json | (no mapped parent) () | 15 | `Nf3` | `(unknown)` | `` |
| slav-defence.json | Slav Defense (D10) | 16 | `Nbd7` | `(unknown)` | `d4 d5 c4 c6 Nc3 dxc4` |
| kings-gambit.json | (no mapped parent) () | 17 | `O-O` | `(unknown)` | `` |
| evans-gambit.json | (no mapped parent) () | 18 | `Nf6` | `(unknown)` | `` |
| qga.json | (no mapped parent) () | 20 | `Qb6` | `(unknown)` | `` |

