# THE CAMPAIGN — Learn, one habit at a time

> The design every mission, dial, boss and Campaign-narration change builds on.
> Locked decisions (David 2026-10-21, WO-MISSIONS-01/02). Read before touching
> `src/missions/`, the Learn page's Campaign mode, or anything Learn says.

## 1. What the Campaign is

The Campaign is Learn rebuilt around MISSIONS: in every game the coach teaches
ONE habit per phase (opening, middlegame, endgame), scored separately. The student
plays a real game; the coach plays purposeful moves that serve the lesson. Levels
are grouped into tiers (chapters); every tier ends in a boss fight. Today it lives
behind its own door, `/coach/campaign` ("Campaign" on the coach hub); the classic
Learn at `/coach/teach` is untouched — its narration is set aside from the
Campaign, not deleted. Renaming Learn to Campaign ships with the Campaign map (WO-05).

**THE VOICE RULE.** Silence is the default. The coach speaks ONLY to:
1. **announce** the phase's mission, once;
2. **rewind a miss** with the card's FIXED phrase (never rotated — repetition
   builds the habit);
3. **celebrate a pass**.

The one exception is a boss's intro. Nothing else speaks in a Campaign game — the
classic Learn's lanes still run and still record (the record graduates missions),
but the door holds what they say (`MissionVoice`).

## 2. The card and the runner

- **Card** (`src/missions/missionCard.ts`): data + one check. `announce`,
  `missPhrase` (+ per-reason `missPhraseFor`), `passLine`, `coachDials`,
  `unlock`, `graduate`, `closesAtMove`, `checkModule`.
- **Registry** (`src/missions/registry.ts`): `Record<MissionId, MissionCard>` — a
  new id fails to compile until it has a card. `missionForPhase(phase, record)`
  picks the live card from the RECORD, never a rating.
- **Runner** (`src/missions/missionRunner.ts`): a pure state machine
  (`stepMission`) that returns effects; `useMissionRunner` applies them. A miss
  pauses BEFORE the coach replies: **Try again** undoes the student's move only,
  **Play on** lets it stand. A second miss at the same decision SHOWS the move
  (arrow) and plays on.
- **Record** (`src/missions/missionRecord.ts`, Dexie `missionResults`): one row
  per mission per game; travels with the cloud backup. Colours alternate every
  game from it (White, Black, White…).

## 3. CARD SHIP RULE

A card ships only with ALL of:

| requirement | what it means |
|---|---|
| definitions | pass / miss / exempt written in the check module's header |
| unit tests | positive fixtures AND a **fail twin** (looks like the pattern, one condition missing) that must NOT pass |
| classification | **LIVE** (pure chess.js, or at most ONE engine read inside the iOS 2 s cap) or **POST-GAME** (deeper reads; judged in the recap only) |
| arrival rate | how often its target position or plant actually occurs in audit games — ≥ 60%, or the card's own stated bar (Tactically win an extra piece: every game, David 2026-10-21) |
| judgement cards | eval-based cards ("don't hurry", positional sacs) need a validation set graded by a strong human that the check agrees with — or the card is recap-only |

The registry gate already fails a card whose check module has no test file
with both a pass and a miss fixture (`src/missions/registry.test.ts`).

## 4. Engine policy

Live checks stay pure, or within one capped read. Anything deeper runs post-game.
Never block the coach's reply on a mission read beyond the cap. The coach's own
move choice under a dial (`applyMissionDials`) reads the engine inside an
exclusive hold, bounded by its budget.

## 5. Scenario starts (approved 2026-10-21)

When a card's target position cannot be reached reliably in a live game, its phase
begins from a CURATED position for that lesson, material roughly carried over.
Recorded with `scenario: true`.

| family | cards |
|---|---|
| endgame theory | Lucena, Philidor, Vančura, Q vs pawn, R+B vs R, Q vs R |
| named structures (when not reached naturally) | Maroczy, IQP, hanging pawns, Carlsbad |

## 6. Coach dials

