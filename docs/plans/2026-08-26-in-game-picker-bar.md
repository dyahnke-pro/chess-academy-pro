# In-game picker bar + real forks/traps (David 2026-08-26)

## The problem David hit
On `/coach/teach` (Learn) with the board at the top of the screen, the fork
picker renders in the controls area BELOW the chat/text field — out of view. The
walkthrough silently "stops" and a user who didn't expect a decision point never
sees the options and doesn't know why. Also: a fork labelled a "trap" in KIA vs
French didn't look like a real trap.

## Requirements (verbatim intent)
1. **All IN-GAME pickers sit in one bar directly under the board** — right where
   the `PlayerInfoBar` ("Player · 1237") sits now. Thin, like that bar. **Purple
   with highlights = the standard** (`purpleGlowStyle`, `rgba(167,139,250,…)`).
   No scrolling needed to see the options.
   - IN-GAME = pickers that appear DURING live play / a running walkthrough:
     **fork**, **gem/trap picker**, **quiz**, **drill picker**, **punish picker**,
     leaf continuation choices.
   - NOT in scope: the "pick your opening" / mode / stage-menu selection pickers
     — "good as is", leave them where they are.
2. **The coach ASKS OUT LOUD at a fork** — voice prompt: want to walk down this
   line, or see the trap? (Speak it when entering the `fork`/trap-prompt phase,
   voice-gated like the rest of the narration.)
3. **Traps must be REAL traps.** A fork/branch only carries a "trap" affordance
   when there is a genuine, engine-verifiable punishable line. If it IS a real
   trap: give it **more explanation and play it out longer**. If it is NOT a
   trap, don't call it one (it's just a variation/fork).
4. Forks stay interactive on the walkthrough FOR NOW (earlier "auto-only"
   pivot is on hold). Interactive forks remain the right thing for playing
   surfaces regardless.

## Plan
### Phase 1 — the under-board in-game picker bar
- New render slot immediately after `<PlayerInfoBar>` in `CoachTeachPage.tsx`
  (~L9973). When `walkthrough.phase` is an in-game decision phase
  (`fork` | `gem-picker` | `quiz` | `drill-picker` | `punish-picker` | `trap-prompt`
  | `leaf` continuation), render a compact, thin, `purpleGlowStyle` bar hosting
  the options horizontally (wrap on overflow), so it's visible with zero scroll.
- Move the option rendering out of the bottom `WalkthroughControls` for those
  phases (keep Pause/End secondary controls where they are; avoid a duplicate
  picker). Reuse the existing handlers verbatim (`walkthrough.pickFork(idx)`,
  gem play/skip, quiz choose, drill pick, punish pick).
- Keep the opening-selection / `choose-mode` / `stage-menu` pickers untouched.
- data-testids preserved so audits/gates keep passing.

### Phase 2 — voice prompt at the fork
- In `useTeachWalkthrough`, when entering `fork` (and when a real trap branch is
  present), speak a short grounded prompt ("Walk this line, or see the trap?")
  via the same voice-gated path. No new timer; honors verbosity.

### Phase 3 — real traps only, longer when real
- A branch earns the "trap"/"see the trap" affordance ONLY when it maps to a
  genuine engine-verified punish (the existing `tree.punish` gem system), not a
  plain variation. Audit the KIA-vs-French fork: confirm whether its flagged
  branch is a real trap; if not, drop the trap framing; if yes, extend the
  play-out (more steps) and the explanation.

## Gates / audit
- Typecheck + the coach-teach functional + adversarial audits (`scripts/audit-coach-teach-*.mjs`).
- 3-instrument prod audit of `/coach/teach` after landing (G1).
- Verify on a real fork position that the bar shows under the board with no scroll.

## Status
- Phase 1: in progress.
- Phase 2: pending.
- Phase 3: pending (starts with the KIA-vs-French trap audit).
