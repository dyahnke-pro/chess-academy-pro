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

6. **A Watch-register paragraph in a live game — 58% of the curated beats.**
   `curatedBeatAt` has exactly ONE caller, `CoachTeachPage:7462`, the live game
   reply; Watch and the LessonPlayer do not use it. So hand-authored masterclass
   prose written to be WATCHED is served to somebody mid-GAME. Measured over the
   19,259 beats carrying a `say`: 41% (8,021) are second-person and seat-bound,
   58% (11,238) are third-person ("White throws the b-pawn at the bishop"), of
   which 5,634 name no colour at all. The live standard is student = "you/your",
   opponent = "they/their"; a bare colour mid-flow is sanctioned only for a pure
   spectator model game. The beat goes into `factLines` for the phrasing pass
   rather than being recited, so the model COULD reframe it — it demonstrably
   does not, which is how "Black snatches your e-pawn" reached a Black student.
   Fix by reframing at selection or by ranking curated beats below the computed
   lanes on live surfaces. **Do NOT fix it by loosening the seat guard** — that
   doubles the reach of the violation instead of removing it.
