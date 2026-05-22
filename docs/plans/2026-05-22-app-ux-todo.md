# App UX TODO + Brainstorm — onboarding & progress model (2026-05-22)

Forward-looking UX work captured during the Caro-Kann masterclass build.
Not started yet — parked here so it isn't lost. Two linked threads: how we
TEACH the user to use the app, and how we TRACK + CONVEY their progress.

---

## TODO 1 — Progress model (WLPP → tiers) + CONVEY it to the user

**The model (locked with David 2026-05-22).** Each WLPP verb advances one
progress tier:

| Verb | Tier | Trigger |
|---|---|---|
| **Watch** | `discovered` | auto, on watching the line's masterclass through (`markLineDiscovered`, exists) |
| **Learn** | `learned` | completing the Learn run **earns a question** — "Do you feel like you have this learned?" → **the user's "Got it" marks it learned**; "Not yet" keeps it discovered and brings it back sooner |
| **Practice** | `perfected` | drilled clean (`markLinePerfected`, exists) |
| **Play** | `mastery` | rolling `getMasteryPercent` from last 10 vs the coach |

**Key decisions:**
- **We ASK the user — the self-assessment is the marker, not just objective
  completion** (David, emphatic: "we do need to ask the user!"). For a
  single-user app, his self-knowledge IS the truth. Completing Learn only
  *earns the question*; the answer marks the tier.
- "Not yet" → SRS confidence rating: line returns for review sooner.
- The eventual **weakness/error ACCOUNTING gate = `learned`** — so
  watched-only and "Not yet" lines never count mistakes against the user
  (this is the "don't penalize new openings" rule, made precise).

**Build notes:**
- New `linesLearned[]` field on the opening record → **Dexie version bump +
  upgrade fn** (standing order).
- The "Got it / Not yet" prompt UI at the end of every Learn run.
- **CONVEY to the user:** show the tier per line/opening (discovered →
  learned → perfected → mastery), and message the loop so they understand
  what each verb does to their progress. This is the message David wants
  surfaced, not buried.

---

## TODO 2 — "How to use this app" onboarding bubbles (the "i" help)

The brainstorm: **info bubbles that pop up explaining what each tab does.**
Formalised by playbook §8 (onboarding) — build to that spec:

- An **"i" top-right on every page** → coach-narrated, spotlighted
  coach-marks that explain WHAT each area/tab does and WHY.
- **Auto-run on first visit, replayable** after via the "i".
- Reusable **`PageHelp`** component.
- Teach features **when they first matter**; use **empty-states as teachers**.
- Teach **THE LOOP**: learn → play → capture → drill (and now: the WLPP
  progress tiers from TODO 1 — explain Watch/Learn/Practice/Play and what
  each does to your progress).
- Concretely for the Masterclasses tab: a bubble on the tab itself + one on
  each WLPP button explaining the verb, plus the progress-tier messaging.

**TODO 1 and TODO 2 are linked:** the onboarding bubbles are HOW we convey
the progress model (TODO 1) to the user. Build them together.

---

## Status
- [ ] Progress model: `linesLearned` tier + Learn-completion "Got it/Not yet"
      prompt + tier display + Dexie bump.
- [ ] Onboarding `PageHelp` bubbles per tab (playbook §8) + WLPP/progress
      explainer.
- Accounting gate (weakness tagging) deferred until the `learned` gate exists.

---

## NEXT-SESSION PRIORITY ORDER (David 2026-05-22)

