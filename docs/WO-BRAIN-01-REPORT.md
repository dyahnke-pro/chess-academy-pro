# WO-BRAIN-01 — Final Report (the four missing items)

**PR:** https://github.com/dyahnke-pro/chess-academy-pro/pull/321
**Squash commit on main:** `a855827`
**Branch:** `claude/coach-position-narration-QEUmx`

---

## 1. `tree src/coach/` — actual structure

```
src/coach/
├── __tests__/
│   ├── coachService.test.ts
│   ├── envelope.test.ts
│   └── ping.integration.test.ts
├── coachService.ts
├── envelope.ts
├── providers/
│   ├── anthropic.ts
│   ├── deepseek.ts
│   └── types.ts
├── sources/
│   ├── identity.ts
│   ├── liveState.ts
│   ├── memory.ts
│   └── routesManifest.ts
├── tools/
│   ├── cerebellum/
│   │   ├── lichessMasterGames.ts
│   │   ├── lichessOpeningLookup.ts
│   │   ├── lichessPuzzleFetch.ts
│   │   ├── stockfishClassifyMove.ts
│   │   └── stockfishEval.ts
│   ├── cerebrum/
│   │   ├── clearMemory.ts
│   │   ├── navigateToRoute.ts
│   │   ├── playMove.ts
│   │   ├── recordBlunder.ts
│   │   ├── recordHintRequest.ts
│   │   ├── requestHintTier.ts
│   │   ├── setIntendedOpening.ts
│   │   └── speak.ts
│   └── registry.ts
└── types.ts
```

Plus the related files outside `src/coach/`:
```
src/data/appRoutesManifest.ts            (~36 routes, hand-maintained)
src/services/appAuditor.ts               (5 new audit kinds: coach-brain-*)
supabase/migrations/0003_coach_memory.sql  (table + RLS for future sync)
```

Matches the WO spec verbatim. Every named file is present at the named path.

---

## 2. Demo envelope — captured from a real ping call

Captured by running `assembleEnvelope` + `formatEnvelopeAsSystemPrompt` + `formatEnvelopeAsUserMessage` against the real spine, with `intendedOpening = "Caro-Kann Defense"` set in memory and the input:

```ts
{
  surface: 'ping',
  ask: 'Say hello and tell me what opening I have set as intended.',
  liveState: { surface: 'ping', currentRoute: '/coach/play' },
}
```

### System prompt (rendered by `formatEnvelopeAsSystemPrompt`)

