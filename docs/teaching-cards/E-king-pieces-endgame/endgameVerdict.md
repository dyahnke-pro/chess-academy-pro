# Card — `endgameVerdict` (sit tight, no progress, checks repeat, drawn)

## A. Identity
- `src/services/endgameVerdict.ts` `endgameVerdict(fen, lines, student)` → kinds `drawn` (`drawnEnding`), `checksRepeat` (a line of only checks back to the start, `renderChecksRepeat`), `noProgress` (queens off, no far pawn, |score| ≤50, the first six best moves quiet with no lever), `sitTight` (score −100…−350 for the side to move, quiet first move, no capture against it). Kind `verdict` (census). Either seat.
- Census: 111 fired / 33 said. Held: already-said 39, **unsupported 35** (`squares: []` on noProgress / sitTight), in-flux 4.

## B. Facts
- **B1** `EndgameVerdict`: `kind`, `side`, `text`, `squares`, `draw?`.
- **B2 dropped**: the loop SANs (`seq`) beyond the sentence; `score`; `firstSix` (the quiet best moves — the "maneuver" itself); why sitTight's first move is quiet.
- **B3 cheap**: the MISTAKE triggers — sitTight: the student (worse) played a forcing/pawn-forward move that cost (the read held on fenBefore); noProgress: the student pushed a pawn / broke structure in a level fortress-like ending with cost; checksRepeat: the student (better) took the repetition when the line wins (the read on fenBefore with side = student, played = loop[0]).
- **B4 gates**: drawn first; not in check; checksRepeat needs top ≥100 and the repeat not the best; noProgress as above; sitTight as above; mate in the best line → null.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "You have no counterplay here, so sit tight: keep every piece guarded and wait." / "Nothing here can be forced … Maneuver, keep it solid, and wait for them to go wrong." — rules | example inside (which piece is loose if you move) |
| CONSEQUENCE | partly | "Nothing of yours can be taken by force right now." | the move that broke it |
| BETTER MOVE + JOB | no | — | `firstSix[0]` (the quiet best) once past |
| HABIT | no | — | record (impatience / pawn-break mistimed) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV1 | STRAT (sit tight broken) | S worse | sitTight on fenBefore for the student, the student's move forcing / forward with cost | — | "When you have no counterplay, the defence is patience: every active move gives them a target." / "A worse ending is held by guarding everything and waiting, not by lashing out." | "Now {target} can be taken." | "{best} kept everything guarded." (once past) | "When worse, before every move ask: does this give them something to hit?" | "That gave them a target — sitting tight held." | — | C trigger |
| EV2 | STRAT (no progress broken) | S | noProgress on fenBefore, student pawn push / lever with cost | — | "When nothing can be forced, a pawn move is a commitment you can't take back: maneuver instead." | — | "{best} improved a piece." | "In a quiet ending, prefer piece moves to pawn moves." | "That pawn move gave something away." | — | C |
| EV3 | CALC (took the draw) | S better | checksRepeat for the student, played = loop[0], top ≥100 | — | "Better positions are won by a plan, not by checks: repeating moves throws the advantage away." | "It's a draw by repetition." | "{best} kept the winning line." | "When better, ask before a check: does it get me anywhere?" | "Those checks only repeat the position." | best = repeat | H |
| EV4 | KNOW (drawn ending) | S | `drawn` and the student traded into it with cost | — | handed to `drawnEnding`'s reason (wrong bishop, fortress …) | | | | | | H |
| EV5 | seat O | O | their sitTight / noProgress | — | "They will sit tight: to win, you need a plan that makes something fall." (Review; Learn only on a student mistake) | | | | | | H |
| — | record | — | RED/GREY full · AMBER "Sit tight — guard everything." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `mistimed-pawn-break` / `no-plan` (`bestJobReason` pawn rows, `positionalReason.ts:213-219`) → EV1/EV2; costReason missed (the win given up) → EV3.

## F. Build changes
1. Add `score`, `firstSix: string[]`, `loop: string[]` typed; `squares` for noProgress/sitTight = the student's pieces that are guarded now (fixes 35 unsupported).
2. Triggers `brokeSitTight(fenBefore, san)`, `brokeNoProgress`, `tookRepeat` (B3).
3. Recipes EV1–EV3 → `mistakeLesson.ts`; current texts become LESSON stems.

## G. Proof boards
- sitTight: `lines-0.jsonl#220` (held in-flux), their seat `lines-0.jsonl#1495`; noProgress: `lines-0.jsonl#2494` / `#2344` (held unsupported → F1).

## H. Open questions
- EV3: is taking a repetition in a +1 ending a "mistake" for David's students when the engine says a long win exists?
