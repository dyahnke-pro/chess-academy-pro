# PLAN — coach-tab error checklist (2026-07-31, active)

David: *"I want a full check list of ALL errors found so I can see the progress
you are making. Fix everything."*

Every error found this session, from three sources: his device audit log
(build `fcdf531`, iPhone/standalone), his direct reports, and my own probes.
Status is honest — `FIXED` means shipped to `main` AND verified; `SHIPPED` means
on `main` but not yet confirmed on his device; `OPEN` means not started.

---

## A. From his device audit log (300 findings, build fcdf531)

- [ ] **A1. Walkthrough replays beats / walk goes backward** — SHIPPED (instrumented only, NOT fixed)
  Evidence: `transitionAfter pos@[…Nc3]` at 18:30:58, `pos@[…Bxf3]` at 18:31:13,
  then **back to** `pos@[…Nc3]` at 18:31:15, and the same 226-char "Bxf3 takes
  the knight…" spoken at 18:30:58.760 AND 18:31:16.337. Five nodes hit twice.
  Findings 43/44 also show two `transitionAfter` 15ms apart at different
  positions — a double-advance.
  Two causes fit and the log can't separate them: two concurrent narration
  chains ~2s offset, or one chain that rewinds. `narrateAndAdvance` now stamps
  a monotonic entry id + depth + path (`d8a9776`) so the next device log is
  decisive. **This is the one that ruins the lesson — top priority once the
  next log lands.**

- [x] **A2. Polly "fallover" log line** — NOT A DEFECT (corrected 2026-07-31)
  F111 logged `stream playback error: code=3 Media failed to decode → Web
  Speech`. I reported this as "fell over to the robotic voice mid-lesson".
  David: *"it never fell over to robotic web voice. It was Polly the whole
  way."* He's right — Polly was invoked at 18:27:30.812 and the fallover fired
  at 18:28:09.129, 38s later at the tail of that 851-char line, as the next
  beat began. The audio had already played. Keep an eye on whether the
  fallover triggers a silent duplicate utterance (relevant to A1), but nothing
  was audibly wrong.

- [x] **A3. Punish narration gated to EMPTY** — SHIPPED
  Eight `punish.narrationGate` trips with `kept: ""` (F129-136, F193-200). The
  gate returns `''` when it strips every sentence, and `?? x` doesn't catch an
  empty string — so the lesson shipped silent. Now falls back to a COMPUTED
  board-true line describing the move actually played (same fact composer the
  play-out uses). Empty beats wrong; computed beats empty.

- [x] **A4. Truncated sentence survived the gate** — NOT A DEFECT (my misread)
  The string is EXACTLY 120 characters and `coachAnswerGates.ts` slices the
  `kept` audit field at 120. I read a truncated LOG FIELD as a truncated
  sentence — same class of mistake as A2, twice in one sift. The gate log now
  carries `keptLength` + `keptTruncatedInThisLog` so it can't fool the next
  reader.

- [x] **A5. `persisted=false` on every boot** — PLATFORM LIMIT, not fixable in code
  F254/263/282/292 are the SUPPORTED branch: WebKit was asked correctly and
  REFUSED. `requestPersistentStorage` is already single-flight, fail-open and
  never re-prompts. No code change flips WebKit's answer, and claiming a fix
  would be inventing one. The audit now records `standalone` + `platformRefused`
  so the pattern is legible. **The durable answer is cloud sync** — the
  eviction risk is real and outside our control.

- [x] **A6. DeepSeek returned a wrong tool name** — SHIPPED
  F232: `emit_walkthrough_narrator` for `emit_walkthrough_narration` discarded
  a good generation. We force `tool_choice` to ONE function, so the call can
  only be ours — a near-miss name is now accepted (tight prefix match, short
  tails) and audited. A genuinely different tool still throws.

- [x] **A7. Ungrounded squares reaching the voice** — SHIPPED
  F144 (`d2, d8, c8, d7`) / F205 (`a2`). Root cause found: `repairConceptsStage`
  validated structure and path legality but ran NO board gate on the prose —
  concepts was the one stage with no `gradeNarrationText` at all, while
  findMove and punish both had one. A quiz could name a square that isn't what
  is on the board. Now gated against the position its `path` reaches.

- [ ] **A8. Lichess explorer 429** — EXTERNAL, no fix
  F2/F3 `upstream-blocked`, 30s cooldown. Their rate limit, already handled.

