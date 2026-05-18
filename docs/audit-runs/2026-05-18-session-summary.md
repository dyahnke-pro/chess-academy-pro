# 2026-05-18 Overnight Audit & Fix Session — Summary

David asked: *"work independently overnight while I'm sleeping… coach
NEEDS to be able to answer these types of questions… audit the
opening tabs. Again. For the second time today."*

By morning: **12 PRs landed on main** + the deep-walk audit in flight.

## Bugs caught by the audit log David shared

### G1 — Coach refused to teach the Steinitz Gambit
- **Audit findings**: 249-260 (claim-validator-trip) + 246 (master-play-enforcement-fallback served the stock "I can't verify" response).
- **Diagnosis**: David asked "Walk me through the Steinitz Gambit in the Vienna" on /coach/teach. The Layer-D claim validator rejected every SAN (`exf4`, `Qd2`, `Bxf4`, `Bf5`, `Ne7`) because they weren't in the live Lichess top-N for the exact position, AND rejected the entity "Steinitz" because there was no `topGames` attribution. After 2 retries the stock fallback served and the conversation ended cold.
- **Fix**: PR **#592** — add `openings-lichess.json` as a second grounding source. The claim validator now accepts:
  - SANs that appear in any related opening DB entry's PGN (so canonical gambit moves pass).
  - Player names whose surname is embedded in a DB entry's NAME (so Steinitz Gambit ↔ Steinitz, Marshall Attack ↔ Marshall, etc.).
- Live master-play data still drives percentage/ratings/comparative claims; DB is purely additive.

### G2 — Walkthrough card-vs-voice mismatch (David's screenshot)
- **Audit findings**: ply 19/21 of Naroditsky Alapin trap-0. Voice said "White pushes d5, forking knight on c6 and bishop on g4". Card showed "10. d5 — Black strikes back in the center" (Black's ply-3 d5 narration painted on White's ply-19 d5).
- **Diagnosis**: `baseAnnotation` used `annotations.find(a => a.san === playedSan)` — returns the FIRST occurrence. The Alapin trap has TWO `d5` plies (Black ply 3, White ply 19); every later `d5` query collapsed to Black's narration.
- **Fix**: PR **#593** — shared `resolveAnnotationForStep` helper with OCCURRENCE COUNTING (the N-th occurrence of `playedSan` in expectedMoves maps to the N-th occurrence in annotations). Both the spoken voice and the displayed card now feed from the same helper.
- Also silenced bare-SAN voice during the LLM-enrich race window (findings 59/62/65: "c3", "c5", "e4" spoken at textLength=2).

### G3 — Service-worker load-failed unhandled rejection
- **Audit finding**: 195 — `runtime/unhandled-rejection: Script .../sw.js load failed`.
- **Diagnosis**: iOS-Safari cold-start race in VitePWA's auto-registration. Browser retries on next visit and the SW activates fine; the rejection is phantom noise.
- **Fix**: PR **#595** — filter the specific message class in `installGlobalErrorHooks.onRejection`, `event.preventDefault()` so the browser stays quiet.

## Audits I built and ran tonight

### Deep-walk audit script (PR #594, sped up in #596)

`scripts/audit-openings-deep-walkthrough.mjs` — sits down and plays
through every opening's sublines (variations + trapLines +
warningLines) move-by-move via Playwright. ~1060 sublines across the
pro repertoires (82 openings) and main repertoire (40 openings).

Six classified flag kinds:
- `card-empty` / `text-empty` / `continuing-this-line` — coverage
  gaps where the annotation render path returns empty.
- `generic-templated` — matches `isGenericAnnotationText`.
- `color-mismatch` — move label says White but narration begins
  "Black…" or vice versa.
- `san-not-mentioned` — soft heuristic.

Total ~6-8h to complete. Resumable via `AUDIT_RESUME=1`. Final
report will land in a follow-up commit when the run finishes.

Speed-up in PR #596 took per-subline cost from ~3min worst-case to
~12-20s by replacing four 2-second `locator.textContent` calls with
one `page.evaluate` DOM read.

### Existing data-only audits also run

- `audit-trap-orientation.mjs` — 128 entries from pro-repertoires:
  109 clean, **19 flagged** (1 INVERTED_MATERIAL, 8
  STUDENT_NOT_PUNISHER, 17 WEAK_TRAP, 1 UNCLASSIFIED).
- `audit-repertoire-orientation.mjs` — 259 entries from
  repertoire.json: **161 flagged (62%)** including 8 INVERTED_MATERIAL
  on sacrificial-attack lines (Fried Liver, Muzio, Allgaier,
  Traxler, Fajarowicz, Jerome, Lolli, Evans).

## Additional bug classes found by the deep-walk audit

