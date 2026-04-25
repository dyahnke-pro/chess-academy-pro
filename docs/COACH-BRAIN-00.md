# COACH-BRAIN-00 — The Unified Coach (Vision + Build Order)

**Status:** Foundational. All future Chess Academy Pro Coach Brain WOs build TO this vision.
**Author:** Dave (heart) + Claude (editor-in-chief)
**Date:** April 24, 2026

---

## Part 1 — The Vision

### What we're building
**One coach. One voice. One brain.** The app IS the coach.

Today, Chess Academy Pro has many surfaces (home chat, game chat, move selector, hint engine, phase narration, review) each running their own logic, their own prompts, their own state. They drift. They contradict. The user feels five different personalities pretending to be one.

That ends here.

### The metaphor (this is the mental model)
- **Cerebrum (the conscious coach)** = the LLM. Decides, talks, remembers, navigates, teaches.
- **Cerebellum (the calculators)** = Stockfish + Lichess. Pure math, pure data, no opinion.
- **Sources of Truth** = Supabase, app routes manifest, live game state, identity prompt.

The LLM is the coach. Stockfish and Lichess are tools the coach uses. Every surface in the app is a different mouth/ear for the same brain.

### Felt experience when this is done
- I can ask the coach anything from anywhere in the app and it remembers.
- When the coach commits to playing the Caro-Kann, it plays the Caro-Kann.
- When I ask to be taken to the Bird's Opening section, the coach takes me there.
- The coach knows my hint patterns, my blunders, my favorite openings — and brings them up unprompted when relevant.
- The coach feels like one person who has been with me the whole journey.

---

## Part 2 — The Architecture

### The Four Sources of Truth (locked, not negotiable)
1. **Supabase** — user memory: intent, conversation history, preferences, hint patterns, blunders, growth map, game history.
2. **App Routes Manifest** — every route, every feature, every opening section, every tactic set. The coach's map of its own body.
3. **Live Game State** — current FEN, phase, eval, move history (from chess.js + Stockfish).
4. **Identity Prompt** — who the coach is. Default: Danya. Optional: Kasparov, Fischer.

Every LLM call assembles its prompt from these four sources. No surface invents its own context. No surface caches stale state. No surface skips a source.

### The Cerebrum (LLM provider)
- **Primary:** DeepSeek. Cheap, private app, acceptable for now.
- **Abstraction layer:** Provider-agnostic interface. Anthropic stays wired but dark — flippable later if IP/quality concerns rise.
- **No call goes outside the abstraction.** Ever.

### The Cerebellum (read-only, deterministic tools)
The LLM calls these the way a coach uses a calculator:
- `stockfish_eval(fen, depth)` → centipawn score, best move, principal variation
- `stockfish_classify_move(fen_before, move)` → blunder / mistake / inaccuracy / great
- `lichess_opening_lookup(fen)` → ECO code, opening name, master frequency
- `lichess_master_games(fen)` → how titled players handle this position
- `lichess_puzzle_fetch(theme, rating)` → puzzle pulled from mistake patterns

### The Cerebrum Toolbelt (decisions, side effects)
The LLM calls these to act on the world:
- `navigate_to_route(path)` — takes the user somewhere in the app
- `set_intended_opening(name, color)` — writes opening intent to memory
- `clear_memory(scope)` — user said "forget that"
- `play_move(san)` — coach makes a move (consults cerebellum first if intent is set)
- `speak(text, urgency)` — voice narration
- `request_hint_tier(tier)` — escalates hint disclosure
- `record_hint_request(position, tier)` — logs hint patterns to memory
- `record_blunder(fen, move, classification)` — logs blunder patterns to memory

### The Prompt Envelope (what every LLM call contains)
Every call. Every surface. Same shape:
1. **Identity** — who the coach is (from identity prompt)
2. **Memory** — full coach memory snapshot (from Supabase)
3. **App map** — routes manifest (so the coach knows where things live)
4. **Live state** — current FEN, phase, eval, what surface is calling, what the user just did
5. **Toolbelt** — every cerebellum + cerebrum tool the coach can call
6. **The ask** — the specific message/event this surface is dispatching

