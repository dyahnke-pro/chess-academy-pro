# Chat Q&A — one decider (review + plan, 2026-10-09)

David: "review the build, make sure it's the right strategy, and identify first
principle issues preventing it from working." Plan stage only — no code until go.

## Verdict

The strategy is right: the model only READS a turn into a closed form, code
answers (G0). The build never made the switch: the reading sits on top of the
old regex router, which still decides most answers.

## First-principle issues (measured, file:line)

1. **The reading is thrown away.** 73 of 77 kinds go through `canonicalAsk`
   (`chatTurn.ts:632`): the decoded turn is turned back into a fixed English
   sentence and re-routed by the ~80-branch if-chain (`coachApi.ts:4046–6617`).
   Only 5 kinds are answered from the reading itself
   (`BOARD_ANSWERED_KINDS`, `boardTurnAnswer.ts:33`) + 1 `direct`. The lanes
   re-read the raw text 142 times (`lastUserMessage()`).
2. **Four readers, no single decider.** `buildQuestionGrounding` (56 flags),
   `chatTurnCodeReader` (514 lines), the model reader, and `positionalTopic`
   which runs BEFORE the reading and overrides it
   (`dispatchCoachTurn.ts` ~265). Tape (295 rows, 30d): code reader vs fast
   path disagreed 22/25; model vs fast path 62/153.
3. **Tuned for the wrong users.** Real native App Store users, 60 days: ~20
   typed turns, mostly Thai/German, mostly REQUESTS ("teach me the Italian",
   "make me a plan", "reset the board", "go ahead"). No "why is X best". The
   246-question replay is web (incl. David's testing).
4. **Language broken at the seams.** The reader translates (`english`) and it
   is never used; up to three serial `translateToEnglish` calls follow
   (router, settings, `coachService`); regex runs on raw text. In Learn a
   translated/rewritten ask BYPASSES the door entirely
   (`CoachTeachPage.tsx:6863`, `viaDoor = effectiveAsk === text`).
5. **Latency is serial, not parallel.** With the flag on, every turn awaits
   the read first (tape: 1.1–2.1 s, timeout 6 s), then translation, then
   engine.
6. **Free-model paths still live.** Toolbelt + `[[ACTION]]` loop
   (`coachService.ts`), banter lane — ONE-CHAT step 6 never done. Real case
   (pre-door build, 2026-09-16): a user asked "teach me the Italian" ~8× in
   8 min; the model fired start_walkthrough/navigate each time, same
   139-char reply, nothing the user could see changed.
7. **No measurement of success.** PostHog gets only a `summary` string for
   `coach_turn_read`; zero native rows; the 107/107 eval scores the KIND, not
   whether the answer answered.
8. **Answer extras through module globals** (`lastServedIntent`,
   `lastCoachLines`, `lastCoachActionOffer`, `coachApi.ts` ~700–740), read
   after an await — a concurrent hint/narration call can attach the wrong
   arrows/chips.
9. **Learn is a second chat.** `handleSubmit` is ~3,600 lines
   (`CoachTeachPage.tsx:3274–6865`) with ~87 early returns before the door.

## Target shape

```
words ─► READ (code reader first, model on miss; ONE ChatTurn form, english kept)
      ─► VALIDATE on the board
      ─► Record<ChatKind, Answerer(turn, ctx)>   ← the only decider
      ─► answer object {text, lines, offer, servedKind}  (no globals)
```

The regex is KEPT as a producer of ChatTurn (instant, free, offline) — never
as a decider. The assemblers (`groundedAnswer.ts`) are KEPT — they are the
computers; only the routing chain goes.

## Phases (each: build → tests → real-utterance replay → delete the old path)

- **P0 Measure first.** Forward every `chat-turn` field to PostHog; truth set
  from REAL native utterances (all languages) + the tape, graded on "answered
  what was asked / action actually happened", not kind; confirm which build
  iOS users run (the door may not be on native).
- **P1 One reader.** Code reader and model reader emit the same form;
  `positionalTopic` becomes a field of the reading; use the reader's
  `english`, delete the serial translations; give the model a minimal board
  summary (side to move, piece list) so it resolves "the knight" (today
  `piece-ambiguous` invalids).
- **P2 One dispatch table**, migrated by REAL-USER frequency: commands /
  lesson requests → conversational replies → plan / teach-me → board kinds.
  Per kind: adapter takes the typed turn, `canonicalAsk` entry deleted, its
  if-chain branch deleted. Done when the chain is gone.
- **P3 Actions follow through.** Command kinds → `actuate`; words built from
  the result; delete toolbelt, `[[ACTION]]`, banter for student turns
  (ledger rows green first, per ONE-CHAT FINAL).
- **P4 Learn onto the door.** Its routers become Learn's registered readers
  producing ChatTurns; a translated ask no longer bypasses.
- **P5 Extras on the answer object**, globals deleted.

## Pushback on this plan

- Deleting the chain risks the 554-phrasing matrix built over months →
  mitigated: regex stays as a reader, one kind at a time, matrix re-run each
  step.
- Model read on every non-code turn costs ~1.5 s → the code reader must catch
  the common cases; measure p90 per phase.
- Board summary to the reader is not the model deciding chess — it reads
  which piece was named; no eval, no moves.

## Decisions for David

1. Optimise for real users' turns (requests, any language) first, or board
   questions first?
2. Latency budget per turn?
3. P0 needs instrumentation code — OK as the first build?

## Acceptance

Real-utterance replay: ≥80% answered / action done, 0 stock lines, 0 actions
the words don't describe, every language; `DEGRADE=llm` no stock line; one
model call max per turn; full `chat-turn` fields visible in PostHog incl.
native.
