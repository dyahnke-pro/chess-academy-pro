# Lane ADV — the advanced track's bosses (2026-10-22, overnight)

Branch `lane-adv` (not pushed). Files: `src/missions/bosses/**`,
`src/missions/scorers/boss*.ts`. `weakness.ts` NOT edited.

## What shipped

| boss | tier | closes levels | personality (scorer, weight) | strength | opens |
|---|---|---|---|---|---|
| The Attacker | 11 calculation | 37–40 | `kingPressure` +1 (new) | student's own | from the start of the track |
| The Dynamo | 12 imbalances | 41–44 | `imbalance` +1 (new) | student's own | once the Attacker is beaten |
| The Grinder | 13 squeeze & resilience | 45–48 | `simplify` +1 (new), `trades` −1 (existing) | student's own | once the Dynamo is beaten |
| The Mirror | 14 | 49–50 | none of its own | **+150** (`strengthOffset`) | once the Grinder is beaten |

Every boss also carries `targets` +1 (the student's weakest taught habits,
§7), `rewinds: 'none'`, nothing planted, no planned trap. Levels are the
lead's table. Ids `attacker` / `dynamo` / `grinder` / `mirror` join
`BossIdMap` from each preset's own file; `BOSSES` has all five.

**New scorers** (pure chess.js + the legal SEE, no engine; all re-rank only
inside the coach's acceptable window, so no boss plays below its level):
- `kingPressure` — sign of the change in attacks the coach has on the squares
  around the student's king (`keySquares.kingZoneSquares`, every attacker
  counted; the king's own square excluded, so a check is not pressure).
- `imbalance` — +1 an even (SEE net 0) bishop-for-knight / knight-for-bishop
  trade; −1 STARTING an even like-for-like trade (a recapture nets the piece,
  never 0, so it scores 0); 0 otherwise.
- `simplify` — +1 an even trade of PIECES while the coach is ≥ +100 cp;
  pawn trades, wins and anything not ahead score 0. Its "behind" half is the
  existing `trades` scorer at −1, not a copy.

Tests: `scorers/bossAdvanced.test.ts` (13: every scorer's positives, fail
twins — Bxf7+ is a check but no zone pressure; a recapture of the same kind;
a bishop winning a loose knight; a pawn trade; one centipawn short of ahead —
the Grinder's two halves, the window, illegal moves) and
`bosses/advancedBosses.test.ts` (15). Every board is reached by legal moves
with chess.js; the SEE nets are asserted, not assumed. No claim needed
Stockfish (no position is said to win/draw), so no engine was run.

## The Mirror's targets

`rankWeaknesses` (unchanged) over every card taught **at or below** the boss's
highest level (`bossTargetCards`) — §7's rule and `weakness.ts`'s own header.
`loadBossTargets` used to pass only the chapter's own cards (`bossCards`),
which gave every silent chapter ZERO targets forever. The Grabber's set is
identical (Levels 1–4 either way); a future T2–T5 beginner boss will now read
Levels 1..N, as the spec says.

Tested on fixture records: three weakest of five, weakest first, a Level-51
card never read; a habit never played as a mission still counts through its
skill meter (the wider record — capability evidence + mistake tags — reaches a
card through `card.skill`); an empty record → no targets, nothing steered,
and the intro says so.

**Honest intros.** Each preset now has a REQUIRED `introNoTargets`;
`bossIntroFor(preset, targets)` promises the hunt only when a target has a
pattern the `targets` scorer can steer at. Found while doing this: the
Grabber said "it's studied your games: it will go after your weak spots" on a
fresh record. Its no-target line is David's sentence with that clause cut.
**On today's registry no card has a steerable pattern** (Develop & Castle has
none; the free piece is never steered), so every boss says its no-target
intro until cards with patterns land.

## The gate for a chapter with no cards

`BossPreset.opens` (REQUIRED): `{ kind: 'missions' }` (the Grabber — the old
rule, unchanged and tested) or `{ kind: 'after-boss', after }`. The Attacker
is open from the start; each next boss opens once the one before it has a
WON attempt in `bossAttempts`. A loss, a draw, or a win over a different boss
opens nothing. `bossUnlocked(preset, record, source, attempts = [])`.

## For the lead (shared files I did not touch)

1. **Pass `attempts` to `bossUnlocked`** — `CoachTeachPage.tsx:2667` and
   `:2682` (`bossUnlocked(preset, record, MISSIONS, attempts)`) and
   `campaignMap.ts:96` (`…, source, attempts)`). Until then only the Attacker
   can open. Then make the parameter required.
2. **Use `bossIntroFor(preset, targets)`** in place of `preset.intro` at
   `CoachTeachPage.tsx` (the `speakLearn` call and the `BossIntro` prop).
3. **The map**: `CHAPTERS` is derived from `BOSSES`, so four advanced chapters
   now render with three empty "coming" phase slots per level (37–50 are
   silent games, and `LEVEL_TITLES` stops at 4), and the Attacker shows
   "ready" to every student until the track choice filters it.

## Open questions for David

- Strength: only the Mirror's +150 is specified. The other three play at the
  student's level. Harder?
- The Dynamo and the Grinder are my reading of their tiers' themes (an
  imbalance-maker; trade down ahead, hold on behind). Keep or redefine.
- Should the Attacker wait on the Gauntlet (T10) for a student who came up
  through intermediate? Today it does not.
- Two lost Mirror games send the student back to practise its weakest target,
  which can be a Level 1 mission (§7 as written).

## NOT BUILT

- **The Mirror reading the wider record directly** (a weak skill no built card
  trains — e.g. calculation, planning). Needs: a target not keyed by
  `MissionId` (`WeaknessTarget.cardId`, `BossAttemptRecord.targeted` in
  `missionCard.ts`) and a skill-meter → pattern table to steer at. Design, not
  computed fact; not invented tonight.
- The advanced track's "annotate or tap answers" school-like tasks (§7): no
  definition exists.
