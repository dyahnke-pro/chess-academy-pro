# Comprehensive narration-verification audit (2026-05-25)

**David's directive:** every piece of hand-authored teaching prose in the app
must (a) carry both registers where applicable (full + short) and (b) record an
INDEPENDENT verification source (book corpus / reputable online), never authored
from training recall. *"Use independent verification — books, online — that's
the gate."* Plus: *"Add main opening lines… and any other areas. Turn this into
a comprehensive audit."*

**The instrument:** `node scripts/audit-narration-coverage.mjs` enumerates EVERY
narration surface and reports full / short / sourced coverage + which are gated.
Run it any time for the live picture.

## Surface inventory + status (2026-05-25)

| Surface | File(s) | units | full | short | sourced | gated |
|---|---|---|---|---|---|---|
| **beat-lessons** (main lines + variations + named traps) | `lessons/<opening>.ts`, `*Variations.ts`, `*TrapLessons.ts` | 869 | 100% | 100% | **0%** | — |
| punish-gems | `punish-gems.json` + `punishGemNarration.ts` | 134 | 94% | 94% | **94%** | ✓/✓ |
| middlegame-plan lines | `middlegame-plans.json` | 141 | 100% | 11% | 0% | ✓/✓ |
| common mistakes | `common-mistakes.json` | 93 | 100% | 60% | 0% | ✓/✓ |
| model games | `model-games.json`, `vienna-model-games.json` | 223 | 98% | 75% | 0% | — |
| pro-repertoire variations | `pro-repertoires.json` | 243 | 100% | — | 0% | — |
| endgame lessons | `endgame-principles/pawn-endings/rook-endings/drawn-patterns.json` | 27 | 100% | — | 100%* | — |
| mating patterns | `mating-patterns.json` | 37 | 100% | — | 59%* | — |
| checkpoint quizzes | `checkpoint-quizzes.json` | 133 | 100% | — | 0% | — |
| gambit variations | `gambits.json` | 55 | 100% | — | 0% | — |

\* endgame/mating already carry a position-level `source`/`history` field.

## Gates today (enforced in ship-check)

- **Coverage (full+short):** punish-gems, middlegame-plan lines, common mistakes
  (manifest-driven, shrinking baselines).
- **Verification (sources):** punish-gems (**baseline 0 — all 126 narrated gems
  sourced, done 2026-05-25**), middlegame-plan lines (baseline 134), common
  mistakes (baseline 56). Resolver: `src/data/narrationSources.ts`.

## Backlog (the grind — verify each against books/online, record source)

Priority order (David named main lines first):
- [x] **beat-lessons / main opening lines** — `sources?` on `LessonScript` +
  `lessonSources.test.ts` gate (156 lessons baselined: 24 main + 114 variations
  + 18 traps), wired into ship-check. NOW: source the 156 lessons opening by
  opening (re-seed baseline with `WRITE_LESSON_SOURCE_BASELINE=1 npx vitest run lessonSources`).
- [ ] middlegame-plan lines — 134 sources + 119 short cues.
- [ ] common mistakes — 56 sources.
- [ ] model games — gate + 223 sources (overview verification).
- [ ] pro-repertoire variations — gate + 243 sources.
- [ ] checkpoint quizzes, gambits — gate + sources.
- [ ] endgame / mating — formalize the existing `source` field into the gate.
- [ ] 8 Scotch positional gems (narration + sources).

## Done this session
- Gem narration: KG (20) + Scotch (7) + Italian (7) authored & sourced.
- **FIVE surfaces fully masterclass-sourced + source-gated, baseline 0 each:**
  punish-gems (126), main opening lines / beat-lessons (156), middlegame-plan
  lines (134), common mistakes (56), model games (92). Each verified opening by
  opening vs the book corpus and/or Wikipedia/Chess.com; refs in
  `scripts/opening-source-map.mjs` (one source of truth).
- Coverage gates (full+short) + verification gates wired into ship-check.
- This comprehensive audit instrument + the surface inventory.

## Remaining surfaces — honest notes (not yet gated)
- **pro-repertoire variations (243)** — real Naroditsky-voice `explanation`
  prose, BUT keyed by `pro-<player>-<slug>` ids with NO `openingId` field and 82
  openings (many non-masterclass: KID, Grünfeld, Semi-Slav…). A manifest-scoped
  gate needs a reliable id→openingId map first; forcing a fuzzy match would be
  wrong. Next: build that map (from `eco`/`name`), then gate + source.
- **checkpoint quizzes (133)** — `hint` prose is a coaching nudge for a quiz,
  not an authoritative theory claim; lower verification priority. Decide whether
  it's in scope before gating.
- **gambit variations (55)** — like pro-rep (`explanation` per variation);
  some already carry a mined `source`. Gate + source after pro-rep map exists.
- **endgame (27) / mating (37)** — already carry position-level `source` /
  `narration.history` (endgame 100%, mating 59%). Formalize into a gate +
  finish mating's 41%.
- **8 Scotch positional gems** — narration deferred (cp<1.0), then sources.
- **plan-line short cues (119) / common-mistake short cues (37 non-masterclass)** —
  coverage backlog, separate from sources.

**Next-session pickup:** `node scripts/audit-narration-coverage.mjs` for the live
picture. Build the pro-rep id→openingId map, then gate+source pro-rep / gambits;
formalize endgame/mating gates; finish the short-cue coverage backlog.

**Next-session pickup:** `node scripts/audit-narration-coverage.mjs` for the live
picture; wire the beat-lesson source gate next, then source main lines opening by
opening (book:<opening> for classical, verified URLs for modern).
