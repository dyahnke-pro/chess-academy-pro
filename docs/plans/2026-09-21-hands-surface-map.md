# Surface Map — THE HANDS: spine-driven actuators + user command routing

**The §0 pre-build gate for the actuator build.** Written before any code, per
`docs/plans/2026-09-08-unified-coach.md` §0 and the four-levels-of-context rule.
This is Phase 4 done for real — the phase the plan deferred in 2026-09-08 with
*"we won't have the right answer until I use it."* David has now used it.

## 0. Why this is a G0 break, not a deferred feature

`coachApi.ts:943` reads `choice?.message?.tool_calls?.[0]` and the app executes
it. **The model decides when the board jumps, when a move is taken back, when
the app navigates, when coach memory is cleared.** Thirteen of the fifteen
`cerebrum/` tools have zero references from `src/services/` — only the LLM can
reach them.

G0 says the LLM decides nothing. This was filed as "P4 deferred" and that was
wrong: P4 deferred building a *spine-driven takeback mechanic*, it never
licensed the model to be the sole decider of thirteen actuators.

🚨 **The tell is in the tool description itself.** `setBoardPosition` has to
instruct the model:

> *"Do NOT hand-write an opening FEN from memory — opening-phase raw FENs are
> rejected. Pass a raw `fen` ONLY for a deep middlegame/endgame position that
> came from a tool result or the user's actual game, never one you recalled."*

…backed by a validator that rejects opening-phase raw FENs at execution. G0
names that pattern exactly: *"if you are adding a validator, a gate, or a prompt
that says 'don't hallucinate' — STOP. Every one of those exists only because the
LLM is still deciding."* Both guards exist **because the model is choosing the
position**, and both become deletable when code picks it.

## 1. David's two decisions (2026-09-21)

1. **"A. Not even a question."** The spine gets hands — the decider invokes the
   actuator directly, the model does not.
2. **"The hands need to be controllable by the user through the text box."**

The second is not a complication of the first; it is what makes it coherent.

🔍 **AND IT EXPLAINS HOW THE HANDS ENDED UP LLM-OWNED.** Measured 2026-09-21:
`questionIntents.ts` carries **80 deterministic detectors and not one board
command**; `coachAgent.parseCoachIntent` has ~7 kinds, none of them takeback /
reset / set-up / flip / strength. The app can deterministically route *"what's
the best move here?"* and has never been able to route *"take that back."* So
every command had exactly one path — hand the sentence to the model.

## 2. The shape: ONE door, TWO sources of intent

```
USER TYPES  ──► deterministic command parse ──┐
                                              ├─► coachDecider validates ──► actuator
COACH DECIDES ──► earned by a computed signal ┘     (board + the student's record)
```

Neither source is the LLM. Both arrive at the same validator, so the coach can
REFUSE with a spoken reason instead of silently no-opping — which is the bug
`coachActuator` was written to kill in the first place (synthetic success).

**Where the G0 line sits, precisely:**
- The model MAY help parse language into a CLOSED SET of intent labels. That is
  language work, its actual job, and the answer space is finite and code-owned.
- The model NEVER supplies a chess value — not the FEN, not the SAN, not the
  takeback count, not the strength. Code fills every argument from the board,
  the DB, or the student's record.

Worked example, *"set me up a Lucena position"*: parse → `set-position` +
concept `lucena`; **code** resolves the FEN (`endgameTechnique.detectLucena`
already knows what a Lucena is, and the endgame lessons hold real ones);
`onSetBoardPosition(fen)`. The model never sees a FEN, so the prompt and the
validator above both go.

## 3. THE SEAM ALREADY EXISTS — extend it, do not invent a second one

`src/services/coachActuator.ts` (67 lines) is already:
- **global** — registered once at the app root (`App.tsx:141`
  `registerCoachNavigate`), reachable from `src/services/`;
- **honest** — returns `{ok:false, reason}` rather than synthetic success;
- **merged per surface** — `coachService.ask` (coachService.ts:996) builds the
  `ToolExecutionContext` by taking the surface's own callback where it exists
  and falling back to the global actuator otherwise.

That merge IS the "one hand set, many surfaces" pattern. It is only reachable
from the tool loop. **The build hoists the merge into `coachActuator` so the
spine and the tool loop resolve hands through the same resolver.** Writing a
new seam beside it would be the duplicated-constant rot this repo keeps paying
for.

## 4. The complete actuator inventory (measured 2026-09-21)

### 4a. Hands exposed as tools — 15, `src/coach/tools/cerebrum/`
Board: `playMove` · `takeBackMove` · `setBoardPosition` · `resetBoard`
Teaching: `startWalkthroughForOpening` · `quizUserForMove`
Memory: `savePosition` · `restoreSavedPosition` · `recordBlunder` ·
`recordHintRequest` · `clearMemory`
Profile/content: `setIntendedOpening` · `favoriteOpening` ·
`saveOpeningToRepertoire`
App: `navigateToRoute`

Seven actuate through `ToolExecutionContext` callbacks (`onPlayMove`,
`onTakeBackMove`, `onSetBoardPosition`, `onResetBoard`, `onNavigate`,
`onQuizUserForMove`, `onStartWalkthroughForOpening`); eight write to services
and stores directly.

