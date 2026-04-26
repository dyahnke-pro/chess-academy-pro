# COACH-CONTROL — Vision Document

**Status:** Draft v1 — written 2026-04-26 after first night of full play-mode testing.
**Owner:** Dave (heart). Claude (editor-in-chief). Claude Code (hands).
**Companion to:** `COACH-BRAIN-00.md` (architecture), `TEACHING-MODE-VISION.md` (the lesson surface).

---

## What this document is

Two existing docs frame Chess Academy Pro's brain:

- `COACH-BRAIN-00.md` is the architecture — one brain, four sources, fourteen tools, six-part envelope.
- `TEACHING-MODE-VISION.md` is the lesson surface — a coach who demonstrates, not just talks.

This document is the connector between them. It captures the principle that emerged from the April 25-26 testing: **the coach has complete control over the app**.

Not partial. Not "controls the chat." Not "answers questions about the position." **Complete.** When the user says "open the openings tab," the coach navigates. When the user says "play knight to f3," the coach moves the piece. When the user says "set up the position before move 6," the coach sets the FEN. When the user says "draw an arrow to show me the threat," the coach paints the arrow.

The coach has hands on every surface. That's what makes it a coach instead of a chatbot.

---

## Why this matters

A coach who can talk but can't act is a podcast. A coach who can act on every part of the app is a coach.

Every chess app has chat. Every chess app has tools. None of them have a coach who can use the tools on the user's behalf — who can be told *"show me the Italian, then the Fried Liver trap, then put me back in my real game"* and just do it.

That capability is the moat. It's also what makes teaching mode (`TEACHING-MODE-VISION.md`) possible — because teaching requires demonstrating, and demonstrating requires hands.

This vision applies to ALL surfaces, not just `/coach/play`:

- **Coach board** — already partially wired. Move-selector works. Chat-surface play_move broken (WO-TEACH-FIX-01 / 02 in flight).
- **Openings tab** — coach should be able to navigate there, then highlight a specific opening, then drill into a line.
- **Tactics tab** — coach should be able to load a specific puzzle, walk through it, set positions for practice.
- **Weaknesses tab** — coach should be able to surface a specific weakness, navigate to a fixing exercise.
- **Kids mode** — coach should be able to switch personas, set difficulty, kick off a chapter.
- **Settings** — coach should be able to change voice, change difficulty, change opponent.

If the user can do it with their finger, the coach can do it with words.

---

## What we learned from April 25-26 testing

**What works today:**
- Chat coaching: rich, multi-turn, memory-aware. Voice quality good. Calibration framing visible in responses.
- `local_opening_book` consultation during opening play.
- `stockfish_eval` calls during analysis questions.
- `set_intended_opening` working when student commits to an opening.
- `navigate_to_route` partially working — the brain can navigate to `/openings`, but routes to a half-built `/coach/session/walkthrough` page when asked to "walk through" an opening.

**What's broken:**
- `play_move` from the chat surface — wired in PR #334, but action tags leak into voice output and tool dispatch may not be reaching the toolbelt from the streaming path. Under investigation in WO-TEACH-FIX-02.
- Take-back, position-set, board reset — tools don't exist yet.
- Annotation tools (arrows, highlights from the brain) — don't exist yet.
- Lesson surface — `/coach/session/walkthrough` exists in some half-built form, but isn't a real teaching surface.
- Phase narration — wired but suppressed in production.
- Voice splitter chops decimal numbers and short utterances mid-thought.

