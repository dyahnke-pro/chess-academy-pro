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
- **P9 Delete the old system (David 2026-10-09: "old orphan or redundant
  code removed as final step").** Not a sweep by eye — a LEDGER, each row
  deleted only when its replacement's test is green and
  `surface-map.mjs --changed` shows zero production callers (G8.5):
  `canonicalAsk` + the 73 `canonical:` entries · the regex if-chain in
  `getCoachChatResponse` (`coachApi.ts` ~4046–6617) and the lane-local
  computers it alone used · `fastPathLane` / `LANE_FIRES` (the approximation
  of the chain) · `chatTurnCodeReader` folded into the one reader ·
  `positionalTopic` override in the door · `buildQuestionGrounding`'s 56
  question flags (grounding keeps only the board/engine data) · the three
  serial `translateToEnglish` calls · module globals `lastServedIntent`,
  `lastCoachLines`, `lastCoachActionOffer`, `consume*` · the model toolbelt,
  `[[ACTION]]` parser, `stripChessyStraySentences`'s `[[` protection, banter
  lane, legacy free lane, Learn's prose move-recovery net · `chatBoardRead`
  if `boardTurnAnswer` subsumes it (or the reverse — one, not two) · Learn's
  pre-routers once registered as readers · `routeChatIntent` phrase matching
  once commands come from the reading · `walkthroughResolver.ts` (whole file — 0 production callers since the router moved to `resolveOpeningEntry`, 2026-10-09) · caller-side filler strips now done by the resolver itself (`openingFuzzyMatcher.ts` ~354 leading-article retry, `ask/playName.ts` `^the\s+`, 2026-10-09) · `serveParsedRoute` flag (one path,
  no switch). Gate: a test that lists every deleted export and fails if any
  returns; `coachInversion.gate.test.ts` extended so none of the free-model
  paths can be re-added.

## Pushback on this plan

- Deleting the regex chain risks the 554-phrasing set built over months →
  regex stays as a reader feeding the same form; one kind at a time; the set
  is re-run each step.
- The model reader is wrong too (R1 read as a thinking lesson) → readings
  are validated on the board, and a low-confidence reading asks back with
  chips instead of guessing.
- 27 turns is a small walk → P0's replay set is the real gate; the walk only
  sets the order.

## The brain question (David 2026-10-09: "chat lanes need to route through the brain. Use the same computers as the narrations.")

Measured in the code:
- The narration's one board read (`computePositionFacts` → the decider) is
  used by chat for only `plan` and `tactics` (`boardTurnAnswer.ts`) and two
  catch-alls (`chatBoardRead`, `coachApi.ts:2192, 6918`). The ~80 regex lanes
  in `coachApi.ts` / `groundedAnswer.ts` call it 0 times; they call their own
  computers. So chat and narration can disagree about the same board.
- The LLM role today: (1) the READER on turns the code reader misses
  (DeepSeek, 1–3.4 s live, awaited before every answer); (2) TRANSLATION in
  (up to 3 serial calls) and out (`voiceFacts` when the student's language is
  not English). It writes NO English chat answer: ~130 answer sites pass
  `preferRaw`, so the computed text is spoken as is. Narration DOES use the
  model to phrase (`warm: true` in `useLiveCoach`, `usePhaseNarration`) — so
  chat and narration sound like two coaches. Small talk is canned code. The
  toolbelt / `[[ACTION]]` paths are still in the code; not seen firing live.

Agreed: same computers. Changed: not the same SELECTOR.
- Narration picks "what matters most now"; chat must answer "what was asked".
  Live proof: the plan answer opened with "a knight move first; h3 will still
  be there" — the narration's commit-the-pawn-last habit, said seconds
  earlier, leaking into a chat answer.
- The brain only fixes BOARD answers (14/18 already). Requests (2/9) are not
  board questions; no narration computer answers "teach me the Italian".

So: ONE READ per position, cached and shared (same facts, same proofs — chat
and narration can never disagree); TWO SELECTORS over it (narration:
importance; chat: kind + referent + seat); ONE voice layer (decision 4).
P3 becomes "every board kind answers from the one read through the question
selector"; the regex lanes' own computers are retired as each kind moves.

✅ DECIDED (David 2026-10-09: "Yes. Non-negotiable that one."): chat answers go
through the SAME model phrasing as narration — one voice. The first sentence
shows at once from the computed text; the phrased version replaces it when it
lands (so the wait is not felt). `DEGRADE=llm` still answers in the raw register.

## Ask memory (David 2026-10-09: "We also need a memory for the asks")

Today: `ConversationState` (`chatTurn.ts`) is in-memory per surface — last
piece / square / move / seat / previous reading — wiped on reload, never
persisted, never read by the student model. Ask→answer pairs go only to the
audit log. So the app forgets every question the moment the page closes, and
the asks never reach the loop ("the output of every session becomes the input
of the next").

Two layers, one record:
1. **CONVERSATION MEMORY (within a game, survives reload).** The pending offer
   as an executable ChatTurn ("can I start now?" runs it), the last subject
   (move / piece / side) for follow-ups, the turn's LANGUAGE, the last list
   ("the second one"). Persisted in Dexie keyed by surface + game. Fixes R7,
   B8, R3.
2. **THE ASK RECORD (across games — the loop).** Every student ask stored with
   its reading (kind, concept/topic, referents, seat), the position (FEN, ply,
   opening id, game id — the same `WeaknessProvenance` shape the spine rows
   carry) and whether it was answered. Joined to the student model through
   the EXISTING concept vocabulary (`tacticVocabulary` / fundamentals) — never
   a new mapping. "You asked about pins in three games" is evidence the heat
   map can read; a repeated ask on a concept RAISES its urgency.

Pushback, so this does not backfire:
- An ask is NOT a failure. "What's the best move?" every ply is a hint habit
  (already tagged `ask_source`), not a weakness in best moves. The record
  weighs an ask weaker than a mistake (as `puzzleMisses` are half severity),
  and only an ask about a CONCEPT (pin, plan, castling rules) joins the heat
  map; "best move" asks join the hint count.
- RAISE-ONLY: an ask may never make the coach quieter — not asking is absent,
  not proven (the heat-map rule).
- Bounded (cap per student, oldest pruned) and never shipped off-device; it
  is the student's own record like every other store.

Build site: P4 (follow-ups) uses layer 1; the record is written at the one
door (`dispatchCoachTurn`) where every student turn already passes, so a
surface cannot forget to record; My Weaknesses shows the asked concepts
beside the mistake concepts (capability parity).

Decision 5 for David: show the asked concepts to the student on My
Weaknesses ("you keep asking about…")? Recommended yes — it is the record
made visible, and it tells them the coach listened.

## App commands — covered (David 2026-10-09: "start this game or play this opening or make this move or settings changes")

Today three systems act on a command, none reading the parse: the phrase
router `routeChatIntent` (play_move, take_back ×1/2, reset, set position,
navigate, orientation, save/restore position, strength up/down, quiz, drill,
show squares), `coachSettingsAction` (voice, verbosity, arrows, difficulty,
personality), and the MODEL's toolbelt (start_walkthrough_for_opening,
navigate_to_route, reset_board, play_move, take_back_move, set_board_position,
favorite_opening, save_opening_to_repertoire, set_intended_opening,
clear_memory, record_blunder, record_hint_request, lookup_player_*,
lichess_*, stockfish_*). The live walk: settings + "I'll be white" worked
(router); "teach me" → opening "me", compound turn half-done, offer lost.

In this build (P1 + P8) every command is a `command` ChatTurn with typed
slots, actuated by code, with the words built from the result:
- **start game** {seat, opening?, strength?} — always echoed + one-tap confirm
  when a game is in progress (never silently over a live game).
- **teach / play this opening** {opening resolved through the ONE opening
  resolver from the reader's `topic`, any language; unresolved → the picker}.
- **make this move** {san, validated legal on the board} — "play e4" / "I
  played e4" is a command; "what about e4?" is NEVER one (the reader may not
  emit a move to play on a question). The open walk flag "a dictation turn
  produced a chat answer" is this boundary, fixed here.
- **take back** {count}, **reset**, **set position**, **flip board**,
  **save/restore position**, **strength up/down**, **quiz / drill / trap
  stage**, **go to page**, **review game**, **continue middlegame**.
- **settings** {voice on/off, verbosity, arrows, difficulty, personality,
  stop talking} — through `applyCoachSetting`, one place.
- **record-keeping** {favorite opening, save to repertoire, clear memory,
  set intended opening}.
- **compound** — a turn is a LIST of commands/questions run in order
  ("reset and teach me the Italian").
- **pending offer** — "yes" / "go ahead" / "can I start now?" runs the stored
  ChatTurn.
Code-side writes (`record_blunder`, `record_hint_request`) move out of chat
to the blunder/hint paths. Data tools (lookup_player_*, lichess_*,
stockfish_*) become answerers, not model tools. The capability ledger (ONE-CHAT
FINAL §2) is the gate: every tool above has a row (→ new home → test) and the
model toolbelt is deleted only when every row is green.

## Decisions — logged 2026-10-09 (David: "Yes to all")
1. Requests first (P1–P2), board answers second (P3–P5). ✅
2. First words ≤ 2 s on a warm position. ✅
3. Start with P0 (full `chat-turn` fields to PostHog + the replay set). ✅
4. One voice: chat phrased by the same model layer as narration. ✅ non-negotiable
5. Asked concepts shown on My Weaknesses. ✅

## Decisions for David (superseded by the log above)

1. Order: requests first (P1–P2), board answers second (P3–P5)? Recommended —
   that is what real users hit.
2. Latency target: first words ≤ 2 s on a warm position?
3. OK to start with P0 (logging + replay set)?

## One coach on every screen — the all-screens walk (2026-10-09, David: "Make sure this works on all coach surfaces. Remember, 1 UNIFIED COACH!")

`scripts/audit-chat-surfaces-prod.mjs` asks the same 9 questions on all 7
question-box screens and reads both the page and the door's `chat-turn` row.

**Found and fixed on the branch:**
- THREE screens bypassed the door with a student's own words: My Mistakes'
  question box, post-game review's Ask box, the search-bar mic. All go
  through `dispatchCoachTurn`; gate `oneCoachDoor.gate.test.ts` fails any new
  direct `coachService.ask` from UI code unless named as an app-written prompt.
- Analyse and Explain showed only STREAMED text; a door answer does not
  stream, so it was spoken and never shown (also their first explanation).
  They also handed the door an app wrapper ("Student question: … Answer in
  2-4 sentences") instead of the student's words, and showed raw `[BOARD:]`.
- Review's space shortcut (play/pause) swallowed every typed space
  ("howdoIcastle?") — `isTypingTarget` keeps page shortcuts out of text fields.
- No board ("is anything hanging?" on the chat page): four producers, four
  answers, one false ("nothing of yours is hanging"). `no-board` is now
  answered at the door, once.
- "How do I castle?" was eaten by the illegal-move refusal (board half only);
  a rule question now gets the rule, then the board's reason.
- Play's own parser read "teach me the Caro-Kann" as "play it against me".
- Concept answers were reworded and lost the definition; book prose is spoken
  as written (`preferRaw`).
- The coach says "I" in 277 literals across 40 files (RULEBOOK V1/V2). Gate
  `coachFirstPerson.gate.test.ts` freezes them, shrink-only; 3 cleaned.

**Second pass (David: "Fix all, keep walking through"):**
- "I" sweep done: ~200 coach lines rewritten, plus the prompts that taught it
  (phase narration said "Speak in first person"; envelope / phrasing examples
  spoke as "I'll respond with e5"; the shared perspective rule banned "I" in
  one mode only). Gate widened to components + hooks: 336 -> 138, the rest
  are the student's own words and the bans.
- Play's chat opens the read per turn (as Learn does): commands are read and
  their language noted; the door claims the read when reached.
- Proof lines walkable on Play chat, Openings Play, review, Analyse, Explain
  and the opening chat (own small board); any chat panel whose screen gives
  no board walks it on its own small board (drills, the global drawer);
  coach chat has no board.
- Learn's greetings and the Vienna walkthrough spoke as "I"; rewritten, and
  the gate now covers lesson data too.
- "What's the best move?" read in code (was 16-20 s through the model).
- Found on the way: the trap-classifier test sampled lines removed on 10-08
  (red on main) — samples live lines now, plus an orphan check; the
  non-answer detector kept a hand copy of the offline line — reads the one
  constant now.

**Still open:**
- Play keeps two regex command parsers (`tryRouteIntent`, `inGameChatIntent`)
  beside the door's request steps — P8/P9 delete ledger.
- The opening chat phrases through its scope prompt ("knight to f3 (Nf3)") —
  P5 one voice.

## Acceptance

Replay set: ≥ 90% answered / action done in the right language, 0 actions the
words don't describe, 0 stock lines; walk re-run: the 13 ❌ turns all ✅; first
words ≤ 2 s warm.

## Next-session pickup (written for the session that builds this)

Start here, in this order: the FOUNDATION in CLAUDE.md → this plan → the walk
(`audit-reports/hand-walk-chat-qa-2026-10-09.md`) → `surface-map.mjs --changed`
on every file you touch → read the file end to end. Then build.

**Order of work:** P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9. All five
decisions are logged above; do not re-ask them. One open call: confirm
"start a game" only when a game is in progress or the side/opening was
inferred (David has not answered — ask once, in plain words, then default to
that).

**Every phase ends the same way:** fail-on-old-code tests for the walk's ❌
turns it fixes → the replay set re-run → a hand-walk re-run on PROD of the
same turns (the driver below, not a bot) → the old path it replaced deleted
with zero callers → push to `main`. Work on a branch during the phase; tell
David what is on it; it is not done until it is on `main`.

**Things this session measured so you do not re-measure them:**
- The live build was `2c0fc28` = main; check the hash before any walk:
  `curl -s "$URL/?cb=$(date +%s)" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js'`.
- The hand driver: `AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY
  AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node
  scripts/audit-lib/hand-driver.mjs` then `/open`, `/type`, `/move?san=`,
  `/state`, `/goto?path=/coach/chat`, `/events?grep=chat-turn`, `/js`
  (`return [...document.querySelectorAll("[data-testid*=message]")].map(e=>e.innerText)`
  reads the transcript on `/coach/chat`, whose `/state` lastChat is Learn-only).
- PostHog: the session-env key (`Read_key_PostHog`) is INVALID (401). The
  live key is Vercel env id `rtQtYdwmANfAqfUg` (`get_project_env`, decrypts).
  `coach_turn_read` rows carry ONLY `properties.summary` — P0 forwards the
  fields. Zero native rows exist; native users' typed turns are in
  `coach_question_asked` with `ask_source` null (older builds) — filter
  `properties.summary NOT ILIKE '%surface=hint%'`.
- Real native typed turns, 60 days: ~20; Thai (one long session 2026-09-16,
  "teach me the Italian" ×8, the model's tools fired each time), German
  ("sollte springer schlagen"), "D5", a pasted PGN, a username, "What's my
  best opening?", "Which phase am I weakest in?".
- The reader misread "teach me the Italian" as `start-thinking-lesson` (R1);
  Learn's own router answered it right. A gloss problem in `CHAT_KINDS` —
  fix the gloss, do not add a regex.
- "teach me" → opening "me" is the phrase router's opening capture
  (`routeChatIntent` / the opening resolver), not the reader.
- `audit-reports/` is gitignored; `git add -f` the walk file (precedent:
  every hand-walk report in there is force-added).
- The docs-lane ship-check gate failed once on a pure-docs push and passed on
  retry with no change; the three doc gates pass locally. Not diagnosed.
- `npx tsc --noEmit` is vacuous here; `npm run typecheck` is the real one.

**Do not:** add a regex to fix a misread (fix the reader or its gloss); add a
gate/filter where a producer is wrong; let a kind fall through to the chain
(P3 makes that impossible — until then a null answer is a bug to fix, not a
default to rely on); re-add any free-model path; copy narration's importance
selector into chat (chat selects by what was asked).
