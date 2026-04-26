# TEACHING-MODE — Vision Document

**Status:** Draft v1 — written 2026-04-25 after first day of full Coach Brain integration testing.
**Owner:** Dave (heart). Claude (editor-in-chief). Claude Code (hands).
**Companion to:** `COACH-BRAIN-00.md` (the constitution).

---

## What this document is

`COACH-BRAIN-00.md` is the constitution of the brain. This is the constitution of *teaching*.

The brain currently knows how to chat with you, play moves against you, evaluate positions, and look up theory. That's a coach who can hold a conversation while you play.

This document describes a different surface: a coach who can demonstrate. A coach who says *"let me show you the Lasker Trap"* and then drives the board — sets the position, plays the moves at a teaching pace, draws arrows on the key squares, pauses for your reaction, asks what you'd play next.

That's the difference between talking about chess and teaching chess. We're building the second one.

---

## Why this matters

Every chess app on the market has games. Some have puzzles. A few have lessons (Chessable, Chess.com), but those lessons are pre-recorded human content delivered through static UI. None of them have a coach who responds to you, demonstrates on demand, and tailors the lesson to what you actually asked.

That's the moat. A 1200-rated player should be able to say "teach me the traps in the Bishop's Opening" and get a real lesson — not a video, not a slideshow, but a coach who walks them through it on the same board they just played a game on. With the same voice they've been talking to all session.

This is what makes Chess Academy Pro different. Not the openings database, not the puzzles, not the post-game review. The coach that teaches you.

---

## What we learned from April 25 testing

First full day playing the app with all six chat-style brain surfaces live. The audit log captured 300 findings across one session. Three takeaways anchor everything below.

**What worked beautifully.** Chat coaching is real. The brain held a long, multi-turn conversation about Bishop's Opening, the Caro-Kann, the relationship between knight outposts and pawn breaks. Conversation history shaped responses across 60+ exchanges. The multi-turn loop fired correctly, looping through Stockfish evaluations and theory lookups. When the student played a great move (`Rxb4`, `Nxf6+`, `Rxc8+`), `useLiveCoach` triggered "great-move" and the coach reacted in real time. The coaching voice — "you're cooking with gas," "let's turn up the heat," "you're absolutely right to flag that" — felt like a coach, not a textbook.

**What broke.** Phase narration evaluated 17 times during one game and suppressed every time — the coach never narrated a single phase transition. Voice splitter chopped decimal numbers across utterances ("you lost about 0." then "4." then "pawns"). Stockfish WASM crashed twice mid-game. The brain hallucinated five times in clearly identifiable ways: it referenced a queen on a1 that wasn't there, it told the student "a blunder is more than 1.8 pawns" (no such convention exists — invented threshold), it self-contradicted about a rook's position within seconds, it talked about going to the openings tab without ever emitting `navigate_to_route`, it discussed openings without ever emitting `set_intended_opening`.

**What this tells us.** The brain talks beautifully. The brain does not act consistently. Action tools (`navigate_to_route`, `set_intended_opening`, `local_opening_book`) exist but go unused — the brain narrates the intent without executing it. And the brain states things confidently from memory rather than verifying against `liveState.fen`. Both of these are tolerable in chat. Both would be unacceptable in a lesson. Teaching mode demands disciplines the play surface didn't.

---

## What teaching mode IS

A surface where:

1. The student requests a lesson in plain language. *"Teach me the Italian." "Show me the traps in the Caro-Kann." "Walk me through what to do when my opponent castles queenside."*
2. The brain takes control of the board. Not just talks about it — actually moves the pieces, draws arrows, highlights squares, jumps to specific positions.
3. The coach narrates while it demonstrates. Voice-first. The student listens and watches. They don't have to read.
4. The coach pauses for the student. *"Now you tell me — what would you play here?"* The board waits. The student plays a move. The coach reacts.
5. The student can interrupt. *"Wait, why didn't I play knight to f3 instead?"* The coach handles it, then returns to the lesson.
6. The coach exits cleanly. When the lesson ends, the board resets, the student is back where they were, and the lesson is logged in memory so the brain can reference it next time. *"Last week we covered the Italian — want to keep going with the Evans Gambit?"*

