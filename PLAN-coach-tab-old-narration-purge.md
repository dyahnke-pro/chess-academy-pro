# PLAN — Coach-tab old-narration purge + floating fence (WO-VOICED-BAKE-TIER1, cleanup half)

David 2026-08-26. Branch `claude/wo-voiced-bake-tier1-btx0h9`. Coach-tab ONLY.
Opening tab untouched. **Voiced corpus rebuild + spoken bake stay ON HOLD**
(corpus is being hand-rewritten) — this cleanup does NOT rebuild
`voiced-teachings.json` or run `bake-spoken-notes.mjs`.

## Decisions (locked with David this session)
- The **new voiced notes** (anchored, exact-position, `opening:null`,
  board-truth-verified) are the sole exact-position narration on the coach tab.
  They fully replace the anchored farmed notes + the generic teach bake, better,
  no error.
- The **generic teach bake** (`src/data/walkthrough-narrations.json`, 23
  openings, no FEN/timestamp) is deleted from the app.
- The **anchored farmed notes** (any farmed corpus note WITH a `lineSan`,
  ~6,738 across danya/chessbrah/hangingpawns/saintlouis/hikaru/imrosen) are
  removed from app storage → archived (not hard-deleted), so they can't be
  selected or accidentally re-used.
- The **floating farmed notes** (58,235, no `lineSan`) STAY — but only where
  they belong: **tactics drills + endgame lessons**. David: "Make sure I hear
  no floating notes in the play surfaces. Make sure they stay where they
  belong."
- Play surfaces that must be floating-free (exact-position/voiced only):
  free-play, post-game review, read-position, teach, play phase-transitions.

## Why this is safe
- `noteAtPosition` is inherently floating-free (floating notes have no line to
  FEN/prefix-index) → review (mistakeNarration) + teach/free-play splice
  (openingGenerator) already can't hear floating. After the anchored strip they
  return only voiced.
- Floating leaks into play surfaces come only through the name/structure/
  concept/tactic selectors; each is fenced below.
- Tactics + endgame reach floating through DEDICATED functions
  (`tacticNoteForPuzzleThemes`, `endgameNoteForLesson`) that survive untouched.

## Phases
- **P1** Remove generic teach bake: delete `walkthrough-narrations.json` +
  `bakedNarrationFor` wiring (`bakedWalkthroughNarration.ts`, `openingGenerator`,
  `useTeachWalkthrough`) + its gates. Archive the JSON under `data/archive/`.
- **P2** Strip farmed anchored notes (`lineSan.length > 0`) from each farmed
  corpus JSON → archive removed notes under `data/archive/corpus-anchored/`.
  Voiced file untouched. Update corpus count gates.
- **P3** Fence floating out of play surfaces:
  - F1 `teachingSourceForBoard` → exact-position only (drop opening-family /
    structure / concept tiers). Tactics/endgame fall through to their dedicated
    fns, so unaffected.
  - F2 `CoachTeachPage` `secondarySupportNotes` + `notesForOpening` fallbacks →
    removed.
  - F3 `coachFeatureService` `spokenTacticNote` (review) → removed.
  - F4 `usePhaseNarration` transition → position-origin only.
  - **F5 (FLAGGED, default KEEP):** `buildDanyaTeachingBlock` live-tactic
    concept tier injects a floating tactic-concept note into teach/chat.
    Removing it reverses David's 2026-08-07 "inject tactic notes" request —
    holding for his call.
- **P4** Wire-fires tests: per play surface, prove NO floating note comes out;
  per tactics/endgame, prove a floating concept note still fires. Update the
  gates the tier removal changes to the new contract (living-audits rule).
- **P5** Docs: CLAUDE.md corpus section + `docs/voiced-narration-pipeline.md`.
- **P6** ship-check / typecheck / lint. No voiced rebuild, no spoken bake.

## Status
- [x] P0 plan doc
- [ ] P1 generic bake removed
- [ ] P2 anchored strip
- [ ] P3 fences
- [ ] P4 tests + gates
- [ ] P5 docs
- [ ] P6 ship-check