---

## B. From his direct reports

- [x] **B1. Middlegame play-out is SILENT** — SHIPPED `63d1fd4`
  `narratedContinuation.ts:79-99` only speaks on a phase transition or a ≥2pt
  material swing; every other move returns `text: null`. His log shows the
  continuation start followed by 16 straight `stockfish-cache-miss` with zero
  narration. Worse in his case: he was already in an endgame, so the phase
  never *changed* and even the transition line never fired.
  Fix = narrate every move with a computed why (engine PV + `detectTactics`),
  per the in-game register in CLAUDE.md.

- [x] **B2. Middlegame play-out draws NO arrows** — SHIPPED `63d1fd4`
  The continuation never sets narration arrows at all.

- [x] **B3. No endgame viewing option** — SHIPPED `63d1fd4`
  The endgame is an announcement inside B1's silent loop, not something you
  can choose to watch.

- [x] **B4. No "learn other lines" when a walkthrough finishes** — SHIPPED
  Leaf tiles only rendered where the tree itself branches; his Alapin
  sub-variation ended `children=0` so the leaf was a dead end. Falls back to
  the DB's sibling variations of the opening just taught, headed "Learn
  another line". Returns [] when the DB has none, so it self-hides rather
  than inventing lines (G3).

- [x] **B5. Deep dive reset to the start of the line** — SHIPPED `d8a9776`
  Now hands over the SANs already watched; the new lesson walks that prefix
  and narrates from the first unheard move.

- [x] **B6. No forward/back navigation** — SHIPPED `d8a9776`
  `stepBack()` re-narrates the previous move, beside Skip.

- [x] **B7. Permanent spinner read as "stuck loading"** — SHIPPED `d8a9776`
  It was never a loader — a spinning `Loader2` used as the "narrating"
  indicator. Replaced. (It was NOT causing the replay; see A1.)

- [x] **B8. Fork "Deep dive" tile dead-ended the lesson** — FIXED `1eebc0c`
  A 69-char canonical name blew the 60-char bare-name cap and fell through to
  the brain. Verified on prod, 11/11.

- [x] **B9. "Repetitive, nothing like Naroditsky" narration** — FIXED `1cc5dc4`
  DeepSeek returned malformed JSON; the whole lesson dropped to template
  sentences. Now salvages the complete prefix and retries wider. Confirmed
  firing on his device (F228/229: 0/3 plies at 8192 → 3/3 at 16384).

---

## C. Coach-tab arrow work (his 4× repeated report)

- [x] **C1. Arrow geometry mismatch** — FIXED `18dafca`, measured on prod
  Identical shape class both surfaces (same stroke-width/square, opacity 0.65,
  arrowhead polygon).
- [x] **C2. Marker colour collapsed to green** — FIXED `ac98484`
  `toNamedColor` matched colour *words* against rgba *literals*, so every
  authored marker fell through to green. Opening tab yellow, coach tab green.
- [x] **C3. Board settings ignored** — FIXED `b5bdba6`
  `ChessBoard` never read `settings.highlightLastMove`; all accents hardcoded
  to the Cyan preset, ignoring the other 11 colours + None.
- [x] **C4. Phantom arrows from prose scraping** — FIXED `ed7311b`
  31 false arrows removed across 21 baked openings; shadow diff reviewed.
- [x] **C5. Silent arrow cap** — FIXED `fcdf531`
  A ply naming >6 moves dropped the tail with no record.
- [ ] **C6. Opening tab still uses the old scrape** — DEFERRED by David
  `LessonPlayer` / `PlayableLinePlayer` have the same weakness. He scoped this
  to the coach tab; not touching without a word.

---

## Order of work

Everything except **A1** is done. A1 is instrumented and waits on his next
device log — he's sending one once the rest landed.

### Universality (David 2026-07-31: "I will be choosing a different opening")
Everything shipped today was diagnosed on ONE line (the Alapin), so it was
swept across 12 structurally different openings — both colours, open/closed,
gambits, fianchettos, queen's-pawn and flank systems — plus castling both
sides, promotion, en passant, and an unreadable position.
`continuationMoveNarration.universal.test.ts`, 41 assertions, all green.
Two gaps that sweep found, both now closed:
- the A7 concepts gate skipped questions carrying NO path — they were checked
  against nothing at all. It now defaults to the tree's own start position.
