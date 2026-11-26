# CARD — `moveStops` (what a move takes away)

## A. Identity
`src/services/moveStops.ts:96` `moveStops(fenBefore, san, mine)` → `MoveStop[]`; also `stopsBreak :198` (own card). Reads `theirWantedMoves` (`prophylaxis.ts:189`), `mateThreatsAgainst`, `winningChecks :41`, `KNIGHT_SQUARES`. Callers: `boardComputers.ts:2537, 2562`. Kinds `stop`, `two-jobs` (census 292 offered / 187 said; lesson 228, review 64).

## B. Facts
- **B1** `MoveStop {kind: 'pin'|'kick'|'fork'|'check'|'square'|'break'|'mate', san, would, clause, squares}` (`:17`).
- **B2 dropped:** the stopped move's `hit[]` with piece types (in `TheirWant.hit`, `prophylaxis.ts:181`) survives only as prose in `would`; the "now met by a pawn" variant's `taker` square (`:118`) is prose; the mate's `flight` square (`:152`) prose; `TheirWant.motif` (`prophylaxis.ts:184`) dropped.
- **B3 cheap — THE REVERSE, `moveLetsIn`** (name chosen because `boardComputers.ts:6168` already has a registry entry `moveAllows` = the `costReason`→`allowedClause` reader; this is the geometric one): the same reader run the other way — `theirWantedMoves(fenAfter)` minus `theirWantedMoves(fenBefore)` (and `winningChecks`, `mateThreatsAgainst` after vs before). This is what a MISTAKE did: it let in a pin / kick / fork / winning check / mate. On David's 109 costly moves, 13 let in a new one (e.g. …Bh5 let in Ne6 forking queen d8 and rook f8 — the game's actual punishment). Also: run `moveStops` on the BETTER move minus the played move (9 of 109: the better move stopped a kick/pin the played one did not).
- **B4 gates:** threatened piece walked away = rescue, not stop (`:122`); square kind only for a pawn move that stays (`:174`); winning check must win material (`winningChecks`); a check of the mover's stops no mate (`:146`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | kind | no lesson keyed on kind |
| CONSEQUENCE | yes | `would` ("would pin your knight on f3 against your queen") | — |
| BETTER MOVE + JOB | yes, when run on the better move | `clause` | must be run on bestSan (F2) |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MS1 | prevent / knowledge (pin) | S mistake | `moveLetsIn` kind pin | pinner, victim, behind | "A knight in front of your queen is a pin waiting to happen. Take the square the bishop needs first." / "Pins are stopped before they land: one pawn move takes the square away." | "…Bg5 pins the knight to the queen." | "h3 would have taken g4 first." | "Before your move, ask which of their pieces wants to pin." | same, no move named | the allowed pin must be on their engine line or win material (errorWhy cause) | C (B3) |
| MS2 | prevent (fork) | S mistake | `moveLetsIn` fork | forker, targets | "Two pieces a knight's jump apart are a fork waiting to happen." | "Ne6 forks the queen and the rook." | better stops/covers e6 | "After your move, check every square their knight can reach." | same | fork wins material | C |
| MS3 | tempo (kick) | S mistake | `moveLetsIn` kick, cost ≥ mistake | kicker, victim | "A piece where a pawn can kick it costs you a move back. Put pieces where pawns can't reach." | "b4 kicks the knight on a5 and wins the time." | | "Ask whether a pawn can kick the piece where it lands." | same | kick must gain tempo AND the cost be the mistake's (errorWhy allowed-threat) | C |
| MS4 | prevent (check) | S | `moveLetsIn` check | checker, hit | "A check that also hits a piece wins it. Before you move, look at every check they have." | "…Qd4+ checks and takes the bishop." | | "Look at every check they have." | same | winningChecks rule | C |
| MS5 | prevent (mate) | S | `moveLetsIn` mate | mate square | "A back-rank king with no air dies to one check." | | "h3 gave the king a square." | "Give your king a square before it needs one." | same | — | C |
| MS6 | knowledge (square) | O/S | kind square on better move | knight, square | "A pawn on e5 takes f6 from the knight for good: pawns take squares, pieces only visit them." | | "e5 kept their knight off f6." | — | Review only (good move) | | H |
| MS7 | both seats | O mistake | their move allowed the student's pin/fork | | **pointer** — see H1 | | | | held | never name the student's shot before they play it | C |
| MS8 | exception | — | the stopped move still works by a line (`stillWorks` one-ply) | | guard only | | | | | the engine line plays it successfully → silent | C |

Doesn't apply: phase (geometry is phase-free); evaluate.

## E. Mistake link
`allowed-tactic` (pin/fork/skewer), `allowed-threat` (kick, winning check), `allowed-mate` (MS5), via `moveLetsIn`; BETTER MOVE job for every errorWhy cause whose better move stops something.

## F. Build changes
1. `moveStops.ts` — add `export function moveLetsIn(fenBefore, san, mine): MoveStop[]` (B3, same readers reversed), typed `hit: {square, piece}[]`, `motif`.
2. `MoveStop` (`:17`) — add `hit` and `motif` fields (from `TheirWant`), drop reliance on `would` prose for recipes.
3. `inaccuracyCall.ts` errorWhy — when cause is `allowed-threat`/`allowed-tactic`, attach `moveLetsIn` match (same square) as `cause.allowedBy` so MS1–MS5 pick the lesson; when the better move's `moveStops` has a stop the played move lacks, that is `better.job = 'stops'`.
4. Learn: delete stand-alone "Your h3 stops …Qe5" good-move lines.

## G. Proof boards (pure run on David's 109 costly moves, chess.js only)
- MS2 (allows fork): chesscom-1012441262 ply 20 …Bh5 (cost 393) `r2qkr2/ppp1p1bp/2np1np1/6N1/3PP1b1/2P3QP/PP3PP1/RNB1K2R b KQ - 0 10` → `moveLetsIn` = fork:Ne6 > q d8, r f8.
- MS1 (allows pin): chesscom-1018307238 ply 14 …Nxd4? (S, cost 228) `r1bqk2r/pppp2pp/2n2n2/2b2p2/2PP4/2N3P1/PP3PBP/R1BQK1NR b KQkq - 0 7` → pin:Bg5 > n f6, q d8.
- MS3 (allows kick): chesscom-1012441262 ply 36 …Rxf8 `r4Bk1/ppp4p/3p2p1/nq1Pp2n/4P3/2P1Q2P/PP1N1PP1/R3K2R b KQ - 0 18` → kick:b4 > n a5.
- Better-move stop: chesscom-1012441262 ply 15 c3 (S) `r1bqk2r/ppp1p1bp/2np1np1/6N1/3PP3/5Q2/PPP2PPP/RNB1K2R w KQ - 4 8` → best d5 stops kick …h6.
- Census (good move, Review only now): "Your h3 stops …Qe5, which would pin your knight on e2 against your king." `boards-1.jsonl:2319`.
- Guard: a reply that is allowed but costs nothing (not an errorWhy mistake) → silent.

## H. Open questions
1. MS7: their mistake let the student in — saying it points at the student's next move. After the student plays (or misses) it only?
2. Should `moveLetsIn` speak on an inaccuracy (< 100cp) when the allowed pin is real but not yet costly?
