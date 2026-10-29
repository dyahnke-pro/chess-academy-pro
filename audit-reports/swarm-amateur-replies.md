# WO-COURSE-01 D — club replies in the reply tree (swarm agent report)

Branch: `worktree-agent-ac940e39216f09f5e`. Built 2026-10-29.

## What shipped

- **Builder** `scripts/course-replies/build-club-replies.mjs` (pure half
  `club-replies-lib.mjs`, tested). For every reply the walk measured — now the
  club-tree walk (`course-replies-club.json`: four Lichess months, bands
  "0,1000" = under 1200, "1200,1400" = 1200–1599, "1600,1800" = 1600–1999; the
  explorer only for the openings the club tree is thin on) — it re-checks the
  reply against the CURRENT course, plays it, then the student's answer and the
  line on through THE ONE walker (`line-walk.mjs`: masters' move from ≥ 8
  games, the student's within 50cp of the engine, a known mistake punished,
  else the engine's best — the engine only vetoes). Length rule = the course's
  own (`build-course-sublines.mjs`): at least two student moves past the reply,
  ending on the student's move, in a middlegame (`reachesMiddlegame`). The last
  board is graded by Stockfish (depth 14). Shards checkpoint each line to
  `data/sources/club-replies/lines.shard-<i>.jsonl` (gitignored) and stop at a
  time budget; a re-run resumes.
- **Data** `public/data/club-replies/<openingId>.json` + `index.json` — fetched
  when an opening page opens (never at boot), its own service-worker cache
  (stale-while-revalidate), one version entry, stripped from the native bundle
  and downloaded on demand through `dataFile`. Each line carries its reach for
  each walk band (the walk's own keys — none typed in code), its share at the
  board, its end eval and a gambit flag. The shipped files are the durable
  cache: `--assemble` in a checkout without the gitignored caches rebuilds the
  same bytes (verified), and keeps an opening the walk has not reached unless
  it was measured in other bands.
- **App** `clubReplies.ts` (placement by BOARD on the tab's line from the tab's
  reply floor, or inside a curated reply the tab shows — then `via` joins its
  identity; rank by the ONE band that holds the student: `walkBandFor` over the
  data's band keys, the student's bucket from `explorerBandFor` over the
  adaptive rating — under 1200 → "0,1000", 2000 and up → "1600,1800"),
  `facedReplies.ts` (what the student's opponents played, from the games
  store), `replyTree.ts` (groups by board; inside a group: met in own games
  first, then the course's replies, then club replies by reach at the
  student's band). Tagged **Club** (`replyTags`, now a required `source`).
  Each opens the same SublineDetail → generated Watch / Learn / Practice / Play
  (computed voice) → Learn puts it in spaced review.
- **Audit row** `club-replies-ordered` (ReplyTree: the band the order read,
  the rows, how many were met) with its contract R13 in
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
3. **The reply floor never matched a British spelling**
   (`builtReplies.openingStartPly`): the course spells "Caro-Kann Defence", the
   database "Caro-Kann Defense", and the family compare was a plain lowercase —
   so every "Defence" page fell to the ply-4 fallback and its tree lost the
   replies before it, games' replies included (the Caro-Kann's 2.Nf3, 2.c4,
   2.d3…; the French's 2.d3, 2.Qe2…). Now through the one family normalizer
   (`normForFamily`, exported).
4. **One gambit rule** (`gambit-name.cjs`) for the grounding builder and this
   builder; **one opponent-reply replay** (`addOpponentReplies`) for the home
   steer and the faced index (it also stops counting an illegal token, and
   counts normalised SAN); **one reply floor** (`replyFloorPly`) for the games'
   and the club replies. The builder's course reader (`course-lines.mjs`) reads
   the course exactly as the explorer walk did (all 167 openings identical);
   the walk keeps its own copy — `explorer-walk.mjs` is the main session's, so
   this branch leaves it untouched.

## Counts (this branch — 156 of 167 openings walked at the last copy)

Walk copied at 6:40 PM CT, 2026-10-29: 129 openings from the club tree, 27
from the explorer (the thin ones; 11 still to come, listed in Left 2).

| step | count |
|---|---|
| walk candidates | 5,876 |
| walk replies kept (≥ 0.5% of the opening's games in some band) | 3,699 |
| **lines built and shipped** (155 opening files; anti-owen walked with none) | **3,613** |
| dropped — transposes into a taught board (the student's answer is a taught line) | 78 |
| dropped — unsound (ends below −1.0 for the student, not a gambit) | 8 |
| dropped — no data past the reply / taught now / off-course / illegal | 0 |
| shown on a tab in the app (`CLUB_SHOWN=1` measure, curated + games replies) | 2,941 (81%) |
| … of them inside another reply's line (carry `via`) | 851 |
| hidden at runtime — a games reply (masters / 2200+) shows the same move on the same board | 299 |
| never placed — before the page's reply floor (Left 4) | 373 |

Line shape: the reply + a median 5 plies (p10 5, p90 9) — the course's own
rule (two student moves past the reply, ending on the student's move,
`reachesMiddlegame`, which passes once either side has castled); curated reply
lines run a median 9. 530 lines sit on gambits (judged like the gambit; the
lowest ends −1.63). Data: 892 KB for 155 openings (~5.8 KB fetched per
opening). Building costs ~1 s a line on one core with the cleared engine
(~0.5 s before), so the full set is ~1 h on two shards.

Hand narration (phase E) at the pilot's ~34k tokens a line (write + second
read): ~3,500–3,900 lines → ~120–135M tokens. Today they speak the computed
lesson.

## Rebuild when the walk finishes

```bash
cd <checkout>
WALK=/tmp/claude-0/-home-user-chess-academy-pro/0f88d73e-3ffc-51d5-9748-a55ad2122b96/scratchpad/course-replies-club.json
cp "$WALK" audit-reports/course-replies-club.json   # a snapshot: the walk rewrites its file as it goes
# 1. the lines (resumable; re-run until both print "0 lines to build").
#    Copying data/sources/club-replies/ from this worktree skips the 3,621
#    lines already built at BUILD_REV 3; without it, the shipped files are
#    read as built too, so only new replies cost engine time.
node scripts/course-replies/build-club-replies.mjs --walk audit-reports/course-replies-club.json --shard 0/2 --minutes 18 > /tmp/club0.log 2>&1 &
node scripts/course-replies/build-club-replies.mjs --walk audit-reports/course-replies-club.json --shard 1/2 --minutes 18 > /tmp/club1.log 2>&1 &
# 2. the files the app fetches (+ audit-reports/club-replies-build.json)
node scripts/course-replies/build-club-replies.mjs --walk audit-reports/course-replies-club.json --assemble
# 3. gates + how many lines a tab shows
npx vitest run scripts/course-replies/clubReplies.gate.test.ts src/test/dataDirectoryCaches.gate.test.ts
CLUB_SHOWN=1 npx vitest run scripts/course-replies/clubRepliesShown.measure.test.ts
```
`EXPLORER_CACHE_DIR=<dir>` adds each band's share at the board where the
walk's explorer cache has it (the club-tree openings carry the club-wide share).

## Left / for David

1. **The engine finding reaches past this work.** `course-replies/engine.mjs`
   is the one wrapper every course-line tool reads (the subline and
   anti-opening builders, the three repairs, `extend-to-student-move`,
   `subline-soundness`, `line-soundness`, `build-trap-gems`,
   `trap-census-slips`, `refresh-pro-evals`, and `line-facts` — the narration
   writers' fact sheet). It searched hundreds of unrelated
   boards in one process without clearing, so a read depended on the run's
   history: replayed exactly, the 506th line of a shard played 4…f6?? on
   1.e4 c6 2.Nf3 d5 3.d4 dxe4 4.Ne5 (−2.1; a fresh read says 4…Nd7, +0.8). A
   sample of 200 club lines built that way had 1 student move in 732 ≥ 100cp
   worse than a fresh read. Fixed at the wrapper (`ucinewgame` before every
   search, test `engine.test.ts`), and every club line was rebuilt on it. The
   course sublines, their repairs and the soundness rechecks of
   WO-COURSE-01 C ran on the old wrapper — worth one re-run of
   `subline-soundness.mjs` / `line-soundness.mjs` on the fixed one.
2. **The rest of the walk**: the explorer is still walking the openings the
   club tree is thin on — not in this branch yet: anti-colle-black,
   anti-alapin-black, anti-grand-prix-black, belgrade-gambit, anti-hippo,
   anti-hippo-white,
   pro-gothamchess-stafford-refute, pro-gothamchess-fantasy-caro,
   pro-naroditsky-fantasy-caro, pro-hikaru-closed-sicilian,
   pro-aman-anti-caro. Re-run the rebuild above when it finishes and commit
   `public/data/club-replies/`.
3. **Prod audit owed** (not run here — no prod audits from this agent):
   `scripts/audit-course-replies-prod.mjs` gained R13 (club rows on the
   Italian's tree in the order the app's `club-replies-ordered` row chose; a
   tap opens one with its club line). Also owed: `node
   scripts/audit-vacuity-check.mjs --changed` for the edited audit, and a
   device check that the opening page stays smooth while the faced index reads
   David's ~950 games (once a session per colour, yielding every 25 games).
4. **Two definitions of "which replies a page has"**: the walk starts at the
   common prefix of an opening's lines and knows only the course files; the
   page uses `replyFloorPly` and also shows the games' replies (both
   TypeScript — the services pull in the engine, so a script cannot load
   them). Lines the walk found that the page never shows are shipped and
   filtered at runtime: 373 before a page's floor, 299 behind a games reply.
   Two rule questions for David sit under the 373, not changed here:
   - **System openings**: the London, Catalan and Réti pages show few or none
     of their club replies (never placed: London 16 of 16, Catalan 21 of 21,
     pro-gothamchess-london 22 of 22, pro-aman-reti 22 of 37 …). A system is
     named late: the database first calls the London line "London System" at
     ply 5 and the named-by-the-opponent rule moves the floor to ply 8; the
     Catalan's floor is 6 — so Black's first moves (1…Nf6, 2…g6 against the
     London) count as "before the opening", though a London player meets them
     every game. The Réti page ("Réti / King's Indian Attack") never matches a
     database family at all and falls back to ply 4.
   - **The Dragon**: `resolveOpeningEntry("Sicilian: Dragon")` returns a line
     run on to White's 6.Be3, so `replyStartPly` reads the page as named by
     the OPPONENT's move and hides every reply before 6.Be3 — games' and club
     replies alike (3.Bb5+, 3.Bc4, 6.Be2, 6.f3, 6.Bc4 …).
5. **The 8 unsound replies** (dropped: never teach a line that ends below
   −1.0) — the student meets them with no line. Some are holes in the
   course's line, some are the walker's depth-12 reads going astray (the end
   is read at depth 14), so each wants a deeper look before anything is
   authored: Old Indian 7.O-O (−1.10), Sveshnikov 6.Bg5 (−1.64), Scandinavian
   …Qd6 4.Nf3 (−1.07, also on pro-carlsen-scandinavian), Alekhine 4.Nc3
   (−1.02), Nimzo-Indian Leningrad 5.d5 (−1.69 — the walker took 5…Nxd5?, the
   known trap, at depth 12), Two Knights Traxler 6.Kf1 (−1.58; the Traxler is
   a sacrifice the gambit rule does not name), anti-Catalan 7.a4 (−1.21).
6. **Depth**: club lines stop at the course rule's minimum (median 5 plies
   past the reply; curated reply lines run a median 9). Deeper = one constant
   (`minLength` in the builder) + bump `BUILD_REV`. Your call whether the
   shared middlegame rule (castled = middlegame) is the right stop.
7. **Club facts on a games reply**: where a games reply shows the same move,
   the row keeps the course order and tag (Main/Sideline); the club reach is
   not attached. Merge instead of hide if you want the band order there.
8. **Academy trainer** (`courseTrainer.ts`) still reads only course-sublines;
   learned club lines reach the SM-2 review only (the two-trainer item in
   PLAN).
9. **Narration**: computed voice only (GeneratedReplyPlayer) — no hand
   narration was written (phase E, cost above).

## Tests

New, each failing on the old code: `replyTags` (club tag, required source),
`replyIdentity` (via keeps a nested reply's cards/narration apart; old keys
unchanged), `clubReplies` (the band that holds the student at 700 / 1000 /
1199 / 1200 / 1599 / 1600 / 2000 / 2700 / unknown, bands read off the data,
board placement incl. transposition, floor, nesting, dedupe, reserved
identity, order), `facedReplies` (only the opponent's moves in the student's
games of that colour; rebuilt on a new game), `replyTree` (grouping, header
inside a reply / past the tab's end, met first without stealing Main),
`ReplyTree` (Club rows after the course's, band order flips with the rating,
own games first, the audit row), `SublineDetail` (club line), `courseMoves`
(learned cards count as taught), `builtReplies` (the Caro-Kann / French
Defence floor), builder pure half (`club-replies-lib.test.ts`), gate
`clubReplies.gate.test.ts`, algo-audit contract for `club-replies-ordered`.
Green: those + courseSublinesOnTab.gate, groundingSublines, sublineLeadMove.gate,
sublineNarration, sublineBoardClaims, builtReplies (both), gamesCourse,
openingDetectionService, OpeningDetailPage (wiring/test/memory),
openingCourse, srsOpeningService, openingService (ladder, mostPlayed),
homeOpening* (4), sublineLesson, courseWhyFacts, dataDirectoryCaches.gate,
nativeBundleStrip, auditHarnessReach, gate-files; app + test typechecks clean;
eslint 0 errors. A full `vitest related` sweep was cut at 25 min by CPU load
(4 cores shared): 2 files timed out at 5 s under load and pass alone
(PuzzleBoard.deepRun, reviewDeepThreat).