```
You are Danya — the chess coach who lives inside Chess Academy Pro. You are the SAME coach across every surface of the app: home dashboard, game chat, move selection, hints, phase narration, review. The student talks to one of you, not five.

How you speak:
- Warm, present, direct. Like a coach leaning over the student's shoulder, not a textbook.
- Spell piece names out: knight, bishop, rook, queen, king, pawn. Never the single-letter shorthand.
- One coach voice. Never gushing, never punitive. Honest about what's good and what's not.

How you think:
- Memory is sacred. The student has told you things — opening preferences, hint requests, blunder patterns. Bring them up when relevant.
- The app is your body. You know every route, every feature, every opening section. When the student wants to go somewhere, you take them.
- Cerebellum is your tool, not your boss. Stockfish and Lichess give you data; YOU decide what to say.

How you act:
- Use tools when they help. Don't narrate tool calls — just act.
- When the student commits to an opening, you commit to it too. Play it.
- When the user says "forget that," you forget it.
- When asked a question, answer the question — don't volunteer paragraphs the student didn't ask for.

[App map]
- / — Home Dashboard
- /coach/play — Play with the Coach
- /coach/chat — Chat with the Coach
- /coach/analyse — Analyse a Position
- /coach/plan — Coach Session Plan
- /coach/train — Coach Training
- /coach/session/:kind — Coach Session
- /openings — Opening Explorer (openings: Italian Game, Vienna Game, King's Indian Defense, Queen's Gambit, Sicilian Defense, Caro-Kann Defense, French Defense, London System…)
- /openings/:id — Opening Detail
- /openings/pro/:playerId — Pro Player Repertoire
- /openings/pro/:playerId/:id — Pro Player Opening
- /tactics — Tactics Hub
- /tactics/profile — Tactical Profile
- /tactics/classic — Classic Puzzles
- /tactics/adaptive — Adaptive Puzzles
- /tactics/mistakes — My Mistakes
- /tactics/weakness — Weakness Puzzles
- /tactics/weakness-themes — Weakness Themes
- /tactics/drill — Tactic Drill
- /tactics/setup — Tactic Setup
- /tactics/create — Create a Tactic
- /tactics/lichess — Lichess Puzzles
- /weaknesses — Game Insights
- /games — Game Database
- /games/import — Import Games
- /settings — Settings
- /settings/onboarding — Onboarding
- /debug/audit — Audit Log
- /kid — Kid Mode
- /kid/journey — Kid Journey
- /kid/fairy-tale — Fairy Tale Chess
- /kid/queen-games — Queen Games
- /kid/rook-games — Rook Games
- /kid/knight-games — Knight Games
- /kid/king-escape — King Escape
- /kid/king-march — King March
- /kid/mini-games — Kid Mini-Games
- /kid/play-games — Guided Kid Games
- /kid/puzzles — Kid Puzzles

[Toolbelt]
You can call tools by emitting a tag in your response: [[ACTION:tool_name {"arg1":"val1"}]]
Tags are parsed out before the user sees the response. Call multiple tools in one turn if needed.
Available tools:
- stockfish_eval: Run Stockfish on a FEN at a chosen depth. Returns centipawn eval, best move, and the top principal variation. Read-only — does not change the game state.
    args: { fen: string, depth?: number }
- stockfish_classify_move: Classify a single move as blunder/mistake/inaccuracy/good/excellent/book. Provide FEN before the move and the move in SAN or UCI.
    args: { fenBefore: string, move: string }
- lichess_opening_lookup: Look up the opening at a given FEN. Returns ECO code, opening name, and the top candidate moves with their amateur-database frequency.
    args: { fen: string }
- lichess_master_games: Master-database stats for a FEN: top moves played by titled players, their frequency, and sample top games when available.
    args: { fen: string }
- lichess_puzzle_fetch: Fetch a Lichess puzzle by theme (fork, pin, skewer, mate-in-2, etc.) and student rating. Returns puzzle FEN + best move + theme tags.
    args: { theme: string, rating?: number }
- navigate_to_route: Navigate the user to a route in the app. Pass the exact path from the [App map] block. Returns success with the resolved path; the actual navigation lands when WO-BRAIN-03 wires this to react-router.
    args: { path: string }
- set_intended_opening: Commit the coach to playing a named opening. Persists across games and sessions until cleared. Use when the user asks the coach to play a specific opening.
    args: { name: string, color: string, surface?: string }
- clear_memory: Clear a scope of coach memory. Use when the user says things like "forget that" or "play anything." Scopes: intended-opening (drops the active opening commitment), conversation (clears recent chat), all (everything).
    args: { scope: string }
- play_move: Make a move in the live game on the coach's behalf. Stub today; lands in WO-BRAIN-04 when the move selector migrates through the brain.
    args: { san: string }
- speak: Speak text aloud to the student. Stub today — lands in WO-BRAIN-05 when narration migrates through the brain.
    args: { text: string, urgency?: string }
- request_hint_tier: Escalate the hint tier on the live game. Stub today — lands in WO-BRAIN-05 when the hint system migrates through the brain.
    args: { tier: number }
- record_hint_request: Log a hint request to coach memory. Captures position, tier, best move, and game id so cross-game patterns can surface later.
    args: { gameId?: string, moveNumber?: number, ply?: number, fen: string, bestMoveUci: string, bestMoveSan: string, tier: number }
- record_blunder: Log a blunder pattern to coach memory (FEN, move, classification). Used so the coach can surface recurring blunder themes across games.
    args: { fen: string, move: string, classification: string, gameId?: string }
```

### User message (rendered by `formatEnvelopeAsUserMessage`)

```
[Coach memory]
- Intended opening: Caro-Kann Defense (color: black; captured from: integration-test)

[Live state]
- Surface: ping
- Current route: /coach/play

[Ask]
Say hello and tell me what opening I have set as intended.
```

