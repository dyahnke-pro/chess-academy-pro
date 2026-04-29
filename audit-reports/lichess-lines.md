# Lichess Opening-Line Audit

Generated: 2026-04-29T05:46:20.145Z
Source: `lichess` (Lichess explorer, 1600+ rated humans)
Threshold: any move with < 5 games at its position is "rare"; 0 games = "off-book".
Elapsed: 3.6s, FEN cache hits saved redundant API calls.

## Counts

| Status | Count | Meaning |
|---|---:|---|
| ✅ Clean | 39 | All plies match Lichess catalog through the deepest named line. |
| 📚 Continuation | 617 | First plies match the claimed parent opening; line continues past where Lichess names positions. Normal for deep theory. |
| ⚠️ Wrong parent | 9 | Plies match a catalog entry but its name shares no tokens with the variation's claimed parent. Likely mislabeled. |
| ❌ Never in book | 0 | First move not in any Lichess catalog entry. Likely fabricated. |
| ⛔ Illegal SAN | 0 | A move can't be played from its position. Always a bug. |
| **Total** | **665** | |

## Wrong-parent variations (9) — likely mislabeled

### [C42] Petrov Defence — Three Knights Game

- Source: `repertoire.json` / `petrov-defence`
- Claimed parent: **Petrov Defence**
- Catalog match: **C47 Four Knights Game: Scotch Variation Accepted, Main Line**
- Full PGN: `e4 e5 Nf3 Nf6 Nc3 Nc6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5 Be6 Qf3 Be7 Bxf6 Bxf6 Qxd5 Qxd5 Nxd5 Bxb2 Rab1 Bf6 Nxf6+ gxf6`

### [D10] Slav Defence — Modern Qc2/Qb3 Line

- Source: `repertoire.json` / `slav-defence`
- Claimed parent: **Slav Defence**
- Catalog match: **E09 Catalan Opening: Closed Variation, Rabinovich Variation**
- Full PGN: `d4 d5 c4 c6 Nf3 Nf6 Qc2 dxc4 Qxc4 Bf5 g3 e6 Bg2 Nbd7 O-O Be7 Nc3 O-O e4 Bg6`

### [D43] Semi-Slav Defence — Moscow Variation Bxf6

- Source: `repertoire.json` / `semi-slav`
- Claimed parent: **Semi-Slav Defence**
- Catalog match: **D43 Queen's Gambit Declined: Hastings Variation**
- Full PGN: `d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bxf6 Qxf6 e3 Nd7 Bd3 dxc4 Bxc4 g6 O-O Bg7 e4 e5 d5 O-O Bb3 Nb6 dxc6 bxc6 Qe2 Be6 Bxe6 Qxe6 Rfd1 Rfd8`

### [A04] Reti Opening — Reti: Accepted dxc4 Bxc4

- Source: `repertoire.json` / `reti-opening`
- Claimed parent: **Reti Opening**
- Catalog match: **D26 Queen's Gambit Accepted: Classical, Furman Variation**
- Full PGN: `Nf3 d5 c4 dxc4 e3 Nf6 Bxc4 e6 O-O c5 d4 a6 dxc5 Bxc5 Qe2 O-O Nc3 b5 Bb3 Bb7 Rd1 Qe7`

### [A04] Reti Opening — Reti: LSB Fianchetto

- Source: `repertoire.json` / `reti-opening`
- Claimed parent: **Reti Opening**
- Catalog match: **A07 King's Indian Attack, with e6**
- Full PGN: `Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4 Nc6 Re1 b5 e5 Nd7 Nf1 a5 Bf4 Ba6`

### [A07] King's Indian Attack — KIA: e5 Wedge System

- Source: `repertoire.json` / `kings-indian-attack`
- Claimed parent: **King's Indian Attack**
- Catalog match: **C00 French Defense: Reversed Philidor Formation**
- Full PGN: `e4 e6 d3 d5 Nd2 Nf6 Ngf3 Nc6 g3 dxe4 dxe4 Bc5 Bg2 O-O O-O a5 Qe2 Qe7 e5 Nd5 Nb3 Ba7 Bg5 f6 exf6 Qxf6 Be3 Nxe3 fxe3 Bd7 Nbd4`

### [D43] Semi-Slav Defense (Naroditsky) — (main line)

- Source: `pro-repertoires.json` / `pro-naroditsky-semi-slav`
- Claimed parent: **Semi-Slav Defense (Naroditsky)**
- Catalog match: **D43 Queen's Gambit Declined: Hastings Variation**
- Full PGN: `d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bxf6 Qxf6 e3 Nd7 Bd3 dxc4 Bxc4 g6 O-O Bg7`

### [D43] Semi-Slav Defense (Naroditsky) — Moscow Variation 5.Bg5 h6

- Source: `pro-repertoires.json` / `pro-naroditsky-semi-slav`
- Claimed parent: **Semi-Slav Defense (Naroditsky)**
- Catalog match: **D43 Queen's Gambit Declined: Hastings Variation**
- Full PGN: `d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bxf6 Qxf6 e3 Nd7 Bd3 dxc4 Bxc4 g6 O-O Bg7`

### [D02] Queen's Pawn London (Carlsen) — Jobava-London Attack

- Source: `pro-repertoires.json` / `pro-carlsen-london-d4`
- Claimed parent: **Queen's Pawn London (Carlsen)**
- Catalog match: **A45 Amazon Attack: Siberian Attack**
- Full PGN: `d4 Nf6 Nc3 d5 Bf4 c5 e3 cxd4 exd4 a6 Nf3 Nc6 Bd3 Bg4 O-O e6 h3 Bh5 Re1 Be7 a3 O-O`
