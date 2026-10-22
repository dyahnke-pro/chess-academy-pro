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
| arrival rate | how often its target position or plant actually occurs in audit games — ≥ 60%, or the card's own stated bar (Take the free piece: 80%) |
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
**planted shots** (plant a winning chance for the student), **steering** (pick,
among moves acceptable at its level, ones that lead toward the card's pattern),
**trades**, **rewinds**, **strength**. Every card answers every dial it uses
(`CoachDials` is required per card).

Level 1 (locked): no attacks on pieces in the opening; attacks ON from the
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

- **The slip** (`src/missions/earnedSlip.ts`, built 2026-10-21). On the coach's
  2nd–20th move of the card (`PLANT_WINDOW`; 2nd–8th arrived in 2 of 5 prod games, ~8% a move — widened per the arrival rule below), never mid-exchange, the coach may
  play ONE of its OWN engine candidates (a 10-line read of its board) that:
  - costs it at least 200 cp against its best — a real mistake, the kind a player
    at its level makes — and gives no check (a check leads the student by the hand);
  - leaves NOTHING HANGING: no coach piece can be captured for a gain of 3 or more
    (legal SEE). The piece is not given; it has to be won.
  - is confirmed by ONE student-side read (3 lines, at most 2 slips tried): the
    student's best line wins a knight, bishop or rook (held through the coach's
    answer) after exactly `plantDepth` moves, and leaves them at +2.0 or better.
  - the smallest drop first — the most natural mistake reads best.
  Every refusal is counted by reason (`mission-plant` row: mid-exchange, no-slip,
  no-read, no-line, wrong-depth, not-winning).
- **Depth is a dial, and the record turns it.** `plantDepth` counts the student's
  moves before the piece falls: 1 (one key move — the fork — then the capture), 2,
  3. It sits on the card's ladder (`ladder.ts`): the graduation bar at depth 1
  steps the coach to depth 2, and so on to the graduation level. The card carries
  its own ladder — `plantDepth` 1→2→3, then the coach's strength — so the shot
  gets deeper before the coach gets stronger.
- **The student has to find it.** The plant hands the check the confirmed line
  and `alts` — any other first move the read rated within 50 cp. The coach
  defends along that line (`lineReply`). A student move off it before the piece falls is a miss — the
  rewind ("Try again" undoes it); a second miss at the same decision shows the
  line's next move and plays on. Taking the piece and staying +2 passes, as today.
- **Named.** The pass line names the pattern that won it, a fixed clause per
  pattern (`SHOT_WON`, read on the slip's board): "The fork won it." / "The pin
  won it." No named pattern → the pass line alone.
- **No fallback to a hand-over.** No slip found in the window records
  `plantFound: false`. The arrival bar (80%) is measured on the ten-game audit
  before it ships; if it falls short, widen the window first.

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

Only the advanced track (Levels 37–50) asks the student to annotate or tap
answers as school-like tasks.

## 8. Progression

- One mission per phase, three phases per game, each scored separately.
- Missions unlock in order within a phase.
- The coach steps up BEFORE a card graduates (David 2026-10-21, "both options
  are good"): 3 first-try passes in the last 5 games at the card's own setting
  turn ONE dial one step harder; 3 first-try passes in the last 5 at that
  harder setting graduate it (4 of 5 from Level 19). Only first-try passes
  count, and only at the setting they were played at — every row records it
  (`harder`). Below 75% first-try over 5 games at a setting, the dial steps
  back. How many steps a graduation needs is `STEPS_BEFORE_GRADUATION`
  (`src/missions/ladder.ts`, 1 today) until the tier tables in §6 replace it.
- Graduated missions later run as SILENT WATCHERS and come back on a pattern of
  slips (2 of the last 5 games), never on one.

## 9. The mission list

One line per level: opening | middlegame | endgame.

| level | opening | middlegame | endgame |
|---|---|---|---|
| L1 | Develop & castle | Take the free piece, stay ahead | K+Q mate (no stalemate) |
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