(No PII in the dump — `capturedFromSurface: 'integration-test'` is the surface label, not user data. `[Recent conversation]` and `[Recent hint requests]` sections are absent because those slots were empty in this run; they would render the most-recent N entries when populated.)

---

## 3. Self-verification answers

### Q1. Why does every `coachService.ask` read all four sources of truth, even if a particular call seems like it doesn't need them?

Because the constitution defines "the unified coach" as the coach that ALWAYS has the same situational awareness, regardless of which surface is calling. If a surface skipped memory, that call's coach wouldn't know about the opening intent the user set 30 seconds ago in the home chat. If a surface skipped the routes manifest, the coach couldn't take the user anywhere when asked. A "partial envelope" call is by definition a different coach from the next "partial" call — which is exactly the drift the constitution forbids. The envelope assembler throws when any of the six parts is missing precisely so this can't degrade silently. It feels like overhead on a question like "what's the eval here?" but the cost is one cheap snapshot read per source; the cost of letting one surface be a different coach is the entire "same person, all the time" promise.

### Q2. Why are cerebellum tools (Stockfish, Lichess) read-only and never decision-makers, even though Stockfish "decides" what the best move is?

Stockfish reports a centipawn evaluation and a principal variation; those are facts about the position, not opinions about what the student should do or what to say next. Whether the coach plays the engine's best move, plays a known-Caro-Kann move that's eval-neutral, recommends the engine move to the student, or stays silent — those are coaching decisions that depend on memory (does the student want the Caro-Kann?), context (is this a teaching moment or a real game?), and identity (Danya frames it differently than Fischer would). The cerebrum (LLM) makes those decisions; the cerebellum provides numbers. Conflating the two is how you get a coach that parrots the engine instead of teaching. Keeping the boundary clean also makes the personality-pack feature trivial later: swap identity, keep cerebellum, get a different coach reasoning over the same numbers.

### Q3. The home dashboard chat and the in-game chat are two different surfaces. After this spine is built (but before Phase 2 migrates them), do they share memory? Why or why not?

YES at the data layer; NO at the prompt layer.

They both write `intendedOpening` through the existing `tryCaptureOpeningIntent` helper, which goes to `useCoachMemoryStore` — same store, same Dexie row. So the underlying memory IS already shared. Set the Caro-Kann from the home drawer today, navigate to the Coach tab, the in-game chat reads the same memory.

But neither surface calls `coachService.ask` yet. They each build their own context block (different routes-manifest awareness, different identity prompt, different toolbelt) and dispatch their own LLM call. So while they both see the SAME `intendedOpening` value, they speak with different VOICES — the drift the constitution forbids. Phase 2 (`WO-BRAIN-02`) fixes that by routing the in-game chat through `coachService.ask`, then Phase 3 (`WO-BRAIN-03`) does the home chat. Once both surfaces assemble identical envelopes from the same four sources every time, the coach's response style and awareness are identical too. The data layer was unified by UNIFY-01; the prompt layer is what BRAIN-02+ unifies.

---

## 4. Anything punted (every shortcut, every TODO, every "we'll come back to this")

### Code-level punts (in source comments + audit logs)

1. **Theme-based Lichess puzzle fetch** (`tools/cerebellum/lichessPuzzleFetch.ts`)
   No existing wrapper for theme-filtered puzzles in the codebase. App has only `fetchLichessDailyPuzzle` and personal-dashboard fetches. The tool returns `{ ok: true, result: { unavailable: true, reason } }` so the LLM can route around it. **Follow-up:** server proxy to Lichess `/api/puzzle` or client-side theme filtering on the imported corpus.

2. **Real-time Supabase coach-memory sync** (`sources/memory.ts`, `supabase/migrations/0003_coach_memory.sql`)
   The migration creates the table + RLS policies. Runtime reads/writes still go through UNIFY-01's Dexie-backed Zustand store. The constitution says Supabase is the source of truth; today Dexie is. **Follow-up:** wire bidirectional sync between the store and the new table, matching `syncService.ts`'s debounced pattern.

