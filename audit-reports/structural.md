# Structural Audit Report

Generated: 2026-04-16T22:52:52.074Z
Total scripted-move records scanned: **43239**

## Counts

| Finding | Count |
|---|---:|
| Bare / empty annotations | 2 |
| Filler annotations | 10583 |
| Illegal moves (PGN won't parse) | 284 |
| SAN ↔ replay drift | 30 |
| Illegal arrows | 7654 |
| Classification ↔ text sanity | 0 |
| Templated-phrase clusters (≥25 reuses) | 50 |

## Illegal moves (highest priority — these lines are broken)

| Source | Opening | Subline | Move# | SAN |
|---|---|---|---:|---|
| annotation-main | albin-countergambit |  | 21 | Nc3 |
| annotation-main | albin-countergambit |  | 22 | Qxe5 |
| annotation-main | albin-countergambit |  | 23 | Nf3 |
| annotation-main | albin-countergambit |  | 24 | Qf6 |
| annotation-main | albin-countergambit |  | 25 | Qb3 |
| annotation-main | albin-countergambit |  | 26 | Nc6 |
| annotation-main | albin-countergambit |  | 27 | Qxb7 |
| annotation-main | albin-countergambit |  | 28 | Bg4 |
| annotation-main | albin-countergambit |  | 29 | Qb5 |
| annotation-main | albin-countergambit |  | 30 | Rb8 |
| annotation-main | albin-countergambit |  | 31 | Qa4 |
| annotation-main | albin-countergambit |  | 32 | O-O |
| annotation-main | albin-countergambit |  | 33 | Rd1 |
| annotation-main | albin-countergambit |  | 34 | Rfe8 |
| annotation-main | alekhine-defense-exchange-variation-voronezh-variation |  | 15 | O-O |
| annotation-main | alekhine-defense-exchange-variation-voronezh-variation |  | 16 | Rc1 |
| annotation-main | alekhine-defense-exchange-variation-voronezh-variation |  | 17 | b3 |
| annotation-main | benoni-defense-benoni-staunton-gambit |  | 5 | exf5 |
| annotation-main | benoni-defense-classical-variation-czerniak-defense-tal-line |  | 7 | cxd5 |
| annotation-main | benoni-defense-classical-variation-czerniak-defense-tal-line |  | 8 | d6 |
| annotation-main | benoni-defense-classical-variation-czerniak-defense-tal-line |  | 9 | e4 |
| annotation-main | benoni-defense-classical-variation-czerniak-defense-tal-line |  | 10 | g6 |
| annotation-main | benoni-defense-classical-variation-czerniak-defense-tal-line |  | 11 | Nf3 |
| annotation-main | benoni-defense-classical-variation-czerniak-defense-tal-line |  | 12 | Bg7 |
| annotation-main | benoni-defense-classical-variation-czerniak-defense-tal-line |  | 13 | Be2 |
| annotation-main | benoni-defense-classical-variation-czerniak-defense-tal-line |  | 14 | O-O |
| annotation-main | benoni-defense-classical-variation-czerniak-defense-tal-line |  | 15 | O-O |
| annotation-main | benoni-defense-classical-variation-czerniak-defense-tal-line |  | 16 | Re8 |
| annotation-main | benoni-defense-classical-variation-czerniak-defense-tal-line |  | 17 | Nd2 |
| annotation-main | benoni-defense-classical-variation-main-line |  | 8 | Bxe6 |
| … | … | (254 more) | | |

## SAN ↔ replay drift

Annotation declared SAN does not match chess.js replay at that ply.

| Source | Opening | Subline | Move# | Declared | Replayed |
|---|---|---|---:|---|---|
| annotation-main | albin-countergambit |  | 20 | Nf3 | Nf3+ |
| annotation-subline | albin-countergambit | Albin Countergambit: Fianchetto System | 21 | Nbxd4 | Nxd4 |
| annotation-subline | gambit-benko-gambit | Benko Gambit: Half-Accepted | 15 | Nge2 | Ne2 |
| annotation-subline | budapest-gambit | Don't Allow Nd2-f3 Consolidation | 11 | Ngf3 | Nf3 |
| annotation-main | danish-gambit |  | 42 | Rac8 | Rc8 |
| annotation-subline | danish-gambit | Danish Gambit: d5 Return (Schlechter Defense) | 22 | Re8+ | Re8 |
| annotation-subline | danish-gambit | Greedy Grab Punishment | 20 | Qe4 | Qxe4 |
| annotation-subline | danish-gambit | d5 Counterstrike Refutation | 19 | Nge2 | Ne2 |
| annotation-subline | danish-gambit | Two Knights Defense: Black Returns Pawn Wisely | 13 | Nge2 | Ne2 |
| annotation-subline | englund-gambit | Rook Heist (Queen Wins Rook) | 16 | Qc1+ | Qc1# |
| annotation-subline | englund-gambit | Bf4 Refutation: White Holds Easily | 29 | Qxg6+ | Qxg6 |
| annotation-subline | gambit-budapest-gambit | Bc5 Fork Trick | 32 | Qg2 | Qg2+ |
| annotation-subline | gambit-evans-gambit | Quick d5 Double Attack | 17 | Qxf7+ | Qxf7# |
| annotation-subline | gambit-evans-gambit | Lasker Defense: Black Equalizes | 18 | Nge7 | Ne7 |
| annotation-subline | gambit-evans-gambit | Compromised Defense: Black Consolidates | 27 | Bd3 | Bxd3 |
| annotation-subline | italian-game | Blackburne Shilling Gambit Refutation | 14 | Nf3 | Nf3# |
| annotation-subline | marshall-attack | Marshall Attack: Re6 Rook Lift | 40 | Bf3+ | Bxf3+ |
| annotation-subline | ruy-lopez | Fishing Pole Trap | 18 | Qh1+ | Qh1# |
| annotation-subline | scotch-gambit | Scotch Gambit: Ng4 Retreat Variation | 11 | Bf7+ | Bxf7+ |
| annotation-subline | scotch-gambit | Max Lange Attack: Black Knows Theory | 23 | Nce4 | Ne4 |
| annotation-subline | sicilian-najdorf | Najdorf: ...b5-b4 Queenside Attack | 23 | Nce2 | Ne2 |
| annotation-main | stafford-gambit |  | 26 | Bxf1 | Bxf1+ |
| annotation-main | stafford-gambit |  | 31 | Rae1 | Re1 |
| annotation-subline | stafford-gambit | Stafford Gambit: Bg5 Main Trap Line | 16 | Bg4+ | Bg4# |
| annotation-subline | stafford-gambit | Stafford Gambit: Nc3 Variation | 20 | Qf2+ | Qf2# |
| annotation-subline | stafford-gambit | Oh No My Queen | 16 | Bg4+ | Bg4# |
| annotation-subline | stafford-gambit | Qh4 Discovered Attack | 16 | Bg4+ | Bg4# |
| middlegame-plan | italian-game | f4 Recapture and Queen Swing | 1 | exf4 | exf4+ |
| middlegame-plan | pro-naroditsky-jobava-london | e4 Break After ...c6 | 3 | Nac7 | Nc7 |
| middlegame-plan | pro-naroditsky-jobava-london | Space Squeeze: Nc4 + e4 | 3 | Nac7 | Nc7 |

## Illegal arrows

| Source | Opening | Subline | Move# | SAN | Arrow |
|---|---|---|---:|---|---|
| annotation-main | albin-countergambit |  | 3 | c4 | c4->d5 |
| annotation-main | albin-countergambit |  | 4 | e5 | e5->d4 |
| annotation-main | albin-countergambit |  | 6 | d4 | d4->c3 |
| annotation-main | albin-countergambit |  | 6 | d4 | d4->e3 |
| annotation-main | albin-countergambit |  | 7 | e3 | e3->d4 |
| annotation-main | albin-countergambit |  | 8 | Bb4+ | b4->e1 |
| annotation-main | albin-countergambit |  | 10 | dxe3 | e3->f2 |
| annotation-main | albin-countergambit |  | 10 | dxe3 | e3->d2 |
| annotation-main | albin-countergambit |  | 12 | exf2+ | f2->e1 |
| annotation-main | albin-countergambit |  | 14 | fxg1=N+ | g1->e2 |
| annotation-main | albin-countergambit |  | 14 | fxg1=N+ | g1->h3 |
| annotation-main | albin-countergambit |  | 16 | Qh4+ | h4->e1 |
| annotation-main | albin-countergambit |  | 16 | Qh4+ | h4->e4 |
| annotation-main | albin-countergambit |  | 18 | Qe4+ | e4->h1 |
| annotation-main | albin-countergambit |  | 18 | Qe4+ | e4->e5 |
| annotation-main | albin-countergambit |  | 20 | Nf3 | f3->h2 |
| annotation-main | albin-countergambit |  | 20 | Nf3 | f3->d2 |
| annotation-main | albin-countergambit |  | 21 | Nc3 | b1->c3 |
| annotation-main | albin-countergambit |  | 21 | Nc3 | c3->e4 |
| annotation-subline | albin-countergambit | e3 Queen Trap Variation | 22 | O-O-O+ | e8->c1 |
| annotation-subline | albin-countergambit | Alapin Variation: White Plays 4.e4 | 30 | O-O-O | e8->c1 |
| annotation-main | alekhine-defence |  | 1 | e4 | e4->d5 |
| annotation-main | alekhine-defence |  | 1 | e4 | e4->f5 |
| annotation-main | alekhine-defence |  | 2 | Nf6 | f6->e4 |
| annotation-main | alekhine-defence |  | 3 | e5 | e5->f6 |
| annotation-main | alekhine-defence |  | 3 | e5 | e5->d6 |
| annotation-main | alekhine-defence |  | 4 | Nd5 | d5->c3 |
| annotation-main | alekhine-defence |  | 4 | Nd5 | d5->f4 |
| annotation-main | alekhine-defence |  | 5 | d4 | d4->e5 |
| annotation-main | alekhine-defence |  | 5 | d4 | d4->c5 |
| … | … | (7624 more) | | | |

## Templated-phrase clusters

Phrases appearing ≥ 25 times across the corpus — likely filler the
regex list hasn't learned yet. Candidates for new patterns.

| Count | Phrase | Sample opening |
|---:|---|---|
| 245 | nf brings the knight into the game development with purpose  the knight on f eyes important squares | albin-countergambit |
| 199 | nc brings the knight into the game development with purpose  the knight on c eyes important squares | albin-countergambit |
| 187 | castles to safety connecting the rooks and tucking the king away | alekhine-defence |
| 181 | gets the king to safety with castling an essential step before the middlegame battle begins | alekhine-defence |
| 177 | tucks the king to safety via castling the rook now enters the game on a central file | alekhine-defence |
| 146 | c expands on the queenside gaining space here creates potential targets and restricts the opponent's | albin-countergambit |
| 141 | d stakes a claim in the center central pawns control space and restrict the opponent's piece activit | albin-countergambit |
| 140 | we're opening with the queen's pawn immediately staking a claim to the central e and c squares while | amazon-attack-siberian-attack |
| 135 | we're opening with the queen's pawn immediately staking a claim to the central e and c squares while | benko-gambit-accepted-central-storming-variation |
| 106 | white pushes the pawn to d this central advance fights for space and control of key squares | alekhine-defence |
| 105 | white moves forward to d this central advance fights for space and control of key squares | alekhine-defence |
| 97 | white expands with the pawn to d this central advance fights for space and control of key squares | alekhine-defence |
| 96 | black captures the pawn on d this move contributes to black's opening development and fight for cent | alekhine-defence |
| 94 | white advances to d this central advance fights for space and control of key squares | alekhine-defence |
| 94 | white stakes a claim on e this central advance fights for space and control of key squares | alekhine-defence |
| 93 | white stakes a claim on d this central advance fights for space and control of key squares | alekhine-defence |
| 92 | white moves the bishop to e the bishop on e controls key diagonal squares and maintains active piece | alekhine-defence |
| 89 | white castles kingside to tuck the king away safely and activate the rook connecting the rooks is a  | albin-countergambit |
| 89 | black moves the bishop to e the bishop on e controls key diagonal squares and maintains active piece | alekhine-defence |
| 88 | e stakes a claim in the center central pawns control space and restrict the opponent's piece activit | albin-countergambit |
| 83 | be brings the bishop into the game development with purpose  the bishop on e eyes important squares | albin-countergambit |
| 83 | black moves the knight to d the knight on d improves black's piece coordination and flexibility | alekhine-defence |
| 83 | black brings the knight to its natural square on f the knight on f improves black's piece coordinati | gambit-benko-gambit |
| 81 | white expands with the pawn to e this central advance fights for space and control of key squares | alekhine-defence |
| 81 | black activates the knight on f the knight on f improves black's piece coordination and flexibility | alekhine-defence |
| 80 | white moves forward to e this central advance fights for space and control of key squares | alekhine-defence |
| 79 | white activates the knight on f the knight on f improves white's piece coordination and flexibility | alekhine-defence |
| 79 | bc brings the bishop into the game development with purpose  the bishop on c eyes important squares | gambit-benko-gambit |
| 78 | white advances to e this central advance fights for space and control of key squares | alekhine-defence |
| 78 | black deploys the knight to f the knight on f improves black's piece coordination and flexibility | alekhine-defence |
| 77 | g pushes on the kingside this pawn advance gains space and can support a future attack toward the en | albin-countergambit |
| 74 | a expands on the queenside gaining space here creates potential targets and restricts the opponent's | albin-countergambit |
| 74 | white pushes the pawn to e this central advance fights for space and control of key squares | alekhine-defence |
| 73 | white places the knight on the active f square the knight on f improves white's piece coordination a | alekhine-defence |
| 71 | black castles kingside to tuck the king away safely and activate the rook connecting the rooks is a  | albin-countergambit |
| 71 | d increases black's influence over the center controlling the center is the foundation of a strong p | alekhine-defence |
| 71 | black places the knight on the active f square the knight on f improves black's piece coordination a | alekhine-defence |
| 70 | white deploys the knight to f the knight on f improves white's piece coordination and flexibility | alekhine-defence |
| 68 | white develops the knight to c the knight on c improves white's piece coordination and flexibility | alekhine-defence |
| 68 | white develops the knight to f the knight on f improves white's piece coordination and flexibility | alekhine-defence |
| 68 | black moves the bishop to d the bishop on d controls key diagonal squares and maintains active piece | alekhine-defence |
| 67 | black develops the knight to f the knight on f improves black's piece coordination and flexibility | alekhine-defence |
| 66 | white moves the knight to c the knight on c improves white's piece coordination and flexibility | alekhine-defence |
| 64 | white captures the pawn on d this move contributes to white's opening development and fight for cent | alekhine-defence |
| 62 | b expands on the queenside gaining space here creates potential targets and restricts the opponent's | albin-countergambit |
| 61 | white brings the knight to its natural square on f the knight on f improves white's piece coordinati | alekhine-defence |
| 61 | white moves the rook to e the rook takes up a powerful position on the e-file pressuring black's pos | alekhine-defence |
| 60 | black advances to d this central advance fights for space and control of key squares | alekhine-defence |
| 59 | white moves the knight to d the knight on d improves white's piece coordination and flexibility | alekhine-defence |
| 57 | white moves the bishop to d the bishop on d controls key diagonal squares and maintains active piece | gambit-benko-gambit |

## Bare-annotation breakdown by opening (top 20)

| Opening | Bare-annotation count |
|---|---:|
| pro-naroditsky-jobava-london | 2 |
