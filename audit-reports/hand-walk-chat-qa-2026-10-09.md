# Hand walk — chat Q&A on the live build (2026-10-09)

Build: prod `2c0fc28` (= main code), muted hand driver, fresh device, 400 rating.
Surfaces: Learn (`/coach/teach`) and the standalone chat (`/coach/chat`).
Questions: the real App Store users' turns (PostHog, 60 days) + board questions.

## Score

| set | asked | right | wrong |
|---|---|---|---|
| Board questions (Learn, start + Italian after 3…Bc5) | 18 | 14 (2 with voice flaws) | 4 |
| Requests / real-user turns (both surfaces, 3 languages) | 9 | 2 | 7 |

## Every turn

### Requests (the real users' kind of turn)
| # | surface | asked | got | read as | verdict |
|---|---|---|---|---|---|
| R1 | Learn | teach me the Italian | lesson started | start-thinking-lesson (3.4 s) | ✅ (Learn's own router; the reading was wrong) |
| R2 | Learn | ผมอยากซ้อมเปิดเกมแบบอิตาลีสอนหน่อย (Thai: practise the Italian, teach me) | "no match for 'Italian Opening' — did you mean the Ware Opening?" | training-request | ❌ name lookup on the translation |
| R3 | Learn | sollte springer schlagen (German: should the knight take?) | answered in THAI; offered Black's knights to a White student at move 0 | candidate-move, invalid piece-ambiguous | ❌ language sticky; wrong seat |
| R4 | Learn | let's play a game, I'll be white | "You're White — your move." | command | ✅ |
| R5 | chat | I want to practice the Italian opening, teach me | navigated to `/coach/teach?opening=me`; "Ready to start the me walkthrough?" | training-request | ❌ router captured "me" as the opening |
| R6 | chat | make me a full training plan | import-your-games pitch; the Training Plan page never offered | training-request | ❌ |
| R7 | chat | can I start now? | "The best move is e4…" | conversational-reply | ❌ pending offer lost |
| R8 | chat | reset the board and teach me the Italian | "Board reset — fresh start." only | command | ❌ second half dropped |
| R9 | chat | Knight_mare_01 (a username) | "I am not sure what you mean." | unclear | ❌ (should ask: import this account?) |

### Board questions (Learn)
| # | asked | got | read as | verdict |
|---|---|---|---|---|
| B1 | what's the best move here? | Nc3, develops, balanced (15.7 s) | best-move, agree | ✅ slow |
| B2 | why is that the best move? | Nc3 develops; if Nf6 d3, if h6 O-O | why-best-move | ✅ generic reason |
| B3 | what about d4? | playable, Nc3 more accurate (13.1 s) | candidate-move | ✅ slow |
| B4 | is c3 good? | fine, prepares d4 | candidate-move | ✅ |
| B5 | what's my plan? | opens "a knight move first; h3 will still be there" — h3 never asked; then develop + castle | plan | ✅ with a stray move |
| B6 | what is black trying to do? | develop c8 bishop + g8 knight | plan | ✅ |
| B7 | why did they play Bc5? | "**My** bishop… that was **my** move" | retrospective-move | ✅ content, ❌ voice (coach never "I/my") |
| B8 | and why not d4? | "It's level… castle" — d4 lost | compare-my-move, disagree | ❌ follow-up lost the move |
| B9 | whats teh best move | Nc3 | best-move | ✅ |
| B10 | is my bishop on c4 good? | attacks f7, guards a2, loose | what-about-piece | ✅ |
| B11 | can they attack my bishop? | the best-move answer | attack-piece | ❌ read right, no answerer for THEIR side |
| B12 | what does Bc5 attack? | the "why did they play Bc5" answer, first person | attack-piece | ❌ read right, served another lane |
| B13 | is anything hanging? | "Loose: c4, e4, g2, a1, h1" — nothing is hanging | is-piece-loose | ❌ answers "unguarded", not "hanging" |
| B14 | what are my weaknesses? | import pitch | weakness-briefing | ✅ |
| B15 | turn the voice off | done | command | ✅ |
| B16 | thanks! | "Glad it helped." | chat | ✅ |
| B17 | what opening is this? | Giuoco Piano C50 + why | name-opening | ✅ |
| B18 | how do I castle? | the rules + "you can castle kingside here" | concept | ✅ |

### Across all answers
- **No arrows** on any answer that named a move (driver's board-arrow reader, Tips on and off).
- **Latency:** the read is awaited first, 1.0–3.4 s per turn; the first engine answer at a new position 13–16 s.

## What the walk shows (causes, not symptoms)

1. **A correct reading does not reach an answer.** B11, B12: read right, served
   the wrong lane. Kinds without an answerer for the case fall silently to the
   regex chain's default.
2. **The kind table is one-seat and one-intent.** No "their piece attacks
   mine" (B11); no compound turn (R8) — one kind per turn, the rest dropped.
3. **Requests go through the phrase router, not the reading.** Opening names
   are captured from raw words ("me", R5; "Italian Opening" → Ware, R2); the
   reader's `topic` is not used.
4. **Conversation memory does not carry.** A pending offer ("can I start
   now?", R7) and the last subject ("and why not d4?", B8) are lost.
5. **Language is a per-session accident.** The reply language stuck to Thai
   for a German turn (R3).
6. **The answer layer breaks voice rules** — first person on the opponent's
   moves (B7, B12) — and draws no arrows for the moves it names.
7. **Slow:** a serial read on every turn, then a fresh engine search.

Board questions mostly work (14/18). Requests — what real users actually type —
mostly do not (2/9).