The dials: **attacks** (may the coach newly attack the student's pieces),
**the same rules** (`developRules`: the coach keeps the opening mission's rule
on its own side), **planted shots** (plant a winning chance for the student),
**steering** (pick, among moves acceptable at its level, ones that lead toward
the card's pattern), **trades**, **rewinds**, **strength**, **best play**
(`bestPlay`: the engine's best move, whatever the level). Every card answers
every dial it uses (`CoachDials` is required per card).

- **The same rules** (David 2026-10-21: "it would be fun if the opponent had to
  play by the same rules maybe?"). In Develop & Castle the coach moves no
  knight or bishop twice, unforced, and never gives up castling unforced
  (`developAndCastle.breaksDevelopRule` — the student's own rule, read off one
  board; a minor that stood attacked or captures is exempt, as it is for the
  student). It picks among the moves of its level; only when every acceptable
  reply breaks the rule does it play the least costly one (`mission-dial-forced`).
- **Best play** on the technique endings (Levels 19–24): a technique proven
  against a weak defence is not proven, and a race to the corner is only a race
  against the best attack. One bounded engine read a move (`mission-best-play`);
  with no read, the level's move stands.

Level 1 (locked): no attacks on pieces and no trades the coach starts in the opening (a recapture stays — David 2026-10-21: "took my center pawn forcing me to capture with the knight I just moved out"); attacks ON from the
middlegame; no planned trap while a mission is unresolved; one planted free piece
in the middlegame.

> **TO FILL — the per-tier dial tables (beginner and intermediate tracks, five
> tiers each).** They were agreed in the design discussion and are not in the repo
> or in WO-MISSIONS-02's text; they are NOT reconstructed here (empty > invented).
> Advanced track: silent games + bosses.

### 6a. The earned free piece (David 2026-10-21, go given)

"Make sure the piece isn't just handed over, that doesn't help anyone. It needs to
happen naturally" → "like a deeper calculation finds the winning free piece, rewind
forces the user to find it". This REPLACES the planted hanging piece (a coach
piece left capturable in one move — a hand-over).

- **Every game has one** (David 2026-10-21: "we cannot be teaching how to take
  advantage of slips and then not provide one in the game"). From the coach's
  2nd move of the card (`PLANT_FIRST_COACH_MOVE`) it looks on EVERY move until
  the slip lands — no deadline (the old 20th-move cutoff is gone) — while the
  student still has `PLANT_ROOM_MOVES` (4) moves before the card closes to play
  the shot out. Measured on the ten gate games
  (`earnedSlip.arrival.measure.test.ts`, the app's 2 s budget): a 10-line read
  found a slip in 5 games; reading every legal move, in all 10, by the coach's
  11th card move. The piece-losing slips sit below the coach's top ten moves.
- **The slip** (`src/missions/earnedSlip.ts`, built 2026-10-21). Never
  mid-exchange, the coach plays ONE of its OWN engine candidates (a read of
  EVERY legal move on its board) that:
  - costs it at least 200 cp against its best — a real mistake, the kind a player
    at its level makes — and gives no check (a check leads the student by the hand);
  - leaves NOTHING HANGING: no coach piece can be captured for a gain of 3 or more
    (legal SEE) NET of what the slip itself captured. The piece is not given; it
    has to be won. A slip that TRADES counts: …Bxd6 Nxd6+ forking the king and
    the bishop on b7 (David's game, 2026-10-21) — every material count runs from
    the board BEFORE the slip, so the recapture wins back, the fork wins.
  - is confirmed by ONE student-side read (3 lines, at most 2 slips tried): the
    student's best line wins a knight, bishop or rook (held through the coach's
    answer) after exactly `plantDepth` moves, and leaves them at +2.0 or better.
  - the two reads go first to the slips whose OWN line in the coach's read
    already shows a piece falling at `plantDepth`, then at another depth, then
    the rest; the smallest drop first within each — the most natural mistake
    reads best. (Smallest-drop-first alone spent both reads on quiet slips: on
    the gate games every piece-losing slip but three ranked 3rd or later.)
  Every refusal is counted by reason (`mission-plant` row: mid-exchange, no-slip,
  no-read, no-line, wrong-depth, not-winning).
- **Depth is a dial, and the record turns it — the SHOT gets harder, never the
  coach** (David 2026-10-21: "not the level of the coach, but the slip becomes
  more subtle … the focus gets harder to find, but is still there each game" →
  "coach still plays to match the user's level"). `plantDepth` counts the
  student's moves before the piece falls: 1 (one key move — the fork — then the
  capture), 2, 3. The card's ladder (`ladder.ts`) is `plantDepth` 1→2→3 and
  nothing else: the graduation bar at depth 1 steps the shot to depth 2, and so
  on to the graduation level; a falling rate steps the shot back, and at depth 1
  steps nothing.
- **The easier shot** (2026-10-22). A deeper shot is rarer on a real board, and
  every game must still have one: from the coach's 10th move of the card with
  no slip yet (`PLANT_EASIER_FROM_MOVE`), it plants one a key move easier. That
  game counts, but not at the dial's setting: the row carries it (`harder` one
  step down), so it never graduates the card.
- **The student has to find it.** The plant hands the check the confirmed line
  and `alts` — any other first move the read rated within 50 cp. The coach
  defends along that line (`lineReply`). A student move off it before the piece falls is a miss — the
  rewind ("Try again" undoes it); a second miss at the same decision shows the
  line's next move and plays on. Taking the piece and staying +2 passes, as today.
- **Named.** The pass line names the pattern that won it, a fixed clause per
  pattern (`SHOT_WON`, read on the slip's board): "The fork won it." / "The pin
  won it." No named pattern → the pass line alone.
- **No fallback to a hand-over.** A card that closes without a slip records
  `plantFound: false` and a `mission-plant-none` row with every scan's reasons.
  Arrival is measured on the ten-game audit before a change to the slip ships;
  the target is every game.

## 7. Boss fights

- Each tier ends in one boss game against a named personality: a fixed preset of
  move-scoring weights inside the coach's acceptable-move window.
- Bosses are the ONLY place the coach adapts to the student's weaknesses: the top
  2–3 from the record, only skills taught at or below that tier.
- Before the game, a fixed 2–3 sentence intro says who the boss is and that it will
  use the student's weaknesses against them; the recap reveals which.
- No rewinds, flags or talk during a boss game.
- Lose → rematch. Lose twice → the weakest mission reactivates for a few games first.

| tier | boss |
|---|---|
| T1 | Grabber |
| T2 | Trapper |
| T3 | Wall |
| T4 | Gambler |
| T5 | Beginner boss rush |
| T6 | Trickster |
| T7 | Architect |
| T8 | Bully |
| T9 | Escape Artist |
| T10 | Gauntlet |
| T11 | Attacker |
| T12 | Dynamo |
| T13 | Grinder |
| T14 | Mirror — built from the student's own record, steering at their three biggest weaknesses, rating +150 |

The advanced bosses climb toward the Mirror (2026-10-22): the Attacker plays 50
points above the student, the Dynamo 75, the Grinder 100, the Mirror 150. Every
other boss plays at the student's own strength.

Only the advanced track (Levels 37–50) asks the student to annotate or tap
answers as school-like tasks.

## 8. Progression

- **The on-ramp** (David 2026-10-21: "easy, beatable, same strength, the coach
  cant just kick everyones ass" → "maybe the progression for the 3 games?" →
  "it needs to be a challenge, but one that is doable"). Over a level's first
  games the coach plays easy (−200), then beatable (−100), then at the
  student's own strength: each game the student WINS steps it up one, each
  loss steps it back one, a draw or an unfinished game leaves it
  (`missionRecord.onRampOffset`, read off the saved games). It rides on top of
  the cards' dials and never enters the graduation record (`harder`).
- **The find pays at once.** A card whose target is WON before its pass
  (`found` — its moment and its own banner: "Extra piece won!" at the capture, "Outflanked!" at the K+P sidestep, "Triangulated!" when the move is handed over) fires the burst and
  its coins on that move ("Extra piece won!"); the pass celebrates again at the
  end. One reward per move: the move's own grade chime stands down.
- One mission per phase, three phases per game, each scored separately.
- Missions unlock in order within a phase.
- The LESSON steps up BEFORE a card graduates (David 2026-10-21, "both options
  are good" → "coach still plays to match the users level"): 3 first-try
  passes in the last 5 games at the card's own setting turn ONE dial of its
  ladder one step harder; 3 first-try passes in the last 5 at that harder
  setting graduate it (4 of 5 from Level 19). Only first-try passes count, and
  only at the setting they were played at — every row records it (`harder`).
  Below 75% first-try over 5 games at a setting, the dial steps back. How many
  steps a graduation needs is `STEPS_BEFORE_GRADUATION`
  (`src/missions/ladder.ts`, 1 today) until the tier tables in §6 replace it.
- **No card's ladder holds the coach's strength** (2026-10-22). The earned
  piece deepens its shot; Develop & Castle lets the coach poke the student's
  pieces (`attacksOnPieces` off → on); a card with nothing to make harder (the
  endings, whose difficulty is their board) has no ladder and graduates on its
  bar at its own setting. A strength a device saved under the old shared
  ladder is never read back (`dialState.effectiveDials` reads only the dials
  on the card's ladder).
- **The fast first climb** (2026-10-22): while every active game of a card has
  been a first-try pass, each one steps the ladder up at once — a student who
  already has the habit is not held three games at each setting. The first game
  that is anything else ends the climb. Skipping whole levels is the track
  picker's job (§9a).
- **A fortress pass ends the game** (`passEnds: 'draw'`, the wrong rook pawn):
  the result is decided, so the game is saved as a draw on the pass, never
  shuffled on to the 50-move rule.
- **Giving it back** (`gave-back-material`), one test: holding +2 coming into
  the decision, the student's move leaves less than +2 after the coach's best
  capture, another move would have held +2, and the difference is 2 or more —
  a piece left for a pawn, the exchange, a piece outright, a recapture not
  made. A pawn alone never counts, and the best of bad choices is never a
  miss. Before 2026-10-22 the test was "a capture of 3 or more left on the
  board": a bishop left for a pawn (+3 → +1) and a queen not taken back
  (+9 → 0, the prod gate game) both passed unsaid, and a student already
  behind was missed for the one move that won the queen back.
- **Material won is material HELD** (2026-10-22): off the line, a capture
  counts as the extra piece won only when the student holds +2 over the
  slip's board after the coach's best capture. Taking a knight and leaving a
  rook to be taken back used to pay "Extra piece won!".
- Graduated missions later run as SILENT WATCHERS and come back on a pattern of
  slips (2 of the last 5 games), never on one.

## 9. The mission list

One line per level: opening | middlegame | endgame.

| level | opening | middlegame | endgame |
|---|---|---|---|
| L1 | Develop & castle | Tactically win an extra piece, maintain the advantage to the end (David 2026-10-21: "it has to be extra material") | K+Q mate (no stalemate) |
| L2 | Centre first | Count before you capture | K+R mate (box) |
| L3 | Queen stays home | Knight fork | Push the passed pawn (king in front) |
| L4 | Connect the rooks | Back-rank awareness | Up a pawn, trade pieces |
| L5 | Check what's attacked | Hunt the loose piece | Opposition |
| L6 | Spot the trap | The pin | Rook behind the passer |
| L7 | Punish the early queen | Skewer & double attack | Wake up the king |
| L8 | Punish slow development | Discovery & remove the guard | Philidor (3rd rank) |
| L9 | Read the structure | Weak point, aim at it | Make a passed pawn |
| L10 | Play the break | The outpost | The outside passer |
| L11 | Isolated queen pawn | Improve your worst piece | Rook to the seventh |
| L12 | Give them a weakness | Opposite-side castling | Good knight, bad bishop |
| L13 | Break a rule only to win | The f7 sacrifice | Give it back to win |
| L14 | Gambits: take or decline | The Greek gift | Pawn breakthrough |
| L15 | Refute the unsound sac | Knight sac on d5/f5/e6 | Deflection to promote |
| L16 | Exchange sac on c3 | Clearance & deflection mates | The defender's sac |
| L17 | Weakest habit (record-chosen) | | |
| L18 | Beginner boss rush | | |
| L19 | Plan by move 10 | Candidate moves | Outflanking |
| L20 | Move-order traps | Calculate to the end | Lucena with a rook pawn |
| L21 | Punish the theory slip | The in-between move | Triangulation |
| L22 | Play the gambit | The only move | Wrong rook pawn |
| L23 | Hanging pawns | The second weakness | Opposite-coloured bishops |
| L24 | Maroczy bind | Minority attack | Cut the king off |
| L25 | Space: trade or keep | Closed centre, wing play | Queen endings |
| L26 | KID/Benoni plans | Use the bishop pair | Bishop pair in the ending |
| L27 | What do they want? | The prophylactic move | Build a fortress |
| L28 | Meet the counter-gambit | Counterattack | Perpetual check |
| L29 | Pawn for the initiative | Positional exchange sac | Pawn for activity |
| L30 | Keep the initiative | Sac to open their king | The active rook |
| L31 | Know your repertoire | Convert extra material | Connected passers vs rook |
| L32 | When theory ends | Don't hurry | Bishop vs knight, both wings |
| L33 | Offbeat sideline | Spend the lead in time | Zugzwang |
| L34 | Trade queens when it helps | Choose the transition | Win vs perfect defence |
| L35 | Weakest judgement | | |
| L36 | The Gauntlet | | |
| L37–50 | Advanced track — silent games; Tier 11 calculation, 12 imbalances, 13 squeeze & resilience, 14 the Mirror | | |

**Sibling cards** (rotate within a slot): mate patterns L4–8, key squares L5,
square of the pawn L7, Q vs pawn on the 7th L12, Lucena L16, two-bishops mate L21,
advanced motifs L20–22. Rules (Level 0) live in the Kids section, not here.

## 9a. The tracks (David 2026-10-21: "intermediates need a way to bypass the first easy levels" → "i want the intermediate and advanced campaigns done by the morning")

- **Beginner** = Levels 1–18 (Chapters 1–5), **Intermediate** = 19–36
  (Chapters 6–10), **Advanced** = 37–50 (Chapters 11–14, silent games by theme:
  calculation, imbalances, squeeze & resilience, your own record). The student
  picks a track on the map (`/coach/campaign/map`, saved as
  `preferences.campaignTrack`; absent = Beginner); the next game plays that
  track's missions only (`tracks.cardsOfTrack` → `missionForPhase`). Inside a
  track the record decides, as everywhere else.
- **A game with no mission** — the Advanced track, or a track whose next
  missions are not built yet — is a SILENT game: no coaching until it ends,
  the learned habits still watched (the runner's owned game).
- The chapter table (`campaignMap.CHAPTERS`) holds every tier's levels and its
  boss's name; a boss not built yet shows as coming, never as a broken node.

## 10. Build order

| WO | scope | status |
|---|---|---|
| WO-MISSIONS-01 | spine: card, runner, dials, record, silence gate, L1 opening (Develop & Castle); Campaign door | shipped |
| WO-MISSIONS-02 | this doc + L1 middlegame (Take the free piece, stay ahead) | shipped |
| WO-CAMPAIGN-MASTER | finish Level 1, progression, Campaign UI, patterns, the Grabber, then Levels 2–4 (§11) | in progress |
| WO-03 | L1 endgame: scenario start, eager-trades dial, K+Q mate, stalemate as a miss | |
| WO-04 | graduation + silent watchers + auto-advance (step up on the graduation bar, graduate one step harder, back below 75%; one dial at a time) | shipped |
| WO-05 | Campaign map + rename + mission briefings | |
| WO-PATTERNS-01 | pattern mining | |
| then | Levels 2–4 | |

## 11. WO-CAMPAIGN-MASTER — lanes and the shared contracts

Phase 0 (lead, merged before any lane) fixed the contracts every lane builds on:

- **Card fields** (`missionCard.ts`): `classification` and `arrivalBar` are
  required; `scenario`, `briefing`, `siblings`, `pattern`, `closesAfterMoves`
  optional. Every dial is required: `attacksOnPieces`, `plannedTrap`,
  `plantFreePiece`, `trades`, `rewinds`, `strengthOffset`, `steer`
  (`LEVEL_1_DIALS` in `registry.ts` is the Level 1 baseline; a card states only
  what it changes).
- **Id unions are declaration maps** (`MissionIdMap`, `MissReasonMap`,
  `ScenarioIdMap`, `PatternIdMap`, `BossIdMap`, `ScorerIdMap`). A lane adds its
  members from its OWN file:
  `declare module '../missionCard' { interface MissionIdMap { 'kq-mate': true } }`.
  Every `Record` keyed by a union then fails to compile until the member has
  its entry.
- **One scorer seam** (`moveScoring.ts`): `registerScorer(id, fn)` from the
  scorer's own file under `src/missions/scorers/` (loaded automatically);
  `scoreCandidates` re-ranks only moves inside the coach's acceptable window.
  Card dials map to weights (`trades`, `steer`); a boss adds its preset through
  `MissionDialsOpt.boss`. With no weight nothing is read.
- **Runner** (`missionRunner.ts`): one card per phase (`phaseCards`) plus
  silent `watchers` (one row each per game, `watcher: true`, outcome
  `pass-first-try` / `missed` / `incomplete`); a phase with no card is watched
  and hands on when its watchers finish. Events `phase-boundary`,
  `scenario-loaded`, `game-over`; effects `briefing`, `load-position` (the
  coach does not answer the move that ended the last phase), `recap`.
  `rewinds: 'none'` misses silently (`missed`). `rewinds: 'mission-only'`
  awaits David's definition and behaves as `every-miss`.
- **Pattern checks** share one shape, `PatternDefinition` (`present(fen,
  side)` + `failTwins`): Lane D writes them, the steer scorer and the boss
  scorers read them.
- **Storage** (Dexie v44): `dialState`, `bossAttempts`, `patternStats`;
  `missionResults` rows carry `scenario` and `watcher`. All in the backup.
- **Added at gate 1** (lead): every card names the skill meter it trains
  (`skill`, required) — the join a boss reads, mistake tags reaching it through
  the same meter; `ScoringContext.targets` (the boss's weakness patterns) and
  `MissionDialsOpt.boss.targets`; the runner's `start` takes `owned` so a boss
  game stays silent with nothing to teach or watch.

| Lane | Owns (edits nothing else; a shared change goes through the lead) |
|---|---|
| A Endgame + scenarios | `src/missions/checks/kqMate*`, `src/missions/scenarios/**`, `src/missions/scorers/trades.ts`, the `kq-mate` registry entry (append only) |
| B Progression | `src/missions/progression.ts`, `src/missions/dialState.ts`, `src/missions/watchers.ts`, `missionForPhase` in `registry.ts`, additions to `missionRecord.ts` |
| C Campaign UI | `src/components/Campaign/**`, nav labels, routes (`/coach/teach` stays the classic Learn), the briefing / recap / boss-intro screens |
| D Patterns | `src/missions/patterns/**`, `scripts/patterns/**`, `src/data/patterns/**`, `src/missions/scorers/steer.ts` |
| E Bosses | `src/missions/bosses/**`, `src/missions/scorers/boss*.ts`, `src/missions/weakness.ts` |
| F Levels 2–4 | new check modules + their registry entries (append only) |

Shared after Phase 0 (lead only): `missionCard.ts`, `moveScoring.ts`,
`missionRunner.ts`, `useMissionRunner.ts`, `schema.ts`, `coachGameEngine.ts`,
`CoachTeachPage.tsx`, CLAUDE.md, this file. Merge order at gate 1: B → A → E →
C → D.

