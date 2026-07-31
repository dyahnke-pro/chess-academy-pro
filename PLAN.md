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

- [ ] **A3. Punish narration gated to EMPTY** — OPEN
  Eight `punish.narrationGate` trips with `kept: ""` (F129-136, F193-200). The
  board-claim gate dropped the whole sentence, so those punish lessons ship
  with no narration at all. Empty > wrong, but empty is still a hole.

- [ ] **A4. Truncated sentence survived the gate** — OPEN
  F173 `danyaSplice.narrationGate` kept `"…Black should update which squares
  become safe for their pieces, like"` — ends mid-clause and gets spoken.

- [ ] **A5. `persisted=false` on every boot** — OPEN
  F254, F263, F282, F292. Storage persistence is refused, so iOS may evict
  Dexie — games, progress, opening cache. Data-loss risk, not cosmetic.

- [ ] **A6. DeepSeek returned a wrong tool name** — OPEN
  F232: `emit_walkthrough_narrator` instead of `emit_walkthrough_narration`,
  which threw away the entire first attempt. The retry recovered it. Accepting
  a near-miss name is far cheaper than a full re-call.

- [ ] **A7. Ungrounded squares reaching the voice** — OPEN
  F144 (`d2, d8, c8, d7`) and F205 (`a2`) tripped `voiceFacts.containmentTripwire`
  — the LLM introduced squares with no grounding. A G0 leak.

- [ ] **A8. Lichess explorer 429** — EXTERNAL, no fix
  F2/F3 `upstream-blocked`, 30s cooldown. Their rate limit, already handled.

---

## B. From his direct reports

- [ ] **B1. Middlegame play-out is SILENT** — OPEN *(his biggest complaint)*
  `narratedContinuation.ts:79-99` only speaks on a phase transition or a ≥2pt
  material swing; every other move returns `text: null`. His log shows the
  continuation start followed by 16 straight `stockfish-cache-miss` with zero
  narration. Worse in his case: he was already in an endgame, so the phase
  never *changed* and even the transition line never fired.
  Fix = narrate every move with a computed why (engine PV + `detectTactics`),
  per the in-game register in CLAUDE.md.

- [ ] **B2. Middlegame play-out draws NO arrows** — OPEN
  The continuation never sets narration arrows at all.

- [ ] **B3. No endgame viewing option** — OPEN (feature)
  The endgame is an announcement inside B1's silent loop, not something you
  can choose to watch.

- [ ] **B4. No "learn other lines" when a walkthrough finishes** — OPEN (feature)
  Leaf deep-dive tiles only render when the tree has its own branches. His
  Alapin sub-variation ended `children=0`, so nothing was offered. Should fall
  back to the parent opening's sibling variations from the DB.

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

1. **B1 + B2** — the silent middlegame. Biggest felt quality gap.
2. **A3, A4, A7** — narration gates leaving holes or letting fragments through.
3. **A6** — cheap tool-name tolerance.
4. **A5** — storage persistence; data-loss risk.
5. **B3, B4** — endgame step + learn-another-line.
6. **A1** — the replay, once his next log carries the entry ids.

## Next-session pickup

Run the coach-teach surface on prod and pull the audit stream. If
`useTeachWalkthrough.narrateAndAdvance` entries show **two interleaved id
sequences**, it's concurrent chains (find the second `start`/`resume` caller);
if it's **one sequence whose depth decreases**, it's a rewind (look at
`transitionAfter` / the delta-aside guards).
