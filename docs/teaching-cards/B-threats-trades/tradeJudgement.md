# tradeJudgement / readTrade — was the trade good for the side that made it

## A. Identity
- Files: `src/services/tradeQuality.ts` `readTrade(fenBefore, san, studentColor, cpLoss, priorMove, namesPlayedMove)` (189–403) — THE trade judge; helpers `kingGuardCount` (63–85), `kingAttackCount`, `recaptureDamage` (102–133), `recaptureOpensFile` (135–), `findPieceQuality` notes, `settledLeadFor`. `src/services/tradeJudgement.ts` `tradeJudgement(...)` (32–70) — Learn's door: adds the engine per-piece table read (their-best / gave-best) and hands every other verdict to `readTrade` (64–69).
- Registry: `readTrade` (boardComputers 2189–2199, kind `trade`, seat `student`, claim `trade:<sq>`, proof `tradeProofOf`); `tradeJudgement` (4988) — computerRoles `trade` → tag `bad-trade` (computerRoles.ts 102).
- Reach: learn door, review, lesson, chat, tactics (tapped no). Census: readTrade 32 (all said: learn 12, review 20), tradeJudgement 12 (11 said, lesson). Run: readTrade 17 fires (7 their trades, 10 the student's), tradeJudgement 9; none on a ≥ 100 cp move — trades are rarely the big mistake; the instructive case is the 50–99 band (g-1001055178 ply 17 Bxf6, cost 72: "gives up the bishop pair").

## B. Facts
- **B1** `TradeRead` (102–117 in tradeQuality): `call` good | bad | ahead | behind | mixed, `text`, `squares`, `key` (`trade:<call>:<reason key>`), `moverIsStudent`, `headsMove`. Reason keys: best-taken, bad-swapped, attacker-removed, guard-removed (good); best-given, guard-given, pair-given, pair-handed, opens-file, bad-taken (bad); doubles, isolates, cover (structural good). `TradeJudgement` (17–21): `reason` (+ their-best, gave-best), `text`, `squares`.
- **B2 dropped:** only `good[0]` / `bad[0]` is said (297–305) — the other reasons are dropped; the `qualityPhrase(got/given)` note (why the piece was good/bad: outpost, open file, bad bishop) is folded into words; `edge0` (the settled material lead, 285) is used for ahead/behind but not returned; the per-piece `delta` from the engine table (tradeJudgement 50–61) is not returned; WHICH COLOUR the given-up bishop was (pair-given knows `mv.from`) — the colour-complex consequence (the approved voice: "hands them the dark squares") is never computed.
- **B3 cheap:** bishop colour of `mv.from` (square parity) and the student pawns / holes on that colour (the pilot X-row "colour complex"); the opponent's remaining same-colour bishop (`bishopCount` per colour); the next target on that colour ("d4 is the first target" — a pawn of the student's on that colour attacked by their remaining bishop's diagonal).
- **B4 gates:** a non-pawn, non-king capture of an equal-value piece (209–210); a real exchange (the other side can retake without losing, 214–218); `cpLoss` known (222); "good" only under `INACCURACY_CP` (50, engineConstants 122), "bad" only at ≥ 30 cp (296); mixed is silent unless one good + one weighed bad (308–313); ahead ≥ 2 pawns & sound / behind ≤ −2 & costly (316–332). tradeJudgement: the reply took back on the same square, like for like (40–43).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `why` ("it gives up the bishop pair") | the general lesson + the board example ("hands them the dark squares, and d4 is the first target") |
| CONSEQUENCE | partly | reason only | the colour-complex target (B3), what the opened file does |
| BETTER MOVE + JOB | no | — | the move that kept the piece and its job ("Bc1 kept it, guarding d4 from b2") |
| HABIT | no | — | "Before you trade a bishop, ask which colour you're giving away." |

## D. Lesson recipes
Cause **TJ-BAD** (S): `readTrade` call bad (or gave-best / behind) on the student's move with cost ≥ the trade floor; **TJ-O** (O): call bad / ahead-for-them on their move.

| id | angle | seat | condition (key) | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TJ1 | consequence (colour complex) | S | pair-given / pair-handed, a student pawn or hole on the bishop's colour hit by their same-colour bishop | colour, target | "Trading off your {colour}-squared bishop hands them the {colour} squares, and {target} is the first target." / "Give up a bishop and you give up its colour: their bishop on {sq} has the {colour} squares to itself now." | "{target} can't be guarded by a pawn or a bishop." | "{best} kept it, guarding {target}." | "Before you trade a bishop, ask which colour you're giving away." | full; "your trade" never by name | no same-colour bishop of theirs left / no target on that colour (then TJ2) | C (B3) |
| TJ2 | strategize (bishop pair) | S | pair-given, no colour target | — | "Two bishops together cover every square; trading one for a knight in an open position gives that away." | "Their knight is worth less on an open board — your bishop was worth more." | "{best} kept the pair." | same | full | position closed (no open file in the centre) — then the knight can be worth it | C (open centre) |
| TJ3 | knowledge (best vs worst piece) | S | best-given / gave-best | piece, its quality | "Keep the pieces that are working and trade the ones that aren't: your {piece} on {sq} was {quality}." / "Don't trade your best piece for one of their worse ones." | "Their worse piece stays, your best is gone." | "{best} kept it." | "Before a trade, ask whose piece is better." | full | — | H (quality note) |
| TJ4 | prevent (king defender) | S | guard-given | — | "A piece that guards your king is worth more than its points: trading it opens the squares around your king." | "{squares} lose their guard." | "{best} kept the defender." | "Count your king's defenders before you trade one." | full | queen off / no pressure (already gated) | H |
| TJ5 | consequence (file opens) | S | opens-file | file | "When you trade on a square and they take back with a pawn, check the file it opens: here it's the {file}-file for their rook." | "Their rook gets the {file}-file." | "{best}." | "Look at what the recapture opens, not just what you take." | full | no rook of theirs can reach | H |
| TJ6 | strategize (material) | S | behind | lead | "When you're behind on material, keep pieces on — every trade brings their winning ending closer." | — | "{best} kept the tension." | "Ahead, trade; behind, don't." | full | — | H |
| TJ7 | consequence (trade a bad piece away) | O | their trade took off the student's best piece (best-taken for them) and the student's move allowed it (cost ≥ floor) | — | "Your {piece} on {sq} was your best piece, and the move let them trade it off." | | "{best} kept it out of reach." | | full | — | H (seat swap) |
| TJ8 | opponent seat (their bad trade) | O | TJ-O call bad | — | "Their trade gave up {why}: that's the piece you wanted gone." | | | | after the student's reply | — | H |
| TJ9 | exception (good structure, still behind) | S | the 'behind-structure' call (285–295) | — | "A trade that dents their pawns still helps them when you're behind on material." | | | | full | — | H |
| TJ10 | record | S | `bad-trade` hold state | — | RED/GREY full · AMBER one clause ("That gave up the bishop pair.") · GREEN silent | | | | | | H |

Not applicable: calculate a line (the trade's ledger is `settledExchange`'s card); phase-specific endgame rule is TJ6 / `readConversion`.

## E. Mistake link
- Student: `positionalReason` has no trade tag; the cause is `readTrade` call bad (tag `bad-trade`, computerRoles 102) — needs a `MistakeCause` member `bad-trade:<reason key>` (one per key). When the trade loses material outright, it is `costReason` / `settledExchange`, not this card.
- Opponent: TJ8.

## F. Build changes
1. `TradeRead`: return `reasons: {good: Reason[]; bad: Reason[]}` (B2: every reason, not `[0]`), `quality: {given, got}` notes, `edge` (the settled lead), `bishopColour: 'light' | 'dark' | null` (B3).
2. Add the colour-complex consequence (TJ1): `colourTargets(fenAfter, colour, student)` — the student's pawns/holes on that colour hit by their same-colour bishop (chess.js `attackers` along the diagonals); first target = the one nearest their bishop's diagonal. Miss board: g chesscom-1001055178 ply 17 Bxf6 (cost 72, "gives up the bishop pair").
3. `tradeJudgement` (32): return `delta` (their-best / gave-best numbers) and stop owning prose; recipes TJ1–TJ9 go into `mistakeLesson` keyed `bad-trade:<key>`.
4. Floor: "bad" needs ≥ 30 cp (296) — keep for Review; Learn uses the Learn mistake floor (H).
5. Split the record tag: `bad-trade` → `bad-trade:<key>` so a habit is chosen per reason (bishop colour vs king defender vs file).

## G. Proof boards (run)
- TJ1/TJ2: g chesscom-1001055178 ply 17 Bxf6 (student White, cost 72) `r2qk2r/ppp1bpp1/2n1pn1p/3p2B1/3P4/1P3PP1/P1P2PBP/RN1Q1RK1 w kq - 0 9` → `{call bad, "it gives up the bishop pair", squares g5}` (a dark-squared bishop; their dark bishop recaptures on f6 — the TJ1 target search runs from there).
- Good trades (guard: silent in Learn): g chesscom-1018307238 ply 22 …Qxe3+ (cost 0, isolates e3), ply 40 …Nxd5 (cost 6, attacker removed).
- TJ8: g chesscom-1001055178 ply 64 …Rxd7 (their good trade: "takes off your best piece, the rook on the seventh rank") — the student's prior move allowed it (TJ7 candidate).
- Census: lines-0.jsonl:177 "Bxg6 is a poor trade — it gives up the bishop pair."

## H. Open questions
- Learn's trade floor: the bishop-pair trade that costs 72 cp (below the 100 cp "mistake") is exactly the approved-voice lesson. Does Learn speak a trade lesson at the inaccuracy level (≥ 50), or only at ≥ 100?
