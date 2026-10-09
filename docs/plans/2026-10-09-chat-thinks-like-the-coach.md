# Chat thinks like the coach — 2026-10-09

David: "We need the chat to think and calculate like the coach." … "So can we
use the llm to decode the question and then point the answer path at the
right computer?" … "This is what I have been trying to say this whole time."

## The flaw, found in the code

The door already DECODES every student turn into a closed form (`ChatTurn`:
kind + referents + seat), code reader first, model reader second, validated
against the board (`dispatchCoachTurn` → `parseChatTurn`).

Then it throws the decoding away: `canonicalAsk(turn)` turns the reading back
into WORDS ("why is that the best move?") and sends those words through the
~40 regex lanes again. Whatever was understood — the student's own Ne4, the
knight on f3, whose move — is lost in that hand-off. So "Why is Ne4 best?"
is read correctly and answered about Kh1.

The coach narration does not work this way. It reads the whole board once
(`computePositionFacts`, every computer, through the decider) and then says
what matters. Chat sorts the question first and calls the few computers its
lane knows.

## The shape

1. DECODE — unchanged (code reader, model reader, board validation).
2. THINK — a board kind is answered by ONE board read: the narration's own
   `computePositionFacts` (cached per position + seat, `walk` posture on a
   question), with a NAMED move given its own engine read and weighed.
3. FOCUS — the kind picks what to say (plan, threats, best move, a comparison,
   a piece); the referents narrow it (squares, pieces, the move).
4. DECIDE + VOICE — the same decider ranks; `voiceFacts` phrases.
5. DELETE — each old board lane goes once its kind is served this way.
   Never two systems.

New `answerer: 'board'` on `CHAT_KINDS`: the door hands the RESOLVED turn to
`answerBoardTurn(turn, board)` — never back into words.

Not board kinds (record, rules, app help, knowledge) keep their lanes.

## Phases (each: build → tests incl. a wording matrix → live replay → delete old lane)

- P1 — move questions with a named move: `why-best-move`, `candidate-move`,
  `compare-moves`, `retrospective-move`. The most common wrong answer.
- P2 — `plan`, `tactics`, `position-assessment`, `best-move`.
- P3 — `piece-options`, `what-about-piece`, `positional`, `endgame`,
  `opponent-move`, `last-move`, `move-rating`.
- P4 — Learn's own `handleSubmit` routers onto the door (one path).

## Measure

Baseline: live replay of 246 real questions on the pre-fix build — ~58%
right, ~14% honest refusals, ~28% wrong or silent (182 graded). Board kinds
85%; move questions ~27%; follow-ups 1/9. Re-run after every phase; a drop
rolls the phase back.

## Risks

- Latency on a cache miss: one settled engine read (board questions pay it today).
- A named move the engine never searched: it gets its own read before weighing.
- Migrating all lanes at once breaks the app: one kind at a time.
