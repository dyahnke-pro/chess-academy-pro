# The Coach Tab — complete feature map (what it is, what it does, what it answers)

**Purpose.** A soup-to-nuts map of the `/coach/*` surface: every route, every
interactive surface, every question the chat can answer, every tool the coach
can invoke, the voice/personality/verbosity contract, and the learning loop.
This is a REFERENCE artifact — how the coach is wired TODAY, spare no detail.

Companion docs: `docs/coach-system-map.md` (the architecture/wire locations),
`docs/plans/2026-09-08-unified-coach.md` (the vision + gaps we're building
toward). Grounding law lives in `CLAUDE.md` (G0: the LLM decides nothing, it
voices facts computed in code; G3: no invented chess content).

---

## 0. The one-sentence model

**Code computes chess facts → a code SPINE selects/orders which facts matter for
THIS student in THIS position → a phrasing chokepoint (`voiceFacts`,
coachApi.ts:2487) turns the selected facts into the house voice → actuators
(voice + board-control + arrows/highlights) deliver it.** The LLM is only the
phraser. Everything upstream is deterministic code. The coach speaks in TWO
registers — **review** (retrospective, your game) and **in-game/watch/learn**
(present-tense as a line plays) — and ONE perspective: you/your (student),
they/their (opponent), never we/our.

---

## 1. Routes — the whole `/coach` surface

All declared in `src/App.tsx` (~514–696). No `router.tsx`. Pages in
`src/components/Coach/`. The LLM coach can navigate anywhere via
`CoachActuatorBridge` (App.tsx:138) + `navigate_to_route`.

| Route | Component | What it is |
|---|---|---|
| `/coach` → `/coach/home` | `CoachPage`→`CoachHomePage` | The hub: search bar + tile grid + "Talk to Coach" |
| `/coach/play` | `CoachGamePage` (~5.3k lines) | Play a full game vs adaptive Stockfish; coach silent-until-asked |
| `/coach/teach` | `CoachTeachPage` (~13.4k lines) | **Learn with Coach** — the canonical voiced teaching classroom |
| `/coach/chat` | `CoachChatPage` | Standalone text/voice Q&A through the full spine |
| `/coach/review` | `CoachReviewListPage` | Pick a past game to review (filters: All/vs Coach/lichess/chess.com) |
| `/coach/review/:gameId` | `CoachReviewSessionPage`→`CoachGameReview` (~4.6k lines) | Ply-by-ply guided review; also the post-game review inside Play |
| `/coach/analyse` | `CoachAnalysePage` | Drop a FEN / play a board → Stockfish eval + grounded explanation |
| `/coach/plan` | `TrainingPlanRolodexPage` | Favorited openings as a rolodex + "today's reps" drills |
| `/coach/train` | `CoachTrainPage` | Older "Today's Training" recommendation list |
| `/coach/endgame` | `CoachEndgamePage` | 7-tab endgame surface (Mating/Principles/Pawn/Rook/Drawn/Eval Lab/Your Games) |
| `/coach/endgame-trainer/:lessonId` | `EndgameTrainerPage` | Tablebase drill of a technique (Lucena, opposition…), can drill your OWN endgame `?fen=` |
| `/coach/fundamentals` | `FundamentalsPage` | 7 fundamentals phases + personalized scorecard (Listen/Learn/Drill) |
| `/coach/library` | `CoachesLibraryPage` | Public-domain master books read aloud with living boards |
| `/coach/pro-games` | `ProGamesPage` | Rewatch how a pro plays an opening (2,200-game corpus) |
| `/coach/session/:kind` | `CoachSessionPage` | Dispatcher: `middlegame`/`explain-position`/`practice`/`narrate`; `play-against`→Play, `walkthrough`→teach, `puzzle`→tactics |
| `/coach/report` → `/weaknesses` | (redirect) | Legacy alias → Game Insights |
| `/coach/academy` → `/coach/library` | (redirect) | — |

