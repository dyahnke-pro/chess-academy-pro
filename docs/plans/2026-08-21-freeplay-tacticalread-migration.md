# Free-play → unified tacticalRead migration (+ coach memory, parked)

**Status:** in progress · branch `claude/danya-chess-teaching-patterns-e1efik` (PR #905)
**Owner directive (David 2026-08-21):** option 2 — migrate free-play onto the
unified `tacticalRead` engine so all narration surfaces share one "position
read." Done correctly = swap the ENGINE, not the behavior.

## Why (the measured baseline)

`scripts/show-freeplay-narrations.mjs` drives a real free-play game on live prod
and prints every `coach-narration-spoken` line + a heuristic DNA tally. Run on a
SOUND game (student = full-strength Stockfish, Evans Gambit, mate in 30):

| DNA device | measured | DNA target |
|---|---|---|
| but-turn (the tempting alternative, refuted) | ~0% | ~33% (all 147 videos) |
| calculation (concrete forcing lines) | ~4% | ~28% (beats principle 5:1) |
| multi-reason why | ~0% (single-reason) | avg 3.4 reasons/move |
| uncertainty | 0% | ~21% (where murky) |
| opponent-intent / threats | ~16% | present ✓ |

**The core inversion:** free-play leans on GENERIC PRINCIPLES ("As a rule in
these positions…" fired 5× in one game — the DNA's weakest register) while the
DNA's two defining high-frequency signatures — the but-turn and concrete
calculation — barely fire. On-DNA pieces that DO work: improve-worst-piece,
threats, guided find-the-move, an occasional refuted-capture ("that hit d6, but
c7 is holding it").

## Open findings (fold into the migration)

- **F1 — repetition is a missing FACT-level dedupe.** `reasonVoice.ts` why-strong
  lines have no cross-move "said" ledger (unlike plan/engineRead/pieceQuality),
  and it ROTATES templates — so the same fact ("f7 is the target") restates every
  move, dodging any verbatim-keyed ledger. Fix: dedupe on the computed fact
  (target square + reason), not the rendered string. This is the "one read, said
  once" the unification is meant to enforce.
- **F2 — mate-threat overclaim not swept.** `tacticsDetector.ts:289` emits "has a
  checkmate available from X" at the source; `tacticalRead` downgrades it, but the
  voicePackage/threat path reads the detector directly and ships the raw overclaim
  ("White has a checkmate available from d8"). Honest fix at the SOURCE: detector
  states the always-true "threatens mate from X"; only an engine-confirmed forced
  mate upgrades to "checkmate available."

## The migration (surgical — engine swapped, behavior preserved)

1. **Latency-safe assembler in `tacticalRead.ts`** — `tacticalReadFromLines(fen,
   topLines, studentColor, opts)`: build the full read (forcing line, named
   tactic, verdict, but-turn, uncertainty) from MultiPV lines ALREADY computed
   (`computePlyFacts` on the PV; `temptingFromAnalysis` for the but-turn). NO
   engine search. `opts.dropThresholdCp` / `opts.requireForcing` so free-play can
   match today's 150cp/forcing feel. Unit-tested.
2. **Free-play swaps the engine, keeps the wiring** — in `factsReady`, replace
   `buildRejectedTempting` with the assembler fed the `studentBest.topLines`
   already in hand. But-turn lands in the same fact slot, same `queueSpokenHint` +
   register packaging + 2/game cap. ADD the concrete forcing-line/named-tactic
   fact so calculation frequency rises. Fork-talk, think-aloud, piece-quality,
   plans, tactics alerts untouched.
3. **In-game register** — present-tense ("here you'd want X, but…"), never
   review's hindsight. Reuse free-play directives, not `TACTICAL_READ_DIRECTIVES`.
4. **F1 dedupe + F2 source fix** folded in.
5. **Arrows already match** — eval-gap guard stands (drops the trap-move yellow).
6. **Prove it** — re-run `show-freeplay-narrations.mjs`; but-turn/calculation
   should climb toward the DNA targets. ship-check green.

**Threshold decision (deferred to David):** preserve today's 150cp/captures-only
feel in free-play (conservative), OR open to 120cp/any-appeal (more Danya).
Default: preserve, note it, let David open it later.

**NOT in this migration:** multi-reason (GAP 2 — `explainBestMoveGrounded` returns
one prose string; needs the structured atomic-reason list). Separate follow-on.

## Coach memory (PARKED — do AFTER the position read)

Decisions locked (David 2026-08-21):
- **Per-device for now** (no cross-device cloud sync in v1).
- **Both A (silent, in-the-voice) AND B (visible history surface)** — B especially
  for live chat, but not limited to it.
- The scaffold already exists: `coachMemoryStore.ts` ("unified, persistent
  memory," Dexie-backed) — but only `intendedOpening` is populated; everything
  else is schema-defined and inert. The weakness/mistake/misconception services
  (`weaknessSpine`, `misconceptionService`, `mistakePuzzleService`,
  `badHabitDetector`, `tacticalProfileService`) compute what the user does wrong
  but feed the Mistakes/Weaknesses tabs, NOT the coach's voice.
- Memory = the STUDENT read (what's true about the person over time), the twin of
  the POSITION read. Same G0 law: code aggregates the record into facts, the voice
  phrases them — the coach never "recalls" from a context window.
- Three layers: student model (mostly computed already), episodic (games/positions
  seen, what was already taught), conversational (cross-surface CoachMessage log).

## Next-session pickup

Migration step 1 (the assembler) is the entry point. `buildRejectedTempting`
(`playCommentary.ts:493`) is free-play's ONLY caller of the old but-turn — safe to
retire after the swap. Every `temptingFromAnalysis` caller passes ≤3 args, so its
4th param is safe to extend to an options object.