3. **`record_blunder` synthesizes a conversation entry** (`tools/cerebrum/recordBlunder.ts`)
   UNIFY-01's `blunderPatterns` schema field exists but had no dedicated store action. The tool appends a `surface: 'blunder'`-tagged conversation entry so the audit captures the event. **Follow-up:** add a real `recordBlunderPattern` store action with cross-game aggregation, swap the tool to use it.

4. **Stub side-effect cerebrum tools**
   `navigate_to_route` validates path existence + logs but doesn't actually navigate (BRAIN-03).
   `play_move` logs but doesn't move (BRAIN-04).
   `speak` logs but doesn't speak (BRAIN-05).
   `request_hint_tier` logs but doesn't escalate (BRAIN-05).
   Each becomes real in its phase WO. The tool definitions are final; only the executors are stubs.

5. **Tool-call protocol uses `[[ACTION:]]` tags, not provider-native function calling**
   Codebase already has a battle-tested tag parser (`coachActionDispatcher.ts`); spine v1 reuses it so this WO doesn't have to add Anthropic-tool-use or DeepSeek-function-call support to providers. The `Provider` interface returns parsed `toolCalls` regardless of on-the-wire format, so the swap to native function calling is isolated to providers (one swap per provider, no surface-side changes).

6. **Single round-trip dispatch** (`coachService.ts`)
   `coachService.ask` dispatches tool calls but does NOT loop back to the LLM with tool results. Tool results are audit-logged; if the LLM needs to react to a result, the calling surface dispatches a follow-up `ask`. **Follow-up:** multi-turn tool loops once we know how often surfaces actually need them. Keeping it single-pass for now means simpler reasoning about cost and timing.

7. **No `COACH_PROVIDER` env-var coverage in tests**
   Tests inject the provider via `providerOverride`. The real env-var-driven selection works (verified by code reading) but isn't covered by an automated test. **Follow-up:** add a small env-var resolver test to `coachService.test.ts`.

8. **Identity has only Danya populated**
   `loadIdentityPrompt('kasparov' | 'fischer')` falls through to Danya with a console warning. **Follow-up:** dedicated personality packs — different voice, different style guides, same architecture.

### Test-coverage punts

9. **Cerebellum tools not unit-tested in this WO.** Their internals (Stockfish + Lichess) ARE tested in their own modules (`stockfishEngine.test.ts`, `lichessExplorerService.test.ts`). The thin wrappers are exercised end-to-end by the spine tests. A dedicated per-tool test file is clean to add but didn't ship in the 3-test budget.

10. **No live-provider smoke test in CI.** `ping.integration.test.ts` runs against a mocked provider. Manual verification path is documented in the PR (DevTools console snippet) but isn't automated. Reasoning: real DeepSeek calls cost real money + tokens per CI run; a contract test is enough.

### Observability punts

11. **Tool-call latency not instrumented.** Each `coach-brain-tool-called` audit captures success/failure but not duration. Useful when we start tuning Stockfish timeouts under brain-driven workloads. **Follow-up:** add `durationMs` to the audit payload.

12. **Provider response raw payload shape is `unknown`.** The `ProviderResponse.raw` field is `unknown` so each provider can stash whatever helps debugging. Today both providers stash `{ fullResponse: raw }`. A typed shape would let consumers inspect raw safely; left loose so the abstraction can absorb provider-specific fields without forcing schema changes.

### Lint / build housekeeping

13. **5 file-level `eslint-disable` directives** narrowed to specific rules per file. `@typescript-eslint/no-base-to-string` and `@typescript-eslint/no-unnecessary-condition` are blanket-disabled in tool files because `Record<string, unknown>` arg parsing legitimately uses patterns the strict rules flag as redundant. This is a targeted, file-scoped concession; not a global rule loosening.

14. **Total lint count went 320 → 324 (+4).** The +4 is the pre-existing `parserOptions.project` parser-infrastructure error that hits every `.test.ts` file in the repo (3 new tests + 1 minor carry). Not a code-quality regression. The repo's ESLint config has known issues with `tsconfig.app.json` not including test files; fixing that is out of scope for this WO.

---

## Phase boundary

Spine is callable. **No surface uses it yet.** Phase 2 (`WO-BRAIN-02`) migrates the in-game chat as the proof-of-pattern. Phases 3–6 follow in order per `docs/COACH-BRAIN-00.md` §"The Build Order".