### Cross-opening annotation drift (real bug — 2 cases)
- **Ponziani Opening / variation-0 / ply 9** — White's d5 narrated as "Black advances…"
- **Sicilian Sveshnikov (Carlsen) / variation-0 / ply 24** — Black's 12...Bg5 narrated as "White develops…"
- **Diagnosis**: `PRO_SUFFIX_TO_BASE` maps pro repertoire openings to a parent opening's annotation file. When the pro line's PGN diverges from the parent's after a few shared moves, the loader returned annotation entries whose tail described positions in a DIFFERENT line.
- **Fix**: PR **#598** — `annotationSetOverlap` SAN-multiset comparison. When the annotation set's SANs overlap the PGN's by < 70 %, trim to the strict-prefix match (synth/LLM-enrich handles the rest).

### Hardcoded-piece template narrations (81 cases)
Examples:
| Narration | Actual move |
|---|---|
| "White moves the bishop to e3" | g4 (pawn) |
| "Black develops the queen to h4" | Ne7 (knight) |
| "White moves the queen to f2" | Re1 (rook) |
| "White wins the piece on d8…" | c3 (no capture) |
| "Black castles kingside…" | Qh4+ (no castling) |
| "Black moves the rook to e8…" | exd4 (pawn) |

**Diagnosis**: Offline annotation generator walked the wrong PGN and
filled piece+square from a different line.

**Fix**: PR **#600** — 11 new patterns in `GENERIC_ANNOTATION_PATTERNS`
suppress these templates. Once flagged, `AnnotationCard` renders
nothing (better than wrong text), voice stays silent, and the LLM
enricher's `needsFill` predicate marks them refillable.

### Round 2 of templated narrations (430+ cases)
Sentence-frequency scan found more templates appearing 5-69× across
distinct sublines:
- 69× "From here, understanding the strategic plans…"
- 43× "The bishop on c4 controls key diagonal squares…" (and
      variants for d3, e3, e2, b5, c5, e7, f4, g5)
- 41× "The knight reaches a powerful central outpost on d4…"
- 30× "This is a key positional idea."
- 20× "The rook takes up a powerful position on the e-file…"
- Plus a Milner-Barry-Bd7 duplicate-text-on-consecutive-plies bug.

**Fix**: PR **#601** — 10 new patterns covering these templates +
"natural square" / "deploys" stub pair.

### Sacrificial trap classifications missing (8 cases)
**Diagnosis**: `repertoire.json` trap entries had no `kind` field, so
`audit-repertoire-orientation.mjs` treated all as `kind: trap`
(forced +3 material). Famous sacrificial-attack lines (Fried Liver,
Muzio, Allgaier, Traxler, Fajarowicz, Jerome, Lolli, Evans gambits)
correctly end with the student down material but with positional /
king-safety / initiative compensation.

**Fix**: PR **#604** — new sidecar
`src/data/repertoire-trap-classifications.json` mirroring the pro
sidecar pattern; the audit script reads it. INVERTED_MATERIAL count
dropped 8 → 0 ✓.

## Findings that AREN'T actionable in code

- **9,705+ text-empty events** — curated annotations cover ~ply 7-10
  on most pro repertoire lines; LLM enricher needs an API key the
  audit env doesn't have. Content gap, not a regression. Fix: curate
  more annotations OR rely on production LLM availability.
- **2,307+ san-not-mentioned events** — mostly false-positives
  per CLAUDE.md narration rule 3 ("Don't restate the board" —
  thematic narration is preferred).
- **34 PGN_NOT_IN_DB violations** — `repertoire.json` trap PGNs that
  don't anchor to any `openings-lichess.json` prefix. Violates G3
  ("Lichess DB is canonical"). Content fix needed.
- **126 WEAK_TRAP** — non-classified trap entries that would benefit
  from `kind: mistake` in the new sidecar. Follow-up curation.

## All PRs landed on main this session

1. **#592** `fix(coach): ground claims in openings-lichess.json, not just live master-play`
2. **#593** `fix(walkthrough): voice + card must agree on repeated-SAN lines`
3. **#594** `audit(openings): deep-walk script — play every subline ply by ply`
4. **#595** `fix(audit): suppress transient sw.js load-failed rejection on cold start`
5. **#596** `audit(openings): speed up deep walk + register in matrix + AUDIT_INDEX`
6. **#597** `docs(audit): save partial deep-walk audit data (392/1060 sublines)`
7. **#598** `fix(annotations): guard against cross-opening drift in loadAnnotationsForPgn`
8. **#600** `fix(narration): suppress hardcoded-piece templates that mismatch the played move`
9. **#601** `fix(narration): suppress more offline-generator templates (round 2)`
10. **#602** `docs(audit): update saved deep-walk audit data (640/1060 sublines)`
11. **#603** `docs(audit): save trap + repertoire orientation audit reports`
12. **#604** `fix(repertoire-audit): sidecar classifications for sacrificial-attack lines`

## What remains

- Deep-walk audit still in flight (~660/1060 at this writing). Final
  report will be committed when complete.
- Content curation pass on `repertoire.json` — 126 WEAK_TRAP entries
  could benefit from explicit `kind: mistake` classifications in the
  new sidecar.
- 34 PGN_NOT_IN_DB entries need curator review per G3.
- 5 TOOTHLESS_WARNING entries need PGN extension or
  reclassification.

These are content tasks; code-side audit infrastructure is in place.