If a surface skips any of these six, it is not the unified coach. It is a regression. Reject the PR.

---

## Part 3 — The Build Order

Phases are gates, not parallel tracks. Each phase ships, deploys, gets tested as a felt experience, then the next phase begins.

### Phase 1 — Build the spine
**WO-BRAIN-01 — Coach Service**
Build `coachService.ts` — one service, one entry point. Every surface calls `coachService.ask({ surface, ask, liveState })`. The service assembles the envelope from the four sources, calls DeepSeek through the provider abstraction, dispatches tools, returns the result.
*Felt experience:* developer can call `coachService.ask(...)` from anywhere and get a coach-quality response with full memory and full app awareness.

### Phase 2 — Prove the pattern (game chat first)
**WO-BRAIN-02 — Migrate game chat surface**
Rip out the existing in-game chat LLM logic. Replace with a single `coachService.ask({ surface: 'game-chat', ... })` call. Game chat already works for opening intent — this proves the spine doesn't regress what's working.
*Felt experience:* in-game chat feels identical to today, but the plumbing is now the unified spine.

### Phase 3 — Fix the broken surface (dashboard / home)
**WO-BRAIN-03 — Migrate home/dashboard surface**
Rewire home chat through `coachService`. This fixes the Caro-Kann bug AND the Bird's Opening bug in one move, because the coach now has memory access (intent persists) AND the app map (knows where Bird's Opening lives) AND `navigate_to_route` (can take Dave there).
*Felt experience:* "Play Caro-Kann against me from the dashboard" → coach commits, navigates to play screen, plays c6. "Take me to Bird's Opening" → coach navigates there.

### Phase 4 — Wire move selector to the brain
**WO-BRAIN-04 — Move selector reads through the brain**
`CoachGamePage.tsx` move selector stops being its own thing. On the coach's turn, it calls `coachService.ask({ surface: 'move-selector', ... })`. The LLM consults cerebellum (Stockfish), checks memory (intent), and returns a move. Old `requestedOpeningMoves` useState dies.
*Felt experience:* coach plays the opening it committed to, every time, no matter where the commitment was made.

### Phase 5 — Migrate remaining surfaces
**WO-BRAIN-05 — Review surfaces, hint engine, phase narration, live coach triggers**
One WO per surface. Each one: rip the old logic, route through `coachService`, verify felt experience matches or exceeds before. No surface ships until it speaks the same voice as the others.
*Felt experience:* the coach is the same person whether I'm in review, mid-game, on the home screen, or asking for a hint.

### Phase 6 — Retire the old
**WO-BRAIN-06 — Cleanup**
Delete every per-surface prompt template, every per-surface state hook, every duplicated LLM call. The brain is the only path. Audit log confirms zero LLM calls bypass `coachService`.
*Felt experience:* a fresh developer reading the codebase sees ONE coach, not five.

---

## Constraints (apply to every Phase WO)

- **Sources of truth are sacred.** No WO bypasses Supabase / routes manifest / live state / identity prompt.
- **No surface invents context.** If a surface needs something the four sources don't provide, the source gets extended — not the surface.
- **Cerebellum tools are read-only.** Stockfish and Lichess never decide. They report.
- **Provider abstraction is non-negotiable.** Even though we use DeepSeek today, the abstraction layer must be in place from Phase 1.
- **Felt experience > dev checklist.** Every Phase WO has its acceptance criteria written as "what does it feel like to use," not "what files were changed."
- **Privacy callout:** DeepSeek is China-hosted. Until we revisit, no proprietary coach prompts and no PII go into the call payload beyond what's strictly needed. The provider abstraction makes the eventual flip to Anthropic a one-line change.

---

## Done state (the whole thing)

The Unified Coach is done when Dave (1200-rated learner, not a dev) can use any surface of Chess Academy Pro and feel like he's talking to **the same coach** — one who remembers everything, knows the whole app, plays the openings it commits to, and never contradicts itself. When that's true, every future feature is "what does the brain need to know, what tool does it need to call, what does it say back." No more architecture debates. No more drift.

The app IS the coach.