- my first universality assertion was itself wrong: it checked arrow legality
  against the START position, which defeats a chained plan ("Nf3, then d4 and
  Qd2" — Qd2 only becomes legal once the d2-pawn has left). Replaced with the
  invariant that actually matters visually: an arrow's origin must hold a
  piece the student can see.

### Two of my own reports were wrong, and both the same way
A2 and A4 were LOG-FORMATTING artifacts I reported as defects: a fallover
logged 38s after the audio had played, and a 120-char audit slice read as a
cut-off sentence. Both audit fields now state their own truncation/timing so
the next reader isn't misled. Worth remembering when sifting a log: check
whether the field is a preview before calling it a bug.

## Next-session pickup

Run the coach-teach surface on prod and pull the audit stream. If
`useTeachWalkthrough.narrateAndAdvance` entries show **two interleaved id
sequences**, it's concurrent chains (find the second `start`/`resume` caller);
if it's **one sequence whose depth decreases**, it's a rewind (look at
`transitionAfter` / the delta-aside guards).

---

## PUNISH LINES MUST PLAY OUT (David 2026-08-01, permission granted to touch stage-gen)

"Make sure the gem lines are not sparse and play out fully… and it needs to
play out. You have permission to touch the punish stage gen."

Three surfaces show a punish. Two are fixed, one is not.

| Surface | Source | Plays out? |
|---|---|---|
| Gem tiles (opening tab) | mined `punish-gems.json` | ✅ `extend-punish-gems.mjs`, 344 lines |
| Live callout (Play + Learn) | same mined data | ✅ `gemCrushLines.reveal` speaks until the advantage lands |
| **Tree punish stage** | runtime stage-gen | ❌ **OPEN** |

### The defect
`PunishLesson.followup` is OPTIONAL and ungated for depth:
- puzzle-derived path (`openingGenerator.ts:3000-3005`) ends where the PUZZLE
  ends, not where the advantage lands;
- LLM path is only truncated for ILLEGALITY (`:780-795`), never extended.
So the student finds the punish and the line stops before the payoff is visible
— the exact defect fixed for the gems.

### The fix (proven pattern, from `scripts/extend-punish-gems.mjs`)
After the punish, play engine best-moves for BOTH sides until:
1. QUIET — side to move not in check, engine's best is not a capture/check;
2. SETTLED — held two consecutive plies;
3. SHOWN — punisher up real material, or mate.
Never let the opponent cooperate; if best play dissolves the edge, KEEP the
short line (that's the truth about the lesson). Cap the walk.

### The design decision this needs FIRST
Unlike the gems, this is RUNTIME generation, so engine playouts add latency to
the "…about a minute" first-generation path. Pick one:
- (a) extend at generation time, cache with the lesson (slower first build,
      instant thereafter — consistent with how the walkthrough already caches);
- (b) extend lazily when the student reveals (no build cost, brief pause on
      reveal);
- (c) extend offline for curated openings only, leave generated ones short.
Recommendation: (a) — it matches the existing cache contract and the cost is
paid once per device, on a path that already warns the user it takes a minute.

### Narration
Each appended ply needs board-true text. `narrateContinuationMove`
(`src/services/continuationMoveNarration.ts`) already does exactly this and is
what the gem demonstration tail uses — reuse it, do not author prose.

---

## ARROWS MUST COME FROM THE NOTES, NOT THE MODEL'S PROSE (David 2026-08-01)

"It shouldn't decide. The narrations are grounded in the notes. Whatever the
notes say about squares are what get arrows. It should be G0."

### What is wired today (verified, `openingGenerator.ts:1733/1757/1866`)
`deriveNarrationArrows(text, fen, moves)` runs on the model's FINISHED prose.
Code scrapes the narration for named moves/squares and draws arrows for those.
Deterministic, and it honours "nothing more, nothing less" — but it is
derive-AFTER, so the MODEL still decides which squares get arrows by deciding
what to mention. Vague prose ⇒ no arrows.

### What it must become (G0)
The notes are the ground truth:
1. Extract the squares/moves the NOTE names (same matcher, different input).
2. VALIDATE each against the LIVE FEN — origin occupied, square real, sight-line
   clear. This check is load-bearing and must survive the inversion: a note is
   keyed to an opening/line, so its squares are not automatically true at the
   position on screen. Without it, grounding in the notes would let a note about
   a typical structure draw an arrow from an empty square — exactly what the
   board-claim gates exist to prevent.
3. Hand the survivors into the package as ARROW FACTS.
4. The model VOICES the note. It never picks a square.
Arrows and prose then match by construction, not by scraping.

### Why this is the right direction
G0: "the LLM generates ZERO chess content… its ONLY job is to phrase those
facts." Arrow choice is chess content. Derive-after leaves that choice with the
model; hand-before removes it.

### Care
- Do NOT rewire the coach arrow path twice in a week without re-running the
  arrow-parity audit (`scripts/audit-arrow-parity-prod.mjs`) — three separate
  measurement errors were made against it on 2026-07-31; read its header first.
- Keep the per-ply arrow cap's audit (`C5`) — a silently dropped arrow is the
  regression that started this whole thread.

---

# PLAN — the computed-narration lanes, wired for real (2026-08-10)

David: *"I want you making sure that every thing we have added is wired and
working 100% like it should!! … Ex: delta, PV structure, backwards PV, package
delivery, order of package, etc."*

The audit method that found everything below: enumerate every exported symbol in
the narration services, count NON-TEST consumers, then trace each survivor to
the VOICE rather than to the prompt array. None of these threw. None failed a
test. Each just quietly said nothing — or, worse, said the right sentence about
the wrong move.

## What was actually broken

1. **The backward look was one turn stale on every move.** The voice read
   `discussion.lastMoveDrawback`, which is set by `evaluatePlayerMove` — fired
   behind a deliberate `setTimeout(…, 6000)` on Learn so the engine worker stays
   free for narration. The instant package assembles ~2s after the move, so it
   always read the PREVIOUS move's result. It does not go quiet when stale; it
   MISATTRIBUTES, and board-grading cannot catch it because "that took your last
   defender off e5" is often still true two plies later.
2. **The coach's own mistake callout could not fire once.** Same deferral: the
   verdict's FEN guard compared against `coachToMove`, filled 6s late, so it
   correctly refused every single turn. Wired end to end, dead.
3. **`findConcession` had no consumer** — the coach's QUIET concessions (last
   defender leaving, file cracked beside its own king) were computed and mute.
4. **`forkOfferAt` had no consumer** — the in-book fork David asked for the same
   day. `forkTalk` covers the ENGINE-near-equal case, not the theory split.
5. **`concessionPackage` had no consumer but its own test**, and its `withhold`
   field was a directive to a model — the shape `voicePackage` deliberately has
   no room for.
6. **`npx tsc --noEmit` checks NOTHING here.** The root tsconfig is a solution
   file with `files: []`. Use `npm run typecheck` (`tsc -b --force`); it found
   five real errors the root config had been reporting as clean.

## The fix

- **`src/services/backwardLook.ts`** — ONE model, both sides, both callers. The
  hook keeps calling it for bookkeeping (My Mistakes / drills / weakness spine);
  the surface calls it for speech, from a read this turn owns.
- **One engine read of `move.fen`**, started during the coach's think pad,
  answers both questions: it is where the student's move ARRIVED and where the
  coach moves FROM. The pre-move read is free — the eval-bar effect had already
  analysed that board and was throwing it away.
- Mate travels in its own field. Folded into centipawns it is a six-figure
  sentinel, and the coach reports walking into mate as a cost of 100,000.
- **`fork` lane** added to the package at rank 6.
- **`SidePlan.aside`** — "your pieces on a1, c1 and d1 sit this one out" is a
  noticing, not a want. Its own sentence AND its own field: as a tail on `text`
  it repeated once per road in the fork offer's previews.

## Order, verified end to end
`note > mistake > coachMistake > drawback > plan > gem > threat > tactic > fork
> opening > computed > observation`, with `borrowed` yielding to the plan.

## Gates
`backwardLook.test.ts` (18), `coachLaneWiring.test.ts` (28 — rewritten: the old
version asserted the broken shape and passed), plus the idle-piece and
fork-budget rules. The wiring gate now reads COMMENT-STRIPPED source, so a rule
about what the code must not do cannot trip on the note explaining why.

## Still open, deliberately
- **`roadsNotTakenAt`** — built and tested, no consumer. It is the REVIEW form,
  and David asked for review wiring to be designed with him first. Not included
  in any "everything wired" claim.