**1. Line-memorization SRS — the top lever (do BEFORE building opening #2).**
Another opening adds breadth, but the Caro/Ruy/Pirc/Vienna courses don't
*stick* without retention. SRS is what turns "I watched it" into "I can play
it under pressure." Build:
- Per-move SRS cards from the existing verified lesson lines: `(openingId,
  variation, ply)` → position FEN + correct SAN + SRS state.
- **FSRS** scheduling (not SM-2/Anki) — modern, fewer reviews, better
  retention. Surface due reps through the Training Plan + Dexie SRS store.
- **Drill the spine + KEY moves, not every filler move**, and keep the
  narration "why" attached to each card → "understand then retain", not rote
  (this is how it beats Chessable on our terms / honours the ideas-first ethos).
- Feed the "Got it / Not yet" self-assessment (TODO 1) into initial card ease.
- Natural home: the WLPP **Practice** mode (add scheduling + board-move grading).
- Multi-file build (scheduler + review UI + Training-Plan wiring) — needs a
  fresh session, not a 2%-data tail.

**2. Build opening #2 — needs David's repertoire first.** Pick from what he
actually plays (White 1st move + main Black answers), most-faced first — not
at random. Process is locked (playbook §0.5/§0.6); builders + gates + model-
game/trap pipelines all proven on Caro, so it's "author the data, it lights up."

**Done this session (in prod):** Caro masterclass (flagship+6 var+7 model
games+Qe2 warning), anti-invention gates 1-7, course-scoped coach chat,
continue-playing CTA, depth shortfalls extended, Stockfish engine-soundness
CI gate. Run the engine workflow to vet Vienna/Ruy deep tails.

---

## THE USER PATH — "the proper way to use the app" (what the bubbles teach)

The mantra: **Watch → Learn → Practice → Play → (Capture →) Drill.**
The first four climb the progress tiers (TODO 1); SRS + capture keep it from
leaking back out. This is the content the onboarding "i" bubbles (TODO 2)
must communicate, and the empty-states should nudge toward.

1. **First visit:** "i" bubbles walk each tab — what it does + why.
2. **Masterclasses tab → pick an opening you actually play.**
3. **Watch** the main line + each variation → get the ideas → *discovered*.
4. **Learn** → voice guides each move, you play it → "Got it / Not yet" → *learned*.
5. **Practice** → same line, silent, Hint on demand → clean replay → *perfected*.
6. **Play** → vs the coach, locked to the line → real reps → *mastery* (rolling).
7. **Ask the coach** anytime — scoped to the exact line being studied.
8. **Watch the model game** → see the idea win at the top level.
9. **Daily SRS reps** (once built) → due moves resurface so it doesn't fade.
10. (Future) **Capture** mistakes from real games → **drill** them.

The flywheel in one line: *learn it, play it, find the holes, drill them shut.*

---

## TODO 3 — Guide users back to Learn/Practice/Play after Watch

Problem: Watch is the satisfying part; users forget to climb L→P→P. Fixes:
1. **Tiered end-of-Watch hand-off.** The end-of-Watch CTA should tee up the
   NEXT RUNG, not skip to Play: Watch→"Now Learn it", Learn→"Practice it",
   Practice→"Play it". (Today's CTA jumps straight to Play — fix to step
   through the ladder.)
2. **Show the unfinished ladder everywhere.** Per line: `Watched ✓ · Learn ○
   · Practice ○ · Play ○` with the next rung lit. An incomplete ladder is a
   standing nudge.
3. **Training Plan resurfaces watched-but-not-learned lines** as today's reps
   ("You watched the Advance Caro — Learn it now, 3 min"). Re-entry point.
   Once SRS lands, due reps are the daily return reason.
- **Structural lever (already decided):** Watch earns only `discovered`, never
  `learned` — the system withholds "done" until they climb, so it's the nudge.

### TODO 3b — Progressive unlock / gating (David 2026-05-22, loved it)

Make the path a LADDER with gated unlocks — three nested levels:

1. **Rung-gating (per line).** Only the next WLPP rung is live; the rest are
   greyed/locked. Watch lit → finish → Learn lights up → Practice → Play.
   Guards: (a) completed rungs stay RE-OPENABLE (forward-lock only, never lock
   backward); (b) an "I already know this — unlock all" escape per line so it
   gates the learner without trapping the expert. Default gated.
2. **Line completion → reward unlock.** Finishing a line's full ladder earns a
   **mastered star** AND unlocks that line's **model game** as the payoff
   ("You've mastered the Advance — now watch Carlsen win with it"). Reward
   teaches + feels earned.
3. **Opening completion → graduation → next opening unlocks.** Mastering all
   variations graduates the opening and UNLOCKS THE NEXT OPENING in the
   repertoire queue (amateur-frequency order). The whole app becomes a path:
   openings unlock in order → variations within → rungs within those.

**Training Plan announces every unlock** ("Practice unlocked. Next: the …c5
break drill, 3 min") — the lesson plan tells them what just opened up.

Ties to TODO 1 tiers (discovered/learned/perfected/mastery ARE the rung
states) + TODO 3 (the come-back nudges become "next unlock" prompts).

### TODO 3c — Subline gating + what unlocks unlock (David 2026-05-22)

**Subline gating — light, not the full ladder.** Do NOT lock variation tabs
behind the ENTIRE Classical ladder — it's a DEFENCE (opponent picks the line),
and the Classical isn't even most-faced (Advance 37% > Exchange 30% >
Classical 21%), so full-ladder gating leaves the user unprepared for the line
they'll actually meet. Instead:
- Gate sublines behind the Classical's **WATCH only** (~9 min, teaches the
  core ideas every variation reuses) → then tabs open.
- Unlock variations in **amateur-frequency order** (Advance first), matching
  what they'll face — not the showcase order.
- Keep the **"unlock all" escape** for a surprise line tonight.

**Two-tier completion rewards (model game AND traps, at different moments):**
- **Line ladder complete → unlock the MODEL GAME** — the celebratory "watch it
  win at the top level" payoff. Reliable: one per variation.
- **Line/opening MASTERED → unlock its TRAPS/WEAPONS** — the "earned a weapon"
  power-up. Gate traps behind mastery because they're advanced/situational
  (don't drill the Qe2 punish before you know the line). Only fires where a
  REAL trap exists (Caro = the one Qe2 warning; empty > forced).

### TODO 3d — "Hidden gem" 💎 reward when a line has no trap (David 2026-05-22)

So EVERY line has an unlockable reward, no dead-ends. Reward ladder per line:
**model game (always) → trap/weapon (if real) → else a HIDDEN GEM.**

A gem = a piece of powerful, line-specific knowledge: *how to punish a common
INACCURACY by the opponent.* On-ethos because it's SOURCED, never invented —
same grounding as everything else:
- **Explorer** finds a move the opponent plays reasonably often at amateur
  level but that SCORES POORLY (a real, common inaccuracy — it shows up in the
  games the user will actually face, not a textbook curiosity).
- **Stockfish** confirms the punishing reply is genuinely best/winning.
- **chess.js** validates the line.
- Shape: "When White plays the lazy [common inferior move] here, punish with
  [engine-confirmed reply] — you're already better." Gate it on Stockfish
  soundness, like the rest.

This is the playbook §7 "exploit inaccuracy" idea repackaged as the per-line
unlock — and arguably MORE useful than a trap (traps are rare; inaccuracies
are everywhere, so every line yields at least one gem). Builder task like the
model games: query the line's key positions for a frequent-but-inferior
opponent move + the engine-best punish, author the insight.
