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
