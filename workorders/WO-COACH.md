# WO-COACH — Next Level AI Coach System

> **⚠️ SUPERSEDED by WO-CLEANUP-01.** The three-persona design
> (Danya / Kasparov / Fischer) and the ElevenLabs voice pipeline
> described below were never implemented. The app ships a single
> unified coach voiced by Amazon Polly. The current coach prompt lives
> in `src/services/coachPrompts.ts`. Treat this file as historical
> context only — do not use it as a spec.

**Status:** Not Started
**Dependencies:** WO-07, WO-08, WO-11, WO-23
**Priority:** Highest — this is the most important feature in the entire app

---

## Instructions

Complete work order WO-COACH: Next Level AI Coach System.
Read BLUEPRINT.md for the technical specification.
Read CLAUDE.md for coding conventions.
Build the world's best AI chess coach experience. This is the most important feature in the entire app. Do not cut corners on anything. Do not skip any item. When done update MANIFEST.md and commit with git.

---

## 1. Coach Selection Screen

- Beautiful full-screen coach selection UI when user enters the Coach tab
- Three coach cards: **Danya**, **Kasparov**, **Fischer**
- Each card shows the coach avatar, name, personality description, and coaching style
- Danya unlocked by default with a warm inviting design
- Kasparov locked until Level 5 — shows a preview with lock icon
- Fischer locked until Level 10 — shows a preview with lock icon
- Selecting a coach triggers their intro — avatar animates, voice plays a welcome message in their personality
- Coach selection saved to user profile in Dexie

## 2. Coach Home Screen

- After selecting a coach the user lands on the Coach Home screen
- Large animated coach avatar dominates the top of the screen
- Avatar has 5 expression states: `neutral`, `encouraging`, `excited`, `disappointed`, `thinking`
- Expression changes dynamically based on what the coach is saying
- Avatar animates lips or pulses when speaking, goes still when idle
- Below the avatar are four large clear buttons: **Play a Game**, **Analyse a Position**, **Plan My Session**, **Just Chat**
- Recent session summary shown at the bottom — last session date, what was covered, coach's parting note

## 3. Play a Game with Coach

- Tapping **Play a Game** starts a real chess game immediately
- Coach plays as the opponent at adaptive difficulty — slightly below the user's current rating so games are competitive but winnable
- Before the game starts coach speaks an opening line in their personality voice
- Coach narrates their own thinking out loud during the game — explains why they are making each move as they make it
- Coach comments on user moves in real time — brilliant moves get praised, mistakes get caught immediately with a gentle explanation
- User can tap any coach comment to expand the full explanation
- User can ask questions mid-game by tapping the chat button
- User can ask for a hint at any time — three hint levels, each progressively more revealing
- User can take back a move — Danya is forgiving, Kasparov is reluctant, Fischer refuses
- After the game ends coach gives a full post-game review — identifies the 3 most important moments, explains what happened at each, gives one specific thing to work on
- Post-game review delivered by voice with the board showing the key positions

## 4. Just Chat

- Full conversational chat interface where user talks directly to their coach
- Voice input — user can speak instead of type
- Coach responds by voice and text simultaneously
- Coach has full context — reads user profile before every response
- Coach handles any chess question naturally and intelligently
- Must handle these conversations beautifully:
  - "I want to work on my Sicilian Dragon today" — coach launches a tailored Dragon session
  - "I keep losing with the King's Gambit after move 8, help me fix it" — coach pulls up the position and walks through it
  - "What should I practice today?" — coach generates a personalised session plan
  - "Why do I keep losing in the endgame?" — coach analyses recent games and identifies the pattern
  - "Show me the most important trap in the Vienna Gambit" — coach shows it on the board with narration
  - "I'm frustrated, I feel like I'm not improving" — coach responds with emotional intelligence before pivoting to a practical plan
- Coach proactively mentions bad habits when relevant
- Coach can directly launch opening drills, puzzle sets, and game reviews from the conversation
- Streaming responses — coach reply appears token by token in real time

## 5. Analyse a Position

- User can set up any position on the board or paste a FEN
- Coach analyses the position in their personality voice
- Stockfish runs in background and feeds data to the coach
- Coach explains the position in plain language — human ideas not engine lines
- User can ask follow-up questions about the position
- Coach can suggest candidate moves and explain the thinking behind each

## 6. Plan My Session

