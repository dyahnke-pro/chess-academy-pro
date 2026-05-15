# Structural Audit Report

Generated: 2026-05-15T16:23:36.112Z
Total scripted-move records scanned: **32851**

## Counts

| Finding | Count |
|---|---:|
| Bare / empty annotations | 6910 |
| Filler annotations | 0 |
| Illegal moves (PGN won't parse) | 0 |
| SAN ↔ replay drift | 0 |
| Illegal arrows | 2 |
| Classification ↔ text sanity | 0 |
| Templated-phrase clusters (≥25 reuses) | 43 |

## Illegal arrows

| Source | Opening | Subline | Move# | SAN | Arrow |
|---|---|---|---:|---|---|
| annotation-main | pro-dubov-italian |  | 15 | Bd5 | d5->e4 |
| annotation-main | pro-dubov-italian |  | 15 | Bd5 | d5->a8 |

## Templated-phrase clusters

Phrases appearing ≥ 25 times across the corpus — likely filler the
regex list hasn't learned yet. Candidates for new patterns.

| Count | Phrase | Sample opening |
|---:|---|---|
| 139 | we're opening with the queen's pawn immediately staking a claim to the central e and c squares while | amazon-attack-siberian-attack |
| 134 | we're opening with the queen's pawn immediately staking a claim to the central e and c squares while | benko-gambit-accepted-central-storming-variation |
| 93 | d stakes a claim in the center central pawns control space and restrict the opponent's piece activit | catalan-opening |
| 64 | black moves the bishop to e the bishop on e controls key diagonal squares and maintains active piece | catalan-opening |
| 57 | white activates the knight on f the knight on f improves white's piece coordination and flexibility | catalan-opening |
| 55 | black brings the knight to its natural square on f the knight on f improves black's piece coordinati | catalan-opening |
| 53 | white moves the bishop to e the bishop on e controls key diagonal squares and maintains active piece | catalan-opening |
| 51 | black moves the bishop to d the bishop on d controls key diagonal squares and maintains active piece | catalan-opening |
| 50 | white moves the knight to c the knight on c improves white's piece coordination and flexibility | catalan-opening |
| 48 | e stakes a claim in the center central pawns control space and restrict the opponent's piece activit | catalan-opening |
| 45 | white deploys the knight to f the knight on f improves white's piece coordination and flexibility | catalan-opening |
| 44 | black deploys the knight to f the knight on f improves black's piece coordination and flexibility | catalan-opening |
| 43 | black moves the knight to d the knight on d improves black's piece coordination and flexibility | catalan-opening |
| 42 | white brings the knight to its natural square on f the knight on f improves white's piece coordinati | catalan-opening |
| 41 | we're opening with the queen's pawn immediately staking a claim to the center and controlling the im | dutch-defense |
| 41 | white moves the rook to e the rook takes up a powerful position on the e-file pressuring black's pos | four-knights-game |
| 41 | white places the knight on the active f square the knight on f improves white's piece coordination a | four-knights-game |
| 40 | white develops the knight to c the knight on c improves white's piece coordination and flexibility | english-opening |
| 40 | black moves the rook to e the rook takes up a powerful position on the e-file pressuring white's pos | four-knights-game |
| 39 | black activates the knight on f the knight on f improves black's piece coordination and flexibility | catalan-opening |
| 39 | exd stakes a claim in the center central pawns control space and restrict the opponent's piece activ | danish-gambit |
| 37 | black develops the knight to f the knight on f improves black's piece coordination and flexibility | catalan-opening |
| 36 | we're opening with the queen's pawn staking our claim to the central e and c squares while preparing | benoni-defense-mikenas-variation |
| 36 | black places the knight on the active f square the knight on f improves black's piece coordination a | four-knights-game |
| 35 | white moves the bishop to g the bishop on g controls key diagonal squares and maintains active piece | catalan-opening |
| 35 | black deploys the knight to c the knight on c improves black's piece coordination and flexibility | english-opening |
| 35 | white develops the knight to f the knight on f improves white's piece coordination and flexibility | four-knights-game |
| 34 | white moves the queen to d the queen takes up an influential position on d eyeing multiple targets | catalan-opening |
| 34 | white moves the knight to d the knight reaches a powerful central outpost on d controlling multiple  | english-opening |
| 34 | white moves the knight to d the knight on d improves white's piece coordination and flexibility | english-opening |
| 33 | we're opening with the queen's pawn staking an immediate claim to the central e and c squares while  | benko-gambit-accepted-pawn-return-variation |
| 33 | black places the knight on the active c square the knight on c improves black's piece coordination a | english-opening |
| 33 | white captures the pawn on d white improves piece placement heading into the critical phase of the g | english-opening |
| 33 | f pushes on the kingside this pawn advance gains space and can support a future attack toward the en | englund-gambit |
| 30 | g pushes on the kingside this pawn advance gains space and can support a future attack toward the en | catalan-opening |
| 29 | black develops the knight to c the knight on c improves black's piece coordination and flexibility | four-knights-game |
| 28 | we're opening with the queen's pawn immediately staking a claim to the central e square and preparin | bogo-indian-defense-vitolins-variation |
| 28 | cxd stakes a claim in the center central pawns control space and restrict the opponent's piece activ | danish-gambit |
| 28 | white brings the knight to its natural square on c the knight on c improves white's piece coordinati | english-opening |
| 28 | black moves the bishop to g the bishop on g controls key diagonal squares and maintains active piece | four-knights-game |
| 26 | black responds symmetrically in the center immediately challenging our control of the e square and e | amazon-attack |
| 26 | nxe  this capture changes the character of the position be alert | catalan-opening |
| 26 | white moves the bishop to d the bishop on d controls key diagonal squares and maintains active piece | catalan-opening |

## Bare-annotation breakdown by opening (top 20)

| Opening | Bare-annotation count |
|---|---:|
| sicilian-defense-najdorf-variation-opocensky-variation-traditional-line | 397 |
| sicilian-defense-lasker-pelikan-variation-sveshnikov-variation-chelyabinsk-variation | 336 |
| king-s-indian-defense | 320 |
| sicilian-defense-dragon-variation-yugoslav-attack-old-line | 318 |
| london-system | 297 |
| sicilian-defense-alapin-variation-smith-morra-declined | 294 |
| sicilian-defense-smith-morra-gambit-accepted-chicago-defense | 283 |
| scotch-game | 273 |
| catalan-opening | 262 |
| king-s-gambit | 262 |
| petrov-s-defense-stafford-gambit | 262 |
| danish-gambit | 258 |
| englund-gambit | 250 |
| scotch-game-scotch-gambit | 224 |
| vienna-game-vienna-gambit | 223 |
| vienna-game | 221 |
| trompowsky-attack | 205 |
| italian-game-evans-gambit | 196 |
| italian-game | 196 |
| four-knights-game | 194 |
