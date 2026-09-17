# BACKLOG — the master list

Long-running work that outlives any one session. **Not** a session todo list and
not a build plan: `PLAN.md` holds the LIVE build, `docs/plans/` holds the
archive, this holds the things that take weeks and must not be forgotten between
them.

Rules for this file: every item states what is DONE, what REMAINS, and the
MEASURED number behind both. An item with no number is a wish, not a backlog
entry. Update the numbers when you touch the area; never delete an item to make
the list look shorter.

---

## 1. Finish the creator corpora — only ONE of six is distilled

**Status: 1 of 6 done (David 2026-09-17: "we have finished only Naroditski's
corpus. we still need to finish the rest of those. that will happen in time.")**

The **voiced** corpus is the hand-authored, board-truth-verified, position-keyed
teaching that is the SOLE exact-position source on every play surface
(teach / play / review / read-position). Everything else can only teach a
pattern, never a board. Distilling a creator's videos into voiced notes is what
moves their teaching from "pattern" to "position".

**Done — Naroditsky:** 7,477 voiced notes, 6,498 distinct positions, 100%
position-keyed (`vc-` ids, `yt:` sources). Grown from 560 at the 2026-08-26
retirement — 13× in three weeks.

**Remaining — still floating-only (concept-reachable, position-blind):**

| corpus | notes shipping | position-keyed | reaches |
|---|---:|---:|---|
| saintlouis | 35,175 | 0% | tactics drill + endgame only |
| hangingpawns | 6,609 | 0% | tactics drill + endgame only |
| chessbrah | 2,766 | 0% | tactics drill + endgame only |
| **total undistilled** | **44,550** | **0%** | — |

**Raw material already on disk** (the anchored copies pulled on 2026-08-26, kept
whole in `data/archive/corpus-anchored/`): hangingpawns 3,600 · saintlouis 1,355
· naroditsky 1,282 · chessbrah 457 · hikaru 39 · imrosen 5 = **6,738 notes that
already carry a line**. These are a starting point for distillation, not a
shortcut — they were pulled precisely because farmed prose may not claim a
specific board (CLAUDE.md, the exact-position rule).

**The cost of the gap, measured 2026-09-17.** The retired generic bake covered 23
openings / 220 spine plies. Voiced covers **81 of those 220 plies (37%)** today;
21 of 23 openings have at least one position, but the worst are bare:

- Bird Opening **0/18**
- Polish / Sokolsky Attack **0/11**
- Rubinstein Opening 2/14 · Latvian Gambit 2/14 · Bishop's Opening 2/17

Everything not covered falls through to **computed** narration — which is why
defects in the computed path (`coachDecider`, `positionFacts`, the live
composer) now cost more than they did in August.

**Runbook:** `docs/voiced-narration-pipeline.md` — §8 is the absorb-a-batch
procedure (rebuild the 3 derived files, gate, ship; do NOT regen
`note-anchors.json` for a voiced-only batch). Tools: `scripts/voiced-authoring/`.

**Next honest step:** pick the creator whose openings overlap what students
actually play, not the one with the most notes. saintlouis is 35k notes but only
20% carry an opening name at all.

---

## 2. Prove the floating corpora still fire where they are fenced to

Raised 2026-09-17, unverified. The 44,550 floating notes are fenced to the
**tactics drill** (`tacticNoteForPuzzleThemes`) and **endgame lessons**
(`endgameNoteForLesson`). Nobody has shown a real note coming OUT of either
surface since the 2026-08-26 fence went in.

CLAUDE.md: *"A WIRE THAT DOES NOT FIRE IS NOT A WIRE."* Given four Learn audits
turned out to be dead on the same day this was raised, assume nothing. Owed: a
test that shows a real note in the output of each of those two surfaces.

---

## 3. Dead audit scripts referencing the retired bake

Found 2026-09-17. `audit-learn-full-game.mjs` was repaired (it died at import for
three weeks, which is why no full Learn game had been played). Three more still
reference the retired bake and have NOT been checked:

- `scripts/audit-teach-bridge-prod.mjs`
- `scripts/audit-teach-corpus-spoken-prod.mjs`
- `scripts/audit-teach-tiers-spoken-prod.mjs`

Plus tooling: `scripts/danya-corpus/{arrow-diff,coverage-report,narrate-from-video,print-spine,tier-coverage}` and `scripts/tts-prerender.mts`.

Root cause worth fixing structurally: the retirement commit swept `src/`,
`public/`, `data/` and `docs/` — and **zero** files under `scripts/`. Instruments
are outside the blast-radius habit, and nothing runs them on a schedule, so a
script that dies at import produces no signal at all.

---

## 4. Live Learn defects found reading a full game (2026-09-17)

First complete Learn game ever captured with a working narration wire — 22
plies to checkmate, 233 spoken lines, 630 audit events. Report:
`audit-reports/learn-full-game-2026-09-17T03-43-47-467Z/`. None of these are
fixed; each needs its own root-cause pass.

1. **A 184cp blunder is "under the floor, nothing to call."** Two coach moves in
   one game — `Qc7` at 122cp and `Qxc5` at 184cp — were classified as not worth
   mentioning. The advanced rating band's own threshold is 50cp. Whatever floor
   `coachVerdict` applies is mis-scaled or inverted.

2. **The coach coaches after checkmate.** Ply 22 speaks "Checkmate." and then
   continues with "The move is Rd1", "Re1 is playable, but not as precise",
   "Their king is still in the centre — every line that opens toward it is worth
   looking at." The terminal position must end the advice lanes.

3. **A false claim about a captured piece, UNFLAGGED.** "Your knight on b5 is
   hanging" spoken at ply 22; b5 was captured at ply 7 (`axb5`) and the student
   had no knights left at all. The board-checker covered 116 of 233 lines — only
   those carrying a FEN — so 117 lines ship unchecked and at least one is false.
   Fix the COVERAGE, not just the claim.

4. **Internal state in the voice.** "You're down 2 points of material here (no
   engine eval on this exact spot)." The parenthetical is the app explaining its
   own plumbing; the Narration Voice Rules ban interface references outright.

