# CARD — `errorWhy` (the one error computer)

The key card of WO-LEARN-MISTAKES-ONLY. Every Learn mistake turn (both seats) keys on the cause this computer finds. Today it finds the cause and returns only finished sentences; this card defines the cause it must export (`MistakeCause`) and the lesson for every cause.

## A. Identity

- **Computer:** `errorWhy` — `src/services/inaccuracyCall.ts:1224-1590`. Return type `ErrorWhy` at `:1093-1140` (`interface`, **not exported**).
- **Readers it composes:** `costReason` (`src/services/costReason.ts:246`, allowed/missed + `motif`), `whyItFailed` (`src/services/whyItFailed.ts:177`, 6 declared kinds), `punishmentOf` (`inaccuracyCall.ts:1926`), `replyPunishment` (single reply), `allowedReply` (`:1027`), `kingHunt` (`:978`), the far loss (`:1453-1460`), `positionalReason` (`src/services/positionalReason.ts:231`), `mateLine`, `betterMoveFact`/`phraseBetterMove` (`:170/:190`), `betterMovesTheTarget` (`:1830`), `betterMoveWins` (`:274`), `betterGuardsTheLine` (`:1872`), `boardHalfReason` (`:290`), `betterStopsMate` (`:1899`), `causedByTheMove` (`:1638`), `landedTacticFor`.
- **Wrappers / renderers:** `errorGradeSentence` (`:1674`), `errorWhySentence` (`:1708`), `errorWhyFor` (`:1717`, no better move), `errorCallFor` (`:1751`, chat), `callInaccuracyDetailed` (`:640`, Learn's `backwardLook.ts:216`; `errorWhyFor` at `backwardLook.ts:445`), `pastBetterNameable` (`:1610`, the Learn naming gate).
- **Callers:** `mistakeNarration.ts:459`, `turningPoints.ts:345`, `reviewFullData.ts:537`, `groundedAnswer.ts:3163`, `slipCause.ts:130` (the record), plus `errorWhyFor`/`errorCallFor` in `backwardLook`, `discussionPractice`, `coachApi`, `coachFeatureService`, `groundedAnswer`, `playedMoveGrade`, `puzzleTeaching`.
- **CoachFactKind:** `quality` (census: 196 lines, all Review, all said). Surfaces (computer-reach.json `:251`): review, lesson, chat, tapped, tactics.

## B. Facts

### B1. Handed over today (`ErrorWhy`, `:1093`)
| field | type | meaning |
|---|---|---|
| consequence | string\|null | "it let them …" — the allowed punishment, mate, single reply, allowed reply, hunt or far loss, as one clause |
| tail | string | " The line: …" (punishment played out, only on the naming rule) |
| failed | string\|null | `whyItFailed` sentence ("That left your knight on e5 hanging …") |
| failedSquares | string[] | the mechanism's squares |
| positional | string\|null | `positionalReason(...).note` — **only when no better move is said** (`:1559-1563`) |
| better / bestSan / reason | string\|null | "X was the move — it would …" (only when `namesBetterMove`) |
| proof, line, allowedLines, costTail, costLine | | the board's half |
| lostSquare, namesBetter, pattern, punishFirst, guardLeft | | dedupe hooks for other lanes |

### B2. Computed internally and DROPPED (the cause, thrown away)
| dropped value | where | what it is |
|---|---|---|
| `failedRead.kind` | `:1342-1349` (`failedRaw` → `failedRead`) | `'held-by-defender' \| 'answered-by-tactic' \| 'lost-the-piece' \| 'abandoned-defender' \| 'abandoned-square' \| 'walks-into-fork'` — only `guardLeft` leaks it (`:1587`) |
| held-by-defender sub-shape | `whyItFailed.ts:268` vs `:463` | **took a guarded piece** (`mv.captured`) vs **eyed a guarded piece** (illusory threat) — two different lessons, one kind |
| `failedRead.lost`, recapturer square/type | `whyItFailed.ts:265-288` | the piece that takes back, the ledger words ("a knight for a pawn") |
| `allowedRead` (`CostReason`) | `:1281` | `kind`, **`motif: TacticType`**, `netForWinner`, `blowPlies`, `ledger`, `trust.name`, `mate` |
| `missedRead` (`CostReason`) | `:1282` | the WIN the better move had (motif, net, blow). Used only as a guard (`:1348`, `:1556`) and for `betterMoveWins`; **never becomes the cause**. On David's 87 live costly moves, 12 (14%) had a missed reason and no consequence at all |
| which branch fired | `:1455-1461` (`consequence` ternary) | punishment / missedMate / single / allowed / hunt / farLoss — collapsed into one prose string |
| `punishment.why` structure | `punishmentOf :1926` | what is won and by which capture; only prose |
| `allowed`'s reply action | `allowedReply :1027` → `moveWhy` | the clause kind (attacks / checks / pins / x-ray / forks / threatens / traps) — only prose matched by `ALLOWED_DOES_SOMETHING` (`:973`) |
| `hunt.checks` | `kingHunt :978` | the checking moves, joined to prose |
| `farLoss` r.blowPlies, r.motif | `:1413-1420` | how far on, what kind |
| `positionalReason(...).tag` | `:1563` (`.note` kept, `.tag` dropped) | the `MisconceptionTagId` (13 board kinds + 5 concession kinds via `CONCESSION_TAG`) |
| positional when better is named | `:1559` `!should` | on 26 of 87 live costly moves (30%) the better move was named and the positional tag (misplaced-piece, no-plan, mistimed-pawn-break, passive-rook, weakened-king-safety …) was never read |
| `caused` | `:1332` | the threat was already on the board (the move did not cause it) |
| `stopsMate`, `bestMate` | `:1287-1296` | the better move's job was to stop/deliver mate |
| `fact.kind` | `betterMoveFact :170` | `checks-first` etc. — the better move's job kind |
| `pattern` | `landedTacticFor` | kept only when `should` |

### B3. Cheaply computable from what it already has
- **walks-into-fork (declared, never emitted).** `whyItFailed.ts:62` declares it; no branch returns it (grep: only `:62`). Compute: after the played move, their first reply (`replyLineUci[0]`) → `detectLatentFork`/direct fork check on the board after the reply (chess.js attackers of the reply's landing square hitting ≥2 pieces worth ≥ the forker, not guarded enough). Already 1 `allowedRead.motif === 'fork'`-shaped path exists via `costReason.motif`.
- **The seat-flipped "missed" cause** from `missedRead` — fields already in hand.
- **Phase** (`phaseOfFen`) and **record state** (hold rate for the tag/motif) — one read each.
- **The recapturer piece** for held-by-defender — already in `whyItFailed` (`recap.type`).
- **What the reply attacks** for `allowed-reply`: chess.js attackers from the reply's `to` square (pieces newly hit), so the clause is a field, not prose.
- **Was the punished piece hanging before the move** — `causedByTheMove` already answers; expose it.

### B4. Gates and thresholds
| gate | file:line | value |
|---|---|---|
| reason read only for mistake+ | `:1268` | `quality === 'inaccuracy'` → no costReason |
| cost when no score | `:1265` | blunder 300 / mistake 100 / else 0 |
| `costReason` floor | `costReason.ts:272` | `costCp >= 100` |
| `reasonNeed` | `costReason.ts:76` | must win ≥ max(1, round(0.6·cost/100)) pawns |
| punishment needs 4 plies | `punishmentOf :1928` | `replyLineUci.length < 4` → null |
| single reply | `:1383` | line length 1–3 |
| hunt | `kingHunt :981,1002` | line ≥3, ≥2 checks in first 12 plies |
| hunt over small win | `:1372-1375` | win × 2 < cost |
| far loss | `:1413-1420` | named only on `trust.name` |
| held-by-defender illusory | `whyItFailed.ts:438` | `swap < 0 && swap >= -2` and real guards |
| lost-the-piece | `whyItFailed.ts:279` | loses ≥ piece value − 1 |
| positional | `:1559-1561` | mistake/blunder only, no consequence/failed/should, no allowed/missed reason |
| better move named | `:1292-1299` | `namesBetterMove` (Learn: `pastBetterNameable :1610`) |
| allowed mate | `:1297-1298` | any reason other than "stop the mate" is held |

## C. Sentence readiness

| slot | today | field | missing |
|---|---|---|---|
| LESSON | **no** | — | It says the board ("it let them play Ne5, which attacks the bishop on g4"), never the general lesson. The cause (kind + motif + tag) that would pick the lesson is dropped (B2). |
| CONSEQUENCE | **yes** | `consequence`, `failed`, `tail`, `positional` | the 30% "better named, no why" and 14% "missed win" have none; positional notes name the played move ("after …Bg7") on 31 of 87 live moves — illegal in Learn |
| BETTER MOVE + JOB | **partly** | `better`/`reason` | job is good when it is a concrete win/guard; weak on the `bestJobReason` fallback ("The rook belonged on g8", "a6 was the move the position asked for") and route reasons |
| HABIT | **no** | — | nothing; habit lines live in `renderFundamentalVerdict`/`correctionHabit` and are not keyed on the cause |

## D. The cause and its lessons

### D0. `MistakeCause` — exhaustive (the type the build exports)

```ts
export type MistakeCauseKind =
  | 'allowed-mate'        // allowedMate !== null
  | 'missed-mate'         // missedMate !== null (better move mates)
  | 'took-guarded'        // whyItFailed held-by-defender WITH mv.captured
  | 'eyed-guarded'        // whyItFailed held-by-defender, no capture (illusory threat)
  | 'answered-by-check'   // whyItFailed answered-by-tactic
  | 'left-hanging'        // whyItFailed lost-the-piece
  | 'abandoned-defender'  // whyItFailed abandoned-defender
  | 'abandoned-fork-square' // whyItFailed abandoned-square
  | 'walks-into-fork'     // whyItFailed walks-into-fork (to be emitted, B3)
  | 'allowed-tactic'      // punishment / single / farLoss with allowedRead.motif (fork, pin, skewer, discovered_attack, …)
  | 'allowed-capture'     // punishment/single with no motif: they just take something
  | 'allowed-threat'      // allowedReply: a reply that attacks/checks/pins but wins nothing yet
  | 'king-hunt'           // kingHunt
  | 'missed-win'          // missedRead non-null, nothing allowed (the better move's motif)
  | 'positional'          // positionalReason tag (with concession DrawbackKind when from findStudentDrawback)
  | 'still-hanging'      // their slip: missedCaptureStillOn (E21, O seat only)
  | 'gambit-offer'       // inaccuracy: gambitFile (E22)
  | 'unexplained';        // cost only
export interface MistakeCause {
  kind: MistakeCauseKind;
  seat: 'you' | 'them';
  motif: TacticType | null;               // allowedRead/missedRead.motif
  tag: Exclude<MisconceptionTagId,'other'> | null; // positional / record tag
  concession: DrawbackKind | null;
  target: { square: string; piece: PieceType } | null; // the lost / attacked piece
  refuter: { square: string; piece: PieceType } | null; // the recapturer / forker / checker
  net: number | null; blowPlies: number | null; mateIn: number | null;
  causedByMove: boolean;
  phase: Phase;
  better: { san: string; job: BetterJobKind | null } | null; // only when the surface may name it
}
```
Exhaustiveness: `Record<MistakeCauseKind, LessonRecipe>` in `mistakeLesson.ts`; `allowed-tactic`/`missed-win` recipes are a `Record<TacticType, …>` inside the row; `positional` a `Record<PositionalTag, …>`.

On David's 87 live costly moves (|eval| < 5 before, saved reads, run 2026-11-23): allowed-tactic/capture 15 · allowed-threat 21 · took/eyed-guarded 4 · left-hanging 2 · answered-by-check 2 · king-hunt 4 · missed-win 12 · positional (said) 2 · **better-named, tag dropped 26** · mate cases not in this run (reads with mate skipped).

### D1. Lesson recipes (both seats; Learn speaks after the move; S = the student's own mistake, O = theirs)

Voice key: LESSON is general with the board's example inside; Learn never names the student's move just played ("this move", "it") nor their next move; BETTER MOVE only when `pastBetterNameable`; HABIT only on RED/GREY of the cause's tag.

| id | angle | seat | condition (fields) | slots | LESSON stems (rotated) | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | consequence (mate) | S | `allowed-mate`, mateIn | refuter, mateIn | "A king with no escape square dies to one check. Before you move, look at every check they have." / "Mate threats outrank everything: a loose king loses faster than any piece." | "Their first check, …Qh4+, starts it." (≤3 plies played out, `mateLine`) | "X stopped it, covering h4." (`betterStopsMate`) | "Every move, ask what checks they have." | "That walks into a forced mate. Check every check they have before you let go." | never with a reason other than the mate (`:1297`) | H |
| E1o | consequence | O | `allowed-mate`, seat them | | "When their king has no room, the checks come first: look for the one that leaves no square." | "You have mate, starting with …" | (their better move: Review only) | — | "They've let you in: there's a forced mate." (Learn names the student's mating move only after it is past — held) | never name the student's next move | H |
| E2 | calculate | S | `missed-mate` | mateIn | "A forced mate beats any material: when their king is short of squares, look at checks first." | "It slipped away." | "X started it: …" (`mateLine`) | "Checks first, every move." | "There was a forced mate here." (move held while still playable) | `pastBetterNameable` false → hold the move | H |
| E3 | identify / knowledge | S | `took-guarded`, target, refuter | target.piece, refuter | "A piece is only free if nothing can take back." / "Before you capture, count who takes back: the pawn on f7 had the king behind it." | "You come out a bishop for a pawn." (ledger) | "O-O kept the bishop and castled." | "Before every capture, ask: what takes back?" | same, no move named ("That capture …") | ledger net < 0 only | H (B2 sub-shape) |
| E3o | both seats | O | `took-guarded` theirs | | "They grabbed a guarded pawn: when your opponent captures, check what you can take back with." | "You win a knight for a pawn." | — | — | "Their capture was guarded: it gives you material." (the recapture is the student's next move → never named) | never name the recapture | H |
| E4 | recognize (illusory threat) | S | `eyed-guarded` | target, guard | "A threat on a guarded piece isn't a threat. Count the guards before you aim at something." | "The knight on f3 holds d4, so taking there gives up your bishop." | better job | "Count attackers and defenders before you attack." | same | swap ∈ [−2,0), real guards | H |
| E5 | calculate (tempo) | S | `answered-by-check` | refuter | "A free piece is only free if they have no check first. A check that hits your attacker wins back the time." | "…Qg5+ checks and hits the knight on e4 at once." | | "Before a grab, look at their checks." | same | the reply really checks and hits mv.to | H |
| E6 | recognize | S | `left-hanging` | piece, taker | "A piece on a square nothing guards can just be taken. Ask where your piece will stand and who covers it." | "The queen on f4 takes the rook." | "Be5 kept the rook out of reach and hit the queen." | "Before you let go, ask: is the piece guarded where it lands?" | same, no move named | loses ≥ value−1 (`whyItFailed.ts:279`) | H |
| E6o | both seats | O | `left-hanging` theirs | | "They left a piece where nothing guards it. Every move, check: is something of theirs loose?" | "Their rook on h2 can be taken." | — | habit (focus clue wording) | "Their move leaves a piece loose." (square held — the student's find) | never the square before the student moves | H |
| E7 | knowledge (guards) | S | `abandoned-defender` | moved piece, guarded piece, attacker | "A piece that guards something has a job. Move it and the thing it guarded falls." / "Before a piece moves, ask what it is guarding." | "Their queen could take the knight on c3 once the bishop left." | better job | "Before a piece moves, ask what it guards." (approved habit) | same | new swap-off (`whyItFailed.ts:313`) | H |
| E8 | geometry (fork square) | S | `abandoned-fork-square` | guardLeft square, forker, targets | "A square can need a guard too: a knight that reaches it forks two pieces." | "…Ne5 puts their knight two moves from e3, where it forks the queen and rook." | "Bd2 kept e3 covered." | "Look at the squares your pieces guard, not just the pieces." | same | fork new vs `home` board (`:357`) | H |
| E9 | geometry | S | `walks-into-fork` | forker, targets | "Two pieces a knight's jump apart are a fork waiting to happen." / "Pieces on the same line can be skewered; pieces a knight's move apart can be forked." | "…Nd4 hits the queen and the rook; you can save only one." | | "After your move, check every square their knight can reach." | same | fork must win material over the line | **C** (B3) |
| E10 | knowledge per motif | S | `allowed-tactic`, motif | motif → name, target | per `Record<TacticType,…>` — pin: "A piece in front of a bigger one can't move. Don't line up your king or queen behind a piece they can attack." · skewer: "Two pieces on one line are a skewer target: the front one moves, the back one falls." · fork: (E9) · discovered_attack: "When one of their pieces moves off a line, the piece behind it hits too. Watch what stands behind their pieces." · back_rank: "A king with no escape square on the back rank dies to one rook check. Give it a square." · overloaded_piece: "A piece with two jobs can only do one." · removing_the_guard / deflection: "Take away the guard, and what it guarded falls." · trapped_piece: "A piece with no retreat is lost the moment it's attacked." · interference: "A piece dropped in between two of yours cuts their connection." · zwischenzug: "Before you recapture, look for their in-between move." · promotion: "A passed pawn two squares from queening is worth a piece." · x_ray / tactical_sequence: generic E11 | "They win a rook for a piece." (ledger) | better job | per motif habit | same | motif must be from the one classifier (`costReason.motif`) | H (motif dropped today) |
| E11 | consequence | S | `allowed-capture` | target | "When you move, ask what it leaves open: they take on c5 two moves later." (far) / "Something was left loose: they just take it." | "They win a pawn." + line shape | "Qh5 kept c5 guarded." | "Before you let go, scan their captures." | same | net ≥ reasonNeed | H |
| E12 | identify (their reply) | S | `allowed-threat` | reply action, target | "A move that lets them hit something with tempo hands them the initiative." / "Leaving a bishop where a knight can hit it costs you the move back." | "…Qd7 hits the knight on e6, and it has to move." | | "Ask what their best reply attacks." | same | reply must DO something (`ALLOWED_DOES_SOMETHING`) | H (action dropped) |
| E13 | king safety | S | `king-hunt` | checks | "A king without pawn cover can be chased across the board. Keep the pawns in front of it." | "…Bxc3+ and …Qe7+ come with check." | "Nge2 guarded d4 and kept the king covered." | "Count their checks before you open your king." | same | ≥2 checks | H |
| E14 | calculate (missed) | S | `missed-win`, motif | motif, net | "When their piece is loose, look for the capture first." (hanging) / "A check that wins time comes first: checks, then the capture." (zwischenzug) / per-motif "your" side of `Record<TacticType>` (e.g. pin: "When their piece is pinned to the king, pile on it.") | "It was there to win a bishop." | "Nf4 won the bishop within two moves." (only past) | "Every move, look at checks, captures and threats first." | "There was a win here." (move held while playable) | `missedRead.trust.name` for any line named | H (dropped today) |
| E15 | positional (per tag) | S/O | `positional`, tag | tag | `Record<PositionalTag>`: misplaced-piece: "A piece is only as good as the squares it reaches: your knight on g8 has far fewer than it needed." · neglected-development: "A piece still at home can't fight." · king-stuck-center / weakened-king-safety: "Every pawn move in front of your king is a hole you can't take back." · space-conceded: "Giving up the centre gives their pieces room." · passive-rook: "Rooks belong on open files." · passive-king-endgame: "In the endgame the king is a fighting piece: bring it to the centre." · passed-pawn-neglected: "Passed pawns must be pushed." · mistimed-pawn-break: "A pawn break works only when it's timed: now, before they cover the square." · no-plan: (no lesson — see H) · tempo-handed: "A move that frees their worst piece helps them more than you." · concession kinds (defender-left / file-opened / piece-offside / pawn-weakened / outpost-conceded) from `findStudentDrawback` | the note without the move's name ("Your king on h1 has less cover than it needed.") | better job | per-tag habit | same, **never "after Bg7"**; a misplaced piece that is the piece just moved is named without its square | tag present; for `no-plan` and `bestJobReason` fallback ("The rook belonged on g8") → silent | H (tag dropped; note names move) |
| E16 | counterfactual | S | any, `causedByMove=false` | | — (no lesson: the threat was already there) → treat as the **previous** mistake | | | | silent | `causedByTheMove` false | H |
| E17 | phase: endgame | S | any cause in endgame | phase | endgame lesson replaces middlegame stem (e.g. E6 → "In the endgame every pawn counts: a loose one is a lost one.") | | | | | phase endgame | C (phaseOfFen) |
| E18 | strategize (decided) | S/O | `|eval before| ≥ 500` | | silent (decided game) | | | | silent | — | H (the eval) |
| E19 | record | S | tag's hold state | | RED/GREY full lesson + habit · AMBER lesson only, one clause · GREEN silent (the miss counts) | | | | | | H (holdRate) |
| E20 | unexplained | S/O | `unexplained` | — | none → silent + logged (`mistake-lesson` row `why:'no-cause'`) | | | | silent | — | H |
| E21 | prevent (threat still on) | O | their slip, `missedCaptureStillOn` (`inaccuracyCall.ts:2080`, used `:848`) returns {piece, square} | piece, square | "A threat they don't take is still a threat: your queen on a5 can still be taken." / "Their miss doesn't fix your problem: the piece is still loose." | — | — (their better move: "Bxa5 won it", Review) | "Every move, check which of your pieces are still attacked." | "They let your queen go, but it's still loose." (piece named — it is the student's own piece, not a move; owner call H6) | read off the engine line, never "is attacked" (`:2085`) | H (today prose only, `letGo`) |
| E22 | strategize (gambit) | S | inaccuracy only, `gambitFile` (`:2126`, used `:903`) returns a file | file | "A pawn offered to open a file at their king is a practical try, not a free one: you get the c-file, not the pawn back." | "If they take, the f-file opens toward their king." | "The engine prefers X" (Review only) | — | same, no move named ("Your pawn offer …") | not on a blunder (`:903`); inaccuracy speaks only if H4 says yes | H (today prose, branch `:904-909`) |

Doesn't apply: **own plan / their plan** (errorWhy reads one move, not plans — the plan computers own it); **evaluate** (the eval is the input, never the lesson).

## E. Mistake link
This IS the mistake computer: every row of §D is a mistake cause, both seats. Each other card in this family attaches its lessons to these kinds (e.g. `moveJob` guard-job → E7, `findProphylaxis` → E12/E10 pin, `breakStopped` → E15 mistimed-pawn-break, `pieceMovedAgain` → E15 neglected-development / tempo-handed).

## F. Build changes
1. `inaccuracyCall.ts:1093` — `export interface ErrorWhy` and add `cause: MistakeCause` (D0). Fill it in the return (`:1570-1588`) from the branch that fired (`consequence` ternary `:1455-1461`); `failedRead.kind` (`:1347`), `allowedReason()`/`missedReason()` motif/net/blowPlies, `positionalReason().tag` (`:1563`), `caused` (`:1332`), `stopsMate` (`:1287`).
2. `whyItFailed.ts:56` — split `held-by-defender` into `took-guarded` (`:268`) and `eyed-guarded` (`:463`) (or add `captured: boolean`); expose `refuter: {square, piece}` and `ledgerWords` as fields.
3. `whyItFailed.ts` — emit `walks-into-fork` (declared `:62`, never returned): after the first reply, a fork from `detectLatentFork`-style attackers on the reply square hitting ≥2 pieces, material lost over `playedLineUci` (ledger). Proof board needed (E9; search the 952 boards).
4. `inaccuracyCall.ts:1455` — add the `missed-win` branch: when nothing was allowed and `missedReason()` names a motif (`trust.name`), set the cause (12 of 87 live moves). Prose stays out; the recipe speaks.
5. `inaccuracyCall.ts:1559` — compute `positionalReason` even when `should` is set; keep it as `cause.tag` (26 of 87 live moves had the tag dropped).
6. `positionalReason.ts:148-195` — notes stop naming the played move (`movedSan`): the recipe words the consequence; Learn rule "never names the move just played". 31 of 87 live notes named it.
7. `positionalReason.ts:200-224` (`bestJobReason`) — `no-plan` and the "belonged on X" fallback yield `tag` but no lesson (recipe: silent).
8. `allowedReply :1027` — return the reply's action (`'attacks'|'checks'|'pins'|'forks'|'skewers'|'threatens'|'traps'`) and target as fields.
9. `src/services/mistakeLesson.ts` (new) — `Record<MistakeCauseKind, LessonRecipe>` with the §D rows; motif and tag sub-records; missing slot → silent + `mistake-lesson` audit row.
10. `errorGradeSentence :1674` — Learn stops using it for the turn's head; the composer renders LESSON → CONSEQUENCE (existing `consequence`/`failed` minus the grade word) → BETTER (past) → HABIT.

## G. Proof boards (David's games, `g-*.jsonl`, errorWhy run on the saved reads, chess.js only, 2026-11-23)
| cause | game · ply · seat · move | FEN before | returned |
|---|---|---|---|
| took-guarded | chesscom-1012441262 · 9 · S · Bxf7+ (288) | `r1bqk1nr/ppp1ppbp/2np2p1/8/2BPP3/5N2/PPP2PPP/RNBQK2R w KQkq - 2 5` | failed "That took the pawn on f7, but the king on e8 takes back — you lose a bishop for a pawn."; better O-O; pos tag king-stuck-center (dropped) |
| eyed-guarded | chesscom-1012441262 · 8 · O · …Nc6 | `rnbqk1nr/ppp1ppbp/3p2p1/8/2BPP3/5N2/PPP2PPP/RNBQK2R b KQkq - 1 4` | "That eyed the pawn on d4, but the knight on f3 holds it …" |
| left-hanging | chesscom-1005776142 · 74 · S · …Rh2+ (634) | `4rk2/5p1p/5P2/8/1PP1PQ2/7r/1b1p2K1/6R1 b - - 1 37` | "That left your rook on h2 hanging — the queen on f4 just takes it."; allowedRead motif hanging_piece |
| answered-by-check | chesscom-1020632112 · 13 · O · Ke3 | `r1bqk2r/pppp1Npp/2n5/4p3/2B1n3/8/PPPP1KPP/RNBQ3R w kq - 0 7` | "Nothing was defending the knight on e4 — but … Qg5+ …" |
| allowed-capture (far) | chesscom-1001055178 · 41 · S · Kh1 (113) | `1r1r2k1/1p1q1pp1/p1p1p2p/2P5/3b1P2/6P1/P4PBP/1R1Q1RK1 w - - 1 21` | "it let them win a pawn" + line …Qe7, Qe2, …Qxc5; better Qh5 guards c5 |
| allowed-threat | chesscom-1001055178 · 46 · O · …f5 (174) | `1r1r2k1/1p2qpp1/p1p1p2p/2b5/5P2/6P1/P1Q2PBP/3R1R1K b - - 1 23` | "it let them play Qb3, which takes the half-open b-file … x-ray at your king" (reply action in prose) |
| king-hunt | chesscom-1001055178 · 58 · O · …Rc7 (157) | `1rr5/1p2qk2/p1p1pb1p/5pp1/5P2/3R1BP1/P1Q2PKP/3R4 b - - 1 29` | "it let them go after your king: Bh5+ and Rd7+" |
| missed-win (pin) | chesscom-1012441262 · 35 · S · Bxf8 (268) | `r4rk1/ppp4p/3p2pB/nq1Pp2n/4P3/2P1Q2P/PP1N1PP1/R3K2R w KQ - 0 18` | no consequence; better "b4 … attack the knight on a5"; missedRead motif pin (dropped) |
| missed-win (hanging) | chesscom-1002984876 · 13 · S · Bg5 (185) | `rn1k1b1r/ppp2ppp/5n2/4p3/4P1b1/5N2/PPP1BPPP/RNB1K2R w KQ - 0 7` | better "Nxe5 … win a pawn"; motif hanging_piece dropped |
| missed-win (zwischenzug) | chesscom-1005776142 · 80 · S · …Bxf4 (202) | `5k2/5p1p/4rP2/4b3/1PP1PQK1/8/3p4/6R1 b - - 4 40` | better "h5+ … checks first" |
| positional (said) | chesscom-1042725180 · 42 · S · …e5 (378) | `r1q1r1k1/1b5p/ppn1pbp1/2pp4/1PP2P2/P2PBB1P/4N1P1/1R1Q1R1K b - - 0 21` | "It took your last defender off d5." (concession defender-left) |
| positional fallback (must be silent) | chesscom-1012441262 · 26 · O · …Kg8 | `r4r2/pppqpkNp/2np1npB/7b/3PP3/2P3QP/PP3PP1/RN2K2R b KQ - 2 13` | "The rook belonged on g8." — guard row E15 |
| better-named, tag dropped | chesscom-1001055178 · 48 · O · …Rdc8 (131) | `1r1r2k1/1p2q1p1/p1p1p2p/2b2p2/5P2/5BP1/P1Q2P1P/3R1R1K b - - 1 24` | better only "Rd4 … develop the rook"; pos tag misplaced-piece "rook on c8 reaches 8 fewer squares" dropped |
| guard: decided | many with \|eval\| ≥ 500 (22 of 109 costly) | | E18 silent |

Census (Review lines, `lines-1.jsonl:207`): "Their e5 was a blunder … It let you play Bb6, which lands on the b6 outpost" — an allowed-threat line whose reply action is not a threat (outpost) — guard row E12 must hold (the `ALLOWED_DOES_SOMETHING` regex passed it via "lands"? no — via the later clause); recheck in build.

## H. Open questions (David's call)
1. When the student's mistake has **no computable cause** (E20, ~30% of live costly moves before F4/F5), is Learn silent, or does it say the cost only ("That cost about a pawn")?
2. **Their** mistakes in Learn: the lesson for an O-seat mistake usually points at something the student can now win. Saying "they left a piece loose" is a pointer at the student's next move. Speak O-seat lessons only once the student has moved (i.e. a turn later), or only the lesson with no target?
3. `no-plan` / "belonged on X": silent, or one generic "the position asked for a different plan" line?
4. Inaccuracies: `costReason` does not run below 100cp. Learn speaks "on a mistake" — does an inaccuracy (50–99cp) count?
5. One cause per turn (the strongest) or two when the mechanism and the motif differ (e.g. took-guarded + king-stuck-center on Bxf7+)?
6. E21: after their slip, may Learn name the student's still-loose piece ("your queen on a5 is still loose")? It points at the student's next move (saving it) without naming the move.
