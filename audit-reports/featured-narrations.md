# Featured-Narrations Audit Report

Generated: 2026-04-29T00:35:27.066Z
Elapsed: 38096ms

Scope: 40 openings from `repertoire.json` + 80 pro entries from
`pro-repertoires.json`. Empty subline annotations are skipped per
user request — this audit covers content-only records.

## Confidence

- **piece-on-square** — high signal. Templated annotations slot a
  wrong piece name into capture sentences ("captures the knight on
  e5" when e5 holds a pawn). Almost all hits are real bugs.
- **templated-filler** — high signal. These annotations match the
  same generic patterns that `walkthroughNarration.ts` silently
  drops at runtime — i.e. the user never hears them, contributing
  to the perceived narration ↔ board desync.
- **hanging-piece / check-claim / mate-claim** — medium signal.
  Few hits; review individually.
- **illegal-arrow** — high signal when present (board would
  display an arrow that is not a legal move).
- *illegal-san is intentionally not run* — too noisy on legitimate
  references to past / future / thematic moves.

## Collection

| Bucket | Count |
|---|---:|
| Repertoire main-line moves (total / empty) | 769 / 0 |
| Repertoire subline moves (total / empty) | 18294 / 8906 |
| Repertoire variation explanations audited | 309 |
| Pro entries with annotation file | 13 |
| Pro standalone entries (inline only) | 67 |
| Pro overview blurbs audited | 80 |
| Pro variation explanations audited | 236 |
| **Total non-empty records audited** | **14900** |

## Findings by kind

| Kind | Count |
|---|---:|
| templated-filler | 4553 |
| piece-on-square | 195 |
| mate-claim | 1 |
| **TOTAL** | **4749** |

## Findings by source

| Source | Count |
|---|---:|
| rep-subline | 3573 |
| pro-subline | 1141 |
| repertoire-variation | 25 |
| rep-main | 6 |
| pro-variation | 2 |
| pro-main | 1 |
| pro-overview | 1 |

## Top openings by finding count

| Opening | Findings |
|---|---:|
| sicilian-sveshnikov | 157 |
| scotch-game | 150 |
| four-knights-game | 137 |
| sicilian-alapin | 136 |
| vienna-game | 132 |
| sicilian-najdorf | 127 |
| pro-carlsen-sicilian-najdorf | 127 |
| italian-game | 126 |
| dutch-defence | 114 |
| ruy-lopez | 112 |
| pro-carlsen-ruy-lopez | 112 |
| pro-caruana-ruy-lopez | 112 |
| pro-firouzja-ruy-lopez | 112 |
| pro-praggnanandhaa-ruy-lopez | 112 |
| nimzo-indian | 110 |
| benko-gambit | 110 |
| sicilian-dragon | 108 |
| london-system | 107 |
| kings-gambit | 106 |
| trompowsky-attack | 106 |
| semi-slav | 106 |
| pro-naroditsky-semi-slav | 106 |
| grunfeld-defence | 105 |
| pro-chesswithakeem-kings-gambit | 105 |
| pro-gothamchess-caro-kann | 101 |

## piece-on-square (195)

| Source | Opening | Subline / Variation | Move# | SAN | Detail |
|---|---|---|---:|---|---|
| rep-subline | italian-game | Italian: Hungarian Defense | 12 | dxe5 | claims knight on e5, board holds a p |
| rep-subline | italian-game | Firouzja: Italian (Nc3 Gambit) | 23 | Rxe4 | claims bishop on e4, board holds a r |
| rep-subline | italian-game | Italian: Modern Moller Attack | 17 | bxc3 | claims knight on c3, board holds a p |
| rep-subline | italian-game | Lolli Attack | 20 | dxc3 | claims knight on c3, board holds a p |
| rep-subline | italian-game | Max Lange Attack Theory | 13 | exf6 | claims knight on f6, board holds a p |
| rep-subline | italian-game | Max Lange Attack Theory | 14 | dxc4 | claims bishop on c4, board holds a p |
| rep-subline | italian-game | Giuoco Piano: Black Delays Castling | 30 | fxe6 | claims knight on e6, board holds a p |
| repertoire-variation | italian-game | Giuoco Piano: Greco Attack (Bd2 line) | 33 | Qd1 | claims bishop on d2, board holds a n |
| rep-subline | ruy-lopez | Berlin Defense | 12 | dxc6 | claims bishop on c6, board holds a p |
| rep-subline | ruy-lopez | Anti-Berlin with d3 | 19 | Nh4 | claims knight on f5, square is empty |
| rep-subline | ruy-lopez | Exchange Variation | 8 | dxc6 | claims bishop on c6, board holds a p |
| rep-subline | scotch-game | Scotch: Classical (4...Bc5) | 11 | c3 | claims pawn on d4, board holds a n |
| rep-subline | scotch-game | Scotch: Mieses Variation 4...Nf6 (e5 Push) | 10 | bxc6 | claims knight on c6, board holds a p |
| rep-subline | scotch-game | Scotch Gambit (4.Bc4) | 16 | bxc6 | claims bishop on c6, board holds a p |
| rep-subline | scotch-game | Scotch: Schmidt Variation (4...Nf6 5.Nc3 Bb4) | 12 | bxc6 | claims knight on c6, board holds a p |
| … | … | (180 more in JSON) | | | |

## mate-claim (1)

| Source | Opening | Subline / Variation | Move# | SAN | Detail |
|---|---|---|---:|---|---|
| repertoire-variation | sicilian-dragon | Yugoslav Attack Main Line | 36 | Rxc3 | narration claims checkmate, position is not mate |

## templated-filler (4553)

| Source | Opening | Subline / Variation | Move# | SAN | Detail |
|---|---|---|---:|---|---|
| rep-subline | italian-game | Giuoco Pianissimo | 14 | Ba7 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Evans Gambit | 8 | Bxb4 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Evans Gambit | 10 | Ba5 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Evans Gambit | 11 | d4 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Evans Gambit | 12 | exd4 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Italian: Hungarian Defense | 3 | Nf3 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Italian: Hungarian Defense | 4 | Nc6 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Italian: Hungarian Defense | 12 | dxe5 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Italian: Hungarian Defense | 16 | Nf6 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Italian: Hungarian Defense | 19 | Nc3 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Two Knights Defense | 7 | d4 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Two Knights Defense | 8 | exd4 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Two Knights Defense | 10 | Nxe4 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Two Knights Defense | 12 | d5 | matches a runtime-suppressed generic pattern |
| rep-subline | italian-game | Two Knights Defense | 13 | Bxd5 | matches a runtime-suppressed generic pattern |
| … | … | (4538 more in JSON) | | | |
