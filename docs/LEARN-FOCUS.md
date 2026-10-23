# LEARN FOCUS — one always-on tactics focus, at a rung the record sets (WO-FOCUS-TACTICS-01, David 2026-10-22)

> The design every Learn free-play voice change builds on. Read before touching
> `src/coach/focus/`, the Learn door's voice owner, or what `/coach/teach`
> says during a live game. It REPLACES the three-lesson design of
> WO-LEARN-FOCUS-01 (loose pieces / tactics / the kings, a picker, a fade by
> hold state), which is deleted rather than annotated.

## 1. What it is

Learn free play (`/coach/teach`, `LearnMode` `classic`) is ONE focus every
game — tactics, read from both seats — at a RUNG the record sets, with the
castling watch beside it. David 2026-10-22: "Tactics and loose pieces should
always be a focus … making focuses equal weight for coach to speak, the only
thing algod is how hard spotting the tactic is … in every game there must be
at least one chance for the user to find the focus." Loose pieces are how
tactics win material, so they are the first rung of the same lesson. The
coach speaks about it only when the user misses; everything else is silent
and left for Review. The coach plays to the user's level, punishes a miss
that stands, steers toward its own tactics, and leaves at least one chance on
the user's side every game.

Before every game, one fixed line (David's words): "Today's focus is tactics,
finding and preventing them! You will have at least one chance this game for a
winning tactic, but your opponent will also be trying to set up its own
tactics. Stay vigilant!"

UNTOUCHED: opening walkthroughs ("teach me X"), chat Q&A (asked), special
sessions (Learn how to think, matchups, plans, player games), a named opening
the user asked to play, the Campaign (`/coach/campaign`), Play (silent),
Review. Any of those starting ends the focus game.

## 2. The goal it is graded against

1. **The hold rate measures UNPROMPTED skill.**
2. **Every miss gets taught.**
3. **The coach speaks on a miss, never on a find nobody asked about.** A find
   is said only when it answers a question said out loud (the opening ask, or
   a retry after a clue); every other find is silent and counted in the end
   line. The lines per game track the misses — there is no target.

## 3. Scoring — prompted chances are excluded BOTH ways (root fix)

A move found after the coach told the user the moment was already excluded
(`CapabilityEvidenceRecord.prompted`). A MISS at that moment still counted in
full, because the slip path (`misconceptionTags`, live capture and the game
sweep) never read the prompted flag. So any question the coach asked could only
lower the score. Fixed at the root:

- A slip carries `prompted` when its ply was prompted (Learn's
  `promptedPlies`, the same set the positive half already reads). The live
  capture stamps it from the page; the sweep stamps it from the game record.
- `holdRate` skips prompted slips, as it already skips prompted rows.
- ONE MOVE POSES A SKILL ONCE across every writer: events are deduped by
  (tag, game, board) — broken if any row missed, steered if any row was.
- A STEERED hold (the coach created the situation) counts half; misses count
  full.

## 4. The tiers — the tier IS the rung (David 2026-10-22: "Finds are silent … advanced players and strong intermediate players the take back should turn off … Never show the answer! Provide a 'show me' button after the second miss for beginners")

| rung | title | the first chance | a miss | a second miss at one decision | chances a game |
|---|---|---|---|---|---|
| 0 | Beginner | asked out loud (prompted) | the coach holds its reply, says the clue: Try again / Play on | **Show me** (the student's tap) / Play on | 3 |
| 1 | Intermediate | quiet | clue, Try again / Play on | plays on, nothing shown | 2 |
| 2 | Strong intermediate | quiet | no pause, no clue — the coach punishes | — | 1 |
| 3 | Advanced | quiet | no pause, no clue — the coach punishes | — | 1 |

**THE CLUE IS THE HABIT, NEVER THE PIECE** (David 2026-10-23: "Just say 'a
piece' don't name directly. Switch the alert to the habit."). One fixed line
per kind (`focusLines.CLUE`), the same words every miss:

| kind | the clue |
|---|---|
| a piece of yours loose | Hold on — a piece of yours is loose. Before every move, check each of your pieces: is it attacked, and is it guarded? |
| a cheaper piece hits it | Hold on — a cheaper piece of theirs is attacking a piece of yours. Before every move, look at what their cheaper pieces hit: a guard does not save a piece from a cheaper attacker. |
| your move leaves one loose | Hold on — that move leaves a piece of yours loose. Before you play a move, check that every piece is still guarded after it. |
| …where a cheaper piece hits it | Hold on — that move puts a piece of yours where a cheaper piece of theirs attacks it. Before you play a move, look at what their cheaper pieces can hit after it. |
| their motif lands | Hold on — that move lets them pin a piece of yours (fork two of your pieces, take the guard of …). Before every move, ask what their checks, captures and threats would be. |
| their mate threat | Hold on — they threaten mate, and that move does not stop it. Before every move, ask what their last move threatens. |
| your free piece / your shot / your mate | unchanged — already the habit ("Count attackers against defenders", "Checks, captures and threats first", "Checks first") |

It used to name the piece and its square ("your bishop on g4 is attacked and
not defended"), which made Try again a gimme and taught the board, not the
habit. The square is said only once the moment is past (the shown answer, the
credit, the recap). Audit F19.

A find is silent at every rung (it pays its coins and burst); only a find that
answers a question said out loud — the opening ask, or a retry after a clue —
is credited in words. The answer is never shown without the student's tap.
Try again takes back the user's move only (the retry is prompted, counts
neither way); Play on lets the miss stand and the coach punishes it. Every
missed chance that stood goes on the game-over card with **Play it out**: the
board before the miss as an in-place drill, told (its answers count neither
way), then the card again with the chance marked found.

## 5. The one focus — both seats

| seat | what the board poses | record tags |
|---|---|---|
| YOUR SIDE (exploit) | a piece of theirs you can win (`take`); a forcing line that wins (`shot`); a forced mate (`mate-for-you`) | every motif's your-side row, `missed-your-free-piece`, `missed-tactic` (a shot the classifier cannot name), `calculation-depth` |
| THEIR SIDE (defend) | your piece to save (`save`); their fork / pin / skewer / discovery … standing at your turn (`motif`); their mate threat (`mate-threat`); a move that left a piece of yours loose (`leave`, judged on the move) | every motif's their-side row, `missed-opponents-threat`, `hung-material` |

A loose piece is counted by who can REALLY take: attackers and defenders are
legal captures (`legalCounts`), and a defender pinned to its king is NAMED in
the clue, never counted ("attacked twice and defended once — your bishop on e3
is pinned to your king"). A save is judged on NET material (`saveAnswer`):
trading the attacker off is an answer, said as a trade ("that trade keeps the
material level"), never as "safe" — the first audit game (2026-10-21) marked
Nf4xd5 …cxd5 and Rh1xh4 …Rxh4 as misses because the recapture was read and the
capture before it was not.

A RECAPTURE IS NOT A PIECE TO TAKE (hand walk 2026-10-23): a piece of theirs
that just took one of yours worth as much is the trade finishing — 4…Nxc3,
5.bxc3 was credited "their knight on c3 had no defender". The take reader nets
out what the arriving piece took (`tookOnArrival`); only what is left over is
free (a knight that took a pawn and hangs still is). The coach's own plant
reads the same computer, so a trade never counts as a chance presented.

A FREE PIECE MUST STAY WON (hand walk 2 2026-10-23, the coach's plant): 5…g5
left the f5 bishop to Nxf5, and …Qa5+ forked the king and the knight and took
it back. With a read, the engine's own capture line must keep the gain where the
student is to move again (`pvGain`, as the shot is read); a capture that is
best for other reasons is not a loose piece.

A PIECE NO MOVE COULD KEEP WAS NOT LEFT LOOSE: the `leave` miss needs some
legal move from the board before that keeps the piece (`couldKeep`). The walk's
7.Bd2, answering …Qa5+, was clued "that leaves your knight on f5 … loose" —
every answer to the check dropped it, and the "was it already loose?" probe
cannot read a board whose king is in check.

A mating move is mate: "Qd7 is checkmate.", never "starts mate in one".

The shot's clue is ONE fixed line, true of every shot: "there is a forcing
move that wins material here. Checks, captures and threats first." A shot's
first move is a check, a capture or a threat (`forcingFirst`); the old rotated
stem "a check or a capture wins something here" was false on the walk's quiet
13.Nd5.

A loose piece is ONE decision until a move answers it. A check answers nothing
(the opponent cannot take while in check, so a legal count reads the piece as
safe for one move), and neither does material taken on another square that only
breaks even while the piece still hangs (one that wins material outright — the
prod game's dxe5, a queen taken while your own queen hung to a knight — is an
answer): the question stays OPEN — nothing recorded, nothing said — and
the next move is judged, keeping the asked/steered flags it was first posed
with, a retry after Try again included. The prod record game 1 (2026-10-21) scored one rook on c1 "found" three
moves running (Nf6+, gxf6, Bxg6) before it fell.

The seats are built from the ONE master motif list (`src/data/tacticMotifs.ts`,
WO-MOTIFS-01): each motif's two tags sit in the two seats; a shot is named by
the one classifier where the move is scored (`motifNaming`).

**Only the open levels are asked.** A motif has a level (Beginner /
Intermediate / Advanced). Beginner is always open; the next opens when the one
before holds ≥ 75% in games, pooled over both seats, with no motif in it red
(`focusSetup.openMotifLevels`). Every reader of a chance takes the open levels
as a REQUIRED answer: the chances (`chancesAt`), the coach's steering
(`posesDefendSeat`). A locked motif is still recorded and Review still names
it; it is not asked and not steered toward.

## 6. The rung — the record decides, never the rating (`focusRung.ts`, `focusSetup.ts`)

One scale, `TacticsRung` 0–3, read by the chance reader, the plant and the
student alike, so the three can never disagree:

| | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| a piece of theirs to take | the piece that just moved there | a piece a guard walked away from | a piece that looks guarded and loses on the count, or whose guard is pinned | — |
| a shot | — | wins on your second move (a fork that takes next move) | one key move deeper | a 3–4 move calculation, or an Intermediate / Advanced motif; at this rung alone ONE pawn, when the line is forcing, the pawn is still up at its quiet end, and the move beats the next by ≥ 100 cp |
| a mate | in one | in two | in three | in four |
| your piece to save | hit by the piece that just moved | hit by one already there | looks guarded, or its guard is pinned | — |
| their motif | — | a Beginner motif | Intermediate | Advanced |

Rungs 0–2 win at least two pawns by force (`LOOSE_GAIN`, `SHOT_GAIN`).

**WHAT MOVES IT: only what you spot.** The games played at the current rung
are read the way the Campaign reads a card at its setting (`dialState`): the
last 5 games at the rung. Up a rung after 3 UNPROMPTED finds at the rung,
either seat, found at least 75% of the time; back a rung after 5 games at it
below 75%. A prompted chance and a chance below the rung count for nothing. A
first focus game is seeded from the hold on your side (red / grey 0, short 1,
green 2), never the rating. Harder means SUBTLER on the board, never a
stronger coach.

Each game's setup also draws a TARGET PLY between move 6 and move 12 — where
the coach makes sure your first chance lands (random on purpose: the opponent's
behaviour is genuinely random, CLAUDE.md "Why determinism").

## 7. The coach's play (the Campaign's dial seam, no second path)

- **PUNISH:** a miss that stands is punished with the winning move, overriding
  the coach's level for that one move (`focus-punish`).
- **CREATE:** among moves inside the coach's acceptable window at the user's
  level, prefer one that poses THEIR side (attack a piece that can be won,
  set up its motif at an open level). Never a move that leaves a coach piece
  winnable (`isGift`, `focus-steer`), and never a gift on a deeper look: the
  scorer's read is shallow, so before a steer replaces the coach's own move
  the board after it is read once more (depth 12) and a steer that hands the
  student two pawns or more is refused (`STEER_GIFT_CP`; the 2026-10-22 local
  audit caught …Bxe5 read at 50cp that cost 375).
- The planned trap is off in a focus game — except at rung 0, where the
  opening chance may be a real gem slip from the mined data, kept as a chance
  the coach made.

## 7a. A chance every game, at a varied point (David 2026-10-22: "it MUST be present at least once per game! Beginners maybe more than once … It could come at any point within the game. Vary it, coach can guide this.")

The coach plants ONE real slip of its own (`focusPlant.findFocusPlant`, through
the Campaign's slip reads in `coachGameEngine.tryFocusPlant`): one of its
engine candidates costing it at least `SLIP_DROP_CP`, after which the lesson's
OWN chance reader (`chancesAt`) poses your side at the asked rung — with
nothing EASIER beside it (a free piece next to the intended shot would be
taken instead, and the harder chance never asked).

| rule | where |
|---|---|
| THE GUARANTEE: from the target ply, until a chance on your side at your rung has been on the board (natural or planted), the coach looks on every move; no cap stops it, and a decided game does not either (David: MUST) | `plantAsk`, `PlantState.presented`, the runner's `presents` |
| THE EASIER RUNG: nothing presented by move 20 → one rung easier | `PLANT_EASIER_FROM_PLY`, `wantedDifficulty` |
| RUNG 3 FALLS BACK FOR THE GAME: five moves past the target with nothing at rung 3, the coach asks at rung 2 — MEASURED on 28 of David's games: a 3–4 move shot could be planted at its rung before move 20 in 11 of the 21 games that reached it (under the 80% bar); rung 2 in 20 of 21; rungs 0–2 at their own rung in 19–20 of 21 | `TOP_RUNG_GRACE_PLIES`, `focusPlant.arrival.measure.test.ts` |
| EXTRAS by rung (3 / 2 / 1 / 1, natural chances included), one a phase: the second from move 15, the third from move 25 or the endgame, whichever comes first; a miss brings the same pattern back | `RUNG_TIERS[rung].chances`, `SECOND_CHANCE_PLY`, `THIRD_CHANCE_PLY` |
| THE FLIP (David: "I LIKE THIS! I WANT THAT TO HAPPEN FOR ME TOO"): an extra while you are way ahead (the app's one decided bar) is THEIR tactic, at your rung's subtlety, for you to stop | `flipPlant` |
| At least 8 plies apart; never mid-exchange, never while the board waits on the student | `plantAsk`, `focusPlantAsk` |
| KEEP MISSING → MORE, EASIER CHANCES (David 2026-10-23: "The coach should present more frequent and easier chances if user keeps missing"): your chances missed in a row at the first try (`missStreak`; a first-try find ends it, a find after the clue does not) bring the next plant two moves after the last instead of four, one rung easier per miss (down to the plainest), and lift the extra budget and the phase floors until a find. Their threats missed do not count — the plant is your side's chance. NATURAL ONLY (David 2026-10-23: "Keep natural" → "But difficulty should decrease"): the coach still plants only through its own real slips, so more chances come only when one exists (prod run 6: 2 planted of 18 streak asks in one game, none of 14 in another); the easier ask always holds. Audit F20 | `PlantState.missStreak`, `MISS_SPACING_PLIES` |
| A planted find counts HALF (like a steered one); a planted miss in full; a find on a chance the coach made never raises its strength | `halfOf` / `plantedOf`, `replyMadeAChance` |

A game that ends before its chance came (mate by move 10) says so on its end
line and its result row (`presented: null`), never silently.

## 7b. The castling watch (replaces the kings focus; `castlingWatch.ts`)

David 2026-10-22: "I don't want it called out because of a blunder. But
because the king is in the middle" → "If the eval drops at any time because
of not castled then it needs to call it out and mark in weaknesses."

- **ONCE, EARLY:** in the student's first twelve moves, when castling was legal
  and they played something else: "You could have castled there. Get your
  king safe before the centre opens." No pause.
- **STOP — THE LOOK-AHEAD (David 2026-10-22: "Can the coach look ahead and
  identify if not castling will hurt in the near future?").** The board the
  student moved from was read (MultiPV 6, depth ~12 — several moves of the
  engine's horizon); when castling is in that read and beats every other move
  it lists by at least 100 cp (`CASTLE_URGENT_CP`), skipping it is the
  mistake: STOP on that move, no extra read, and the rewind is that one move.
  A move that hung material is the tactics focus's, never this. RARE BY
  DESIGN (measured 2026-10-23, every castle-ready board of David's in his 950
  games, native Stockfish depth 12, six lines): castling over EVERY other move
  by 1.2 pawns — 1 board in the first 500; by 2 pawns — 1 in 2,673, and that
  one a tactical crisis the focus owns. (The older "23 times in 22 games" was
  castling best and HIS move a pawn worse — the backstop's question, not
  this one.) Every hold writes an `ahead-quiet` row with castling's gap and
  why it held (`under-bar` / `hung`): live on prod, his one real board read
  O-O-O +1.93 vs Ncb5 +1.11 on the app's engine — 82cp, under the bar.
- **STOP — THE BACKSTOP, PROVEN BY A WHAT-IF, NEVER BY A LABEL.** A student move that
  (i) costs at least 100 cp, (ii) whose board after, with their king and rook
  on their castled squares (the side whose squares are empty and unattacked),
  is better than the real board by at least that cost, and (iii) hung no
  material. One bounded engine read of the what-if (and of the real board when
  the read before did not list the move), only on such a move, only with the
  king uncastled and a right left. The runner decides; the page only reads.
- **THE FOUR FIXED LINES**, so the line is always true — losing (≤ −300) vs a
  cost, an attack (a capture, a check, a piece toward their king, or a pawn
  break — a push that hits a pawn or piece of theirs; David: "a pawn push can
  open up the center") vs a quiet move: "STOP! You're not castled, and because of that you're now in a losing
  position! You need to castle before you attack!" · "… You need to castle
  first!" · "STOP! You're not castled, and that just cost you! You need to
  castle before you attack!" · "… You need to castle first!" — then the
  rewind's ask, naming how many of the student's moves it takes back (David:
  "The user needs to know how many moves will be erased"): "Want to take that
  move back and castle?" · "Want to go back two moves and castle?"; the button
  says it too ("Take it back and castle" · "Go back 2 moves and castle").
- **GO BACK AND CASTLE** rewinds to the LATEST board where castling was legal,
  SOUND — in that board's own read within 100 cp of its best (on David's
  record the old rule went back to the board before Qf3, where …g6 hit the
  queen on h5 and castling dropped it) — and the student was not yet losing;
  never more than three of the student's moves back (`REWIND_MAX_MOVES`) —
  further, the STOP is said with no ask and the coach shows why. Castling
  there is prompted and counts neither way. Play on lets it stand and the
  coach shows why.
- **RECORDED:** every STOP is filed as a `king-stuck-center` miss through the
  lane-evidence door, so it reddens the Weaknesses tile and feeds the drills.
- Runs until the student castles or loses the right; at every rung.

## 7c. The tempo run (`tempoRun.ts`; David 2026-10-22: "you have him on the run with tempo moves, keep pressing and making him react to you" → "Maybe it can say 'you HAD them on the run!' after the run ends. With the star burst and coin appearing at that time" → "Go")

- **A TEMPO MOVE** makes them react: a check, or a quiet move that attacks a
  piece of theirs they must answer (`tempoTargets` — the attacker cannot
  simply be taken) — and it is SOUND: the board's own read lists it within a
  pawn of its best, so a check the engine calls a mistake never counts and
  check-spam cannot farm it. A RUN is tempo moves in a row that STOOD (the
  coach replied to them; a move taken back never counts, a castle rewind
  clears the run).
- **WHEN A RUN OF TWO OR MORE ENDS** — past tense, so it never interrupts the
  run and never hands out advice: "You HAD them on the run!" with the
  `tempoRun` starburst and coin ("TEMPO RUN ×3"). Ended too soon — the
  board's best was still a forcing move (a check, a capture or a threat) and
  the quiet move cost at least 50 cp — "You had them on the run — and you let
  them off the hook. Keep asking: checks, captures, threats." and no coin: the
  miss half, ending on the habit (David 2026-10-23: "I want to be teaching the
  habits").
- **A LINE ABOUT THE SAME MOVE WINS** (a clue, a STOP, a credit, the
  reminder): the run's line is not said on top of it; the run goes to the
  recap.
- **THE RECAP:** "Longest tempo run: 3" on the card (a run under two is no
  row); beating every game before is "— new best!" with a badge and the
  `newBest` burst. The game's longest run rides its `learnFocusResults` row
  (`tempoRun`); the next game's setup reads the best (`tempoBest`).
- **THE ONE EXCEPTION** to "the coach speaks on a miss, never on a find nobody
  asked about" — David's own.
- Measured on David's 342 games (`tempoRun.measure.test.ts`, the run computer
  on his moves): a run of 2+ ended 313 times in 183 games — 270 "had", 43 "let
  off" (a floor: the review keeps the best move on some moves only); his
  longest run per game — 0 in 36 games, 1 in 104, 2 in 120, 3 in 55, 4+ in 27
  (re-measured 2026-10-23 with the repetition rule below: 4+ was 29).
- **A MOVE THAT BRINGS BACK A POSITION IS NO TEMPO MOVE** (prod record
  2026-10-23: Qg6+ Ke7 Qg5+ Ke8 Qg6+ … read as a run of six and a "new best").
  A perpetual check is a draw, not a run: the run reads the positions after
  the student's earlier moves this game (`TempoMoveInput.seen`, required; a
  castle rewind drops its own) and a move that repeats one ends it.
  A tempo move is a check, or a quiet move after which they face a NEW threat —
  a piece (not a pawn) newly en prise or a mate threat, read by the ONE
  must-defend computer, so a discovered attack counts (hand walk 2026-10-23:
  13.Nd5 uncovered the d2 bishop on the h6 queen; the moved piece's own attacks
  alone missed it).

## 8. The voice owner (fail closed)

`VoiceOwner` = `open` | `mission` | `focus`. The door holds every lane in a
focus game (`off-focus`, or `focus-voice` when the focus runner says it). Every
line the Learn page speaks names its CHANNEL (`speakLearn`): `owner` (mission /
focus lines), `asked` (the user asked or tapped), `lesson` (a walkthrough,
drill or session — those end the focus game), `free-play` (volunteered). A
`free-play` line is dropped while a mission or focus owns the game. A new
speak site must name a channel to compile.

## 9. The deciding blunder (one exception, rungs 0–1)

An off-focus move that decides the game (a rook or more lost by force, or a
mate allowed, from a position that was not already lost): "That one decides
the game. Want it back?" — once a game, at rungs 0–1. A hung piece is the
focus's own miss and is taught as one. The miss is filed unprompted; Take back
undoes it (the retry is prompted); Play on lets it stand.

## 9a. A miss taken back is still a puzzle (David 2026-10-23)

"If the user missed it the first time in the game it should go to puzzles" →
"Taken back moves should still generate puzzles. But not all undo moves get
puzzles. There is a distinction" → the coach flagged it = a puzzle; your own
Takeback = not. The game record never holds a move that was taken back, so the
end-of-game analysis that files every other mistake puzzle cannot see it.

- **Flagged:** the runner emits `taken-back` (the board and the move) on Try
  again, on "want it back?", and on Go back and castle (the STOP's move only —
  the earlier moves the rewind takes with it were never flagged); the
  Campaign's Try again flags its held move the same way. Play on emits nothing:
  the move stays in the game and the game's analysis files it.
- **Graded at the take-back:** a move the coach stops holds the board BEFORE
  Learn schedules its grade, so the live grader never reads it.
  `takenBackPuzzles.fileTakenBackMiss` grades it — the one memoized price
  (`liveMovePrice`) and the grader's own rule (`detectSlip`) — for the puzzle
  ONLY (the focus and the mission already filed the miss; routing it through
  the grader would count the skill twice), and files it with the best line and
  the reply it allowed, only for a mistake or worse.
- **Never:** an inaccuracy; the bar's Takeback or a "take that back" in chat
  (you caught it yourself, misclicked, or were trying a move).
- **One puzzle per position per game:** a retry at the same board that also
  missed and stood is the same drill (`addTakenBackMistakePuzzle`, and the
  end-of-game analysis now keys by position).

The runners' HOOKS file it — `useFocusRunner` on `taken-back`,
`useMissionRunner` on Try again's undo (it remembers the held move) — through
the one door `takenBackPuzzles.fileTakenBack`; the page holds no copy, so its
Takeback paths cannot file one. Gate: `learnFocusWiring.gate.test.ts`.

**The grade is the app's, and it is logged.** Every take-back ends in one
`taken-back-puzzle` row — `filed`, `duplicate`, `not-a-mistake`, `unpriced`,
`no-game` or `illegal` — with the severity, the cost and both evals. The grade
is expected points, the same rule as every other mistake: a further loss in a
game already lost is honestly `not-a-mistake` (prod record 2026-10-23: Qg3 at
−7.2 walking into mate in 9; Bf4 after the queen was gone at −6.9 — both
retried, neither filed, both correct). Audit F18 holds every stopped move to
a row and every mistake-or-worse row to its puzzle — never to a second
engine's cost, which is how the first F18 read those two as defects.

**Your own Takeback, exact.** A 6-s snapshot of the board was the old
`takenBack` flag — a takeback at 7 s never reached it and nothing read it, so
a slip you undid yourself still filed a live puzzle on a learned line. Now
each graded move has a serial at its ply; the bar's Takeback and a takeback in
chat mark the serial they undid (the castle rewind is the coach's, not
yours). The 6-s grade reads the mark, the live puzzle filer reads the flag
(`discussionPractice`: never a puzzle for a move taken back), and a move taken
back after its grade has its puzzle withdrawn and its slip and evidence rows
marked (`withdrawTakenBackSlip`), with a session mark the capture reads right
before it writes, so a grade still being filed cannot slip past. Gate:
`ownTakeback.gate.test.ts`; `ownTakeback.test.ts`.

**Every paid find shows its burst (audit F21).** The reward layer paints on a
canvas the DOM cannot see, so the focus audit stamps every draw on it and
holds each paid find to a paint within seconds, and a rung-up to its banner.

**A game ended with the card still up.** A decision still open at the game's
end stood: it is filed as Play on would file it and listed on the card
(`focusRunner.closeOpenPause`; the same prod run: a miss in the tally and the
end line, on neither the record nor the card).

## 10. The end line and the card

"Tactics today: you found two of three chances, and stopped one of two of
theirs. Review has the rest." — said and shown on the game-over card, with the
progress to the next rung ("2 of 3 finds to Intermediate"; none at the top)
and every missed chance that stood, each with Play it out. A rung-up is said
("Tactics: Intermediate!") and celebrated.

## 10a. The rewards — tied to the focus (David 2026-10-22: "make sure the dopamine tools are working here as well" → "tie them into the focus")

| the find | reward |
|---|---|
| saved a piece, left none loose, parried their tactic (save / leave / motif) | `saved` |
| took a free piece, played your shot (take / shot) | `punished` |
| stopped their mate, or played yours (mate-threat / mate-for-you) | `onlyMove` |
| found it on Try again, or on the recap's Play it out | `missionRetry` (the smaller celebration) |
| a rung-up | `levelUp`, labelled "TACTICS: INTERMEDIATE" |
| a miss, a castling STOP, a Show me tap | nothing, and the streak breaks |

Silent finds pay too: speaking only on a miss decides what is SAID, not what is
earned. Two finds on one move pay once, the bigger one; a move that finds one
chance and misses another pays nothing (the retry pays). While the focus owns
the game the page's grade and gem rewards stand down (`focusPays`); checkmate
still pays.

## 11. Record

Every answer through the lane-evidence door (`lane: 'focus'`). One
`learnFocusResults` row per game (Dexie v45, in the backup and the data drop):
the rung, the tally by seat, the unprompted answers at the rung (`atRung` —
what moves the rung), and the first chance presented (`presented`). The next
game's rung reads these rows (`rungGamesFrom`); rows older than this build
carry no rung and are never read for it.

## 12. Emissions (the algo-audit rule)

- `learn-focus-chosen` — the setup: rung, reason (`games` / `seed`), the rung
  window, seat states, open levels, target ply.
- `learn-focus-turn` — one row per chance answered: seat, kind, tag, level,
  outcome, spoke, prompted, steered, planted, difficulty, rung, held, retry,
  reward.
- `focus-plant` — each plant ask: what it planted (seat, tag, difficulty,
  extra, rung) or why nothing.
- `castle-watch` — each castling decision: stop / quiet / reminder / no-read /
  ahead-quiet (the look-ahead held: castling's gap over the next listed move,
  and why — under the bar, or a hung move), the cost, what the castled king
  held, losing, attack, the rewind ply.
- `focus-punish`, `focus-steer` (coachGameEngine).

Audit: `scripts/audit-learn-focus-prod.mjs` (contract rows in §G1's matrix).

## 13. The layers after tactics (decided 2026-10-22)

One at a time, each only once it passes its measurement on David's 950
games. DEVELOPMENT & TEMPO became the TEMPO RUN (§7c): measured first as two
lines — "That lost the tempo." / "You have the tempo back! Now keep it!" —
the clean version fired about once every four games on his record (David: "I
don't want in the opening tempo statements every move" → "I think there's a
better way … at the start of an attack"), so it was rebuilt as the run.
Next: endgame technique, then piece activity (the most proof owed). Still owed
from the old list: pawn structure (needs a computer that proves a hold),
the fight (waits on David's ~20 graded positions), opening theory.

## 14. Where it is going: lessons strung by phase (David 2026-10-21)

"Once lesson plans are built and reliably teach the way I want them to, the
plan is to string 2 or 3 of them together, and have the teachings shift by
phase of game." One game, one lesson PER PHASE: opening theory in the opening,
then a middlegame lesson (tactics, piece activity),
then endgame technique. The shape already exists in the Campaign runner (one
card per phase, the next goes live the ply after the last resolves). What it
means for every lesson built from here:
- each lesson declares the phases it can run in (a required field, so a new
  lesson cannot be strung wrong by default);
- the phase change comes from the ONE detector the Campaign reads, never a
  second one;
- the lines-per-game target becomes lines per phase; the announce, the end
  line and the record row are per lesson, and silence holds between phases;
- each lesson keeps its own rung.
Not built yet — the tactics focus is made solid first.