It feels like a grandmaster sitting next to you, drawing on a chess set, explaining things while moving pieces. That's the bar.

---

## What teaching mode is NOT (in v1)

- Not video. No pre-recorded content. The brain generates every lesson live, calibrated to the student's level and the conversation history.
- Not custom user-built lessons. The student asks; the brain decides. We're not shipping a lesson editor.
- Not multi-student. One coach, one student, one board.
- Not a curriculum. No fixed lesson tree, no prerequisites, no "complete level 1 to unlock level 2." The brain decides what to teach next based on memory and what the student asks for.
- Not a replacement for play. Lessons are a separate surface. Play mode keeps working exactly as it does today.

---

## What teaching mode demands of the brain that play mode tolerates

This section is the most important part of this document.

Play mode tolerates small brain mistakes. The student is moving pieces themselves; if the coach says "your queen is on a1" when it isn't, the student sees the board and corrects in their head. Annoying, not dangerous.

Teaching mode does not tolerate this. The student is trusting the coach to be right. If the coach says *"the threshold for a blunder is 1.8 pawns"* during a lesson, the student walks away believing it. If the coach says *"in this position, your queen on a1 is doing nothing"* and the queen isn't on a1, the lesson is incoherent and the student loses trust.

We saw both of these hallucinations in the April 25 audit log — confidently asserted, factually wrong. They were tolerable because the student was playing a game and could ignore them. They would be unacceptable in a lesson.

So before teaching mode ships, the brain has to learn three new disciplines:

### Discipline 1 — Verify the board before naming pieces or squares

The brain's identity prompt has to require it: *"Before naming a specific square or piece, consult `liveState.fen`. If unsure, call `stockfish_eval`. Never guess piece positions from memory."*

### Discipline 2 — Ground theory claims to source, or hedge

When the brain states a numeric threshold, a definition, a named pattern, or a "what masters do" — it has to either cite a tool result or qualify the claim. *"Roughly two pawns or more is usually called a blunder, though sources vary."* Not *"a blunder is exactly 1.8 pawns."*

### Discipline 3 — Act on intent, don't just narrate it

When the student asks to go somewhere, emit `navigate_to_route`. When they commit to an opening, emit `set_intended_opening`. When they're in the opening, consult `local_opening_book` first. The brain saying "got it, you want the openings page" without emitting the tool call is a hallucination of action. Same severity as a hallucinated piece position.

### The acceptance bar

Before any teaching mode WO ships: in 50 consecutive brain responses during a simulated lesson, zero hallucinated piece positions, zero fabricated chess theory claims, zero invented numeric thresholds, zero unfulfilled intents. We measure this with the audit log. If the brain fails the bar, we tighten the identity prompt and try again. We don't ship teaching mode until the bar holds.

This is a hard precondition, not a "nice to have." A teaching coach who lies confidently is worse than no teaching coach at all.

---

## What's missing from the brain today

### Board-control tools (cerebrum)

- `set_board_position(fen)` — jump the board to any FEN. Critical for *"let me show you what the Italian looks like after four moves."*
- `play_sequence(uci_moves[], delay_ms_between)` — play a series of moves at a teaching pace. The board animates each move with a pause between, so the student can watch the line develop.
- `draw_arrow(from_square, to_square, color, label?)` — show a planned move, a threat, or a piece's scope without playing the move.
- `highlight_squares(squares[], color)` — call attention to weak squares, key files, pawn chains, an outpost.
- `clear_annotations()` — wipe arrows and highlights between teaching beats.
- `reset_to_starting_position()` — back to move zero.
- `pause_for_student(prompt?)` — narrate, then wait for the student to play a move or speak. The coach yields the floor.
- `enter_lesson_mode(opening_name?, line?)` — flip the surface from "playing a game" to "watching a lesson." Different UI rules — no clock, no scoring, hints behave differently, student can't move pieces unless invited.
- `exit_lesson_mode()` — back to play. The board returns to whatever was there before.

### Theory tools (cerebellum)

- `lookup_traps(opening_eco_or_name, depth?)` — wire the existing traps database (WO-TRAPS-01 through WO-TRAPS-07) as a brain tool. Returns named traps with critical lines and the FEN where each becomes available.
- `lookup_lesson_plan(opening_or_concept)` — given an opening or a concept, return a structured outline: key ideas, common traps, typical pawn structures, the 3-5 positions worth showing a 1200-rated student.

