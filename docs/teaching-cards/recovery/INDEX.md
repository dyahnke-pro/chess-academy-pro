# Recovery principles — index

What to do AFTER a mistake, keyed on the state the mistake leaves (both seats: your mistake → how you fight back; their mistake → how you convert). One file per state. Every principle has ≥2 independent sources; disagreements are written in the file.

Shared definitions every check uses (`_checks.md` would duplicate them, so they live here):
- **Ledger** `mat(side)` = P1 N3 B3 R5 Q9 over chess.js `board()`; `d = mat(student) − mat(opponent)`, read on the board at the QUIET END of the mistake's line (the cost reason's line / the engine PV once captures stop), never one ply after the move.
- **Phase** `npm(side)` = non-pawn material; ENDGAME when `npm(w)+npm(b) ≤ 26` or queens off and `npm ≤ 2×(R+minor)` (same split the app's phase reader uses — reuse it, do not add a second).
- **Eval** = the engine read already stored for the ply, student POV, in cp. **Decided** = `|eval| ≥ 500` (the contested gate's own bar).
- **King zone** = the king's square + its 8 neighbours + the 3 squares in front of those (towards the enemy).
- No phrasing names a move. ≤14 words. 5 phrasings each, rotated with `rotateStem` on the board.

| state | principle | check | sources |
|---|---|---|---|
| down-pawn|middlegame: buy activity; endgame: trade pawns, head for rook ending / opposite bishops; rook active|ledger d∈[−1.5,−0.5], phase, ocb/rookEnding flags, passive-rook guard map|5 |
| down-exchange|make the minor the best piece, keep files shut, collect a pawn|R−1/minor+1 ledger, hole test for the minor, open files to own camp, SEE on enemy pawns|4 |
| down-piece|no trades, complicate, attack the king (queens on), trade their pawns|d≤−2.5, queens on + attackers on king zone, trade-removes-attacker exception|4 |
| down-queen|checks for perpetual, fortress, no loose pieces|Q−1, check with ≤2 king flights, linked pawns, 0-defender count|4 (fortress rests on 1 strong source) |
| up-material|trade pieces not pawns, simplify, meet counterplay first, never into opposite bishops / pawnless|d≥+1, even-trade available, own king-zone attackers first, OCB & no-pawn suppressors, stalemate guard|5 |
| king-exposed|trade their queen/attackers, defenders home + no more pawn pushes, counter in centre; mirror keep queens and attack|shield pawns gone, king-zone attack count, queen-trade SEE, centre break legal|6 |
| colour-conceded|pawns on the lost bishop's colour, knight to the hole, trade their bishop; mirror occupy|bishop-colour census, pawn reach to colour C holes, knight BFS ≤2, trade of their C-bishop|6 |
| weak-pawn|active pieces not chained, trade its attackers, push & dissolve, guard the stop square; mirror blockade + pile up|pawn classifier + target test, sole-defender guard map, SEE on the push square, knight BFS to the stop|5 (IQP trades: owner vs defender disagree — seat-split) |
| passer-against|blockade (knight), king in front, rook behind (side checks when king blocks)|passed-pawn test, rule of the square, knight/king reach to the stop square, rook route behind|3 corpus + 2 web |
| passer-mine|push it while safe, rook behind + king beside, decoy and strike elsewhere|passed-pawn test, SEE on the stop square, rook/king reach, blockader is sole guard elsewhere|4 |
| initiative-lost|stop the threat, prophylaxis, defend with an improving move, counterattack when their forcing moves end; mirror use the free move|≥2 forcing moves in their PV + eval drop no material, mustDefend, improving defence in top-3, student forcing move within 2|5 |
| cramped|trade pieces, freeing break at the chain base, no more passive moves; mirror keep pieces on|mobility ratio ≤0.7 + low-mobility pieces + space count, even trade of a stuck piece, break contacting the base|4 (trade-chasing caveat) |
| stranded-piece|improve the worst piece, knight back to the centre; mirror keep it out|mobility ≤2 / rim knight / isolated piece, no forcing priority, ≤3-move route to centre|4 |
| bad-bishop|pawns off its colour, trade it, get it outside the chain; mirror fix their pawns|≥3 own pawns on its colour + fixed + mobility ≤4, safe push off colour, challenge route, sole-defender guard|4 |
| worse-endgame|rook active / Philidor, trade pawns, king active + opposition, pawn colour rules, wrong rook pawn|endgame eval band, passive-rook guard, Philidor geometry, king distance/opposition, bishop-colour pawn counts|6 |
| better-drawish-endgame|keep pawns on both wings, second weakness, avoid OCB/pawnless, king first, no hurry, leave a square|drawish signature (OCB/one wing/few pawns), weakness count + far-wing break, OCB suppressor, stalemate test|5 (two-weaknesses principle: 1 strong + 1 forum source) |
| compensation-lost|keep forcing or cash in, never quiet; else down-material plan; mirror consolidate & give back|sound-sac ledger + eval ≤−100, engine top forcing?, regain SEE, quiet last move with drop|5 |
| open-file-conceded|oppose the rook, cover entry squares, open another file; mirror double + seventh|file census, entry squares unguarded, rook reach SEE, minor/king covering entries, break that opens a file|5 |
| back-rank-weak|luft when quiet, keep a back-rank guard, don't pull the last guard; mirror attack it|back-rank mate test, no pending threat + safe luft push, guard count =1, abandoned-guard PV|4 |
| outpost-conceded|trade it (knight / same-colour bishop), attack its support pawn, no new holes; mirror occupy|noPawnCanChallenge + pawn support, attacker reach + SEE, support-pawn attack, hole-before/after|4 |

## Cause → recovery state (MISTAKE-CAUSES.md sections A and B)
The state is read from the board the mistake leaves; a cause usually lands in a material state, so the ledger decides first, then the structural states add a second repair when they also hold.

| cause | recovery state(s) |
|---|---|
| allowed-mate / king-hunt | king-exposed (mate-facing); after the fact: down-* by ledger |
| missed-mate / missed-win (their slip unpunished) | up-material if the ledger still favours you; else initiative-lost |
| took-guarded, eyed-guarded, left-hanging, abandoned-defender, abandoned-fork-square, walks-into-fork, allowed-capture, answered-by-check | down-pawn / down-exchange / down-piece / down-queen by the ledger; abandoned-defender on the back rank → back-rank-weak |
| allowed-threat, ignored-threat | initiative-lost; then the ledger state once the threat lands |
| still-hanging (their slip) | up-material (convert) |
| gambit-offer | down-pawn (keep activity) or compensation-lost when it fades |
| positional (tags) | by tag: weak-pawn, bad-bishop, stranded-piece, cramped, open-file-conceded, outpost-conceded, king-exposed |
| tempo-wasted | initiative-lost (yours) / mirror (theirs) |
| colour-conceded | colour-conceded |
| traded-into-target | weak-pawn |
| passer-handed | passer-against (mirror passer-mine) |
| compensation-lost | compensation-lost → down-* |
| stalemate | up-material / better-drawish-endgame (leave a square) |
| technique-broken | worse-endgame (held side) / better-drawish-endgame (winning side) |
| unexplained | silent |

## Disagreements and thin sources
- **down-pawn**: piece trades a pawn down — middlegame "avoid trades" vs endgame "trade into rook ending / opposite bishops". Encoded by phase.
- **weak-pawn (IQP)**: owner avoids trades, defender seeks them. Encoded by seat.
- **cramped**: "trade pieces" (chessbio) vs Gserper's warning against trade-chasing. Encoded: trade only stuck pieces or their best attacker.
- **passer-against**: Tarrasch's rook-behind vs Averbakh (rook from the side when the king blocks) and Vancura. Encoded.
- **worse-endgame**: Capablanca's two pawn-colour rules point in different directions depending on whether you hold a bishop. Encoded by what you hold.
- **colour-conceded**: the fortress exception (weaker side puts pawns on its own bishop's colour in OCB) runs against the repair; it applies only to an opposite-bishop draw defence.
- **Thin**: down-queen's fortress plan (one strong source, Wikipedia Fortress; the swindle book is a listing only); better-drawish-endgame's "two weaknesses" (a chess.com forum + Wikipedia OCB, no book corpus passage); back-rank luft cost (general knowledge noted by the search tool, sources mention only "advancing a g/h pawn helps").