5. **Instrument, not product: the board-checker false-positives on
   hypotheticals.** It flagged "a4 was the move — it *would* create a passed pawn
   on b4" because b4 is empty now. Conditional and projected claims are not
   claims about the current board and must not be graded as such — this is the
   same class as the "fen" substring matching inside "de-fen-se".

6. **FIXED (2026-09-17) — a Watch-register paragraph in a live game.**
   `curatedBeatAt` has exactly ONE caller, `CoachTeachPage`'s live game reply;
   Watch and the LessonPlayer read their beats straight off `getLessonScript`.
   So hand-authored masterclass prose written to be WATCHED was served to
   somebody mid-GAME. Measured on five real opening lines: **44 of 93 plies
   fired a beat and 36 spoke as a spectator** — "Before White commits to the big
   central break, **he** takes away Black's pin", "**So let's rewind.**", said to
   the person who had just played those moves.

   🔴 **The earlier diagnosis here was WRONG and is deleted rather than
   annotated: "the beat goes into `factLines` for the phrasing pass … so the
   model COULD reframe it."** There is no model on that path. `buildVoicePackage`
   produces `pkg.spoken`, which is spoken verbatim — deliberately, as the purest
   G0. So the input's register IS the output's register, and no prompt change
   could ever have fixed this.

   The fix: `beatRegister(say, seat)` classifies the SOURCE at index time and
   `curatedBeatAt` takes the surface's register as a REQUIRED parameter. It never
   rewrites prose — a regex turning "White does" into "you does" is what that
   road leads to. The guard is a `continue`, so a position holding both a
   spectator beat and a clean one still teaches: the live walk fell from 44 plies
   to **32, not to 8**. What speaks now reads right — "Bb5 — the Ruy Lopez …
   you're leaning on the whole point", "White grabs kingside space with h4,
   threatening to trap your bishop. You make a quiet hole with h6."
   Gate: `curatedBeatRegister.test.ts`. Doctrine: CLAUDE.md, under THE SEAT IS
   PART OF THE SELECTION.

   **OWED — bake a live rendering for the other 2,436.** 1,312 of 3,748 beats are
   live-safe today. The rest are CORRECT where they live (Watch is supposed to
   say "White develops the knight") and must not be rewritten in place; they need
   an ADDITIVE second rendering, generated offline and gated exactly like the
   bake — `narrationAccuracy` for the board claims, `perspectiveVoice` for
   we/our, plus a check that the new text is `live-safe`. **Do NOT "recover" the
   2,436 by loosening either guard** — the seat or the register — that doubles
   the reach of the violation instead of removing it.

7. **Consecutive plies re-announce the same move from different lessons.**
   Reading the post-fix Italian walk: ply 5 "Bc4 — the Italian bishop", ply 6
   "Bc4 — the Italian bishop, pointed straight at f7", then ply 7 "c3 — modest",
   ply 8 "c3 — quiet, but loaded", ply 9 "c3 and d3 — the Giuoco Pianissimo".
   Five beats, three distinct ideas. `curatedBeatSeenRef` dedupes by beat ID and
   `buildVoicePackage`'s novelty set matches whole sentences, so two lessons
   teaching the same move in different words evade both. The dedupe term that is
   missing is the beat's SUBJECT (the move it leads with), not its text.