### 4b. Senses exposed as tools — 8, `src/coach/tools/cerebellum/`
`stockfishEval` · `stockfishClassifyMove` · `lichessOpeningLookup` ·
`lichessMasterGames` · `lichessGameExport` · `localOpeningBook` ·
`lookupPlayerGames` · `lookupPlayerOpeningMoves`

Read-only. **No G0 issue — these stay LLM-callable.**

### 4c. 🔴 Hands that are NOT tools at all
Neither the LLM nor the spine can invoke these; they are called inline by
whichever component is rendering. Production call-site counts:

| actuator | sites | what it does |
|---|---|---|
| `setViewMode` | 24 | switches the WLPP rung |
| `setArrows` | 22 | **draws the arrows — the coach's EYES** |
| `queueSpokenHint` | 16 | schedules what Learn will say |
| `setOrientation`/`flipBoard`/`setBoardOrientation` | 19 | which way the board faces |
| `setHighlights` | 14 | **highlights the squares the narration names** |
| `markRungComplete` | 6 | advances the unlock ladder |
| `buildMistakeDrillQueue`/`startDrill`/`completeDrill` | 4 | drills on the student's own positions |
| `setDifficulty`/`resolveConfig` | 2 | **how hard the opponent plays** |

**The eyes are the sharpest.** The spine computes the squares a fact is about
(`ClauseItem.squares`, coupled at emission so subsumption can compare geometry)
and then cannot point at them: 36 inline `setArrows`/`setHighlights` calls, each
owned by whoever wrote that narration path.

**Strength is the most consequential.** `coachGameEngine:502` derives
`skillLevel` from a `targetElo`, but nothing in the deciding path sets that Elo
from the live game — while the FOUNDATION says *"strength is matched in real
time, from move one… the BOARD is the calibration,"* off the same
`capabilityEvidence` measurement that drives teaching. One detector, two
consumers, and the second consumer has no hand.

## 5. Missing actuators the loop needs

| # | actuator | why | user phrase |
|---|---|---|---|
| 1 | eyes (arrows + highlights) | Layer 3 lists it; nothing can invoke it | "show me" |
| 2 | opponent strength | the foundation's real-time calibration | "make it harder" |
| 3 | drill launch | `buildMistakeDrillQueue` reachable only from the custom lesson | "let me practice that" |
| 4 | takeback OFFER | §6.7: offer only on a weakness-matched blunder — a decider judgement | (coach-initiated) |
| 5 | taught-concept mark | the ledger nothing reads (see LEDGER task) | (coach-initiated) |

## 6. Blast radius — every consumer

**Changed:** `coachActuator.ts` (extend), `coachDecider.ts` (return actions),
`coachService.ts` (hoist the ctx merge), the 15 `cerebrum/` tools (become thin
wrappers), a NEW deterministic command parser beside `questionIntents.ts`.

**Neighbours that consume the changed computers:**
- `coachDecider` — 2 importers today: `positionFacts` (live composer: teach,
  play, phase narration, live coach, position read, opening play) and
  `coachFeatureService` (review). **Any change to its return shape reaches every
  coach surface at once.** Additive only: actions are a NEW field, never a
  change to the spoken-facts contract.
- `coachActuator` — 3 importers: `App.tsx`, `coachService`, its test.
- `registry.ts` — the tool surface; every LLM turn's prompt carries these
  schemas, so removing write-tools from the model's belt shrinks every prompt.
- `questionIntents` — governed by the LOCKED exhaustive routing audit
  (CLAUDE.md), so a new command lane owes that audit a row.
- **`/kid/*` — EXCLUDED by contract. Verify nothing threads an actuator there.**

## 7. Gates + audits owed

- `coachDecisionEmits.test.ts` — every return path emits; a returned ACTION must
  emit too, or the algo-audit rule is broken on the new field.
- `algoAuditContract.test.ts` — a new emission needs a named audit asserting a
  CONTRACT row on it.
- `surfaceContract.scan.test.ts` — components calling a fact-computer directly
  is shrink-only; registering an actuator handler must not count as one.
- NEW: an exhaustiveness gate over the action union (`Record<ActionKind, …>`) so
  a new hand fails to compile until every surface answers for it.
- NEW: a G0 gate — no write-tool may be reachable from the model's belt without
  code approving it.
- `audit-coach-all-questions-prod.mjs` — the LOCKED exhaustive routing audit;
  the command lanes join the matrix.
- `audit-concept-gameplay-prod` (interrupt) + `audit-review-overhaul-prod`
  (walk) — the two standing per-surface audits.

## 8. Open decision for David

**Refuse-vs-obey on an explicit user command.** When the student types "take
that back" and the spine judges it a bad idea (undoing past the position a drill
is teaching from), should it refuse and say why, or obey and volunteer its
opinion?

**Proceeding on OBEY-THE-USER** unless David says otherwise: an explicit command
is executed, refusal is reserved for the genuinely impossible (no board, nothing
to undo, illegal), and the coach may volunteer an opinion after acting. A coach
that overrides you on your own board gets annoying fast, and the spine's
judgement is what drives COACH-INITIATED actions — not a veto over yours.

## 9. Build order

1. This map. *(you are here)*
2. `coachActuator` extended to the full hand set + the resolver hoisted.
3. `coachDecider` returns actions; emission + gate.
4. The deterministic command parser + its lanes.
5. The five missing actuators.
6. Tools inverted to thin wrappers; the prompt/validator in `setBoardPosition`
   deleted.
7. Audits.
