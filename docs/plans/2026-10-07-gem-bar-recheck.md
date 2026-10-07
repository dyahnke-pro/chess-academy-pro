# Gem re-check against the trap bar (F04) — 2026-10-07

Bar: forced, wins at least a piece (engine >= 300 cp for the punisher at the quiet end of the playout) or mate.
Source: engineCp already stored per gem (engine playout to a quiet position). Measured, not re-run.

**punish-gems.json: 344 gems → 54 clear the bar, 290 cut.**

| opening | their slip | the punish | engine (cp) |
|---|---|---|---|
| evans-gambit | d5 | exd5 | 495 |
| french-defence | Nf3 | Nxe4 | 438 |
| french-defence | cxd4 | Qc3+ | 416 |
| italian-game | Nh6 | Bxh6 | 512 |
| italian-game | Nxc3 | Qe1+ | 471 |
| italian-game | Be6 | Bxe6 | 453 |
| italian-game | d5 | Nxd5 | 344 |
| kings-gambit | Bb4 | Qb5+ | 559 |
| kings-gambit | f6 | Ne5 | 491 |
| pro-aman-anti-caro | Nbd7 | Nd6# | 100000 |
| pro-aman-anti-caro | c5 | Bb5+ | 374 |
| pro-aman-reti | Bd6 | e4 | 365 |
| pro-aman-ruy-lopez | Bc5 | Bxd5 | 499 |
| pro-carlsen-nimzo | Nxd5 | Nxd5 | 329 |
| pro-carlsen-sicilian | h3 | Nd4 | 332 |
| pro-ericrosen-qgd | Qb3 | dxc4 | 355 |
| pro-ericrosen-sicilian | a3 | Nxe4 | 302 |
| pro-gothamchess-caro-advance-white | e6 | Bxd8 | 591 |
| pro-gothamchess-caro-advance-white | e6 | g4 | 319 |
| pro-gothamchess-italian | Nxc3 | Qe1+ | 480 |
| pro-gothamchess-milner-barry | Nxd4 | Nxd4 | 346 |
| pro-naroditsky-alapin | Bd6 | Bc4 | 497 |
| pro-samayraina-italian | d5 | Nxd5 | 408 |
| pro-samayraina-open-sicilian | Qxf6 | Nc7+ | 579 |
| pro-samayraina-ruy | Bc5 | Qh5+ | 611 |
| pro-samayraina-ruy | Nxd4 | Nxd4 | 324 |
| qgd | Qb3 | dxc4 | 321 |
| ruy-lopez | Bc5 | Qh5+ | 554 |
| ruy-lopez | Bc5 | Qxd5 | 530 |
| scandinavian-defence | Qa4+ | Bd7+ | 752 |
| scotch-game | Nf6 | Nxc6 | 482 |
| scotch-game | Bxe3 | fxe3 | 476 |
| scotch-game | Bxf2+ | Kxf2 | 392 |
| sicilian-alapin | Bxh7+ | Kxh7 | 436 |
| sicilian-dragon | g4 | Nxd4 | 412 |
| sicilian-dragon | h4 | Nxd4 | 378 |
| sicilian-dragon | Kb1 | Nxd4 | 344 |
| sicilian-najdorf | f3 | Ne3 | 464 |
| sicilian-sveshnikov | a3 | Bxc3+ | 496 |
| sicilian-sveshnikov | Bd2 | Bxc3 | 406 |
| sicilian-sveshnikov | Nxb4 | Qa5 | 400 |
| slav-defence | Qd2 | Bb4 | 357 |
| two-knights-defence | f3 | Qh4+ | 559 |
| two-knights-defence | O-O | h6 | 347 |
| vienna-game | Nd4 | Nxd6+ | 820 |
| vienna-game | Bb6 | Qxg7 | 557 |
| vienna-game | g6 | Qxe5+ | 483 |
| vienna-game | Qg6 | Qxg6 | 448 |
| vienna-game | d6 | Nxf2 | 446 |
| vienna-game | Nge7 | Nxg5 | 419 |
| vienna-game | Qg5 | d4 | 361 |
| vienna-game | Qf6 | Nxc7+ | 329 |
| vienna-game | Qf6 | Nd5 | 304 |
| vienna-game | Nge7 | Nxg5 | 304 |

Next: confirm each keeper is FORCED (no defence holds the material) with a deeper engine pass at build time; gambit-punish-gems.json checked the same way.