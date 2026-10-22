# LEARN FOCUS — one teaching focus per game (WO-LEARN-FOCUS-01, David 2026-10-21)

> The design every Learn free-play voice change builds on. Read before touching
> `src/coach/focus/`, the Learn door's voice owner, or what `/coach/teach`
> says during a live game.

## 1. What it is

Learn free play (`/coach/teach`, `LearnMode` `classic`) teaches ONE focus per
game, chosen from the user's record. The coach says 8–15 things a game, all
about that idea; everything else is silent and left for Review. The coach
plays to the user's level, always punishes a focus mistake, and steers toward
positions that pose the focus.

UNTOUCHED: opening walkthroughs ("teach me X"), chat Q&A (asked), special
sessions (Learn how to think, matchups, plans, player games), a named opening
the user asked to play, the Campaign (`/coach/campaign`), Play (silent),
Review. Any of those starting ends the focus game.

## 2. The goal it is graded against

1. **The hold rate measures UNPROMPTED skill.**
2. **Every miss gets taught.**
3. **A focus game says 8–15 things about one idea** (an average, never a cap).

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

## 4. The fade (how much to scaffold)

| focus state | before the game | first chance | later chances | a find | a miss |
|---|---|---|---|---|---|
| red (< 75%) | named, with a record fact | asked (prompted) | quiet tests | short credit | taught on the spot |
| short (75–89%) | "One skill is being watched today — you'll find out which after the game." (no "I" — the coach never talks about itself) | quiet test | quiet tests | quiet | taught on the spot — and every later chance this game is prompted (the focus is revealed) |
| green (≥ 90%) | never picked unless every focus is green; then silent watch | quiet | quiet | quiet | taught |
| grey (< 8 posed) | named (grey teaches) | asked | quiet tests | short credit | taught |

**Taught on the spot** = the coach pauses BEFORE its reply (the Campaign's
pause): the miss is filed as a real unprompted miss, the clue is said, and
**Try again** takes back the user's move (the retry is prompted, excluded) or
**Play on** lets it stand (the coach punishes). A second miss at the same
decision shows the move.

## 5. The focuses — pattern families read from both seats

| focus | DEFEND seat (your side) | EXPLOIT seat (their side) | record tags |
|---|---|---|---|
| loose pieces | a piece of yours attacked and winnable; a move that leaves one winnable | a piece of theirs you can win (SEE, engine-confirmed) | defend: `hung-material`, `missed-opponents-threat` · exploit: `missed-tactic` |
| tactics | their fork / pin / skewer / discovery standing at your turn | your forcing shot the engine proves | defend: `missed-their-fork/pin/skewer/discovery` · exploit: `missed-tactic`, `calculation-depth` |
| the kings | castling in time, their mate threat | your forced mate | defend: `king-stuck-center`, `weakened-king-safety`, `missed-their-mate` · exploit: `missed-tactic`, `overvalued-attack` |
| the fight (LATER) | — | — | plan + key square, merged; ships after the graded set (§8) |

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
moves running (Nf6+, gxf6, Bxg6) before it fell. Castling is the same shape
over a whole game: one decision, asked, judged and recorded once.

The record has ONE tag for "you had a winning shot" (`missed-tactic`), so the
exploit seats share it until it is split by motif (needs a population
difficulty refit — follow-up). The defend seats are disjoint, and they decide
the picker.

A game's lines target the WEAKER seat: a kings game picked because the user's
own king is red talks about their own king.

## 6. The picker (pure, the record decides, never the rating)

- A seat's state = the hold state over its tags (pooled); a focus is as proven
  as its WEAKER seat, and a never-posed (grey) seat is not proven — the shared
  exploit tag must not make a focus whose defend seat was never asked read green.
- **Ladder gates:** tactics and the kings need loose pieces ≥ 75%; the fight
  needs loose pieces and their-tactics ≥ 75%. Grey does not pass a gate.
- Order among eligible, never-green focuses: continue last game's focus if
  still red/short → the red focus with the most misses in the last 5 games →
  the first grey in ladder order → the short focus with the most misses → (all
  green) the least recently taught, as a silent watch.

## 7. The coach's play (the Campaign's dial seam, no second path)

- **PUNISH:** a focus miss the user plays on from is punished with the winning
  move, overriding the coach's level for that one move (`focus-punish`).
- **CREATE:** among moves inside the coach's acceptable window at the user's
  level, prefer one that poses the DEFEND seat (attack a loose piece, set up
  their motif, bring a piece at the king). Never a move that leaves a coach
  piece winnable — a gift is the Campaign's job (`focus-steer`). Only the
  defend seat can be created without a gift; the exploit seat arrives from the
  coach's own level.
- The planned trap is off in a focus game.

## 8. The voice owner (fail closed)

