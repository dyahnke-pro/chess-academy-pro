# WO-COURSE-01 D — club replies in the reply tree (swarm agent report)

Branch: `worktree-agent-ac940e39216f09f5e`. Built 2026-10-29.

## What shipped

- **Builder** `scripts/course-replies/build-club-replies.mjs` (pure half
  `club-replies-lib.mjs`, tested). For every reply the explorer walk measured
  (`audit-reports/course-replies-count.json`), it re-checks the reply against
  the CURRENT course, plays it, then the student's answer and the line on
  through THE ONE walker (`line-walk.mjs`: masters' move from ≥ 8 games, the
  student's within 50cp of the engine, a known mistake punished, else the
  engine's best — the engine only vetoes). Length rule = the course's own
  (`build-course-sublines.mjs`): at least two student moves past the reply,
  ending on the student's move, in a middlegame (`reachesMiddlegame`). The last
  board is graded by Stockfish (depth 14). Shards checkpoint each line to
  `data/sources/club-replies/lines.shard-<i>.jsonl` (gitignored) and stop at a
  time budget; a re-run resumes.
- **Data** `public/data/club-replies/<openingId>.json` + `index.json` — fetched
  when an opening page opens (never at boot), its own service-worker cache
  (stale-while-revalidate), one version entry, stripped from the native bundle
  and downloaded on demand through `dataFile`. Each line carries its reach and
  its share at the board for each walk band (1000–1200 / 1400–1600 /
  1800–2000), its end eval and a gambit flag.
- **App** `clubReplies.ts` (placement by BOARD on the tab's line from the tab's
  reply floor, or inside a curated reply the tab shows — then `via` joins its
  identity), `facedReplies.ts` (what the student's opponents played, from the
  games store), `replyTree.ts` (groups by board; order inside a group: met in
  own games first, then the course's replies, then club replies by reach at the
  student's band — `explorerBandFor` over the adaptive rating). Tagged **Club**
  (`replyTags`, now a required `source`). Each opens the same SublineDetail →
  generated Watch / Learn / Practice / Play (computed voice) → Learn puts it in
  spaced review.
- **Audit row** `club-replies-ordered` (ReplyTree) with its contract R13 in
  `scripts/audit-course-replies-prod.mjs` and the algo-audit gate entry.
- **Gate** `scripts/course-replies/clubReplies.gate.test.ts`: every shipped
  line is still new against the current course, legal, ends on the student's
  move in a middlegame, and not below −1.0 for the student unless a gambit's.

## Root fixes found on the way

1. **One reply identity** (`replyIdentity.ts`): the review/rung key and the
   narration key were two hand-written copies of `tab::move@ply`. A reply
   inside another reply's line can share both with a reply on the tab's line
   (same tab, move and ply, different board), so it would have shared review
   cards, rungs AND hand narration. `via` is now part of the one identity;
   every existing key is unchanged.
2. **Review grading parity** (`courseMoves.taughtMovesByPosition` takes the
   student's learned cards, required): a games or club reply line the student
   learned lives in no course file, so its moves were graded misses in every
   other line's review.
3. **One gambit rule** (`gambit-name.cjs`) for the grounding builder and this
   builder; **one course reader** (`course-lines.mjs`) for the explorer walk and
   this builder (proven identical on all 167 openings); **one opponent-reply
   replay** (`addOpponentReplies`) for the home steer and the faced index (it
   also stops counting an illegal token, and counts normalised SAN); **one
   reply floor** (`replyFloorPly`) for the games' and the club replies.

## Counts (this run — 12 of 167 openings walked when the branch was built)

The walk restarted at 21:04 UTC (4:04 PM CT) on 2026-10-29 and covers about
one opening every 5–6 minutes; this branch carries what was done by the last
copy (Italian, Ruy Lopez, Scotch, Vienna, King's Gambit, Four Knights, Glek,
Najdorf, Dragon, Sveshnikov, Alapin, French).

| step | count |
|---|---|
| walk candidates (discovery pass, all 1000–2000) | 582 |
| walk replies kept (≥ 0.5% of the opening's games at some band) | 345 |
| **lines built and shipped** | **337** |
| dropped — transposes into a taught board (the student's answer is a taught line) | 8 |
| dropped — unsound (below −1.0 for the student, not a gambit) | 0 |
| dropped — no data past the reply | 0 |
| dropped — taught now / off-course / illegal (course changed after the walk) | 0 |
| shown on a tab in the app (`CLUB_SHOWN=1` measure, curated + games replies) | 294 |
| … of them inside another reply's line (carry `via`) | 111 |
| hidden at runtime — a games reply (masters / 2200+) shows the same move on the same board | 39 |
| never placed — before the page's reply floor (Dragon: 3.Bc4 / 3.Nc3 / 3.d3 after 2…d6, 4.c3 after 3.d4 cxd4) | 4 |

Line shape: the reply + a median 5 plies (p10 5, p90 9) — the course's own
rule (two student moves past the reply, ending on the student's move,
`reachesMiddlegame`, which passes once either side has castled); curated reply
lines run a median 9. 55 lines sit on gambits (judged like the gambit; the
lowest, Four Knights …Ng6, ends −1.63). Data: 103 KB for 12 openings (~8 KB
per opening fetched; ~1.4 MB for all 167). Building costs 0.3–0.6 s a line on
one core.

Hand narration (phase E) at the pilot's ~34k tokens a line (write + second
read): the walk averages ~29 replies an opening → ~4,800 lines for 167
openings → ~165M tokens. Today they speak the computed lesson.

## Rebuild when the walk finishes (~15 h for all 167 openings)

```bash
cd <checkout>
# 1. the lines (resumable; repeat until it prints "0 lines to build").
#    Copying data/sources/club-replies/ from this worktree skips the lines
#    already built. ~0.3–0.6 s a line on one core.
node scripts/course-replies/build-club-replies.mjs --shard 0/2 --minutes 18 > /tmp/club0.log 2>&1 &
node scripts/course-replies/build-club-replies.mjs --shard 1/2 --minutes 18 > /tmp/club1.log 2>&1 &
# 2. the files the app fetches (+ audit-reports/club-replies-build.json)
node scripts/course-replies/build-club-replies.mjs --assemble
# 3. gates + how many lines a tab shows
npx vitest run scripts/course-replies/clubReplies.gate.test.ts src/test/dataDirectoryCaches.gate.test.ts
CLUB_SHOWN=1 npx vitest run scripts/course-replies/clubRepliesShown.measure.test.ts
```
Run from the checkout that holds the walk (`audit-reports/course-replies-count.json`
and `data/sources/explorer-cache/`); from elsewhere pass
`--walk <path>` and `EXPLORER_CACHE_DIR=<dir>`.

## Left / for David

1. **The walk**: 12 of 167 openings in this branch. Re-run the rebuild above
   when it finishes, commit `public/data/club-replies/`. The assemble is safe in
   any checkout: the shipped files are the durable cache (a checkout without the
   gitignored line or explorer cache rebuilds the same bytes — verified), and
   an opening the walk has not reached keeps its shipped lines.
2. **Prod audit owed** (not run here — no prod audits from this agent):
   `scripts/audit-course-replies-prod.mjs` gained R13 (club rows on the
   Italian's tree in the order the app's `club-replies-ordered` row chose; a tap
   opens one with its club line). Also owed: `node scripts/audit-vacuity-check.mjs
   --changed` for the edited audit, and a device check that the opening page
   stays smooth while the faced index reads David's ~950 games (once a session
   per colour, yielding every 25 games).
3. **Two definitions of "which replies a page has"**: the walk (.mjs) starts at
   the common prefix of the opening's lines and knows only the course files,
   while the page uses `replyFloorPly` and also shows the games' replies (both
   TypeScript; the services pull in the engine, so tsx cannot load them in a
   script). Result: 4 lines never shown and 39 hidden behind a games reply —
   shipped, filtered at runtime (correct, never shown twice), ~13% of the bytes
   unseen. The root fix is one rule both can read; owed.
4. **Depth**: club lines stop at the course rule's minimum (median 5 plies past
   the reply). Deeper = one constant (`minLength` in the builder) + bump
   `BUILD_REV`. Your call whether the shared middlegame rule (castled = middlegame)
   is the right stop for reply lines.
5. **Club facts on a games reply**: where a games reply shows the same move, the
   row keeps the course order and tag (Main/Sideline); the club reach is not
   attached. Merge instead of hide if you want the band order to apply there.
6. **Academy trainer** (`courseTrainer.ts`) still reads only course-sublines;
   learned club lines reach the SM-2 review only (the two-trainer item in PLAN).
7. **Narration**: computed voice only (GeneratedReplyPlayer) — no hand narration
   was written (phase E, cost above).

## Tests

New, each failing on the old code: `replyTags` (club tag, required source),
`replyIdentity` (via keeps a nested reply's cards/narration apart; old keys
unchanged), `clubReplies` (band value, board placement incl. transposition,
floor, nesting, dedupe, reserved identity, order), `facedReplies` (only the
opponent's moves in the student's games of that colour; rebuilt on a new game),
`replyTree` (grouping, header inside a reply / past the tab's end, met first
without stealing Main), `ReplyTree` (Club rows after the course's, band order
flips with the rating, own games first, the audit row), `SublineDetail` (club
line), `courseMoves` (learned cards count as taught), builder pure half
(`club-replies-lib.test.ts`), gate `clubReplies.gate.test.ts`, algo-audit
contract for `club-replies-ordered`.
Green: those + courseSublinesOnTab.gate, groundingSublines, sublineLeadMove.gate,
sublineNarration, sublineBoardClaims, builtReplies (both), OpeningDetailPage
(wiring/test/memory), openingCourse, srsOpeningService, openingService (ladder,
mostPlayed), homeOpening* (4), sublineLesson, courseWhyFacts,
dataDirectoryCaches.gate, nativeBundleStrip, auditHarnessReach, gate-files —
35 files, 31,258 tests; app + test typechecks clean; eslint 0 errors. A full
`vitest related` sweep was cut at 25 min by CPU load (4 cores shared): 2 files
timed out at 5 s under load and pass alone (PuzzleBoard.deepRun,
reviewDeepThreat).
