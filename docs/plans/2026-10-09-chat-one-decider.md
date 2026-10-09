# Chat Q&A — one decider (plan, 2026-10-09, from the LIVE build)

David: "use the current build to see how it works. Then make a plan. You can't
plan a build or fix from old code." This plan is built on the hand walk of
prod `2c0fc28`: `audit-reports/hand-walk-chat-qa-2026-10-09.md`. Plan stage —
no code until go.

## What the live app does

| | asked | right |
|---|---|---|
| Board questions (Learn) | 18 | 14 |
| Requests — what real App Store users actually type | 9 | 2 |

Real native users, 60 days (PostHog): ~20 typed turns, mostly Thai/German,
mostly requests ("teach me the Italian", "make a plan", "reset and teach me",
"can I start now?"). The build is tuned for board questions; the users send
requests.

## Causes (each seen live, each with its code site)

1. **A right reading does not reach an answer.** B11 "can they attack my
   bishop?" and B12 "what does Bc5 attack?" were read correctly
   (`attack-piece`) and answered by other lanes. A kind whose answerer returns
   null falls silently to the regex chain (`dispatchCoachTurn.ts` → `canonicalAsk`
   → `coachApi.ts:4046–6617`), which re-decides from the words. 73 of 77 kinds
   route that way.
2. **The kind table is one-seat, one-intent.** `attack-piece` is only "I attack
   them"; no slot for "they attack me". A turn is one kind, so "reset the board
   and teach me the Italian" did the first half only (R8).
3. **Requests are decided by the phrase router, not the reading.** Opening
   names are captured from raw words: "teach me" → opening "me" (R5), the Thai
   request's translation "Italian Opening" → "did you mean Ware?" (R2). The
   reader's `topic` is never used.
4. **Conversation memory does not carry.** "can I start now?" lost the pending
   offer (R7); "and why not d4?" lost the move (B8).
5. **Language is not a property of the turn.** A German question was answered
   in Thai (R3). The reader's own translation is discarded; three more
   translate calls run serially elsewhere.
6. **The answer layer breaks the voice rules.** First person on the opponent's
   move ("my bishop… my move", B7/B12). No arrow on any named move (~20
   answers). "Hanging" answered as "unguarded" (B13).
7. **Latency.** The read is awaited before anything (1.0–3.4 s live); a fresh
   position's engine answer takes 13–16 s.

Underneath 1–4 is ONE fact: there are four readers (regex grounding, the code
reader, the model reader, the positional-topic override) plus Learn's ~87
early returns in `handleSubmit`, and no single decider. The model reader is
right more often than the router that overrides it.

## The fix in one line

The reading decides. Every turn becomes a list of typed intents
(`ChatTurn[]`), each answered by `Record<ChatKind, Answerer(turn, ctx)>`; the
regex only PRODUCES readings (instant, free, offline), never routes. The
answer computers (`groundedAnswer.ts` assemblers) are kept.

## Phases — ordered by what real users hit

Each phase: build → fail-on-old tests from the walk's own turns → hand-walk
re-run on prod → delete the old path it replaces.

- **P0 Measure (small).** Forward every `chat-turn` field to PostHog (today a
  summary string only; zero native rows). Turn this walk's 27 turns + the
  real native utterances into a replay set graded on "answered / action done
  / right language", not on kind.
- **P1 Requests work.** Command and lesson kinds read their opening/topic from
  the READING through the one opening resolver ("Italian" / "Italian Opening"
  / Thai → Italian Game); compound turns become a list run in order (reset →
  teach); the pending offer is a stored ChatTurn that "yes / can I start now?"
  runs; "make me a plan" offers the Training Plan page; a bare username offers
  the import. Fixes R2, R5–R9.
- **P2 One language per turn.** The reader's `english` is the text every
  later step reads; the reply language is the turn's language; the three
  serial translate calls go. Fixes R3.
- **P3 Every reading reaches its answerer.** Seat becomes a field, not part of
  the kind (attack/defend/win × me/them); a kind with no answer for a case
  says so honestly instead of falling into the chain; migrate the 73
  `canonicalAsk` kinds to answerers that take the typed turn, one at a time,
  deleting each regex branch as it moves. Done when the if-chain is gone.
  Fixes B11, B12, B13 and the class.
- **P4 Follow-ups.** The last subject (move / piece / side) rides the
  conversation state into the next reading. Fixes B8.
- **P5 Answer contract.** Arrows on every named move, coach never "I/my",
  extras on the returned answer object (not module globals). Fixes B7 and the
  arrows.
- **P6 Latency.** The code reader answers the common turns with no model call;
  the model read only on a miss; engine reads warmed on each new position.
  Target: first words ≤ 2 s on a warm position.
- **P7 Learn onto the one door**, its routers as readers.
- **P8 Delete** the model toolbelt, `[[ACTION]]` and banter paths for student
  turns once P1's commands cover them.

## Pushback on this plan

- Deleting the regex chain risks the 554-phrasing set built over months →
  regex stays as a reader feeding the same form; one kind at a time; the set
  is re-run each step.
- The model reader is wrong too (R1 read as a thinking lesson) → readings
  are validated on the board, and a low-confidence reading asks back with
  chips instead of guessing.
- 27 turns is a small walk → P0's replay set is the real gate; the walk only
  sets the order.

## Decisions for David

1. Order: requests first (P1–P2), board answers second (P3–P5)? Recommended —
   that is what real users hit.
2. Latency target: first words ≤ 2 s on a warm position?
3. OK to start with P0 (logging + replay set)?

## Acceptance

Replay set: ≥ 90% answered / action done in the right language, 0 actions the
words don't describe, 0 stock lines; walk re-run: the 13 ❌ turns all ✅; first
words ≤ 2 s warm.