`VoiceOwner` = `open` | `mission` | `focus`. The door holds every lane in a
focus game (`off-focus`, or `focus-voice` when the focus runner says it). Every
line the Learn page speaks names its CHANNEL (`speakLearn`): `owner` (mission /
focus lines), `asked` (the user asked or tapped), `lesson` (a walkthrough,
drill or session — those end the focus game), `free-play` (volunteered). A
`free-play` line is dropped while a mission or focus owns the game. A new
speak site must name a channel to compile.

## 9. The deciding blunder (one exception)

An off-focus move that decides the game (a rook or more lost by force, or a
mate allowed, from a position that was not already lost): "That one decides
the game. Want it back?" — once a game. The miss is filed unprompted; Take back
undoes it (the retry is prompted); Play on lets it stand.

## 10. The end line

On the game-over card: how the focus went ("Loose pieces today: you found 3 of
5.") and "Review has the rest." An unannounced focus is revealed here.

## 11. Record

`learnFocusResults` (Dexie): one row per focus game — focus, state at the
start, chances, found, missed, steered chances, announced. The next game's
pre-game line reads it ("Last game you left two pieces loose").

## 12. Emissions (the algo-audit rule)

- `learn-focus-chosen` {focus, reason, seatStates, lastFocus, announced}
- `learn-focus-turn` {ply, focus, seat, posed, outcome, spoke, prompted, steered}
- `focus-punish`, `focus-steer` (coachGameEngine)

Audit: `scripts/audit-learn-focus-prod.mjs` (contract rows in §G1's matrix).

## 13. The lesson list (2026-10-21, measured on David's record)

Built from the record's 31 skills; numbers are all-time misses / holds, one
move counted once. Status is what the code can do today.

| # | Lesson | Skills | Misses / holds | Board can pose it | Status |
|---|---|---|---|---|---|
| 1 | Loose pieces | hung material, their threat (+ free piece) | 650 / 618 | yes | live |
| 2 | Tactics | their fork/pin/skewer/discovery, your shots | 160 / 58 | yes | live |
| 3 | The kings | king in the centre, weakened king, their mate, your attack | 213 / 2,244 | yes | live |
| 4 | Piece activity | misplaced piece, passive rook | 448 / 3,577 | yes | candidate |
| 5 | Development & tempo | slow development, tempo handed, left book early | 301 / 1,492 | yes (not "left book early") | candidate |
| 6 | Endgame technique | passive king, passed pawn ignored, botched conversion | 115 / 434 | yes | candidate |
| 7 | Pawn structure | pawn weaknesses, overextension, mistimed breaks, space | 120 / 413 | half (no computer proves a hold for weaknesses or overextension) | needs a computer |
| 8 | The fight | plan + key square | 97 / 84 | designed | waits on David's ~20 graded positions |
| 9 | Trades | bad trades, capture away from the centre | 43 / 1,891 | mostly | likely green for David |
| 10 | Greed | pawn grab, poisoned pawn, their trap | 19 / 471 | partly | low |
| 11 | **Opening theory** (David 2026-10-21) | your departure from book (the book move's job), their opening concession (punish it), move order | first 12 moves of 302 analysed games: their ≥1-pawn mistakes 1.3 a game (you kept or took it 56%, let it go 20%); yours 1.1 a game | yes: `theoryDeparture`, `bookMoveWhy`, `principleAttribution`, `moveOrder` | candidate — next after the three are solid |

Opening theory, open calls for David: (1) build it first once the three are
solid; (2) may the coach play ONE real opening slip a game on purpose (mined
human slips at the student's band, engine-verified) — a deliberate exception
to "the coach never gives anything away"; (3) gated behind loose pieces like
the others; (4) the structure line at the opening→middlegame handoff waits for
the fight's grading (same fuzzy computer). The mined gem data alone cannot
carry it: 56 of 948 of David's games pass a mined slip position (16 slips, 13
punished). A hung piece in the opening stays a loose-pieces miss — the theory
seat claims only what a principle explains.

## 14. Where it is going: lessons strung by phase (David 2026-10-21)

"Once lesson plans are built and reliably teach the way I want them to, the
plan is to string 2 or 3 of them together, and have the teachings shift by
phase of game." One game, one lesson PER PHASE: opening theory in the opening,
then a middlegame lesson (loose pieces / tactics / the kings / piece activity),
then endgame technique. The shape already exists in the Campaign runner (one
card per phase, the next goes live the ply after the last resolves). What it
means for every lesson built from here:
- each lesson declares the phases it can run in (a required field, so a new
  lesson cannot be strung wrong by default);
- the phase change comes from the ONE detector the Campaign reads, never a
  second one;
- the lines-per-game target becomes lines per phase; the announce, the end
  line and the record row are per lesson, and silence holds between phases;
- the ladder gates still apply per lesson.
Not built yet — the three lessons are made solid first.
