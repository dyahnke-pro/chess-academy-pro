# How Chess Academy Pro Removed AI Hallucinations

## The problem, named once

An LLM cannot play chess. Ask one for a move, a line, an evaluation, or "the
reason this move is strong," and it will hand you something that *sounds*
authoritative and is often wrong — a piece on a square it isn't, an illegal
move, a line that never existed, a made-up "best move." For a chess teaching
app, that isn't a rough edge. It's the whole product failing: a coach that
lies about the board teaches the student nothing, or teaches them something
false.

We didn't try to make the model hallucinate *less*. We removed its ability to
hallucinate at all — by taking chess decisions away from it entirely.

## The one rule everything follows

**The LLM decides nothing. It voices facts that were computed in code.**

Every move, evaluation, line, tactic, plan, and even *the reason a move is
strong* is computed by deterministic engines — Stockfish, chess.js, the
Lichess opening database, the tablebase, our tactics detector — and handed to
the language model as finished facts. The model's only job, on every single
path in the app, is to phrase those facts in a warm, human coaching voice.

The key insight: **if nothing ungrounded goes in, nothing ungrounded can come
out.** There's no board for the model to misread, no move for it to invent, no
"best move" for it to guess. The answer already exists before the model is
called; the model just says it out loud.

## How it actually works

Three deterministic sources own the truth:

- **chess.js** validates every move for legality and computes board positions.
  It is impossible for an illegal move to reach the student.
- **Stockfish** (running locally in the browser) computes evaluations, best
  moves, and forced lines. When the coach says "you're up about three points"
  or "there's a mate in four," that number is the engine's, rounded — never
  invented.
- **The Lichess opening database** is the canonical source for opening theory,
  move sequences, and how masters actually play a position. If a line isn't in
  the database, it doesn't exist for us — we don't let the model fill the gap
  from "book knowledge."

On top of these sits a **fact assembler**. When a student asks anything —
"what should I play here?", "is my knight hanging?", "who's winning?", "how do
pros handle this?" — the question is routed (deterministically, by pattern,
not by the LLM) to the right computer. That computer assembles a plain-language
**facts** block: the real move, the real eval, the real reason, and a record of
exactly where each fact came from. Even the explanation of *why* a move is
strong is computed in code, not reasoned by the model.

Everything then flows through a single chokepoint — one small function whose
entire job is to phrase the pre-computed facts as a coach would say them. It
introduces no move, no number, no claim that wasn't handed to it. And because
the facts are already correct coaching prose, if the model is ever slow,
absent, or errors out, the app speaks the raw computed facts directly rather
than falling back to anything the model made up.

## The tell-tale sign we were doing it right

The old approach was a losing arms race: every time the model hallucinated, we
added another validator, another "don't make things up" instruction, another
regenerate-and-retry. Each patch treated a symptom. We stopped and named the
disease — *we were letting the model decide chess content instead of only
voicing it* — and inverted the architecture.

The proof it worked: **the grounded path needs almost no validators.** There's
nothing to validate, because the model was never given a choice. The lingering
checks are thin tripwires that should essentially never fire.

## Where this applies

Everywhere. Opening walkthroughs, the live coach chat, move commentary,
post-game review, hints, tactics warnings, middlegame plans, endgame guidance,
model-game annotations, and the kids' section all run through the same
inversion. No surface reaches the language model as open-ended chess reasoning.

The result is a coach that is warm and conversational like a person — and
correct like an engine, because the chess always comes from the engine.