### Identity additions

A new section in `src/coach/sources/identity.ts` for lesson voice:

- Narrate before showing. Don't move a piece silently.
- Pause after key moves. Let the position breathe.
- Ask the student to predict before revealing the answer.
- Use arrows liberally — the visual is half the lesson.
- Name patterns out loud. *"This is called a fianchetto."* Patterns the student can recognize later.
- When the student asks a question mid-lesson, answer it, then return to where you were.

---

## What's missing from the surfaces today

The board UI has to accept programmatic control:

- Arrows that can be drawn from the brain's tools, not just user mouse-drags. With optional labels.
- Square highlights from the brain.
- Position-set without animation (for `set_board_position`) AND with animation at a controllable pace (for `play_sequence`).
- A "lesson mode" UI state where the student can't move pieces unless `pause_for_student` has yielded the floor. Visually distinct from play.
- An "exit lesson" button that always works. Student should never feel trapped.

---

## The first real lesson

Every architectural document needs a proof point.

**Student:** *"Teach me the Bishop's Opening — and the trap lines."*

**Brain:** Enters lesson mode. Resets to starting position. *"The Bishop's Opening starts with king's pawn forward — same as the Italian — but instead of bringing my knight out first, I jump the bishop straight to c4."* Plays e4, then Bc4 (after assuming the student's e5 reply). Draws an arrow from c4 to f7. *"That bishop is staring at f7, your weakest square. Same target as the Italian. Different order."*

Pauses for student. Student plays a move. Brain reacts to it. Then continues into one of the named traps in the Bishop's Opening — the brain knows them because `lookup_traps('Bishop\'s Opening')` returned them. *"Let me show you a trap that catches a lot of players at the 1200 level. It's called…"* Demonstrates it. Highlights the key squares. Pauses again. Asks what the student would play.

When the lesson ends, brain says *"That's the Bishop's Opening and the most common trap inside it. Want to keep going with the Vienna — same family, slightly different idea — or play a game using what we just covered?"* Logs the lesson to memory. Exits lesson mode. Board returns to where the student was before.

If we can do that — that exact flow, end to end, with a 1200-rated student in real time — teaching mode works.

Bishop's Opening as the proof point because it's Dave's opening. The student we're building this for.

---

## How this gets built (sketch, not plan)

Roughly six work orders, sequenced. Numbers are placeholders.

1. **WO-TEACH-01: Brain verification discipline.** Identity prompt updates for Disciplines 1, 2, and 3. No new tools. Single file. Measure against the 50-response acceptance bar before continuing.
2. **WO-TEACH-02: Board control tools.** `set_board_position`, `play_sequence`, `reset_to_starting_position`, `clear_annotations`. Cerebrum tools plus the surface-side callbacks.
3. **WO-TEACH-03: Annotation tools.** `draw_arrow`, `highlight_squares`. Visual layer on the board UI.
4. **WO-TEACH-04: Lesson surface.** New surface mode. Different UI rules, exit button, lesson header. `enter_lesson_mode` and `exit_lesson_mode` cerebrum tools.
5. **WO-TEACH-05: Traps + lesson plan tools.** Cerebellum tools that wire the existing traps database and a new lesson-plan generator.
6. **WO-TEACH-06: The first real lesson.** Stitch it all together. Run the Bishop's Opening demo above end to end.

We don't start any of these until BRAIN migration is finished AND the verification discipline acceptance bar holds.

---

## Open questions to revisit before drafting WO-TEACH-01

1. Does the trap database from WO-TRAPS-01 through WO-TRAPS-07 already have the FEN-where-trap-applies field? If not, the data needs enrichment before it's tool-ready.
2. What's the right way to handle "the student plays a move during a pause that wasn't the move the lesson expected"? Brain reacts flexibly, but: does it correct them and continue, or does it abandon the planned lesson and follow the student's curiosity?
3. Should lessons be saveable / replayable? Or is every lesson ephemeral, generated fresh each time?
4. Voice-only lesson, or text + voice? Voice-first is the goal. But for accessibility and for students learning in environments where audio isn't possible, do we need a text mode?