- Coach generates a fully personalised training session based on the user's profile
- Coach explains the plan out loud before starting
- Plan accounts for SRS due items, weak themes, recent accuracy, and daily session target
- User can push back and coach adjusts the plan in real time
- Session saved as a `SessionPlan` in Dexie via `sessionGenerator.ts`
- Coach checks in between session blocks with a brief voice note

## 7. Coach Voice — ElevenLabs

- Integrate ElevenLabs API for realistic distinct coach voices (builds on WO-23)
- **Danya** — warm, enthusiastic, clear and encouraging
- **Kasparov** — intense, commanding, Eastern European flavour
- **Fischer** — cold, precise, clipped and exacting
- ElevenLabs API key stored encrypted in Dexie via `cryptoService.ts`
- All coach speech goes through ElevenLabs when online
- Falls back to Web Speech API when offline or no ElevenLabs key
- Voice speed adjustable in settings
- Voice toggle in settings turns all coach voice on or off
- Must respect iPhone silent mode

## 8. Coach Memory and Personalisation

- Before every single Claude API call the coach reads the full user profile from Dexie
- Coach knows: current rating, puzzle rating, weak themes, recent session history, bad habits list, repertoire openings, current streak, longest streak, achievements, skill radar scores
- Coach references this history naturally and specifically — not generically
- Bad habit detection runs after every game — coach flags new bad habits and tracks recurring ones
- Coach tracks improvement over time — celebrates when a bad habit is resolved
- Weekly coach summary generated every 7 days — delivered by Opus model

## 9. Streaming and Performance

- All coach responses stream token by token into the UI
- Avatar expression updates as the sentiment of the streaming text changes
- Use **Haiku** for live move commentary, **Sonnet** for analysis, **Opus** for weekly reports
- Prompt caching on all system prompts via `cache_control: { type: "ephemeral" }`

## 10. Offline Mode

- When Claude API unavailable coach falls back to personality-specific templates
- Templates cover all common scenarios — move commentary, hints, encouragement, post-game
- Offline indicator shown clearly in the UI
- All fallback responses written in the exact correct coach voice

## 11. Tests

- Test coach game starts and coach responds to every move
- Test conversation handles all example queries listed above
- Test voice input and ElevenLabs output
- Test offline fallback for all three coaches
- Test bad habit detection triggers correctly
- Test session planning generates a valid `SessionPlan`
- All tests must pass before finishing

---

## File Organization (expected new/modified files)

### New Components
```
src/components/coach/CoachSelectionScreen.tsx
src/components/coach/CoachCard.tsx
src/components/coach/CoachHomePage.tsx
src/components/coach/CoachAvatar.tsx
src/components/coach/CoachGamePage.tsx
src/components/coach/CoachChatPage.tsx
src/components/coach/CoachAnalysePage.tsx
src/components/coach/CoachSessionPlanPage.tsx
src/components/coach/CoachGameReview.tsx
src/components/coach/ChatMessage.tsx
src/components/coach/ChatInput.tsx
src/components/coach/HintButton.tsx
src/components/coach/ExpressionAvatar.tsx
```

### New/Modified Services
```
src/services/coachGameEngine.ts      — Adaptive difficulty opponent engine (Stockfish wrapper)
src/services/coachChatService.ts     — Chat conversation management, context building
src/services/coachTemplates.ts       — Offline fallback templates per personality
src/services/voiceInputService.ts    — Web Speech Recognition API wrapper
```

### Modified Files
```
src/services/coachApi.ts             — Extended streaming, new task types
src/services/coachPrompts.ts         — Expanded personality prompts, few-shot examples
src/services/voiceService.ts         — iPhone silent mode, speed control
src/services/analyticsService.ts     — Post-game bad habit detection
src/services/sessionGenerator.ts     — Coach-driven session planning
src/stores/appStore.ts               — Coach state (selected coach, expression, chat history)
src/types/index.ts                   — New interfaces (CoachExpression, ChatMessage, CoachGameState, etc.)
src/App.tsx                          — New routes
```

### New Routes
```
/coach                → CoachSelectionScreen (or CoachHomePage if coach already selected)
/coach/play           → CoachGamePage
/coach/chat           → CoachChatPage
/coach/analyse        → CoachAnalysePage
/coach/plan           → CoachSessionPlanPage
```

---

## Acceptance Criteria

1. All 11 sections above fully implemented — no partial features
2. All tests pass (`npm run test:run`)
3. No TypeScript errors (`npm run typecheck`)
4. No lint errors (`npm run lint`)
5. MANIFEST.md updated with WO-COACH completion notes
6. Committed with git