**Neighbors the coach deep-links into:** `/weaknesses` (Game Insights),
`/openings/*` (explorer, SRS, opening detail, pro), `/tactics/*` (adaptive,
classic, drill, mistakes, calculation, weakness-themes, opening-traps).

**Nav:** bottom bar = Home / Openings / **Coach** / Weaknesses / Tactics (Kids &
Settings on desktop only). Every board surface has its own inline Chat button;
the global chat FAB is OFF. `GlobalCoachDrawer` (mic auto-listen) is app-wide.

---

## 2. The three core interactive surfaces

### LEARN — `/coach/teach` (present-tense voiced teaching)
The classroom. Student types ("Teach me the Italian", "drill Vienna", "punish
lines for the Vienna", "how does Magnus play the Najdorf") or taps the picker
bar (**Teach me / Drill / Quiz me on / Trap lines for / Play / How a pro plays**
— 8 bundled pros as chips + free-text Lichess username).

The walkthrough state machine (`useTeachWalkthrough`) owns chess.js; the board
is read-only. Phases: `idle · choose-mode · narrating · fork · trap-prompt ·
trap-playing · gem-picker · gem-playing · leaf · paused · stage-menu · quiz ·
drill`.

- **Voice-gated auto-advance** — linear beats advance only when the voice
  promise resolves (never outruns its narration, never repeats).
- **Arrows + highlights in time with voice** — orange move trail (last 3 plies),
  green vision arrows, yellow key-square highlights on the squares the prose
  names.
- **Forks** — a branch point pauses and the coach ASKS out loud ("bishop f4 or
  knight c3?"); no auto-advance; sideline picks get a comparative bridge for
  returning students.
- **Delta asides** on quiet moves — draws the engine threat the move created, a
  gem crush, or the forward plan, as arrows on the static board.
- **Inline trap prompts** — when the walked path matches a punish lesson, the
  coach interrupts ("a common mistake here is Nxf8 — want to see it?"); accept
  animates inaccuracy→punishment→followup and plays the advantage out.
- **Baked gem picker** — tiles that gray out as watched; play all / play one.
- **Leaf** — Watch the middlegame & endgame · Continue learning (stage menu) ·
  Play the line you just learned (in-page `OpeningPlayMode` locked to the exact
  SANs).
- **Stage menu** — Trap lines (punish) · Find the move (answer by moving the
  piece) · Quiz (MC) · Drill (woodpecker, wrong move → grounded "why" + plays
  the better line out) · Dive deeper into a variation · Play it for real · Watch
  again · End. Stages background-generate; picking one not ready parks a pending
  jump that resolves when it merges.
- **Teaching ledger** — each visit speaks a recap ("last time X, today we add
  Y"); custom lessons built over the student's weakness tags ("build my full
  lesson").
- Controls: color, pace, Chat, coach-tips, hint, read-position, board nav,
  takeback, restart, resign. `/clearcache` wipes cached openings.

### PLAY — `/coach/play` (silent by contract)
A full game vs an adaptive Stockfish bot. **The coach does NOT volunteer chess
talk during a game** (`useLiveCoach` is mounted but hard-disabled — Play is a
pure playing surface). Pregame: color, time control (real clock), difficulty
(easy/medium/hard → target ELO). The opponent consults masters DB → Lichess →
Stockfish and can inject a **taught-slip** so the student meets their own hole.

The only unprompted voice is **phase-transition narration** (opening→middlegame→
endgame): a grounded teaching beat (position-tier corpus note + engine deep
look-ahead threat), never an eval readout or "best move is O-O". Otherwise:
- **Blunder interception** — a student blunder PAUSES the game with a grounded
  why + Continue / Takeback / Try `<best>`.
- **Coach Tips** (opt-in) — a tactic-preview bubble with Show (step the line) and
  Explore-Ahead (make moves freely, get engine eval + coach reactions).
- On-demand: Hint (3-tier ladder) · Why? (grounded best-move) · Read this
  position · Takeback · Ask (voice mic — can play/takeback/reset by voice) ·
  Restart · Resign · full chat panel.
- Game over → **Review Game →** mounts `CoachGameReview` inline; `finalizeGame`
  persists the game + fires thinking-errors capture.

### REVIEW — `/coach/review/:gameId` (retrospective)
Replays a finished game ply-by-ply, narrating what happened and stopping to quiz
the student at their REAL mistakes. Runs at MultiPV 8 (vs live 3). Narration is
a heavily "say-once" engine — each fundamental/structure/tactic/plan/verdict
fires once per game and only when it adds something (uncapped in "Deep Review
Detail" mode).
- **Playback:** ▶/⏸ auto-play · ◀/▶ step · ⏭ next key moment · narration banner ·
  voice toggle · Ask toggle. The board is FREE — moving any piece explores
  (engine-graded, narrated, engine replies with its best move); no "explore"
  button.
- **Diagnostic cards** (each pauses; forward always dismisses+advances):
  - **Find-the-shot** — "you had something here, find it" + hint ladder (piece →
    square → move).
  - **Spot-the-sequence** — play the follow-up line out; a verified fall-off logs
    a calculation-depth misconception.
  - **Blunder rewind** — "go back to the last holdable moment?" → hold challenge.
  - **Turning point** — "where did this game turn?" chips preview then commit;
    reveal appends the computed hinge.
  - **Trap card** — "this piece looks free — take it or leave it?".
  - **Show me better move** (button) — plays the engine's better line out with a
    per-move why.
  - **Opening Theory lecture** — masters-DB tour of mainline/sidelines, watch the
    cited story game, explore an untaken line, model-game cameos.
  - **Ask about position** — real chat grounded on the current ply; optional
    reading challenge.
- **Learning loop:** auto-enrolls this game's mistakes into My Mistakes
  (idempotent), fills the thinking-errors bucket, feeds the weakness spine,
  persists to Dexie. Emits PostHog `review_started/narration/completed`.

### The other coach surfaces (briefly)
- **Home** — search bar + tile grid; "Talk to Coach" opens the mic drawer.
- **Chat** — standalone Q&A; streaming replies with sentence TTS, voice-mute,
  starter chips, "read this to me", auto-sends `?q=` from Game Insights search.
- **Analyse** — FEN input / interactive board → eval bar + candidate chips +
  grounded explanation + follow-up chat (settings/nav/drill intents work here).
- **Training Plan** — today's reps (weaknesses + SRS-due + unlearned favorites) +
  a color-split rolodex; each card has 8 training rows (Theory & Lines, Puzzles,
  GM Games, Traps & Pitfalls, Your blunders, Coached walkthrough, Practice from
  move 1, Practice middlegame). Hard-stops with zero favorites.
- **Train** — older recommendation list (streak badge, recommendation cards).
- **Endgame** — 7 tabs; Mating grid (~37 patterns), curated keystone lessons +
  adaptive drills at your endgame ELO, Eval Lab quiz, Your Games (mined endgame
  mistakes). Lesson runtime is board-play-primary (fork phase, "Show options"
  bail-out, Practice more).
- **Endgame trainer** — tablebase drill of a technique; can drill your OWN
  flubbed endgame FEN.
- **Fundamentals** — 7 phases (Opening play, Centre, Development, King safety,
  Pawn structure, Tactics & threats, Endgame technique); each has classical
  prose + Listen + Learn-with-coach + Drill; personalized scorecard ("slipped
  N×"); "Walk the Opera Game".
- **Library** — public-domain master books read aloud; living boards where the
  book printed a diagram; zero LLM authorship.
- **Pro Games** — pick a pro → games grouped by opening → replay via
  `ModelGameViewer`.

---

## 3. What the chat can ANSWER — the full intent map

A turn flows through `dispatchCoachTurn`: (1) deterministic ACTION router
(settings/nav/training-aid/session-start/affirmations — no LLM), (2) board-
command matcher (play/takeback/reset), (3) `coachService.ask` →
`buildQuestionGrounding` runs ~55 detectors, (4) `getCoachChatResponse` calls the
matching grounded assembler in `groundedAnswer.ts` — the LLM only voices the
computed facts (G0). Every ask is de-padded first (`stripQuestionFiller`, typo
fix). ~55 answerable question classes, grouped:

**A. Live-board verdicts** (from FEN/tablebase/engine): whose-turn · what colour
am I · forced mate (tablebase ≤7 pieces then engine) · is-this-a-draw/stalemate ·
best move / what should I play / is Nf3 sound · position assessment (who's
winning, eval, should I resign, compensation, pawn structure).

**B. Move-choice:** hint (names piece + goal, withholds square) · attack
assessment (attackers vs defenders on the king zone) · candidate move ("is Qf3
ok", "what about the h7 sac" — cp-loss vs best + DB frequency) · why-is-X-best
(walks the PV) · alternatives ("what else could I play") · plan ("what's my
plan", "what is white up to", outposts) · move rating ("was that a blunder",
"was Nxf7 brilliant") · last move ("what just moved") · opponent move ("why did
they play that").

**C. Live tactics/danger:** "is anything hanging", "is there a fork/pin/skewer/
discovered attack", "is my queen safe", "can I win material", back-rank, Greek
gift, fried liver — answered ONLY from the precomputed tactics block (never
invented).

**D. Positional-feature topics** (19, from static FEN features): material,
centre, development, structure, king safety, piece quality, key-squares/
outposts, space, bishop-pair, passed-pawn, best/worst piece, pressure, targets,
open files, pawn breaks, structure name, x-ray, maneuver, endgame plan.

**E. Master-play / theory / opening ID / player games:** what do masters play /
main line / book move / "what would Magnus play" · how a named pro plays this
(from the real pro-game corpus) · general theory how-to ("how do I meet an
IQP") · concept definitions ("what is a zwischenzug") · fundamentals ("piece
values", "opening principles") · a single named fundamental · famous games
("the Opera Game") · name-this-opening · does-opening-X-exist · counter-
repertoire ("what should I play against the Pirc").

**F. Endgame:** can I win/hold/draw this · how to convert · "let me try the
Lucena" · "what endgame am I weakest at".

**G. Student self-knowledge / analytics** (from imported+analyzed games) — the
big personal-coach layer: progress / what should I work on / weaknesses ·
improvement trend · opening profile (strongest/favorite/weakest) · opening
accuracy per line · opening traps I can use · repertoire gaps / what to learn
next / prep vs an opponent · stats (rating, record, win-rate) · strengths ·
mistakes / blunder rate · this-game mistake · last-game mistake / N games ago ·
tactics profile (which motifs I miss) · phase profile (weakest phase) · overall
accuracy · consistency / form / streak / best time control · errors-by-situation
(do I blunder when winning) · misconceptions · converting winning positions ·
White-vs-Black · records (best game, biggest upset, who beats me) · record vs an
opening/opponent · puzzle stats · transfer gap (puzzles vs games) · skill radar /
report card · weakness lifecycle (fixed / persistent / most pressing) · full
weakness briefing · time trouble · last-game result · SRS review due.

**H. Meta / app / settings:** how do you teach X · what can you do / what does
the Tactics tab do · query settings ("is voice on", "what's my narration
level") · training request ("set up calculation training", "drill my tactics").

### Special commands
- `/clearcache` (wipe cached openings + refresh).
- **Walkthrough control:** new / stop (end/quit/I'm done) / resume (go/continue/
  next/keep going).
- **Move commands:** "play d4", "you play Nf3", "castle kingside", bare SAN,
  "take on e5" → dispatched as a legal move. "I played e4" is a REPORT, not a
  command.
- **Board manipulation:** take back / undo / "take both back" (count 2), reset /
  start over / new game.
- **Opening capture/forget:** "play the Caro-Kann" (persists intended opening),
  "forget the Caro-Kann" / "play anything" / "free play" (clears it).
- **Settings-as-actions:** "turn on voice", "set narration to brief", "enable
  hints", "switch to dark theme".
- **Affirmations:** bare "yes/sure/ok" after a game proposal → starts the game.

### What it REFUSES / falls back on (G0/G3 honesty)
- Stock "I can't verify that precisely from grounded data — ask me for the best
  move, the plan, or what's hanging" when the claim-strip empties the reply.
- Refuses to invent a player's move frequencies when the explorer returned
  nothing.
- Fails LOUD when a tool is down ("Stockfish isn't responding…", "the master
  database is unreachable…") instead of papering over it.
- "Import your games" gate when a personal-analytics intent fires but no games
  are analyzed (board/concept/theory/training/stats asks are exempt).
- Number-fidelity net: refuses any %/count/rating the model adds that isn't in
  the computed facts. Fallbacks may never speak a directive.

---

## 4. The coach's hands + eyes — 23 tools

Two groups (`src/coach/tools/registry.ts`). Board-touching action tools return
`{ok:false}` (never fake success) when the surface didn't wire the callback.

**Cerebrum — ACTION tools (hands):** `navigate_to_route` · `play_move` ·
`take_back_move` · `set_board_position` (opening-phase raw FENs rejected — must
pass real moves) · `reset_board` · `save_position` · `restore_saved_position` ·
`set_intended_opening` · `favorite_opening` · `save_opening_to_repertoire`
(+ seeds SRS flashcards) · `clear_memory` · `record_hint_request` ·
`record_blunder` (⚠ partially wired — placeholder store) · `quiz_user_for_move`
(find-the-move) · `start_walkthrough_for_opening`.

**Cerebellum — LOOKUP tools (read-only knowledge):** `stockfish_eval` ·
`stockfish_classify_move` · `lichess_opening_lookup` (amateur explorer) ·
`lichess_master_games` · `lichess_game_export` (full PGN by id) ·
`local_opening_book` (offline next book move) · `lookup_player_games` (offline
pro-game reference set) · `lookup_player_opening_moves` (live per-player
explorer; returns empty+"unavailable" on failure rather than inviting made-up
stats).

Removed earlier: `speak`, `request_hint_tier`, `lichess_puzzle_fetch` (dead
stubs). `stockfish_eval` can be stripped from the toolbelt during engine-hang
fallback.

---

## 5. The voice — personality, verbosity, registers, perspective

- **Operator contract** (`src/coach/sources/identity.ts`) — the coach is in
  OPERATOR MODE: user commands are executed (user sovereignty over moves; one
  confirmation valve for material-dropping moves); teaching mode grounds in
  Stockfish/Lichess FIRST and demonstrates on the board; the student's pieces are
  off-limits (never `play_move` for the student's color); suggestions are NAMED
  in SAN (code draws the arrow, colors by engine rank), commits use `play_move`.
- **Personalities** (`src/coach/sources/personalities.ts`) — 4: **default**
  (calm), **soft** (warm/encouraging), **edgy** (sharp/dry), **drill-sergeant**
  (loud/clipped). Mockery dial: none/medium/hard. Profanity + flirt HARD-LOCKED
  off (all-ages). Voice is Google TTS ("Ruth"); Polly is gone.
- **Verbosity (G5)** — silent / brief (≤2 sentences, ≤30 words, enforced by
  `applyBriefVoiceCap`) / full. Hard contract, not a hint. Read-aloud taps
  ("Read this position", opening read-alouds) bypass verbosity.
- **Two registers** — review (retrospective: "you played X, they slipped") vs
  in-game/watch/learn (present-tense: "you push e5, they answer …e6"). Play is
  silent-until-asked.
- **One perspective** — you/your (student), they/their (opponent), never
  we/our. Coach-plays-you live game = "I/my"; pure spectator game = White/Black.

Injected grounding blocks per turn (`src/coach/sources/`): identity/personality,
liveState (FEN + board facts: king squares, checks, mate-in-1, hanging pieces),
annotationContext, bookGrounding (concept corpus), middlegamePlan, modelGames,
playerGames, memory, routesManifest. Plus the tactical-context block (bounded
vocabulary — the ONLY source of tactics the coach may name).

---

## 6. The student model + the learning loop

- **`getUnifiedWeaknessProfile`** (`weaknessSpine.ts:538`) — the canonical ranked
  weakness query. Folds misconceptions + mistake puzzles + classified tactics +
  opening weak spots + book departures + conversion/time-trouble/vision. Ranked
  by openCount → severity → lastSeenAt. Consumed by drills, chat analytics, the
  custom-lesson picker, and (Phase 1) live narration re-ranking.
- **`weaknessLifecycle`** — status `persistent`/`fixed`, trend `worsening` =
  "keeps falling in over time".
- **`coachCurriculumService`** — sequences weaknesses into a curriculum;
  `mastered → queued` demotion on recurrence.
- **Feeders:** Review auto-enrolls a game's mistakes into My Mistakes + thinking-
  errors; Play captures on finalize; the "why did you play that?" record is still
  captured silently; drills/SRS feed back. Custom lesson (Phase 5, built): "teach
  me something / build my full lesson" aggregates top holes → a ~3-part WLPP
  session anchored to REAL positions from the student's own games, each part
  teaching the concept (grounded corpus prose) then drilling the student's own
  flubbed positions.

---

## 7. Known gaps / where it's headed (the unified coach)

Per `docs/plans/2026-09-08-unified-coach.md` — the target is ONE brain that sees
every tool, knows THIS student's holes, decides in CODE what to say / how much /
how deep, acts with its own hands, and learns from what happened. Status:
- **Phase 1 (BUILT)** — student weaknesses wired into the selector +
  `userImportance` adaptive score (criticality × phase × weaknessMatchBoost).
- **Phase 1b (BUILT)** — live tactic-motif boost in play/teach lookahead.
- **Phase 2 (BUILT)** — threat depth rework: remedial explainer killed, threat
  depth rating-scaled via PV, non-forcing decisive lines spelled out.
- **Phase 3 (BUILT)** — book-departure weakness signal folded into the profile.
- **Phase 5 (BUILT)** — custom coaching session (the picker opener).
- **Phase 4 (DEFERRED)** — spine-driven hands / targeted takeback (wait for real
  use).
- **Phase 6 (folded into P1)** — consume existing lifecycle/curriculum memory.
- **Phase 7 (PENDING)** — consolidation: roll every orphan rating-scaled/adaptive
  function into the single `userImportance` algo; prove every fact-computer
  reaches the selector and every tool can be invoked by the spine (nothing
  islanded).

---

## 8. Fast anchors (where a wire lives)

- Phrasing chokepoint: `coachApi.ts:2487` `voiceFacts` (+ provider fallback).
- Turn orchestration: `src/coach/coachService.ts` `getCoachChatResponse`;
  routing `src/coach/dispatchCoachTurn.ts` + `src/services/coachSessionRouter.ts`.
- Intent detectors: `src/coach/questionIntents.ts` (~55); grounded assemblers:
  `src/services/groundedAnswer.ts`.
- Selection: `positionFacts.ts:32` (`PositionFactsInput`) + `narrationImportance`
  + `criticalityScan`.
- Review beats: `coachFeatureService.ts` `buildReviewSegments` (~1052).
- Learn runtime: `useTeachWalkthrough.ts`. Play: `CoachGamePage.tsx` +
  `usePhaseNarration`. Review: `CoachGameReview.tsx`.
- Tools: `src/coach/tools/{cerebrum,cerebellum}/`. Student model:
  `weaknessSpine.ts:538`.
- Audits per surface: `docs/AUDIT_INDEX.md` + the Post-Deploy matrix in
  `CLAUDE.md`. Gates: `npm run ship-check`.
