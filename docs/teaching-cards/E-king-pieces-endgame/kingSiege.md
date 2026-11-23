# Card — `kingSiege` (attackers vs defenders around a king)

## A. Identity
- File: `src/services/kingSiege.ts` — `kingSiege` (:197), `siegeSpeaks` (:254), `siegeLine` (:277), `siegeSquares` (:311), `farFromHome` (:242).
- Registry: `boardComputers.ts:4002` (`kingSiege`, move read: fires on the move that MAKES a siege) and `:7466` (`kingSiegeNow`, standing board; sets `skill: 'weakened-king-safety'` when the student's king is the target). Kind `king-read` → group `tactics` (`coachFact.ts:136`).
- Surfaces: lesson / review / play / chat / think / learn (via `moveThoughtFacts`), `boardReadFacts.ts:220` (standing read), chat `groundedAnswer.ts:1887` (`kingReadsOn`).
- Census: 202 fired / 69 said (G review 13/17, G lesson 21/99, Danya boards 35/86). Held: already-said 101, same-idea 28, in-flux 3.

## B. Facts
- **B1 handed over** (`KingSiege`, :64): `defender` (colour), `king` (square), `attackers[]` (N/B/R/Q bearing on the king ring, pin-aware, plus sliders in a battery behind them, :206-215), `coming[]` (attacker pieces one move from bearing, :228), `defenders[]` (defender N/B/R/Q bearing on a neighbour square, :216-224), `away[]` with `moves` (1–3 or null, BFS `movesToBear`, :171), `key = siege:<king>:<a>v<d>`. The registry hands only `text` + `squares` + `seat`; no structured field reaches the door.
- **B2 computed and dropped**:
  - `cover` = `kingCover(c, defender)` `{present, of}` (:272) — the shelter-pawn count that decides the second gate; thrown away.
  - `near` (:268) = defenders exactly one move from helping; `force` (:269) = attackers+coming. The margin `force − defenders` is the actual lesson number; never handed.
  - `attackerCp` gate result (:257/:266) — whether the massed-attack branch (engine) or the board-count branch fired; dropped.
  - `away[].moves` for pieces with `moves === 1` is never said (`farFromHome` keeps ≥2 only, :243).
  - In the registry (`boardComputers.ts:4012-4015`) `was` (siege before the move) is computed only to suppress; the DIFFERENCE between `was` and `now` — which defender left, which attacker arrived — is the move's own cause and is dropped.
- **B3 cheap to compute** (chess.js on fenBefore/fenAfter):
  - `madeBy`: the moved piece's role — it was in `was.defenders` and is not in `now.defenders` (a defender left), or it is in `now.attackers` (an attacker arrived), or a shelter pawn moved (`kingCover(before).present > kingCover(after).present`).
  - `margin = attackers.length + coming.length − defenders.length − near`.
  - `openLine`: an open/half-open file or diagonal from an attacker to the king square (findOpenFiles on the king's file ±1).
  - `bestDefender`: the `away` piece with `moves === 1` (the defender one move from home) — the better move's job candidate (only once past).
- **B4 gates**: `siegeSpeaks` (:254) — attacker must still have a queen (:256); attacker not losing (`attackerCp < -50` → silent, :257); massed branch `attackerCp ≥ MASS_CP=50` (:191) AND attackers ≥1 AND attackers+coming ≥3 AND > defenders (:266); board branch attackers ≥2, ≥ defenders, force ≥4, force ≥ defenders+near+1 (:270) AND cover not whole (:273). Registry: only on the move that makes it (`was` speaks → silent, :4015). `AWAY_LIMIT = 3` (:194).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | `siegeLine` is a pure census of the board ("One of your pieces aims at… Three of theirs defend it…") | a rule sentence; the margin; the moved piece's role |
| CONSEQUENCE | partly | `farFromHome` tail ("two moves or more from helping") | the consequence word: "the attack lands before they arrive"; mate link to `costReason.mate` |
| BETTER MOVE + JOB | no | — | `bestDefender` (B3) or errorWhy's better move + "brings the knight to f8 to guard h7" |
| HABIT | no | — | record read of `weakened-king-safety` (student defender) / `missed-tactic`/attack skill (student attacker) |

## D. Lesson recipes
| id | angle | seat | condition (fields) | slots | LESSON stems (rotated) | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KS1 | CALC/RECOG | S attacker | margin ≥2, siegeSpeaks | king, attackers.n, defenders.n | "An attack on the king is a count: {n} of your pieces against {d} defenders around the king on {king}, and the side with more usually breaks through." / "Count the pieces at the king, not the pieces on the board: here it's {n} attackers to {d} defenders." | "One more attacker and something around {king} falls." | — | "Before you attack the king, count attackers and defenders." | after their mistake let it form: "Their king on {king} is outnumbered now: {n} against {d}." | queen off; attackerCp < −50; cover whole and board branch | H attackers/defenders; C margin |
| KS2 | PREV / CONSEQ | S defender (mistake: student's move made it) | `madeBy = defender-left`, siegeSpeaks for student's king, errorWhy cost on the move | moved piece role, king, margin | "Every piece that leaves your king is one fewer defender: with the {piece} gone from {from}, {n} of theirs face {d} of yours around {king}." / "A king is defended by the pieces next to it, not by the pieces that could come back." | "{n} against {d} is how mating attacks start." | "{best} kept the {piece} at home, guarding {sq}." (once past) | "Before you move a piece away from your king, ask who guards it after." | "That left your king with {d} defenders against {n} attackers." (no move named; "That" = the move) | margin < 2; queen off for the attacker | C madeBy (was vs now) |
| KS3 | PREV | S defender | `madeBy = shelter-pawn` | cover before/after | "Pawns in front of your king are walls you can't put back: once a shelter pawn moves, the squares behind it belong to whoever reaches them first." | "Their pieces now have {sq} to land on next to your king." | "{best} kept the shelter whole." | same as KS2 | — | cover unchanged | C kingCover diff |
| KS4 | STRAT (far pieces) | both | `away` has moves null/≥2 | far piece names, moves | "A piece three moves from the king is not a defender — the attack lands first." / "Attack where their far pieces can't come back in time: the {piece} on {sq} needs {m} moves." | "By the time the {piece} arrives, the attack is over." | defender seat: "{best} started the {piece}'s trip home." | "When your king is attacked, ask which of your pieces can get back in time." | — | far piece reaches in 1 (then it's `near`) | H away.moves |
| KS5 | KNOW (rule) | both | queen of attacker absent | — | n/a — silent by gate (:256). Lesson belongs to queenlessMate / endgame cards | — | — | — | — | — | — |
| KS6 | IDENT (the defender to target) | S attacker | defenders.length == 1 | the lone defender | "When one piece is all that defends the king, that piece is the target: trade it off or chase it." | "Without the {piece} on {sq}, nothing guards {king}." | — | "Find the king's last defender." | — | defenders > 1 | H defenders |
| KS7 | combo + mate (errorWhy) | S defender | costReason.kind=allowed, mate:true, seat you, siege now | blow line | "Outnumbered at the king means mate is near: {n} against {d}, and {mateLine first move} ends it." | "It's mate in {k}." | "{best} kept {d+1} defenders there." | KS2 habit | Learn: "Your king is outnumbered now, and they have mate." | mate not in the read | H costReason |
| KS8 | timing (counterfactual) | S attacker missed | costReason missed, motif mate/attack, student attacker | — | "You had the numbers at their king — {n} against {d} — and that is the moment to strike, before their {far piece} comes back." | "Next move the {far piece} is home." | "{best} was the strike." (Review/after only) | "When you have more pieces at the king, look for the forcing move first." | after the move: "You had more pieces at their king than they had defenders." | no missed cost | H costReason, C margin |
| KS9 | evaluate | both | massed branch (cp ≥50) | — | "Pieces near a king are an attack only when they outnumber the defenders and the shelter is broken." | — | — | — | — | — | H |
| KS10 | exception | both | cover.present == cover.of and board branch | — | silent: "A king with all its pawns in front isn't under siege yet" — said only in chat when asked | — | — | — | — | — | H cover |
| — | phase: endgame | — | — | n/a — needs the attacker's queen; endgame king is a piece (kingActivityGap card) | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Outnumbered at the king: {n} against {d}." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student (them→you): `costReason` kind `allowed`, `mate:true` or motif mate on the student's king + KS2/KS3/KS7; `positionalReason` tag `weakened-king-safety` / `king-stuck-center` (`positionalReason.ts:162-165`, the shelter gap is exactly KS3's count); `whyItFailed` `abandoned-defender` when the abandoned piece defended the king ring.
- Opponent: their move pulled a defender → KS2 mirrored for them (Learn speaks it after their move as the student's chance: KS1/KS6).
- Student missed: `costReason` `missed` + mate/attack → KS8.
- KS4, KS9, KS10: Review/chat only.

## F. Build changes
1. `kingSiege.ts:64` — add `cover: {present, of}`, `near: number`, `margin: number` to `KingSiege` (move the computations from `siegeSpeaks` :268-273 into `kingSiege` :197). Enables KS1/KS3/KS9.
2. `boardComputers.ts:4012` — compute `madeBy: 'defender-left' | 'attacker-arrived' | 'shelter-pawn' | null` from `was` vs `now` (+ `kingCover` diff) and hand it on the fact (typed field, not prose). Enables KS2/KS3.
3. `kingSiege.ts:243` — expose `nearest: SiegePiece & {moves:1}` (the defender one move from home) for the better-move job (KS2 BETTER-MOVE, only once past).
4. Recipes KS1–KS8 into `mistakeLesson.ts` under causes `allowed+mate`, `positional:weakened-king-safety`, `whyItFailed:abandoned-defender(king-ring)`, `missed+mate`. `siegeLine` stays for chat/`kingReadsOn` only; in Learn it is the board restatement and is removed from the Learn turn.
5. Sensitivity: keep `siegeSpeaks` gates for the standing read; for a MISTAKE turn the recipe fires on `margin ≥ 2` with the errorWhy cost attached even when `was` already spoke (the move that worsened the margin by ≥1 is the cause). Miss board: `vc-1PI3xfMiUE4-34` (their knight to e2 — Danya: "a really nasty shot I missed"); guard: `vc-1PI3xfMiUE4-13` (two aim at g1, two defend, no cost — must stay silent in Learn).

## G. Proof boards
- KS1 (S attacker, sharp): `vc-1zfJ7ABoh8k-47` `1k1r4/1r3ppp/RN1q2b1/1Pp5/6P1/3P3P/2P2PB1/Q4RK1 b` — "Their king on b8 faces four of your pieces. Three of theirs defend it" (Danya: "the a6-rook can swing to a8").
- KS6 (lone defender): `vc-24yObE8SLzY-48` `r3k3/pp3b2/1q1b3r/3P1p2/4pP2/1P4P1/P5BN/2RQ3K w` — "Only their queen defends it".
- KS2/KS7 (student defender): `vc-1PI3xfMiUE4-35` `r4rk1/pp3ppp/6n1/2bN3q/2B1P1b1/2PP2B1/PPP1n1PP/R3QR1K b` — "Your king on h1 faces three of their pieces… Two of yours defend it"; Danya: "So the queen to e1, forced".
- Guard (no lesson, siege without cost): `vc-1PI3xfMiUE4-13`; review line `lines-0.jsonl#91` (said with no mistake attached).
- Not run (needs engine cp for the massed branch).

## H. Open questions
- Should KS1 speak in Learn on the OPPONENT's mistake (their move let the siege form) as the student's chance, or only after the student then misses it (KS8)? (Behaviour.)
- Is "margin ≥ 2" the bar David wants for "outnumbered" in speech, or should any attackers > defenders with a cost attached count?