**What this tells us:**
The architecture is sound. The brain talks beautifully. But the coach's *hands* are mostly missing. We're shipping a coach with one fully-wired action (move-selector for the AI's own play) when the vision demands a coach with control over every surface.

Building those hands is the next phase of work.

---

## The control inventory

Tools the coach needs to have complete control. Status reflects state on `main` as of 2026-04-26.

### Tier 0 — Foundation (MUST work before any teaching ships)

| Tool | Status | Notes |
|---|---|---|
| `play_move` (chat surface) | 🔴 broken | WO-TEACH-FIX-02 in flight |
| Tag-strip in voice path | 🔴 broken | Action tags being read aloud |
| Action dispatch on streaming | ⚠️ unverified | Audit instrumentation in WO-TEACH-FIX-02 |

These aren't "nice to have." They're foundation. If the coach can't reliably do the things the wiring already supports, no new tool we build will work either.

### Tier 1 — Board control (the teaching foundation)

| Tool | Status | Notes |
|---|---|---|
| `take_back_move` | 🔴 missing | Currently using `onPlayVariation`/`onReturnToGame` patches; needs first-class tool |
| `set_board_position` | 🔴 missing | "Show me the position after move 6" |
| `reset_to_starting_position` | 🔴 missing | "Let's start over" |
| `play_sequence` | 🔴 missing | "Play out the next four moves so I can watch" |

These are the tools that turn the coach board into a teaching board. With these, "walk me through the Bishop's Opening" becomes possible — coach plays e4, pauses, narrates, plays Bc4, draws an arrow to f7.

### Tier 2 — Annotation (the visual coaching layer)

| Tool | Status | Notes |
|---|---|---|
| `draw_arrow` | 🔴 missing | "Watch this — the bishop is aiming here" |
| `highlight_squares` | 🔴 missing | Weak squares, key files, outposts |
| `clear_annotations` | 🔴 missing | Wipe between teaching beats |

These are what make demonstrations land. Voice plus arrows is half the lesson — far more than voice alone.

### Tier 3 — Multi-surface navigation

| Tool | Status | Notes |
|---|---|---|
| `navigate_to_route` | 🟡 partial | Navigation works; route choice sometimes wrong (`/coach/session/walkthrough` instead of staying on play board) |
| Surface-aware actions | 🔴 missing | Coach on `/openings` should be able to "show me the Italian" — needs openings-page-specific tools |
| Kids mode persona switch | 🔴 missing | "Switch to Kids mode and start chapter 3" |
| Settings tools | 🔴 missing | Voice, difficulty, opponent changes |

If the user can do it with a tap, the coach should be able to do it with a word.

### Tier 4 — Lesson mode (the destination)

| Tool | Status | Notes |
|---|---|---|
| `enter_lesson_mode` | 🔴 missing | Different UI rules, exit button, lesson header |
| `exit_lesson_mode` | 🔴 missing | Back to play |
| `pause_for_student` | 🔴 missing | Yield the floor mid-lesson |
| `lookup_traps` | 🔴 missing | Wire WO-TRAPS-* database |
| `lookup_lesson_plan` | 🔴 missing | Curriculum scaffolding |

Tier 4 is teaching mode from `TEACHING-MODE-VISION.md`. It depends on Tiers 0-3 working first.

---

## The acceptance bar (felt experience)

When `COACH-CONTROL` is "done," these things work end-to-end without ceremony:

1. **"Take me to the Tactics tab."** Coach navigates. Done.
2. **"Play knight to f3."** Knight moves on the board. Coach narrates the move it just made.
3. **"Take that move back."** Board reverts. Coach acknowledges.
4. **"Set up the position from the Italian Game after Bc4."** Board jumps to that FEN. Coach explains what we're looking at.
5. **"Show me the Fried Liver trap."** Coach plays through the move sequence with pauses, draws arrows on key squares, narrates each beat. Pauses for student questions. Returns to the original game when done.
6. **"Switch to Kids mode."** UI swaps. Coach voice/persona shifts to age-appropriate. New chapter loads.
7. **"What was that opening you mentioned in our last conversation?"** Coach references actual past conversation, navigates to the openings tab, highlights the entry.

If all seven work cleanly, the coach has complete control. The user feels like they're working with a real coach who happens to know how to drive the app.

---

## How this gets built (sketch, not plan)

The order is forced by dependencies. We can't skip ahead.

**Stage 1 — Foundation working** (in flight)
- Finish WO-TEACH-FIX-02 (voice tag stripping + dispatch audit)
- Verify `play_move` actually fires from chat surface
- Get the foundation acceptance bar from `TEACHING-MODE-VISION.md` to hold

**Stage 2 — Board control** (next)
- WO-CONTROL-01: `take_back_move` cerebrum tool + chat-surface wiring
- WO-CONTROL-02: `set_board_position` cerebrum tool + chat-surface wiring
- WO-CONTROL-03: `reset_to_starting_position` + `play_sequence` (depends on 01 + 02)
- After Stage 2: a real lesson-board demonstration is possible

**Stage 3 — Annotation layer**
- WO-CONTROL-04: `draw_arrow` cerebrum tool + board UI surface
- WO-CONTROL-05: `highlight_squares` + `clear_annotations`

**Stage 4 — Multi-surface navigation expansion**
- WO-CONTROL-06: surface-aware navigation (coach on openings tab can drive openings page actions, not just be present there)
- WO-CONTROL-07: settings + persona + kids-mode control

**Stage 5 — Lesson mode** (this is where `TEACHING-MODE-VISION.md` resumes)
- WO-TEACH-02 onward, on top of working control

We don't start any of this until Stage 1 is verified working. Foundation first.

---

## Open questions to revisit before drafting WO-CONTROL-01

1. **Take-back semantics.** When the user says "take that move back," do we undo just the student's last move (1 ply) or the full move pair (2 plies — student's move + coach's response)? The existing `onPlayVariation` mechanism in `GameChatPanelProps` handles undo+replay; the new tool should clarify which behavior is default and how the brain chooses.

2. **Position-set conflicts with active games.** If a student is mid-game and asks the coach to "set up the Italian after Bc4," does that:
   - (a) abandon the current game,
   - (b) save the current game state and let the student return to it,
   - (c) require an explicit "exit current game first" step,
   - (d) show a side-by-side or modal lesson board?

   The vision doc strongly implies (b) but the implementation has cost.

3. **Annotation persistence.** When the brain draws an arrow, how long does it stay? Until the student's next move? Until the brain explicitly clears it? Until a new brain response? Different choices have different feels.

4. **Surface-aware tool sets.** The brain on `/coach/play` shouldn't have access to "settings.changeDifficulty" — that's a surface-confusion risk. How do we scope which tools are available on which surface? (Probably: each surface declares which tools it wires its callbacks for, and the spine omits unwired tools from the envelope toolbelt.)

5. **Voice splitter rebuild.** Cosmetic but everywhere. Decimals chopped, short utterances split. Probably one focused WO before Stage 3 — a teaching coach can't sound robotic mid-narration.

These don't block the vision. We answer them when drafting individual WOs.

---

## What we will explicitly NOT do

- We will not give the coach control over the user's account, billing, or data export. Anything destructive or irreversible stays user-driven.
- We will not let the coach "take over" without a clear visible state change. The student always knows the coach is driving (lesson-mode header, animation pause, voice cue).
- We will not build a coach that interrupts active gameplay without consent. "Demo me the Italian" is invited; "Hey let me show you something while you're concentrating" is not.
- We will not let the coach mask hallucinations behind action calls. If the brain says "I'll show you the Sicilian" and emits a `set_board_position` for the Caro-Kann, that's a teaching-killer. The verification discipline from `TEACHING-MODE-VISION.md` applies here too.

---

## Why this is worth the work

A talking coach is a podcast.
A coach with hands is a coach.

Today we have a podcast that's getting close to coach-quality. The work in this document is the bridge from one to the other. Every tool we ship in Stages 1-3 makes the coach feel more like a real teacher — and unlocks the lesson surface that makes Chess Academy Pro categorically different from every other chess app on the market.

Six WOs, sequenced. Three to four shipping sessions if foundation holds.
