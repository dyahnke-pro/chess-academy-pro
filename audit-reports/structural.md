# Structural Audit Report

Generated: 2026-04-17T00:38:57.801Z
Total scripted-move records scanned: **42961**

## Counts

| Finding | Count |
|---|---:|
| Bare / empty annotations | 11996 |
| Filler annotations | 0 |
| Illegal moves (PGN won't parse) | 6 |
| SAN ↔ replay drift | 3 |
| Illegal arrows | 37 |
| Classification ↔ text sanity | 0 |
| Templated-phrase clusters (≥25 reuses) | 50 |

## Illegal moves (highest priority — these lines are broken)

| Source | Opening | Subline | Move# | SAN |
|---|---|---|---:|---|
| middlegame-plan | kings-indian-defence | e5 Central Counter: Closed Center | 1 | e5 |
| middlegame-plan | scotch-game | Open Center: Rapid Development | 1 | d4 |
| common-mistake-correct | ruy-lopez | mistake[1].correct | 1 | Ba4 |
| common-mistake-wrong | ruy-lopez | mistake[2].wrong | 1 | Bxb5 |
| common-mistake-correct | sicilian-dragon | mistake[0].correct | 1 | O-O |
| common-mistake-correct | grunfeld-defence | mistake[1].correct | 1 | Nxd5 |

## SAN ↔ replay drift

Annotation declared SAN does not match chess.js replay at that ply.

| Source | Opening | Subline | Move# | Declared | Replayed |
|---|---|---|---:|---|---|
| middlegame-plan | italian-game | f4 Recapture and Queen Swing | 1 | exf4 | exf4+ |
| middlegame-plan | pro-naroditsky-jobava-london | e4 Break After ...c6 | 3 | Nac7 | Nc7 |
| middlegame-plan | pro-naroditsky-jobava-london | Space Squeeze: Nc4 + e4 | 3 | Nac7 | Nc7 |

## Illegal arrows

| Source | Opening | Subline | Move# | SAN | Arrow |
|---|---|---|---:|---|---|
| middlegame-plan | italian-game | f4 Recapture and Queen Swing | 7 | Nd7 | c6->d7 |
| middlegame-plan | italian-game | f4 Recapture and Queen Swing | 8 | Qg3 | g3->g7 |
| middlegame-plan | sicilian-najdorf | English Attack: g4 Pawn Storm | 8 | g4 | g4->g5 |
| middlegame-plan | french-defence | f4-f5 Pawn Storm | 9 | f5 | f5->e6 |
| middlegame-plan | french-defence | Ng5 Kingside Attack | 3 | Ng5 | g5->h7 |
| middlegame-plan | french-defence | Ng5 Kingside Attack | 7 | Qh5 | h5->f7 |
| middlegame-plan | french-defence | a3-b4 Queenside Expansion | 7 | Nb3 | b3->c5 |
| middlegame-plan | caro-kann | Nge2-g3 with f4 Buildup | 5 | f4 | f4->f5 |
| middlegame-plan | qgd | Rb1-b4-b5 Minority Attack | 7 | b5 | b5->c6 |
| middlegame-plan | qgd | e4 Central Break: Active Pieces | 4 | Nxe4 | d7->e4 |
| middlegame-plan | qgd | e4 Central Break: Active Pieces | 7 | Bc2 | c2->h7 |
| middlegame-plan | kings-indian-defence | f5-g5-g4 Pawn Storm | 7 | g5 | g5->g4 |
| middlegame-plan | kings-indian-defence | e5 Central Counter: Closed Center | 1 | e5 | e7->e5 |
| middlegame-plan | english-opening | d4 Catalan Transposition | 5 | Bg2 | g2->d5 |
| middlegame-plan | english-opening | b4 Queenside Gambit | 3 | Nd5 | d5->c7 |
| middlegame-plan | english-opening | b4 Queenside Gambit | 5 | Rb1 | b1->b4 |
| middlegame-plan | ruy-lopez | Slow Maneuver: Nbd2-f1-g3 | 7 | Nf1 | f1->g3 |
| middlegame-plan | ruy-lopez | Slow Maneuver: Nbd2-f1-g3 | 8 | Nc5 | c5->b3 |
| middlegame-plan | london-system | e4 Central Breakthrough | 3 | Bd3 | d3->h7 |
| middlegame-plan | london-system | e4 Central Breakthrough | 5 | Nbd2 | d2->e4 |
| middlegame-plan | london-system | c4 with Qb3 Pressure | 4 | Qb3 | b3->b7 |
| middlegame-plan | london-system | c4 with Qb3 Pressure | 4 | Qb3 | b3->d5 |
| middlegame-plan | sicilian-dragon | h4-h5: Opening the h-File | 7 | Bxh5 | h5->f7 |
| middlegame-plan | sicilian-dragon | h4-h5: Opening the h-File | 8 | Nxh5 | h1->h5 |
| middlegame-plan | sicilian-dragon | h4 with Nd5 Jump | 7 | g4 | g4->h5 |
| middlegame-plan | sicilian-dragon | h4 with Nd5 Jump | 9 | Nd5 | d5->e7 |
| middlegame-plan | ruy-lopez | f4 Exchange: Open f-File Attack | 4 | Bxf4 | f1->f7 |
| middlegame-plan | ruy-lopez | f4 Exchange: Open f-File Attack | 6 | Qe1 | e1->g3 |
| middlegame-plan | ruy-lopez | f4 Exchange: Open f-File Attack | 8 | Qg3 | g3->g7 |
| middlegame-plan | scotch-game | Open Center: Rapid Development | 1 | d4 | d2->d4 |
| … | … | (7 more) | | | |

## Templated-phrase clusters

Phrases appearing ≥ 25 times across the corpus — likely filler the
regex list hasn't learned yet. Candidates for new patterns.

| Count | Phrase | Sample opening |
|---:|---|---|
| 141 | d stakes a claim in the center central pawns control space and restrict the opponent's piece activit | albin-countergambit |
| 139 | we're opening with the queen's pawn immediately staking a claim to the central e and c squares while | amazon-attack-siberian-attack |
| 134 | we're opening with the queen's pawn immediately staking a claim to the central e and c squares while | benko-gambit-accepted-central-storming-variation |
| 92 | white moves the bishop to e the bishop on e controls key diagonal squares and maintains active piece | alekhine-defence |
| 89 | black moves the bishop to e the bishop on e controls key diagonal squares and maintains active piece | alekhine-defence |
| 88 | e stakes a claim in the center central pawns control space and restrict the opponent's piece activit | albin-countergambit |
| 83 | black moves the knight to d the knight on d improves black's piece coordination and flexibility | alekhine-defence |
| 83 | black brings the knight to its natural square on f the knight on f improves black's piece coordinati | gambit-benko-gambit |
| 81 | black activates the knight on f the knight on f improves black's piece coordination and flexibility | alekhine-defence |
| 79 | white activates the knight on f the knight on f improves white's piece coordination and flexibility | alekhine-defence |
| 78 | black deploys the knight to f the knight on f improves black's piece coordination and flexibility | alekhine-defence |
| 77 | g pushes on the kingside this pawn advance gains space and can support a future attack toward the en | albin-countergambit |
| 73 | white places the knight on the active f square the knight on f improves white's piece coordination a | alekhine-defence |
| 71 | black places the knight on the active f square the knight on f improves black's piece coordination a | alekhine-defence |
| 70 | white deploys the knight to f the knight on f improves white's piece coordination and flexibility | alekhine-defence |
| 68 | white develops the knight to c the knight on c improves white's piece coordination and flexibility | alekhine-defence |
| 68 | white develops the knight to f the knight on f improves white's piece coordination and flexibility | alekhine-defence |
| 68 | black moves the bishop to d the bishop on d controls key diagonal squares and maintains active piece | alekhine-defence |
| 67 | black develops the knight to f the knight on f improves black's piece coordination and flexibility | alekhine-defence |
| 66 | white moves the knight to c the knight on c improves white's piece coordination and flexibility | alekhine-defence |
| 61 | white brings the knight to its natural square on f the knight on f improves white's piece coordinati | alekhine-defence |
| 61 | white moves the rook to e the rook takes up a powerful position on the e-file pressuring black's pos | alekhine-defence |
| 59 | white moves the knight to d the knight on d improves white's piece coordination and flexibility | alekhine-defence |
| 57 | white moves the bishop to d the bishop on d controls key diagonal squares and maintains active piece | gambit-benko-gambit |
| 55 | black moves the rook to e the rook takes up a powerful position on the e-file pressuring white's pos | alekhine-defence |
| 54 | white moves the queen to d the queen takes up an influential position on d eyeing multiple targets | alekhine-defence |
| 53 | exd stakes a claim in the center central pawns control space and restrict the opponent's piece activ | albin-countergambit |
| 53 | white deploys the knight to c the knight on c improves white's piece coordination and flexibility | gambit-benko-gambit |
| 51 | white brings the knight to its natural square on c the knight on c improves white's piece coordinati | alekhine-defence |
| 50 | white captures the pawn on d white improves piece placement heading into the critical phase of the g | alekhine-defence |
| 50 | white moves the bishop to g the bishop on g controls key diagonal squares and maintains active piece | gambit-benko-gambit |
| 50 | white moves the rook to d the rook takes up a powerful position on the d-file pressuring black's pos | gambit-benko-gambit |
| 46 | black captures the pawn on d black improves piece placement heading into the critical phase of the g | alekhine-defence |
| 46 | white places the knight on the active c square the knight on c improves white's piece coordination a | gambit-benko-gambit |
| 45 | f pushes on the kingside this pawn advance gains space and can support a future attack toward the en | albin-countergambit |
| 45 | black places the knight on the active c square the knight on c improves black's piece coordination a | alekhine-defence |
| 45 | black moves the knight to c the knight on c improves black's piece coordination and flexibility | alekhine-defence |
| 45 | white moves the knight to d the knight reaches a powerful central outpost on d controlling multiple  | gambit-benko-gambit |
| 44 | black moves the knight to f the knight on f improves black's piece coordination and flexibility | alekhine-defence |
| 44 | white activates the knight on c the knight on c improves white's piece coordination and flexibility | gambit-benko-gambit |
| 42 | white moves the knight to f the knight on f improves white's piece coordination and flexibility | alekhine-defence |
| 41 | black moves the knight to a the knight on a improves black's piece coordination and flexibility | alekhine-defence |
| 41 | black moves the bishop to f the bishop on f controls key diagonal squares and maintains active piece | alekhine-defence |
| 41 | we're opening with the queen's pawn immediately staking a claim to the center and controlling the im | dutch-defense |
| 40 | dxe stakes a claim in the center central pawns control space and restrict the opponent's piece activ | albin-countergambit |
| 40 | black deploys the knight to c the knight on c improves black's piece coordination and flexibility | budapest-gambit |
| 40 | black moves the bishop to g the bishop on g controls key diagonal squares and maintains active piece | caro-kann |
| 39 | cxd stakes a claim in the center central pawns control space and restrict the opponent's piece activ | benoni-defence |
| 38 | re places the rook on a central file where it will be most active rooks belong on open or semi-open  | albin-countergambit |
| 38 | nxe  this capture changes the character of the position be alert | albin-countergambit |

## Bare-annotation breakdown by opening (top 20)

| Opening | Bare-annotation count |
|---|---:|
| gambit-benko-gambit | 495 |
| sicilian-najdorf | 397 |
| marshall-attack | 358 |
| sicilian-sveshnikov | 336 |
| kings-indian-defence | 320 |
| sicilian-dragon | 318 |
| dutch-defence | 308 |
| albin-countergambit | 303 |
| london-system | 297 |
| grunfeld-defence | 295 |
| sicilian-alapin | 294 |
| smith-morra-gambit | 283 |
| semi-slav | 282 |
| scotch-game | 273 |
| kings-gambit | 263 |
| catalan-opening | 262 |
| stafford-gambit | 262 |
| danish-gambit | 258 |
| englund-gambit | 250 |
| reti-opening | 250 |
