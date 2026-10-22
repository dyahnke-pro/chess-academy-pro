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
- **STOP — PROVEN BY A WHAT-IF, NEVER BY A LABEL.** A student move that
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
  castle before you attack!" · "… You need to castle first!" — then "Want to go
  back and castle?"
- **GO BACK AND CASTLE** rewinds to the LATEST board where castling was legal
  and the student was not yet losing (the held move and every move since);
  castling there is prompted and counts neither way. Play on lets it stand and
  the coach shows why.
- **RECORDED:** every STOP is filed as a `king-stuck-center` miss through the
  lane-evidence door, so it reddens the Weaknesses tile and feeds the drills.
- Runs until the student castles or loses the right; at every rung.

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
- `castle-watch` — each castling decision: stop / quiet / reminder / no-read,
  the cost, what the castled king held, losing, attack, the rewind ply.
- `focus-punish`, `focus-steer` (coachGameEngine).

Audit: `scripts/audit-learn-focus-prod.mjs` (contract rows in §G1's matrix).

## 13. The layers after tactics (decided 2026-10-22)

One at a time, each only once it passes its measurement on David's 950
games: DEVELOPMENT & TEMPO first, voiced by two fixed lines, no pause (David:
"I want to know when I give up the tempo and when I gain it back"): "That lost
the tempo." when a move hands them a free developing move; "You have the tempo
back! Now keep it!" when a developing move with a threat forces a
non-developing reply, or they waste one, and the development count catches
up — opening only, ~1–3 lines a game, the tempo back pays a reward. Then
endgame technique, then piece activity (the most proof owed). Still owed
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
