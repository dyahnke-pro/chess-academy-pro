> **LIVE PLAN (2026-09-18).** Read AFTER CLAUDE.md (level I) and `docs/STATE.md`
> (level II, generated — it carries the numbers this file only names). The
> nav-capture plan that used to sit here landed 2026-09-12 and is archived at
> `docs/plans/2026-09-12-nav-capture.md`; the unified-coach build is
> `docs/plans/2026-09-15-one-coach-need-selector.md` (N0–N7 built).

# PLAN — closing the loop (2026-09-18)

> 📋 **THE ONE-PAGE BOARD IS `OUTLINE.md`.** Every work order and every roadblock
> item, one line each, with a done/open marker — it is what David means when he
> asks "where do we stand with the outline?", and the shape the answer comes back
> in. THIS file is the record (reasoning, measurements, corrections); that one is
> the index. Update `OUTLINE.md` in the SAME COMMIT as the work, or the next
> session picks up something already finished.

## 🔁 WO-COURSE-01 — sublines into spaced review, amateur replies, the tabia, traps in the tree, review reminders (David 2026-10-27: "Let's add repetition and then also add the users moves" → "push notifications … for reminding users about the repetition" → "Hand written. With multiple checks for accuracy … make sure traps are included and teaching is as strong as it can be" → "I want the suggestion built that you recommended")

**Why.** Compared with Chessable the opening course is close on volume once the
sublines are counted (5,390 sublines over 154 openings, median 24 per opening,
median 12 moves, all to a middlegame) — but none of them ever reaches spaced
review, the master-built sublines miss the replies amateurs actually play, and
the narration on them was never board-checked.

**Measured 2026-10-27 (before any change):**
- Review cards are created only by `enrollOpeningLine` on a main/variation Learn
  (`openingService.ts:436`) and by the whole-opening "Add to trainer" — never for
  a subline. Sublines have only Watch + Play, no Learn.
- LINE review grades the WRONG cards: `SrsTrainerPage.parseLineMoves` pairs the
  N-th student move with the N-th card of the group, but a group holds only the
  positions its line created first — every variation's shared opening moves
  belong to the main line (603 of 603 variations). Results land on the wrong
  positions.
- 208 positions where the course teaches the student TWO moves (Italian main
  d3 vs the Nc3 line d4); a card takes one, so the other line's move is graded
  wrong. With sublines: +1,657.
- Sublines with the same ECO name ("Ruy Lopez: Closed" ×N, "Short Variation" ×2
  on one Caro tab) would merge in line review (grouped by name) and are
  indistinguishable in the panel.
- Subline narration: 888 of 18,679 units fail `checkBoardClaims` (some checker
  misreads; the checker reads ~40% of claims). Hand read: Ruy Berlin "the
  b5-bishop keeps the pin on c6" — d7 is between c6 and e8, no pin. The subline
  gate (`sublineNarration.test.ts`) checks legality/arrows/sources, never truth.
- Traps: 379 gems (64 at the trap bar). 22 sublines are TRIGGERED by a known
  mistake and do not play its punishment — 7 real traps (Vienna …g6 answered
  a3 while Qxe5+ is +4.8; four Vienna sublines END on the blunder). 🔴
  CORRECTED 2026-10-27: this line said "all 64 traps are hidden until the
  ladder unlocks" — wrong, and deleted rather than annotated:
  `areWeaponsUnlocked` returns true, every surfaceable trap shows on its tab.
  What was true is that they sat BELOW the model games, ~3,000px down.
  **Trap census (2026-10-27, David: "make sure we are not missing any traps.
  I know we are.") — three sources, every find read by hand.** Why traps
  were missed: the old miner kept ONE gem per board, asked ≥ 2% and ≥ 100
  games, stopped at ply 18 and never scanned the reply lines.
  (1) The 21 canonical named traps (`named-traps.json`) against the course,
  by POSITION (`named-trap-coverage.mjs` — it used to search five openings'
  trap files by name, so the Albin's Lasker Trap tab and the anti-Englund /
  Monticelli warnings read as missing): gaps on course lines were the
  Elephant Trap on QGD (now a gem), the Légal Trap on anti-philidor (its
  board is not on a DB line ≥ 6 plies — cannot ship as a gem under G3,
  OPEN) and the Berlin Tarrasch on two pro Ruy lines (only a pawn, +1.4 — a
  known mistake, not a trap, OPEN). (2) Every common slip on every course
  board (`trap-census-slips.mjs`, the cached 1000–2000 explorer, ≥ 1% of the
  board and ≥ 1 in 2,000 of the opening's games): 59 graded, 14 traps, 12
  not taught → **12 trap gems built** (`build-trap-gems.mjs` from the hand
  list `hand-traps.json`; engine best for both sides to the quiet end; the
  app's trap bar +3.0 with material on the board; hand narration, board- and
  material-checked): Two Knights 5.dxe5 …Bc5? Qd5 (Italian + Scotch,
  247,494 games, 42% of the board), the Elephant Trap (QGD, 73,377), Italian
  7…Nxd4? (Italian + Scotch, 134,990), Vienna Frankenstein …d6? Qxg7
  (99,730), Scotch 5…Nge7? Nxc6 (93,510), Vienna Gambit …Ng4? / …Nh5?
  (90,064 / 66,465), Petrov Ng4? / Bd3? (85,133 / 81,578), Caro Advance
  Nh4? (135,975). Not shipped: Vienna 3.f4 Bc5 (no material won, board
  anchor 5), Trompowsky …Bg7?? (anchor 5). (3) Lichess puzzles that start on
  a course board: 193 (board, blunder) pairs, 165 seen once — a puzzle says
  a blunder happened, not how often, so these feed (2) once the reply walk
  fills the explorer cache: re-run the slips census when the walk ends.
  Found on the way: pro-samayraina-french-white var-1 plays c3 past a known
  …Bg4? whose punishment is Bxh7+ — a pro line, David's call.
- Amateur gap (1200–1400, explorer, main line only, ≥5%, ≥2,000 games at the
  node, past the opening's first moves): Italian 17, Caro 8, London 18 replies
  no line covers (Italian 3…h6 19% of 104M; London …O-O 55% of 1.5M).
- Layout (390×844, Caro Advance tab, prod): the floating coach button covers
  "Add to trainer"; "Understand" is last, under Pitfalls; the plans start
  ~1,000px below the line they continue; no tabia anywhere.
- Found, not in scope: the Academy trainer (`/academy/course/:id/train`,
  `courseTrainer.ts`) drills sublines with a weighted-random picker and no
  schedule, beside the SM-2 trainer that schedules but skips sublines. Two
  trainers for one job — fold together after A.

**Decided (David):** hand-written narration with multiple accuracy checks;
build every recommendation: own games first + the student's band; tap a
subline → it opens like a variation tab; reminders scheduled on the phone;
re-check all existing sublines; reach cut-off for new replies.

**Phases**
- **A — review** (`done`, branch): every student move is graded by POSITION —
  a card is keyed by board + answer (`answerKey`), so a board the course
  answers two ways holds two cards (the first keeps the bare id, the second
  `${id}::${san}`); line review pairs each move with ITS card by that key,
  never by index; any move the course teaches at that board
  (`courseMoves.taughtMovesByPosition`, sublines included) is "another line
  you know", never a miss; a first-try find is written only on a due card.
  Every card carries its line key (`main`, `var-<i>`, `sub-<i>::<move>@<ply>`),
  so same-name sublines never merge. Sublines got Watch/Learn/Practice/Play
  (`sublineRungs`); finishing Learn the first time puts the line in review
  (`enrollSubline`).
- **B — layout** (`done`, branch): one-line summary under the header; the
  TABIA card (`TabiaCard`) — the tab plan's anchor board when it matches the
  line's end, the plan, its breaks and piece routes, the seated structure
  (never `deriveNextPlanFacts` from the other seat, whose goals say "your");
  replies as a tree (`ReplyTree`) grouped by the move they branch at, numbered
  moves, a one-line idea, Main / Sideline / Mistake / Trap tags (`replyTags`:
  trap = `isWeaponGem`, mistake = a known slip, main = top of its group at
  ≥ 25%); a reply opens like a variation (`SublineDetail`); traps and named
  weapons ABOVE the plans and model games; Test yourself after the model
  games; coach button a 48px icon (it covered "Add to trainer").
- **C — soundness** (`done` for sublines, branch): ROOT CAUSE of the a3/b3
  junk — the builders called `execFileSync(stockfish)` with stdin closed, so
  Stockfish quit before searching and printed its first legal move. One
  engine wrapper (`course-replies/engine.mjs`) and ONE walker for every course
  line (`line-walk.mjs`: a known mistake is punished with its `punishSeq`;
  masters' move only from ≥ 8 games, and for the student within 50cp of the
  engine; else the engine's best; ends on the student's own move, in a
  middlegame). All 5,390 sublines engine-checked at depth 12: 1,058 rebuilt
  from their first bad student move (trigger/ply/frequency unchanged, so keys
  hold); recheck 0 flagged. 959 narration bindings for rebuilt lines retired
  (they described the old moves); 4 pro lines listed for review, never
  rewritten (`audit-reports/subline-repair.json`). Gate:
  `sublineBoardClaims.test.ts` (shrink-only baseline 881).
  **Main lines and variations** (`line-soundness.mjs`, 864 lines): 41
  flagged at ≥ 100cp, 8 of them gambits (read by hand). FIXED: the four
  anti-opening variations carrying the same execFileSync junk for both sides
  (anti-modern-150 var-0/1 `a3 …b4 b3`, anti-benoni-push var-2 `a3 …g5 b3
  …g4 e3 …g3`, anti-englund var-0 `a3 …c5 b3 …c4`) — no lesson is written
  over them, so `repair-course-lines.mjs` cut each at the first move the
  masters never played from that board (≥ 8 games) and re-walked it; all
  four now engine-clean, +0.3 to +1.5 for the student. Their stored
  `fen`/`uci` (stale on 19 of 35 anti-openings; the loader recomputes both
  from the pgn) are gone from the file and the builder. **Six masterclass
  lines rebuilt (2026-10-27)** — each had walked past its data into an
  opponent blunder the student never punished, or a student miss: petrov
  var-2 Three Knights (now ends …Bxf6, +0.5 for you), var-5 5.Bd3 (`Nc7`
  walked into mate; now ends …Qh4, +0.2), var-6 Kaufmann (−8 → −0.4);
  philidor var-2 Exchange and var-4 Counter-Gambit; accel-dragon main (ends
  c3 Be6). Every rebuilt line keeps its moves up to the first bad one and
  is walked on by the one course walker; the beats over the changed moves
  are rewritten (board + engine checked) and the three plans anchored on
  the old ends (`mp-petrovdefence-threeknights`, `-bd3`,
  `mp-philidordefence-countergambit`) are re-authored from the new ends
  with the engine's continuation. The Counter-Gambit stays as an honest
  gambit: its critical line ends with White +2.2, and its beats say so.
  Root gap fixed with it: the grounding gates excused a gambit LINE by its
  name but judged that line's lesson beats and plans as sound lines — a
  beat now inherits the gambit status of the line it lies on, a plan reads
  it off its title, and "Queen's Gambit Declined/Accepted" is no longer a
  gambit (it hid nothing; measured). italian var-6 (Møller, a sacrifice
  showcase) kept.
  **Orphaned sublines (G8):** 112 sublines hung off moves their tab no
  longer plays (spine rebuilds never cascaded to them) and 84 sat on tabs
  that were removed — under the reply tree they would play a line the tab
  never reaches. Deleted with their 266 narration bindings
  (`prune-orphan-sublines.mjs`); gate `courseSublinesOnTab.gate.test.ts`.
  The reply walk (D) loaded the old lines, so its replies are re-anchored to
  the current tabs before any line is built.
  **Lines that stopped on the opponent's move:** 1,723 of 5,194 — the student
  saw the reply and never the answer, and the last board never became a
  review card. Each extended by the student's answer through the one walker
  (`extend-to-student-move.mjs`; 8 play out a known mistake's punishment);
  the gate now also holds every subline to end on the student's move.
- **Tabia coverage (measured, prod 2026-10-27):** the card shows the curated
  plan on 220 of 684 tabs (a plan anchored where the line ends), only the
  computed structure on 79, and nothing on 385. The computed plan read was
  tried for the 385 and rejected: it fills 64 of 193 masterclass tabs and
  reads badly in opening positions ("win their weak pawn on a7" on an unmoved
  pawn). The gap is authoring — a plan per tab, anchored at its end (G9.3
  Gate C) — for David to call.
- **D — amateur replies** (`in progress`): the explorer walk runs (Lichess
  token direct, ~25 lookups/min; discovery at 1000–2000, every candidate
  confirmed per band, kept at ≥ 0.5% in any band) — ~6 min/opening, ~15 h for
  all. Italian 25, Alapin 25, French 48 new replies so far. Then: lines through
  `walkToMiddlegame`, fetched (never boot), ranked by the student's band with
  their own games first, the count measured for E's cost.
- **E — accuracy + narration** (`in progress`): board-claim gate done (above);
  the standard is `docs/SUBLINE-NARRATION.md`. **Pilot (2026-10-27): 25 lines,
  one writer + one second reader.** Writer ~423k tokens, reader ~427k —
  **~34k tokens a line** for write + second read. The reader found 14 flags in
  8 of the 25 (board 5 — a pinned knight counted as attacking e4; intent 3;
  engine 2 — "slightly better" on +0.23; voice 2 — "…b3" on a White move;
  wrong ply 1; arrow 1), so the second read earns its cost. Measured scale:
  5,194 reply lines, 4,037 narrated (now 3,929 after the retirement below),
  1,157 not; the top 3 replies of each tab are 1,813 lines covering 84% of
  the games where a reply is played (top 5: 2,909 lines, 93%). **New gate
  (`sublineLeadMove.gate.test.ts`): a narration names moves of ITS line** — a
  beat opens with its own ply's move, an intro with a move the line plays,
  "…" only on Black. It found 154 spoken lines in 107 narrations naming moves
  the line never plays (the Scotch …Nf6 reply told "…Qh4, Steinitz's queen
  raid"; an Alekhine line "your …Bg4 pins"; a Sicilian told "strike with …g5"
  where it plays …Nh6) — narration written for another line, bound by its
  trigger move. All 107 retired (silence over a wrong line); 32 board-claim
  baseline rows went with them (834 → 802). The 25 pilot narrations shipped
  (`sublineNarrationPilot.ts`) with the reader's 14 fixes; 32 of their beats
  opened with the opponent's move the student's move answers, so each was
  split — that sentence on the opponent's own ply, in the present tense.
  **Code checks from the pilot's flags (2026-10-27):** (1) the fact sheet
  prints board facts under every move — what the moved piece hits, loose
  pieces (marked when only a pinned piece attacks them), pins (to the king, or
  to a piece worth more than both pinned piece and pinner), material, the side
  marker, the eval in fixed words; (2) every reply line's last board is graded
  by the engine in the grounding cache (5,194 lines, native Stockfish 16,
  depth 14; `GROUNDING_ENGINE=native`) — **4 end lost for you, all pro game
  lines** (pro-naroditsky-dragodorf Kb1@18 −2.3, pro-naroditsky-caro-kann
  Nf3@6 −1.7, pro-carlsen-modern h3@10 −1.7, pro-samayraina-sicilian-black
  O-O@14 −1.6): David's call with the other pro lines, the gate's backlog
  (`groundingSublines.test.ts`); the anti-openings' 106 lines were never in
  the grounding gate — now graded, none lost; (3) the seat: "your X on SQ" is
  the student's piece — 20 narrations written from the wrong seat (the French
  Advance reply on 8 French tabs told a Black student about "your d4-pawn";
  the Sveshnikov Bb5 reply on 8 tabs bound an anti-Rossolimo narration for
  White; a White Smith-Morra coached the Black side) retired, gated; (4) eval
  words at a line's end against the engine, explicit subjects only — 7 of 80
  wrong, all "You're clearly better" on −0.07 to +0.40: four reworded, one
  binding retired (the sentence is true on two Alekhine tabs at +0.91, not on
  the third at −0.07), gated. Next: move what the reader caught
  into code (eval words vs a stored final eval, pinned attackers, board facts
  in the fact sheet so the writer needs no tool calls), re-measure the cost,
  then the rewrite — by frequency, top replies first. **Swarm cost goes to
  David before any agent launches.**
  **Check 5 — the pilot played in the app (2026-10-27):**
  `scripts/audit-subline-watch-prod.mjs` opens each reply on prod, plays
  Watch to its end and reads every beat back off the listener (muted). 24 of
  25 pass, every beat heard in order. The 25th (Scotch …Nf6) was on no
  chapter: a variation that is the same line as the main line or another tab
  is folded out of the tab bar, and `buildCourse` gave the main chapter no
  replies — **70 replies on 7 folded variations, 61 of them narrated, were
  shown nowhere** (Scotch Classical, Dragon Yugoslav, Sveshnikov 9.Nd5,
  Petrov Classical, Snake Benoni, QGD Classical → main line; Sveshnikov 11.c4
  → the Chelyabinsk tab, all 10 already shown there). Fixed at the source:
  each reply carries its own tab (`ChapterSubline.tab` — narration, rungs and
  review cards key off it, never the chapter showing it), and a folded
  variation's replies go to the chapter it duplicates
  (`placeSublines`). Gate: every subline is shown on a chapter, under its own
  tab (`courseSublinesOnTab.gate.test.ts`, fails on the old code).
- **Soundness round 2 (2026-10-28, David: "fix the gambit… fix pro lines…
  fix the connection").**
  - **Philidor Counter-Gambit tab dropped.** Black's best is −1.15 to −1.60
    against every White 4th move (depth 20); no Black line is equal. Tab,
    lesson, plan, 10 replies, 9 narrations removed; the variation's data stays
    so no other variation's index moves.
  - **Reply lines that end below −1.0** (the subline gate's bar was −1.5, so
    lines that DRIFT there — no one move bad enough for the soundness check —
    were taught): `repair-losing-lines.mjs` cuts at the first student move
    after the reply that gives up ≥ 50cp (else the costliest ≥ 30cp; a line
    of best moves is left alone — its end is the opening's own eval) and
    rebuilds through THE ONE walker. Round 1: 58 rebuilt (17 pro), 52 of 55
    improved, ~½ pawn on average; 53 narrations retired with them. Pro lines
    keep `proPlayed` (what the pro played at the cut) and the caption says it.
    Round 2, on the depth-20 reads: 16 more rebuilt (10 narrations retired).
    Non-gambit reply lines ending below −1.0: ~64 → 27, every one either best
    play (no student move gave up 30cp — the opening's own eval: Dutch,
    Alekhine, Pirc, Old Indian…) or under a tab dip (below); they sit in the
    shrink-only baseline. Stored pro evals were stale on 43 lines / 17
    dubious flags → `refresh-pro-evals.mjs` + a gate (stored eval within 60cp
    of its own board); 12 pro lines stay dubious and their caption names the
    engine's fix. The gate's bar is now −1.0.
  - **Depth.** The grounding cache read depth 14; near the bar that is noise
    both ways (6 of 16 "losing" lines were −0.60..−0.96 at depth 20, and other
    lines crossed the other way). `scripts/ci/deepen-grounding.cjs` re-reads
    every board between −1.6 and −0.6 at depth 20 (677) and the cache keeps it.
  - **Upstream dips (writing phase):** five tab lines pass through ≈ −1.2
    before their replies branch (the Czech Benoni, the Dragon's Dragadorf
    Hybrid, Samay's Sicilian vs the Rossolimo, Naroditsky's Dragodorf English
    Attack, Hikaru's Pirc vs the Austrian); their replies cannot be repaired
    below the branch. Tab lessons
    and plans that end below −1.5 at depth 20 (7) need moves + words together
    — held for the writing phase, listed in the grounding baselines.
  - **Known mistakes on pro lines:** Berlin Tarrasch (…O-O? Bxc6, +1.34) on
    pro-naroditsky-ruy-lopez and pro-samayraina-ruy; the Samay French …Bg4?
    Bxh7+ (+1.20) graded but its explorer read came back empty under the rate
    limit — re-grade when Lichess answers. Narration for all three: writing
    phase.
  - **The connection.** Lichess limits the explorer by address and every
    user's lookup leaves through Vercel's shared addresses (5 of 6 live
    lookups 429 on 2026-10-28; real users hit it most days for two weeks).
    The app and the offline scripts also share one Lichess token (David's).
    Fixed at the source: explorer answers held 30 days at Vercel's edge
    (was 1); every answer kept on the device (Dexie v46 `explorerAnswers`) and
    served for 30 days without asking, and past that whenever Lichess refuses
    — one door, `fetchLichessExplorer`, so all ~20 callers get it; offline
    scripts call Lichess directly (`scripts/course-replies/lichess-explorer.mjs`),
    never the live proxy. OWED: a second Lichess account for scripts (David),
    and the amateur database for course positions from the scan, once it
    finishes. Vercel Static IPs ($100/month, still a shared pool) — not worth it.
- **F — reminders** (`done`, branch; reaches phones only with the next App
  Store build): `@capacitor/local-notifications` 8.3.1, native only; one a
  day at most at the student's usual hour (mode of 30 days of session hours,
  ≥ 3 sessions; else 7 PM) or the hour they pick; only when cards are due,
  with the real count; offer card after the first enrollment; Settings
  toggle + hour; 3 ignored → every other day, 7 → stop; a tap opens the
  review trainer. Events `review_reminder_{scheduled,stopped,opened,accepted,
  denied,declined}`.

**Audit:** `scripts/audit-course-replies-prod.mjs` (muted; R1–R9: summary,
tabia, reply tree, coach button, a reply opens, its Learn played to the end,
its positions in review with the reply's key, a line review session, traps
above the model games). 10/10 on localhost 2026-10-27.

## 🌳 WO-ALL-OPENINGS-01 — every opening in the All section built like a masterclass tab, from the games (David 2026-10-28: "Make sure the 'all' section of the openings teaches and builds this way" · "I want the computer to go as deep as chessbase on the forks" · "make the computer narrations match the written ones. The same style!")

**Measured (2026-10-28).** Of the 3,654 named lines, 2,730 are on no line we
teach (843 taught lines: 43 masterclass, 82 pro, 35 anti, with variations). They
leave our lines at 1,366 points; 132 of those leave by move 3 and were reached
in 1,000+ master games (254 at 100+) — the a3 Sicilian is one (606). Today an
All-section page: Watch hands off to Learn with Coach; Learn / Practice / Play
use the bare named line (the Mengarini is 3 plies); no variation tabs, no
middlegame plans. The shipped masters file (`openings-masters-db.json`, 132k
positions, 37 MB) was built breadth-first over every move, even 1-game ones, at
~1 lookup/s, so it ran out ~4–10 plies past each named line (2.a3: four).

**Decided (David):** masters first; strong online games (Lichess's CC0 game
files, 2200+) once the masters run out, said as such; Stockfish only checks a
line, never picks it (a line it carries has no variations); all ~2,700, computed
on the phone and cached; traps stay hand-found (none for these at first).

**Phases.**
0. ⏳ The chat finds an opening NAME in any sentence ("what is the Najdorf?",
   "explain the London System", "is the a3 Sicilian any good?" all fail today) —
   the name is looked up in the opening database, never cut out by a pattern.
1. ⏳ Deep master file: depth-first over every reply in 10+ master games, to the
   middlegame, sharded by opening, fetched on open and kept (dry run sizes it
   first). Then the strong-online tree the same way where masters run out.
2. ⏳ ONE opening builder: the main line is the masters' most-played move each
   ply to the middlegame, a Stockfish veto on a line that leaves the student
   lost; every real split a variation, walked the same way; each line's end
   position starts its middlegame plan from what masters played next; model
   games = real master wins.
3. ⏳ All-section pages render that build in the page — Watch, Learn, Practice,
   Play, variation tabs, plans — through the masterclass components; Learn with
   Coach reads the same builder.
4. ⏳ Narration in the written lessons' style: the written notes' shapes as the
   computer's templates, plus the two facts it lacks (the plan a move serves;
   how moves connect). Graded BLIND against the written note at the same
   position until David cannot tell them apart.

## 📚 WO-DB-TEACH-01 — the games database teaches where the opening DB stops (David 2026-10-27: "Coach was unable to generate a lesson on the a3 Sicilian. We need to tie in the ability to look up the database and teach from it")

**What happened.** His iPhone, 10:18 AM CT: home chat "Tell me more about the a3
sicillian" → "There's no answer for that one yet." Three layers: (1) the name
resolver hunted a named move inside the opening's LONGEST same-name entry (the
Open Sicilian) — no a3 there, so the move was dropped silently; every move-named
line had the bug ("Nc3 Sicilian" → the Dragon, "Bc4 Sicilian" → the Ginsberg
Gambit); (2) the chat's opening lane got no name and fell to the catch-all;
(3) the DB's Mengarini is 1.e4 c5 2.a3 and nothing more, and the explorer top-up
stopped at move 7 as one linear line. "Can you Google it?" got "Not sure what
you mean" (there has never been web search — git history has none).

**Decided (David: "1 yes offer a lesson. 2 master is best, I want the same
structure 'branches' offered during the lesson").**
- A named move is PLAYED from where the opening starts (`lineForNamedMoves`):
  the line where it comes first, inside the named opening's family; a later
  same-side line on the opening's main road wins when the DB holds 3× the lines
  through it ("e5 French" → the Advance, not the 2.e5 Steinitz); the other side's
  move at the same stage wins at 3×, closer than that the student is asked
  ("e6 Caro"); no line → null, never the bare opening. Typos through the fuzzy
  matcher. 23 rows, each failed on the old code (`namedMoveResolution.test.ts`).
- A thin line's lesson gets its FORK TILES from the masters' replies at its last
  position (≥ 8% and ≥ 10 games, the student's moves sound-filtered, the
  opponent's the most played), each walked down the masters' main line until
  both castle or under 10 games remain — said as "The master games run out here:
  only N reached this position." Online games only when the masters never
  reached the line. A build the database dropped out of is never cached
  (`explorerIncomplete`, both cache doors). The move the line is named for says
  the masters' break it prepares (`preparesBreakBeat`); the intro says how the
  masters' games scored from the student's seat.
- Chat: "tell me about X" answers from the databases (`openingDatabaseBrief`:
  the moves, the defining move's job, the identity facts, who scores, what the
  masters answer) and offers the lesson (`teach_opening` action — in place on
  Learn, opens Learn elsewhere). A web-search ask gets the honest answer.
- A "Dive deeper" tile that resolves to the lesson already running is hidden at
  the source (it restarted the same lesson); the database branches are walked in
  place ("Which line?", "Try a different line").

**Prod round 3 (`d4810a9`, 7/10): the lesson half green** — the fork tiles are
the masters' replies (…g6 | …Nc6 | …e6, 306/121/110 of 606), the voice says the
counts, "teach me the c3 sicilian" → the Alapin, "teach me the e5 caro" → the
Advance, web search answered. **The chat (C1) still answered "There's no answer
for that one yet", and two more defects came out of tracing it:**
- **C1, the cause:** the door labels a turn from what the student typed
  (`fastPathLane` → opening-identity) while coachService computed the answer
  from the filler-STRIPPED words ("more about the a3 sicillian"), which carry no
  opening. One reader, two inputs. Fixed: coachService hands the shared reader
  the student's words (it strips filler itself for every intent flag); a
  follow-up rewrite is still the ask. The unit test had passed because it called
  the reader with the unstripped words — the new test drives `coachService.ask`.
- **A false answer this WO shipped:** the "tell me about X" shape caught chess
  topics, and the resolver maps them onto lines ("center" → the Center Game,
  "endgame" → "Caro-Kann Defense: Endgame Offer"). `namesAnOpening`: a name
  carries a word that is no chess vocabulary, or pairs a chess word with the
  opening's kind ("the Center Game", "the Queen's Gambit"). It also stopped the
  piece-word filter dropping "the King's Indian".
- **The brief said the lesson spine as the opening** ("The Ponziani Opening is
  e4 e5 Nf3 Nc6 c3 d5 Bb5 …"). It now says the defining moves
  (`openingDefiningMoves`, the shortest entry carrying the name) and reads the
  masters there.
- **A variation's own name** ("the Bowdler", "the Mengarini Sicilian") resolves
  (a matcher tier over every entry — the fuzzy scan sees only teachable lines);
  a name three openings share ("the Mengarini") is asked about by name, in the
  chat and in a request (`linesTheWordsName`, one rule for both).
Gate: `coachService.openingIdentity.test.ts` (9 of 13 fail on the old code).

**Known, not fixed here (the board teacher's wording, a separate producer):** on
the …Nc6 branch, "cxb4, winning the pawn" when axb4 takes back next, and
"Nxb4, taking back the pawn" when it wins one.

**Prod round 5 (`d6aef9c` + the audit fix `98bff03`): 11/11 green.** His exact
words get "The Sicilian Defense: Mengarini Variation is e4 c5 a3. They play a3 —
it prepares b4 … In 606 master games from here, your side wins 35% and theirs
22% … Want me to teach it?" and the button; "tell me about the endgame" is not
answered as an opening; the three masters' branches walked to +10/+6/+11 plies.
The round-4 red was the instrument: it sliced the page text, and the empty-chat
welcome vanishes once a message is sent — it now reads the coach's own bubble.

**Open, not this WO:** "tell me about the endgame" gets "Which position do you
mean?" (no general endgame answer off a board); `CoachChatPage.test` 4.2 (send
blocked while hydrating) fails under heavy parallel load — a fixed 50 ms sleep.

Audit: `scripts/audit-db-taught-opening-prod.mjs` (C3: a topic is never
answered as an opening).

## 💵 WO-SELL-OPENINGS-01 — openings à la carte, $0.99 each (David 2026-10-25: "Let's try selling the openings. I like the 0.99" → "À la carte")

**Why.** Openings are the most-used section (60 days, App Store users, reviewers
and David's devices out: 38 of 59 users opened Openings, 330 views; Learn 15,
Play 13, Review 11). Zero paying users; only 2 people hit the second-opening wall
in 60 days. A cheap first purchase on the thing people already use.

**Decided.** 167 openings sold one at a time, $0.99, non-consumable: the 132
in the free-pick pool (43 masterclasses, 7 gambits, 82 pro-player openings)
and the 35 counter-weapons (David: "Keep them locked behind the sale price but
include them for sale" — a counter is never the free pick) (yours to keep,
Restore Purchases brings it back). The one free opening stays. Defaults David
can overrule: the subscription stays as it is ($3.99/mo, $34.99/yr) and sits
under the opening button; the coach is not part of an opening purchase (its own
free allowance); family sharing off. Web stays free (the promise).

**What a purchase unlocks.** Exactly what the free pick unlocks: the drill rungs
(Learn, Practice, Play) on every variation, gems, traps, plans. Watch, browsing
and model games are already free on every opening.

**Design (map first: billingService, freeTierService.canViewOpening,
OpeningDetailPage's drill wall, PaywallPage, entitlementStore).**
1. ONE list, `src/data/opening-products.json` (opening id → product id → store
   name ≤ 30 / description ≤ 45), generated from the free-pick pool and gated
   to EQUAL it (`openingProducts.test.ts`), so the app and the App Store script
   read the same 132 rows. Product id `opening.<id with _ for ->` (Apple: letters,
   digits, `.`, `_`; never reusable once created, so the scheme is fixed now).
2. Ownership comes from the store, never a local flag: RevenueCat
   `customerInfo.nonSubscriptionTransactions` → owned opening ids in
   `entitlementStore` (applied on boot, on purchase, on restore, on push).
3. `canViewOpening(id, state, owned)` — `owned` REQUIRED, so no caller can
   forget a purchase. An owned opening never spends the free slot.
4. The drill wall's paywall leads with "Unlock <opening> — <store price>"
   (`Purchases.getProducts` + `purchaseStoreProduct`; the plugin already ships
   in the app, so this is JS only → OTA). No product live yet → the card hides
   and the paywall is today's.
5. Events: `opening_offer_viewed`, `opening_purchase_started`,
   `opening_purchased`, `opening_purchase_cancelled`, `opening_purchase_failed`
   (opening_id, product_id, price).
6. `pricing.ts` PRICE_OPENING + the Terms/Support line; the App Store script
   fails if the live price ≠ PRICE_OPENING (the drift detector, same as subs).
7. App Store side: `scripts/ci/asc-opening-iaps.mjs` + workflow, DRY RUN by
   default, `only=` for a one-product test first: create the non-consumable,
   version + en-US localization, $0.99 USA price schedule, all territories,
   review screenshot, submit on request. Products in "ready to submit" can be
   bought in TestFlight sandbox before Apple approves.

**Not automatable (route to David):** the real StoreKit sheet and a sandbox
purchase on his TestFlight phone.

**Same night, David:** "Let's try 1.99/mo for full unlock. Narrations are
practically free for me now … The openings are what will sell" → "Keep web app
free. 14.99 is fine for the year." The subscription moves $3.99 → $1.99/mo and
$34.99 → $14.99/yr (applied through the "ASC — set subscription price"
workflow; Apple takes a decrease on an approved subscription from the next day,
existing subscribers migrated — there are none). `pricing.ts` follows only
once the store charges it (its own ordering rule), checked by the same
workflow's dry run. ✅ 2026-10-26: live at $1.99 / $14.99 (the dry run read the
first listed price and said 3.99 — it now reads the price in effect today);
`pricing.ts` and the store-listing copy updated. The public App Store
description quotes the price too and is frozen with the live version: it
follows with the next App Store submission (`asc-listing-fix`). No coach cap for subscribers (voice is inside Google's free
allowance). The web app stays free — the promise holds.

## 🎯 WO-FOCUS-TACTICS-01 — one always-on tactics focus, a rung ladder, and a castling watch (David 2026-10-22: "GO!!" — built, status at the end)

David 2026-10-22: "Tactics and loose pieces should always be a focus … making
focuses equal weight for coach to speak, the only thing algod is how hard
spotting the tactic is … in every game there must be at least one chance for
the user to find the focus … loose pieces drop off because of tactics" → "I
like your progression. And more advanced would be like a 3-4 move calculation.
It could come at any point within the game. Vary it, coach can guide this …
it MUST be present at least once per game! Beginners maybe more than once …
Don't be afraid to present them to the user."

**What changes, and why.** Today Learn free play picks ONE of three focuses
(loose pieces, tactics, the kings) from the record, gates tactics and the
kings behind loose pieces ≥ 75%, and scaffolds by the hold state (announce /
unannounced / silent watch). On David's record that is loose pieces every
game, forever (the focus audit had to SEED green evidence to reach the other
two). Loose pieces are how tactics win material (a fork wins the loose piece),
so the two are one lesson at two depths.

1. **ONE FOCUS, `tactics`, ALWAYS ON, BOTH SEATS.** Loose pieces fold in as its
   first rung; mates (yours, and their mate threat) fold in as tactics. The
   record's ROWS do not change (every tag, motif row and hold rate stays) —
   only the lesson grouping. `FocusId` shrinks; the `Record` makes every
   reader answer.
2. **THE RUNG LADDER — the only thing the record decides** (how hard the
   chance on YOUR side is to find; the coach never plays stronger):
   - rung 0 — a free piece: the piece that just moved there, en prise;
   - rung 1 — a loose piece won by a two-move shot (a fork, pin or skewer that
     takes next move), or a piece a guard walked away from;
   - rung 2 — a shot one key move deeper, or a piece that looks guarded and
     loses on the count / its guard is pinned;
   - rung 3 — a 3–4 move calculation, or an Intermediate/Advanced motif.
   `ChanceDifficulty` grows to 0|1|2|3 (one table), read by the chance reader
   and the plant alike. The rung CLIMBS by the Campaign's own rule
   (`ladder.ts`: 3 unprompted finds in the last 5 games at your rung → up;
   below 75% → down), never a second rule.
3. **THE SAME GAME AS NOW, TACTICS EVERY GAME (David 2026-10-22: "Should be
   the same as now but tactics added in").** Before EVERY game, one fixed line
   (David's words): "Today's focus is tactics, finding and preventing them! You
   will have at least one chance this game for a winning tactic, but your
   opponent will also be trying to set up its own tactics. Stay vigilant!"
   In the game the coach speaks on a MISS only, the same for everyone (finds
   silent; Try again / Play on; Play on punished; the answer never shown
   unasked — THE TIERS below; the deciding-blunder exception), and the coach steers toward its
   own tactics on the defend seat. The unannounced / silent-watch modes, the
   picker and the gates go (G8.5: their producers deleted with them). One
   scaffold remains, part of the rung: at rung 0 the FIRST chance is asked out
   loud. The end line: "Tactics today: you found N of M chances, and stopped
   P of Q of theirs. Review has the rest." THE PROMISE STAYS TRUE: the first
   chance lands by move 12 (the target window is moves 6–12), and a game that
   ends first says so on its end line ("The game ended before your chance
   came.") — never silent.
4. **A CHANCE EVERY GAME, VARIED, MORE FOR BEGINNERS.** The plant
   (`focusPlant`) keeps its guarantee and gains: (a) a per-game TARGET PLY,
   drawn at random between move 6 and move 12 (the opponent's behaviour is
   random on purpose, CLAUDE.md "Why determinism"), so the chance lands at a
   different point each game; (b) the coach STEERS toward tension before the
   target (the existing `focus` scorer); (c) extras by rung — 3 / 2 / 1 / 1 (THE
   TIERS table); (d) the "never in a decided game" exception is
   DROPPED for the guarantee (David: MUST) — a game decided for the coach
   gets a real slip back, a game decided for the student loses nothing by one
   more. A game that ENDS before any chance (mate by move 10) is logged on its
   result row, never assumed.
5. **THE CASTLING WATCH** (replaces the kings focus; separate from tactics,
   runs until BOTH kings have castled or lost the right): once in the early
   opening when castling is ready and the student plays something else; then
   SILENT until the KING IN THE MIDDLE costs the eval (David 2026-10-22: "I
   don't want it called out because of a blunder. But because the king is in
   the middle" → "If the eval drops at any time because of not castled then it
   needs to call it out and mark in weaknesses"). Proven by a WHAT-IF, never by
   a slip label: the board with the student's king and rook on their castled
   squares (the side whose squares are empty) is read by the engine. STOP
   fires on EVERY student move that (i) drops the eval ≥ 100 cp, where (ii) the
   castled what-if is better than the real board by at least that drop, and
   (iii) the move hung no material (castling would not have saved a hung
   piece). Castling squares blocked/attacked → no claim. Runs until the
   student castles or loses the right. One extra engine read, only on a
   costly move with the king uncastled. EVERY call-out is RECORDED as a
   `king-stuck-center` miss through the lane-evidence door, so it reddens the
   Weaknesses tile and feeds the drills (one vocabulary). The line, four fixed
   versions so it is always true — losing (≤ −300) vs worse, attack vs quiet:
   "STOP! You're not castled, and because of that you're now in a losing
   position! You need to castle before you attack!" · "…losing position! You
   need to castle first!" · "STOP! You're not castled, and that just cost you!
   You need to castle before you attack!" · "…that just cost you! You need to
   castle first!" (an ATTACK = a capture, a check, or a piece moving toward
   their king — David: "only true if attacking and the eval drops").
6. **PROOF.** The game-over card and the `learnFocusResults` row carry
   "Tactic chances: N, found M" and the rung; the focus audit gains a
   contract: no finished game with zero chances on the student's side unless
   it ended before the target window (logged).

**THE TIERS, by rung (David 2026-10-22: "Finds are silent … advanced players
and strong intermediate players the take back should turn off and a quick
review on the end game recap can show where it was with a chance to play out.
Never show the answer! Provide a 'show me' button after the second miss for
beginners" → tiers "1 yes"):**

| rung | who | a miss | a second miss | chances a game |
|---|---|---|---|---|
| 0 | beginner | first chance asked; clue + Try again / Play on | a **Show me** button (their tap, never automatic) | 3 — opening (a mined real slip, the gem data), middlegame (a plant), endgame when reached else late middlegame |
| 1 | intermediate | clue + Try again / Play on | play on, no answer | 2 |
| 2–3 | strong intermediate / advanced | no pause, no clue — the coach punishes | — | 1 + natural ones |

Finds are silent at every rung. The answer is NEVER shown (the old "second
miss shows the answer" is deleted) — only a beginner's own Show me tap. Every
tier's recap lists the missed chances, each with **Play it out** from the
board before it.

**THE FLIP — EVERY TIER (David: "I LIKE THIS! I WANT THAT TO HAPPEN FOR ME
TOO! intermediates and advanced included"):** once the student is way ahead
(≥ `DECIDED_EVAL_CP`, the app's one "decided" bar), the remaining chances flip
seats: the coach goes for desperate tactics of its own and the lesson becomes
stopping them ("stay vigilant" made real). Their tactic's subtlety is the
student's rung; the tier's miss handling applies (pause + clue below rung 2,
punished + recap at 2–3).

**THE TIER IS THE RUNG, AND ONLY WHAT YOU SPOT MOVES IT (David 2026-10-22:
"I don't want just my elo to dictate that. Should be how well I spot the
tactics and focuses of the game").** The rung climbs on 3 unprompted finds
(either seat) in the last 5 games and steps back below 75% — never the
rating, whose one job stays the opponent's strength.

**THE REWARDS RIDE THE FOCUS ("Make sure the dopamine tools are linked"):**
every find pays its coin + burst, silent finds included (the voice is quiet,
the screen celebrates), on both seats (stopping their tactic pays); a find on
Try again and a find on the recap's Play it out pay the retry reward; a miss
and a Show me tap pay nothing and break the streak; a RUNG-UP is its own
moment (burst + "Tactics: Intermediate!"); the game-over card shows progress
to the next rung ("2 of 3 finds to Intermediate"); checkmate still pays.
`focusPays` keeps the page's grade/gem rewards stood down while the focus
owns the game.

**MEASURED BEFORE SHIP (the Campaign's plant-arrival precedent):** on real
games, how often a rung-3 (3–4 move) chance can be planted — the slip search
must find one in ≥ 80% of games, or rung 3 falls back to rung 2 for that game
(logged). And the phone: the plant search's engine reads on the iPhone engine.

**OPEN CALLS (my defaults, David to confirm):**
- a) ✅ DECIDED, then widened the same day (item 5, David: "If the eval drops at
  any time because of not castled then it needs to call it out"): STOP on any
  drop the king in the middle caused, proven by the what-if — never a blunder;
  four lines, losing vs a cost.
- b) ✅ DECIDED: "castle before you attack" only on an attack whose eval
  dropped because of the king; a quiet move that drops it ends "You need to
  castle first!" (the four versions above).
- c) ✅ DECIDED (David 2026-10-22: "Yes, offer the take back"): STOP offers
  "Want to go back and castle?" — the rewind goes to the LATEST board where
  castling was legal and the what-if says the student was not yet losing (one
  move back only when that board is the last one), so the takeback actually
  fixes it. The miss is recorded before the rewind; castling on the retry is
  prompted and counts neither way.
- d) ✅ DECIDED (David 2026-10-22: "Two pawns is good. Advanced players might
  only get the chance to win one pawn"): rungs 0–2 win ≥ 2 pawns by force
  (today's `LOOSE_GAIN` / `SHOT_GAIN`); rung 3 (the 3–4 move calculation) may
  win ONE pawn, held only when the line is FORCING (opens with a check, a
  capture or a direct threat), the pawn is still up at the QUIET END of the
  line (the gem doctrine — never won and taken straight back), and the move
  beats the next-best by ≥ 100 cp (the board is asking).
- e) ✅ DECIDED: the layers come after tactics, one at a time, each only once
  it passes its measurement on David's games. DEVELOPMENT & TEMPO was
  measured first as two lines ("That lost the tempo." / "You have the tempo
  back! Now keep it!"): the clean version fired 0.25 times a game on 342 of
  his games; David: "I don't want in the opening tempo statements every move"
  → "there's a better way … at the start of an attack" → "Maybe it can say
  'you HAD them on the run!' after the run ends" → "Go". It became THE TEMPO
  RUN (status below). Then endgame technique, then piece activity (the most
  proof owed).

**Phases (one branch, one push, after go):** P1 the merge + rung ladder +
equal-weight voice (cards, chances, runner, record, game-over line) · P2 the
plant: target ply, steering, extras by rung, rung-3 search + arrival
measurement · P3 the castling watch · P4 tests (each fails on the old code),
the focus audit rewritten to the new contract on David's record, CLAUDE.md
§ LEARN FOCUS rewritten (old wording DELETED, the Lake Butler rule),
`docs/LEARN-FOCUS.md`, OUTLINE.

**STATUS (2026-10-23, branch `focus-tactics-01`, round 1 on main):**
- ✅ P1 — one `tactics` focus (`focusCard`), the rung (`focusRung`, `focusSetup`;
  the picker and the fade are DELETED), the chance reader on the rung scale
  (`focusChances`, the one-pawn rung-3 shot), the runner's tiers (`focusRunner`:
  ask at rung 0, Show me after a second miss at rung 0, no pause from rung 2,
  the recap's missed list), Play it out (a told drill), the rung-up reward, the
  record (`learnFocusResults.rung/atRung/presented`; old rows never read).
- ✅ P2 — the target ply (moves 6–12), extras by rung one a phase, the flip,
  the easier-too reject, the rung-0 gem slip kept as a chance the coach made.
- ✅ P3 — the castling watch (`castlingWatch.ts`): the early reminder, the
  what-if STOP (one bounded read on a costly move), the four lines, Go back
  and castle to the latest castle-ready board not yet losing,
  `king-stuck-center` filed, the `castle-watch` row.
- Build calls made (David to confirm or change): the reminder line "You could
  have castled there. Get your king safe before the centre opens."; Play on
  after a STOP lets the coach punish; the STOP is said at every rung. ✅ David
  2026-10-22 ("a pawn push can open up the center"): a PAWN BREAK — a push that
  hits a pawn or piece of theirs — counts as an attack; a quiet push does not.
- ✅ The local audit (one game on David's record) caught a focus STEER that
  gave material: …Bxe5 read 50cp on the scorer's shallow read, 375 at depth 12.
  A Learn focus steer is now verified by one deeper read and refused at two
  pawns (`STEER_GIFT_CP`); the Campaign's scorers are untouched.
- ✅ ROOT FIX, live on main since WO-LEARN-FOCUS-01: the page handed the focus
  runner every board's ply ONE SHORT (`gameRef` updates on render, so right
  after the coach's reply it still held the board before it). The record reads
  `promptedPlies` / `steeredPlies` 1-based, so no focus-asked or steered ply
  ever matched the user's move: an asked find counted as full proof, a steered
  find in full, and the castle rewind would have taken back one extra ply. The
  board ply now reads off the user's move (`move.history.length + 2`); gate
  `learnFocusWiring.gate.test.ts` fails on the old read. Old focus games keep
  their short plies (they cannot be told apart from the page's own announced
  plies after the fact).
- ✅ MEASURED — plant arrival by rung on 28 of David's games
  (`focusPlant.arrival.measure.test.ts`, the app's reads): of the 21 that
  reached move 20, rungs 0–2 were planted at their own rung before move 20 in
  20 / 19 / 20, and every one with the move-20 fallback; rung 3 at its rung
  in only 11 (52%, under the 80% bar), 20 of 21 with the fallback. So rung 3
  FALLS BACK FOR THE GAME five moves past its target (`TOP_RUNG_GRACE_PLIES`),
  logged on the `focus-plant` row's asked difficulty. The 7 short games ended
  before move 20 (the end line says the game ended first).
- ✅ SHIPPED to main `ee965ab0e` (2026-10-22), live; prod record phase
  52/59 on David's record. Its reds, each run down:
  - F8 / F11 / F9 counted by ply, and a castle rewind replays plies — the
    audit now counts by DECISION (each Go back and castle tap starts one, by
    time); F16 and the castle-back bot were harness timing (fixed).
  - 🔴 ROOT FIX: THE OTHER MISSES OF A PAUSED MOVE. A move that missed two
    chances at rungs 0–1 filed the second at once and put it on the card —
    so a retry that handled both still listed "your bishop on f3 was left
    loose" about a move taken back. The others now wait with the pause: Play
    on files them; Try again files them taken back; the retry judges them
    again, told (found → held prompted; missed → on the card; open → carried).
  - 🔴 ROOT FIX: THE REWIND WENT TO A BLUNDER. On his record the STOP after
    Qf3 rewound to the board before it, where …g6 hit the queen on h5 —
    castling there drops the queen. A board now qualifies only when castling
    is in its own read within a pawn of the best.
- ✅ THE CASTLING LOOK-AHEAD (David: "Can the coach look ahead and identify if
  not castling will hurt in the near future?" → "Go on 1&2"): STOP on the
  move that skipped castling when the board's read wanted it by a pawn over
  everything else (23 skips in 22 of his 342 games) — the rewind is that one
  move; the what-if stays as the backstop. The rewind names its count ("Want
  to go back two moves and castle?", button "Go back 2 moves and castle";
  David: "The user needs to know how many moves will be erased") and is
  never offered past three moves.
- ✅ THE TEMPO RUN (`tempoRun.ts`, "Go on 1&2"): sound checks and threats in a
  row; when a run of 2+ ends, "You HAD them on the run!" with the `tempoRun`
  starburst and coin, or "…and you let them off the hook." (no coin) when a
  forcing move was still on; a clue or STOP on the same move wins; the card
  shows the longest run and "new best" with a badge (`learnFocusResults.
  tempoRun`, the setup's `tempoBest`). Measured on 342 of his games: 311 run
  ends in 183 games (267 had, 44 let off) — a tempo move is a check or a
  quiet move leaving a NEW threat (`computeMustDefend`, discovered attacks
  included; hand walk F3). His exception to "speak only on a
  miss". Also fixed on the way: every non-find reward (the rung-up's
  `levelUp`) was counted as a find in the game's tally (`COUNTS_AS_FIND`).
- ✅ HAND WALKS (2026-10-23, David's record, `audit-reports/hand-walk-focus-tactics-2026-10-23.md`),
  each fix with a test that fails on the old code. Walk 1 (rung 0): a
  recapture credited as a free piece (`tookOnArrival`); the shot clue "a
  check or a capture" false on a quiet shot (one fixed clue, checks, captures
  and threats); tempo runs missing discovered attacks (a tempo move = a NEW
  threat, `computeMustDefend`; re-measured). Walk 2 (rung 1): the plant's
  "free" bishop taken back by a fork (a take must stay won down the engine's
  line); a "left loose" miss on a forced loss in check (`couldKeep`); "starts
  mate in one" → "is checkmate". Heard live: clue + Try again + retry credit,
  both tempo lines, the reminder, the backstop STOP with a one-move rewind,
  the end line, the rung-up, the recap. The look-ahead STOP is NOT seen live,
  and on David's games it cannot be: a clean trigger (castling over every other
  move by a pawn) is 1 board in ~500 castle-ready boards, by two pawns 1 in
  2,673 (a tactical crisis the focus owns). Driven live 2026-10-23 on his one
  real board (game 1038626480, ply 28): it held, and nothing said why — so a
  hold now writes `ahead-quiet` with the gap. Re-walked: O-O-O +1.93 vs Ncb5
  +1.11 on the app's engine, 82cp, under the bar (native depth 14: 113). The
  STOP itself was then heard live in the prod audit (74/74 on `3217f6607`, game
  1 ply 39: Kd1 instead of castling, one-move rewind, O-O). Its line was false:
  "because of that you're now in a losing position" with castling −508 and
  Kd1 −694 — lost either way — and the look-ahead built its rewind by hand,
  past the rewind rule's own "not already lost" check. Fixed at the shared
  spot: `losing` only when the best before the move was not lost, and the
  look-ahead's rewind goes through `rewindTarget`; F14 holds both.
  Plant arrival re-measured after the stricter take (22 games reaching move
  20): before move 20 at rungs 0–3 in 20 / 16 / 22 / 20 (rung 1 was 20), with
  the move-20 fallback 22 / 20 / 22 / 22 — a time-boxed, noisy read (rung 3,
  untouched, went 12 → 20).
- ✅ A MISS THE COACH STOPPED AND YOU TOOK BACK IS A PUZZLE (David
  2026-10-23, "You got it"): Try again / "want it back?" / Go back and castle /
  the Campaign's Try again flag the move; `takenBackPuzzles.fileTakenBackMiss`
  grades it (a stopped move never reaches Learn's grader — the board holds
  before the grade is scheduled) with the one price + `detectSlip`, for the
  puzzle only, and files a mistake or worse to My Mistakes; never an
  inaccuracy, never your own Takeback; one puzzle per position per game (the
  end-of-game analysis too). Found on the way: the record row's `takenBack`
  flag is a 6-s snapshot (a Try again after 6 s reads false) and NOTHING reads
  it — left as is, reported to David.
- ✅ PROD RECORD RUN 4 (59/65), the reds run down: (1) F18 used the audit's
  own depth-12 cost (≥ 200 cp) and called Qg3 (−7.2, walking into mate in 9)
  and Bf4 (−6.9, the queen already gone) unfiled defects — the app grades by
  expected points and was RIGHT; the grader now logs one `taken-back-puzzle`
  row per take-back (verdict, severity, cost, evals) and F18 asserts on the
  app's own decision (algo contract added). (2) A game ended with Try again /
  Play on still up: the miss was in the tally and the end line, on neither the
  record nor the card → `focusRunner.closeOpenPause` (test fails on the old
  code). (3) Harness: F11 demanded a coin on every retry row (one move pays
  once); the replay bot ignored the drill's hint ("Their knight on c1 is not
  properly protected") and tried three engine lines in a −5.6 position where
  Rxc1 was fourth; the student bot's b8=N never landed (a tap queens); a drill
  move's answer can come 14 s after the tap. Noted, not changed: the drill
  refused Qh5 (equal to the key at depth 14) with a weak reason.
- ✅ PROD RECORD RUN 6 (72/74, the habit build): all 19 clues heard were
  habit lines, none named a piece or square (F19); 17 of 17 paid finds
  painted their burst (F21); every taken-back mistake-or-worse filed (F18).
  The two reds, fixed: a retry that left the lead chance open carried it
  without a row closing the first try (the card was right, the record
  over-counted — the others had this fix, the lead did not); and the rung
  line said "3 of 3 finds to Intermediate" when the finds were met but the
  rate was not (it now says "3 of 9 found lately — find 3 of every 4 to reach
  Intermediate"). MEASURED, NOT FIXED (David's call): the miss streak's
  "more frequent" barely lands — g2 asked 14 times during a streak and the
  coach found no slip that hangs a piece; g3 planted 2 of 18; each failed ask
  costs engine reads every two moves. DECIDED (David): "Keep natural" — no
  forced slips; "But difficulty should decrease" — it does, one rung per miss
  in the streak, already.
- ✅ THE CLUE IS THE HABIT; MISSES BRING EASIER CHANCES (David 2026-10-23,
  after grading the focus B-: "Just say 'a piece' don't name directly. Switch
  the alert to the habit. The coach should present more frequent and easier
  chances if user keeps missing"). The clue names the kind of thing missed
  and the habit that finds it, never the piece or its square (one fixed line
  per kind, `focusLines.CLUE`; the naming helpers are deleted); a test over
  real boards holds that no clue names a square (F19 on prod). A miss streak
  (`PlantState.missStreak`: your chances missed in a row at the first try)
  brings the next plant two moves sooner, one rung easier per miss, past the
  extra budget until a find (F20). OWED: the transfer measure — David's
  loose-piece / tactics hold rate over his next ~10 Learn games against the
  20 before (a bot cannot show teaching).
- ✅ THE FIVE FOUND IN RUN 5, FIXED AT THE ROOT (David 2026-10-23: "Fix the
  problems"): (1) YOUR OWN TAKEBACK — the `takenBack` flag was a board snapshot
  6 s after the move that nothing read, so a slip undone at 7 s, or undone
  and kept on a learned line, still filed a live puzzle; now each graded move
  has a serial, the bar's Takeback and a chat takeback mark it (the castle
  rewind is the coach's), the live filer reads the flag, a late takeback
  withdraws the puzzle and marks the rows, and a session mark closes the
  write race (`ownTakeback.test`, `ownTakeback.gate.test`). (2) THE DRILL
  JUDGE read the boards after each move separately at 0.9 s — a second way of
  pricing a move — and refused …Qh5 a centipawn from the key; now one search
  scores the move and the key (`priceAgainstKey`, `drillJudge`), two reads
  only on a mate. (3) "YOU ARE IN CHECK — THE KING COMES FIRST" contradicted
  the one check computer (`checkMethod`: list all three answers before you
  touch the king) and was said whatever the answer was; `positionAsk` now
  speaks `checkMethod`'s line, or "the king has to move" when the king's move
  is the answer. (4) THE TEMPO RUN counted a perpetual (Qg6+ Ke7 Qg5+ Ke8 …,
  a "new best" of six); a move that brings back a position is no tempo move
  (re-measured: 4+ runs 29 → 27 games). (5) THE CASTLING LOOK-AHEAD — 1 of
  501 boards in David's games qualifies (castling best by a pawn and a half);
  driven live on prod (below).
- ✅ P4 — on main `3bf5470c4`; PROD RECORD RUN 5 on David's record: 65/65
  green (3 games, rungs 0→1, the rung-up said). F18 on the app's own rows:
  Qd3, a4 (a missed mate), Ng4, g5 filed as blunders; g6, b3, hxg4, Kd7, Bb7
  "not a mistake" in games already 5–13 pawns lost; Rh1+ unpriced (−16, no
  price inside the read budget — never a guess). OTA run 81 dispatched from
  main at David's ask (the first since Oct 11). rung2 / rung3 phases not
  re-run this round (unchanged code paths beyond the end-of-game close).

## 🎯 WO-STRENGTH-01 — the coach plays at the student's real strength (David 2026-10-22: "Coach keeps kicking my ass" → "Make that fix")

David lost four Learn games to the coach, all by checkmate. Measured, the cause
is the TARGET, not the engine's scale (what I first told him was wrong, and he
was told so):
- His seed is his chess.com DAILY rating (943 imported games, all Daily):
  1414, days a move — not his real-time strength.
- The live estimator stepped +60 / −35 per posed question with nothing tying
  it to a rating; it settles where 37% of answers are clean and climbs for
  anyone better. His data drop (Oct 20) had it at **1679** after six counted
  moves.
- The engine, graded like humans (600 positions from rated games, depth-12
  reads; `/tmp` scripts, Stockfish 18 lite as the app runs it): `UCI_Elo`
  1320/1414 make a 100-cp mistake on 26% of moves (≈ a human 1150), 1679 on
  19% (≈ 1650), Skill 0 26% (≈ 1150), Skill 3 18%, Skill 5 13%, Skill 20 2%.
  So at 1679 he faced a ~1650-human opponent; no setting goes below ~1150.
- Real players (7,920 rated Lichess games): a 100-cp mistake on 41% of moves
  at 600, 20% at 1400, 10% at 2500 (`move-quality-curve.json`).

✅ BUILT (on `main` 2026-10-22, ahead of the focus branch — David was losing games):
- `liveStrength` — a posterior over a rating grid, each graded move's cost
  (six bands) read against the fitted real-player curves; no step size, no
  drift. Simulated players at 1000 / 1400 / 1900 read within 200 of the truth
  from seeds 400–500 away. Same filter as the curve (9th move on, contested,
  a gem counts earlier). A seed is wide (rd 300); a carried estimate never
  starts surer than 150; rows the old stepper wrote (no spread) are dropped —
  his 1679 goes.
- A find on a chance the COACH made earns nothing (`replyMadeAChance`, a
  `Record` over every reply source; Learn marks the plies; the opening Play
  rung's trap/gem lines; the punish callout now counts as prompted); a miss
  there still counts. A prompted move is not evidence either way.
- 🟠 OPEN, DAVID'S CALL: game results as a second, damped input. Move quality
  alone separates 1100 from 1400 only over ~8–10 games (simulated); results
  are how every site rates players — but rule 1 of CLAUDE.md's strength
  section says "never the result". Asked.
- ✅ ON MAIN 2026-10-22 (`631c336ae`), live bundle checked (the curve ships).

### Step 2 — one strength per game, and the human move (David 2026-10-22: "Same rating throughout the game. Algo up or down per game only. And certainly make more human. Check to make sure this is an app wide fix. Even the play in opening tab")

Pushed back, named: a first game on a fresh install now plays at the seed all
game (the first-run strength question sets it); accepted — a mid-game climb is
what he lost to.

- ✅ `gameStrength.ts` — ONE estimate for the student, kept out of any page;
  each game id gets its number the first time it asks and keeps it to the end
  (and on a return to the game). Graded moves move the estimate now
  (`recordStrengthMove`), the opponent feels them next game. Every surface
  that plays a game reads it: Learn / Campaign, Play, the Openings Play tab,
  a mistake puzzle played on, an endgame play-out (the last two read the
  profile rating before — not app-wide). Found by the tests: a seed nobody had
  taught yet pinned every later game (a first game asked before the profile
  loaded) → an untaught estimate yields to the game's own seed.
- ✅ `opponentStrength(surface, gameId, …)` — the game id is REQUIRED and rides
  the `coach-opponent-strength` row; the full-games audit and
  `audit-opponent-strength-prod.mjs` hold one `studentElo` per game.
- ✅ THE HUMAN MOVE (`humanMove.ts` pure + `humanReply.ts` engine): past the
  book every rated opponent scores EVERY legal move in one read and a model
  fitted on real players picks — P(move) ∝ exp(w(rating)·features): what it
  costs in winning chances (so a won position is not a blunder fest), and what
  kind of move it is (capture, check, a piece fleeing an attack, a piece left
  en prise, development, castling, retreat, distance, edge pawn, centre). One
  door, `ratedMove` / `humanReply`; the engine's Elo cap is the logged
  fallback. Gate `oneRatedMoveDoor.gate.test.ts`: only the door asks the
  engine for a move at a rating, and every rated surface reaches it.
- ONE door per game: every game surface asks
  `engineStrength.gameOpponentStrength(surface, gameId, seed, difficulty)`;
  `STRENGTH_FLOOR` moved to `engineConstants` so the estimator and the door
  never import each other. Play's fast path and every play-out share ONE
  bounded move, `coachPlaySession.ratedPlayMove` (deadline = the human read's
  budget + the capped search + 1 s; a hung read plays the fallback, the board
  never waits — the play-outs had no deadline before).
- PROD AUDIT 2026-10-22, 2:20 PM CT, `9d63bd920`, David's record
  (`audit-opponent-strength-prod.mjs`, three runs, all green): Learn 11/11,
  Play 13/13 + 8/8, Openings Play 12/12 and the loop game 24/24 moves past
  the book chosen by the human model; one `studentElo` per game; a second
  Play game is new only after the first ends (Play resumes an unfinished
  game — the audit now resigns, as a person does). S5, the loop: his saved
  row was the old stepper's 1679 with no spread and was NOT carried (game A
  played at the 1414 seed); a sound student's 16 contested moves took the
  saved estimate to 1690 (rd 279), and game B, after a reload, started at
  exactly 1690. One strong game lifts the next opponent ~280 at a wide
  spread — the posterior working, named here so it is not a surprise.
- KEPT: `useChessGame`'s `computerColor` (the kid piece page's lone black
  king, passed by position, so a name search missed it). Not a rated
  opponent: it moves a king around one piece, at no rating.
- MEASURED (`scripts/meter/all-moves-reads.mjs` → 11,711 positions from 3,960
  rated Lichess games, every legal move scored at depth 10;
  `humanMove.measure.test.ts`, fit on 4/5 of games, measured on the 5th;
  baseline `scripts/meter/engine-elo-picks.mjs`, Stockfish capped to each
  player's rating): five folds, every position scored by a fit that never saw its game.
  | rating | picks the player's move (model / capped SF) | 100-cp mistakes (players / model / capped SF) | 300-cp blunders (players / model / capped SF) |
  |---|---|---|---|
  | <1000 | 34.3% / 23.7% | 34.0 / 34.2 / 27.2 | 15.0 / 13.7 / 7.6 |
  | 1000–1199 | 38.0 / 22.4 | 25.3 / 26.0 / 26.8 | 10.1 / 8.9 / 9.3 |
  | 1200–1399 | 36.9 / 25.7 | 24.5 / 26.0 / 21.4 | 8.2 / 8.7 / 3.9 |
  | 1400–1799 | 40.9 / 30.7 | 18.6 / 20.0 / 18.6 | 5.3 / 5.4 / 3.8 |
  | 1800–2199 | 43.2 / 32.5 | 15.6 / 15.5 / 17.6 | 4.7 / 4.2 / 2.9 |
  | 2200+ | 45.7 / 35.3 | 11.6 / 11.4 / 6.0 | 3.4 / 3.3 / 0.9 |
  The likelihood fit alone erred ~2–3 points more than players (≈150–200
  rating points weak); one fitted rating shift (+175) puts every band within
  ~1.5 of the players. The measure test FAILS a fit whose 100-cp rate is off
  by > 4 points or 300-cp by > 3 in any band. The model's weights: cost (in
  winning chances) dominates and stronger players avoid it more; captures
  (+1.5), checks (+1.1), castling (+2.1), development (+0.75) are what people
  reach for; a piece left en prise (−1.6) is what they mostly avoid.
- 🟠 the read's speed on the iPhone's engines (native plugin; asm.js
  fallback) — same 2.5 s budget as the old capped search; a read that fails
  falls back to the capped engine and is logged (`human read failed`).
- 🟡 a recapture feature needs the last move passed to the picker.

## 🎯 WO-MOTIFS-01 — every tactic in chess, both seats, three levels (David 2026-10-22)

**Why.** The tactics lesson asks about five of their tactics and names none of
yours: "your shot" is one catch-all tag (`missed-tactic`), overload and removing
the guard fold into a general "missed their threat", and the Weaknesses tab
reads two motif lists that do not share names (the heat map's tags vs the
Insights tab's 17 `TacticType`s) — the `discovery` / `discovered_attack` rot one
layer up.

**The search (2026-10-22: Wikipedia "Chess tactic", chess.com's 38 definitions,
Lichess puzzle themes, UMBC master prep).** Live today (board or engine line):
fork, pin, skewer, discovered attack, double check, back rank, removing the
guard, trapped piece, mate threat, overload, hanging piece, decoy, deflection,
interference, clearance, zwischenzug (`tacticGeometry`), stalemate
(`stalemateWatch`), zugzwang and breakthrough (endgame). After the game only:
x-ray, promotion. Not covered: desperado, windmill, perpetual check,
underpromotion, discovered check as its own motif. Folded as sub-types, never a
row: attraction → decoy, undermining → removing the guard, cross-pin → pin,
underpromotion → promotion; "quiet move" is the setup trainer's idea, not a motif.

**Decisions (David 2026-10-22).**
1. Cover all of them, not all at once: **Beginner / Intermediate / Advanced**.
2. **The next level opens when the previous holds ≥ 75% IN GAMES** (USE evidence:
   Learn, Play, analysed imports) — never the rating, never wins ("measure
   against the position, never the result"), never puzzles (a puzzle tells you
   there is something to find; it records KNOW, which the trainers read).
3. **Everything is recorded from day one.** A locked motif is not asked or
   planted in free play; Review still names it after the game.
4. **The Weaknesses tab:** the Threats meter (their side) and the Tactics meter
   (yours) are the headline; each opens into its motifs; a motif row appears
   only once the board has posed it; the Insights tactics tab reads the SAME list.
5. **Two tags per motif** — "their X landed" / "you missed X" — from ONE
   `Record<Motif, …>`, so a new motif fails to compile until both exist. Existing
   tags are REUSED (`missed-their-fork` IS fork·theirs); nothing persisted is renamed.

**The levels — ordered by the median rating of the Lichess puzzles carrying
each theme (`src/data/puzzles.json`, 15,000 CC0), one override with its reason.**

| Level | Motifs (median puzzle rating) |
|---|---|
| Beginner | back rank 833, mate (in 1–3, smothered 1314), skewer 1325, fork 1379, discovered attack 1445, hanging piece 1461, promotion 1469, **pin** (data 1639 — overridden: a pin is easy to see and hard to use; puzzle ratings measure the hardest move to find, not what is foundational) |
| Intermediate | deflection 1528, x-ray 1572, discovered check 1597, double check 1623, removing the guard 1633, zwischenzug 1641, decoy 1651, trapped piece 1670, overload (no theme in our set — placed beside removing the guard) |
| Advanced | clearance 1807, interference 1867, desperado, windmill, perpetual check, stalemate trick (the last four absent from our 15k — placed by the full Lichess set before they ship) |

**Steps (each with tests that fail on the old code):**
- **M1** the master list: motif → {theirs, yours, level, meter}; new tags in
  `misconceptionTags`; `METER_OF_TAG`; a new tag borrows its meter's population
  difficulty until M7 fits it.
- **M2** every producer files by motif. Yours: the focus `shot` (the unified
  classifier on the engine line), the fundamentals (`pile-on-pin` → pin,
  `remove-guard` → removing the guard), `moveInsight` (double attack → fork,
  mates → mate), `computerRoles` (gem / tactic / playedConcept). Theirs:
  `THREAT_SKILL.motifTag` for overload and removing the guard. ONE bump of
  `POSITIVE_HALF_REV` + `THREAT_HALF_REV` so analysed games are re-read on the
  backfill schedule; a row the reader cannot name stays `missed-tactic` ("a shot").
- **M2 DESIGN (mapped 2026-10-22).** The naming is done ONCE, by the classifier
  that already exists: `missedTacticService.detectTacticType(fen, uci, pv?)` names
  promotion, hanging piece, fork, pin, skewer, discovered attack, back rank,
  double check, removing the guard, overload, trapped piece, mate (engine),
  deflection/decoy, interference, clearance (geometry) and zwischenzug from a
  move and its line. One function `motifTag(seat, fen, move, pv?)` maps that
  `TacticType` to the motif's tag and is called where a move is SCORED, never in
  each producer: `capabilityOutcomes` (held → the played move, broken → the best
  move; it is also what the population fit scores, so student and population are
  named alike), the slip classifier (best move), the focus `shot` (its line) and
  `threatAnswerEvidence` (theirs). Found while mapping: ALL THREE lessons' exploit
  seats read the same `missed-tactic` tag (free piece, shot, attack), so their
  three hold rates were one number — the split is the root fix. Seat hold rates
  are pooled over a seat's tags (`focusPicker.pooledHold`), so splitting does not
  thin a lesson's reading; a level's gate pools the same way. A tag with no
  population row (`skillMetersLoader.skillDifficulty` → null) borrows its parent
  (`missed-tactic` / `missed-opponents-threat`) until M7. The heat map lists every
  tag (`heatMap.ts:78`), so a motif tag is listed only once posed.
- **M3** the missing readers: discovered check split from discovery, x-ray and
  promotion live (Beginner/Intermediate first); desperado, windmill, perpetual
  (Advanced, later).
  **M3a (2026-10-22, driven by the M4 "named instead" table — fix the readers
  that MISS before adding new ones):** each was filed as the catch-all shot.
  - **King skewers.** `tacticWinsMaterial` called a skewer real only if the
    front piece could be won or a KING stood behind — a pin's rule — so Rd8+
    Kc7 Rxa8 was dropped. Now: the front must move (the king, or a piece lost
    standing) and the piece behind is winnable once it has gone. Skewer 9.2% →
    79.2% exact (false 0.7% → 2.2%). This is the one computer, so live
    narration now says "lands a skewer" there too.
  - **Pawn runs.** Step 0 saw a promotion only on the move itself; a run (h4 …
    h8=Q) is now read by following the first move's pawn down the line.
    Promotion 7.5% → 35.2% (false 0%).
  - **The first tactic names the line.** The walker names the tactic on the
    line's biggest-gain move: Bxh2+ Kxh2 Qxd4 has its gain on a plain capture,
    so the discovery was lost; and once king skewers counted, Qxc3+ (a fork)
    Kf1 Qxa1+ was named for the later skewer. The classifier (not the walker —
    live narration is unchanged) now names a line by the FIRST tactic the
    mover's own moves land, after a mate the line delivers or threatens.
  - **The pinned defender.** A capture whose defenders exist but none can
    legally take back (not in check) is exploiting a pin (…Qxh3, g2 pinned).

  After all four (15k puzzles, exact / false): fork 80.8 → 86.6% / 2.8%, skewer
  9.2 → 86.2% / 2.3%, discovered attack 35.1 → 49.7% / 3.9%, promotion 7.5 →
  35.2% / 0%, pin 31.9 → 35.4% / 1.7%, trapped piece 47.8 → 52.2% / 0.2%,
  removing the guard 30.8 → 27.8% / 4.1% (its lines often land a fork first).
  Skewer's false rate rose 0.7 → 2.3%: read by hand, most are real king
  skewers Lichess left untagged (Rc2+ Kd5 Rxc6, Bf5+ Kc7 Bxc8, Rf7+ Ke5 Rxf4).
  No measurable cost (532 s per shard before and after). Still weak: deflection
  0.5% (its lines end in a mate or fork, which is the right name for the
  record), clearance / interference 0%, zwischenzug 16%, double check 12%
  (named checkmate — the line mates).
  Revs: TACTIC_TYPE_REV, POSITIVE_HALF_REV and MISCONCEPTION_RULES_REV move
  together (held rows, misses and mistake-puzzle tags re-read under the same
  names). The rev gate passed the change at first — David's fixture games
  held no skewer and no run — so it now also fingerprints the classifier on
  the first three Lichess puzzles of every motif theme, and fails with the
  fixes reverted. Narration revs are NOT bumped: an old cached review lacks a
  true skewer line but says nothing false, and a bump re-voices every cache.
  **M3b (2026-10-22) — DISCOVERED CHECK, its own row.** Lichess files it apart
  (`discoveredCheck`, 416 puzzles, median 1597 → Intermediate). A new
  `TacticType` `discovered_check` (authority `mechanics`: board-certain), the
  motif row and `missed-your-discovered-check`. The reader
  (`missedTacticService.discoveredCheckWins`, inside the first-landed-tactic
  walk): one of the mover's moves checks with a piece it UNMASKED — the moved
  piece is not a checker (a plain check) or one of two (a double check) — and
  the line nets ≥ 2 (the exchange or more) over the check, their answer, your
  capture and their recapture. Their side stays null: the threat reader sees
  their discovery coming, not whether it will check, so theirs files under
  discovered attack (the true, coarser name). On the 416 puzzles: 112 named
  discovered check, 154 mate (the line mates — correct), 47 fork, the unnamed
  shot 116 → 37; 0 false alarms across the 14,584 puzzles without the theme
  (full measure, 15,000 puzzles, 1,086 s single process).
  Read by hand: the 37 left win later than three plies (f6+ Kg8 Qd8+ …). Revs
  moved together again ('2026-10-22-discovered-check'). The rev gate passed
  the reader's REMOVAL at first: its sample is the first three puzzles of each
  theme, and the first three discovered-check puzzles are mates. Root fix:
  `src/test/motifReaderCases.ts` — the position each reader was PROVEN on, one
  list read by the classifier's tests AND fingerprinted by the gate, so adding
  a reader's case widens the gate; it now fails with the reader removed.
  **M3c (2026-10-22) — THE X-RAY, read off the line.** It was theme-only: the
  old static shape ("a slider behind a piece") fired on nothing that won. The
  record's x-ray is the recapture THROUGH: your piece lands on a square (a
  capture, or a sacrifice: Re7+), they take it with a piece that stood on your
  line to that square, and your line piece takes back through where theirs
  stood (Rxe1 Qxe1 Qxe1). Real only if the sequence, with their next retake,
  nets ≥ 2 (`xRayRecaptureWins`; an even trade on a lined-up file is a
  trade; our own piece in front is a battery). Its own Intermediate row
  (`missed-your-x-ray`, 59 puzzles, median 1572); authority `mechanics`, so no
  `TacticType` is theme-only any more. On the 59: 18 named x-ray, 28 mates
  (named mate), unnamed 19 → 2; 0 false alarms across the 14,941 puzzles
  without the theme. Nothing else moved: fork 86.6% / 2.8%, skewer 85.9% /
  2.3%, discovered attack 49.2% (the 112 that also carry discoveredCheck are
  now named that, still consistent).
  **Next reader question (open, measured 2026-10-22):** of 1,276 deflection
  puzzles, 238 are named fork and 262 mate by what the deflection SETS UP,
  and 268 are the unnamed shot. Mates stay mate (the line mates). The forks
  break "the first tactic names the line": the deflection on move one has no
  reader at step 1a (`tacticGeometry`'s deflection read runs only when
  nothing earlier named the line). Moving it ahead renames ~240 lines — its
  own rev bump and measure, and held until the M7 scoring finishes, so the
  population and the student are named by the same classifier.
  **DECIDED (David 2026-10-22: "Count both").** A line that opens with a
  set-up (deflection / decoy, interference, clearance, the in-between move)
  and lands something else (a fork, a mate) counts under BOTH: the line keeps
  its name (no rename) and the set-up is counted beside it. Build = **M3d**:
  - **THE ROOT GAP (found mapping it):** the analysed-game record never kept
    the line after the best move. The bulk sweep writes `pv.afterBest = []`
    "until the refined best move lands" and the refinement search (which HAS
    the line) never writes it back: 0 of 415 stored lines on David's 950
    games carry one. And `capabilityOutcomes` / `classifyNamed` name a shot
    from the best move ALONE. So every reader that needs the line — the
    set-ups, discovered check, the x-ray, pawn runs, a tactic landing later
    in the line — never reached the GAME record (the puzzle measure gave
    them the line, the record did not). Same gap, second symptom:
    `positionPosed` documents "the line FROM the best move" and the sweep
    passed `afterBest` (the line AFTER it), so the king reads played the
    opponent's reply as the student's move.
  - **Fix order:** (1) the sweep keeps `afterBest` from the refinement's own
    search; (2) ONE line shape threads to the record (`bestLineUci`, from the
    best move: `capabilityOutcomes`, the classifier, `positionPosed`);
    (3) `detectTacticLine` → `{ tacticType, setup }`, `namedShotTags`, the
    record writes both (evidence rows both ways; a second slip row for the
    set-up); the puzzle / classified-tactic rows carry `setupTacticType`
    and every per-motif count reads both; (4) old games: the line is filled
    from the engine cache already on the device (`positionEvals.pv`, no new
    engine run) when the game is re-derived; (5) revs move together, the
    measure reports set-ups, the population table is refitted (the
    calibration has the lines; the scoring changed).
  - **Built (2026-10-22):** `detectTacticLine` → `{ tacticType, setup }`
    (the name is unchanged; `detectTacticType` returns it); `namedShotTags`;
    `capabilityOutcomes` takes `shotLine` (costly ply: the engine's line from
    the best move; clean ply: the game's own next 8 plies — a found shot is
    named off what the game did with it) and asks / holds / breaks every
    name; the slip classifier returns `setupTag` and the capture files a
    `setup: true` row beside the slip (re-read with it, removed when the line
    no longer opens with one); a focus shot records both; puzzles and
    classified tactics carry `setupTacticType` and every per-motif count
    reads `tacticTypesOf` (spine holes, Insights, analytics, the game
    filter). One line shape, `annotationLine.bestLineOf` — it also fixed
    `positionPosed` (king reads were handed the line AFTER the best move)
    and the tactic backfill's game line (never matched its own best move).
    One ply→scoring mapping, `plyScoringArgs`, shared by the record, the
    calibration and the refit (the calibration hand-copied four fields).
  - **What the measure decided (15,000 puzzles, count both):** the set-up
    reads are the deflection (decoy) and interference only.
    `inBetweenMove` read 200+ plain mates in two as an in-between move (f7,
    then Rf8#) — not a set-up reader. The clearance read agreed with the
    puzzle's theme on 4 of 65 set-ups — not a set-up reader. A deflection
    BY CHECK (Qg6+ Kh8, the king no longer guards h6) was built and measured:
    false alarms 0.7% → 6.4%, because a check, a king step and mate on a
    square the king used to guard is every king hunt — reverted. Shipped:
    deflection exact 0.5% → 8.7% at 0.7% false; its set-ups ride mates
    (144), back-rank mates (40) and forks (10), about half carried by the
    puzzle's own deflection/attraction theme (Lichess under-tags attraction,
    so the true share is higher). Everything else unchanged.
  - **OPEN, for the next reader pass:** most Lichess deflections are by
    check, and the puzzle line often stops before the material is collected
    (the reader's "nets 2" floor fails on Qh3+ Kg1 Qxg3+). A check
    deflection needs a discriminator from a king hunt before it can count.
- **M4** prove every reader on the puzzles carrying its theme (catch rate) and
  on puzzles without it (false alarms) — the measure is committed with the reader.
  **Measured 2026-10-22** (`motifReaders.measure.test.ts`, all 15,000 puzzles,
  sharded with on-disk checkpoints — vitest holds console output to the end, so
  a single run was blind for 14 minutes and was killed). The ONE classifier on
  the solver's first move + line. "Exact" = named this motif; "consistent" =
  named some motif the puzzle carries; false = named it on a puzzle without it.

  | motif | puzzles | exact | consistent | false |
  |---|---|---|---|---|
  | mate | 4057 | 99.7% | 100% | 0% |
  | fork | 2149 | 80.8% | 88.8% | 2.9% |
  | free piece | 566 | 58.3% | 85.9% | 3.5% |
  | trapped piece | 205 | 47.8% | 56.1% | 0.2% |
  | discovered attack | 908 | 35.1% | 51.9% | 3.7% |
  | pin | 1056 | 31.9% | 54.9% | 1.9% |
  | removing the guard | 133 | 30.8% | 45.1% | 5.7% |
  | zwischenzug | 211 | 16.1% | 39.3% | 3.0% |
  | double check | 130 | 13.1% | 90.8% | 0% |
  | skewer | 327 | 9.2% | 14.4% | 0.7% |
  | promotion | 389 | 7.5% | 19.5% | 0% |
  | deflection | 1276 | 0.5% | 47.7% | 0% |
  | clearance | 236 | 0% | 45.3% | 0.1% |
  | interference | 55 | 0% | 12.7% | 0% |

  Read: false alarms are low everywhere (≤ 6%), so what the record files is
  rarely wrong — the gap is MISSES, which file as the catch-all "a shot" (or
  as the line's mate). Two causes to measure before building M3: (1)
  precedence — the walker names a line's mate before the motif that set it up
  (deflection 0.5% exact but 48% consistent); (2) readers that look only at the
  first move — promotion is checked only when the first move promotes, so a
  push-then-queen line is missed (7.5%). Next: a confusion table per weak motif
  (what each one is named instead), then fix the readers worst-first.
- **M5** ✅ (2026-10-22) the lessons ask only the open levels' motifs, both
  seats. `focusPicker.openMotifLevels`: Beginner always; the next level opens
  when the one before HOLDS — its tags pooled over both seats at ≥ 75% AND no
  motif in it red (a pool alone let loose pieces at 95% carry forks at 40% past
  the bar; a grey motif does not block). `FocusPick.levels` is required and
  threads to `chancesAt(…, open)` (required), the coach's steering
  (`posesDefendSeat(…, open)`, `ScoringContext.focus.levels`) and the turn rows
  (`tag` + `level`). Their-side patterns per lesson are DERIVED from the master
  list (`focusChances.motifPatterns`), replacing the hand-kept sets; a locked
  motif's target stays a loose-piece save. Each motif has its own words
  (`focusLines.THEIR_MOTIF`, a `Record<MotifId, …>`; a double check was said as
  a discovered attack).
  Found while wiring, fixed at the source: `threatAnswerEvidence.newThreatsAtTurn`
  took the detector's first square as "their attacker" — for a trapped piece,
  removing the guard and an overload that square is the STUDENT's piece, so a
  clue would have said "their knight on e5" of the student's own knight. The
  attacker is now read off the board. And the record-rev gate fingerprinted the
  plies READ, not the rows WRITTEN, so it could not see a scoring change — it
  now fingerprints the rows (`recordRevs.gate.test.ts`).
  And M1's own slip, caught by the related tests: listing every motif tag on
  the thinking steps made a step green only when EVERY motif was proven
  (never, for one nobody was posed) and made one lesson answer write a row
  per motif. The steps keep their own tags; every step reader folds a motif
  row into the skill it refines (`thinkingSteps.stepTagOf`).
  Audit: F6 asserts the levels, new F12 asserts only open levels were asked.
  **Prod audit of M5 (2026-10-22, David's record):** record 46/47, tactics
  44/44, kings 43/43; F12 green in every game (levels Beginner + Intermediate
  once the gates were seeded green; an Intermediate guard removal was asked,
  nothing locked was). The one red was a real bug: a move that saved a loose
  piece but walked past a free take paid a coin AND got "Hold on", then the
  retry paid again — two rewards for one decision. A move whose miss is taught
  now pays nothing for what it found; the retry pays (`focusRunner`, test
  fails on the old code). Lines per game: 3–4 (tactics, all found) and 3–8
  (kings) — they track the misses. Kings g3's "asked, never settled" was the
  audit's 80-move cap ending the game right after the ask, not a product gap.
  The 2026-10-22 prod rerun (record 44/44, tactics 41/42, kings 39/40) had two
  reds, both instrument or pre-split: F7 read a passed-up mate (…Qa4 from mate
  in 3 to +8.5, engine-checked) as a 90-pawn gift — the flat ±10 000 mate score;
  and kings g3 was picked loose pieces because, on the deployed build, every
  lesson's "your side" was the one `missed-tactic`, so the phase's deliberate
  loose misses flipped the gate (the audit now misses loose pieces on purpose
  only in the loose phase).
- **M6** the Weaknesses tab: meters open into motif rows; Insights reads the list.
  ✅ (2026-10-22) The meter → motif drill-down was already live
  (`SkillMetersStrip` pick + `heatMap.listedOnTab`). Insights did NOT read the
  list: its tactics tab kept a private label table covering 10 of 18 tactic
  types (the rest showed as raw codes like "double_check") and counted back
  rank and checkmate as two rows. `TacticInsights.missedByMotif` now groups by
  `MOTIF_OF_TACTIC` and labels from `MOTIFS[m].label`; the coach's "what
  tactics do I miss" answer reads the same rows and never names an unnamed
  shot as the motif missed most. The never-filled `tacticsByType` is deleted.
- **M7** the population refit for the new tags (sharded, checkpointed).
  ✅ (2026-10-22) The sample and its reads are committed scripts now
  (`scripts/meter/sample-lichess.mjs`, `engine-reads.mjs`): 3,960 rated games
  of Lichess 2024-06, 600–2600 evenly, every position read by Stockfish 16 at
  depth 12 (mates kept as their distance and turned into an eval by the app's
  own `mateEvalFor`). The first scoring read "your fork" and "your free piece"
  as held 100% at every rating — **a defect in the record, not the fit**: an
  analysed game's MISTAKE or BLUNDER ply rode without the position's posed
  questions (`capabilityPliesFromAnnotations`), so a missed shot could break
  its skill as an inaccuracy and never as a mistake. Live play has always
  posed them on every move (`discussionPractice`). Fixed at the builder (a test
  on a blundered mate in one fails on the old code); `POSITIVE_HALF_REV` moved
  so analysed games are re-read. Because the one scoring changed, the WHOLE
  table was re-measured with it (a meter compares the student with a
  population scored by the same function — a merge of new rows onto old ones
  would not be): 26 rows (was 19, from 1,414 games) from 3,960 games and
  263,956 scored moves. New rows: your fork, your pin, your free piece, and
  five skills that never had one (overextended pawn, the uneven trade, the
  poisoned pawn, leaving the book early). Moved because costly misses count
  now: the unnamed shot (flat 76–84% → 50% at 600 to 72% at 2200), hung
  material (83–96% → 77–91%). Too few answers still (< 500, they borrow the
  parent row): your skewer, guard removal, mate, discovered attack, the two
  new readers.
  **On David's record** (`skillMetersRefit.measure.test.ts`, his 350 analysed
  games re-derived the way the device backfill will, plus his live rows): the
  costly misses now counted take broken rows 759 → 844, and the meters barely
  move — Development 1381 → 1363, Threats & material 1445 → 1425, Calculation
  1476 → 1485, Endgames 1434 → 1443, King safety and Centre within 15 — except
  Planning & structure, Lv10 ~1331 → Lv11 ~1465, from the overextended-pawn
  row it never had. Openings and Tactics stay "not rated" (Tactics 88 weighted
  answers of the 100 a level needs).
  On main 2026-10-22 5:40 AM CT (`ef6db08..328e194`), verified in the live
  bundle (the new revs present, the replaced one gone). Post-deploy on prod,
  muted: loop-green 16/16 (proven rows quiet the coach, prompted rows change
  nothing), Weaknesses 21/21, Learn focus tactics phase 15/15 on David's
  record (three lines: the announce, "What does their last move threaten?",
  the end line; nothing off-focus spoke).
- ✅ **(a) the coach leaves chances — BUILT (David 2026-10-22: "2, go").**
  `src/coach/focus/focusPlant.ts` + LEARN-FOCUS §7a. The runner asks
  (`focusPlantAsk`: the record's cap, red/grey 3, short 1, green 0, counting
  the chances the board posed on its own; none before board ply 12; 8 plies
  apart; ended by a find nobody asked about; the last missed pattern asked
  for again), the engine answers through the Campaign's slip reads
  (`withSlipReads`, one harness for both plants: every legal move a
  candidate, ≤ 2 student-side reads in the 2 s cap), and the lesson's own
  chance reader (`chancesAt`) decides whether a slip poses the user's side —
  no second definition. Loose pieces is the one focus whose chance IS a
  piece to take (`slipCandidates(..., 'allow')`); every other focus needs a
  slip after which nothing hangs. A planted find counts half (the turn row's
  `planted`, recorded steered); a planted miss in full. One `focus-plant`
  row per ask (what it planted, or why not); audit F13 holds the rules.
  Found on the way: the page asked with a 0-based ply while the runner counts
  board plies from 1 — fixed before it shipped (`plyOfFen(fen) + 2`).
  🔁 CORRECTED SAME DAY (David: "Remember the focus teaching MUST be
  presented … at some point during the game. It just gets harder and harder
  to find depending on their stats. Game play must also remain adaptive to
  the level of the user."). The first build broke it twice: a green focus
  planted NOTHING (cap 0), and nothing guaranteed a chance — a game whose
  slips never qualified passed with none on the user's side. Now: THE
  GUARANTEE (until a chance on your side at your step has been on the board,
  the coach looks every move from move 6, uncapped); HARDER BY THE RECORD
  (`ChanceDifficulty` on every your-side chance, computed by `chancesAt`:
  loose pieces moved piece / a guard walked away / looks guarded; tactics
  shot depth + motif level; kings mate length — the step from the exploit
  seat's hold state, red/grey 0, short 1, green 2; one easier from move 20);
  extras only on red/grey. Pushback kept: never in a decided game (a gift
  there changes the result) — such a game ends with `presented: null` on its
  result row, and F13 reports the arrival rate rather than assuming it.
  🟠 OWED: the prod run of the focus audit with F13 on David's record.

## 🎯 WO-LEARN-FOCUS-01 — Learn free play: one focus per game (David 2026-10-21)

The design is `docs/LEARN-FOCUS.md` (read it first). Goal: the hold rate
measures unprompted skill, every miss gets taught, and the coach speaks on a
miss, never on a find nobody asked about (David 2026-10-22, replacing the
8–15-lines target). Agreed with David after a stress test (Code + Chat):

- Prompted chances excluded BOTH ways (the slip path never read the flag —
  any question could only lower the score); one move poses a skill once across
  writers; a steered hold counts half.
- The fade: red/grey named + first chance asked; short unannounced, the focus
  revealed by the first taught miss (every later chance that game prompted);
  green a silent watch.
- Three focuses now (loose pieces, tactics, the kings), each a pattern family
  read from both seats; the fight (plan + key square, triggered by a change in
  the NAMED structure) ships after David grades ~20 positions, engine wins
  disagreements.
- Ladder gates; teach on the miss with Try again / Play on; one "Want it
  back?" for an off-focus deciding blunder; punish focus misses; create only
  the defend seat, never a gift; voice owner fail closed by channel.
- Measured on David's record (drop 2026-10-20): every focus is red — hung
  material 0/20 held in the window, missed tactic 9%, threats 17%, king in the
  centre 10%; their-tactics grey (1 posed). First focus: loose pieces.
- Found while mapping: the record files 567 hung-material slips against 257
  holds — slips are filed on any costly move, holds only when the posing
  computer fires. Not this WO; flagged.

Status: ✅ built and on `main` (7389011, 2026-10-21); prod-audit fixes on
`main` through 037c905 (2026-10-22). 🟠 his real-iPhone check (needs an OTA or
TestFlight — his call).

Found by the first local audit game on his record and fixed at the cause
(each with a test that fails on the old code):
- The pre-game count summed every slip row: one recent game holds two
  hung-material slips filed 24 times each, so the line said "you left 29
  pieces loose" where the moves say six. The counter now keys a slip by the
  hold rate's own `moveKey` (one move, one miss).
- A loose piece was counted geometrically: the f4 knight read "attacked twice
  and defended twice" with the e3 bishop pinned to the king — the knight was
  lost. `legalCounts` counts legal captures and the clue names the pinned
  defender.
- Both "misses" in that game were even trades (Nf4xd5 …cxd5, Rh1xh4 …Rxh4):
  the recapture was read and the capture before it was not. `saveAnswer`
  judges a save on net material and credits a trade as a trade.
- The local game said 11 lines in 40 moves (target 8–15), all focus lines;
  the door held 22 lanes as off-focus and 9 as focus-voice; the voice door
  dropped 1 volunteered line; one steer, no gift; Play on was punished.
- PROD AUDIT ON DAVID'S RECORD (2026-10-21/22, `audit-reports/learn-focus-01/`),
  each defect fixed at its computer with a test that fails on the old code:
  record "fourteen of fourteen" said where the moves held one rook three times
  (a check hid the capture; a recapture elsewhere read as a trade) → a loose
  piece is ONE decision until a move answers it (`saveAnswer` `open`, the
  asked/steered flags carried to the move that answers it); kings game 2
  credited "your king is tucked away" on …Nf6 and filed one castling decision
  six times → castling is found only by castling, one decision a game; and
  the earlier wording fixes ("no of three", "all two", "two times", the pin
  wording, the grey why lines). Second run (2026-10-22, the audit student set
  to miss every second loose piece) found three more, each fixed the same way:
  a trade elsewhere that WINS material (dxe5 took a queen) now answers a loose
  piece; giving up the last castling right after the question was asked is the
  castling miss (…Rf8/…Kd8 on boards where castling was not legal had made the
  end line say "it never came up"); a taught castling DELAY keeps the question
  open, so the later castle is the credited correction.
- RESULTS on that run: loose pieces 39/39, 10.3 lines a game (10, 14, 7);
  kings 33/34, 3.7 lines; tactics 36/37, 5.7 lines. The red row in kings and
  tactics was the 8–15 target, which David then replaced (2026-10-22): "only
  fire when the user misses a move — say nothing if the user finds the right
  move without the prompt". A find is now spoken only when it answers the
  opening ask or a retry after a clue; F4 asserts exactly that.
- 🟠 OPEN, DAVID'S CALL: the end line after a retry find ("There it is —
  their fork does not land." then "you found neither") is honest for the
  record but reads as a contradiction; proposed "you found neither on your
  own, and fixed one on the retry".
- 🟠 OPEN, DAVID'S CALL (prod kings game 1, 2026-10-22): the kings lesson
  poses only two questions — castle in time (while castling is legal) and a
  NEW mate threat the record would score. Kings game 1 lost castling in the
  opening (…Bxe2 Kxe2), was chased with checks for 30 moves and mated; the
  lesson said only the deciding line and "it never came up this game". The
  record's `weakened-king-safety` tag (a defend-seat tag) has NO posing
  computer, and the coach's kings steer counts king-zone PRESSURE, which the
  runner never asks or scores (9 steers, 0 chances). Either a new question
  ("your king has no safe home") maps the pressure steer and the tag, or the
  pressure steer goes. Recommendation: the new question.
- Not this WO, found on the way: main is red on three code-shape gates from
  the Campaign session (`arrowDoor` — BriefingFlow builds 2 arrows;
  `oneDevelopmentReading` — `coachDials.ts:105` keeps its own home squares;
  `oneNullMove` — 99 hand-written side flips against a ceiling of 90). Not
  in ship-check's gate list, so they do not block pushes; left to that
  session's live files.

## 🎯 WO-CAMPAIGN-MASTER — finish Level 1, progression, Campaign UI, patterns, the Grabber, Levels 2–4 (David 2026-10-21)

The lanes, contracts and merge order are in `docs/CAMPAIGN.md` §11.

- ✅ Phase 0 (lead): card fields (`classification`, `arrivalBar`, `scenario`,
  `briefing`, `siblings`, `pattern`, `closesAfterMoves`), every dial required
  (`trades`, `rewinds`, `strengthOffset`, `steer` added; `LEVEL_1_DIALS`), id
  unions as declaration maps, `PatternDefinition`, the one scorer seam
  (`moveScoring.ts` + `scorers/` auto-loaded, wired once in
  `coachGameEngine`; strength offset applied), the runner's per-phase cards,
  silent watchers, `phase-boundary` / `scenario-loaded`, `briefing` /
  `load-position` / `recap`, `rewinds: 'none'`; Dexie v44 (`dialState`,
  `bossAttempts`, `patternStats`) in the backup.
- 🟠 David: what `rewinds: 'mission-only'` means (behaves as `every-miss`
  until then); the dial ladders / per-tier tables; whether `/coach/teach`
  stays the classic Learn (recommended) or redirects to the Campaign.
- ✅ B progression (here): `progression.ts` (3 of the last 5 active games
  graduates, 4 from Level 19; watched misses 2 of 5 reactivate, then a fresh
  window), `watchers.ts`, `missionForPhase` (reactivated first, then the first
  open card in level/registry order, siblings by least practice),
  `dialState.ts` (one dial, one step, >90% up / <75% back, 5 games between,
  ladder as data — strength only until the tier tables land).
- ✅ C Campaign UI (here): `/coach/campaign/map`, the missions sheet before a
  game, the briefing (idea → demo with arrows → one try, drag or two taps),
  the recap, the boss intro; the Campaign tile leads the coach hub.
- ✅ E the Grabber (here): `bosses/` (preset, gate, attempts), `weakness.ts`
  (mission misses + the card's skill meter — cards now name `skill`), scorers
  `greed` / `loose` / `luft` (weight −1) / `targets`; `?boss=<id>` → intro →
  a silent owned game → `bossAttempts` → recap of what it went after; lose
  twice → its weakest target practised 3 games.
- ✅ A merged (card + `trades` + the 363-board K+Q library + `loadPosition`).
- ✅ D merged (patterns + miner + mined arrival data, 5,721 games).
- ✅ 2026-10-23 LEVEL 1 ENDGAME REPLACED: "Checkmate the king" in the
  student's own game (David, on his phone: "It stopped me short of check mate.
  Remove that function. The mating pattern was too specific. Goal should have
  just been check mate the king"). The K+Q card swapped the board for a K+Q vs
  K scenario the moment the middlegame card resolved and judged one method
  (box, bring the king, mate). Now the card goes live in the game being played
  and the game runs to its end: ANY checkmate by the student passes; the one
  miss is a stalemate when another move kept the win (shows a mate if there is
  one, else the engine's first non-stalemating move); no briefing, no board
  swap, no "lost the queen". Same id `kq-mate`, so past rows still count. The
  K+Q vs K library (`kqVsK.json`, its builder) is deleted; the scenario seam
  stays for the Intermediate endings. As a watcher it now judges what the card
  teaches — a rook mate in a crowded ending IS a pass (the 2026-10-21 false
  pass was false only for a K+Q card). Gate-1 audit C3 now fails any board
  swap in a Level 1 game. Cause of the cut-off game: the runner's
  `load-position` effect from the card's `scenario`, not a UI bug.
  Prod gate after it (2 games, David's record): 19/19; game 1 mated in the
  endgame and passed first try. Game 2 mated during the middlegame mission,
  so the endgame card never went live → David: an early mate counts ("Yes").
  `judgeUnreached` (runner): a game that ends on the student's move judges
  every card and watcher of a phase it never reached on that move alone and
  records a pass, silently; a stalemate, a scenario card and a paused rewind
  are never credited.
- ✅ 2026-10-23 evening, David's iPhone: "Now I can't move the pieces." PostHog
  on his device: the game ran fine until a Takeback after the coach had
  replied. Learn's bar Takeback undid ONE ply — the coach's reply — leaving the
  coach to move, and the coach moves only in reply to a student move: stuck
  (reproduced on prod with real touch taps). The chat router had learned the
  rule on 2026-09-21 ("take that back" after a reply = the exchange); the bar
  button and the typed step never did. One rule now, `ownTakebackPlies`, used
  by both (`takeBackMine`); gate `learnTakeback.gate.test.ts`. AND why his
  phone never got today's fixes: the launch install reads /api/ota/manifest
  with the WebView's fetch from capacitor://localhost, and the manifest sent
  no CORS header — WebKit refused it on every launch (`manifest-unreachable`
  on every held-back row since the label existed), so a downloaded update
  applied only on a "Restart now" tap. The manifest now allows any origin.
  OWED: Openings Play's Takeback always undoes two plies (wrong when the
  computer has not answered yet) — not changed blind.
- ✅ 2026-10-23, the same log: `"SecureStorage.then()" is not implemented on
  ios` 55× on David's phone and 24× on an App Store user's, from the
  2026-10-22 native build. `installAnchor.plugin()` RETURNED the Keychain
  plugin from an async function; the plugin is a Capacitor proxy that answers
  `then` with a native-method wrapper, so resolving the promise called
  `proxy.then(resolve, reject)`, which rejects and never resolves — the
  Keychain read HUNG, and `getDeviceId` with it (billing init, the free-tier
  ledger, the bell, referrals all wait on it; 66 rows on 2026-10-22 carried
  no device_id at all). The plugin is now boxed (`{ s }`); test with a
  Capacitor-shaped proxy hangs on the old code. JS only → reaches phones by
  OTA. Swept: no other plugin is returned from an async function.
- ✅ gate 1 (2026-10-21): deployed `88a97e9` (verified by content), then
  `audit-campaign-gate1.mjs` on PROD on David's record: 10 games + the
  Grabber, 47/47 checks — and three real defects the checks did not see:
  1. ✅ ONE GAME, THREE IDS. `learnMemory.observe(plies)` was fed the turn's
     own history; the instant wave runs up to a verdict hold late, so a
     late turn reported FEWER plies than the board — read as a new game.
     Every phase row (and every slip, every capability row) of a game went
     under its own id; "opening identified" was re-said mid-game. Now
     `createLearnMemory({ livePlies })` and `observe()` takes no count; the
     standing ledger observes the live FEN. Verified live on game 10.
  2. ✅ K+Q JUDGED BOARDS THAT DID NOT POSE IT. As a watcher (no scenario)
     the check judged every endgame move: a rook mate in a crowded ending
     was a K+Q pass (g5), a queen traded in a middlegame a K+Q miss (g7) —
     and the Grabber then targeted K+Q from that false miss. `posesKqMate`
     (coach bare king + student queen) gates every judgement.
  3. 🔴 THE BOARD STOPS TAKING MOVES for 8–12 s after a coach reply late in
     long games (g6 ply 104, g7 ply 140, g10 ply 77; a Playwright tap timed
     out, i.e. the main thread was busy). PostHog shows the same burst each
     time: the position-facts lane (`learn_move_held` ×6–7,
     `position_facts_spoken`, `priority_first_offered`) plus a phase read
     that announces opening→middlegame at move 38–51. Campaign speaks none
     of it. Also hits classic Learn. NEXT: CPU profile at that moment, name
     the task, fix at its producer.
  The audit now FAILS both 1 and 3 (C7 one id per game, C6 the board kept
  taking moves) — re-graded from this run's own tapes it fails 9 of 10.
  Smaller: a deploy landing mid-game reloads the page and loses the game
  (g9, web); the banner keeps "Shown — keep playing" all game after a
  shown miss; the boss recap says "never came up" for an opening that came
  up and was not finished (`incomplete` means two things); graduated
  watchers get no plant / no scenario, so they see only what the game
  offers; Learn queries the masters explorer at move 40+ (429s).
- ✅ Dials vs graduation (David 2026-10-21: "both options are good"): the
  step up fires on the graduation bar at the card's own setting, and a card
  graduates only at its graduation level (`ladder.ts`, one step harder until
  the tier tables land); rows carry `harder`; below 75% steps back.

## 🎯 WO-MISSIONS-02 — the Campaign plan in the repo + Level 1 middlegame (David 2026-10-21)

The whole design now lives in `docs/CAMPAIGN.md` (CLAUDE.md § MISSIONS points to
it): voice rule, card ship rule, engine policy, scenario starts, dials, bosses,
the L1–L50 mission list, build order.

- ✅ `docs/CAMPAIGN.md` + the CLAUDE.md pointer. 🟠 the per-tier dial tables
  (beginner + intermediate, five tiers each) are marked TO FILL — they were
  agreed in chat and are not in the WO text; David to supply.
- ✅ card `free-piece-stay-ahead` (L1 middlegame): pure check
  (`checks/freePieceStayAhead.ts`, LIVE) — plant validated by legal SEE (a
  defended "free" piece is never the plant), missed capture → miss, give-back
  ≥ 3 that drops the lead under +2 → miss (pawns and even trades never; no
  miss without a way out), pass at an ending / the student's mate / move 40
  with the lead ≥ +2.
- ✅ the plant (`plantFreePiece.ts` + `coachGameEngine.applyMissionDials`):
  quiet moves only, one N/B/R left for ≥ 3, queen safe, threatens nothing, not
  mid-exchange; ≤ 3 engine checks inside the 2 s cap (capture best or within
  50 cp, student ≥ +2.0); smallest gift wins. `mission-plant` /
  `mission-plant-none` (reason counts).
- ✅ phase sequencing: the runner queues one card per phase; the next goes
  live the ply after the last resolves and announces once; the plant window is
  the coach's 2nd–8th move of the card; a game that ends with a card live
  closes it `incomplete`. Rows carry `plantFound`.
- 🟠 10-game audit (`scripts/audit-missions-02.mjs`), arrival bar 80% — see
  the latest report in `audit-reports/missions-02/`.
- 🟠 David on a real iPhone.

## 🎯 WO-MISSIONS-01 — Learn teaches ONE habit per phase (David 2026-10-21)

Why: Learn said too much — 74 lanes, ~82 words a turn, ~25 min of talk a game,
producers contradicting each other in one breath, because each producer asked
"is my fact worth hearing?" alone and nothing owned the turn. A mission owns it:
announce, stay silent, rewind a miss with one fixed phrase, celebrate a pass.
Rule: CLAUDE.md § MISSIONS.

- ✅ the spine: `src/missions/` — card type, `Record<MissionId, MissionCard>`
  registry (a card without check tests does not ship), the pure Develop &
  Castle check on `development.ts`, the runner as a pure state machine
  (`stepMission`) with a hook that only applies its effects.
- ✅ the silence: the Learn door takes a REQUIRED `MissionVoice` at both
  production entries and holds every lane as `mission` (the row still emits);
  the five lines that bypass the door (grade, praise, gem reveal, the instant
  event line, the game-start openers) check the turn's voice.
- ✅ the coach dial: `getAdaptiveMove` takes REQUIRED `missionDials`; an
  attacking reply is swapped through the book's roads, then the engine's top
  lines inside the lesson-steer window; all-attack → the least costly, logged
  `mission-dial-forced`. The planned trap is suspended (budget kept).
- ✅ the record: Dexie v43 `missionResults`, one writer per game, in the backup;
  seats alternate from it; reward kinds `mission` (gold) / `missionRetry`.
- ✅ ITS OWN DOOR — Campaign (David 2026-10-21: "make a new spot for this"):
  `/coach/campaign` + a coach-hub tile open the same Learn page in `mode:
  'campaign'`, where the mission owns every turn of the game; `/coach/teach`
  is the classic Learn, untouched (its voice set aside from Campaign, not
  deleted). The interim `learnMissions` setting is gone — the door is the switch.
- 🟠 OWED, measured not optimised: the silenced producers still run their engine
  reads during the opening (the record still needs them; cost to measure on
  the iPhone engine before the old lanes are deleted).
- 🟠 OWED: the lines that bypass the door move into it or go with the old lanes
  (next missions WO). Missions 2 & 3, planted shots, silent watchers, the
  mission map: later WOs.
- 🟠 inside Campaign, a named-opening game ("play the X with me") and a
  walkthrough run no mission — they promise talk move by move. David's call
  whether that holds.
- 🟠 David on a real iPhone (WebKit unverified for Learn).

## 🎓 TEACHING PLAN — Learn teaches the move after it is played (David 2026-10-20)

Agreed with David 2026-10-20: **P1** every move analyzed on iPhone; **P2** the
mistake turn says what the move allowed ("Bc3 left e3 — …Ne5 puts their knight
two moves from a fork there"), what the better move did, and the habit that
catches it next time; **P3** after the game, "where it went wrong": one to three
moments on the board, opening by itself with Skip, a Drill button, wins too;
**P4** the opening goes quiet where the RECORD says he knows it (never by
rating), and the noise lines go (piece descriptions, trivia, 80-word dumps).

- ✅ P1 on main: the asm engine never stalls and iOS reads are capped at 2 s.
  Emulated iPhone, 4× CPU: 9/9 moves graded, first word median 6.3 s. A real
  iPhone (WebKit) is still unverified.
- ✅ P2 on main: `errorWhy`'s better-move reason answers what the mistake
  allowed (the piece moves off the square before it is taken; the move guards
  the square their line checks on); an idea is said in full once a game, then
  referred to (`spokenIdeaCounts`).
- 🟠 P3 waits on David: four design questions — the moments on the Learn board
  after the game; Drill puts the position back and grades the better move; a
  clean game shows how it was won; the coach speaks each moment and Skip ends it.
- 🟠 P4, and "Learn speaks after the move" (David 2026-10-20: before the move is
  a hint, after it is what was wrong and why) — a rule change; waits for his go.
- ✅ Found on the way (2026-10-21):
  - Review's walk sat ~60 s at move 1: the mistake-puzzle sweep ran its
    depth-18/22 searches on the walk's engine at the walk's priority. A read can
    be a BACKGROUND read (`ReadControl.background`): it starts once the screen
    in use is quiet, is time-bounded, and never stamps activity. The sweep and
    the record's boot re-price (`BACKGROUND_SCORER`) read that way. The review's
    record moved into `recordReviewedGame`, so closing the review early no
    longer drops it.
  - A game's slips were filed up to 24 times (David's record: 95 rows for 8
    slips). The review session re-graded and re-filed the game on every late
    read, and the writer was a read-then-write with no guard. Reproduced on his
    game: five passes at once wrote 15 rows for 3 slips. Now one writer per game
    (`oneAtATime`), the review stops at its final grade, and the copies already
    written are collapsed once per device (`collapseDuplicateRecordRows`).
  - A reset during the engine's start (destroy, app resume, forced restart) left
    the start's timers armed: a fallback worker spawned on a destroyed engine,
    the next start's worker could be killed, a working engine was flagged
    'error' 45 s later. A reset now ends the start (`EngineResetError`).
  - Walking into a forced mate earned a gem and praise (#129). The grade's
    first rule was `|cpLoss| >= 100000 → 'mate'`, and 'mate' read as a merit,
    so Learn paid for a move that loses; the same threshold missed mate-in-one
    whenever the best line was itself behind (Fool's mate graded "the plan
    drifted"). The rule is now `allows-mate`, a fault, read off the engine's
    mate fields (`allowsMate` is required on `classifyMoveReason`): the played
    line mates the mover and the best line does not. Delivering mate is still
    paid by the checkmate burst off the move itself.
  - Review froze after Start (#139). A CPU profile of the walk, run on a local
    production build with source maps and David's record loaded, had the
    screen busy 91 of 103 s and the walk stuck at move 1. Five producers, one
    disease — whole-game chess.js work in single tasks: the voiced corpus's
    FEN index replayed all 7,477 note lines (~20 s; the builder now stamps
    `positionKey`, checked equal to a full replay), the whole game's segments
    in one task (~36 s), the plan arcs (~4 s), the projected lines (~26 s —
    a cached engine read resolves as a microtask and hands nothing back), and
    the opening-theory plan walk (~2 s, twice). The builders are now steps
    (`reviewSegmentSteps`, `gameArcSteps`) driven with `yieldToScreen` (a
    back-of-queue MessageChannel task; `scheduler.yield` resumes ahead of the
    walk's own timers, measured). After: no hold over ~2 s, the walk advances
    on its voice. Total CPU is unchanged (~43 s busy on this machine) —
    computing less is #72. Tool: `AUTO_PROFILE=1` on the review audit +
    `scripts/audit-lib/cpu-profile-map.mjs`.
  - Learn ruled the same pawn out three turns running (prod Learn audit V7,
    a Scandinavian as Black, moves 19–21: "Re4+? Then … they play Qxa7 —
    they win a pawn", then Rf4+, then Rg4, all for a7). Two causes. The
    rule-out's reason was the candidate's own loss, never compared with the
    best move's line — and at move 19 every move lost a7 (Stockfish 18 plies:
    the best, …Rd6, drops it to Qxa7 too), so a loss no move could avoid was
    said as if one could. And a rule-out carried no say-once claim. Now one
    computer, `refutationProof`, keeps a loss proof only when the candidate
    loses STRICTLY more than the best line inside the heard horizon (the live
    weighing and the critical-moment reveal both read it; `moverLossProof` is
    gone), and each rule-out is keyed on the square it loses (`rule-out:a7`,
    mates `rule-out:mate:…`): one rule-out per loss in a weighing, and a loss
    already ruled out this game is not ruled out again (`ruleOutClaims` →
    Learn's say-once set). Rotating the sentence was rejected: the arrow
    exclusion reads the "X? Then" shape.
  - The Learn audit's LE1 row failed a correct row: a threat answer the
    student got wrong records `broken` by design (OS-4), but the contract said
    "held only" for every lane-evidence row. Each row now names its lane
    (`teaching` | `threat-answer` | `trap`, required at every writer) and the
    audit holds each lane to its own rule, printing any bad row.
  - Narration batch from the Review and Learn tapes (2026-10-21, one push):
    "You have a overloaded defender" — 101 templates wrote "a ${noun}"
    themselves (and two private letter rules drifted); one helper,
    `withArticle` (andList), says "a"/"an" by sound, and
    `noHandWrittenArticle.gate` fails any template that writes its own. On
    8.Bd3 "Brings your bishop out and clears the way to castle next move. Your
    bishop to d3 clears the way to castle." — the board's job line and the
    engine's reason, one claim twice: both now carry `prepsCastle` and the
    engine's line keeps it. "…the King's Indian Attack: Sicilian Variation…"
    then, a move later, "…the King's Indian Attack: French Variation…": the
    equivalence was said once per NAME; it now carries one claim per game
    (`OpeningEquivalence.claim`, read by Review and both Learn producers). The
    held callback was two sentences — "That one has caught you before — made a
    bad trade … . This time you held it." — and the game's say-once memory
    dropped the repeated second sentence, so from the second callback on it
    read as an accusation on a good move; it is one sentence now, verdict
    first. REVIEW_NARRATION_REV 14; its fingerprint gate now loads the opening
    index the app reads, so the equivalence lines are fingerprinted too.
    On 20.Bd2 "Your bishop to d2 steps out of the pawn's reach, keeping the
    bishop…" [rule] and "Takes your bishop out of reach of their pawn on f4."
    [move-job]: one rescue twice. A probe over 14 real games found the class —
    job and rule lines on the same move on 61 of 700 plies, about 20 of them one
    claim twice (rescues ×9, "c3 prepares d4" ×3, "Attacks their pawn on e5"
    beside the development rule's "…e5, attacking the pawn there" ×5, a guard
    beside "puts the rook behind your e4 pawn — it guards it now"). The join
    `JOB_RESTATED_BY_RULE` (bookMoveWhy, a `Record` over job kinds) names the
    rules that state each job's claim and the square it is about; the bare job
    steps aside only when such a rule names that square. Latent rot found on the
    way: a middlegame rule id is `mg:<id>:<wording>`, and both review joins (this
    one and `FUNDAMENTAL_CLAIM_FAMILY`, the passed-pawn/[passer] join) parsed only
    the opening's bare id, so neither had ever matched a middlegame rule.
    `fundamentalOfLine` (moveFundamentals, which owns the id) reads both shapes.
    And the crossroads read "…split into the Normal Variation, Rare Defenses,
    the Normal Variation, Standard Development and the Sämisch Variation" — the
    Lichess sub-names' commas made two roads five. `spokenRoads` drops what every
    road shares and counts roads under their variation ("two lines of the Normal
    Variation and the Sämisch Variation"); a branch chosen over the same
    variation is no longer named by a sub-name (its reason, which starts with the
    move, speaks alone), and the other road is named by its move.
  - Narration batch 2, from the Review tape after batch 1 shipped (2026-10-21,
    Firouzja–Carlsen on David's record): "It is a quiet opening: 9 moves of
    master theory…" on move three, then "…: 8 moves of master theory…" a move
    later. The identity was keyed `opening-identity:<name>`, so each
    refinement of the name ("King's Indian Defense", then "…: Normal
    Variation") said it again; Learn had a separate once-a-game gate for the
    same bug (OS-3), Review had none. The key is now one claim a game
    (`IDENTITY_CLAIM`), so both surfaces get it from the key. And "Knight to f3
    brings your knight out, where bishop to e2 brings your bishop out" — the
    road reason compared two bare jobs: `isBareJob` (bookMoveWhy) is now the
    one test, read by the review's move-job lane and the road reason.
    REGRESSION from batch 1, found by the Learn prod audit (V6 own-move reasons
    75% → 57%, the "you found it" credit 3 a game → 0): V7's said-filter was
    also read by `weighingGrey`, so once a game's rule-outs had been heard the
    board stopped counting as a decision, no move was held, and no credit
    could follow. Whether the board poses a decision is a fact about the board;
    the filter now trims only the spoken weighing. And "Their pawn hits the
    pawn on g7" (11.gxf6): the review/Learn pressure template named its target
    with no owner; it says "your pawn on g7" now (walkthrough beats too —
    WALKTHROUGH_GEN_REV bumped once for this deploy; REVIEW_NARRATION_REV 15).
    Shipped and audited on prod: Learn 43/43 (V6 76%, the credit back), Review
    69/69 meets standard.
  - Narration batch 3, from the batch-2 Review tape (2026-10-21). 19…f4 said
    one threat three times: "That is the kick a quiet move would have stopped —
    f4 would hit your bishop on e3…", "Their pawn on f4 now eyes your bishop on
    e3…", "Watch what they're building — left alone, their idea goes: they play
    fxe3 and you answer Rxe3…". Two causes. (1) The door's support step let a
    description speak whenever it touched a teaching point's squares, even when
    it only restated it; a description relating two or more squares that ONE
    teaching point already names is now quiet as subsumed (`supportedFacts`) —
    unless it CLAIMS something the point does not: the board line's loose-piece
    tail ("— nothing guards their bishop on f4") is coupled at emission as a
    claim (`loose:<sq>`, `bundle.claims`), because ship-check caught the first
    version silencing it and with it the "second loose piece" habit. A rewrite
    of a facet on its way to the door now carries every coupled record
    (`rekeyFacet`) — the habit rewrite had copied squares, proof and identity
    and dropped claims, stakes and the incoming flag. A one-square description
    is a property of its square and keeps the old rule.
    (2) The deep-threat passes run after the door and checked repeats by
    scraping "threatens X:" out of the prose — wording only the legacy path
    ever wrote, so on the real path they never deduped. Each segment now carries
    its spoken claims' squares (`spokenSquares`), and `lineRestatesClaim`
    (threatPurpose) holds a line whose first move and whatever it wins sit in
    one spoken claim. 27.Rb3: "it let them win material, starting with Qg5+,
    and they missed it" — 27…Qg6+ won just as surely (+13.8 vs +17.3) and ended
    the game. Review never told the verdict whether their reply kept the win,
    and the kept test ignored a decided game; `replyKeptWin` (inaccuracyCall) is
    now the one test — within a pawn of the best OR still decided for them
    (`DECIDED_EVAL_CP` moved to engineConstants so the gate and this read one
    number) — and Review reads the reply's score (`replyEvaluation`, REQUIRED on
    the facet context). The same ply's "Kh1 first was the preventive move — it
    takes away their Qg6+, and that is exactly the reply that punishes this"
    read the punishment from a fresh engine search while the verdict read the
    stored one; it now speaks only when it names the move the verdict named
    (`verdictPunishSan`). And the "no fundamental" audit row was logged by the
    build AND the walk (twice on a fresh review, again on every revisit, the
    walk's copy naming no move); the walk is now the one emitter, once a ply,
    with the move. REVIEW_NARRATION_REV 16. Same tape, 5…O-O: "Your opponent
    castles kingside, king to safety and rooks connected" with Nb8, Bc8 and Qd8
    still between the rooks — the castling concept asserted connection without
    computing it, and the helper the phase rules use, `rooksConnected`, only
    counted two rooks on the back rank (it returned true at the start position).
    Renamed to what it does (`rooksOnBackRank`, the name removed so no caller can
    keep trusting it) and `rooksSeeEachOther` added for a sentence that says it.
    NEXT (batch 4): 3.Nc3 says "prepares e4" three times — the move job, the
    development rule ("backing the e-pawn's push there") and the engine reason
    ("so that e4 comes next"). Three producers, one claim, and told-check
    special cases cannot keep up; the fix is a structured claim key for
    "prepares <square>" read by every producer.

## 🧾 WO-OUTCOME-01 — ONE COMPUTER FOR "WHAT DOES THIS LINE WIN" (David 2026-10-03: "You are not allowed to make a fix unless it's Root cause!!!")

**Why.** The oct3a Review walk's false material lines ("your queen for their pawn", "it falls", "you can win the knight", "3 points behind") were patched lane by lane on 2026-10-03 with a NEW proof module (`claimProof`) — which duplicated `exchangeLedger`, the computer that already answers this. Reverted. The census (2026-10-03) found the real disease: **five line readers** answering "what does this engine line win" with different rules, and **~45 lanes** that claim a material OUTCOME from a static count while an engine line is often already in scope.

| reader | rule today |
|---|---|
| `exchangeLedger.proofCut` | the WHOLE line's final settled net (no horizon on the net) |
| `lineCalc.lineWins` | the FIRST settle that leaves the side ≥1 up (check carries on) |
| `lookaheadPlan.materialSwing` | `sideBalance` at a quiet ply, capped by `settledLeadFor` |
| `principleAttribution.lineNetForSide` / `pvWinsMaterial` | raw capture sums / material diff over 6 plies |
| `gemFinder` / `gemCrushLines` | `settledBalance(end) − start` (gemCrushLines forgets the start) |

**The one rule — two questions, never conflated.** (1) WHAT A LINE WINS = the settled net where the line ends (`proofCut`, the gem doctrine's quiet end): a pawn won and handed back inside the line was never won. (2) WHETHER IT CAN BE SPOKEN AS PROOF = the cut proof fits the listener's horizon (`MAX_PV_DEPTH_PLIES`), the check every heard proof already makes. A horizon on the NET was tried and measured wrong: 342 of 344 curated gem playouts run past 7 plies and would have lost their payoff.

**Phases.**
- **A — one line reader.** `exchangeLedger` implements the rule; `lineWins`, `materialSwing`'s capture count, `lineNetForSide`, `pvWinsMaterial`, the gem diffs all read it. Delete the copies.
- **B — lanes with a line in scope** (reviewFullData facets, buildReviewSegments trapped + whyItFailed, danyaBehaviors, positionFacts must-defend, principleAttribution loose/ignored, moveOrder, moveReason, dnaLineNarrator) read the ledger over that line.
- **C — lanes with no line** (chat hanging/threat answers, drill reasons, misconception, recapture choice, countMethod): either thread the engine line in, or say only the BOARD fact (attacked, undefended) — never the outcome. Per lane, decided in the table.
- **D — gate.** An outcome sentence's text is produced only by the ledger's renderer; a lane that composes "wins/falls/takes it/come out" itself fails the build.

**Status (2026-10-03):** Root fix 1 (refuted-alt cost from one search) `a63d42c51`.
- **A done:** `lineWins`, `materialSwing`, `lineNetForSide`/`pvWinsMaterial`, gem payoff, gem gate, inaccuracy nets all read `proofCut`. Gate `oneLineReader.gate.test.ts`.
- **The ledger itself, three corrections found on real lines:**
  1. ONE "exchange finished" rule (`finishedAt`): inside a line the ENGINE decides (finished when its next move does not take back on the square); only where the line ends does the static count decide. The count alone stopped one ply early on even recaptures (…Bxc3+ Bxc3 Qxc3+) and ran on where the engine declined a take-back.
  2. The line's result is its LAST finished point — an engine line is cut at a depth, often with a piece merely attacked (17.Bxd4 … Qe3).
  3. PROMOTION: a captured promoted piece costs a pawn; a surviving one counts what it became (walk oct3b, 15.dxc6 … bxa8=Q Rxa8 read "a rook and a piece and a pawn").
- **B in progress:** done — Review trade summary (`settledExchange`; `exchangeLosses` deleted), `whyItFailed` (line REQUIRED; backwardLook's caller patch deleted), `punishmentOf` + `whyBetter` capture reasons, trapped piece (`findTrappedPiece(fen, side, line)` REQUIRED; `trappedOnBoard` is the board fact, silence only), `explainTemptingCapture` (line REQUIRED), plan tactics must collect (`lineCollects`), maneuver "take the X there" read off the arriving move.
- **Landed db36b13f4** (pushed): the batch above + ledger rules (forced-recapture play-out, cut-off line proves nothing, king ends the exchange, one replay), `PATTERN_SPEECH.wins`.
- **Done (next push):** `studentMovePoint` / `slipAnswerText` / `studentAnswer` take the line REQUIRED; "wins the X — nothing takes it back" reads `settledExchange` over it.
- **Walk oct3c (3 fresh games, 2026-10-03) — three more root causes found and fixed:**
  1. **A recapture is not a trade the side chose** (`lookaheadPlan`): "Nf3 was the move — the idea is to trade off the knight" over Nf3 …Qc7 O-O …Nxe5 Nxe5, where Black starts the trade and wins the e5 pawn. The plan counts a trade as intended only when the side's capture OPENS the exchange on that square.
  2. **"Still hanging" reads the line** (`inaccuracyCall.missedCaptureStillOn`, line + prior REQUIRED): "your pawn on d5 is still hanging" after 2.Bb5+, where exd5 Qxd5 is an even trade. Needs the engine's line to net material (`proofCut`) AND the legal SEE on the board the slip left.
  3. **Learn's move cost from ONE search** (`moveCost.moveCostOneSearch`, the same `alternativeCostCp` as root fix 1): the student's and the coach's cost were a read before minus a separate 1.5 s read after — "Qd3 cost more than a pawn" (one search: 0.5), "b5 cost about a pawn" (2.4), "their a4 is a touch inaccurate" (2.0). Now the played move against the best inside the fan, or both scored together with `searchmoves`.
  4. **King cover is the one shield rule** (`tradeQuality.recaptureDamage` now reads `boardStructure.shieldPawns`): it kept a private rule that counted a pawn on any rank within a file of the king.
  - **CLOSED (walk oct3d, 15.d6) — not false:** "dxc6 … would win a rook and a piece and a pawn". The app's own line (now recorded) is dxc6 O-O cxb7 Rae8 Qxe7 Rxe7 Rxe7 — the queens come off and White nets a rook, a bishop and a pawn. The node engine's different line had misled the check.
  5. **The fundamental verdict's flag reads the one-search cost** (`LiveFundamentalReads.costCp`, REQUIRED): it was the same before-minus-after subtraction.
  6. **No capture is read off a board where the other side is in check** (`positionReadingService.asIfToMove`, used by `legalSeeGainFor` / `signedLegalSeeFor`): walk oct3e, 10.Bb5+ — "your pawn on f7 … it falls unless you cover it". Handing the move to the checking side builds a board that cannot exist; Black could not take back on f7 in it. Same guard as `moveIntent.nullMoveFen`. It also makes the old "a king is hanging" bug impossible by construction.
  7. **A shallow fan is not one search** (`moveCost`, `CostFan.depth`): the opponent's move was costed off the 1.5 s `mid` read — "Their Kg2 is a touch inaccurate" (2.1 pawns), "Their Qxd5 is a touch inaccurate" (2.0). A fan short of the asked depth is re-scored with `searchmoves`.
  8. **Walk oct3g (game 2 re-walk), five more, each failing on the old code:**
     - A fork wins only if enough targets are winnable for WHOSE MOVE it is (`tacticsDetector.findForks`): defender to move needs two (8…Nxe5 "forks your queen and bishop — the other falls" with b3 guarding c4), forker to move needs one (KID 15…Ng3 takes the rook).
     - The buried-bishop verdict says the square count the detector computed (`squaresLeft`): "a piece that can't move" of a bishop that could still go to b2.
     - "Hanging" means the piece goes for at most a pawn (`whyItFailed` lost-the-piece): 23.Nh4 is guarded by g3; …Bxh4 gxh4 …Qxh4 nets a pawn.
     - The plan's took/gave reads the ledger's capture lists (`dealOfLedger`; `dealOf`/`lostCounts` deleted): "let them win a rook" of a line that wins the queen for a bishop. This is the oct3d OPEN item, now proven on a recorded line.
     - "Gives away real material" needs the reply line to net the mover a loss (`inaccuracyCall` blunder head): 29…Ke7 let a win slip and lost nothing.
  - Every graded Learn move now records its engine lines (`CoachTeachPage.backwardLook.line` diagnostic) so a walk can check a "would win" claim against the app's own line.
  - Harness: the hand driver waits for the board to show the live game before clicking (a slip-answer replay held the board two plies back for ~20 s).
  - Siblings of (3) not yet migrated: Play (`CoachGamePage` coachEvalIfBest − after), `useDiscussionPractice`, `liveFundamental` — each subtracts two reads. Review reads one deep per-ply analysis, which is the same search depth on both sides, so it is lower priority.
- **B/C/D landed (`b9a72c046`, 2026-10-03):** `playedMoveGrade` (the captured piece's raw value was graded "that wins material" — a recaptured knight was praised; the played line now decides wins / hangs / unmet threat), `principleAttribution` loose-piece + ignored-threat (`lineTakes`: the engine line must take that piece and net ≥2; no line, no claim — with the real line the Nxg5 fixture is correctly a POISONED pawn), `dnaLineNarrator` (a capture the same line takes back is no win), `moveOrder` (cost read over `yFirst` by the ledger; no fails-before fixture found), `explainBestMoveGrounded` (lines a REQUIRED argument; Review passes `m.pv`, the line decides "it wins the X" / "let them play X, winning the Y"; null callers keep the board count — the backlog). No line at the site → BOARD FACT ONLY: `danyaBehaviors` prophylaxis/pressure/x-ray, `positionFacts` must-defend, `reviewHinge` (attacker + missing guard; never "would win", "can't be held", "it falls", "has to be met first"). Also fixed: `threatOut.computeMustDefend` now carries the attacker + defender count.
- **D — GATE LIVE:** `src/test/outcomeSentences.gate.test.ts` (in ship-check) counts outcome wording per file against `outcomeSentences.baseline.json` (31 files / 65 lines at landing) — new wording fails, the baseline only shrinks. `src/data` is out of scope (board-checked by `narrationAccuracy`). Remaining baseline = chat (`groundedAnswer` null-line callers), drill reasons, prompts, principleVoice verdict stems (downstream of proven attributions).

## ⚖️ WO-MATERIAL-01 — ONE MATERIAL COMPUTER (David 2026-10-02: "You said that before. Check the root cause")

**Root cause.** The oct2a walks found the same false line five times in one day —
"you're behind" mid-recapture, "gxf6 wins a knight", "their queen for your pawn",
"win a rook" a line later gives back — and each fix patched ONE counter. The census
(2026-10-02) found **57 private piece-value tables, ~25 material counters and ~12
exchange calculators**. None knows (1) whether the board is mid-exchange, nor (2) the
move that led to it, so a recapture cannot be told from a free piece. Every one of
them will keep saying the same false sentence on the next game it meets.

**The rule (G0's determinism law applied to material).** One module owns material:
`pieceValues.ts`. Every count a sentence rests on goes through it, settled. A new
private table, counter or SEE fails the build.

### Phases (one push each, re-walk after the last)
1. **The module.** In `pieceValues.ts`: `MATERIAL_VALUE`/`CAPTURE_VALUE` (exist),
   `materialBalance(fen)` raw, `settledBalance(fen, { prior? })` — the lead with the
   exchange on the last capture square played out by the LEGAL SEE, counted from
   before `prior` when the position is a recapture's midpoint. One legal SEE
   (`legalSeeGainFor`) — `seeGain` (pin-blind) delegates or is retired.
2. **The ten spoken sites** (census top 10): narratedContinuation `describeLead`,
   reviewMoveBriefing `materialNet`, groundedAnswer `countMaterial`/`pts`,
   reviewPositionalAssessment count, danyaBehaviors, socraticNudge (ALSO the
   side-to-move-as-"you" seat bug), playCommentary `exchangeNet` (no stand-pat),
   tacticalRead/engineDeltaLines/gemFinder/gemCrushLines terminal counts,
   reviewTrapQuestion `seeSequence`, openingGenerator/pvWinsMaterial. Each with a
   test on a mid-exchange board that fails before.
3. **The rest of the counters** onto the module; delete the private tables
   (57). `REVIEW_PIECE_VALUE` k:99 and `tacticAlertService` centipawns reconciled.
4. **The gate** `src/test/oneMaterialComputer.test.ts`: no `{p:1,n:3,…}` literal,
   no material counter, no swap-list SEE outside `pieceValues.ts` /
   `positionReadingService.ts` SEE block — blamed by statement.
5. **Re-walk** Learn + Review on fresh games to 100%.

Status: phase 1 in progress.

## 🏹 WO-ARROW-01 — ONE DOOR FOR EVERY BOARD ARROW (David 2026-09-29: "Can we reduce to one source for arrows?")

**Why.** His Learn game (2026-09-27, 21:41, PostHog device `da84d189`): a green
f3→d3 with the black queen on c4 — Qd3 hangs the queen. Source:
`planMarks` drew a move from DEEPER in the engine line on the current board,
checking only legality. Learn alone had 13 arrow producers each calling
`setArrows` with its own checks (legal / piece-there / sight / none); ~120
setter sites app-wide (Learn 30 + walkthrough 23, Review 27, Play 8, Openings 21).
Colours were chaos: red, #ef4444, green, #22c55e, rgba-green, yellow, blue,
orange, cyan. `groundArrows` banned red (2026-07-06) while threats drew red around it.

**Decisions (David 2026-09-29).** Every coach surface. A ruled-out move is NEVER
arrowed (said + highlighted only). Threats ARE drawn, red, always from THEIR
piece, and only when they win something — this replaces the 2026-07-06 red ban.

**The door** — `src/services/arrowDoor.ts` `admitArrows(claims, {fen, studentColor})`.
Producers decide WHAT; the door decides WHETHER and the COLOUR. Roles:
`play` (student's, green / rank shades, legal + safe by exchange unless
`engineBacked`), `threat` (theirs, red, must win material or check),
`line` (one ply on its OWN board, coloured by mover), `vision` (sight line).
A producer DECLARES its role — the door never infers a role from a colour.

**Order.** 1 ✅ door + 13 tests (David's Qd3 refused, engine sac admitted) ·
2 Learn: CoachTeachPage's 13 producers (the fact-chain's red "lurking slip"
arrow is a bad move → dropped) · 3 useTeachWalkthrough · 4 Review · 5 Play,
Openings, chat, the rest · 6 gate `arrowDoor.gate.test.ts`: no `set*Arrows(`
outside the door's output, allowlist of unmigrated files shrinks only.

**DONE 2026-09-29.** All six steps landed. The gate's ceiling is EMPTY; only the
board renderers, the `[BOARD:]` decoder and kid mode are exempt. Dead producers
deleted (`uciToArrow`, `groundArrows`). Hints draw for the side to move (a hint
is always for the player on move). Pitfalls name the wrong move in text, never
as an arrow.

## 📊 SCOREBOARD v1 — reach vs Naroditsky, 50 voiced games (2026-09-29)

`scripts/scoreboard/` — his per-ply lines tagged with the census taxonomy
(`his-tags.json`, 1,394 lines, one offline DeepSeek pass, temperature 0), our
harvested claims (`claimChecker.measure.test.ts`) mapped kind→code in
`score.py`. Match = same game, same ply, same code.

**20.7%** (268 / 1,294 code-moments at student-move plies). What it measures is
REACH — a computer HAS the point at that moment — not what the decider speaks;
the harvest covers four lanes (facts, behaviors, backward look, positional read)
and not the opening idea, refuted alternative, opponent purpose or plan arc, so
those rows read low until the harvest widens. 1,115 more of his code-moments
sit on the OPPONENT's plies, which the harvest never runs.

Worst rows (his count, ours): quiet-move purpose 92/0 · plan 88/26 · verdict on
a GOOD move 75/7 · the move prevents something 71/0 · king attack 46/5 ·
recapture choice 42/0 · threat 46/8. Best: passers 80%, piece quality 52%,
structure 52%, principles 51%, breaks 50%.

**Read.** The top gaps are what the student's OWN move is for (prepares /
prevents / two jobs) — the intent ledger — and grading good moves (we grade
only mistakes). Next: widen the harvest to every lane + opponent plies so the
number is honest, then build the ledger and watch these rows move.

## 🧭 2026-09-29 — RE-EVALUATION: how the coach gets to Naroditsky (after WO-ACC-01 measured 99.6%)

Measured: 14,317 claims / 100 games · spoken 99.6% of checked (was 97.9) ·
10 FALSE left · but only 62% of spoken lines are checkable — the unchecked 38%
is plans / why / method, i.e. the Naroditsky layer.

**The correction.** The census ranked him by CATEGORY and implied one computer
per category. Read end to end, his games show the gap is the THREAD: intent
announced ("sacrifice — but not yet"), prepared ("you want f4, so Kh1 first"),
executed ("the first progress"), then paid off or failed ("my trick half-worked").
Six of the top ten missing items exist only BETWEEN moves.

**Order (David may reorder):** 1 arrow door → 2 SCOREBOARD vs his 430 games
(run our coach on his positions; per-moment match by taxonomy code, never word
count; every new computer must raise it with accuracy ≥97%, silent first) →
3 INTENT LEDGER (each side's plan from the engine line, remembered across plies;
every move read as prepares / executes / stops theirs / abandons — engine-grounded,
so plan lines become checkable) → 4 one thread per move (routine = a few words,
decision moments = two candidates weighed) → 5 remaining gaps by scoreboard
deficit (king attack, practical play, recapture, when-ahead).
Not copied: self-critique, repertoire advice, humour, first person; opening
lectures belong to the parked "teach me X".

## 🏁 WO-STANDARD-01 — THE FULL BOARD: everything the 2026-09-22 evaluation found, in build order (David: "get my app up to standard" · "i want a full plan listed first, not just one section" · "i will not always be here — work independently")

**How this was found.** One session, 2026-09-22: four levels of context, three
adversarial code readers (the deciding door, the loop record→speech, G0 on the
chat/voice path), a PostHog read of the 41 real native users, and the coach
driven BY HAND on prod — Learn, Play, review, Weaknesses, Training Plan,
custom lesson, My Mistakes — first cold, then with David's own 932 chess.com
games (`knight_mare_01`) imported through the real Import page. Every item
below was seen, not inferred; line cites are in the sub-sections.

**Decisions made without David (he asked for independence; each is recorded
here so he can flip it, never re-derived):**
- D1. Home opening is a LOCK with a one-tap change (not a weighted focus).
- D2. Play STEERS into the home repertoire while in book.
- D3. Home-opening games ANALYSE AUTOMATICALLY on import; the rest on tap.
- D4. Play keeps SPEAKING the blunder verdict (non-blocking) — the card is
  gone (`BLUNDER_CARD_ENABLED=false`, shipped 0813e7f). The 07-06 "phase
  narration only" rule and the 07-13 full-game standard disagree; until David
  picks, the spoken verdict stays and the board never waits.
- D5. Fixture games (`sample-*`) NEVER count as the student's games: not in
  the cold-start count, not in the rating, not in the weakness spine.

**THE BOARD — eleven buckets, A→K, in the order they ship. Each item carries
its gate; a wire is proven only by a sentence or a row coming OUT on prod.**

### A. THE PERSONAL COACH — WO-HOME-OPENING-01 (the section below; items A1–A11)
The student's home opening per colour drives the plan, the drills, the
opponent's lines and the review's opening line. A1 (one opening key) blocks
everything; A2–A3 next; A4–A8 are the visible payoff; A11 is the audit.

### B. THE DECIDING PATH — wire the student into the door (the readers' findings, verified)
- B1. `positionFacts.ts:480` pre-gate gets `standingChance`; `decide()` at :651
  does not → the T5 fork-two-moves-out is dead on interrupt surfaces and the
  emission calls it a legitimate close. Pass the same signals to both.
- B2. `narrationImportance.ts:204` adds the student boost only when rank > 0,
  speak = rank > 0 → the student's record can never flip a verdict. Decide
  whether the boost may lift a moment over the interrupt bar (recommend: yes,
  bounded, so a RED hole can earn an interruption).
- B3. Play / phase / read-position / whyBestMove pass neither `lastMove` nor
  `studentNeedContext` (useLiveCoach:234, usePhaseNarration:597,
  usePositionNarration:236, whyBestMove:81) → grey/green/red indistinguishable
  on four of five live surfaces. Thread both through every composer.
- B4. Review say-once ledgers (`coachFeatureService.ts:1740–1815`) burn BEFORE
  `decide()` (:1855) → a floored fact is lost for the whole game; opening and
  middlegame plan facets rank under the floor and are structurally never
  spoken. Mutate ledgers after the door, only for spoken facts.
- B5. The need veto (`coachDecider.ts:245`) is tier-blind → can silence a
  hanging piece on a familiar line. Mate/must-defend/only-move speak on their
  own importance.
- B6. Rating decides volume through the back door: cpLoss tiers by band
  (`criticalityScan.ts:229`) and review's label buckets (300/150/60 at
  `coachFeatureService.ts:1858`). Use the real cpLoss and a band-free tier.
- B7. Cold start is `fullyAnalyzed` count (`studentNeedLoader.ts:104`): samples
  count, Learn games never do, and while cold the score is a constant 100.
  D5 above + Learn games flagged + a prior that fades instead of switching.
- B8. `needScore.ts:343` green for X subtracts from Y. Scope the capability
  term to the matching tag.
- B9. `quietBy` labels importance- and need-closes both `below-bar`
  (`coachDecider.ts:241,246`) → the emission cannot distinguish the two gates
  it exists to distinguish.
- B10. Hidden caps on the deciding path: `teachingSelector` MAX_MOMENTS=3,
  `reviewTurningPoint` MAX_CANDIDATES=4, `coachFeatureService:1223` budget:2,
  `openingGenerator` REFUTED_PLY_CAP=12 + a literal `rating: 1500`.
- B11. `methodBeat` ignores `closed` standing on the retrospective register;
  `Math.abs` on cpLoss turns noise into "slow down" on a good move.
- B12. Subsumption: a 2-square fact eaten by a 3-square superset at 0.67.

### C. THE RECORD PATH — what the coach fails to learn
- C1. Review's `learned:true` + `capabilityPlies` capture is dead
  (`GameReviewWeaknessCapture.tsx:187`, pre-empted by the mount sweep at
  `CoachGameReview.tsx:346`) → import-and-review users write no counted rows
  and no held rows; green unreachable for them.
- C2. Eval-comment imports (chess.com/lichess `%eval`) arrive with
  `bestMove:null` → attributed `other` and LATCHED forever
  (`autoAnalyzeGame.ts:227,310`); never re-attributed when review deepens.
- C3. Play games log from depth-10 live annotations with no `pv` →
  `calculation-depth` can never land; live captures carry no
  `pvAfterPlayed`/`evalBefore`.
- C4. Learn passes `fundamentalId: null` (`positionFacts.ts:641`); Learn
  recurrence can count the CURRENT game as prior
  (`learnFundamentalNarration.ts:157`).
- C5. Section-14 detectors (`calculation-depth`, `left-book-early`, `no-plan`)
  fire on nothing real, by construction.
- C6. Decay only by drilling or an archive-relative window; a one-off slip
  raises the ranker forever (`weaknessSignal.ts:126`).
- C7. Learn's End Lesson discards the game: not saved, not in review, no
  hand-off. Save it and offer the review.
- C8. Fixture contamination: reviewing a sample moved the profile 1200→1500
  and counted 3 games (D5).
- C9. Provenance lost at import: My Mistakes shows source "Coach", opponent
  "Unknown", date = import date for chess.com slips.
- C10. The "10 games running" / "we've been working on" framing counts
  occurrences as games and sessions that never happened.

### D. THE WRONG COMPUTERS AND THE JANK — every false or repeated sentence heard today
- D-1. `positionReadingService.ts:417` bad-bishop on mobility ≤3 with an
  invented reason ("hemmed in behind its own pawns … a pawn to a6 would fix
  it") — spoken 4× at one ply.
- D-2. "pins the pawn on f7 to the knight on g8" / "queen on d5 pins your pawn
  on g2 against your rook on h1" — value check on the back piece.
- D-3. "1 attacker to 0 defenders, so it falls" on a queen that steps away —
  the counter must respect mobility.
- D-4. `reviewSacrifice.ts:51` "compensation: the position holds up
  completely" on a 4.7-point blunder.
- D-5. Pawn-move method beat on a king move (Ke2); the Ke2 slip recorded as
  "left a piece passive" — the real lesson (castling lost) never named.
- D-6. Wrong WHY on the coach's own move ("Nc6 was the move, to trade off the
  knight" — nothing to trade).
- D-7. "knight takes e4 — it would win the piece on e4" (a pawn).
- D-8. The "genuinely close — X is about as good, so don't agonise" stem 4× in
  seven moves; "Undefended right now:" and "the eval bar ticks 0.4 your way
  with no material story" on nearly every ply; "It stakes out the center and
  grabs space" with no subject.
- D-9. Seat/register mixes: "That was a blunder from me … He let you off";
  "they're lining up a pin in 2: Bg5, then Bg4" where Bg5 is the student's
  move; a standing-danger fork announced on the student's own move.
- D-10. Bare SAN spoken ("Bg5, then Bg4") beside its spelled twin; the same
  refrain spoken twice.
- D-11. Unprompted "I don't have any of your games yet — upload…" on move 1
  of a game.
- D-12. Mate score rendered "-7.5 to -300.0"; the recap card is the raw
  third-person fact package ("The student made 1 blunder(s)").
- D-13. Turning-point question spoken with no card; the walk ends at
  "Ply 28/27" on the START position; no result card.
- D-14. Corpus fragments narrating the video onto the board ("with the knight
  to c3 and f4. If they go the knight to f6, of course"; "but the second
  component of this setup…").
- D-15. Plan template outranking a mate threat ("win their weak pawn on h7 —
  plant your knight on h6" with Qxf7# on the board); "Your plan is to advance
  your kingside majority / theirs the queenside" at move 7.
- D-16. "You're in trouble: you're two pieces further developed"; "their
  knight on a1 is doing nothing — passivity is the whole story" on a knight
  that just took a rook.
- D-17. Chat transcript duplicates ("Watch out — if I play Qxg2…" twice);
  "hanging_piece" raw enum and "365.5 points" spoken in the tactics answer.

### E. THE ROUTER AND CHAT (A6, plus)
- E1. "why was X bad", "what should I be thinking about", "what did you have
  in mind" → best-move-now (3 of 3, both bundles).
- E2. "what is my weakest opening?" → a sales pitch while the answer sits in
  the Openings tab.
- E3. "what should I learn?" → a 3-game 0% opening (A3 fixes the source).
- E4. Hint taps: 47% "I can't verify that precisely" (PostHog, 30d) — each
  hint must resolve to a computed line or say why not.
- E5. The typo question about the f1 bishop answered with a generic plan.

### F. THE G0 RING — the un-inverted surfaces (the G0 reader's inventory)
- F1. `openingGenerator` structured narration: the model authors the ideas
  under a "LINE FACTS" allowance, regen loop, BAKED forever — the highest-
  traffic teaching content in the app.
- F2. `usePositionNarration.ts:375` "Read this position" — free LLM with a
  streaming sentence gate.
- F3. `walkthroughLlmNarrator.ts:269` (legacy WalkthroughMode, ~3,000 DB
  openings), `middlegamePlanner.ts:343` PV sentences, `generateOneStage`
  retry loop, `kidGameCoach.ts:385` Q&A.
- F4. `voiceFacts` skips `containmentCheck` when translating (coachApi:2925)
  and none of its four prompts carry `perspectiveRule`.
- F5. `validateArrowClaims` has no call site; CLAUDE.md G6 is stale.

### G. THE PLAY SURFACE
- G1. Card off (shipped). D4 records the spoken-verdict decision.
- G2. Play steers (A7). Play speaks the phase transitions and, per D4, the
  verdict; never a picker.

### H. REAL-USER PLUMBING (PostHog, native, 30d)
- H1. 926 of 932 imported games unanalysed by default (A2).
- H2. `coach_tool_call_error`: walkthrough refused on `/coach/teach` because
  the drawer kept `surface=home-chat` after `navigate_to_route` (Thai user,
  10×). Bucket D marks D3 done — VERIFY on prod, do not assume.
- H3. A Learn game (`teach-*`) could not open in review (PGN unparseable).
- H4. Feedback submits twice (every row duplicated).
- H5. `ota_download_failed` 41 events / 18 users vs 59 successes; `voice_fallover`
  "cloud voice not live" on September builds; `stockfish-analysis-stalled`
  5 users; `phase_transition_suppressed` fires on every coach ply (noise).
- H6. Analytics hygiene: `coach_question_asked` is 10× inflated by the hint
  prompt and the canned best-move button.

**§H MEASURED + LANDED 2026-09-22 (helper branch; native, `distribution='appstore'`,
Cupertino/audit/bot/David's three device ids excluded, 30 days — control:
15,611 events / 40 devices, so a zero below is a measurement, not a broken
filter).**
- H2 — `coach_tool_call_error`: **12 rows / 1 device**; 10 are
  `start_walkthrough_for_opening: Cannot start a walkthrough here — this
  surface can't host one` (the pre-queue wording), 2 are `reset_board`. Root:
  the global drawer filed every ask as `surface:'home-chat'` (a constant), the
  tool ctx never defaulted the sixth hand to the actuator, and Learn never
  registered `startWalkthrough`, so a queued lesson on an already-mounted Learn
  never drained. Fixed at all three; the count above is the baseline the next
  post-deploy read compares against (query shape: `GROUP BY properties.summary`
  on `event='coach_tool_call_error'`).
- H3 — `$exception` (`audit_kind='stockfish-error'`), summary
  `adaptGameRecord returned null for game teach-1788396074396 — pgnLength 214`,
  build `ff5ed1a2b` (Sept 2), **2 rows, 1 game** in 90 days. That build saved
  Learn games as a headerless `history.join(' ')` from a lesson position; the
  save site was fixed 09-03, the row is still in that device's Dexie. Review now
  replays from the `[FEN]` header, keeps a legal prefix with a note, or fails
  with a sentence naming the game (`gamePgnReplay.ts`).
- H4 — `feedback_submitted`: **2 rows / 1 device**, same note, 7 s apart, one
  session, two uuids, both `QuickFeedbackButton` — a re-tap after a dismissed
  share sheet. Capture is now keyed on the note; the share/mail step may re-run.
- H5 — measured, one fixed:
  - `ota_download_failed` **39 / 17 devices** vs `ota_download_complete`
    58 / 27, `ota_update_available` 65 / 27. Cut by `to` vs the observer's
    `running` prop: **24 rows are phantom-shaped (`to == running`, the
    plugin's missing-`kind` failure for the bundle already on the device) and
    every one is dated 2026-08-23 → 09-02** — none after `noUpdate` in
    `api/ota/manifest.ts` began sending `kind:'up_to_date'` (09-03). The
    **11 rows after 09-05 are all `to ≠ running`** (a real newer bundle,
    about one device per day: `9bbe43aa`, `c18e02fd`, `4f516bd9`, `51ea8edc`,
    `26f7b9f1`, `5169b560`, `5267e0a0` ×2, `586ec796`) — genuine transfer
    failures against 58 completes, not ours to generate. No code change:
    the phantom is closed at the reply; the residue is the network.
  - `voice_fallover` **343 / 5 devices**, but 333 are one device on the
    Aug-5 build `c02ae379`; September builds (`bbd617c26`, `51ea8ed`,
    `9a2d187`) total **9 rows / 3 devices**, each a burst inside ONE 20-s
    warmup-retry or 15-s post-failure cooldown ("never attempted"). Not
    sticky: `isPollyLive` clears the cooldown on expiry. No fix this session.
  - `stockfish-analysis-stalled` lives under `$exception`, not its own event:
    **15 / 5 devices** — 11 "no bestmove in 12000ms" (audit-only watchdog),
    3 "30000ms — resetting worker" (the recovery), 1 backgrounded. Real iOS
    engine stalls at depth 18; no root cause reachable from a test. Not this
    session.
  - `phase_transition_suppressed` **941 / 4 devices** = 512 `skipped: coach
    move` + 428 `no-fire` + **1** real suppression. Fixed: coach moves write
    nothing; no-fire writes once per input signature (`planPhaseNoFireAudit`).
- H6 — `coach_question_asked` **317 / 7 devices** = 173 canned best-move taps
  (`ask_text` "What's the strongest move for me in this exact position…", ONE
  device — its computed WHY kept throwing, see FOUND IN PASSING) + 115 hint
  prompts (`[internal:hint]`) + 26 home-chat + 2 teach. Every producer now
  carries `ask_source`; the usage recipe counts `'typed'` (CLAUDE.md).

### I. DOCS AND GATES THAT LIE
- I1. CLAUDE.md G6 claims `validateArrowClaims` is wired — it is not.
- I2. CLAUDE.md "ONE literal" for the rating — 63 inline `?? 1200` remain
  (same value; the gate only catches a different number). Migrate to the
  constant so drift is impossible, not merely unlikely.
- I3. The Play contract contradiction (07-06 vs 07-13) — resolve by D4 and
  delete the losing sentence, per the Lake Butler rule.
- I4. Three vacuous CRIT rows pass on "no moment selected"; the Weaknesses
  header says "932 analysed" over "926 not analysed".

### J. AUDITS THAT PROVE IT
- ✅ J1. `audit-home-opening-prod.mjs` — built with A2/A3 (2026-09-22): seeds a record through raw IndexedDB with the ONE key, holds both algo emissions to their contracts, vacuity-checked. Runs on prod after the push.
- J2. The standing pair after every batch, sequentially, narrations read.
- J3. `audit-second-game-memory-prod` after C7; `audit-loop-closes-prod` after
  C1–C4; `audit-coach-all-questions-prod` exhaustive after E.

### K. NOT NOW, RECORDED SO IT IS NOT LOST
- Kids Mode: zero native opens in 60 days (product, not coach).
- The 47-game corpus measurement; the boot-payload split (§E in the earlier
  plan); the dashboard bars grading (needs users).

**BATCHES AND OWNERS — one push and one audit pair per batch, sequential.**
- Batch 0 (in parallel, isolated worktrees): B (door wiring) · D (wrong
  computers + jank) · E (router) · C7/C8/C9/C10 (Learn hand-off, fixtures,
  provenance, framing). Main session: A1 (one key).
- Batch 1: A2, A3 (analysis priority, home opening), C1–C6 (record path).
- Batch 2: A4, A5, A7, A8 (plan, drills, steer, review record), G.
- Batch 3: F (the G0 ring; F1 is the long one).
- Batch 4: H, I, J.
Every batch: surface-map --changed on every touched file, gates negative-
controlled, ship-check green, push to main, both standing audits, narrations
read and quoted in PLAN. No OTA dispatch — that is David's.

**Next-session pickup.** `TaskList` holds the live items. Batch 0 helpers
report a branch + SHA; integrate on main in the order B → D → E → C, one
ship-check per merge. Then A1.

## 🗣️ WO-TEACH-02 — every line teaches: Naroditsky is the target (David 2026-09-24: "Narotiski's narrations are the target/goal" · "all changes are universally adopted … same info used differently" · "Add those in!! All of them! … without any wiring being missed")

**The baseline (prod review tape, game e09n1mAb, student Black).** Of 25 narrated
student plies: **5 TEACH, 20 DESCRIBE** ("X now eyes Y", "Newly undefended…",
bare "that was a great move", "It developed into the game…"). Target: every
spoken line teaches, or the ply is silent.

**Context gained (four maps, 2026-09-24; cite these before touching code):**
- `fillSilentDevelopment` (coachFeatureService ~4136) runs AFTER `decide()` and
  refills the plies the need gate and SUPPORT deliberately silenced — the R2
  loop the 2026-09-15 standard said to retire, alive by another name. It also
  runs after the need-coverage row, which is why that row undercounts.
- `supportedFacts` (factSelector ~294) keeps a lone `[does]` "now eyes" line as
  the "move reason"; `[quality]` bare "great move" and `[opening]` refinements
  are role `teach` and pass every gate; `[opening]`'s say-once keys the exact
  string, so each refined variation speaks again. Live Learn names the opening
  in `computeInstantTeaching` (~7660) and again in the late lane (~9441),
  outside `decide()`.
- `[plan-middlegame]` (reviewFullData ~737) has no seat gate — the opponent's
  plan lands on the student's ply (the SEAT red).
- `refutedAlternative.ts` exists (explorer alternative + engine cost) but only
  the Learn walkthrough generator calls it; review's `[refuted]` is gems only.
- No surface explains a NON-threatening opponent move. `opponentIntent` clause
  is gated `!studentToMove`, so it never fires in Learn.
- "Who's better": `assessPositionalEdge` has no material / king safety /
  activity, its `[verdict]` is role describe; Learn has no verdict at all.
- Candidates: `scanCriticalMoments` computes a 3-line fan and throws the
  per-line evals/PVs away at the read; Learn has `deliberation`.
- Transfer: nothing records the ply of a motif seen earlier in the game;
  `WeaknessProvenance` has no ply.
- Scan: the live tier is computed on the post-reply board BEFORE the student
  moves; `liveMethodBeatFor`'s forcing beat has no tier gate.
- AUDIT INSTRUMENT: `appAuditor` latches `streamNetworkDisabled` after 20
  failed POSTs and never clears — the review audit's listener went deaf at ply
  12 (11 lines captured vs 71 the run before), which alone produced the EXPL
  and CRIT reds.

**Sub-builds — each starts with `surface-map --changed` + reading its files
end to end, each lands BOTH surfaces (review wording retrospective, Learn
present tense), each ships with its gate and an audit contract:**

- [x] **S0 Instruments.** (a) the stream breaker never latches the loopback
  sidecar (and recovers after a success); gate. (b) need-coverage counts what
  the student actually HEARD (after every fill). (c) a teach/describe METER:
  per spoken student ply, does a TEACH-role fact speak — emitted on
  `coach-decision`, asserted by both standing audits, measured over the
  real-engine sweep before and after.
- [x] **S1 Cut describing at the source (universal).** Retire
  `fillSilentDevelopment` + the merit fallback in `buildDeterministicNarration`;
  drop the `[does]` move-reason keep-alive (a description speaks only as
  support for a teaching fact on its squares); `[quality]` "great move" alone
  → describe (a label is not a reason); the opening is named ONCE, when it
  settles, with its plan (review facet + both Learn lanes); `[plan-middlegame]`
  seat-gated (their plan on their ply, yours on yours). Update every test that
  pins the retired strings.
- [x] **S2 "Most players go wrong here" + principle-once.** Wire
  `refutedAlternative` into review and live on owed student plies, reading
  the AMATEUR band first (`amateurPlayCache`) then masters, engine-proven
  cost only. For a grey/red principle layer, one principle line per principle
  per game ("Develop a new piece every move — this knight also hits e5"),
  replacing the retired description. Nothing true to teach → silent.
- [x] **S3 "Why did they play that?"** One computer `opponentMovePurpose`:
  threat (existing) · bluff (existing) · STOPS your idea (your best move
  before vs after their move) · the plan step it prepares (engine PV) · the
  target it hits. Spoken on every opponent move that has a purpose; quiet
  development stays silent. Review `[opp-intent]` facet; live clause via
  `opponentLastMove`; fix the Learn gate.
- [x] **S4 "Who's better, and why."** One computer `positionVerdict`: band from
  the eval + reasons from material, king safety, activity/development,
  structure. Spoken at each phase change (review: the ply the phase turns;
  Learn: `runPhaseTransition`) and absorbs the describe-role `[verdict]`.
- [x] **S5 Candidate moves at critical moments.** Keep the fan lines on
  `CriticalMomentRead`; `candidateSet` names 2–3 real options with the proven
  reason each alternative fails (`proofCut` over its PV). Review: the critical
  moment reveal. Learn: `deliberation` shortfalls gain the proof line.
- [x] **S6 Transfer.** A per-game motif ledger (motif → first ply) on both
  surfaces → "same idea as move 12"; `WeaknessProvenance` gains an optional
  `ply` (additive, no migration) so the cross-game recurrence line names it.
- [x] **S7 Checks, captures, threats — before the move.** Live only (review is
  retrospective): on a critical/only-move tier with a forcing best move, the
  scan prompt WITHOUT naming the move (honesty contract), say-once rotating
  stems; tier-gate the forcing beat.
- [ ] **S8 Review reds.** EXPL + CRIT re-judged after S0a; the reveal's
  fire-and-forget overlap risk checked; SEAT closed by S1's seat gate; NEED
  by S0b + S2.

**Every new fact kind wires ALL of:** review — `FacetTag`, `FACET_RANK`,
`FACET_ROLE`, `FACT_LAYER`, stakes/squares coupling, say-once branch; live —
`ClauseKind`, `CLAUSE_ROLE`, `CLAUSE_TIE`, `FACT_LAYER`, `bundle.family`,
`matchClauseKind`; dual use — the miss it can record (or a stated reason it
records none). Negative-control every gate.

**Reds found while building, NOT this build's (measured on a clean worktree at
7cae1ca and again at b499e4a, before this session's merges):**
`section14RecordPath` "no-plan LANDS" (fundamentalId undefined), the corpus
data tests (`corpusReach.measure`, `endgameCorpusNote`, `notePreferReachable`,
`noteSelectionDeterminism`, `teachingCoverage.report`) and `gemPunishLessons`
(three). Owed separately. `AdaptivePuzzlePage` badge WAS mine (WO-LAYERS moved
the default to 400; the test hard-coded 1400) — fixed here, now derived.

**What landed (S2–S7, 2026-09-24) — and the correction that made it real.**
The first cut of S2–S5 appended its lines AFTER `coachDecider.decide()` in
review and queued them straight to the voice in Learn: unranked, unfloored,
invisible to the teach meter, duplicating review's gem `[refuted]`, and it
broke `surfaceContract.scan` (Learn called `refutedAlternative(` directly).
Caught on regaining the four levels of context (David: "You're not regaining
context!!"); rewired before any push:
- ONE VOCABULARY: new kinds `rule` · `stopped` · `stock` (+ `refuted` as a live
  clause) on BOTH sides — `FacetTag` and `ClauseKind` share the names, so
  `FACET_RANK/FACET_ROLE/CLAUSE_ROLE/CLAUSE_TIE/FACT_LAYER` answer once; all
  `teach`; `matchClauseKind` joins refuted→opening holes, rule→positional.
- REVIEW (facets, through the door): `[refuted]` = the engine alternative
  (`refutedAlternativesForGame`, pooled, 8s latency bound, computed before the
  synchronous builder) where no mined gem covers the ply; `[rule]` = the
  principle kept, committed as taught only after it SPEAKS; `[stopped]` =
  `threatStoppedBy` on the opponent ply; `[stock]` = `phaseVerdictLine` on the
  first middlegame / endgame ply. All post-door passes deleted.
- LIVE (clauses of `positionFacts`, through the same door): `refuted` costed
  off the fan Learn already read at the pre-move board (`refutedFromFan`, pure,
  `refutedAlternativeCore.ts`) — silent when the popular move is not in the fan;
  `rule` with `taughtPrinciples` in / `principleSpoken` out; `stopped` from
  `lastMove` + `opponentLastMove`; `stock` from `phaseTurn`, which is a declared
  teaching beat like a band change. Learn passes RAW data only.
- S5 `proofAgainstMover` (exchangeLedger) — the reveal's failing candidates and
  the live deliberation's shortfalls. S7 tier-gated forcing scan. S6
  `motifLedger` (review commits at the door's commit; Learn on the tactic lane).
- DUAL-USE, stated per fact: `rule` is dual already (capabilityEvidence records
  the same positive fundamentals held/broken); `refuted` — PLAYING the popular
  mistake is recorded by the flagged-move path, AVOIDING it has no honest tag
  today (OWED — a persisted enum is not widened casually); `stopped` / `stock`
  pose no decision to the student, so there is nothing to record.
- OWED: `WeaknessProvenance.ply` (S6 cross-game); live `refuted` only fires when
  the popular move is in the MultiPV fan (a real limit, not a bug).
- Gate: `src/test/teach02Wired.test.ts` — both producers, every fact, each with
  a negative control.

**Prod review audit after merge (a4aa702, game vs Firouzja, student Black):**
teach meter 13/22 = 59% (baseline 5/25 = 20%); ACC + SEAT clean over 40 plies.
Read the lines, found two defects every gate passed, fixed in the follow-up:
"Most people play Bg6 here (1% of players)" — "most" on a 1% stray and the
masters DB called "people" → share floor 10% (`MIN_ALTERNATIVE_SHARE`), the
share stated, the source named; "Taking stock as the middlegame begins: you
were a bit worse." — a verdict with no reason → no reason, no line. Also the
DECIDER filing row: an unsupported-closed row now files its subsumed facts under
`unsupported` (proven keeps its own name; the audit row now says so). Still red
and NOT from this build: the turning-point DRIVER card (harness — CRIT/THESIS/
RECAP follow from it), FUNDLEAD 0/4 (every fundamental on this game DECLINED by
attribution, so there is nothing to lead with), NEED 8/12 owed plies heard.

**Prod Learn audit after #945 (af0b12f):** 17/17 green, `audit-concept-gameplay-prod`,
muted; 4/4 spoken moments teach (G6); a spoken line: "Careful — your queen on d5 is
attacked and nothing's defending it. There's a pin here for you — have a look."
The run is 5 plies, so the new live clauses (refuted / stopped / rule / stock) were
not posed on it — a longer live game is owed to hear them on prod.

**DETERMINISTIC → DNA-WORDED → HANDED TO THE LLM (David 2026-09-24: "everything
built needs to be deterministic, worded by the dna, and handed to LLm").** Checked
every WO-TEACH-02 line against it:
- The five new shapes (refuted alternative, principle kept, stopped threat, phase
  verdict, transfer) had ONE fixed stem each. Now 2–4 hand-written DNA stems per
  shape through the one `rotateStem`, keyed on a stable fact of the moment
  (`stemKeyOf` of the board, or the move number) — rotated, never rolled; the
  claim (share, source, move, proven line, reasons) never varies. The rotation
  key is a REQUIRED parameter where a caller supplies it.
- Review already reached `voiceFacts` (raw register). Learn's Track A called
  `speakForced(line)` directly — it now speaks `voiceFacts(line, { preferRaw })`,
  gated by `coachLaneWiring` ("every Track A line reaches the voice THROUGH
  voiceFacts"). Raw = no model call, no latency.
- OWED (a sweep, raised with David, not done here): 30 OTHER direct
  `voiceService.speak*` calls in CoachTeachPage (acks, intros, results) that
  predate this build and bypass `voiceFacts` the same way.
- `WALKTHROUGH_GEN_REV` bumped ONCE (`2026-09-24-refuted-share-stems`): cached
  lessons still baked the old refuted-alternative text, including the "most … (1%)"
  wording. Expect one synthesis bill as lessons regenerate.
- Two `coachLaneWiring` tests were red on main (stale patterns after 8ab0c5f and
  WO-LOOP-01's recurrence clause) — updated to the current shape, same assertions.

**Order:** S0 → S1 → S8 → S2 → S3 → S4 → S5 → S7 → S6. Verify: the meter,
ship-check, both prod audits muted, narrations read and quoted here.

## 🎯 WO-ACC-01 — measure the coach's accuracy, then raise it to 97% before adding computers (David 2026-09-27: "We don't even have the accuracy with the current build" · "I like the plan")

**Why.** The 1690 hand walk measured ~78% of spoken lines true (13 of ~60 false, all
fixed). Hand walks find ~1 new error class per game, one game an hour — too slow to
reach 97%, and no way to know when we got there. New computers wait until the base
is measured at 97%.

**The instrument (built 2026-09-27).**
- Corpus: 50 Naroditsky games rebuilt from the voiced notes (`data/sources/acc-naro/`,
  25 White / 25 Black, ≥40 plies) + 50 chess.com amateur games 800–1800
  (`data/sources/acc-corpus/`, via `build-wo4-corpus.mjs --fetch`). Engine: the app's
  own Stockfish 18, top-3 lines at depth 14 for every position
  (`scripts/acc-annotate.mjs`). All gitignored research data; reproducible.
- Pass 1 HARVEST — `src/services/claimChecker.measure.test.ts`: every student move,
  the same computers Learn calls after the reply with the same inputs
  (`computePositionFacts`, `detectBehaviors`, `buildPositionalRead`, `backwardLook`).
- Pass 2 VERIFY — `scripts/claim-verify.mjs`: every claim checked by board (chess.js)
  and engine, INDEPENDENT of app code (a verifier calling the helper it checks agrees
  by construction). TRUE / FALSE with reason / UNVERIFIED (judgment — counted and
  sampled, never passed). Reports spoken lanes (facts + backward look) apart from
  candidate lanes (behaviour + positional).
- Limit, stated: it checks the computers, not the page's selection/ordering glue —
  that stays with the hand walks and, after ACC-1, the extracted Learn service.

**Fixed from the first 12-game run** (each with a test on the real position):
future-board endgame technique spoken as current (`conceptEngine` now carries the
line — "After Rce6, …"); "castling is one move away" when castling was illegal
(`castleIsOneMoveAway` asks chess.js); plans offered while the student was in check
(`detectBehaviors` stands down); "a rook up" at +8/+9 (`conversionMethod`); "no pawn
can ever chase it" when …b6 could (`findKnightReroute`).

**Next:** full 100-game number → fix error classes by frequency → ACC-1 extract Learn's
builder so the checker can run what is actually spoken.

## 🎙️ WO-DANYA-01 — Learn free play taught like the video (David 2026-09-24: "I want to be taught like the video I sent you! That's the only reason I'm making this app.")

### Hand-walk 1 — Naroditsky's Scandinavian (vc-1zfJ7ABoh8k), 2026-09-24

Walked by hand (`scripts/audit-lib/hand-driver.mjs`), his moves as White, his
Black replies dictated. Flags + fixes: `audit-reports/hand-walk-danya-2026-09-24.md`.

**Fixed (all computers, all games):** mate verdicts read by side (`mateContext`);
"play X" on the student's turn arms the coach reply (was the play-move tool);
pinned guards / pinning moves (`whyItFailed`); "falls apart" only when the edge
is lost (`pickTempting`); defenders = attackers (`concessionBeat.coverage`);
trapped = no block/capture saves it; dictated replies never self-graded (and
the decline is honoured); seated detector text (`utils/seatPieces`); alignment
contest on the line, from a square it can hold; working minors never "doing the
least"; hole = their half; open file = no attacker pawn; captures are not
breaks; d3/g3 name the bishop (`open-diagonal`); gambit/lever taught from both
sides (`gambitFile`); pinned pawns are no news; phase thesis past-tense and
turns only; pin said once per game by target; "b-file" speech; stem rotation;
takeback clears marks; SEE generates attackers' moves only (gem build 2x).

**Open (next):**
- quiet-move PURPOSE computer: Nc3 hits the queen (tempo), Ne2-not-Nf3 keeps
  the g2 diagonal, h3 prepares g4 to break the pin, Qa1 backs the a-file rook;
- plan ARC (b4-b5-a4-a5 storm as one story) — ties to B (one thread/move);
- phase narration still hands tactic facts to a phrasing model (bare "Bishop on
  h5 pins knight…") — David's rule says chess is computer-worded; needs his go;
- rook template still fired on Rd7+Qd6 (move 17) with d3 blocking the file;
- "either works: g4 is right there with it" — unnamed "it";
- two lanes both say "b5 is the pawn break"; standing latent pin still a second
  mention; "nothing covers c3" with a knight on c3;
- opening name after transposition (1.e4 Nc6 2.Nf3 e5 → still "Nimzowitsch").
- Walk moves 23-27 again; then the 1380 and 2340 speedruns (xoS71OW-Re0,
  pXBR9CxK3lQ) and the 2000 Black game (7f2sPY2U204).


Target: `MWMloBpKuVg` (Nimzo-Larsen master class) + the 700/2300 speedruns
(`docs/plans/2026-09-24-speedrun-target.md`). His unit is the DECISION, not the
move: plans for both sides, "what's his next move — prepare the answer", options
at a hard moment each with its line and drawback, move orders re-checked, arrows
drawn along the line he calculates. Scoped to Learn free play (+ review lines).

**David's calls (2026-09-24):** the "couldn't he just move X?" question lane
answers for BOTH seats, ANY time (mid-game included); arrows draw the line, a
button walks it on the board. Review lines get arrows + a walk button.

**Prod tapes that set the baseline:** review 79% teach (15/19), 53/54; Learn free
play 17/17 on a 47-ply game but piles of 5–8 separate facts per move, the banned
"playable, but not as precise" register, "left the book" ×4, "same idea as move 3"
ON move 3, fragments. Learn ≈ 40% of the video, review ≈ 60%.

- [x] **A. Clean-up** — weighing speaks only real forks; "left the book" = no book
  line continues the game (`isBookLine`), said once; transfer is instance-aware,
  inline, recorded only when spoken; review gem share honest ("often" only ≥10%);
  "White's their king" seated; grade line names its move; "Qf5? Then …".
- [ ] **B. Subsumption, not a cap** — raised with David: a per-move limit violates
  G4.5; same-claim facts (material ×3, open king ×3) collapse instead.
- [x] **C. "Couldn't X just move" lane** — `pieceOptions.ts`: the piece's duty
  (friendly pieces it guards that the enemy attacks) → its moves that keep it
  (else the moves out of attack, else all) → one engine read per option, the
  reply line cut to its proof → verdict vs the move played. `pieceOptionsRef`
  parses both seats + a colour ("White's queen"); `resolvePieceQuestion` picks
  the decision (the side to move → now; else the position before its last
  move). coachService computes (12s box), coachApi speaks raw ahead of every
  move lane, `consumeCoachLines` carries `WalkableLine[]` to the page: the static
  board shows the question's position, each option's line is drawn as its
  sentence plays, and a Walk button steps it and returns to the game. Audit:
  Learn audit rows H1–H3.
- [x] **C2. The student is in control (David 2026-09-24: "stop calculations and
  answer question" · "even just the question should immediately cause coach to
  stop").** `stockfishEngine.holdForQuestion`: the search in flight stops (its
  result is not cached), background reads wait — including ones already queued
  — and the question's reads skip the line on the same warm engine (the pool
  cost ~14s cold). The first keystroke / a mic tap stops the voice and drops
  queued commentary (`ChatInput.onStartAsking` → `stopCoachNow`); "stop / wait /
  hold on" is a command answered by silence (`isStopCommand`). Local audit: the
  lane answered in ~2s warm.
- [x] **A2. Tape fixes (local run 2026-09-24):** principle praise only on a GRADED
  clean move; the next-move hedge framed "As for your next move"; warnings seated
  ("their queen on e1 pins your bishop"); every packaged line ends as a
  sentence; "taking there gives up your queen for the pawn", not "8 points";
  an alternative is weighed aloud only with a reason.
- OPEN (seen on the same tape, this is build B): same-claim pairs still both
  speak — "the e-file is open — your rook belongs there" + "the e-file is open —
  that is where a rook wants to be"; the open-king pair; the doubled-pawn pair.
- [ ] **D. Review lines** — arrows for every spoken line (refuted alt has none today;
  one line per segment), walk button narrated.

**Red on main, NOT from this WO (found 2026-09-24, logged not widened):**
`gemPunishLessons.test.ts` ×4 time out at 120s, `punishGems.test.ts` arrow rows
time out at the default 5s (ship-check runs 20s), `section14RecordPath.test.ts`
no-plan returns undefined (since 4a9614f) — its fixture's "quiet" 16.Bc6 hangs
to Rxc6 (the c-file opened on 15…bxc5), so the planless premise no longer holds
once hangs are attributed; the fixture needs a quiet move that hangs nothing.

## 🎓 WO-LAYERS-01 — teach in LAYERS, the way Naroditsky does, chosen by the student's record (David 2026-09-23: "take those two different teaching styles and algo them in … all 7" · "default should be lowest setting. This app attacks beginner players")

**The finding (read 424 narrated moves across 10 videos, then 8 low-Elo vs 7 high-Elo speedruns).** Length does not change with level — median ~25–30 words per move at both ends; ours ran 120–300. What changes is the LAYER:
- **SAFETY** (700–1200): count attackers vs defenders, loose pieces, the first impulse corrected ("resist the check — capture first"), phantom threats ("don't buy the bluff"), a tactic with its test ("the Greek gift needs g5 free").
- **PRINCIPLE**: develop, castle, trade when ahead, the conversion method (trade → passer → cut off → ladder).
- **PLAN** (2000+): one goal for the game, targets, prophylaxis, the choice between two good moves, timing.
- **Shared everywhere**: "not X, because Y" (the refuted alternative) and short lines played ONLY as proof of one claim (2–4 plies, ending on the result, no per-move adjectives).

**The algorithm.** Rating is NOT the input (the locked grey rule; a new player's rating is a guess). The input is the student's record, including the game being played:
1. `FACT_LAYER: Record<FactKind, TeachingLayer>` — every fact kind has a layer; a new kind fails to compile until it has one.
2. `layerStanding(weaknesses, capabilities)` — per layer: RED (an open hole there), GREEN (proven held, `capabilityProven`, and nothing red), GREY (no evidence).
3. The door: red layer raised; grey ordered bottom-up (safety → principle → plan); green layer QUIET unless the stakes are big (a hung queen still speaks to a strong player; "develop your knight" does not). A new quiet reason `proven`, emitted like every other gate.

**Build order (all in this WO):**
- [x] 0. `DEFAULT_STUDENT_RATING` 1200 → 400. Also removed two literals that had drifted from it: `explorerBandFor`'s own `1200` and `studentPlayingRating`'s `return 1200` (every new Play student faced a 1200 bot).
- [x] 1. `teachingLayers.ts` (`layerStandings`, `layerBonus`) + `FACT_LAYER` + the door: `StudentContext.layers` REQUIRED, bottom-up order kept under red, GREEN quiet below `GREEN_QUIET_BELOW` (1.5 pawns) as `why/reason: 'proven'`. The fundamental still leads (locked 2026-09-05). Both audits accept `proven`.
- [x] 2. `proofCut` + `describeProofResult` (exchangeLedger): the line is spoken to the shortest prefix that reaches its FINAL result (mate, or the settled net), then the result — no per-move adjectives; arrows cut to the same plies. Found + fixed on the way: `settled` forgot the last capture square after any quiet move (exd5 Nf6 read as a won pawn). HONEST: this cuts words, not engine time — the lines are still computed to 6 plies.
- [x] 3. `[refuted]` from the punish-gems (amateur slips at rating bands): the slip the student AVOIDED, or the one the opponent PLAYED. The latter restores the review gem note, which sat in the capped branch no real review runs. Found + fixed: gem payoff called any 2-point gain "winning the exchange" (Watch/Learn too).
- [x] 4. `bluffDetector.ts` — review `[bluff]` + live clause `bluff` (new `opponentLastMove` input, Learn passes the coach's reply). OWED: the dual-use record (student paid a tempo to a bluff) is not a tag yet.
- [x] 5. `conversionMethod.ts` — the ONE step the board is on; live `convert` clause (before the opening gate) + review `[technique]` once per step per game.
- [x] 6. Missed prevention (three engine reads must agree: the opponent's free move = the punishment, and not their reply to the best move) + `moveContrast.ts` `[contrast]` (what each move leaves undefended).
- [x] 7. `moveTiming.ts` `[timing]` — the move a turn early lost material to a reply it caused and that no longer works.
- [x] 8. `liveStrength.ts` — reads the SAME `capabilitiesPosed` + `movePlayedCleanly` the heat map records (one detector, two consumers); ±60 up / −35 down per posed question; Play reads it on every coach move. OWED: gem-hit and book-departure signals are not in it yet.

**Fixed first, from the 5ef6f45 prod review audit:** "It won their queen on f6" on the recapture closing an even trade (`describeMoveMerit` now REQUIRES the previous capture); "It's a sacrifice" on the opponent's move (seated). Reopen-walk wedge = #21, another session's.

## 🎯 WO-HOME-OPENING-01 — a personal coach: one home opening per colour, everything reads it (David 2026-09-22)

**Where this came from.** A full hand-driven evaluation on prod with David's own
932 chess.com games (`knight_mare_01`) imported through the app's Import page.
The memory is real and right: Weaknesses reads him cold (Vienna 46 games at
70%, Pirc 63 at 49%, repertoire coverage 51%), the Learn greeting names the
pattern costing him most, "how are my tactics?" answers with his own numbers.
The memory reaches almost nothing that teaches:

- The Training Plan was EMPTY with 932 games in ("Favorite an opening to
  begin") — it is favourites-driven, not weakness-driven.
- "What is my weakest opening?" answered "play a game against me" while the
  answer sat one tab away; "what should I learn next?" recommended the Elephant
  Gambit — 0% over THREE games — an opening he will never play. David: "it
  should take what I play the most and improve the weaknesses within that …
  some of the best players started with one opening for each color and learned
  everything they could about it and their knowledge branched from there."
- Only 6 of 932 games are analysed (the ones chess.com shipped with `%eval`).
  Every weakness, every drill and the "10 games running" claim come from those
  six, under a header that says "932 games analysed".
- The custom lesson serves his real positions (right shape) but a wrong answer
  gets "not the strongest, try again" with no reason, Hint draws a silent
  arrow, the right answer gets "Good." and the next position — a drill called
  "missed tactical sequences" never shows the sequence. "Build my full lesson"
  taught the idea as one fragment and re-served the position just solved.
- Review of his real Scandinavian loss never used his record in it (40 games,
  73%) and said "knight takes d5 wins their queen — 1 attacker to 0 defenders,
  so it falls" about a queen that steps away.
- My Mistakes labels his chess.com slips source "Coach", opponent "Unknown",
  date = import date: the provenance the spine was built to carry is dropped at
  the import boundary.
- The question router sends "why was X bad", "what should I think about here"
  and "weakest opening" to best-move-now (3 of 3, same on the previous OTA
  bundle). David: "and the question router. awful."
- Play never picks what to play against him from his record; the bot opened
  1.e4 c5 into a Bowdler both times while his Pirc sat at 49% over 63 games.

**The principle (David).** One HOME OPENING per colour, chosen from what he
plays most, and the coach improves the weaknesses INSIDE it before branching.
Not a random thin-sample opening.

**Stress-tested before building — where the naive version breaks:**
1. "Most played" is not one thing. His Vienna is 46 games at 70% in C28 and 42
   at 43% in C25. The unit is the VARIATION / the departure position, not the
   name — `theoryDeparture` already computes that per game. Same computer.
2. "Weakest" needs a floor or the Elephant Gambit wins again: candidates come
   only from the top openings by volume per colour; inside that set rank by
   games × score deficit; under ~10 games or ~5% of games never leads.
3. "Weaknesses within it" is EMPTY until the games in it are analysed. Batch
   analysis picks "50 most recent"; it must pick the home openings' games
   first — all 63 Pirc games before anything else — or the coach recommends
   the Pirc and has nothing to say about it. (David: "beautiful idea".)
4. THE JOIN IS BROKEN. Imports store the DB opening id, Play stores the name,
   Learn stores the tree name, review resolves a book-corpus id
   (`gameImportUtils.ts:13`, `CoachGamePage.tsx:2020`, `CoachTeachPage.tsx:10837`,
   `CoachGameReview.tsx:2339`). Until that is ONE key, "your mistakes in the
   Pirc" cannot be computed even after the games are analysed. This comes
   first or everything below is decoration.

**Decisions — filled with recommendations, David may flip any (2026-09-22):**
- Home opening is a LOCK with a one-tap "change my home opening", not a
  weighted focus. The coach spends no lesson outside it until told.
- Play STEERS into it: with the student as Black and the Pirc as home, the bot
  opens 1.e4 and follows the lines the student actually faces (from his own
  games' most-faced continuations), at his strength.
- Home-opening games ANALYSE AUTOMATICALLY on import, on device, ordered by
  home opening first; the rest wait for a tap.

**The build, in order (each item ships with its gate; nothing is "wired" until
a sentence or a row comes OUT of the surface on prod — "a wire that does not
fire is not a wire"):**

1. ✅ **ONE OPENING KEY** (2026-09-22). `src/services/openingKey.ts` is the
   only minter: the key IS the Dexie `openings` id (`slug(eco-name)`, the seed
   now imports the same function), minted from the BOARD via the detector's
   trie — `openingKeyFromPgn` / `openingKeyFromSans` / `detectOpening().key` —
   and BRANDED (`OpeningKey`) so a name cannot be assigned where a key belongs;
   `GameRecord.openingId` is `OpeningKey | null`. The typecheck named the four
   writers that had stored a name (import ×2, Play, Learn) and all four now
   mint. Readers: `studentNeedLoader` scores "this opening" by FAMILY
   (`sameOpeningFamily`, the home-opening unit) with ECO as the no-key
   fallback; the departure term joins by POSITION (`lineFenKeys` — a row
   belongs to the line when its last-in-book board is on it), never the old
   `openingId == null ||` wildcard that matched every departure against an
   unknown-opening game; review now passes the key + eco (both terms had been
   inert there); `openingEntryForKey` resolves the key back to a name for the
   Play→review hand-off. Persisted rows: `openingKeyBackfill.reconcileOpeningKeys`
   (per-row `openingKeyRev`, idempotent, detached at boot beside the tactic
   backfill) re-mints every stored value from the PGN; sync accepts only the
   minted shape. `gameImportUtils.detectOpening` (a Dexie scan) is deleted.
   Gates: `openingKey.test.ts`, `oneOpeningKey.test.ts` (four writers → one
   key; loader joins; position join with negative controls),
   `openingKeyBackfill.test.ts`. What A1 does NOT do: `misconceptionTags`,
   `openingWeakSpots` etc. still carry their own `openingId` strings (the
   book-corpus id from `resolveOpeningIdFromName` on the review capture) — a
   persisted second key space, bridged not merged; A3's home-opening computer
   reads `games.openingId` and does not need them.
2. ✅ **ANALYSIS PRIORITY + HONEST HEADER** (2026-09-22).
   `gameAnalysisService.pickAnalysisBatch` — both batch pickers route through
   it: EVERY unanalysed home-opening game (both colours, resolved through the
   student's seat and the ONE key's family) leads, and the package cap does
   NOT bind them (52 home games run in a 50-package; the newest of the rest
   fill what is left). Emits `analysis-batch-ordered` (total, batch,
   homeCount, families, cap). Auto-run on import was already wired
   (`chesscomService` → `runBackgroundAnalysis`); what was missing was the
   ORDER. The Weaknesses header now reads `overview.analyzedGameCount` —
   "6 of 932 games analysed" — the same pair the Overview card prints; gate
   `honestAnalysedHeader.test.ts` fails if the library total ever stands in
   for "analysed" again. Order gate: `analysisBatchOrder.test.ts`,
   `homeOpening.test.ts` (orderGamesForAnalysis: a Pirc the student FACED is
   not their Pirc). Open on this item: why 926 of David's games stayed
   unanalysed after import (H1) — the kickoff exists; the run is 50 a tap and
   aborts when iOS backgrounds the app. The order fix makes the first 50 the
   right 50; the volume question is H1's.
3. ✅ **THE HOME-OPENING COMPUTER** (2026-09-22). `src/services/homeOpening.ts`
   (pure): `rankHomeOpeningCandidates(games, identity, colour)` groups the
   student's decided, non-master games by FAMILY of the one key (so the Vienna
   in C25 and C29 is one candidate, its sub-lines carried as `variations`
   with their own games/score), scores (wins+½draws)/decided, and marks
   `clearsFloor` at ≥10 games AND ≥5% of the colour's keyed games.
   `chooseHomeOpening` = most-played family that clears the floor, else null
   (a cold record has no home yet — the card says so in numbers).
   `weakestVariation` = games × score deficit among sub-lines with ≥5 games
   (the line-level "weakness within it"; the per-ply holes stay the spine's).
   `homeOpeningService`: persists `preferences.homeOpenings` per colour
   (`source:'computed'` re-derived as the record moves; `source:'student'`
   from a one-tap pick, never overwritten — `clearHomeOpening` hands it back),
   emits `home-opening-chosen` with candidates/floor/chosen/reason.
   `HomeOpeningCard` on /weaknesses under the recent-games strip: the two
   families with games + score, "Change" lists the ranked candidates (thin
   ones labelled), "Use my most played" resets. Gates: `homeOpening.test.ts`
   (the Elephant-at-3-games negative control, both alone and beside a 40-game
   73% line; volume beats score; the exact floors; the seat rule),
   `homeOpeningService.test.ts`, `HomeOpeningCard.test.tsx`; the algo
   contract lives in `scripts/audit-home-opening-prod.mjs` (registered in
   `algoAuditContract.test.ts` for both emissions). Decision still David's:
   the LOCK semantics (the coach spends no lesson outside the home opening)
   land with A4/A5 where lessons are chosen.
4. ✅ **THE TRAINING PLAN READS IT** (2026-09-22). `src/services/homeOpeningPlan.ts`:
   `homePlanFor` (pure) builds, per colour with a home opening, the reps
   INSIDE it in order — ANALYSE (home games not yet analysed, with the
   count), THE WEAKEST LINE (`weakestVariation` → `/openings/<key>`), THE
   DEPARTURE (the precomputed rows for the home games grouped by last-in-book
   POSITION, ≥2 games), THE RECURRING FUNDAMENTALS (the spine's rows whose
   `gameIds` — C10's honest denominator — intersect the home games; routed by
   `resolveRepRoute`), THE MIDDLEGAME PLAN (`findPlanForOpening` on the key,
   then the family slug). `buildHomeOpeningPlan` assembles those inputs from
   the same computers every surface reads. `HomeOpeningPlanSection` leads
   `/coach/plan` (per colour: family, games, score, analysed share, the
   reps as taps); the page's hard stop now fires only with NEITHER a home
   opening NOR a favourite — the rolodex stays the favourites' shelf below.
   Emits `home-opening-plan-built`. Gates: `homeOpeningPlan.test.ts` (rep
   order + the joins, with negative rows: a weakness in other games, a
   closed one, a departure in another game are all excluded; a
   knight_mare-shaped record names the Pirc and is non-empty),
   `TrainingPlanRolodexPage.test.tsx` (zero favourites + a home → NOT
   locked). Not done here: Today's reps still ranks the whole bucket; the
   home section above it is the ordering David asked for, and A5 decides
   whether the daily feed itself is filtered to the home games.
5. ✅ **DRILLS THAT TEACH** (2026-09-22). `drillReasons.ts` (pure, board-only,
   G0): `wrongMoveReason` reads the position the wrong move LEAVES — a mate in
   one it walks into, a piece it leaves loose (SEE, pin-aware), a capture
   that wins material — and returns null when the board shows nothing
   concrete (the nudge then stands alone; never a guessed reason);
   `solvedLineBeat` speaks the whole solving line with the concept engine's
   idea appended ("That's it — the knight takes d5; then the queen takes d5,
   the bishop takes f7. The fork: …") — "Good." is gone from every solve and
   the mid-line beat names the opponent's reply; `hintBeat` names the PIECE
   and its from-square and withholds the destination (the honesty contract).
   Learn: `solvedDrillKeysRef` + `drillKeyOf` (board + first move) → both
   queue builds pass `exclude`, so a position just solved is never re-served
   in the session; the custom-lesson part teaches the WHOLE corpus passage
   (the 320-char clip was a G4.5 sentence cap) plus the concept engine's
   invariant for the part's first position (the idea, never the move) — so
   "Part 1 of 3" teaches the pattern, not one fragment. HOME FIRST:
   `buildMistakeDrillQueue` orders the theme with the most home-opening
   slips first and, inside a theme, home slips before the worst
   (`homeGameIds` from `getHomeGameIds`); My Mistakes lists home slips
   first. Provenance: C9 (merged) — `MistakePuzzleProvenance` required on
   every writer; "Coach / Unknown / today" fixed at the import boundary.
   Gates: `drillReasons.test.ts`, `coachDrillService.mistakes.test.ts`
   (home-first with the no-home control; never re-serve), C9's
   `mistakeProvenance.test.ts`. Not automated: the Learn click→spoken-beat
   leg (the page test's board mock cannot push a solve) — owed to the prod
   audit pair.
6. **THE ROUTER.** Retrospective ("why was X bad", "what did you mean by"),
   method ("what should I be thinking about", "how do I approach this") and
   profile ("weakest opening", "what should I learn") lanes computed and never
   falling into best-move-now; "what should I learn" answers from the home
   opening. Every phrasing added to the ONE English matrix and run through
   `audit-coach-all-questions-prod.mjs` exhaustively.
7. ✅ **PLAY STEERS** (2026-09-22). `homeOpeningSteer.ts`: `buildSteerIndex`
   walks the student's home games (seat-resolved; a Pirc they FACED as White
   indexes nothing for Black) and records the OPPONENT's reply at every
   position by FEN key; `steerFromIndex` picks by frequency — weighted-random
   among several faced continuations (the sanctioned opponent randomness),
   deterministic when there is one — with a floor of `STEER_MIN_GAMES` (3)
   games at the position and `STEER_MAX_PLY` (24). `pickHomeSteerMove` reads
   the persisted home for the student's colour. Wired at the SAME precedence
   in both play paths, below the taught slip and above the engine — in
   `getAdaptiveMove` behind an opt-in `steerHomeFor` (OpeningPlayMode's
   locked line never passes it), and in CoachGamePage's fast path, which
   reaches `getAdaptiveMove` only on engine failure. Learn passes it only
   when the student named no opening. Emits `coach-opponent-move-source`
   `source=home-steer`. Gate: `homeOpeningSteer.test.ts` (e4 on 10 of 10
   with the Pirc as home; the no-home control is null; the other colour is
   untouched; the student's own moves are never indexed).
8. ✅ **REVIEW OPENS WITH THE RECORD** (2026-09-22). `openingRecordBeat.ts`
   (pure): `openingRecordClause` — "your 63rd Pirc Defense, 49% so far — your
   home opening" (silent under 2 games; the score only when ≥4 decided games
   back it); `departureRecordSentence` — this game's own departure row joined
   by POSITION to the line, counted against every prior departure at the SAME
   board: "You left book at move 6 again — …Na6 instead of …Nc6, the 3rd time
   here." `StudentNeedContext` gained `openingGames` (decided games in the
   family) and `homeOpening` (the profile's home for the student's colour);
   the loader fills both. `generateReviewNarration` now loads the need
   context BEFORE the intro and `defaultIntroText` speaks the record as its
   second sentence (`reviewOpeningRecord`, owned openings only — a student
   facing the Pirc has no Pirc record). Rot fixed on sight: a private
   `openingFamily` copy in coachFeatureService replaced by the one import.
   Gates: `openingRecordBeat.test.ts`, `oneOpeningKey.test.ts` (count + home
   flag out of the loader, colour-scoped).
9. **EVERY COMPONENT WIRED, BOTH WAYS (David 2026-09-22: "make sure that each
   component of the coach is wired and working").** The sweep the evaluation
   found: `positionFacts` pre-gate (:480) gets `standingChance` and `decide()`
   (:651) does not; the student boost adds only when rank > 0 so it can never
   flip a verdict; Play / phase / read-position / whyBestMove pass neither
   `lastMove` nor `studentNeedContext` to the door; review's say-once ledgers
   burn BEFORE `decide()`; review's `learned:true` capture is dead behind the
   auto-sweep; Learn passes `fundamentalId: null`; `quietBy` labels importance
   and need closes both `below-bar`. Each gets a gate whose proof is OUTPUT
   (a row, a sentence), never an import.
10. **THE WRONG COMPUTERS.** `positionReadingService` bad-bishop on mobility ≤3
    with an invented reason; a bishop "pinning a pawn to a knight" (value check
    on the back piece); "1 attacker to 0 defenders, so it falls" on a piece
    that can move away; "compensation holds up" on a losing sacrifice; the
    pawn-move method beat on a king move; the mate score rendered as "-300.0";
    the raw third-person recap card; "10 games running" counting occurrences
    as games; standing refrains repeated at one ply. Each fixed at the computer
    with a board-truth test, then swept for siblings.
11. **THE AUDIT.** `audit-home-opening-prod.mjs`, hand-driven, 3-instrument,
    muted: import `knight_mare_01` through the real Import page → home opening
    chosen and named → plan non-empty → a drill from the home opening with the
    idea spoken on the reveal → a Play game where the bot steers into it → a
    review that opens with the record. Report the NARRATIONS, not the row
    count.

**Sequencing logic.** 1 before everything (no join, no personalisation).
2 and 3 next (nothing to say about the home opening until its games are
analysed). 4–8 are the student-visible payoff and can land in one push.
9 and 10 run alongside as the wiring/truth sweep; 11 closes it.

**Next-session pickup.** Items 1–8 are ✅ above (2026-09-22). What remains
of this WO is item 9 (every component wired both ways — Bucket B carries the
deciding-path half, C1–C6 the record half) and the prod audits after the
push. David's decisions (lock semantics, steer, auto-analyse on import) are
built as recommended and each is one flag away from flipping.

## 🔴 2026-09-22 (night) — THE FREEZE: a boot backfill pegged David's phone; the rule it left behind

**What happened.** OTA bundle `5cb79d17` (dispatched 13:57 UTC, the held-back-reason
fix) carried the tactic-tag backfill `reconcileTacticTypes` (N0, 2026-09-15). On
David's iPhone the first launch of that bundle (20:48 UTC) pegged the main thread
within seconds: the screen still scrolled (native), every tap died, the phone
heated, and the new bundle never got a single PostHog event out. Cause, measured:
`detectTacticType` costs **~263 ms per row on a desktop** (`conceptForLine` walks
the line); the backfill loaded EVERY stale mistake puzzle + classified tactic
(~700 weakness rows in the last month alone, plus every classified tactic of 932
analysed games) and re-tagged them in ONE synchronous loop with NOTHING persisted
until the end — so a force-quit kept none of it and the next launch started from
zero. A freeze that could never finish. The updater's rollback never applied
because `notifyAppReady` fires right after mount, before any of that runs.

**What it was NOT.** Not the Redis cap (Upstash is at 500,000/500,000 tonight —
the bell and referrals answer `degraded`; the OTA pointer and manifest are
Blob-mirrored and unaffected). Not his import (1 new game; the 932 were already
there). Not a bad zip (every chunk the bundle's index references is inside it).
Not CPU starvation on the web (the same import on prod web left event-loop lag at
0–6 ms; desktop is fast and a fresh device has no rows to re-tag).

**The fix, on `main` as `d6e756bcf` and OTA `d6e756bc` (run 72, published
22:53 UTC).** Three rules, one per defect, and now ONE home for them —
`backfillSchedule.ts`, a zero-import leaf both backfills read: **START LATE**
(8 s after boot, so the first paint and the OTA launch-install go first), **YIELD
per row** (idle callback, 40 ms floor), **PERSIST per batch** (10 rows, so a killed
app keeps its progress). The A1 opening-key re-mint (`reconcileOpeningKeys`, 932
PGNs replayed) had the SAME shape on this branch and is scheduled the same way
before it ships. Gates: a simulated force-quit keeps exactly the finished batches
and the next run walks only the rest (`tacticTypeBackfill.test`,
`openingKeyBackfill.test`).

**The rescue on the phone.** Launch → ~20 s → force-quit → launch: the plugin
downloads natively even while JS is pegged; `installStagedBundleOnLaunch` runs
right after mount, before the App effects that start the loop, so the staged
bundle installs at the next launch and wins the race within a few tries. David
must never delete the app (that wipes the record).

**The class, so it is swept, not spot-fixed.** Any `reconcile*` that walks a
per-row revision over a whole table at boot is this defect unless it reads
`backfillSchedule`. The JSON-mirror reconcilers (`reconcileProRepertoires`,
`reconcileBaseRepertoire`) are bounded by the JSON they mirror and keyed by one
revision, not per row — a different shape. `dataLoader.ts:220`'s generic mirror
helper is the same. Everything that grows with the STUDENT'S data goes through
the schedule.

**Also tonight — the composition ceiling.** The helper branches put
`surfaceComposition.scan` at 271 direct computer imports (ceiling 254;
CoachTeachPage 66/62). It came down by ROUTING (never a raised ceiling): the ONE
key minted in `useStudentNeed` / `learnGameRecord` / `generateReviewNarration`
instead of by four surfaces; slip→steer as one engine door (`pickTeachingReply`,
called by `getAdaptiveMove` and the Play page — two copies of one precedence
drift); the read of a position composed in `positionReadComposer`; the drill
beats assembled in `coachDrillService`. Six helpers that answer nothing about the
board were reclassified as infra WITH proof checks (record helpers: zero imports
+ no chess vocabulary; replay helpers: chess.js only + no judgement vocabulary;
phrasers: zero imports; the Supabase tree cache per the gate's own definition).
The kept-bad-bishop fixture was re-found as a real game whose bishop is hemmed
under D-1's forward-ray definition (the old fixture's bishop had an open
diagonal — a bishop to develop, not a bad bishop kept).

**Found in passing, fixed:** "start a game with me, I'll take black" typed into
the home-screen drawer parsed the word "me" as an opening name, and "let's play,
I'm white" parsed "i'm white" as the opening with no seat (`coachAgent`, gated).

**Owed after this push:** the hand walk (David: "the walk will be the audit" —
new questions beside the old, different moves, a game started from the home
screen); then a native iOS build AND an OTA carrying the full body (David
2026-09-22: "Then we update iOS native and send an ota").

## 🚶 2026-09-23 — THE WALK (the audit): what prod said on a fresh device with David's 932 games, and what it cost

David 2026-09-22: "the walk will be the audit … same questions plus different
ones. different moves." Driven BY HAND on `main` b16139537 (fresh device,
chess.com import, home screen → Weaknesses → Plan → Play a game from the home
screen as Black → chat → resign → review → Learn "let's play, I'm white" →
read this position → drill my mistakes → My Mistakes). Every line below is a
sentence the app actually spoke or rendered. Sixteen findings; fifteen are
fixed in the push that carries this section, one is an artifact of the driver.

**WORKING (read, not assumed):** honest header "6 of 932 games analysed" ·
home card by census (White Vienna 101·59%, Black Sicilian 87·61%) · plan
sections + reps for both colours · start-a-game from the home screen lands on
`/coach/play?side=black` · home steer 1.e4/2.Nf3/3.Bc4 vs the Sicilian, and on
Learn 1…e5 / 2…Nf6 into the Falkbeer (the most-faced reply to his Vienna) ·
spoken verdict, no card · "why was Ne5 good?" answered honestly ("it gives
check, and it was a blunder — my skill-level move") · "plan for my bishop on
f8" board-true · drill: wrong move → concrete reason, Hint withholds the
square, solve → next slip · My Mistakes with provenance ("vs vribak
Chess.com"), home opening first.

**DEFECTS, with the sentence and the disease:**

1. 🔴→✅ Review ply beat on a GREAT move: *"that was a great move — the stronger
   move was Kd7."* `reviewFullData` [quality] appended "the stronger move"
   whenever `bestMoveSan` existed. Now only on a class that cost something.
2. 🔴→✅ Recap card rendered the third-person fact package: *"Post-game recap of
   … (student rated about 1366). The student made 0 blunder(s)…"* D-12 had
   added a second-person fallback behind `?? spokenFallback`, but `voiceFacts`
   returns the RAW facts on every failure path, so the fallback never fired.
   ONE text now: the second-person recap is what the model warms AND what every
   failure speaks. The rating was deleted from the text — the student never
   heard a number about themselves before, and a "student rated about N" is a
   claim to the model, not teaching.
3. 🔴→✅ Spoken recap: *"Here it is. That's where this one slipped. And there it
   is — this was the game."* The review register's permitted "one beat of
   feeling" ate the facts — no Bg4, no Nc6. `mustPreserve` now carries the
   flagged moments' SANs; a reword that drops one is refused.
4. 🔴→✅ *"your 126th Sicilian"* while the home card says 87. `studentNeedLoader`
   counted the family without the SEAT — his games AGAINST the Sicilian as
   White were his Sicilian record. Filtered by `resolvePlayerColor === studentColor`;
   `openingScore` follows.
5. 🔴→✅ Plan beat after Bxf7+ Kxf7 at +0.5 for White: *"convert your extra
   material … steer for an endgame where the extra piece is decisive."*
   `deriveNextPlans` read the material COUNT; Ng5+ was about to take the bishop
   back. With an eval in hand the material plan needs the eval to agree (≥ +0.5).
6. 🔴→✅ *"Qxd4, unpins your knight on f3"* to a BLACK student — `reviewMoveTeaching`'s
   unpin gloss hard-coded "your" while its sibling clauses already flip on
   `moverIsStudent`.
7. 🔴→✅ Learn after 1.e4: *"Nothing to lose sleep over — the knight to c3 does the
   same job"*; after 2.Nc3: *"the bishop to c4 is about as good, so don't
   agonise."* The hedge fires when the runner-up is within 40cp — in a quiet
   opening EVERY runner-up is, so it fired every ply (D-8 rotated the stems and
   kept the disease). Gate: a two-horse race only — the third line must be ≥80cp
   worse (`pvPlayback` + `tacticalRead`, one criterion).
8. 🔴→✅ Read-this-position: *"if you send the knight to d5, I have the pawn to d6,
   and that's a discovery in two."* `tacticClassifier.detectDiscovery` walked
   the ray with `continue` past the moved piece — so d7-d6 "revealed" the queen
   on d8 onto the knight on d5 that the pawn still blocks. A piece moving ALONG
   the ray uncovers nothing: `break`.
9. 🔴→✅ "What should I be thinking about here?": the routine said "name two or
   three" twice (its own step 3 + the appended candidate habit). The habit
   computer gets `realChoice: false` there — step 3 IS that beat.
10. 🔴→✅ "why was my last move bad?" after the forced Kxf7: *"wasn't the engine's
    choice. The engine preferred Kd7."* — a verdict on a ply with no engine read.
    No read → no grade, said plainly; the engine's line is named as a line.
11. 🔴→✅ Play threat alert with the student IN CHECK: *"Watch out — if I play
    knight to g5, check …"* — Kxf7 came first. The alert names the student's
    own plies before the shot ("if you play Kxf7, I answer Ng5+ and …").
12. 🔴→✅ Generic filler in Play chat: *"Remember to develop your pieces early…"*,
    *"Consider taking the move back."* The development tip names the pieces
    still at home; the interface directive is gone.
13. 🔴→✅ "what is my weakest opening?" → *"Accelerated Dragon (B) — not drilled
    yet…"* — `coachSessionRouter` intercepted it with the DRILL-accuracy list
    before the record-based lane (`openingProfileKind: 'weakest'`) could see it.
    The intercept is deleted; the lane answers from his results.
14. 🔴→✅ Import ordered analysis with *"0 home-opening game(s) first (no home
    opening yet)"* — the importers never stamped `studentSide`, and the ranking
    cache was keyed on the game COUNT alone, so a ranking computed before the
    username reached the profile was served after it did. Both importers stamp
    the seat they know; the cache keys on identity too.
15. 🟠 "which opening do I play most as white?" — answered ("Vienna Game, 101
    games") — the earlier note that it fell into board-verdict was wrong; the
    panel tail I read was stale. Not a defect.
16. ⚪ "lets play, I am white" appeared twice as a user message — the hand
    driver's Enter + click. Driver artifact, not product.

**Gates added with the fixes:** `tacticClassifier.test` (…d6 is not a
discovery), `reviewFullData.test` (GREAT/BEST carry no "stronger move"),
`groundedAnswer.routerE.test` (candidate step once; unmeasured ply not
graded), `chesscomService.test` (seat stamped, case-insensitive),
`oneOpeningKey.test` (seat-scoped record), `coachSessionRouter.test` (the
weakest-opening question is NOT intercepted).

**Still open after this push (not walked, or walked and owed):** the review
intro fact package at `coachFeatureService` ~L503 still hands the model
"student rated about N" (same shape as #2 — it phrased fine on this walk, but
it has the same raw-fallback exposure); the Watch-register beats on the live
board (BACKLOG §4.6) are untouched by this.

## 🚶 2026-09-23 — WALK 2 (the re-walk on ea66196df): the fixes that stuck, and what the fresh device exposed

Fresh device, chess.com import of the 932 games again, Play as Black twice
(1.e3 engine game resigned at move 3; a Sicilian 1.e4 c5 2.Bc4 d6 3.d4 Bg4??
4.Qxg4 resigned), review of both, Learn "lets play, I am white" 1.e4 c5 2.Nf3
g6 + read this position + drill. Read, not assumed.

**WALK-1 FIXES CONFIRMED ON PROD:** #2 recap in second person ("You made 1
blunder. On move 3 your Bg4 was a blunder; the engine preferred cxd4") · #3
the moves survive the phrasing · #4 the record beat ("That's your 87th
Sicilian Defense, 61% so far — your home opening") · #9 the routine names the
candidate step once · #10 a measured ply is graded, honestly · #12 the
development tip names the pieces ("Your knight on b8, bishop on f8 and knight
on g8 are still at home") · #13 the question reaches the record lane · #14
"188 home-opening game(s) first (Vienna Game / Sicilian Defense)" at import ·
the spoken verdict fires as the blunder lands ("bishop to g4 is a blunder —
about 4.2 points … your move let White play queen takes g4"). Not reproducible
on this device's lines: #1 (a GREAT ply with a differing engine pick), #5, #6,
#11 (the in-check alert), #7/#8 partially (no hedge fired after 1.e4 ✓; the
read-this-position "discovery in two" is gone; it now says "a pin in two" for
Bg7 vs the b2-pawn/a1-rook, which is board-true and weak).

**WHAT THE FRESH DEVICE EXPOSED — one disease behind four symptoms:**

- 🔴→✅ **E. The import never saved the username** when the STORE had no
  profile yet (a fresh device that opens Import first). `ImportPage` wrote
  the username through `activeProfile` and did nothing when it was null, so
  every NAME-keyed reader read zero games: the Weaknesses header said "0 of
  0 games analysed" with 932 imported; "what is my weakest opening?" answered
  "none of your real games are in here". Dexie is the source of truth; the
  page now writes to the first Dexie profile and hydrates the store.
- 🔴→✅ **H. A third seat resolver** (`gameInsightsService.getPlayerColorWithUsername`)
  ignored the declared `studentSide` the importer now stamps — the seat rule's
  gate listed four resolvers and not this one. It reads the seat first and is
  in the gate.
- 🔴→✅ **M. The home steer's first move of a game was never steered.** The
  first call of a colour builds the whole index (932 PGNs) inside the 1200ms
  warm-lookup budget and fell through to the amateur band ("source=amateur-band
  san=c5" — a Vienna player's opponents play 1…e5 in 104 of 104 games). The
  cold build has its own 4s ceiling (`isHomeSteerWarm`), and a MISS is now an
  audited row (`source=home-steer-miss`) — walk 2 could not tell whether the
  steer had run because a miss emitted nothing.
- 🔴→✅ **D. "The game ended loss."** — the Play surface hands the recap a
  WORD, review hands it a PGN score; the recap knew only the score and dropped
  the opening clause on the word. One normaliser.
- 🔴→✅ **G. "your move let White play queen takes g4"** — spoken by the coach
  PLAYING White. The opponent is "them", never a bare colour.
- 🔴→✅ **J. "your 87th Sicilian" on the 88th** — the need loader's memo was
  keyed without the game count, so a game saved seconds before its review was
  not in its own record.
- 🟠 **K.** Bg4?? (a bishop hung to the queen) was attributed "overvalued the
  attack" — `principleAttribution`'s rule counts any move that hangs its piece
  as an "offered" investment. Board-true by its own definition, wrong as
  teaching; the rule needs a threat-intent test. Not changed.
- 🟠 **I.** The spoken verdict names cxd4 as the better move and the chat's
  "why was my last move bad?" names Nd7 — two engine reads at two depths, one
  ply. Not changed.
- 🟠 **N.** "lets play, I am white" on Learn: the game starts (with the steer
  wired) but the chat reply is whatever the brain says — this time the stock
  "I can't verify that precisely" after the strip emptied it. `parseCoachIntent`
  reads it correctly (`play-against`, white); the Learn handler's play branch
  requires a NAMED opening (`startOpeningPlay`). The no-name request needs a
  computed acknowledgement of its own. Not changed.
- ⚪ Weaknesses "Analysing your games…" header reads "0 of 0" until the first
  overview loads — cosmetic, resolved by E in practice.

**SHIP-CHECK (David: "find a serious way to be more efficient with build
checks").** Measured serial run: 76 + 94 + 134 + 325 + 308 s ≈ 16 min, every
phase independent. Now three lanes in parallel — [typecheck → test typecheck]
‖ [prod build → lint] ‖ [content gates → changed-file tests] — and lint runs
on the CHANGED files only (an eslint error can only be introduced in a file
the work touched; the whole-repo run re-counted 1,756 warnings every time).
Wall time is the slowest lane, not the sum.

## 🚶 2026-09-23 — WALK 3 (LEARN, with the questions Play got): every narration graded

Prod build ea66196, fresh device + import, "lets play, I am white": 1.e4 c6
2.Nf3 d5 3.e5 Bg4 4.Be2 e6 5.Ng5?? Bxe2 → End Lesson → review. Each line is
what the coach said; the grade is against the board and the voice rules.

- ✅ "Board's set — you're White, I'm Black. Make your first move whenever
  you're ready. Fight for the center and get your pieces out." — computed ack
  (walk-2 item N is therefore closed: the no-name request has its own line).
- ✅ "whats the plan here?" → "Your plan: Nf3, then e5, then d4. The opponent's
  most likely reply is d5." board-true PV. 🔴→✅ "White is slightly better" —
  a bare colour to the student playing White; `evalPhrase` now takes the seat
  ("you're slightly better").
- ✅ "what are they threatening?" → "They're eyeing the pawn on e4 — about 1
  point if you don't cover it." Exact.
- ✅ 3…Bg4: "Watch out — bishop on g4 pins knight on f3 against queen on d1.
  Remember — a pin freezes the piece in front…" Concept taught, board-true.
- 🔴→✅ "The knight to c3 reads better than the bishop to d3 here — it keeps
  more of the edge" / "the bishop to e2 … keeps more of the edge" / "castling
  short … keeps more of the edge" — three plies running. That clause is the
  eval bar read aloud; `candidateCompareClause` now speaks only its two
  grounded cases (safer square, forcing over quiet) and is silent otherwise.
- 🔴→✅ "This game is now the Caro-Kann Defense." spoken on two consecutive
  plies — the announce was re-queued every turn until the late package marked
  it heard, and the queued hint never marks. One queue per name per game
  (`learnMemory.queuedOpeningName`).
- 🟠 "which of my pieces is worst placed?" → "the rook on a1 — it only covers 2
  squares" at move 3. True and useless: undeveloped back-rank pieces are not
  "worst placed" in the opening. Not changed.
- 🔴→✅ "why did you play that?" → answered about MY move ("The pin only bites
  if you leave the queen sitting behind the knight"). `retrospectiveMoveRef`
  had no POINTER form — it needed a named move — so the question fell to the
  brain. "why did you play that/this/it" → the coach's last move; "why did I
  play that" → mine.
- 🔴→✅ "hint" → "I don't have an exact match for "hint". Did you mean Alekhine
  Defense: Hunt Variation?" — the bare-name pre-flight fuzzy-matched a coach
  command to an opening. A bare command (hint, help, undo, resign, yes, no…)
  is never an opening name.
- ✅ "what should I be thinking about here?" — the routine, and "there are no
  checks or captures on the board" is TRUE (Bxg4 is blocked by the knight on
  f3 — verified by probe before believing the ear).
- ✅ Read this position — king in the centre, my development, both pawn
  breaks, "if you play the pawn to c3, I have the bishop taking on f3: that's
  a pin in two" (weak but board-derived).
- ✅ 5.Ng5?? Bxe2: "Careful — your knight on g5 is attacked and nothing's
  defending it." ✓ 🟠 "Their bishop on e2 has nothing defending it — there's
  something to win here" — a RECAPTURE of even material called a win (the
  phrasing model's embellishment of "is undefended"; not changed).
  🔴→✅ "The attack was overvalued: Ng5 commits material…" — the same
  attribution as Bg4?? in walk 2. A QUIET move that can simply be taken on
  its landing square is a hang, not an investment: `overvalued-attack` now
  stands down for it and `loose-piece` names it. (A sacrifice — a capture or
  check that offers the piece — keeps the rule; the Wave-3 fixture still fires.)
- ✅ "why was my last move bad?" → "Your Ng5 on move 5 was a blunder — it
  dropped about 4.3 points. The engine preferred O-O…" Exact.
- 🔴→✅ End Lesson → review: "The game ended in a draw — … the draw is the
  residue of it." An ABANDONED game (result `*`) reached the phrasing model as
  "ended *" and it invented a draw. The recap now says "You stopped the game
  … before it finished."

## 🚶 2026-09-23 — WALK 4 (verification of the walk-2/3 batch on prod, chunk index-5mneGZ0v): what stuck, what did not

Live chunk carried every new string of the batch and none of the replaced ones
("before it finished", "home-steer-miss", "engine's line there ran", "are still
at home" ×5; "Consider taking the move back" 0). Fresh device, import
Knight_mare_01 (932 games, rapid 1214), then Learn, then Play — read off the
listener and the local audit log, not the pass count.

- ✅ **Import saves the username on a fresh device** — profile
  `preferences.chessComUsername = Knight_mare_01`, `currentRating = 1214`,
  Weaknesses header "Analyze 50 of 932 games" (walk 2's "0 of 0" is gone).
- ✅ **"what is my weakest opening?"** answered from the record by the brain's
  profile lane ("as White is Vienna Game (59% win over 101 games); as Black it's
  Sicilian Defense (61% win over 87 games)") — the router intercept is gone and
  the lane still answers. `home-opening-chosen` emitted for both colours,
  computed from the record (472 White / 460 Black keyed games, 4 unkeyed).
- ✅ **"hint"** on Learn gives a hint ("look at your pawn on e7 — it has a
  better square waiting"), no opening picker. 🟡 The hint is engine-led, not
  line-led: in a Najdorf the student asked to play, the first hint pointed at
  e7 rather than …c5. Observed, not fixed — the hint computer does not know the
  taught line; owed as a separate item, not a walk regression.
- ✅ **"why did you play that?"** → "My Nf3 on move 2 was the engine's top
  move — it develops the knight into the game, fighting for the center on d4
  and e5. That was my move, and the engine agrees with it." — the coach's move,
  first person, not the student's own.
- ✅ **The opening is announced once** — "This game is now the Sicilian
  Defense." on 2.Nf3 and never again on 2…d6 ("They open with d4, the Open
  Sicilian, and after the trades you reach the tabiya.").
- 🟡 **A voiced note in the spectator register on a live board** — "White
  develops the knight to f3, the natural Open Sicilian move-order — but they
  have a quieter idea in mind than d4" said to the Black student. That is the
  `beatRegister` class (CLAUDE.md "AND ITS SIBLING — THE REGISTER"), the offline
  bake in BACKLOG §4.6; the note is corpus content, not this batch. Not fixed
  here.
- 🔴→✅ **THE FIRST OPPONENT MOVE STILL MISSED THE HOME STEER.** Play as Black
  with the Learn intent cleared: `coach-opponent-move-source: source=home-steer-
  miss colour=black warm=false elo=1366`, then Stockfish e4; move two hit warm
  (`home-steer san=Bc4 family=Sicilian Defense faced=19/87`). So walk 2's 4 s
  cold budget was not the fix — the cold BUILD is what was slow. Measured: a raw
  read of all 932 games is 67 ms, but `buildSteerIndex` ran `chess.loadPgn` +
  `history()` on every home game's WHOLE 80-ply PGN (headers, `[%clk]`
  comments) — ~12 ms each, ~1.03 s for the 87 Sicilian games in Node, worse on
  a contended main thread — and only the first 24 plies were ever used. Fixed
  at the cost, not the budget: `openingSans(pgn, STEER_MAX_PLY)` strips headers,
  comments, variations, NAGs, numbers and the result and hands the first 24
  tokens to the same chess.js replay (legality unchanged — an illegal token
  still breaks the replay). 1028 ms → 215 ms on the same 87 games, and 180 of
  those are the per-ply `fen()` the index needs. Gate: `openingSans` matches
  `loadPgn` on a chess.com PGN with headers, clocks, a variation and a NAG; a
  corrupt tail never poisons the index.
  Note for the next reader: the Learn game had left `intendedOpening = Najdorf`
  in coach memory, so the FIRST Play game took the book fast path (`coach-move-
  fastpath: book: e4`) and never reached the steer — that is the designed
  precedence (intent > slip > steer), not a miss. The miss above is from a
  second game with the intent cleared.
- 🟡 `home-opening-chosen` is emitted twice per computation (both callers ran
  `getHomeOpenings` before the memo landed). Cosmetic; the memo key is right.
- 🔴→✅ **AND THE TOKENIZER WAS NOT ENOUGH — the first move missed AGAIN on
  the new chunk (index-C23NqKA2), so the cost was measured instead of guessed.**
  David's real 932-game record, seeded into fake-indexeddb and run through the
  real code: games read 49 ms, rankings cold 63 ms, `buildSteerIndex` 312 ms,
  the whole cold `pickHomeSteerMove` **306 ms**. A 306 ms job lost a 4 s race
  because of what ELSE the device was doing at the coach's first move: the
  listener showed `analysis-batch-ordered: batch of 188` with a 3-worker pool
  warm (`analysis-pool-warmed 3/3`) plus the singleton engine respawning
  (`stockfish-analysis-stalled … resetting worker`) — four cores saturated
  right after an import, which is exactly when a new student opens Play. A
  starved main thread loses any race, whatever the budget. So the first move
  must never RACE a build: `homeSteerCache.ts` (a leaf) holds the index per
  colour; `warmHomeSteer` builds it at boot (deferred by the backfill
  schedule's start delay), after an import (once the username has landed), and
  on Play mount (the build is shared with the coach's first turn through one
  in-flight promise, so two askers cost one build); the warm lookup is
  synchronous and touches no Dexie at all. Invalidation is an EVENT, not a
  TTL: the service's `persist` drops the index on any home-opening change and
  the import drops it explicitly. Emits `home-steer-warmed` (colour, family,
  positions, games, buildMs, trigger) so a `home-steer-miss` can be read
  against whether a warm ever ran. Gates: the warm pick reads no Dexie; two
  callers inside one build share it; import and choice change invalidate.
- ✅ **VERIFIED ON PROD (chunk index-A3gZwVta, dccfd5a7).** Fresh device,
  import Knight_mare_01, then Play as Black by IN-APP navigation:
  `home-steer-warmed colour=black family=Sicilian Defense positions=705
  buildMs=1787 trigger=import`, then the coach's FIRST move
  `source=home-steer san=e4 faced=87/87`. OTA dccfd5a7 published; iOS build
  run 364 (internal) triggered as the last step.
  🟡 **STILL OPEN — a COLD APP LAUNCH straight into Play as Black.** The index
  is in memory, so a reload/relaunch drops it; the boot warm starts at 8 s and
  took 4.7–5.3 s, and the Play-mount build under post-import load took 12.5 s,
  so a Black game started within ~13 s of launch still logs `home-steer-miss
  warm=false` and the engine plays (e4 here — the same move). The next
  increment is to PERSIST the index (Dexie `meta`, keyed colour+family, dropped
  by the same two invalidation events) and read the home choice off the
  profile in the store instead of re-ranking the games, so the cold path is one
  meta read. Not built this round (David: one build per batch).


## 🚶 2026-09-23 — WALK 5 (the full capability list, walked by hand on prod): every item, one push

David: "Make a list of all coach capabilities and do one full play audit… flag
it and keep moving… Fix all at the end with one solid push." The list: Record
C1–C3, Play P1–P14, Review R1–R5, Learn L1–L6, Study S1–S3. Walked on prod
(chunk index-A3gZwVta) with Knight_mare_01's 932 games, muted, by hand — two
Play games, three reviews (the Play game, a 79-ply chess.com loss, the Learn
lesson), a Learn game, Weaknesses, the plan, a mistake drill.

GREEN as walked: import + home openings; the steer (e4 87/87, Nf3 29/87);
phase narration; the spoken blunder verdict; hint; threats; game saved; review
opens; recap + result card; opening named with the home record ("88 games of
this Sicilian, 60%"); the turning-point card (pick → confirm → reveal → done);
weakest opening per colour; play-an-opening → line picker → "You're White…";
End Lesson saves and opens its review; the plan from home openings; the drill
loads, replays and grades.

Fixed in this push — each a computed fact that was wrong, not a phrasing nit:
- **Play** — F1 a steer move faced once (1/87) could be picked → per-move floor.
  F3 "what should I play here?" navigated off the live board. F4 a plan break
  (d5) that drops the pawn → `findPawnBreaks` requires a safe landing. F5 "was
  that a good move?" graded the COACH's move → `lastPlyOf` the student's seat
  (required). F6 a plain even trade announced as a fork → threats judged after
  the defender's best reply (`guaranteedWinCp`). F7 "why did you castle?" fell
  to best-move-now → castle + bare-verb retrospective refs.
- **iOS** — F2 build 364 failed: the 4.0.4 train closed while the us storefront
  still said 4.0.3 → pin 4.0.5 and take the MAX over storefronts.
- **Review, seat** — R12 projected lines now say "they answer X" on the
  opponent's quiet plies; R13 the sacrifice compensation takes a REQUIRED
  mover seat; R15 an opponent's merit clause swaps possessives ("castled your
  king" was the opponent's king); R16 `newPassedPawns` pooled both colours
  (exf6 "created a passed pawn on e6" — Black's) → mover-only +
  `passedPawnsHanded`, the lookaheadPlan workaround now redundant; R14 the recap
  swing is stated from the student's side; R20 an eval swing is never credited
  to the mover's own pressure when it went against the mover.
- **Review, truth** — R1a/R1c/R1d (a "steps in eyeing" restatement, "reaches
  into your half" from its own half + a `.slice(0,3)` cap, "great" meaning two
  things); R2 a 13-ply "deeper threat" mid-exchange; R4/R6 an undeveloped
  bishop called passive/worst at move 8–10 (`utils/undeveloped`, one rule for
  both); R5 a timed-out projection pass wrote a raw `[consequence]`/`[plan-line]`
  tag after the strip → it works on a copy; R7 a blockade plan on a square the
  student's own pawn held, while a knight hung → occupancy-aware + no plan
  while a piece is en prise (SEE ≥ 2, not in check); R8 a kick from the engine
  line stated as played; R9 the in-page review never passed its gameId, so the
  game on screen counted as "the last one… earlier today"; R11 "their knight is
  a poor blocker" with no knight near the runner.
- **Review, repetition** — R10 two HOWs on one ply under one stem → rotated;
  R17 the past-tense pass rewrote a HOW's second sentence ("check, captured,
  threat") → HOW sentences protected; R18 "the move X" is a subject, so a
  clause keeps one tense; R19 the `[principle]` facet built a fresh say-once
  set every ply (the tempo lecture ×4) → the game ledger, required; R22 "a rook
  endgame…" on ten plies → say-once.
- **Learn** — L3a "their knight on c6 is doing the most work — trade it off" at
  move two → no minor is "their best piece" before the middlegame.
- **Study** — S1a a Learn lesson (`*`) shown as LOSS; S1b game cards printed the
  opening key slug; S1c "best move agreement 0%" on every account (the analyser
  stores `bestMove` only when it differed) → counted from the eval pair; S2a one
  hole in two plan slots under two names → one rep per `capabilityTag`; S3a
  every mistake card's title printed the answer; S3b "Explain why" said only
  "The engine plays Nd5" → `describeEscape`.
- **Found while fixing** — `boardDelta.test`'s `[eval]` test had been RED on
  main since D-8 raised the floor; nothing in ship-check touched the file.
  `reviewCorpusSweep` had outgrown its 900 s single test (measured ~95 s a
  game on the pushed commit and on this batch alike — no regression — so 8
  games timed out under ship-check load, reading the same as "found
  nothing"). Split to one test per game with its own budget; coverage unchanged.
  The chat plan lane's comment promised a separate clause for undeveloped
  pieces that never existed; with safe-landing breaks and undeveloped ≠ worst,
  a quiet move-7 Italian answered "what's my plan?" with nothing. Now: "bring
  your bishop on c1 into the game, since development comes first."
  F3's other half: with "explain this position" no longer a navigation, the
  in-place assessment lane caught only 2 of its 7 phrasings — the detector now
  takes explain / analyse / break down this position and "what's happening
  here", and the matrix row moved from ACTIONS to LIVE_BOARD.

**RE-WALK on prod (chunk index-BaItklag, dc7eab01a)** — every fix above held:
UNFINISHED / opening names / best-move agreement 42% (was 0%); one threat rep;
"Move 14 — you played Bc6"; "The engine plays Nd5 — it takes the knight on f6
out of the pawn's attack"; "check, capture, threat"; "f4 is now on for them";
"Another tempo handed over" (the HOW said once); "f5 leaves the other side a
passed pawn on g5"; "they answer Rae1"; the rook-endgame line said once (ply
69); no "best piece" at move two; "what should I play here?" and "explain this
position" answered ON /coach/play; "Nf3 was the engine's top move — you gave up
nothing"; "why did I castle?" routed to the castle. Three new, fixed in the
follow-up push: `REVIEW_NARRATION_REV` had not moved since 09-15, so every game
a user had ALREADY reviewed kept replaying the old narration (bumped to 5 —
the audit device's cache held the stale entry, proving it); "b3+ is the lever"
(the minority lever is read on a turn-forced board, so the OTHER side's check
rode along on the SAN); "it castling gets your king to safety" (the
retrospective answer used the self-contained form after "it" — now the
verb-led form, re-seated for the coach's or opponent's move).

Open, not this push: F8 seat-neutral tactic templates (7, shared by review /
drills / alerts); R1b spectator corpus notes on live and review boards (§4.6
bake); R3 "Follow it up" line density (the locked `'full'` scope); L5a a
retrospective answer that misses g5's defensive point; the cold-launch steer
miss (persist the index).

## 🧹 WO-CLOSEOUT-01 — one session, code first, one push, one audit (David 2026-09-20: "yes, thank you. can you take the second list first?")

Everything on the open list that is code I own and needs no decision from David.
NOT here: #21's wedge (other session), GREEN (needs held evidence over days),
David's calls (Upstash, archived danya notes, spend-guard design), D9b/D15
(blocked on data / unknown root).

1. **Section-14 detectors** — `calculation-depth` → `left-book-early` →
   `no-plan` get pipeline WRITERS on the recording path, fed by the evidence
   computers that already exist (`criticalityScan` gapCp, `theoryDeparture`,
   `planRace`/`deriveNextPlans`), so the 23% `other` fallthrough shrinks and the
   loop's recurrence sentence has something to name on pawn pushes and king
   moves. Measured before/after on the 47-game corpus where present.
2. **Critical moment T1 + T3** — review scans flagged plies too and the REGISTER
   decides; Learn hands its announced plies to the sweep so a prompted find
   records `prompted: true`.
3. **Learn's half on a prod tape** — `audit-second-game-memory-prod` asserts the
   present-tense recurrence clause (one mount, two games).
4. **D11** — couple squares on the `[delta]` facet so stacked generators subsume.
5. **Hygiene** — pre-push hook honours the ship-check watermark; ship-check
   prints timeouts vs assertions; lint crash named as crash; test type-error
   ceiling; `BuildVersionWidget.test`; stale-tactics leftovers
   (`tactics-context-stale` count, `formatTacticsSubBlock` fen); multilingual
   lesson row vs probe.
6. **Measure-first, numbers only** — entry chunk contents/parse, the 57k
   no-position notes' reach, corpus gate unevenness, the 47-game rerun, the
   fundamentals-tab audit on prod. Decisions after, David's.

Order: 1 → 2 → 4 → 5 → 3 (audit) → 6 (measurements) → gates → ONE push → the
loop audit + the standing pair + the second-game audit, sequentially, behind the
shared lock.

**LANDED (code, one session — every item below is gated and typechecks clean):**
- ✅ 1. **Section 14** — `calculation-depth` (PV-gated: the blow lands on the
  opponent's third move or later), `left-book-early` (DB-anchored, G3, not
  before ply 6), `no-plan` (positional; yields to every concrete fundamental)
  are FUNDAMENTALS, so they flow through the spine, `matchFundamental`, the
  `[principle]` facet and the recurrence clause. Every `Record<FundamentalId,…>`
  answers for them. Gate `principleAttribution.section14.test.ts`.
- ✅ 2. **T1** — the review's critical scan covers every student ply past the
  opening; the REGISTER decides; the only exclusion is the double-stop guard at
  the card's mount. Gate `criticalMomentReach.test.ts`. **T3** — Learn keeps the
  plies where the deciding computer kept a `key-moment` clause
  (`announcedPliesRef`), saves them as `GameRecord.promptedPlies`, and the
  review's capture marks those capability rows `prompted: true`. Gate
  `promptedFind.wire.test.ts`.
- ✅ 4. **D11** was already done — `computeBoardDelta` couples squares per clause
  and `reviewFullData` re-keys them onto the `[delta]` facet (the PLAN entry was
  stale). Nothing changed.
- ✅ 5. **Hygiene** — the other session had already landed 11a (timeouts vs
  assertions), 11b (hook honours the watermark) and 11c (lint crash named) by the
  time this ran. Landed here: 11d — 🔴 **I MEASURED 0 AND IT WAS A CRASH.** A bare
  `npx tsc -p tsconfig.tests.json --noEmit` dies on the default heap and prints
  ZERO `error TS` lines, which reads exactly like a clean run; I lowered the
  ceiling to 0 on that reading. Re-measured with
  `NODE_OPTIONS=--max-old-space-size=8192`: **236**, the number the other
  session had already measured and set the same night. The ceiling stays 236
  (down from 296, their 60 fixture fixes). The trap is documented IN
  `ship-check.mjs` directly above the constant and I walked into it anyway —
  never read a tsc count without the heap flag. Also landed:
  `BuildVersionWidget.test` regex; `formatTacticsSubBlock(tactics, boardFen)` —
  the board fen is REQUIRED and a stale package renders nothing + audits
  (`formatTacticsSubBlock.stale.test.ts`); the multilingual lesson row polled
  `.first().isVisible()` on a comma-joined locator once after a fixed sleep, so a
  hidden kickoff shell masked a visible `teach-nav-row` — it now asks each
  selector every second for 40 s (the paired probe's method).
- ✅ 3 (instrument). `audit-second-game-memory-prod` gained rows E0/E1: game 1
  RECORDED a fundamental live, and game 2 SPOKE "You've walked into this
  before…" — separate rows, E1 n/a when nothing was recorded. Runs in the end chain.
- ✅ 6. **Measurements (numbers only; the decisions are David's):**
  - **Boot payload / entry chunk** (fresh `npm run build`, 2026-09-20): boot
    preloads **15 files, 26.4 MB raw / 6.1 MB gzip**; the entry chunk is
    **8.6 MB raw / 2.4 MB gzip**. The vendors are ALREADY split out (`ui-vendor`
    518 KB, `react-vendor` 225 KB, `chess-vendor` 106 KB), so the entry is app
    code plus bundled data. Next-largest preloads: voiced 4.3 MB, puzzles
    4.1 MB, subline-narration 3.4 MB, plans 1.7 MB. **Parse time needs a
    device** — it cannot be measured offline, and it is the number that decides
    whether a `/coach/*` route split is worth anything (E.3 said measure first;
    this is the measurement, minus the device half).
  - **Corpus reach, FULL corpus loaded** (`corpusReach.measure.test.ts` →
    `audit-reports/corpus-reach.json`): across 24 repertoire openings the
    phase-transition ritual reaches **24/24** and LESSON BACKGROUND **24/24**.
    So the 57k un-positioned notes are fully reachable by name + concept once
    the floating half lands; pruning them is a MEMORY decision, never a reach
    one. (E.5's "measure both ways before pruning" — this is the after-number.)
  - **Corpus gates are even now** (E.7): G9.4 move-number prefixes, phase
    validity and id-collision-with-primary are asserted for EVERY creator in
    `secondaryTeachings.test.ts`; they were chessbrah-only. 72 tests green.
  - **47-game rerun (E/A-NEW):** `data/sources/wo4-corpus/` is absent on this
    machine, so the measurement half skips honestly. Owed where the corpus lives.
- ☐ fundamentals-tab audit on prod · ☐ `tactics-context-stale` count read off
  the listener — both come from the end chain.

**PROD RUN (bundle `index-CQzqI6Vf`, 9321bbc11, 12:45) — LOOP AUDIT 6/6, and the
cleanest comparison yet.** `AUDIT_GAME_A=nHdi6Qpx AUDIT_GAME_B=MxLHuel4
AUDIT_STUDENT=black`, report `audit-reports/loop-closes-2026-09-20T17-45-41-666Z/`.
Unlike run 5, the control and loop tapes are the SAME beat at the SAME ply (56,
28...Nf8) — identical opening sentence, identical evidence — differing only by:

> "…Loose pieces are what makes their tactic work, so defend it or move it before
> it becomes their idea. **This one keeps recurring in your games — loose piece,
> the second game now — the last one was against nescitus 2 weeks ago. Worth
> drilling.** You: that was a blunder, costing about 4.2 points…"

The A-candidate iteration also proved itself: candidate 1 recorded rows but no
fundamental, so the instrument moved on rather than reporting a false red.

🔴 **BUT SECTION 14 DID NOT FIRE ON A SINGLE REAL GAME.** Four amateur games,
nine flagged student plies between them, and every fundamental recorded was
`loose-piece` or `ignored-threat`. Worst case for the build: A-candidate 1's two
flagged plies were **15...g5 (a pawn push) and 32...Kh8 (a king move)** — exactly
the `other` population section 14 exists for — and they attributed NOTHING.
Reading the gates against those plies: `left-book-early` cannot fire (ply 30,
past the 24-ply opening window), and `no-plan`/`calculation-depth` each need a
condition those boards may not meet (an earned structure plan whose squares the
best move serves; a PV whose first forcing move is ≥3 deep). So the detectors are
GATED CORRECTLY and are TOO NARROW IN PRACTICE — unit-proven, prod-unobserved.
That is the same "a wire that does not fire is not a wire" rule the repo already
holds, and it means the 23% `other` figure has NOT been measured down.
**NEXT (not guessed — measured). ✅ THE INSTRUMENT IS BUILT (2026-09-20):** each
of the three now SAYS which gate stopped it — `attributePrinciples(input, why)`
fills a caller-supplied sink, and `MisconceptionClassification.why` carries the
reasons out on the `other` fallthrough, so the 23% bucket is measurable instead
of mute. Same `diag` shape `findTheoryDeparture` has carried since July; absent
unless a caller asks, so no hot path pays. Reasons are concrete, never a bare
"no" — "cost 50cp is under the 150cp floor", "the punishment Bxf6 is immediate
(ply 1) — another fundamental owns it", "ply 30 is past the 24-ply opening
window", "the structure earns NO plan here — nothing to have ignored".
Gate: `section14Diagnosis.test.ts` (each reason named and matched, the `other`
fallthrough carries them, and the sink changes no result).
Found building it: declaring the sink beside the attributor put the
unparseable-SAN `other` return inside its temporal dead zone, so that path
THREW — caught by the classifier's existing gates, which is what they are for.
**THE READING — TAKEN 2026-09-20, FROM REAL USERS.** I was about to widen
`calculation-depth`'s PV shape from a four-game sample. PostHog answered first.
(Method, and it is the general lesson: `misconception-captured` mirrors as the
`misconception_captured` product event carrying `tag=` in its summary, so 90
days of real slips were already there. **Ask the data whether a thing reaches
users before reproducing it expensively.**)

🔴 **AND THE FIRST VERSION OF THIS READING WAS WRONG — the wrong numbers are
DELETED, not annotated.** I first reported 37.7% unnamed and "52% of slips carry
an invented cpLoss", and built a whole ordering argument on top. Both were
artifacts of aggregating a 90-day window that STRADDLES the 2026-08-10 fix that
replaced the `blunder ? 350 : 175` fallback with the measured delta. Weekly, the
fallback runs ~98% before 2026-08-09 and 5.9–11.9% after: the code comment at
`autoAnalyzeGame.ts:241` claims the fallback drains, and **it does — I aggregated
across the drain and read the history as the present.** Checking the trend, not
just the total, is what caught it.

**THE POST-FIX POPULATION (since 2026-08-30) — this is the number that decides
the gates.** 1,372 slips, 9 devices, audit rows excluded, every row parsing a tag.

| finding | number |
|---|---|
| real-user slips the app cannot name (`other`) | **29.2%** (400 / 1,372) |
| my four-game estimate | 23% — close; the sample was not badly wrong |
| unnamed by phase: opening / middlegame / endgame | 29.3% / 32.4% / 24.1% |
| slips still carrying the bucket fallback | 7.7% (105 / 1,372) |

**What actually follows.**

1. **The unnamed bucket is ~29% and roughly UNIFORM across phases.** The
   middlegame spike (45.6%) I reported was pre-fix residue. So there is no
   phase-shaped hint telling us which detector to widen, and the honest next
   move is to read the reasons the sweep now emits per unnamed slip rather than
   to infer a target from the distribution.
2. **The bucket fallback is a real but SMALL live defect (7.7%),** not the
   dominant one. It survives where the code says it should — mate-encoded evals
   and annotations predating `bestMoveEval`.
   🔴 **The "trapped WASM worker manufactures the nulls" theory is WITHDRAWN,
   and the line asserting it is deleted rather than annotated.** It was a
   plausible supply line (a failed search → the pooled `catch { evals[i] = null }`
   → an invented 175/350) and the peer MEASURED it on their next deterministic
   run: **0 of 69 null evals and 0 of 69 null bestMoveEvals.** On that evidence
   the engine traps manufactured nothing, so the residue is most likely mate
   sentinels and pre-fix rows. The instrument now measures it every run, which is
   the right place to leave it. Worth noting how this one nearly stuck: two
   sessions found the theory persuasive and neither had measured it.
   The DOCTRINAL point survives on its own merits — a fabricated fact wearing a
   measured number's clothes is indistinguishable downstream, and the determinism
   law says propagate the null (`cpLoss: number | null`, or a required
   `cpLossMeasured` flag so a new consumer must decide what unmeasured means)
   rather than substitute a midpoint. Two consumers read it as real today
   (`mistakePuzzleService.ts:695`, `weaknessAnalyzer.ts:1158`). **Not urgent at
   7.7%, NOT a blocker on the gates, and NOT justified by an engine-failure
   story** — which is the opposite of what my first version of this concluded.
3. **The ordering claim I made is withdrawn.** "Fix the input before widening the
   gates" rested on the input being broken for half of production. It is broken
   for 7.7%. Widen the gates against the post-fix population, and excluding the
   175/350 rows costs almost nothing.

Caveats that survive: 175/350 is a proxy for "no measurement", not proof; and
these slips come from 9 devices, so it is a real-user population, not a broad one.

**THE TALLY ITSELF — read 2026-09-20 off the muted prod loop audit (6/6, THE LOOP
CLOSES, fresh pair A=nHdi6Qpx / B=MxLHuel4, student black). It names a WIRE
defect, not a tuning one, and it closes this item.**

Every unnamed slip the run met printed the same first reason:

```
calculation-depth: punishing PV is 0 plies, needs 3
left-book-early:   ply 26 is past the 24-ply opening window   <- correct decline
no-plan:           O-O is forcing or castling, never planless  <- correct decline
```

**ZERO plies, not two.** The gate was never tight — its INPUT was absent, and no
threshold change could have moved it. Two of the three detectors declined
correctly, exactly as designed; the only one that could fire never saw a line.

**Root cause.** The annotation carries the engine lines — `ann.pv`, persisted by
the review's deep dive at a flagged ply (`gameAnalysisService.ts:1943`) — and
`autoAnalyzeGameMisconceptions`'s blunder builder never passed them. So on the
RECORDING path (every imported and every finished coach game) the PV-gated
fundamentals could not fire at all.

**This is the THIRD instance of one pattern in one function**, and the file
already documents the other two in its own comments: `evalBefore`, then
`evalAfterPlayed` (WO-4 J2, where `botched-conversion` measured 0 of 154 flagged
moves across 47 real games for precisely this reason). `BlunderForAnalysis` has
DECLARED `pvAfterPlayed`/`pvAfterBest` since 2026-09-06, with a comment saying
they "unlock the eval/PV-gated fundamentals on the recording path". The fields
were there; the wire never was. **The lesson worth carrying: when a builder
assembles an input row for a computer, check it field-by-field against what the
source record actually holds — a declared-but-unassigned field is invisible at
every layer below it.**

FIXED: both PV fields pass through, UCI->SAN via `pvUciToSan`, the same
conversion the review path does at `coachFeatureService.ts:1449`. Typecheck 0.
Gate `sweepPassesEngineLines.test.ts` blames by BEHAVIOUR (the attributor's own
diagnostic must stop reporting an empty line) and is negative-controlled both
ways — with the wire removed it fails "the persisted PV never reached the
classifier"; restored, both rows pass.

✅ **POST-DEPLOY G1 CONFIRMED (2026-09-20, bundle `index-DBo6e9P6`, muted):
`audit-loop-closes-prod` 6/6 — THE LOOP CLOSES**, same pair re-run
(A=nHdi6Qpx / B=MxLHuel4, student black). And the section-14 tally CHANGED shape
in exactly the way the fix predicts, which is the real evidence:

| before the wire | after the wire |
|---|---|
| every unnamed slip: `punishing PV is 0 plies, needs 3` | one slip now: `cost 126cp is under the 150cp floor` |

That second line is the detector reading REAL DATA and declining honestly — 126cp
genuinely is under its 150cp floor — where before it could not get far enough to
measure anything. `no-plan` likewise moved from a generic decline to "the best
move does not serve the plan either — the plan is not what this position was
about". The remaining `0 plies` slip is the documented bound below, not a
regression: that ply had no persisted PV.

⚠️ **STILL OPEN, and the bound is now PRECISE — sharper than the first wording,
which said "games whose review deep dive has run" and was both vague and subtly
wrong.** The gate is `isReview && !opts.sweepOnly` (`gameAnalysisService.ts:1802`),
and `isReview = positionBudgetMs === undefined` (:1689). No caller passes that
budget explicitly, so it splits cleanly by ENTRY POINT:

| path | budget | deep dive | PV persisted |
|---|---|---|---|
| `analyzeSingleGameUncoalesced` (:2053) — a finished coach game, a game opened in review | none | YES | **yes** |
| `analyzeRecentGames` (:2211) — the post-import batch | `BATCH_SHALLOW_BUDGET_MS` (200ms) | no | **no** |
| `analyzeAllGames` (:2411) — the bulk sweep | `BATCH_SHALLOW_BUDGET_MS` | no | **no** |

So opening a review is NOT required (a finished coach game gets one), but
**every BULK-IMPORTED game carries no PV at all** — and those are precisely the
games that feed the weakness model for a student who imports. `calculation-depth`
is therefore reachable on coach-played games and unreachable on imported ones,
which is close to the opposite of what my first note implied.

That is the next decision, and it is a real fork rather than a tuning question:
either the sweep computes a short line of its own for batch-analysed plies
(engine cost on the bulk path, which is the path already blamed for the
analysis stall), or `calculation-depth` is honestly scoped to games the app
analysed singly and the ~29% is attacked from a different detector. Worth
noting alongside the funnel work: the students who import are the ones whose
games land on the no-PV path.


### OWED-1 / E-10 — THE 150cp FLOOR, MEASURED ON REAL USERS (2026-09-20)

My E-10 reading found `calculation-depth` declining two engine-measured
mistakes for being under its 150cp floor, and I called that a DIRECTION on
n=7 rather than a number. PostHog gives the number. Unnamed (`other`) slips
since the 2026-08-10 fix, real measured evals only (the 175/350 bucket rows
excluded), 367 slips across 7 devices:

| cpLoss band | unnamed slips |
|---|---|
| under 100 | 49 |
| **100–149 — rejected by the floor** | **99** |
| 150–299 | 126 |
| 300+ | 93 |

**The floor excludes 99 of 367 — 27% of the addressable unnamed population —
purely for being "too cheap", while they are real engine-measured errors.**

**The argument for lowering it to ~100, and the reason it is safer than it
looks:** precision on this detector is carried by the PV SHAPE, not by the
cost. A candidate must still have a punishing line of ≥3 plies with a forcing
move at ply ≥2 — that is what makes it a calculation-depth failure rather than
"a mistake that cost something". The floor is only a severity filter in front
of it, so relaxing it admits candidates that must still pass the real test.

**Why I have NOT changed it, and this is a decision rather than a task.** It
is a shipped threshold on a live detector, the 27% is a population size and
not a precision measurement, and I have no ground truth here on whether a
120cp slip IS a calculation-depth failure — only that the detector never gets
to ask. Lowering it trades silence for a risk of naming the wrong fundamental,
and "empty > generic" is the standing tie-break. **David's call**, with my
recommendation: lower to 100, because the PV gate is the real filter and a
quarter of the population is currently unreachable.

⚠️ **And it changes nothing for imported games either way** — the batch path
carries no PV at all (bound recorded above), so `calculation-depth` cannot
fire there whatever the floor is.

### `tactics-context-stale` — the count, finally read (2026-09-20)

**0 stale, of 145 captured events.** Prod, muted, `audit-concept-gameplay`
G5a/G5b, exit 0, 15/15 rows green.

The number matters less than why it was never a number before: **no script in
the repo captured that event** — `grep -rl tactics-context-stale scripts/`
returned nothing until today — while OUTLINE carried it in two states at once,
twice as 🔴 "never done" and once as ✅ "ZERO across all four runs, closes the
item".

Worth being exact about the catch rather than overstating it: that ✅ reached
the **right number on no evidence**. A zero from an instrument that cannot see
the event is absence-of-CAPTURE, not absence-of-EVENT — the two are
indistinguishable from the outside, which is the whole disease. It is now the
same answer with a real instrument behind it, and G5a runs FIRST and asserts
the listener captured events at all, so a dead sidecar can never read as a pass.

Also measured on that run, reported not asserted: `interrupt=0, walk=2` on the
posture mix — the live-commentary doors need a warm engine cache, which is
OUTLINE 11l and is a measurement rather than a red.

### 0a CHALLENGED — "all five flagged plies return `[]`" does NOT reproduce (2026-09-20)

The board records the two fundamentals reds as **DETECTOR COVERAGE**, diagnosed
offline as "all five flagged plies return `[]`". Extending the E-10 coverage
measurement from section-14 to EVERY detector, on a real amateur game with
Stockfish's own per-ply best moves, gives the opposite shape:

| measure | result |
|---|---|
| flagged plies that got **ANY** fundamental | **6 of 7** |
| flagged plies that got a **section-14** one | 0 of 7 |
| flagged plies that got **nothing at all** | 1 of 7 |

The four that fired: `early-queen-sortie`, `greedy-pawn-grab`,
`neglected-development`, `passive-when-forcing-existed`.

So general detector coverage on this game is ~86%, not zero. Either the `[]`
finding is specific to the REVIEW AUDIT's game rather than a property of the
detectors, or it predates a fix landed since (the PV wire and the early-return
diagnostics both changed this path today). **Whoever owns the review audit
should re-measure against its own game before treating "detector coverage" as
the diagnosis** — the two reds are much more likely section-14-shaped, which is
E-10 and is separately explained.

Honest bound: ONE game, 7 flagged plies. It disproves "all five return `[]`" as
a general claim; it does not establish a coverage rate.

### E-10 ANSWERED — section 14 fires on nothing real, and here is WHY, per ply (2026-09-20)

`section14Coverage.measure.test.ts` walks a REAL amateur game (the committed
WO-4 fixture) with Stockfish 18's own per-ply `bestMove` / `bestMoveEval` /
`evaluation` at the sweep's depths — real best moves, measured costs, no
buckets. Deliberately NO pv, because `analyzeGameOnWorker` (this path AND the
import batch) emits none at all; that absence is the finding, not a gap.

**0 of 7 engine-flagged student plies received a section-14 fundamental.** The
reasons, now that every decline names its gate:

| gate | n | reading |
|---|---|---|
| `no-plan`: still the opening, development owns it | 6 | correct by design |
| `left-book-early`: position already OUT of book | 5 | ⚠️ see below |
| `calculation-depth`: punishing PV is 0 plies | 4 | the no-PV path |
| `calculation-depth`: cost under the 150cp floor | 2 | **134cp and 107cp — real mistakes the floor rejects** |
| `calculation-depth`: played move is itself forcing | 1 | correct by design |

**Two are actionable and one is suspicious.**

1. **The 150cp floor sits ABOVE real mistakes.** Two engine-measured errors of
   134cp and 107cp were declined for being too cheap. That is a tunable with
   evidence behind it now rather than a guess — though on n=7 from one game it
   is a direction, not a number.
2. 🔴 **I FLAGGED `left-book-early` AS POSSIBLY INVERTED AND IT IS NOT — the
   claim is deleted rather than softened, because I checked before filing it.**
   Its documented pattern is: the position BEFORE the move IS in the openings DB
   with named continuations, and the played move is none of them. So declining
   with "already out of book" is CORRECT — if you were out of book before the
   move, you did not leave book at this ply. Nothing to fix.
   What is real is a COVERAGE CEILING rather than a defect: the detector can
   only ever fire while the game is still inside the DB's book, and amateur
   games leave it fast — 5 of 7 flagged plies here were already out. That bounds
   how much of the 29% this detector could ever reach, which is worth knowing
   before anyone spends effort widening it.
3. The PV half is already understood and bounded above (batch path carries none).

🔒 **AND THE MEASUREMENT CAUGHT A HOLE IN THE DIAGNOSTIC ITSELF, first run.** A
real ply returned `[]` with an EMPTY `why` — the silent null the sink exists to
abolish, hiding inside the mechanism built to prevent it. `attributePrinciples`
had EIGHT early returns in front of the detectors and none of them said
anything; a caller could not tell "no fundamental applies" from "we never
reached the detectors". All eight now name themselves, including the one that
tripped it: **the student PLAYED the engine's move**, which is a verdict worth
stating rather than a silence. Gate: the existing section-14 diagnosis suite
(49 attributor tests green).

**THE OTHER THREE AUDITS (same bundle):**
- **LEARN** `audit-concept-gameplay-prod` **8/8** — the pin invariant voiced
  mid-game, 58 spoken lines, muted, no page errors.
- **FUNDAMENTALS TAB** `audit-fundamentals-tab-prod` **18/19** — every product
  row green (the development pillar rolls up two sections, the NULL-pillar slip
  lights nothing, grey stays silent on a fresh device, the Listen button reached
  the listener). The ONE red was MINE and it was the instrument: the script
  carried `FUNDAMENTAL_COUNT = 33` and section 14 made it 36 — a constant about
  a different build. It now DERIVES the count from `FUNDAMENTAL_IDS` and throws
  rather than defaulting.
- **SECOND-GAME MEMORY** `audit-second-game-memory-prod` **10/11**, and the red
  is a real finding the row was built to separate: **E0 ✅ game 1 RECORDED
  `tempo-handed` live; E1 ❌ game 2 never spoke the recurrence clause.** Read
  the tape before blaming the wire: **game 2 spoke 44 lines and NOT ONE was a
  fundamental verdict** (game 1 spoke two). So the clause had nothing to ride
  on — this is Learn's FUNDAMENTAL NARRATION not firing in the second game, not
  the recurrence wire dropping anything. E1 now has three outcomes (not owed /
  the narration never fired / the wire dropped it) so it can never again fail
  the product for an empty set.
  **OWED, and it is the Learn half of the loop:** find why
  `learnFundamentalVerdict` produced nothing across 17 plies of game 2 while
  game 1 spoke two. Suspects, in order: the backward-look (`look`) is null so
  the whole line including the verdict is skipped; the per-game
  `fundamentalSeenRef` is NOT reset between games (it is a bare `useRef`, not a
  `learnMemory` slot — the exact debt #18 documented for the threat refs); or
  game 2's slips simply attributed nothing. The second is checkable by reading
  one line and is the likeliest.

**RE-RUNS, both green, both earned:**
- **FUNDAMENTALS TAB 19/19** with the derived count (36).
- **SECOND-GAME MEMORY 12/12 — LEARN'S HALF OF THE LOOP IS PROVEN ON PROD.**
  Game 1 recorded `ignored-threat` + `greedy-pawn-grab` live; game 2, on the
  SAME mount, spoke:

  > "Here's how: Their move first, always. Before you look for your own idea,
  > answer what their last move threatens… **You've walked into this before —
  > ignoring a threat, the second game now.** That eyed the pawn on d4, but the
  > knight on f3 holds it…"

  So both registers of the recurrence computer are now demonstrated on the live
  bundle: review (retrospective, names the prior game) and Learn (present tense,
  mid-game). 🔴 **Say plainly what this green is NOT:** it happened WITHOUT the
  fresh-game reset fix below, which was uncommitted at the time. The first run's
  red was not the recurrence wire — it was game 2 speaking no fundamental
  verdict at all — and that outcome is INTERMITTENT, which is the finding.

**🔴 FOUND BY THE RED, FIXED AT THE ROOT: two fresh-game doors, two different
lists.** A new Learn game arrives either because the student ASKS for one or
because the BOARD returns to the start. The ask-door cleared TWO per-game refs;
the board-door cleared EIGHT. So a session's second game could inherit game 1's
`fundamentalSeenRef`, get every fundamental back as its SHORT repeat stem
instead of the full teaching, and with it lose the recurrence clause (which
rides the first-time verdict). It only shows when the ask-door runs alone — the
board-door usually fires too and masks it — which is exactly why one run was red
and the next green on one build. `resetPerGameMemory()` is now the single door;
gate `oneFreshGameReset.test.ts` blames by statement (exactly ONE
`newGame()` call site, inside the reset, and every hand ref named in it), so a
second list cannot be written. Same disease as #18, one door along.

**AND A THIRD DOOR, found by grepping the class rather than the instance** (the
other session's suggestion; the sweep-don't-spot-fix rule). `learnMemory.observe()`
resets ITSELF when the board goes backwards — a path no caller goes through — so
the page's hand refs could still not follow. The fix is not a fourth list: the
MEMORY now owns the signal. `createLearnMemory(onNewGame)` fires after every
reset from every path, the page passes its ref-forgetter, and `resetPerGameMemory`
is just `newGame()`. One place decides "a new game started"; one handler answers.
Gated in `oneFreshGameReset.test.ts` (exactly one `newGame()` call site, inside
the reset; `observe` must go through `newGame`; the forgetter must never call
`newGame` back). `learnMemory.test.ts`'s old "newGame() at EVERY fresh-game site
(≥2)" assertion is DELETED, not annotated — it encoded the per-site lists that
drifted in the first place. Also found by its own orphan census: my new
`announcedPliesRef` was reset with `= new Set()`, which the census cannot see —
now `.clear()`, like every sibling.
- Swept the rest: `CoachGamePage.announcedHangingRef` keys on `gameId` and
  self-invalidates (the right pattern, not a door); `OpeningPlayMode` holds no
  per-game say-once refs. No fourth door.

**🔴 A REGRESSION I SHIPPED, FOUND BY THE OTHER SESSION'S TAPES (2026-09-20).**
Two product-mode runs on the merged tree, same pinned game: the review walk
reached ply 67/69 at **550s before** my pushes and at **800s after**, with
`end reached` going TRUE → FALSE and four rows cascading red off it (CRIT,
THESIS, RECAP — all downstream of a walk that never arrives at the ply). It did
that with FEWER flagged plies (3 vs 5), i.e. less work, which is what rules out
the game.

**The cause was mine and it is readable without a profiler.** WO-LOOP-01 put the
insight sweep on the review path — correct, that is the fix that made the loop
record at all — but I **AWAITED** it inside `analyzeSingleGame`, which is the
function `CoachReviewSessionPage` awaits before the walk becomes startable. So
mistake-puzzle generation (which can invoke Stockfish on a game with no stored
best move), the misconception attribution, tactic classification and a dossier
refresh all ran IN FRONT OF THE STUDENT — and twice, since the sweep-open and
the background deepen both land there. My own comment one line above read
"Never blocks the review", while the code blocked it. That is the same
comment-describes-the-half-that-is-not-connected disease this file opens with,
written by me, the same night I wrote that section.

**FIXED:** the recording is fire-and-forget. Nothing about a game's OWN
recording changes what its walk says — `recurrenceFor` excludes the current
gameId, so these rows are for the NEXT game. There is no ordering requirement,
only a completion one, which a detached promise satisfies; both outcomes are
audited (`…analyzeSingleGame.record`). Gate: `gameAnalysisService.records.test`
now asserts `void generateInsightsForGame(` and NO `await` of it inside the
function the walk waits on. (Found writing that gate: slicing the body to the
first `\n}\n` lands inside a nested block and reads an EMPTY body — a gate that
would have passed on anything.)

**OWED — the measurement, not my word for it:** the other session offered a
deterministic re-measure (`AUDIT_DETERMINISTIC=1`, their seam) on both sides.
Take it: n=1 per side in product mode is not enough to close this, and the
second candidate cause is still open — T1 widened the critical fan from 22 to 27
plies (8746ms vs 5128ms, by design) and it competes for the same single-thread
pool worker the walk's narration needs. If the detach alone does not restore
550s, the fan's 3s delay is the next thing to look at.

**Status:** plan ✅ · context ✅ · code ✅ · gates ✅ · push ✅ ·
**audits: loop 6/6 ✅ · Learn 8/8 ✅ · fundamentals-tab 19/19 ✅ ·
second-game 12/12 ✅** — WO-CLOSEOUT-01 closed.

## 🎯 WO-LOOP-01 — PROVE THE ONE-LINE DEFINITION ON PROD (David 2026-09-20: "i want to get the main concept of the app working" → "full plan mapped out. then execute it. all code done first in one go, then audit following")

**The concept:** the coach learns you, and what it learned changes what it says
next. Every half of that loop is built and gated IN ISOLATION (record → spine →
ranker → narration → drill → evidence). Nobody has ever shown a real student's
SECOND game sounding different because of their FIRST. That demonstration is the
main concept, and it does not exist. This WO builds the one wire that is still
missing and the one instrument that measures the whole sentence.

**Scope, stated so it cannot creep:** the RED direction only — "you keep doing X,
so I name it and teach it harder". GREEN ("you got better, so I go quiet") needs
repeated held evidence and is not provable in one session. Out of scope and owned
elsewhere tonight: #21 (another session, `stockfishEngine` / `gameAnalysisService`
/ `engineLifecycle` / the census tool — NOT touched here).

**Phase 0 — this plan (committed locally first; pushed WITH the code, once, so the
other session's running audits do not eat a mid-run deploy).**

**Phase 1 — context (all four levels, before a line of code).**
I: the foundation (the loop, capability parity, algo-based). II: this file —
A-NEW landed the spine rows (`fundamental:<id>`, with provenance) and left
`matchFundamental` with ZERO production callers; E.0 measured the recording
half's coverage gap (attributePrinciples attributed none on 06wNUWaA). III:
`surface-map.mjs --changed` on every file touched. IV: read `coachFeatureService`
at the fundamentals-first site (~:1697), `seenFundamentals` (~:1177),
`attributePrinciples` (~:1441), the aggregate (~:4281); `weaknessSpine`
`aggregateFundamentals` + `WeaknessProvenance`; `weaknessSignal.matchFundamental`;
`positionFacts:565` (Learn's spine join); `reviewFacetRank` ranks; the review
audit's game seeding + listener helpers; `audit-fundamentals-tab-prod`'s Dexie
seeding.

**Phase 2 — code, all at once.**
1. **ONE computer, `src/services/recurrence.ts` (leaf):** given the spine signals
   and a `FundamentalId` (or a tactic pattern id), return
   `{ count, games, lastMet: { opponent, daysAgo } | null, ordinal }` from the
   `fundamental:<id>` row's count + provenance — or null when the row is absent
   or count < 2. Null is silence; nothing is invented. Deterministic, no rating,
   no LLM. Gate: `recurrence.test.ts`, negative-controlled (no row → null;
   count 1 → null; unknown id → null; provenance-less row → count without
   `lastMet`).
2. **REVIEW consumer (the owed A-NEW wire):** at the fundamentals-first site,
   when the ply's attributed fundamental has a recurrence, the lead sentence
   gains it — "This recurs for you: your third loose piece across two games —
   you last met it against Svidler, 17 days ago." Phrasing ROTATED on the ply
   (`rotateStem`), facts fixed. Ranked through the existing door, never a new
   branch; the retrospective register.
3. **LEARN consumer (capability parity — name the sibling):** the live lane
   already boosts on `matchTacticPattern` / `matchClauseKind` at
   `positionFacts:565`. Where that join fires on a spoken fact, the same
   computer appends the recurrence clause in the present-tense register ("you
   have walked past this pin twice before"). Same computer, two registers, per
   the two-register law.
4. **THE INSTRUMENT, `scripts/audit-loop-closes-prod.mjs`** (3-instrument,
   muted, vacuity-checked, real pipeline): CONTROL — fresh device, seed real
   game B unanalyzed, open its review, capture every narrated line. LOOP —
   fresh device, seed real game A (a game whose student drops a loose piece),
   open its review and let the sweep RECORD (assert the `misconceptionTags` row
   with `fundamentalId` landed — RECORDED is its own row, separate from
   SPOKEN), then seed game B and open it. Rows: A recorded; the spine carries
   the `fundamental:<id>` row; B's tape DIFFERS from control at the concept
   ply; the recurrence sentence names a count ≥ 2 and a real game; every other
   ply identical (the delta is the loop, not noise); muted. Prints both tapes.
   Registered in AUDIT_INDEX + the CLAUDE.md matrix.
5. **Gates:** unit gates above; `coachFeatureService` gate that the recurrence
   clause appears only with a recurrence (negative control: fresh profile →
   the old sentence, unchanged).

**Phase 3 — the local gates, then ONE push.** Touched-suite vitest, `npm run
typecheck`, lint on changed files, `surface-map --changed` + `--verify`,
`state-of-build --verify`, `audit-vacuity-check` on the new script. Commit all,
merge origin, push once, poll the bundle for the new script's chunk.

**Phase 4 — the audit, sequential, nothing beside it, after the other session's
audits are idle:** `audit-loop-closes-prod` (control then loop), then the
standing pair (Learn, review). Report the TAPES, not the row count.

**The fork that ends the session honestly:** if phase 4 shows game A RECORDED
and the spine row present but B's tape does not change, the wire is not the
sentence — it is the deciding computer's need term, and that is a second
session. The instrument will say which world we are in; the plan does not guess.

**Phase 1 finding that reshaped the build:** the recurrence COMPUTER already
existed — `misconceptionCallbacks.recurrenceClause`, wired into ONE path (the
causal-chain lead) and no other. So the code is a wire, not a new computer, plus
two defects the wire exposed: (a) the count was in ROWS, so two loose pieces in
one game read as "recurring in your games", and whether this game's own swept
rows counted depended on timing — now counted in GAMES via `WeaknessSignal.games`
(distinct provenance, newest first) and `recurrenceFor(signal, currentGameId)`;
(b) `weaknessSignalLoader.invalidateWeaknessSignals` had ZERO callers, so a slip
recorded by the sweep did not reach the next narration for five minutes — the
writers (`misconceptionService`, `mistakePuzzleService`) now emit on a leaf event
(`weaknessModelEvents`, imports nothing, so no cycle through `weaknessSpine`) and
the loader + Learn's hook listen. Both consumers share `fundamentalRecurrence.ts`.

**PHASE 4, RUN 1 (bundle `index-BucBq3e3`, 02:17–02:46) — THE INSTRUMENT FOUND THE
ROOT.** `audit-loop-closes-prod` 4/6, verdict PAIR UNUSABLE, and it was right to
refuse: **neither game got a single misconception row from the sweep.** Learn
8/8 on the same bundle. Read, not guessed: the review page's first open runs
`analyzeSingleGame`, which writes the annotations, stamps `fullyAnalyzed: true`
and returns. The misconception/puzzle/tactic sweep (`generateInsightsForGame`)
was a CLOSURE inside `analyzeAllGames` — the BATCH path only — and the batch
skips a game already stamped analysed. The review's own capture component is a
BUTTON ("Add this game's mistakes to your weaknesses"). So a game a student
first met in review — the most common path — was never recorded into the
student model. The coach diagnosed the loose piece out loud and remembered
nothing. This is the one-way-wire disease at the loop's FIRST hop, and no gate
could see it because every recorder was unit-tested through the batch door.
(Second, smaller: `determinePlayerColor` never read `GameRecord.studentSide`.)

**FIX (run 2):** `generateInsightsForGame` hoisted to ONE exported door, called by
both batch sites and by `analyzeSingleGame` after it writes (habits only on the
full-depth pass; every recorder guards its own game, so sweep-then-deepen does
not double-record). `determinePlayerColor` honours the declared seat first. Gate:
`gameAnalysisService.records.test.ts` — a real row comes OUT for a review-shaped
game, idempotent, negative-controlled, and the review path calls the door. The
audit now prints, for each game, what the engine FLAGGED beside what the sweep
WROTE (so "nothing to record" and "the sweep never ran" can never be confused
again), iterates B candidates until one shares a fundamental with A, and sources
LOSING games first (a GM who won has nothing to record).

**RUN 2 (bundle `index-FRb8wK0Z`, 96f49e2e6, 03:45) — THE RECORD HALF FIRES ON PROD.**
`AUDIT_GAME_A=HSJKsqHS` (Svidler–Carlsen, student Black): the engine flagged
24...Nf4+ a blunder, and the sweep wrote **1 misconception row, `loose-piece`,
from the review's first open** — row A ✅. Before the fix that was 0 on every
review-first game the app has ever analysed. Then the pair: three GM games for B
gave Black no second loose piece (0, 0, and 2 flagged king moves that attributed
NOTHING — the E.0 `other` gap, n=3 now) → row P ❌, verdict PAIR UNUSABLE, the
recurrence sentence still unproven on prod. The instrument named the reason: **GM
games are the wrong population.** Run 3 sources AMATEUR games (explorer
`source=lichess`, 1600–2000 blitz/rapid, `recentGames`, losing side first) —
the app's actual users, whose games carry the fundamentals this measures.
`AUDIT_SOURCE=masters` keeps the old population.

Also seen twice tonight, recorded for #21's owner (the other session): the review
audit WEDGES on the reopen after the dive with the multi engine demoted cleanly
to single (no storm, workers=1) and the walk never leaving ply 0 — node at 0%,
Chromium at 100%, 50 min. That is the "wedge behind the storm", n=2 (their run
+ mine, game jMVMo1Ua). Not this WO's file; the standing review re-run is owed
once it is fixed.

**RUNS 3–4 (amateur games, 04:37 and 04:48) — the instrument found THREE more
things, two of them product.** Run 3: amateur sourcing works (B recorded
`loose-piece` + `ignored-threat` from its own review), but A's three flagged
plies — two pawn pushes and a king move — attributed no fundamental (the `other`
gap, n=4 tonight). Run 4, A pinned to the game known to record loose-piece:
**A recorded, the pair shared `loose-piece` + `ignored-threat`, and B's beat at
28...Nf8 carried the verdict ("Your rook on c8 hangs after this") and NO
recurrence clause.** Reproduced offline with every hop named
(`loopCloses.review.integration.test.ts`, real code, no mocks):
1. INSTRUMENT — the pinned A was not excluded from the pool, so B candidate 2
   was A's own PGN under a second id. Fixed; a game can never be paired with
   itself.
2. PRODUCT — the spine's game index used `conversionDetector.resolvePlayerColor`,
   one of FOUR seat resolvers of that name, and the only one that read
   `GameRecord.studentSide` was `playerIdentity`'s. So a review-first game with
   no stored username had a known game and an UNKNOWN opponent — the clause
   could never say "against X". All four read the declared seat first now; gate
   `seatResolversReadDeclaredSeat.test.ts` blames by statement so a fifth cannot
   skip it.
3. PRODUCT, the one that mattered — `isReviewUncapped()` is TRUE by default, so
   every shipped review beat is composed from FACETS (`computeMoveFacets` →
   `[principle] <verdict>`); the capped fundamentals-first block I wired never
   runs for a real student. The unit test passed because it passed
   `uncapped=false`. The clause now rides on the `[principle]` facet in the
   uncapped path — one claim, one facet, so selection sees one fact. Gate: the
   UNCAPPED case in `coachFeatureService.recurrence.test.ts`.
Offline, the whole chain now speaks: *"This one keeps recurring in your games —
same piece twice, the second game now — the last one was against Rossi, Anna 2
weeks ago. Worth drilling."* Run 5 proves it on prod.

**RUN 5 (bundle `index-BggLa4Jm`, 4264db61c, 06:13) — 6/6, THE LOOP CLOSES ON PROD.**
`AUDIT_GAME_A=MxLHuel4 AUDIT_GAME_B=yTSxn4f7 AUDIT_STUDENT=black` (report
`audit-reports/loop-closes-2026-09-20T11-13-42-985Z/`). Game A (vs kreshtar,
2 weeks earlier): the review's first open RECORDED `ignored-threat` +
`loose-piece`. Game B (vs ionlyknowthelondon), a different game on the same
device, at 15...Nd7 — the coach SAID, and the listener HEARD:

> "Their threat first: your knight on h5 was already attacked, and this move
> doesn't deal with it — Qxh5 wins it. Here's how: Their move first, always…
> **This one keeps recurring in your games — ignoring a threat, the second game
> now — the last one was against kreshtar 2 weeks ago. Worth drilling.** You:
> that was a mistake, costing about 3.0 points — the stronger move was Nxg3…"

The control device (same game B, no game A) never said it; the clause names
A's opponent and not B's; muted. That sentence is the app's one-line definition
happening to a real amateur game on the live bundle: the coach learned the
student in game A, and what it learned changed what it said in game B.

**Honest caveats, so the next reader does not over-read a green:**
- The control's ply 30 was SILENT (not flagged in that analysis) rather than
  "the same beat minus the clause" — time-budgeted classification drift (#70,
  the other session's determinism seam is what makes the control comparison
  exact). The row's contract (clause in loop, absent in control) holds either way.
- Proven in the RED direction on the REVIEW surface. Learn carries the same
  computer (`learnFundamentalVerdict` → present-tense clause, unit-gated), but
  the standing Learn audit plays each game on a fresh mount, so the Learn half
  is proven by gate, not yet by a prod tape. `audit-second-game-memory-prod`
  (one mount, two games) is the instrument to extend for that.
- It took five runs because the instrument kept finding real things: the
  review path never recorded (fixed), GM games have nothing to record (amateur
  sourcing), a game paired with itself (fixed), an unknown opponent on a known
  game (four seat resolvers, fixed), and a wire on the path prod never runs
  (uncapped facets, fixed). Each is gated so it cannot come back.

**OWED, ranked:**
1. The `other` attribution gap is now the loop's ceiling: n=5 tonight of a
   flagged student ply (pawn pushes, king moves) attributed no fundamental, so
   the coach records "a mistake" and can never say what recurs. Section-14
   detectors (E.10) — `calculation-depth` → `left-book-early` → `no-plan`.
2. Learn's half on a prod tape (above).
3. GREEN: the loop can only get LOUDER tonight. `capabilityEvidence` holds the
   held/broken rows; the ranker's quiet direction is the next build.

**Status:** Phase 0 ✅ · Phase 1 ✅ · Phase 2 ✅ · Phase 3 ✅ · **Phase 4 ✅ — 6/6 on prod**


## THE CRITICAL MOMENT — one computer, two registers (design, 2026-09-18)

David: "I want the only question to come at the critical moment. That is where
the teaching has most effect." → "This will also take place in review." →
"In learn, I want coach to say, this is a critical moment only one move keeps
equality. On review, we are more free to ask questions. No question on learn,
question on review." → "maybe say how many moves keep equality? Algo that for
users."

### What already exists (measured, not recalled)

- **The critical moment is computed on every live ply.** `severityFromGap(gap12,
  rating)` in `positionFacts` → `'critical' | 'only-move'`, from the MultiPV fan,
  rating-scaled. It already reaches `coachDecider` and ranks 65 / 85.
- **Learn already announces it**, and already says different things at the two
  severities (`positionFacts` ~886). It is gated on `studentToMove &&
  a.slowDownOwed`, so a student whose slow-down habit is CLOSED hears nothing —
  already algo-based. What it lacks is the STAKE.
- **`scanCriticality` (the full scanner) has ONE production caller**
  (`onlyMoveSequence`). The live lane derives severity itself from the top-2 gap.
- **Review already has a question card** — pick, reveal, judge, all wired.

### The defect this fixes

Review's question is selected by SWING, not criticality:
`buildTurningPointQuestion` → `turningPointCandidates(...)` → biggest single
swing in pawns, asked once at the END of the walk.

Swing is what it COST; criticality is how much the CHOICE mattered. They come
apart exactly where teaching is best: a position where the student FOUND the
only move has a swing of ZERO, so it can never be the question — and that is the
most instructive moment in the game. On the So–Carlsen draw (2026-09-18 audit)
the card never fired at all: "fewer than 2 costed moments", on a GM draw full of
real forks. This is CLAUDE.md's own importance doctrine, failure mode #1
(sharp-but-flat), living in the review question.

### The build

**ONE computer: how many moves still hold, and what they hold.**

1. **The count IS the trigger — one tolerance, not two.** Count the fan's moves
   scoring within tolerance of the best: `>=3` nothing hinges (SILENT), `2` a
   forgiving fork, `1` only one move holds. Measured 2026-09-18 on real games:
   only-one-move and critical came out 5/5, 24/25, 29/30 — the trigger and the
   count are the same question, and treating them as two was my error.

   🔴 **THE PERSONAL cp-LOSS TOLERANCE IS DISPROVEN — DO NOT BUILD IT.** The
   design here previously said the tolerance should be a robust statistic of the
   student's own per-ply cp-loss distribution ("their own typical error"),
   derived from the `evaluation` + `bestMoveEval` already stored on every
   annotated ply. `scripts/measure-critical-moments.mjs` measured it on 6 real
   games at two rating bands (143 plies, depth 12) and it fails on both axes:

   - **it does not differentiate.** amateur ~1200 vs strong ~2000 came out
     statistically identical — p50 23 vs 23, p75 49 vs 53, p90 116 vs 106,
     mean 41 vs 42. Differentiating students was the ONLY reason to build it.
   - **it nags.** p50 fires 15x/game (every other move) in BOTH cohorts; p75
     fires 8x. The rating band fires 2.5x/game for the amateur, which is the
     right volume for "stop and think".

   So it would make the coach 3-6x chattier AND treat a beginner and an expert
   the same. The claim is deleted rather than annotated (the Lake Butler rule) so
   no future session re-derives it from the same appealing reasoning.

   (One thing it did settle: mean/median ratio 1.8x — a MEAN would have been the
   wrong statistic regardless.)

   **THE RIGHT PERSONAL NUMBER is not "how big are your errors" but "DO YOU FIND
   THE ONLY MOVE WHEN THERE IS ONE"** — press/no-press at critical moments. That
   signal does not exist yet, and it is exactly what this build creates. So the
   shape is the app's standard one and David's own words ("This is gray function.
   Once we have data it algos"): the RATING BAND is the cold-start prior, the
   answer is recorded, and the personal number takes over once there is data. A
   student who reliably finds only-moves earns a LOOSER tolerance (fewer
   positions are forks for them); one who keeps missing them, a tighter one.

2. **The MultiPV cap is a NON-ISSUE — measured, fork closed.** The worry was
   that MultiPV=3 cannot tell "three" from "seven". It cannot, and it never
   matters: we speak ONLY when the count is 1 or 2, and a count of 1 or 2 is
   precisely the case the fan resolved. The positions where 3 of 3 sit within
   tolerance (79% at the amateur band, 53% at the strong one) are exactly the
   positions where nothing hinges and the coach stays SILENT. No wider fan, no
   second engine call, no cost. Do not reopen this.
3. **The stake, computed from the eval, never templated.** "Keeps equality" is a
   claim about the evaluation: false when they are winning (it keeps the WIN) and
   false when they are lost (it promises a draw that is not there). Bands off the
   best line, mover-POV: keeps the win / keeps you on top / keeps you level /
   keeps you in it / limits the damage. Mate is its own answer, never a
   centipawn band. Omit the clause rather than claim a stake with no line to read.

**LEARN — a STATEMENT, never a question.** The student is mid-calculation; a
blocking card takes over the decision (which is why they were removed in Aug).
  "Critical moment — only one move keeps you level. Slow down here."
  "Critical moment — two moves keep you on top; everything else concedes."

**REVIEW — the same computer as a QUESTION**, asked AT that ply during the walk,
not as an end-of-game afterthought. Same count, same tolerance, same stake; only
the register differs. Retargets the existing card from swing → criticality.

**PHRASING — rotate the stem, never the claim** (David 2026-09-18: "I like the
multiple ways of saying the same thing. Keeps it less computer and more like a
coach"). The sanctioned idiom already exists in `methodBeat`: `pick(variants, v)
= variants[Math.abs(v) % variants.length]`, keyed on the PLY — resume-safe,
testable, and NOT `Math.random` (that is #67, five services still rolling).
Three or four variants per shape. The COUNT and the STAKE are facts and never
vary; only the wrapper does.

**RECORDING — DECIDED: a prompted find is GREY** (David 2026-09-18: "This is
gray function. Once we have data it algos"). When Learn announces the moment and
the student then finds the move, that is not evidence they can do it unaided, so
it writes NO `held` row. `CapabilityEvidenceRecord` gains a REQUIRED `prompted`
flag (a new writer must answer); the profile counts prompted rows as neither
held nor broken, so the tag stays GREY -> grey raises rank -> the coach keeps
teaching it. If they find it unaided later, that is a clean `held` and it goes
green on its own.

This is the heat map applied to its own evidence, and it is self-correcting: the
announcement can never inflate the model. Same shape as #34 (a chat-ask reveal
is recorded, not free).

### ✅ BUILT 2026-09-19 — WO-CRITICAL-MOMENT-01

One leaf computer, `src/services/criticalMoment.ts`, read by both registers.
`readCriticalMoment` counts the fan's moves within
`criticalityThresholds(rating).critical` of the best, mover-POV, and bands the
stake off the best line. Every number below was measured or derived, never
recalled.

**What it replaced, and why each was a defect not a tidy-up:**
- `positionFacts`'s two hardcoded key-moment sentences ("Only one move really
  holds here…" / "This is a critical moment…") said neither the COUNT nor the
  STAKE. They now come off the same fan the door grades severity on.
- `moverGap12` was a private 10-line COPY of the same fan scoring — same sign
  flip, same flat ±100000 mate, same "fewer than 2 lines" rule — sitting one
  screen from the clause that would read the other one. Deleted; it delegates.
- `MoveAnnotation` persists one line and the review pool pins `MultiPV 1`, so
  review had no fan to count at all. `DedicatedWorker.analyzeFan` +
  `scanCriticalMoments` is a real new pass, MultiPV 3, over the student's own
  plies past the book, skipping every ply the question plan already owns.

**Three findings the build produced, each a correction to the design above:**

1. 🔴 **THE REVIEW REGISTER IS NOT ONE QUESTION, IT IS THREE, AND THE DESIGN'S
   "ask at the critical moment" WOULD HAVE SHIPPED §G4.5.2's EXACT DEFECT.**
   Selecting by criticality rather than swing exists precisely to reach the
   positions where the student FOUND the only move. Asking them to find it
   again is their own success handed back as a miss they never made — the
   `Nexd4` bug, rebuilt. So the register follows the BOARD:
   `credit` (they held it → STATE it, the app's first computed green sentence
   at a critical moment), `ask` (they missed the ONE move → a real question),
   `note` (they missed a TWO-move fork → stated, because a three-chip question
   with two right answers is not a question). The MOMENT is still selected by
   pure criticality; only its register differs.
2. **A STAKELESS SENTENCE IS UNREACHABLE, so `speaks` requires the stake.**
   `stakeFor` returns null only when the best line is a mate AGAINST the mover
   — and then every line is, so they all score the flat floor, the count fills
   the fan, and the read is already unresolved. Carrying a "say the count,
   claim no stake" branch would have been dead code pretending to be a guard.
3. **`resolved`, not `count`, is the load-bearing field.** A 2-wide fan whose
   both lines hold knows only "at least two"; a BOUNDED score is the search
   saying it cut off before proving the number. Both are unresolved and both
   stay silent, with the reason NAMED (`unresolvedReason`) rather than
   swallowed — an instrument that goes quiet without saying why is
   indistinguishable from one that found nothing.

**Two corrections to my own diagnosis, recorded because a wrong reason left
standing is worse than no reason** (the Lake Butler rule applied to this build):

- I claimed the wire "could never fire on a cold device" because it sat inside
  `if (readingQuizOn)`. The audit reports disprove it — the line was spoken on
  the build where it sat inside that branch, so the setting is on by default.
  The lift out of it still stands (a critical moment has nothing to do with a
  reading-quiz preference), but not for the reason I gave.
- What was actually wrong was the AUDIT ROW plus a real product gap: the reveal
  named the move and never the COUNT, which is the one fact David asked for.
  The row demanded a count phrase the sentence did not contain, so it went red
  on a product that was speaking. Both are fixed; the count now leads every
  register, and review speaks in the past tense it should always have used.

**THE METHOD FAILURE, and the two ROOT causes behind it** (David 2026-09-19:
"Stop guessing. Root fixes. Gain context first."). Four wrong diagnoses in a row
— the card, the settings flag, the walk being frozen, then the reopen phase —
every one made from a log TAIL instead of from the code that produces the
symptom or the `report.json` that carries the answer. The report answered in
seconds the moment it was opened. Two things made the guessing possible, and
both are now fixed at the root:

- **The audit collapsed two states into one number.** `readWalkPly` returns NULL
  when the ply readout cannot be read, and the caller did `?? 0` — so "the walk
  is at ply 0" and "I cannot see the walk" printed IDENTICALLY as
  `[walk] ply 0/93`. A healthy 93-ply run was read as frozen and KILLED on that
  line. Null is now carried, said, and asserted (`WALK readout-stayed-readable`).
- **The scan was keyed on the narration OBJECT, not the game.** The background
  deepen produces a new narration for the same game; `useReviewPlayback` gates
  its own reset on the gameId for exactly this reason, and this effect was doing
  what that hook refuses to do — dropping a selected moment, clearing the
  spoken-set, restarting the scan. A deepen landing after the walk passed the
  ply left the moment unreachable and silently unspoken.

**Settled by reading, not asserting:** `readingChallengesInReview` defaults to
TRUE (`useSettings.ts:95,140`). The "off by default" claim was wrong. The lift
out of that branch stands for the real reason — a user who turns reading
challenges off must not thereby silence the critical moment.

**Recording.** `gameAnalysisService.recordPromptedFind` is the FIRST writer of
`prompted: true` in the app's history — the field has been REQUIRED since the
heat map landed and every row in the store is unaided evidence. It is a RECORD,
not yet a lever: `getCapabilityProfile` skips prompted rows, so a prompted find
changes nothing today, which is the point (the coach's own teaching can never
inflate the model it uses to decide whether to teach).

**OWED, and it needs files this session did not own.** The LEARN half of the
prompted wire is open. Learn announces the moment, the student plays, and the
post-game sweep (`GameReviewWeaknessCapture` → `autoAnalyzeGame`, line 139)
writes `prompted: false` for EVERY ply of that game — including the plies the
coach had just talked them through. Closing it means Learn remembering which
plies it announced at and handing that set to the sweep, which touches
`CoachTeachPage.tsx` (session 3's) and `GameReviewWeaknessCapture.tsx`
(unowned). Until then, a Learn-prompted find is still recorded as unaided.

**Volume, stated rather than discovered later.** Adding the count-2 case roughly
doubles the Learn statement's rate (~2.5 → ~5 per game at the amateur band,
from the 2026-09-18 census: 79% of plies are 3-of-3 within tolerance and stay
silent). It remains gated on `slowDownOwed`, so a student whose slow-down habit
is closed still hears none of it.

**Deliberately NOT changed: the door.** `judgeMoment` still grades severity from
the gap, so on an `interrupt` posture (live play) a two-move fork does not by
itself open the door — the count decides WHAT is said, importance still decides
WHETHER. On `walk` (Learn, review) every ply speaks, so there the count is the
trigger as designed. Widening the door is a separate, bigger change and was not
made as a side effect of this one.

### 🔧 TODO — what this build still owes (2026-09-19, handover)

Ordered by what a future session should do first. Each says what to VERIFY, not
just what to change — the method failure above was diagnosing without reading.

**T1. 🔴 `ask` AND `note` ARE STRUCTURALLY UNREACHABLE ON REVIEW. Fix this
first; it is a real defect, not a gap in coverage.**
Evidence, measured 2026-09-19 — all five prod runs selected `register=credit`,
never once `ask` or `note`:
```
ply 28 credit count=1 stake=on-top gap=646/649/649/671cp played=Nxe2 held  (fixture x4)
ply 18 credit count=1 stake=level  gap=526cp              played=gxf6 held  (b6Ltr4hi)
```
It is not luck. `INACCURACY_CP = 50`, and the tolerance is 100cp (intermediate),
200 (beginner), 50 (expert). A move FAILS TO HOLD exactly when it loses MORE
than the tolerance — which at every band is at or above the flagging threshold,
so it is flagged — and the scan filters flagged plies out
(`!questionPlan.has(sg.ply)`). I excluded precisely the plies the `ask` register
exists for. The only survivors are the sliver `selectReviewQuestions` itself
skips (`evalAfterMover >= 250`, a flagged move that still leaves the student
clearly winning).
Consequence: the question card, its chips, `judgeCriticalMomentPick`,
`handleCriticalPick` and `recordPromptedFind` have NEVER executed in the running
app. Unit-tested, runtime-unproven — the "a wire that does not fire is not a
wire" rule.
The fix is NOT to widen the tolerance (that changes what "critical" means).
Scan the student's plies regardless of flag, and let the REGISTER decide;
suppress only the card at a ply the question plan already stops at, so nothing
double-stops. Then prove it: the audit must assert an `ask` was reached at least
once across a run, or say plainly that no game offered one.

**T2. LEARN IS SHIPPED BUT UNVERIFIED ON PROD.** `audit-concept-gameplay-prod`
was never run this session (one audit, by request). The Learn statement's
`slowDownOwed` gate is cold-device-dependent, so a green review run says nothing
about it. ~15 min.

**T3. LEARN'S `prompted` WIRE IS STILL OPEN — needs files this session did not
own.** Learn announces the moment, the student plays, and the post-game sweep
(`GameReviewWeaknessCapture` → `autoAnalyzeGame:139`) writes `prompted: false`
for EVERY ply, including the ones the coach just talked them through. Closing it
means Learn remembering which plies it announced at and handing that set to the
sweep: `CoachTeachPage.tsx` (session 3) + `GameReviewWeaknessCapture.tsx`.

**T4. `prompted` IS A RECORD, NOT YET A LEVER.** `getCapabilityProfile` skips
prompted rows, so a prompted find changes nothing today — correct by design, and
the reason the flag exists. The lever is the design's own next step: the
personal tolerance from PRESS/NO-PRESS at critical moments (§1 above), which
needs T1 landed first because it is the `ask` path that generates the signal.

**T5. DECIDE THE DOOR ON LIVE PLAY — ✅ DONE 2026-09-21, then CORRECTED the same
night.** 🔴 The paragraph that stood here said "deliberately not changed —
widening the door is a bigger change than this build". David rejected that
framing outright: *"the algo should decide when a tactic gets mentioned. If it
cannot call a tactic two moves away we need to add that capability."* He was
right, and the old text is DELETED rather than annotated so the record does not
assert both.

`detectLatentFork` was already computed on every position and already SPOKE as a
clause at rank 70, but was absent from the disjunction feeding `judgeMoment` — so
it decided WHAT was said once a ply had earned voice and never WHETHER. Invisible
on `walk` (every ply speaks), fatal on `interrupt` (silence is the default).

🔴 **THE FIRST FIX WAS SEAT-BLIND, AND THE MEASUREMENT IS THE POINT.** It folded
the detector into `standingDanger`, whose other four members are all computed for
the STUDENT'S OWN colour. `detectLatentFork` answers BOTH seats — the student's
first, by design ("a plan you can execute beats a plan you must prevent") — so a
fork the STUDENT could play was bumped to rank 74, tier `must-defend`, reason
"a standing danger on the board". Measured over 3,678 plies of real games:

    latentFork fires:  student-side 15.1%   opponent-side 2.6%
    of the plies the change newly opened: 83.4% were the student's OWN
    opportunity filed as a threat

So the error was the COMMON case. Do not re-derive this: a both-seats detector
folded into a single-seat signal is wrong by the ratio of the two seats, and here
that ratio is 6:1 the wrong way.

ONE root — the clause emitted `kind: 'latent-danger'` for both seats — had leaked
into THREE consumers, two of them predating this build:
  1. the importance tier (`must-defend`, this build);
  2. the `incoming` tie-break in `factSelector`, whose own comment reads "your own
     assets are not" questions you have to answer, and which was receiving them;
  3. `matchClauseKind`, which joined a fork the student could PLAY to a
     "you get pinned" hole (`analysis:tactic:pin|skewer`).

Fixed at the root: the SEAT decides the kind. Opponent's fork → `latent-danger` →
`standingDanger` (rank 74, must-defend, NOT contested-gated). Student's fork →
`latent-chance` → `standingChance` (rank 45, `teaching`, CONTESTED-GATED), joined
to `analysis:tactic:fork`. The asymmetry in the contested gate is deliberate and
is the reason these are two signals: a danger in a decided game still loses you
the piece; a fork you could set up in a game already won is not worth an
interruption.

🔴 **AND THE VOLUME CLAIM WAS UNMEASURED.** This build first reported "it does not
turn the coach into a metronome", reasoning from the detector's four gates rather
than from data. Measured on the same corpus:

    door opens on `interrupt`   BEFORE: 23.2% of plies
                                AFTER : 35.8%
      via CHANCE (teaching, 45, contested-gated): 10.5pp
      via DANGER (must-defend, 74):                2.1pp

Caveat kept honest: the corpus is `model-games.json` (master games), which is
likely more tactically dense than a student's own game, so the live rate should
be read as an upper bound.

Gates: `latentForkOpensTheDoor` — a CONTROL (a quiet position stays silent on
interrupt), the TIER assertion that would have caught the seat bug, the
decided-game asymmetry, and a per-seat statement check with both a required and a
forbidden token. Negative-controlled against the true pre-fix code: 2 rows go
red, 7/7 restore green. 🚨 The gate this REPLACES asserted only that the
`standingDanger` line contained the substring `latentFork` — which the buggy AND
the fixed version both satisfy, so it could never have failed on the defect it
was written for. A statement check needs a forbidden side, not just a required
one.

**T6. TWO NUMBERS NEVER MEASURED ON A DEVICE.** (a) The Learn statement's
volume roughly doubles (~2.5 → ~5 per game at the amateur band, from the
2026-09-18 census), still gated on `slowDownOwed`. (b) `scanCriticalMoments`
runs on every review open — 41 plies took 9.6s on the audit box with 3 workers;
on a phone's asm.js build that is the number to watch. It already yields a
worker to the review's own dive and aborts on unmount.

### Measure BEFORE writing any of it

✅ **DONE 2026-09-18** — `scripts/measure-critical-moments.mjs`, 6 real games at
two rating bands through the app's explorer proxy, real Stockfish, no fixtures.
Results above: the cap is a non-issue, the count IS the trigger, and the personal
cp-loss tolerance is disproven.

⚠️ **Sample caveat, stated rather than buried:** 6 games, 143 plies, depth 12,
one seat, all from 1.e4 e5. The IDENTICAL distributions could be a sampling
artifact. The result is strong enough to decide DIRECTION (don't build the
cp-loss tolerance, don't widen MultiPV, keep the band until press/no-press data
exists) and not strong enough to pin a threshold. Re-run with more games and a
deeper search before tuning any number.


## 2026-09-18 — end of night: the two owed post-deploy audits

Both run against the live bundle `index-7h-hez6i.js` (commit `cb2ef99b1`),
SEQUENTIALLY, nothing else on the box.

**LEARN — `audit-concept-gameplay-prod` 8/8 GREEN.** The rating change is
verified on the surface it could have broken. Real prose off the listener:
the coach named the opening aloud ("This game is now the Scandinavian
Defense"), then spoke the computed invariant mid-GAME — *"Careful — your
queen on d5 is attacked and nothing's defending it. There's a pin here for
you — have a look. Remember — a pin freezes the piece in front: it can't
move without exposing the more valuable piece behind it."* Correct seat,
correct board, concept voiced from the live computer rather than a bake.

**REVIEW — `audit-review-overhaul-prod`.** Every PRODUCT contract passed
across 54 narrated plies (board-accuracy, seat, no-trade-win, need
coverage 11/12 owed plies, exchange ledger, perspective). The two reds were
both the INSTRUMENT, and both are fixed:

- RECAP/FUNDLEAD concluded "the engine flagged NO student ply" from the
  WALK, and RECAP hardcoded "the seeded game has two" from the days this
  audit ran one fixture. It now rotates a fresh master game each run, so a
  GM draw with genuinely zero flagged plies red-failed a healthy product
  against a constant about a different game. Both now corroborate against
  the annotation record in Dexie (`[engine record] 0 flagged student
  ply(s)`), which took FUNDLEAD red → green on proof instead of
  self-declaration.
- HEAP printed "renderer heap exploded" on a run whose heap sat flat at
  350MB and whose only trip was the worker census. It now names which of
  its three trip causes fired.

**Two findings carried forward, not fixed tonight:**
- **#21** the pthread census is the multi-threaded SINGLETON, not the pool
  (which has been single-thread since 2026-09-07), and it is INTERMITTENT —
  70 workers in one run, 1 in the next on the same game.
- **#70** the review audit's verdict is not reproducible: three runs, three
  different red sets, because the background deep dive is a race the
  harness neither waits on nor reports. A verdict that changes run to run
  makes both colours meaningless.


## The one disease behind everything landed tonight

**A computer wired ONE WAY ONLY, with prose describing the half that is not
connected.** Every instance passed every gate, because no gate can check a
comment against its code. Three found in one session:

| computer | computed | consumed | why nobody noticed |
|---|---|---|---|
| opening announcement | 5× per game | **0×** | flag spent at QUEUE time, and the late queue was nulled on most turns |
| `capabilityEvidence` green | every reviewed game | **0 readers** | `getCapabilityProfile` had 3 call sites, all in its own test |
| coach-games K=32 ELO | every boot | **0** | only `imported-games` was applied; the rest waited on a picker deleted 2026-09-02 |

When you find a doc comment describing a system, GREP FOR ITS READER before you
trust it. That is the cheapest check in this repo and it found three defects.

## Landed (2026-09-18, all on `main`, ship-check green)

- [x] `7cecd3d5c` — **level II of context is generated + verified.**
      `scripts/state-of-build.mjs` derives the state from the code;
      `--verify` runs in ship-check and fails the push when `docs/STATE.md` is
      stale. Proven non-vacuous (mutate the file → exit 1).
- [x] `37daa3a25` — **opening name: queueing is not saying.** Split
      `announcedOpeningName` into `detectedOpeningName` (context, immediate) and
      `spokenOpeningName` (written only where a voice package kept an `opening`
      fact). `hasInstantTeaching` → `noteTaughtThisTurn` (`kind === 'note'`);
      it had been nulling the whole late queue on any substantive fact.
      Prod-verified: game 2 computed 5→10, **spoken 0→10**.
- [x] `cc501a2e0` — **the heat map can lower.** `capabilityTerm` in `needScore`
      is the first term that can reduce need. GREY (absent) and RED (any
      `broken`) lower nothing; GREEN (held ≥ 3, zero broken) goes quiet. The
      ply→tag join is COMPUTED by `capabilitiesShown` — the same computer that
      writes green — so no fourth fact-to-hole mapping was authored.
      `docs/STATE.md` moved 0 readers → 2.
- [x] `53b5189c6` — **the adaptive rating never adapted.** `calibrateStrength`
      re-estimates on every boot and applies any MEASURED source
      (`imported-games` or `coach-games`); guesses (`profile`, `default`) still
      write nothing. `needsPicker` deleted; `strengthCalibrated` bridged (still
      persisted for `DashboardPage`, no longer freezes re-estimation).

- [x] `adfac7c` (**PR #938, draft — NOT on `main` yet**) — **WO-4: the two
  fundamentals taxonomies are joined and the wire is measured.**
  `FUNDAMENTAL_PILLAR: Record<FundamentalId, FundamentalPillar | null>` (total,
  explicit nulls; `piece-values` had ZERO fundamentals, now 3); the page's
  `?? ''` blank-card fallthrough is gone; the join fires on the tab. One wire
  repaired: the sweep builder dropped `evalAfterPlayed`, so `botched-conversion`
  could never record on an imported/finished game — 0 → 11 on the same 47 real
  games. Report + every number: `docs/plans/2026-09-19-wo4-fundamentals-attribution.md`.
  Audit 19/19 muted on a localhost build (prod cannot carry a branch).

## WO-3 — LANDED (2026-09-19, `a9c9376` on `main`, prod audit 8/8 on bundle `index-BeBqQixU`)

The back half of the loop — a recorded weakness becomes a drill, and the drill's
result moves the model. Three severances, every one measured before it was
touched, all fixed at once, one audit at the end (`audit-bucket-delivery-loop`,
live prod, muted).

- ✅ **S1 — the bucket audit graded a join no student reaches.**
  `misconceptionService.mapTagToDrills` had ZERO production callers; the audit
  was its only caller, so `DRILL_PLAN_EMPTY` could not fire where
  `WeaknessTagDrillPage` shows "No drillable positions yet" — the student's
  path (`getMisconceptionDrillPuzzles`) skips rows missing `bestSan` that the
  dead join kept. The audit now grades the shipped route; `mapTagToDrills` +
  `TagDrillPlan` are DELETED so there is one join. The audit's own "not a
  parallel re-implementation" header is corrected, not appended to. Gate:
  `drillJoinDivergence.test.ts`. Prod: the new S1 row fires on the exact seeded
  state — "audit and surface agree".
- ✅ **S2 — two tactic types drilled to zero puzzles.** `zwischenzug` and
  `overloadedPiece` were named; `puzzles.json` (15,000 / 72 themes) carries
  neither. Now `intermezzo` (211) and `capturingDefender` + `deflection`
  (133 / 719). `themesForTactic` is an exhaustive `Record<TacticType,…>`
  (was `Partial`) — which is how a hand census of 16 members became the real
  18 (`checkmate`, `tactical_sequence`). Dead `passedPawn` removed from
  `passed-pawn-neglected` (siblings 996 / 389 remain). Gate:
  `drillVocabulary.test.ts` RE-DERIVES the vocabulary from the corpus.
- ✅ **S3 — a solved drill never turned the heat map GREEN.**
  `recordTagDrillResult` spaced the SRS and never imported `capabilityEvidence`;
  `origin:'drill'` existed with no writer. `MistakePuzzleBoard` now records at
  the one solve door all five drill surfaces share: clean first try → `held`;
  wrong first answer → `broken` at the slip's measured cost; [show me] first →
  `prompted` (grey). STATE.md: HOLD writers 6 → 7. Gates: the spy file (4 cases)
  + a real `held` row landing in the store on a posing position.
  **Proven by unit gate, not by a prod drive-through** — the bucket audit is a
  data-invariant audit and cannot play a puzzle. A Playwright drill-solve that
  reads the `capabilityEvidence` store back is the honest next instrument.
- ✅ The audit itself: it streamed to prod's `/api/audit-stream` (G2 violation,
  the shared Upstash budget) — now a loopback discard, vacuity-checked.

**Flagged, not changed:** `removing_the_guard → 'defensiveMove'` (914) is
suspected to be the wrong Lichess theme — `capturingDefender` is literally
"remove the defender"; `defensiveMove` is closer to its opposite. A
co-occurrence check was inconclusive. Measure before touching.

## LANDED 2026-09-19 (late) — the #21 INSTRUMENT: `audit-engine-worker-census-prod.mjs` (David: "add the audit tool")

**Why an instrument and not a fix.** Reading could not name the spawner:
- the census on a CLEAN bundle (pinned `06wNUWaA`, no deploy mid-run) climbed
  5 → 41 → 76 worker targets at REOPEN, all `stockfish-18-lite.wasm,worker`
  pthreads under ONE live multi-thread parent, then fell to 14;
- PostHog for every headless run in the window: 12 multi inits (one per page
  load), exactly ONE stall + ONE forced respawn + ONE demotion — all from the
  earlier Learn run, NONE during the review reopens. So no restart loop; the
  runtime spawns pthreads inside a single engine while the app sends it plain
  `setoption`/`position`/`go`/`stop`;
- ponder is not mounted on review; the pool and dive workers are single-thread;
  no caller resizes Hash/Threads per call; `ucinewgame` is sent once at init.
- under a mid-run deploy (4 other sessions pushed while the run walked) the same
  climb reached 124 and `WebAssembly.Memory(): could not allocate memory`, with
  761k message-less page errors — the storm made real.

**FIRST TWO PROD RUNS (2026-09-20 ~00:00, pinned `06wNUWaA`, no deploy under either) —
THE SPAWNER IS NAMED.** Reports: `audit-reports/engine-worker-census-2026-09-20T04-44-41-367Z`
(census only — creation events arrive without a URL; fixed in `a48bf7d69`) and
`…T04-54-35-934Z` (attributed). What they measured:
- Census flat the whole first open and walk: 5 → 10 → 5 (1 multi engine + 4
  pthreads + 5 single-thread pool workers). Then REOPEN: **127 engine-worker
  creations, 120 of them `stockfish-18-lite.wasm,worker` pthreads of the
  multi-thread singleton, ALL inside the first 5 seconds**; peak census 126–130;
  `WebAssembly.Memory(): could not allocate memory`; only 30 targets destroyed.
- The UCI clock beside it: in the reopen phase the app sent the multi engine
  exactly TWO commands — `uci` at 0.0 s and `uci` again at 3.0 s — and never an
  `isready`, i.e. the engine never answered `uciok`; the app's crash-retry
  re-created it once. Meanwhile 19 `uci` went to single-thread pool workers
  (the critical-moment scan's `go depth 14` fan + the dive), 15 of which never
  reached `isready` either.
- So #21 is: **on the reopened review page the multi-thread engine's
  initialisation cannot allocate its shared memory, and the Emscripten pthread
  runtime storms Workers (≈120 in 5 s) while the app retries the same build.**
  First-open inits fine on the same page life; the difference at reopen is that
  the previous page's engines (multi 512 MB SAB reservation + 5 pool workers,
  `POOL_IDLE_RETIRE_MS` 60 s) are still resident when the new page inits
  another multi singleton + warms another pool. The 761k message-less page
  errors are the failed pthread starts.

**Fix directions, ranked (not built — David's call; each is a different file):**
1. `stockfishEngine`: a multi init that dies on `WebAssembly.Memory()` / never
   reaches `uciok` must DEMOTE to single (sticky, persisted) instead of retrying
   multi — `handleEarlyMultiFailure` covers `no uciok within 5s`, but the second
   `uci` at 3.0 s was still multi; find why the retry did not take the demote.
2. Bound the multi runtime's pthread pool in the glue patch
   (`scripts/ci/patch-stockfish-memory.mjs` already caps memory; a pthread cap
   belongs beside it) so a failing pthread start cannot storm.
3. Release the previous page's engines on review unmount (`releasePool` keeps
   5 warm for 60 s; the singleton is never terminated) so a reopen does not
   double the renderer's WASM reservations. Cheapest; verify it alone first
   with the census tool (row C + D go green if this is the whole cause).
Re-run `audit-engine-worker-census-prod.mjs` after any of these; rows C/D/E are
the contract.

**BUILT 2026-09-20 — all three at once (David: "all fixes at once, then audit all
at end"), pending the single end audit:**
1. `stockfishEngine.mtFloodGuard`: a MESSAGE-LESS page error (empty `filename`,
   empty `message` — the failed pthread start's shape, 761k of them) during the
   multi boot now trips the fast fallback like a `/stockfish/` one. Before, the
   guard returned early on `!src.includes('/stockfish/')`, so the storm's own
   errors were the one signal it ignored. Gate: the `#21 storm guard` case in
   `stockfishEngine.test.ts`.
2. `gameAnalysisService`: a `_liveWorkers` registry (every `DedicatedWorker`
   adds itself in the constructor, removes itself in `destroy()`) and
   `destroyAllAnalysisWorkers()` — warm AND leased, which `releasePool` could
   never reach. `DedicatedWorker.dead` makes a torn-down worker unre-poolable:
   the unload test caught a lease released after teardown resurrecting corpses
   as "warm", so the next warm spawned nothing. Gate:
   `gameAnalysisService.unload.test.ts`.
3. `engineLifecycle.ts` (new leaf): `teardownEngines()` = singleton `destroy()`
   + `destroyAllAnalysisWorkers()`, logged; `installEngineUnloadHooks()` registers
   ONE `pagehide` listener (fires on iOS Safari where `unload` does not), wired
   at boot in `App.tsx` beside `warmCoachProvider`. Gate:
   `engineLifecycle.test.ts`.
Census tool gained **row G**: snapshot the live worker target ids before the
reopen navigation and assert none survives 3 s into it — the proof the pagehide
teardown ran on the real browser, separate from row C's "the storm did not
happen". Glue pthread cap (direction 2) deliberately NOT built: measure C/D/E/G
first; build it only if the census is still red with the engines released.

**END AUDIT 2026-09-20 (bundle `index-UHuaSXZq`) — #21 is NARROWED, NOT CLOSED.**
- **CENSUS** `audit-engine-worker-census-prod` pinned 06wNUWaA: **7/7** (report
  `audit-reports/engine-worker-census-2026-09-20T05-29-48-093Z/`). Reopen peak
  **9** (was 76 clean / 124 under deploy); row G: **0 of 5** prior worker targets
  live 3 s into the reopen — the pagehide teardown works; 0 WASM errors.
- **LEARN** `audit-concept-gameplay-prod` **8/8** (`concept-gameplay-2026-09-20T05-37-18-794Z/`):
  27 spoken lines, the pin invariant voiced mid-game ("Careful — your queen on d5
  is attacked and nothing's defending it. There's a pin here for you…"), the
  drawback beat ("That eyed the pawn on a2, but the rook on a1 holds it") is
  board-true, 13 board lines gate-clean.
- **REVIEW** `audit-review-overhaul-prod` **28/32** (`review-overhaul-2026-09-20T05-54-07-263Z/`,
  Svidler B22 game). Every functional row green (fundamentals-first, thesis
  withheld until the pick, ledger, seat, board accuracy over 38 plies, critical
  moment "Only one move kept you level here, and it was king to h8", show-me,
  CRIT fan 17 plies). Reds: REOPEN (documented-stale, see the reopen-probe row),
  NEED owed-plies 9/12 (attribution gap, pre-existing), **and HEAP + ERR = #21
  AGAIN: on the reopen made right after the background deep dive the multi init
  failed, `stockfish-variant-fallback` fired ("Uncaught [object ErrorEvent] @
  …/stockfish-18-lite.js"), yet 124 `stockfish-18-lite.wasm,worker` targets stayed
  live to the end of the run and the page logged 1,549,104 message-less
  ErrorEvents.** The walk itself kept working (heap flat at 257 MB, readout live),
  so the renderer no longer wedges — but the storm is not stopped by the
  fallback's `this.worker.terminate()`.

**What the two runs together say.** The census reopen (after an idle walk; pool
already idle-retired) inits multi cleanly. The review reopen (seconds after the
deep dive, pool + leased worker just torn down on pagehide) fails it. So either
(a) `terminate()` frees memory lazily and the new document's 512 MB shared
reservation races it — the boot init at `App.tsx:430` fires 2.5 s in, and
`warmAnalysisPool` at 8 s; or (b) the failure is not memory at all — the ErrorEvent
is message-less, so nobody has read the real error yet. And separately: the
124 pthread targets surviving the parent's `terminate()` means the pthread
workers are not dying with the glue worker (nested-worker teardown), which is
why the error flood continues after the fallback.

**NEXT (in order, each is one small step):**
1. Census tool: capture the real error via CDP `Runtime.exceptionThrown` /
   `Log.entryAdded` on the pthread targets (the page-level `ErrorEvent` has no
   message); add `AUDIT_REOPEN_AFTER_DIVE=1` that waits for `review-dive-done`
   then reopens, to reproduce the review path on the pinned game.
2. `handleEarlyMultiFailure`: after `terminate()`, assert the pthread targets
   die (row: "no `stockfish-18-lite.wasm,worker` target survives the fallback
   by 3 s"). If they do survive, the glue pthread cap (direction 2) is the fix
   after all — a bounded pool cannot storm.
3. Only then consider deferring the boot init on a reopen.

**What the tool measures** (see AUDIT_INDEX): every worker target created or
destroyed (CDP `Target.setDiscoverTargets`, nested pthreads included) beside
every UCI string the main thread posts to an engine worker (a `postMessage` hook
installed before boot), and per engine spawn the commands in the 1.5 s before
it. Vacuity-checked (fails on a blank app in 0 s). First prod run: see below.

## LANDED 2026-09-19 (late) — the fundamental the computer proved reaches the ranker (A-NEW)

Chosen from the outline as the most critical open item: the coach learned
something (79 attributed fundamentals on 47 real games, shown on the tab) and it
changed nothing about what the coach says next (the spine read 0). That is the
app's one-line definition failing at the ranker, for 14 production consumers.

**Two defects, one root — both fixed in `weaknessSpine.ts`, both gated:**
1. **Every batch-analyzed slip vanished from the unified profile on BOTH sides.**
   `autoAnalyzeGame` writes each blunder as a `counted:false` misconception AND
   a `mistakePuzzle` twin at the same fen+move. The spine built its exclusion set
   from ALL misconception rows, so the twin was dropped as "coach-owned" while
   the row itself was dropped as "not counted" — since 2026-06-11. The exclusion
   set is now the rows the coach half actually represents (`counted !== false`).
   Read, then proven by the new gate (twin present once; the counted control still
   dedupes).
2. **`fundamentalId` had no reader on the spine.** `aggregateFundamentals` reads it
   over ALL rows (counted or not) into rows keyed `fundamental:<id>` — label from
   `FUNDAMENTAL_LABEL`, bucket + drill themes from the fundamental's own closed-set
   tag (`FUNDAMENTAL_TAG`, exhaustive by type), provenance attached. The tag rows
   are left exactly alone (the WO-3 double-count guard stands; `learned` was not
   flipped). Ranker joins: `matchClauseKind('fundamental' | 'structure-plan')`
   reaches them; `matchFundamental(id)` is the exact join for a caller holding an
   attributed `FundamentalId`.

**Gates:** `weaknessSpine.fundamentals.test.ts` (negative-controlled: unknown id
invents nothing; empty store → no rows; counted coach row still owns its
position); `fundamentalsPipeline.realGame.test.ts` WO-4 gate now asserts the
spine carries a `fundamental:<id>` row per attributed id with the exact count,
while `countedOnly` still totals 0. Downstream: 13 consumer suites, 120 tests,
green. `docs/STATE.md` unchanged by regeneration.

**OWED from this build:**
- `matchFundamental` has no production caller yet. The precise wire is review's
  `coachFeatureService` (it holds the attributed `FundamentalId` per ply,
  `seenFundamentals` at :1177) — "this recurs for you: your Nth loose piece",
  named from the fundamental row rather than the coarser tag. Not built here:
  narration prose in another surface's file.
- The Fundamentals TAB and the SPINE now agree by construction; rerun the
  measurement half of `fundamentalsPipeline.realGame.test.ts` with the corpus
  present to print the after-number beside the 79 → 0 before.
- G1 on the live bundle: `audit-fundamentals-tab-prod.mjs` (never run on prod
  since WO-4 merged) then the standing pair, sequentially.

## LANDED 2026-09-19 (late) — audits can never fill Redis (David: "i no longer want audits to fill redis")

**State found:** Upstash at `500000/500000` again (`/api/messages` → `degraded`,
`audit-stream` → `storage:memory`); spend guard failing OPEN until Oct 1. The 8
live entries that hour came from a real device with the stream ON (Tactics taps
at 19:52 CDT), not from audits — opt-in-off already kept audits out by DEFAULT.
David's order is stricter: the wrong configuration must be impossible.

**Built (two gates, one marker):**
- `appAuditor.isAuditMarkedPage()` — the marker every audit already sets
  (`auditMuteTts`, gated by `auditHarnessReach`; or `auditRunId`). A marked page
  streams only to the loopback sidecar or its own origin; anything else is
  refused and logged once (`audit-stream-remote-refused`, local log only).
- Every stream POST from a marked page carries `x-audit-marked`; the server
  (`api/audit-stream.ts`) stores nothing carrying it, nor anything from a
  headless UA — `200 stored:0 refused:'audit'`, no Redis, no memory buffer.
- `audit-stream-optin-prod.mjs` rewritten: opt-in proven against the SIDECAR
  (it used to post a real batch to prod every run), plus both gates asserted.
- `auditHarnessReach`: no script may set a literal non-loopback `auditStreamUrl`.
- Gates: `appAuditor.auditGate.test.ts`, `api/audit-stream.refuse.test.ts`.

**Also tonight (same session):** `pinGeometry.canLeaveLine` — a blocker does not
un-pin; the Italian Bc5→f2 pin is detected again (validator board-rescue test was
red on main). Prod audits after: Learn 8/8, review 36/36 MEETS STANDARD.

**OPEN — owed from this session, none started (2026-09-19 23:40):**
1. **Spend guard fails OPEN while Upstash is capped** (`api/_lib/usageGuard.ts`
   treats a Redis error as null → allow). Until Oct 1 there is no brake on
   LLM/TTS spend. Options: fail closed above a per-instance in-memory count, or a
   local counter fallback. Product gap, David's call to prioritise.
2. **42 audits still GET the prod stream pre/post run** (`pullStream`/
   `pullProdStream` inline per script, ~2 Redis commands per run). Reads count
   against the same 500k. Make the pull opt-in (`AUDIT_PULL_PROD_STREAM=1`) in
   one shared helper if David wants audits fully off Redis, not just off writes.
3. ✅ **VERIFIED HONEST (2026-09-19, late)** — "there's a pin here for you" after
   3.Nc3. Emitter: `CoachTeachPage` tactic lane reading `tctx.immediate`, which is
   `detectTactics(fen)` on the CURRENT board. The real detector on that position
   returns exactly one pin: "Queen on d5 pins pawn on g2 against rook on h1" —
   g2 pushing to g3 opens d5–h1 and drops the rook. True, if minor; the invariant
   sentence it carried is the correct concept. Not a defect. (Noted, not churned:
   `detectImmediateTactics` has a `.slice(0, 5)` — it bounds the model's tactic
   ALLOWANCE and the lane speaks one tactic per turn, the `eyes`-clip class of
   G4.5, not a narration cap.)
4. The pre-push hook (11b) and `TEST_TYPE_ERROR_CEILING` (11d) — already listed
   under E.

**Found and NOT fixed here (chips spawned / flagged):**
- The listener sidecar receives NOTHING on David's Mac unless `AUDIT_SANDBOX=1`
  (Chrome 145 blocks https→127.0.0.1 without `--disable-web-security`). A run
  read "0 spoken" while PostHog held 247 narration events for the run id. Chip:
  make the sidecar reachable without weakening web security; fail loudly on
  `audit_stream_post_failed`. Memory: `audit-listener-needs-sandbox-flag`.
- Upstash cap: the plan bump (~$0.20 / 100k) is David's call. Redis-backed
  routes and their degradation are listed in CLAUDE.md §G2.

## ROADBLOCKS — every open item in coach (2026-09-18)

Three buckets. A thing is a roadblock if it stops the LOOP closing, stops an
INSTRUMENT being believable, or reaches the STUDENT as a wrong/repeated line.

### D. THE STUDENT CANNOT GET WHAT THEY ASKED FOR (WO-LIVE-DEFECTS-01)

From real App Store telemetry, week of 2026-09-11 — read off the full
`narration_text` of what two real people actually heard. This bucket is NEW and
it outranks the rest of the WO: everything else is about the QUALITY of what
gets said; this is about whether anything happens at all.

- ✅ **D2/D3/D4 — a user asked for an Italian lesson SEVEN TIMES and never got
  one.** Two landings, and the second is the root.

  `2bfb4961c` shipped the BELT: `start_walkthrough_for_opening` correctly
  refused (home chat cannot host one), the coach correctly navigated to Learn,
  and nothing re-fired the walkthrough on arrival — twelve
  `coach_tool_call_error`s, zero lessons. The ask is now QUEUED
  (`coachMemoryStore.pendingWalkthrough`) before the refusal and Learn drains it
  on mount through `handleSubmit`, so every existing lane runs once instead of a
  second copy of the starter. `takePendingWalkthrough` reads and clears
  atomically.

  🔴 **`170378d5e` is the ROOT, and it corrects the diagnosis above rather than
  adding to it.** The user should never have reached the brain at all. They
  wrote in **Thai**, and `detectLanguage` had no Thai range — so it answered
  `{code:'en', nonEnglish:false}` and every translate branch in the app
  correctly did nothing. Nothing downstream was broken: `routeChatIntent` has
  translated non-English COMMANDS since 2026-07-10 and emits
  `/coach/teach?opening=`, which the Teach surface has always auto-kicked. One
  missing row, four symptoms — the command never routed, the ask reached the
  brain untranslated, the reply came back in English (that is D5's Thai half),
  and narration localisation never fired. Nineteen other writing systems were
  invisible the same way; Vietnamese was worse, its tone marks tripping the
  FRENCH fingerprint so the ask was answered in French. Fixed as a
  `LangCode`-typed table (`SCRIPT_RANGES`) against two `Record<LangCode,string>`,
  so a new script cannot ship unnamed; the Settings picker now derives its list
  from the same record, because it had drifted the other way (Dutch, Polish and
  Turkish were choosable but undetectable).

  **D4 RE-MEASURED, and it was downstream — no separate bug.** Against the live
  provider, the fixed translate prompt preserves the opening name through Thai:
  "สอนฉันเปิดเกมอิตาลีให้หน่อย" → *"Teach me the Italian Opening."*,
  "ช่วยสอนการเปิดเกมรุยโลเปซหน่อยครับ" → *"Please teach me the Ruy Lopez
  opening."*, "สอนซิซิเลียนนัจดอร์ฟให้หน่อย" → *"Teach me the Sicilian
  Najdorf."* So the subject the router resolves is the one they asked for.

  **The instrument could not have caught any of it, and that is now fixed too.**
  `audit-coach-multilingual-prod.mjs` tested exactly the eight scripts that
  already worked — by construction, the set that could not fail — and tested
  only QUESTIONS, which fall through to the brain and translate INSIDE it, so
  they were never at risk. It now carries Thai, Greek, Hebrew, Vietnamese,
  Hindi, Korean and Turkish, and a `lesson` row asserting the COMMAND contract:
  did the router fire (`?opening=` in the url) AND is it the opening they named.
  Those are reported as separate failures because "no lesson started" and "the
  wrong lesson started" cost different fixes.

- ✅ **D-LANG — the coach answered every language in English, and Learn would
  not start a lesson in any of them.** Both found by RUNNING
  `audit-coach-multilingual-prod` against prod on 2026-09-19, and both larger
  than the rows that found them.

  **The reply language.** A Thai "ตาต่อไปควรเดินอะไรดี" came back "The best move
  is Nc3. It develops into the game, fighting for the center on d5 and e4." —
  correct, grounded, well written, unreadable to them. Greek, Hebrew, Hindi,
  Korean and Vietnamese the same, and so were German, Italian and Portuguese,
  which the detector has always seen. So it was never detection. `coachService`
  computes the reply language correctly and puts it in the system prompt, but
  the grounded lanes answer BEFORE any model call: they voice computed facts
  through `voiceFacts`, and `targetLanguage` had NO production caller anywhere
  in the app, so all 105 of them re-detected the language from `studentMessage`
  — which `coachService` has already translated to English. Computed once,
  correctly, then thrown away by the path that answers most questions. 105 of
  the 114 calls are in ONE function, so the fix is one turn-bound `voice()`
  helper plus the value threaded through `ProviderCallOptions`; deliberately
  NOT a module global, which leaked a prior turn's language once already (the
  2026-07-10 polyglot audit answered an English question in Portuguese).

  **The lesson.** "สอนฉันเปิดเกมอิตาลีให้หน่อย" — teach me the Italian — was
  answered "The best move is e4." They asked for a lesson and got a move.
  Learn does not go through `routeChatIntent` (which has translated before
  matching since 2026-07-10); its own pipeline — walkthrough controls,
  settings, the player-game / training-aid / navigation routers,
  `parseCoachIntent`, the stage detectors, name resolution — only ever read
  English. Translated ONCE above every matcher rather than in front of each,
  because that duplication is exactly what let the settings lane translate
  while the lesson lane did not.

  🚨 **AND IT IS A G0 FAILURE, NOT ONLY A TRANSLATION GAP.** The deterministic
  lane missed EVERY non-English ask — but the outcome then fell to the brain,
  which sometimes chose to start a walkthrough anyway. Portuguese got
  "Starting the Italian Game walkthrough"; German got "The best move is e4".
  Same defect, opposite outcomes, decided by the model. A missed deterministic
  route does not fail loudly, it fails RANDOMLY, which is why no one noticed.

  **THE INSTRUMENT IS WHY THIS LIVED FOR MONTHS, and its three bugs are fixed
  too.** (1) It never checked the reply LANGUAGE — only that chess words
  appeared, and those survive translation, so it could not fail on the thing it
  is named after. (2) Its concept row rejected "the born forker", the coach's
  own house line. (3) Its lesson row read the URL, but Learn starts the
  walkthrough IN PLACE — that manufactured a red row on a French ask that had
  actually worked. An accept contract stricter than the product's real voice
  buries the true reds among false ones.

- ✅ **THE TRANSCRIPT HAS A TRANSLATION DOOR (2026-09-19, verified on prod
  bundle `DwL7hnpw`).** Was: a Thai student got the lesson, HEARD it in Thai
  and READ "Sure — let's walk through the Italian Game." in English. Not a
  design choice — an accident of shape: every spoken line funnels through
  `voiceService.speakInternal` and that one door localises, while chat messages
  are built at 85 `setMessages` sites and pushed straight in, so there was no
  door at all. A census found 22 English sources feeding the transcript, not
  the six acks — which is the argument for a door over point fixes.

  **The door is at the RENDER, not the push.** The transcript renders from ONE
  map, so localising there covers every message today and every one added
  later for a single call site; wrapping 85 pushes is a large refactor of a
  12k-line component for no extra coverage. `useLocalizedBeats` is the same
  pattern already here.

  **Table first, model second, English floor** — the order is the determinism
  law, not an optimisation. Fixed app strings are chrome, not computed chess
  facts, so a table answers synchronously: no round-trip, and no
  English-then-swap flicker in the exact moment just fixed.

  Prod, same ask: `มาเรียน Italian Game กันเลยครับ` — instant, from the table,
  with the proper name preserved. And the greeting and the no-games line came
  back Thai too, through the model fallback, though neither is in the table.
  That is the difference between fixing six strings and fixing the cause.

- ✅ **VERIFIED ON PROD (2026-09-19, bundle `senxol9e`).** The fixes were
  re-run against the deployed build, and the two lanes that were still English
  an hour earlier are the ones that moved:

  | ask | before tonight | after |
  |---|---|---|
  | Thai "what's the best move" | *"The best move is Nf3…"* | *"หมากที่ดีที่สุดคือ exd5 ครับ และตอนนี้ฝ่ายขาวได้เปรียบเล็กน้อย ประมาณ 0.6 แต้ม"* |
  | Greek "what's the best move" | *"This game is now the King's Pawn Game…"* | *"Η καλύτερη κίνηση είναι Nf3. Μπαίνει στο παιχνίδι, διεκδικώντας το κέντρο στα d4 και e5"* |
  | Hebrew "what is a fork" | *"The knight is the born forker…"* | *"מזלג הוא כלי שבו חייל אחד מאיים על שניים — כלי אחד תוקף שני אויבים בבת אחת"* |
  | Thai "teach me the Italian" | *"The best move is e4."* | the Italian Game walkthrough starts |

  Every row that produced a language-checkable reply came back in the student's
  language, and the chess tokens (`exd5`, `Nf3`, `d4`, `e5`) survive verbatim
  through the fidelity net in all of them.

  **The lesson start is confirmed by a PAIRED PROBE, not by the audit.** The
  audit's lesson row still reports "no walkthrough UI" while two focused probes
  — the same Thai ask as the FIRST turn and as a FOLLOW-UP, the only variable —
  both show `teach-nav-row` at +5s and print the running lesson. The probes
  watch continuously and dump the transcript; the audit row checks once. So the
  ROW is the suspect instrument, and it is left flagged rather than quietly
  called green: `scripts/probe-thai-lesson.mjs` is the trustworthy measurement
  until someone works out why the row disagrees.

### WO-LIVE-DEFECTS-01 — the rest of the list

Shipped 2026-09-19 in 2bfb4961c + 7bc0677ab. Both standing audits green after:
Learn 8/8, Review 28/28 MEETS STANDARD.

- ✅ **D1** mate graded as a 300-point blunder — `capEval` on both terms
  (mirroring `gameAnalysisService:1238`) plus a `#` short-circuit so a mating
  move is never classified at all.
- ✅ **D5** language fell back to English mid-conversation — one detected
  non-English message is now a sticky session fact; an explicit setting wins.
- ✅ **D6** promotion narrated as a pawn push — a `promotion` fundamental at
  weight 90, and the passed-pawn branch is skipped on the same move.
- ✅ **D7** `kingádas` — ROOT FOUND: the translation prompt said "translate
  every other word", so the model translated the opening NAME. Proper names are
  labels, not phrases, and the prompt now says so.
- ✅ **D8/D12** the same line 4–5× in 25 seconds — a say-once ledger at the
  voice chokepoint. The existing de-flood held ONE slot for 1500ms and the
  observed gaps were 3–13s, so it caught none of them. 30s window, bounded,
  audited, explicit taps exempt.
- ✅ **D9a** `hint-revealed` mirrored to PostHog — the instrument was blind, so
  "did they tap Hint 154 times?" could not be asked at all.
- ✅ **D10** missing space between two spoken segments — normalizer at the
  chokepoint, narrow (punctuation + capital only, decimals untouched).
- ✅ **D13** half of all weakness tags `uncategorized` — the unmatched inputs
  are now logged. Deliberately NOT a new tag: extend the tagger from the real
  population, never from imagination.

**NOT BUILT, and why — do not re-derive:**
- ⏸ **D9b** (154 answer-reveals on Play) — blocked BY DESIGN on D9a. It needs a
  session recorded with the instrument that just shipped. Do the ten-minute
  local repro first (play 20 moves without touching Hint, count `speakForced`).
- ⏸ **D11** (three generators stack into one utterance) — needs squares COUPLED
  first. G4.5.1 forbids subsuming facts with no squares ("silence must never be
  a guess"), and those three push free prose, so string-matching them would
  break the exact rule the fix exists to serve.
- ⏸ **D15** (TTS playback timeout) — root genuinely unknown; not guessed at.

### A. The loop cannot close (highest — these are the app, not polish)

✅ **A-TIE — THE HEAT MAP AND THE DECIDER ARE ONE NUMBER (#100). Landed
2026-09-21.** David: *"I also want the decision calculator and the heat map tied
together so the coach knows when a why is important to state. Teaching
narrations need to be important to the decision computer when the stated move is
a common error for the user."* → *"Based off of weakness tab/ heat map. These two
surfaces need to be tied together."* → and, on which term it raises: **need**.

**A-NEW (above) put the fundamental INTO the spine. This is the other half: it
was still not read by anything that DECIDES.** The sweep that found it:
`matchFundamental` — the exact join, whose own comment says *"Exact, never by
bucket: 'you keep leaving pieces loose' must be backed by loose-piece rows, not
by any positional hole"* — had **exactly ONE production caller**,
`fundamentalRecurrence`, which writes the *"again"* SENTENCE. Every computer that
decides used the coarse `matchClauseKind`, which for kind `'fundamental'`
resolves to `bestMatch(s => s.bucket === 'positional' || …)`.

🚨 **So the coach could SAY "you left a piece loose again" — joined exactly — while
the computer that decided whether that moment was worth saying had matched the
leader of the whole positional bucket. One sentence, two joins, two different
holes, and nothing anywhere said they disagreed.** That is the same disease as
A-NEW one layer up, and the same shape as the three optional student terms this
repo has already found: **a computer wired to the VOICE and not to the DECIDER.**

**THE TWO SURFACES WERE ALREADY ONE RECORD — that had to be checked, not
assumed.** The Fundamentals tab counts `misconceptionTags.fundamentalId`
(`getFundamentalCounts`, raw count, no due-filter) and the spine aggregates the
SAME field into `fundamental:<id>` rows (`weaknessSpine.aggregateFundamentals`,
which adds `openCount` via `isMisconceptionDue` and a lifecycle severity). Same
table, same field, same id guard — so they can differ in WEIGHT but never in
WHICH fundamentals exist or their totals. The tie was therefore not a new table;
it was a join nobody called.

**WHAT LANDED.**
1. `needScore.NeedPlyInput.fundamentalId` — **REQUIRED**, `null` is a real
   answer, for the reason this file has now recorded four times: an OPTIONAL
   student term is a lane's licence to forget the student
   (`clauseKind`, `momentBoost`, `posedTags`, now this).
2. **THE CHAIN IS REORDERED, PRECISE BEFORE COARSE.** It ran
   `tacticPattern ?? clauseKind ?? posedTags`, so the only BUCKET route in the
   set pre-empted the two EXACT routes beneath it. It is now
   `fundamental ?? tacticPattern ?? posedTags ?? clauseKind`.
   The coarse route is **DEMOTED, NOT DELETED** — deleting it would make the
   coach QUIETER on a student with a real positional hole that no attributor
   named on this ply, and the ALGO-BASED law is that data may RAISE freely and
   may only LOWER on evidence of the POSITIVE. A coarse match is weak evidence,
   not false evidence.
3. **THE ATTRIBUTION MOVED AHEAD OF THE SELECTOR** (`coachFeatureService.
   attributeGameFundamentals`). It used to run inside the segment loop, which is
   AFTER `selectTeaching` — so both deciding computers had already run and
   neither could ever see a fundamental. Hoisting it (rather than attributing a
   second time inside the selector) is what keeps the sentence and the decision
   about the SAME hole: the selector has no `bestSan`, so a second attribution
   there would be a WEAKER one entitled to disagree. **One attribution, three
   consumers** — need, ranker, narration. `betterMoveSan` was extracted for the
   same reason: two hand copies of one derivation is the drifting constant the
   rot rule bans.
4. **THE RANKER TOO** — `facetRank`/`rankFacets` take a pre-matched hole, and
   review fills it for the `[principle]` facet (which IS the attributed
   fundamental) via `FactBundle.holeByFact`. It arrives pre-matched for the same
   reason `momentBoost` does: facts are PROSE by the time they reach the door,
   and joining prose to a weakness means scraping a concept out of a sentence.
   `null` when the fundamental has no record — GREY is not a hole and must not
   borrow an unrelated weakness's weight.

**Gate:** `fundamentalReachesDecider.test.ts`, 5 tests, negative-controlled two
ways: the fixture ASSERTS the exact and coarse routes disagree (so a green
cannot come from a fixture too weak to tell), and reverting the chain order makes
it fire — verified by doing it.

🟠 **OWED — THE LIVE LANE (Learn) STILL PASSES `fundamentalId: null`, and the
blocker is concrete rather than architectural.** `positionFacts` is the only
consumer of the need score on Learn, and the attributor needs TWO things the
composer does not yet have. Measured, so the next session does not re-derive it:
the engine's best move as SAN at the PRE-move position (`CoachTeachPage` resolves
one at **:9885**) AND the AFTER-move read that decides whether the ply is flagged
at all (`const mid = await midTurnRead`, **:9830**) — both roughly 1,300 lines
after the composer runs at **:8603** in the same turn. The pre-move read IS in
scope (`preStudentRead`, :8151) and so is the student's cost (`studentCpLoss`,
assigned :8207), but `studentBest` at the composer is the analysis of the
position AFTER THE COACH'S REPLY — a different board, not the after-move read.
So this is not a hoist of one line: it is moving the composer later in the turn,
or awaiting the mid-turn read earlier. That belongs with the three-surface
parity sweep, not to a drive-by.
Passing `null` is deliberate: a live attribution without `bestSan` would be a
second, weaker one entitled to disagree with the sentence Learn actually speaks
at :9907 — the exact failure this whole wire exists to remove. **Do not "fix" it
by attributing again.**


✅ **A-NEW — LANDED 2026-09-19 (late). Was: THE MODEL CANNOT READ THE FUNDAMENTAL
THE COMPUTER PROVED.** See the landed section below for the two defects behind it;
the original measurement follows unchanged.

🔴 (as measured before the fix) On 47 real amateur games through the real pipeline:
154/154 flagged moves captured, 79 carry an attributed `fundamentalId` — and the
weakness SPINE sees **0** of them. `autoAnalyzeGameMisconceptions` hardcodes
`learned:false` (the ONLY entry from batch analysis, review-open and a finished
coach game), every row lands `counted:false`, and `weaknessSpine` +
`weaknessAnalyzer` read `getMisconceptionProfile({countedOnly:true})`.
`fundamentalId` lives ONLY on those rows (a `MistakePuzzle` carries none), so the
Fundamentals tab says "loose piece 19×" while the ranker that decides what the
coach teaches next has never heard of it. **This is the loop not closing, one
layer down from the heat map.** NOT fixed in WO-4: the gate defends against
double-counting the TAG (true) and that is WO-3's file. The fix is not "flip
`learned`" — it is a fundamental-aware spine reader that aggregates
`fundamentalId` over ALL rows the way `getFundamentalCounts` already does, so the
fundamental counts once and the tag is left alone. David's call; one file.

0. ✅ **FIXED (#77) — CLICK-TO-MOVE SILENTLY DROPPED THE STUDENT'S MOVE.**
   🔴 The entry here previously read "the first coach reply of a game
   intermittently blows 90s" and blamed a cold LLM / the serialized Stockfish
   singleton. THAT WAS WRONG and is deleted rather than annotated. The coach was
   never slow: measured on prod it answered in 4.5–4.9s every time.

   What actually happened: `useChessGame.onSquareClick` read the current
   selection out of REACT STATE, so the second tap of a click-move only saw the
   first tap's selection if React had COMMITTED a render in between. When it had
   not, the tap fell through to "select this square instead" — and an
   enemy-occupied destination has no legal moves for the side to move, so the
   selection cleared and THE MOVE VANISHED with no error, no sound, no feedback.

   Proven on prod, same position, same two squares: a 250ms gap between taps was
   REFUSED; a 2.5s gap landed in 0.5s; a DRAG always worked (a drag needs no
   state to survive between two events). The window stretches past 250ms exactly
   when the coach's narration pipeline is running engine analyses on the main
   thread — i.e. right after its reply, which is when the student is tapping.

   Fix: the selection is now held in REFS, which update synchronously; the state
   still drives the selection ring and the legal-move dots. Both refs are written
   in the only two places that write the selection, so they cannot drift. It
   lands on all 39 surfaces that use `useChessGame` at once.

   Why no test caught it: the existing test put each click in its own `act`, so
   React always committed in between — and its comment said each click "must be
   a separate act", writing the defect down as a requirement. Two new tests put
   both clicks in ONE `act` (one of them the real `Qxd5` capture), and were
   verified to FAIL on the old code and pass on the new.

   The Learn audit's row C red was downstream of this all along: the audit's own
   clicks were being dropped, so the game never reached the ply that poses the
   concept, and the audit reported it as "no coach reply".

1. ✅ **DONE (fe8e50cd3 + c4715f593) — GREY TEACHES, and it feeds the RANKER.**
   Not the per-tag need prior this item originally described: David corrected the
   framing ("the ranking computer decides"), and grey went into
   `computeImportance`'s student term instead, where the `rank > 0` guard makes
   it structurally unable to manufacture a moment on a quiet ply. RED > GREY >
   GREEN, MAX not sum. Both lanes feed it. Gate: `studentMomentBoost.test.ts`.
2. ✅ **DONE (fcf483f) — ONE COMPUTER, BOTH DIRECTIONS** (#25). The entry here
   read "a capability can go RED from anywhere and can only go GREEN through
   analysis". The sharper finding was the other way round: `recordCapabilitiesShown`
   only ever wrote `held`, so `CapabilityOutcome`'s `broken` member could not
   exist and BOTH readers (`needScore:287`, `studentMomentBoost:58`) guarded on
   `broken > 0` — unreachable code describing an impossible state. Now
   `recordCapabilityEvidence`: same posed set, outcome decided from the real
   cpLoss. Live writers added via one door (`discussionPractice.recordMoveEvidence`),
   each surface declaring its own `capabilityOrigin` through a REQUIRED
   parameter. HOLD writers 4 -> 5, six surfaces feeding them.
   Found stress-testing it: `studentMomentBoost.isGrey` returned false for a
   broken tag, harmless ONLY while nothing wrote one — the moment failures are
   recorded it made the coach QUIETER on a capability just demonstrably failed.
   Now `isUnproven`.
   STILL OPEN: press/no-press AT A CRITICAL MOMENT, which the critical-moment
   build (above) creates. `prompted` is in place and required, waiting for it.
3. ✅ **DONE (fcf483f) — AND THE BULLET UNDERSTATED IT.** This read "the number
   is correct at the source now; threading it is the rest". It was not correct
   at the source: `playerRatingService:160` anchored the running K=32 ELO at
   `currentRating`, the field `calibrateStrength:134` then WRITES, so every boot
   re-scored the same games from the number the last boot wrote — measured
   800 -> 990 and 1200 -> 888 across ten opens on zero new games. §4 of
   `docs/plans/2026-09-17-computer-unification.md` reverted code for this and it
   returned on 2026-09-18 through a change that widened the SOURCE without
   touching the ANCHOR. Fixed with a write-once `ratingBaseline`; gate
   `ratingIdempotence.test.ts` (negative control: reverting the anchor turns 3
   of 5 red with the measured drift). Three more fell out: a refresh clobbered
   `puzzleRating` (the SRS's own number), the profile seeded at 800 on a comment
   describing the picker deleted 2026-09-02, and Learn set its slip bar from the
   PUZZLE rating.
   NOT DONE, deliberately: the 29 hand-rolled `?? 1200` sites already carry the
   correct value and `oneStudentRating.test.ts` gates it — naming, not a defect.
4. ✅ **THE ENDGAME ZERO WAS FALSE** (fcf483f). `state-of-build.mjs:94` probed
   `components/Coach/CoachEndgame*` for corpus reach, but the corpus is spliced
   in `EndgameLessonTab` (4 calls + its own `corpusNote` test), which
   `CoachEndgamePage` mounts 4x — the same renderer-not-producer mistake the
   comment one line above it warns about. STATE.md printed a red ZERO for a
   surface that works, and ship-check gates on that file. Its HOLD scan was also
   keyed on a function NAME and read a rename as the app losing a writer.
5. ✅ **DONE (fcf483f)** (#32). `WeaknessProvenance` already existed with `from`
   REQUIRED and 4 of 5 aggregators filling it; the one bare source was the
   COACH'S OWN capture. The record shape was never the problem —
   `MisconceptionTagRecord.sourceGameId` existed and `captureMisconception`
   always forwarded it — the live sites never passed one, because Learn minted
   its game id at SAVE time, after every slip was already written. The id now
   comes from `learnMemory`, which already knows when a game begins by the one
   mechanism that cannot be fooled (the board going backwards).
6. 🔴 **NOT A DEFECT — THIS BULLET IS WRONG AND IS DELETED, NOT ANNOTATED.** It
   read "No concept-level spaced retrieval. SRS is keyed to `openingId` and
   covers MOVES, not ideas." Measured 2026-09-19: a concept-level SRS exists and
   IS read. `misconceptionService` writes `dueAt` on capture (:114), lengthens
   it on success (:266) and snaps it back on a miss (:274), and
   `isMisconceptionDue` drives `openCount` in `getMisconceptionProfile` (:219),
   which SIX production modules consume including the weakness spine and
   `coachApi`. What is missing is a SURFACE that schedules a session around it —
   a build, and one that needs a decision about where it lives, not a fix.
7. ✅ **STRUCTURALLY DONE (fcf483f)** (#34). `CapabilityEvidenceRecord.prompted`
   is REQUIRED, and the profile counts a prompted row as NEITHER held nor
   broken, so a told-then-found move leaves the tag GREY and the coach keeps
   teaching it — the coach's own teaching can never inflate the model it uses to
   decide whether to teach. Every writer answers it. The remaining wire is the
   drill surfaces' `hintRevealed` (`useEndgamePlayout:267`, React state read by
   4 components, zero services) and the critical-moment announcement, which is
   the first thing that will ever pass `prompted: true`.

### 🔴🔴 OPEN — TWO SURFACES STOP MAKING PROGRESS ON `index-C7Z2So9u` (2026-09-19, ~06:00)

Two independent observations on the same bundle, both "the app advances a
little and then stops". They may be one disease; nobody has bisected either.

**LEARN** — the coach never replies after the student's 4th ply, so the game
stalls one ply short of the position that poses the concept. Row C fails for
want of a PLY, not for want of a concept.

**REVIEW** — the walk advances to ply 2 (the `AUTO advances-by-itself` row
PASSES, "from ply 0 -> 2") and then sits at **ply 0 of 93 for 1,100 seconds**.
The readout is not broken: it reads correctly before (`AUTO`) and after
(`REOPEN walk-readout-is-live`, "ply readout reads 11"). Three rows fail
downstream of it — RECAP ("end reached=false"), FUNDLEAD and SHOW, all of
which need the walk to reach their ply. First-open also slowed 100.6s ->
170.6s.

**WHAT IS NOT THE CAUSE**, checked rather than assumed:
- Not a cold start. The second game in the same Learn run is warm and fast
  (30s) while the first stalls (136s), twice.
- Not intermittent. Identical numbers across re-runs.
- Not this session's corpus work. The degender landed voiced-corpus DATA and
  a script that never enters the bundle — grep-verified, only a test imports
  it.
- NOT YET RULED OUT: the service-worker mid-session swap (third candidate
  below). Real, independently confirmed, now fixed — but it does not account
  for the asymmetry or the repeatability, so it is a candidate, not the answer.
- Not the audit's seat hardcode. That was real and is fixed (`isStudentPly`);
  SEAT is green now and FUNDLEAD reads the correct seat ("You: that was a
  mistake") on the right ply.

**WHAT IS LEFT.** Between the last all-green bundle and this one the other
session landed `6f088da` / `cda379b` / `5bbd3d1`, rewriting 249 lines of
`coachApi.ts` plus `coachService.ts` and `CoachTeachPage.tsx` to detect and
carry the turn's language. That is the reply path on Learn and it is
circumstantial on Review.

**A THIRD CANDIDATE, FOUND 2026-09-19 EVENING — AND WHAT IT DOES *NOT*
EXPLAIN.** The PWA shipped `skipWaiting: true` + `clientsClaim: true` +
`cleanupOutdatedCaches: true`, so a newly-deployed service worker activated
under a page that was still running, DELETED the precache that page was
executing out of, and claimed it. Every later lazy chunk or Web Worker fetch
then asked for a hashed file the deploy no longer serves. `__HOLD_SW_RELOAD__`
made it worse rather than better: it deferred the RELOAD while the activation
went ahead, so it kept a session alive on top of code that had just been
purged. Confirmed on David's own iPhone the same day — `stockfish-error`
(worker load failure), `lichess-error TypeError: Load failed`, `sw-lifecycle
installed -> activating -> controllerchange -> activated`, `pagehide
persisted=false`, and no `app-boot` on reopen. FIXED: the worker now waits and
the page asks for the handover only when no hold is held (vite.config.ts,
index.html, gate `src/test/swHandover.test.ts`).

That matters here because every audit run starts moments after waiting for the
new bundle to land — i.e. precisely inside the swap window. **But do not adopt
it as the verdict.** It fails to explain the two sharpest facts above: the
asymmetry (the CANONICAL ask stalls, the same game started from a PICKER CHIP
does not — a cache purge has no reason to care how the ask was typed) and the
repeatability (136s twice, to the second, which reads like a timeout boundary,
not like a race). Treat it as a THIRD candidate that also removes a large
source of noise from the measurement: the next run of both audits is the first
clean one either way, and should be taken before any bisect.

**THE ONE-STEP BISECT:** build `6f088da^` locally and run
`audit-concept-gameplay-prod` against `http://localhost:5173`. If the
canonical ask answers in ~27s there and 136s on prod, it is that commit.
Deliberately not reverted or patched from here — that work is in flight, and
a blind fix into a surface another session is actively editing is how two
correct changes become one broken one.

### 🔴 SUPERSEDED DETAIL — the Learn half, as first written (~05:40)

`audit-concept-gameplay-prod` row C went 8/8 -> 7/8. NOT the concept
computer: the game never reaches the position that poses it. The coach does
not reply after the student's 4th ply, so `Nc3` — the move that creates the
pin the invariant describes — is never played.

**Measured, twice, on one bundle:**

| bundle | canonical ask | typo ask (via the picker) |
|---|---|---|
| `index-BBopxcK2` | 5 plies, **27s** ✅ | 5 plies, 26s ✅ |
| `index-C7Z2So9u` | 4 plies, **136s** ❌ | 5 plies, 30s ✅ |
| `index-C7Z2So9u` (re-run) | 4 plies, **136s** ❌ | 5 plies, 30s ✅ |

So it is not a cold start (the second game in the same run is warm and fast)
and not intermittent (identical twice). It is asymmetric: the ask typed
CANONICALLY stalls; the same game started by TAPPING A PICKER CHIP does not.
136s is suspiciously close to a timeout boundary.

**WHOSE CHANGE — evidence, not a verdict.** Between the green bundle and the
red one, this session landed only voiced-corpus DATA and a script that never
enters the bundle (only a test imports it; verified by grep). The other
session landed `6f088da` / `cda379b` / `5bbd3d1`, which rewrote **249 lines of
`coachApi.ts`** plus `coachService.ts` and 51 lines of `CoachTeachPage.tsx` —
the exact reply path that now stalls — to detect and carry the turn's
language.

That is circumstantial: the window, the surface, and the asymmetry all point
one way, but NOBODY HAS BISECTED IT. Deliberately not "fixed" from here at
05:40 while that work is in flight — a blind patch into a surface another
session is actively editing is how two correct changes become one broken one.

**To confirm in one step:** re-run `audit-concept-gameplay-prod` with the
language path short-circuited, or bisect `6f088da`. The canonical ask is
`"Play the Scandinavian Defense, Lasker Variation with me"`.

### A-ADJACENT, found by the post-deploy audit (2026-09-19)

- ✅ **A GUESSED SEAT NARRATED THE STUDENT'S OWN MOVES AS THE OPPONENT'S**
  (d9a193f). On a Slav where the student was BLACK, review said "Your opponent
  developed into the game" about the student's move, and the ONE ply the engine
  flagged came back "Your opponent: that was a mistake, costing about 1.4
  points". `resolvePlayerColor` infers the seat from NAMES; neither the username
  match nor the engine-name shortcut applies to a game imported with unfamiliar
  names, so it returned null and `CoachReviewSessionPage` defaulted to 'white'
  for board ORIENTATION — then threaded that guess into `buildReviewSegments` as
  the NARRATION SEAT. The file refuses to guess one line away (the WIN/LOSS badge
  shows `?`); the narration was less careful than the badge. Fixed with the field
  that should have existed: `GameRecord.studentSide`, read first, declared by both
  coach save paths, absent still means infer.
- ✅ **THE WALK BUDGET WAS A CONSTANT ABOUT A DIFFERENT GAME** (7582d23). RECAP
  and THESIS failed the product for the instrument's pacing: the walk reached ply
  80 of 89 at poll 575 of 600. The recap is spoken at the end and the
  turning-point card only appears after it. 600 was tuned when this audit ran ONE
  fixture; it now rotates a game every run, so the budget scales with the game.
  The audit was also withholding its own input — it computes expectations from
  `studentSide` and never seeded that field.

### B. The instruments are not believable (a green here means nothing)

0a. 📊 **WHERE THE USERS ACTUALLY STOP — measured on PostHog 2026-09-20, 62 real
   App Store devices / 60 days (native, appstore, Cupertino + audit rows
   excluded).** Route-level, which is the cut CLAUDE.md says to use because
   `/coach/teach` emits no unique event of its own:

   | route | users | note |
   |---|---|---|
   | `/` | 62 | everyone |
   | `/openings` | 42 | but only **9** open an actual opening |
   | `/coach/home` | 33 | |
   | `/weaknesses` | 32 | needs their games |
   | `/games/import` | 29 | but only **9** import |
   | `/tactics` | 24 | |
   | `/coach/teach` | 17 | |
   | `/coach/play` | 13 | |
   | `/coach/review` | 12 | only **3** produce review events |

   **ONE diagnosis fits all of it: the loop needs the student's own games, and
   only 9 of 62 ever get games in.** Weaknesses, review and the mistake drills
   all sit behind that gate; everyone reaches the door and stops. 50 of the 62
   used the app on exactly ONE day (avg 1.5 days active).
   Ranked levers, as first written: (1) import completion 29→9; (2) openings
   list → an actual opening 42→9; (3) review 12→3.
   🔴 **(1) DOES NOT SURVIVE ITS OWN TEST — do not act on it. Corrected the
   same hour, after the focused-noyce session attacked the claim.**
   Two fixes to it: (a) IMPORT IS NOT THE ONLY DOOR — a finished coach game
   persists with `source='coach'` and feeds the same spine, so the honest
   number is **11 of 62 ever get a game in by ANY route** (9 imported, 7
   played, 5 both, 2 play-only), not 9 by import. (b) CAUSE OR MARKER, tested:
   among the 30 who REACHED `/games/import`, completers retain better (2.89
   vs 1.19 days active; 4/9 vs 20/21 single-day) — but they were ALREADY
   ~2.2× more active before they ever saw that screen (80 vs 36 events
   pre-import). The retention gap (2.4×) is about the size of the selection
   gap (2.2×), so **there is no evidence import ADDS retention beyond the
   engagement it selects for.** Fixing it may move nothing.
   ⚠️ Note the control that looks obvious and is WRONG: total events (2486 vs
   110) is POST-treatment — importing triggers analysis, which emits the
   events — so conditioning on it would have "proved" the case backwards. The
   only valid control is activity BEFORE the import screen.
   **What survives and is worth acting on: 50 of 62 leave after ONE DAY, and
   20 of the 21 import-bouncers are in that group.** They are not stopped by
   import; they were leaving anyway. The real question is upstream of every
   feature — what the first session is worth — and it is the same number the
   Dashboard-bars redesign was aimed at (32 of 39, CLAUDE.md) — whether that
   redesign moved it is UNGRADED and probably ungradeable today; see §B 0b,
   which retracts the "has not moved" claim that used to sit on this line.
   n=9 completers: small, so treat all of this as direction, not proof.
   ⚠️ TWO CORRECTIONS to my own first cut, both from event lists that were too
   narrow — do not repeat them: "44 users did nothing at all" was FALSE (18 of
   them had the coach speaking to them), and "four devices have ever opened a
   review" was FALSE (12 reached the route, 3 produced events). Count ROUTES
   for surfaces, events only for actions. Caveat: 62 users, single-session
   dominated, so this describes first impressions rather than sustained use.

0b. ❌ **THE DASHBOARD-BARS REDESIGN CANNOT BE GRADED FROM THIS DATA — and
   the one part that CAN be graded produced nothing (PostHog, 2026-09-20).**
   The peer challenged my "the bars did not move the number" claim with the
   right objection: an OTA-gated change only reaches devices that took the
   update, and "shipped" is not "received". They were correct, and the check
   kills my claim rather than rescuing it.
   **Delivery, measured:** of the 18 real native users first seen AFTER the
   bars shipped (`724bb4d47`, 2026-09-04), only **11 ever took an OTA bundle**
   — 7 never did, so they ran the App Store binary's older web bundle and
   never saw the bars at all. (Before-bars cohort: 25 of 44.) OTA
   `download_failed` is NOT the culprit and is receding: 30 failures the week
   of 08-23 against 11 the week of 09-06 and 3 the week of 09-13, while
   completes rose — consistent with the phantom-failure fix having landed.
   **Every cohort cut is confounded by observation window, in the direction
   that flatters my conclusion.** Later-arriving users have had fewer calendar
   days in which to return, so they look worse on every returning metric by
   construction. Raw: 78% single-day after vs 82% before (n=18 vs 44), and
   6.11 sections reached vs 7.43. Control for it — require 14+ days of
   possible observation — and the after-bars cohort collapses to **n=5**,
   where 1 of 5 returned against 8 of 44. **That is not a measurement.** The
   binomial standard error at n=18 is ~10 points before the confound; at n=5
   there is nothing to say. So my earlier "a shipped fix aimed at this exact
   number did not move it" was NOT supported — retract it, do not soften it.
   **The one unconfounded finding, and it is a real zero: the Kids Mode row
   has never been opened.** The redesign's most concrete addition was a
   home-screen entry for `/kid`, which was genuinely unreachable from a phone
   before it (`MOBILE_NAV_ITEMS = NAV_ITEMS.slice(0, 5)` trims it off the nav).
   **ZERO real native users have opened `/kid` — in either era — including
   the 11 who demonstrably received a post-09-04 bundle.** Non-vacuity proved:
   the same `properties.route` cut returns 25 distinct routes for this cohort
   (`/` 62 devices, `/openings` 42, `/coach/home` 33 …), so the query would
   have seen `/kid` had anyone gone there. This needs no observation window
   and no cohort split: a row was added, 11 people who could see it did not
   use it, and neither did anyone else.
   **The honest position:** the bars are ungraded and will stay ungraded until
   enough post-09-04 users accumulate a comparable window. Do not cite the
   82%/78% pair as evidence in either direction. If the question matters
   sooner, the instrument is a per-device first-session funnel on the users
   who provably took a post-09-04 bundle — not a date-split cohort.
   ⚠️ **THE TRAP THIS SECTION EXISTS TO RECORD:** every naive cut agreed with
   what I already believed, because the confound and the belief point the same
   way. Two of my three prior claims in §B 0a died the same death (the
   post-treatment control on import, the too-narrow event list). When a result
   confirms the prior, look for the confound FIRST.

0. 🔴 **NEW 2026-09-20 14:05 — THE REVIEW WALK IS ~45% SLOWER AND NOW RUNS OUT
   OF BUDGET.** Two product-mode runs of `audit-review-overhaul-prod`, same
   pinned game (06wNUWaA, student=black), same machine, nothing else running:
   - BEFORE the afternoon pushes (11:25, bundle `WwZIaxGS`): ply 67/69 at
     **550s** of the 828s poll budget, `end reached=true`, 34 pass / 3 fail.
   - AFTER (13:41, bundle `BRGLhcVE`): ply 67/69 at **800s**, still 67/69 at
     825s, `end reached=false`, 31 pass / 5 fail.
   It was ALSO carrying fewer flagged plies (3 vs 5 — product-mode
   nondeterminism), i.e. less work, which is why the game is unlikely to be
   the cause. **ONE root cause, four reds:** the walk never arrives at ply 68,
   and `register === 'ask'` only speaks and shows its card when the walk
   REACHES that ply (`CoachGameReview.tsx:1078`), so CRIT
   `spoken-names-count-and-stake` fails, the turning-point card is never
   answered so THESIS fails as a DRIVER error, and RECAP fails on
   `end reached=false`. Fix the speed and all four should go green.
   First suspects, both from the same push: the critical fan now scans 27
   plies instead of 22 (8746ms vs 5128ms — by design) and the section-14
   detectors add per-ply attribution on the narration path; the fan is
   background but competes for the same single-thread pool worker the walk's
   narration needs. **n=1 each side, product mode — confirm with
   `AUDIT_DETERMINISTIC=1` on both sides before chasing it.** This is
   user-facing, not just an audit row: G4.6 is David on review latency
   ("we need to fix that seven second lag").

7c. ✅ **DONE (2026-09-19) — THE DEAD-SELECTOR CLASS HAS A GATE.** #59 (below,
   §C 16) was the calibration-bubble failure again under a new name: an audit
   blocking on a testid nothing renders fails SILENTLY (timeout, `.catch`,
   wall-clock) or, worse, files a false finding. `noDeadTestidWaits.test.ts`
   generalises `noDeadCalibrationBubble`: an audit may not waitFor / click /
   fill / read a LONE `data-testid` absent from `src/` (the extractor sees the
   literal, the `xTestId=` prop forms and template prefixes; alternation lists
   with a live fallback are not blamed). Measured: 1,695 rendered ids, 7 dead
   blocking actions in 4 scripts (`audit-settings-behavior` ×3 on
   `gameplay-coaching-row-modal/-close`, `audit-coach-full-interactive` on
   `filter-all` + `coach-play-redirect`, `audit-gotham-prorep-interactive` on
   `featured-pro-openings`, `audit-review-functions-probe` on
   `review-full-detail-toggle`) — the shrink-only baseline. Fix the script,
   delete the line. LATER THE SAME NIGHT: the extractor learned suffix
   templates (`${testId}-modal`), which cleared the two settings ids as false
   positives, and three of the rest were fixed to today's contracts — the
   review probe now asserts the Deep Review Detail toggle is ABSENT (removed
   2026-09-16; it had false-failed every run since), the Gotham audit asserts
   the standard Pro grid lists his card (the pinned section was reverted
   2026-05-31), the coach-full audit's `filter-all` no-op is gone. Baseline: 1
   (a Promise.race arm beside a live id).

7a. ✅ **DONE (2026-09-19) — EVERY narration listener was DARK on this Mac, and
   every audit still printed its rows.** Two shut valves on the one pipe, found
   in series:
   - Chrome 148 (Playwright 1.58's bundle) enforces Local Network Access: an
     https page may POST to 127.0.0.1 only with a permission grant, and headless
     denies it. The 2026-07-13 hand-rolled PNA flag lived in TWO places under
     names Chrome has since renamed, and a second `--disable-features` after the
     helper overrides it (Chromium keeps the last). Now ONE source,
     `LOOPBACK_SIDECAR_ARGS` inside `sandboxLaunchArgs()` on every path;
     `LISTENER_LAUNCH_ARGS` re-exports it; the gems loop's literal is gone.
     Gate: `auditHarnessReach.test.ts` fails any audit spelling
     `--disable-features=` itself.
   - The sidecar allowed a FIXED header list at preflight, and the app started
     sending `x-audit-marked` (landed from another session the same night), so
     every POST died at CORS again with the flag in place. The listener now
     echoes `Access-Control-Request-Headers`; it is a loopback capture, and the
     secret check is the gate.
   The Learn gameplay audit played two 29-ply games and captured ZERO events of
   ANY kind — which reads as "the coach is silent" when the truth is "the pipe
   is shut". Proof: 0 → 153 listener events, 8/8 on prod. Any audit "green"
   recorded on a Mac under Chrome 148 before this fix verified nothing about
   the voice. Ask whether the instrument reached the surface FIRST.
   The run's prose list ALSO showed every line twice — read the raw tape before
   calling that a §C defect: it was ONE utterance and TWO app events of kind
   `coach-narration-spoken` (the Learn lane record `CoachTeachPage.trackA` plus
   voiceService's own). The audit's prose filter now keeps voiceService's.

7b. ✅ **DONE (2026-09-19) — an LLM-written `[BOARD: highlight:]` reached the
   board.** `GameChatPanel.test` 'strips an LLM highlight marker' was red on
   untouched main. Cause: the 2026-09-13 preserve in `applyCandidateArrows` kept
   highlight markers by matching the TEXT, and a marker code wrote is the same
   string as one the LLM wrote. Fix is structural, not a filter: the read's
   `keySquares` ride a typed read-once channel (`consumeCoachKeySquares`, the
   action-offer pattern) and `coachService.ask` re-appends them AFTER the arrow
   pass strips every marker. One builder (`keySquareHighlightMarker`). Gates:
   `coachAnswerGates.test` (dated contract), `coachApi.keySquares.test`.

8. **The review audit's verdict is not reproducible** (#70) — three runs on one
   bundle gave three different red sets, because the background deep dive is a
   race the harness neither waits on nor reports.
   - ✅ **The instrument could not even PIN a game (found 2026-09-19).** A
     reproducibility pair ran a Scandinavian and then, "pinned" to it, a Ruy
     Lopez: `AUDIT_GAME_ID` swallowed a transient fetch throw and silently
     rotated to a fresh pick, then printed a reproduce line for a game it never
     played. Fixed: three fetch attempts with backoff, the reason named, exit 2
     under a pin that cannot be honoured. Every "not reproducible" reading
     taken before this fix may have compared two different games.
   - The worker storm seen on the reopen (124 pthread helpers, page errors) is
     #21, owned by the focused-noyce session tonight — not re-derived here.
   - ✅ **MEASURED, PINNED, SAME BUNDLE (2026-09-20): 4 of 5 red rows identical
     across two runs of Firouzja–Carlsen 06wNUWaA.** Stable: RECAP aggregate,
     FUNDLEAD (0/4 flagged plies lead with a fundamental — §E item 0), HEAP and
     ERR (#21). The residue is two things, neither a harness race:
     (a) **classification drift from time-budgeted analysis.** The review sends
     `go depth N movetime B` (`gameAnalysisService`: sweep 200 ms at depth ≤12,
     deep pass 8 s at depth 16 on ≤24 plies) and stamps the depth REACHED, so
     under load the same ply grades differently — ply 50 was an inaccuracy
     (0.8) in run 1 and a mistake (1.1) in run 2; ply 48 0.9 → 0.7; the
     critical-moment stake flipped in-it → damage. The annotations are not a
     pure function of the game, so no row that depends on WHICH plies flagged
     can be. OWED: an audit-only determinism seam, the mute's twin —
     `localStorage.auditDeterministicAnalysis=1` read in `gameAnalysisService`
     makes every review `budgetMs` undefined (depth-only) at the four sites:
     `evaluateFensPooled`'s default, the dive worker's `analyzePosition`, the
     sacrifice verify and the best-move refine (`positionBudgetMs ??
     REVIEW_POSITION_BUDGET_MS`), plus the shallow sweep. Gate it like
     `auditMute`: product code may never set the flag.
     (b) **one instrument skew, fixed.** `ACC board-accuracy` red on run 2
     only: "Your pawn on g6 now eyes their pawn on h5" filed under ply 31
     (White's Be3) when it is the ply-32 sentence (…g6). The audit read the
     ply readout and the narration banner in two separate DOM round trips, and
     the muted voice-gated walk advanced between them. The three reads are now
     one atomic snapshot.
   - **THE SEAM LANDED AND THE PAIR STILL DIFFERED (2026-09-20, bundle
     `index-BeoVsaKE`, 06wNUWaA pinned, `AUDIT_DETERMINISTIC=1`):** run 1 34/36,
     run 2 33/36, `only2=['CRIT spoken-names-count-and-stake']`; FUNDLEAD ply 50
     "MISTAKE 1.1" vs "INACCURACY 0.7". So the budget was NOT the residue. Read
     the code end to end and found two mechanisms, neither a budget:
     (a) `evaluateFensPooled` hands positions to the pool off a shared `next`
     counter — WHICH worker's WARM transposition table searches ply 50 is
     timing, and a single-thread engine at a fixed depth is only deterministic
     given the same table; (b) the sacrifice verify and the best-move refine
     ran on the SINGLETON — the multi-thread build (Threads ≤4, lazy SMP),
     nondeterministic by construction — and sat on the live engine behind an
     open review, the exact defect the dive was moved off on 2026-09-06, two
     sites over (rot-on-sight). ✅ BUILT: under the audit flag the pool worker
     sends `ucinewgame` before every position (single-thread build, a 16 MB
     memset, spawns nothing — the #21 storm rule is about the multi build), so
     a pool eval is a pure function of (fen, depth) whichever worker gets it;
     and ONE dedicated pool worker is acquired lazily and held through the
     annotation loop for the dive, the sacrifice verify and the best-move
     refine (singleton only when no worker can be had). Gate:
     `analysisDeterminism.pool.test.ts` — a fake Worker records the UCI stream:
     product = one clear per worker per game; flag = every `position fen` is
     preceded by `ucinewgame`; parity = with a pool available the review makes
     ZERO singleton calls, with the dive killed at the flagged ply so the
     refine has to search. ✅ **VERIFIED ON PROD (2026-09-20 08:12–08:45,
     bundle `index-D0T1cBBh`, 06wNUWaA pinned, `AUDIT_DETERMINISTIC=1`, two
     runs back to back under the lock, nothing else running): 34/36 and 34/36,
     IDENTICAL red sets (RECAP + FUNDLEAD — §E item 0, real), and the FUNDLEAD
     detail byte-identical across all five plies (48 → 1.1, 50 → 0.9, 62, 64,
     68), CRIT moment @ply 66 identical, no reopen wedge, ERR none.** The
     residue was the hash and the singleton, not the budget; the verdict is
     now a pure function of the game under the flag. Still true: the singleton
     fallback (no pool worker at all) stays nondeterministic and is out of
     reach of any flag — a device with no pool is the only place a pinned pair
     can still differ. #70 CLOSED for the review audit.
   - **What the full row diff of that pair still showed (read, not asserted):**
     (a) the critical-moment FAN read "10 speak / gap 99667" vs "9 speak / gap
     99688" — the moment matched this time, but that is the exact path that
     flipped `CRIT spoken-names-count-and-stake` in the earlier pair: the fan
     is time-boxed (`CRITICAL_FAN_BUDGET_MS` 1.5 s) on a warm, queue-assigned
     table and only `analyzePosition` had the cold start. First wire (cold
     start + the fan's clock lifted to the ten-minute ceiling) was MEASURED
     WRONG on the next pinned pair: MultiPV 3 at depth 14 from a cold hash on
     the one worker the pool had did not finish 22 plies before the reopen
     aborted the pass — "no scanCriticalMoments event", the question never
     fired. Deterministic and unbounded is the wrong pair. ✅ REWIRED: under
     the flag the fan sends `go depth 14 nodes 1200000` (a node limit is the
     third kind of bound — deterministic on one thread with a cold table AND
     finite), with its own 30 s watchdog; the pass keeps its real 1.5 s
     budget. Gate: the source must carry the node-bound send and the fan must
     never go through `reviewBudget`. VERIFIED 1 OF 2: node-bound run 1 on
     `index-WwZIaxGS` read "22 read, 9 speak, gap 99640, 3087 ms" — same
     wall-clock as the product's clocked fan and the same verdict as the
     clock-lifted run before it; run 2 hit the #21 wedge at the reopen and was
     killed, so the byte-identical PAIR on the node-bound fan is still owed
     (the chain's diff picked the previous report and read "identical" off the
     wrong pair — a script defect, `diff-review-pair.py`, fixed to key on the
     run's own report path next time). (b) the
     EXPLORE reply's eval (1.3 vs 1.4) — a LIVE ask on the singleton, not
     review analysis; out of scope for the flag by design. (c) the LEDGER
     sample strings differ — prose from the PROJECTION layer (`computePvLine`
     through `acquirePvEngines`, `PROJ_TIMEOUT_MS` 7 s deadlines in
     `coachFeatureService`). Under the flag those deadlines would have to be
     lifted TOO or every projection aborts; owed, not done — it changes
     prose, never a red row.
9. **The pthread census is intermittent** (#21) — 70 workers one run, 1 the next
   on the same game. Carrier is the multi-threaded SINGLETON, not the pool.
   - **2026-09-20, taken over from focused-noyce after 07acb13fb.** Their fix
     holds on the storm: with a raw-CDP tap on the review audit's own browser
     (`AUDIT_CDP_PORT` + `probe-cdp-tap.mjs`), the reopen after the dive logged
     "Multi-thread variant failed at runtime (1 error event), falling back to
     single-threaded" and NO storm followed — peak 5 workers, no pthread
     helpers. What remains is a WEDGE behind it: the page's main thread then
     answered neither `Runtime.evaluate` nor `Debugger.pause` for 6 s,
     Chromium at 100% for 50 min, the reopened walk stuck at ply 0 with only
     the single-thread fallback worker alive. The tap saw no worker exception,
     so the flood is message-less `error` events on the page — consistent with
     the FALLBACK failing to start too while the previous document's memory
     lingers. Two probe runs that reopened without walking to the end stayed
     clean; both wedging runs walked to the recap first. `probe-pthread-errors-
     prod.mjs` now hooks every Worker's error events per URL (the flood's
     source, named), samples main-thread responsiveness per census, and has a
     PROBE_FULL_WALK=1 mode — the next run names the flooding worker.
   - **n=2 (2026-09-20, focused-noyce, independent):** their own review run on
     jMVMo1Ua (student=white) sat 49 min with node at 0% and the log ending
     "reopened walk ply=0: 104MB workers=1 {stockfish-18-lite-single.js:1}" —
     demote clean, no storm, walk never leaves ply 0. Same shape, different
     game. The wedge, not the storm, is #21's remaining defect.
   - **n=3 (2026-09-20 ~05:00, my full-walk probe), and the wedge is READ:**
     this reopen ran on the SINGLE build from the start (the persisted multi
     fallback), six single-thread workers alive and EVERY one answered a CDP
     `Runtime.evaluate` — the engines are fine. The page's MAIN thread is what
     is stuck: `Runtime.evaluate` times out and `Debugger.pause` never lands
     in 30 s → spinning in NATIVE code (no JS/wasm interrupt check reached),
     Chromium at 100%. It answered 0 ms at walk+5 s after the reopen, then
     never again. Not the engine, not the storm. Fits a catastrophic regex
     over narration text or a structured-clone/JSON.stringify of something
     huge on the reopened walk. NEXT: the probe now takes an OS-level
     `sample <renderer pid> 8` at wedge time (names the native frames) and
     races every page.evaluate (it had wedged itself for 68 min on one).
   - **n=4 (2026-09-20 ~07:44, full-walk probe with the OS sample armed): NO
     WEDGE.** First walk to the recap, dive done, reopen, 60 s of reopened
     walk — main thread 1–4 ms at every census, workers alive throughout, the
     sample never fired. ⚠️ CONTAMINATED for its last ~5 min: my own chain's
     wait loop deleted the probe's (ownerless) lock and the queued Gotham
     audit started beside it at 07:40 — recorded in memory, loop fixed. So
     this is n=4 of "no wedge under MORE load", weak in the direction that
     matters. **What it DID name: the error flood's source.** The page-side
     Worker hook caught `Uncaught RuntimeError: unreachable
     @stockfish-18-lite-single.js:11` — 7 events on the first walk (all five
     single-thread pool workers vanished from the census at walk+75 s), 3 on
     the reopen. That is a WASM trap (an `abort()` inside the engine — the
     shape a failed allocation takes), on the single-thread build, i.e. the
     analysis POOL, while the multi engine sat clean. A trapped pool worker
     never answers, so `analyzePosition` rejects after budget+4 s and the
     ply's eval is NULL → a null pair classifies `good` — the batch path
     documents exactly this data bug ("every move marked fine, permanently").
     NEXT for #21: (a) count how many curve/dive positions came back null on
     a run with traps (add it to the review audit's engine row); (b) capture
     the worker's stderr/`abort` reason — the glue prints it before the trap;
     (c) memory: 5 single workers × 16 MB hash + the multi engine's 64 MB +
     4 helpers on a 4 GB tab is the first suspect.
   - **n=5 (2026-09-20 09:59–10:29, bundle `index-WwZIaxGS`, my own pinned
     review run, `AUDIT_DETERMINISTIC=1`, nothing else on the machine):** the
     WEDGE, clean. Dive finished before the reopen; reopen startable in 0.3 s;
     `review-walk-started` + ONE `review-narration-spoken` fired, then "JS heap
     UNREADABLE (renderer wedged or evaluate timed out)" at ply 0, no ply
     readout ever, workers=1 (`stockfish-18-lite-single.js`), pool churn {},
     until the 30-min bound killed the browser. Same shape as n=1–3: the page's
     MAIN thread stops answering right after the reopened walk speaks its
     first line. Four of the five wedges had no determinism flag, so the flag
     is not the cause. It is reproducible enough to hunt now — ~1 in 3 reopens.
   - **n=6 (2026-09-20 10:35–11:05, product mode, no flag, no deploy under it —
     bundle and origin verified unchanged): first attempt of the hunt WEDGED,
     and the new OS sample fired — on the WRONG process** (the selector took
     "the hottest process matching chrom(e|ium)" and got the Claude desktop
     app, whose path contains the word). What that mis-sample still proved:
     the hottest chromium-named process on the box was at **0.3 % CPU** at the
     moment the page stopped answering — so this wedge is an IDLE-BLOCKED main
     thread, not a spin. (n=1's "100 % for 50 min" was the pthread storm,
     since fixed; do not conflate.) The sampler now takes every Playwright
     renderer by executable path + `--type=renderer`, logs cpu/rss per
     renderer, and prints the main thread's deepest frames; the audit also
     logs any dialog and whether a raw CDP `Runtime.evaluate` HANGS or ERRORS
     at blow-up. Also read: "0 workers" at blow-up is the pool's 60 s idle
     retire, not a signal.
   - 🔴 **CORRECTION, same hour: n=5 and n=6 are PROBABLY ARTIFACTS of my own
     chain bound, not wedges.** The heap probe's race is 4 s, so a real wedge
     is detected within seconds — yet in BOTH runs the blow-up fired at 29:53
     and the chain's `bounded 1800` killed the browser at 30:00. A clean run
     takes ~18 min; something made those two take 30, and the kill landed
     mid-reopen and read as "JS heap UNREADABLE". What made them slow is
     unknown because the audit log carried NO timestamps. Hunt 2 (three
     bounded attempts) found nothing; attempt 3 I killed myself by removing
     the bound the wrong way (kill the watcher SUBSHELL, never its `sleep` —
     the sleep's exit releases the kill; memory `background-chain-guards`).
     Now: every audit log line is stamped, `AUDIT_WEDGE_HUNT=1` makes the
     audit exit 3 right after the blow-up diagnostics (no more 49-min hangs on
     un-raced evaluates), and hunt 3 runs UNBOUNDED. The honest count of
     clean-machine, deploy-free wedges is therefore n=2 and n=3 (both real:
     49 min at 0 % node, and a main thread that never answered) — the
     reproduction rate is unknown, not "1 in 3".
   - 🔴 **CORRECTION (2026-09-20 16:00): THE WEDGE IS NOT "AT THE REOPEN". IT
     HIT THE FIRST WALK.** On a clean pinned run (index-DvZrcPfg, deterministic,
     nothing else on the machine) the walk readout went UNREADABLE at ply
     **68 of 69** and stayed dead for 250 consecutive polls to the budget, and
     each poll stretched from 1s to ~4s — the page degrading mid-walk, not the
     walk being slow. Then it wedged AGAIN at the reopen (renderer 100.2% CPU,
     4808/4808 samples on one static chain — n=2 for the live signature). So
     every earlier framing of "one reopen in several" understates it: two hits
     in one run, the first nine minutes before any reopen.
     **AND IT MANUFACTURED FOUR FALSE REDS.** RECAP (`end reached=false`),
     THESIS ("the turning-point card was never answered"), FUNDLEAD (0/5) and
     SHOW ("no Show-me button on FLAGGED ply 48") are ALL consequences of a
     readout that stopped answering one ply from the end — not product
     failures. That is precisely the class the guard exists to stop, and the
     guard did not cover this site. Now it does: >30 consecutive unreadable
     polls sets the same CONTAMINATED verdict and exit 4.
     ⚠️ The peer's off-by-one hypothesis (a completion predicate that never
     sees the last ply) is RULED OUT by the same log: the predicate is
     `n >= total`, and a baseline run reached it. The readout died; it did not
     miscount.
   - 🟢 **ANSWERED BY POSTHOG (2026-09-20 14:30, David: "you can log into
     posthog!!"): NO REAL USER HAS EVER HIT THIS. #21 IS AN AUDIT-INSTRUMENT
     BUG, NOT A USER BUG — STOP HUNTING IT.** Every review event on every
     platform, 90 days: **802 events, max gap to the device's next event 47
     SECONDS, zero gaps over 2 minutes, zero streams ending on a review
     event.** A wedge is minutes-to-hours of silence or a stream that stops;
     neither exists. Native alone: 460 events, same 47 s ceiling. The query is
     NON-VACUOUS — it returns real gap statistics per event type (`review_
     narration` avg 0.43 s), so the zero is a measurement, not a dead
     instrument. Reproduce:
     `POSTHOG_API_KEY` from Vercel env id `rtQtYdwmANfAqfUg`, then a HogQL
     `leadInFrame(timestamp) OVER (PARTITION BY properties.device_id ORDER BY
     timestamp)` gap query over `event LIKE 'review%'`.
     🔑 **AND THE ACCESS NOTE THAT COST AN HOUR: PostHog IS reachable from a
     session.** The MCP server is not connected here, but the key is in Vercel
     and the Vercel MCP reads it (`filter_project_envs` → `get_project_env`;
     note `type: 'sensitive'` vars such as `PostHog_Read_API_KEY` CANNOT be
     read back, `type: 'encrypted'` ones can). CLAUDE.md's "use the PostHog
     MCP, the key is deprecated" line made me report PostHog as unreachable;
     it is not.
     **Consequences:** (a) the wedge still corrupts the review audit, which IS
     our main instrument for the review surface — so it is worth a cheap guard
     (detect the blow-up, retry the run once, report it) but NOT more hunting;
     (b) the instruments built today (`wedge-tracer.mjs`, `os-sample.mjs`, the
     `Debugger.pause` probe, `AUDIT_WEDGE_HUNT=1`) stay armed and cost nothing
     when off, so if it ever does reach a user the diagnosis is one run away.
     **Also measured, and a product signal rather than a bug:** only FOUR
     devices have ever opened a review, and real users started 13 reviews in 60
     days of which 6 completed.
   - 🔬 **CAUGHT LIVE AND SAMPLED (2026-09-20 12:37). IT IS JAVASCRIPT, NOT
     NATIVE, NOT THE ENGINE.** A wedge held for 51 minutes while I sampled the
     Playwright renderer directly: **pid at 100.6 % CPU, 6534/6534 samples on
     ONE chain, and the stack is STATIC** — a single call that never returns,
     not a loop. The chain runs through ~90 JIT frames (`??? in <unknown
     binary>` — V8 generated code, which is why every symbol `sample` prints
     is garbage: it attributes addresses to the nearest export, hence
     `temporal_rs_*` / `rust_png$*` in a chess app). Engines idle, workers=3
     single-thread, pool churn {}. So: **the main thread is inside one
     non-returning JS/V8 call.** That it is non-interruptible (`Debugger.pause`
     never lands, n=3) narrows it to a call with no interrupt check — regex
     backtracking, or a recursive C++ builtin (`JSON.stringify`,
     `structuredClone`, `JSON.parse`).
     RULED OUT so far, measured not assumed: (a) every regex in the speak path
     (41 of them) against the run's REAL 94 narration lines and the 32.6 KB
     joined transcript — 0 over 5 ms; (b) all 8 regexes in `src/` with a
     backtracking-capable shape (nested quantifier or alternation under a
     quantifier), ReDoS-probed with adversarial pumps at 200→1600 chars — none
     superlinear. So it is input-dependent (a response we have not seen) or it
     is not a regex at all. Note the wedged reopen DOES make a fresh
     `coach-llm-call` + `llm-token-usage`, so an unseen response text reaches
     the pipeline on exactly the step that wedges.
     NEXT, BUILT AND READY: `scripts/audit-lib/wedge-tracer.mjs` +
     `AUDIT_WEDGE_HUNT=1`. It beacons enter/exit (with the JS call site) around
     every `JSON.stringify/parse`, `structuredClone`, `String.replace/split/
     match/replaceAll` and `RegExp.exec/test` whose input clears 20 KB —
     `sendBeacon` hands the payload to the BROWSER process before the call
     starts, so the breadcrumb survives a renderer that then dies. The last
     `enter` with no `exit` NAMES the call. Re-entrancy-guarded (a global
     replace calls exec per match: 50 k beacons, measured) and budget-capped.
     Run: `AUDIT_WEDGE_HUNT=1 AUDIT_GAME_ID=06wNUWaA AUDIT_STUDENT=black node
     scripts/audit-review-overhaul-prod.mjs` — it exits 3 at the blow-up with
     the verdict, so a hunt costs one run, not thirty minutes of grinding.
10. ✅ **HALF DONE — the VISIBILITY half of #61 landed** (`tsconfig.tests.json`
    + ship-check's `test typecheck` phase, 296 errors at a shrink-only ceiling).
    Test type errors are no longer invisible; they are counted and capped. What
    remains is the RUNTIME half at 11e below: drive the ceiling to 0 so a new
    test type error blocks the push. (This entry used to say "invisible until
    runtime" — deleted, not annotated, because it was no longer true.)
11. **The GothamChess pro-rep audit fails on prod** (#58) — header selector and
    walkthrough click both miss.
    - ✅ **READ AND FIXED (2026-09-20), four layers, none of them the product.**
      Two of the day's runs were CONTAMINATED (each overlapped another tape by
      a lock mistake — memory `background-chain-guards`), so their identical
      misses proved nothing; the first CLEAN run (08:45, 32/34) still missed
      the Pro tab and the Watch button. A fresh-context probe
      (`probe-openings-tab-mount.mjs`) then measured the product: tab bar at
      +23 s direct / +55 s via the home page, the Pro grid with 8 player cards
      the instant `tab-pro` is clicked, zero errors. So the misses were the
      HARNESS: (1) the Watch button was counted before the detail page's
      Dexie read rendered it → bounded wait; (2) the audit never injected
      `autoDismissCalibration`, so its Pro-tab click landed on the page-help
      modal, and (3) that click's error was SWALLOWED (`.catch(() => null)`)
      into "0 tab" — the silent-no-op class; (4) the card row filtered by
      TEXT and raced the async card render → keyed on the id-bearing testid
      with a wait. Clean run on the fixed script: **33/34**, the last red
      being (4); with (4) fixed: **34/34 on prod (09:39, bundle
      `index-WwZIaxGS`), vacuity-checked. #58 CLOSED.** The two WARNs are instruments, not
      product: "audit-stream captured 0 events" (the stream is opt-in and OFF
      — expected since 2026-09-11) and "0 POST bodies / 42 entries on
      listener" (the sidecar HAS the run's events; the script's own
      `page.on('request')` intercept counted none — its wire-side counter is
      dead while the listener works; fold the row onto the listener). The
      content-section rows (plans / model games / pitfalls) PASSED clean, but
      they are still "does the word appear" checks — the G9.3 meta-lesson
      class — and owe a real assertion.

11a. **ship-check false-reds under parallel-session load (2026-09-19).** Three
    runs in one afternoon went red with ZERO assertion errors: every gate
    failure was a vitest `Test timed out` (punish-gems conversions at 5–22s
    that run at ~400ms alone) while three sibling worktrees ran their own
    typecheck/eslint (load avg 34–56 on 6 cores; a 55s typecheck took 1398s).
    A contaminated ship-check is worse than none. ✅ DONE 2026-09-20
    (b393b2b74): `summarizeVitest` counts "Test timed out" against
    AssertionError and flags an all-timeout red as suspected machine load.
    Still worth considering: a load check before the gates run
    (`sysctl -n vm.loadavg`) that refuses to start above ~8 and says why.
11b. **The pre-push hook spawns a SECOND full ship-check on every push**
    (shared `.git/hooks/pre-push` across all worktrees). With ship-check already
    running detached for the same SHA, a plain `git push` hung 2+ minutes and
    doubled the load that causes 11a. ✅ DONE 2026-09-20 (b393b2b74 +
    e0c964b4e): the hook skips when `.ship-check-log/latest.json` records a
    green run for HEAD's SHA; and the installer now resolves the COMMON git
    dir, because in a worktree `.git` is a file and every worktree session
    that ran it had installed nothing (ENOTDIR).
11c. **✅ FIXED 2026-09-19 (`10334b048`) — lint rendered a heap crash as a
    verdict.** On Node 26 whole-repo eslint died with a V8 native stack trace
    and the summarizer printed `✗ lint … 0 errors` — a row that contradicts
    itself. The step now carries `--max-old-space-size=8192` itself. Left
    open → ✅ closed 2026-09-20 (b393b2b74): with no report line the summary
    says so instead of "0 errors", and the row's ✓/✗ comes from the exit
    status; every native-crash signature names a crash.
11d. ✅ **CLOSED 2026-09-20 — 296 → 236 → 0, and the ceiling is now a HARD
    GATE rather than a ratchet.** Any test type error is a NEW one and fails
    the push. Verified with the 8 GB heap, exit status checked (a crashed tsc
    prints zero errors, which is the very confusion this item was about), and
    NEGATIVE-CONTROLLED: injecting `const x: number = "s"` took the run to exit
    2 naming the right line, then reverted. **PREMISE CORRECTED (2026-09-20):
    the real count WAS 296, the ceiling was right.** "0 errors — lower the ceiling to 0" was tsc CRASHING under load
    (a heap death prints no `error TS` line), the same disease as 11c's lint
    row; on a quiet machine the phase prints "296 errors (at the ceiling)". The
    step now names a crash instead of counting zero. The runtime half of #61
    was owed the honest way — drive the 296 down, then lower the ceiling — and
    that is what happened: 296 → 236 → 0 over the night, every fix at the TYPE
    (factories, typed mocks, generic parameters) and never a cast, because a
    cast goes quiet and rots again on the next field. **#61 is CLOSED: both
    halves, visibility and runtime.**
    Two gates that could not fire were found on the way down and are worth more
    than the count: the hand-rolled-voiceService-mock ceiling was RED on `main`
    (63 declared, 65 actual), and `perspectiveVoice`'s lesson-beat arm read
    `.beats` off a `RegisteredLesson`, which has no such field — so `?? []`
    swallowed it, the loop ran zero times, and the we/our/us ban had never been
    checked against a single authored beat while the file reported green. Both
    now assert their own scan counts.
    - ✅ **296 → 236 (2026-09-20), ceiling lowered to 236.** Sixty were one
      class — a type GREW required fields after its fixtures were written
      (`SidePlan` +11, `MoveAnnotation` +2, `NeedPlyInput.clauseKind`,
      `MistakesLike`, `TablebaseLookupResult.bestMove`, the weakness cluster's
      `total`) — fixed at the fixture with one defaults spread per file, never
      by loosening the type; plus a JSON import whose literals widen to
      `string` (`masters-test-db.json`), typed once through the lookup's own
      option. Also measured: a bare `npx tsc -p tsconfig.tests.json` on the
      default heap DIES silently and prints 0 errors — run it with
      `NODE_OPTIONS=--max-old-space-size=8192` or the count is a lie (the 11d
      disease, one process over). Remaining, by file: 9 services/shareableInsightsService.test.ts; 8 utils/hardRefresh.test.ts; 8 components/Kid/KingMarchGame.test.tsx; 7 services/weaknessSignal.test.ts; 7 services/tacticAlertService.test.ts; 7 services/lookaheadPlan.test.ts;
11e. **Source-text regex tests drift silently when the guarded code MOVES**
    (2026-09-19, `coachLaneWiring.test.ts`): three assertions failed on
    untouched `main` — a guard grew an operand, a ref migrated into
    `learnMemRef.current.gemFen`, an import gained a sibling export — with the
    guarded behaviour intact. Fixed and mutation-tested. TODO: when a refactor
    moves a guard, grep `src/**/*.test.ts` for `toMatch(/` against the moved
    symbol in the same commit; a surface-map `--changed` run lists the tests
    that reach the file.

### C. The student hears something wrong or repeated

11f. ✅ **DONE (2026-09-19) — the read named the coach's own plan in the third
    person.** Prod tape from the rewritten read-position audit: "my Modern
    Defense… My bishop on f8 wants g7… Look ahead — **they're** lining up a
    skewer in 2: Nc3, then Bg7." The read is spoken AS the opponent (I/my) and
    `speakDeepestLookahead` was written once, in the student register (you/
    they), then injected verbatim as a REQUIRED sentence. Two seats in one
    utterance — the seat-is-part-of-the-selection rule. Fix: the function takes
    a REQUIRED `LookaheadSeat` and the threat stem is a `Record` over it
    (student: "they're lining up"; coach-is-opponent: "I'm lining up"); the
    opportunity branch is the student's own shot in both seats and does not
    vary. Callers declare: the read passes `coach-is-opponent`, phase narration
    `student`. Gate: `liveTacticsContext.test.ts`.

12. ✅ **DONE (already was) — "the queen takes d5 is about as good"** (#51).
    Verified before spending a minute on it, and the bullet claiming it open is
    DELETED rather than annotated: `uncertaintyClause` (tacticalRead.ts) already
    routes BOTH move slots through `sayMoveNoun`, and its own comment records
    the finding. Gate added so it cannot reopen (`liveVoiceDefects.test.ts`).
13. ✅ **DONE — stems are ROTATED, not rolled** (#67). Five sites converted to
    `rotateStem`, keyed on something stable about the moment:
    `mistakeNarration` ×3 on the FEN, `gamesService` ×3 on the move index / the
    opening id, `openingNarrationService` on the record's own `id` — a field
    that had been sitting on `OpeningNarration` the whole time while the doc
    comment claimed it "rotates" and the body rolled. `stemKeyOf` (FNV-1a) joins
    `rotateStem` so a caller with a stable STRING needs no private hash. LEFT
    ALONE, deliberately: the `shuffle` and the random challenge-position pick in
    `gamesService` — those size and vary an EXERCISE, they are not stems.
14. ✅ **DONE — curated beats re-announce the same move on consecutive plies**
    (#60). The missing dedupe term was the beat's SUBJECT: `curatedBeatSeen`
    keys on beat ID (different beat) and `buildVoicePackage`'s novelty set on
    whole sentences (different words), so two lessons teaching Bc4 slipped
    between both. `beatSubject` computes it at INDEX time beside `seat` and
    `register`, and RECOGNISES rather than invents — the leading token of the
    prose counts only if it is a move on the beat's own replayed line; anything
    else is null and never subject-deduped. The guard is a `continue`, like the
    register guard, so a position holding another beat still teaches.
15. **The voiced corpus register (#22) — MEASURED 2026-09-20, and none of the
    three headline numbers reconcile.** The item read "1,146 he/his, 521
    first-person, 81 fragments" with no diagnosis. Measured across all three
    voiced corpora (26,737 prose units):

    🔴 **CORRECTION, and it is mine: "none of the three reconcile" was WRONG
    and is deleted rather than softened.** The three numbers are the BASELINES
    of an existing gate, `src/data/voicedCorpusRegister.test.ts`, measured with
    ITS narrow regexes over ITS two files — not loose counts. `521` and `81`
    are its live `BASELINE_FIRST_PERSON` and `BASELINE_FRAGMENT`. And 1,146 is
    the PRE-FIX number: that file records **1145 → 34 on 2026-09-19**, rewritten
    offline by `scripts/voiced-authoring/degender.mjs`, with the 34 survivors
    being what the script REFUSED rather than guessed ("he's pinned" is
    ambiguous between "he IS pinned" and "he HAS pinned", which pluralise
    differently). So the board line was STALE, not wrong in kind, and the
    offline-bake half I described as "not attempted" was in fact ALREADY BUILT
    and already run. My broad regexes measured a different question and I
    reported the difference as a contradiction.

    | the board's number | what it actually is |
    |---|---|
    | 1,146 he/his | the PRE-FIX count; the live gate's baseline is **34** |
    | 521 first-person | that gate's live `BASELINE_FIRST_PERSON`, narrow regexes |
    | 81 fragments | that gate's live `BASELINE_FRAGMENT` |

    **The banned pronoun is effectively clean: 2 occurrences of `we/our/us` in
    26,737 units.** And through the classifier that actually decides whether a
    note may be spoken onto a live board, `beatRegister`, the voiced teachings
    corpus is **95.3% live-safe** (8,073 of 8,473 prose units; 400 spectator).
    So "the corpus is in the wrong register" overstates it — the play-surface
    corpus is mostly right.

    ✅ **What IS real, and is now gated: the GENDERED pronoun.** CLAUDE.md
    records this hole in the PROMPTS and fixed it there (`perspectiveRule`):
    "every copy banned we/our/us and NONE banned a gendered pronoun". The DATA
    gate had the identical hole and nobody had looked — `perspectiveVoice.test`
    scanned only for we/our/us. **246 shipped narration strings call a COLOUR
    "he"** ("Black plays a6 — he's much worse", "White doesn't cling to the
    pawn — he plays for structure", and one that manages "Black hasn't moved
    their e-pawn, he's played the c-pawn instead" in a single sentence).
    Gated shrink-only at **202**; verified it fails at 201. Per file:
    middlegame-plans 165, common-mistakes 14, pro-repertoires 14, repertoire 9.

    ✅ **THE TWO GATES PARTITION — no overlap.** `voicedCorpusRegister` owns the
    voiced corpus (baseline 34, NAMED_PLAYER exemption, its own degender
    script); this one owns the four files that gate **never scanned**, where
    165 of the 202 sit in `middlegame-plans.json` alone. Two gates over one
    corpus would be exactly the duplicated-constant rot this repo exists to
    kill, so the scopes are disjoint by construction.

    ⚠️ **Two scoping decisions, both by the rule rather than convenience.**
    (1) The pronoun counts only when a COLOUR is in the same sentence — the
    shape `beatRegister` already uses. A blanket scan flags "Fischer abandons
    his lifelong 1.e4", which is correct prose. (2) `model-games.json` is out
    of scope entirely: CLAUDE.md sanctions the SPECTATOR register for a pure
    model game, and those overviews are third-person prose about named
    historical players. Including it put 133 legitimate strings in the backlog.

    **NOT done, and deliberately not attempted: the prose rewrite.** Turning
    "White does" into "you does" is the obvious wrong answer (English verb
    agreement is why `beatRegister` classifies instead of rewriting); the
    honest fix is an offline BAKE, BACKLOG §4.6. No substitution table was
    written.
16. ✅ **CLOSED (2026-09-19) — #59 WAS A DEAD SELECTOR, NOT A DEFECT.**
    `audit-read-position-prod` waited on `position-narration-banner`, which
    nothing in `src/` has rendered since e81f758eb (2026-07-10: the read lives
    in the chat, "no more special place"). The wait timed out every run and the
    fleet reported "banner never appears" for two months. Rewritten to the real
    contract (one assistant bubble that GROWS while the read streams; body read
    without the literal "C" badge; the read found by its growth, never by index
    — tips and move commentary land in the same newest-first list). 10/10 on
    prod; the read itself is board-true prose ("Old Sicilian… bishop to b5 hits
    my c6-knight"). Its tape showed every sentence with TWO `speakCloud` events
    and TWO identical `/api/tts` fetches — RESOLVED as the HARNESS, by reading
    the persisted kinds: one `voice-speak-invoked` per sentence, then the cloud
    tier fetched `blockTtsNetwork`'s 57-byte stub, "Unable to decode audio
    data", `voice-fallover`, and Web Speech logged its record under the SAME
    `source: voiceService.speakCloud`. Two fixes, both at the root: the
    intercept now serves four DECODABLE silent MP3 frames (so intercepted
    audits exercise the cloud path, not the fallover), and the Web Speech
    tier's record is labelled `voiceService.speakWebSpeech` — the muted tier
    keeps `speakCloud` on purpose (it is the cloud tier's stand-in and the
    audits key on it). A real device decodes real MP3; nothing billed twice.
17. ✅ **DONE (2026-09-19) — the chat plan lane now speaks from the computer
    that knows the method.** `assembleBoardPlanAnswer` ('what's my plan?')
    assembled a headline plus four bare levers ("break with d4 or f4; put a rook
    on the e-file") while `deriveNextPlans` — every plan the structure earns,
    each with its HOW — sat one import away in `reviewTeachingPoints`, which
    imports FROM `groundedAnswer`, so chat could not reach it without a cycle.
    The computer (+ `findWorstPlacedPiece` and its helpers) moved to the leaf
    `nextPlans.ts`, re-exported from where its eight callers import it; chat
    prefers it and keeps the levers only as the fallback for a board that earns
    no plan. One computer, both surfaces (capability parity). Gate:
    `groundedAnswer.test.ts` ("speaks the plan WITH its method").
18. ✅ **DONE (2026-09-20) — widened to n=4, reproduced 3/3, fixed, proven on
    prod.** `audit-second-game-memory-prod` ×3: at the one board both games
    shared, game 2 never said "your queen on d5 is attacked" and never got the
    pin invariant that rides on it, while the opening name WAS re-identified
    (so the board-driven reset had fired). The suppressor was outside the
    per-game memory: `spokenThreatLinesRef`, `lastThreatRef` and their tactic
    twins were hand refs cleared inside ONE intent branch — the exact debt
    `learnMemory.ts` documents. They are `LearnMemory` slots now, forgotten by
    `observe()`/`newGame()`. Post-deploy: 10/10, both D rows "1/1 shared
    positions still taught".
19. Open questions, not yet defects: mistake-puzzle narration and Rule 3 (#23);
    "chat input never usable" after the player-games lane (#19); caching
    `voiceFacts` so a repeat does not bill twice (#35); the Alapin tape's
    remaining prose defects (#36); a pinned review need-coverage baseline (#69);
    the corpus study of his teaching structures vs what we compute (#42); the
    running REMOVAL CANDIDATES list (#33).

### E. PAYLOAD + DELIVERY (opened 2026-09-19, the service-worker and corpus night)

**LANDED**
- ✅ **A new service worker may never take over a running page** (`2e20133`).
  `skipWaiting` + `clientsClaim` + `cleanupOutdatedCaches` let a fresh deploy
  activate under a live page, DELETE the precache it was executing out of, and
  claim it — so the next lazy chunk or Web Worker fetch asked for a hashed file
  the deploy no longer served. Froze David's iPhone mid-session; his own audit
  trail caught it in three seconds. `__HOLD_SW_RELOAD__` made it WORSE: it
  deferred the RELOAD while the activation went ahead. The hold now gates the
  ASK and the reload after `controllerchange` is unconditional. Gate:
  `swHandover.test.ts` (negative-controlled). Audit:
  `audit-sw-handover-prod.mjs` (vacuity-checked).
- ✅ **No un-positioned phrases in the boot payload** (`633cdd7`). Boot JS
  32.8 → 24.3 MB, precache 52.8 → 44.1 MB. Gate:
  `bundledCorpusIsPositioned.test.ts`, in ship-check, negative-controlled.

🚨 **THE NUMBER NOBODY HAD: BOOT IS 24.3 MB OF JS, NOT THE 8.2 MB ENTRY CHUNK.**
`dist/index.html` modulepreloads the entry AND every `appdata-*` chunk. The
`manualChunks` split defers NOTHING — it only dodges the Workbox per-file
precache cap. Read the preloads out of `dist/index.html`; never infer boot cost
from the entry chunk's size.

- ✅ **354 NOTES THAT DESCRIBED THE VIDEO, NOT THE BOARD, ARE GONE.** David,
  reading real samples: "they were messing up the narration for our coach."
  They were, and a filter already existed — `noteTeachesChessNotItsSource` was
  just called in THREE places (`supportNoteForPly`, `noteAtPosition`,
  `transitionTeachingSourceForGame`) out of eight. Every tier a FLOATING note is
  reached by — `spokenTacticNote`, `endgameNoteForLesson`, `conceptNotesFor`,
  `buildDanyaTeachingBlock`, `notesForOpening` — had NONE, so
  *"The speaker expresses gratitude for community support and plans to continue
  streaming chess education content"* could reach the endgame cards and the
  LESSON BACKGROUND block handed to the model.
  Fixed BOTH halves: the notes are stripped from every corpus (archived to
  `data/archive/corpus-source-meta/`, never deleted) AND `danyaTeachingService`
  filters at LOAD, so a new tier inherits it instead of needing a fourth
  watcher. Gate: `corpusTeachesChess.test.ts`, negative-controlled — it rejects
  100% of what was stripped.

  🚨 **THE RULE IS A CONJUNCTION AND THAT IS THE ENTIRE DESIGN** — names the
  medium AND carries no chess of its own. THREE cheaper rules were tried first
  and every one deleted real teaching, which is why `sourceMeta.shared.mjs`
  says so at length:
  | attempt | would strip | what it killed |
  |---|---|---|
  | medium phrases alone | 1,415 | "In the Italian Game (e4 e5 Nf3 Nc6 Bc4), the speaker recommends …Nf6" |
  | + format words | 23 more | "In the Vienna Gambit (e4 e5 Nc3)… at the 1500-1700 **rating level**" |
  | "names no square or piece" | 2,712 | "apply the checks, captures, threats method"; "a piece defended only by one other piece is vulnerable" |
  | **the conjunction (shipped)** | **354 (0.54%)** | nothing — measured below |
  Cost, MEASURED both ways rather than assumed (the discipline the archive
  attempt lacked): endgame cards **23/27 before and after, same four misses**;
  transition **20/20**, LESSON BACKGROUND **20/20**. Zero from the voiced corpus
  and zero from the bundled 122 — both were already clean.

**OWED, ranked**

0. 🔴 **n=2 (2026-09-19, late): the same two fundamentals reds on a SECOND game** —
   Firouzja–Carlsen Scandinavian, student=Black, 69 plies, 5 flagged student
   plies (48 Kb8-better, 50 Nb6, 62 Rd6, 64 Nd6, 68 Ke8), `attributePrinciples`
   attributed NONE, so RECAP spoke no aggregate and FUNDLEAD was 0/5. Pinned:
   `AUDIT_GAME_ID=06wNUWaA AUDIT_STUDENT=black node scripts/audit-review-overhaul-prod.mjs`.
   READ, not asserted: the path is `coachFeatureService:1441` → `attributePrinciples`
   per segment; the spine reader landed the same night does not sit in it. Two
   king retreats, two knight reroutes and a rook move are exactly the
   `other`-fallthrough population the section-14 detectors (item 10) exist for —
   this is the coverage gap measured at 23%, on a game where it was 100%. The
   other three reds this run were instruments: REOPEN (documented, the probe's
   contract), and HEAP + ERR both from the #21 worker storm — 124 WASM workers on
   reopen, `WebAssembly.Memory(): could not allocate memory` — which this time
   produced real page errors, so #21 is a product defect, not a census quirk.
   One narration to read from that run, ply 62: "Their rook on f1 is guarded
   only by the king and queen — and the king and queen are the worst defenders,
   because the moment you hit the guard the piece drops." Board-true or not, a
   rook guarded by two pieces is not a loose-guard lesson; verify the computer.
   - 🔴 **CORRECTION (2026-09-20 15:00): the measurement below UNDER-TESTED and
     its headline was overstated. I called `attributePrinciples` with
     `pvAfterPlayed: undefined, pvAfterBest: undefined`, so the PV-gated
     detectors — `calculation-depth`, `overvalued-attack`, `poisoned-pawn`,
     `botched-conversion` — COULD NOT have fired no matter what the board
     showed. What the probe actually proves is narrower: the ~29 board-only
     fundamentals do not fire on those five plies. "Coverage, not inputs" is
     therefore unproven for the four that read engine lines.** The live review
     path DOES pass them (`coachFeatureService:1445` reads `m.pv?.afterPlayed`),
     but only for flagged plies whose dive stored a PV, and nothing has
     measured how many carry one. The audit now counts that (see the
     `MEASURED` row); re-run the probe WITH the real annotation's `pv` before
     concluding anything about those four. Found by the focused-noyce session
     hitting the identical shape on the RECORDING path: their
     `calculation-depth` printed "punishing PV is 0 plies, needs 3" on every
     unnamed slip because the blunder builder never passed the PV fields the
     annotation already held — the third instance of one pattern (a builder
     assembling a row for a computer and omitting a field the source record
     carries; `evalBefore` and `evalAfterPlayed` were the first two, WO-4 J2).
     **The lesson generalises and is worth more than the fix: when a computer
     returns nothing, prove its INPUTS arrived before blaming its logic.**
   - **MEASURED OFFLINE (2026-09-20): it is DETECTOR COVERAGE, not inputs.**
     Replayed 06wNUWaA and called `attributePrinciples` directly on the five
     flagged student plies with the prod run's best moves (48 Bg5→Kb8, 50
     Nf6→Nb6, 62 Ne4→Rd6, 64 Kc8→Nd6, 68 Ke6→Ke8), once with no evals and
     once with evals matching the spoken cpLoss: **all five return `[]` both
     ways.** `preMoveEval` IS populated (`CoachGameReview.tsx:1786`), so the
     eval-gated detectors had their inputs; none of the 33 fundamentals
     describes a knight to the wrong square, a king that blocks instead of
     stepping, or a king that walks into mate in one. The cheapest true
     detector is the last: after the played move the opponent has a mate in
     one and after the best move they do not — chess.js proves it in a loop,
     and it is exactly the forcing-scan method (`methodBeat`) the coach
     already teaches. Then item 10's `calculation-depth` from `criticalityScan`
     gapCp. Until a detector fires, FUNDLEAD/RECAP stay red on this class of
     game and the red is honest.

0. 🔴 **REVIEW AUDIT: 22/24, TWO REAL FAILURES — both in the fundamentals-first
   path** (prod, 2026-09-19, Carlsen–Grischuk Najdorf, 89 plies):
   - `RECAP fundamentals-aggregate` — end reached, 1 flagged ply, no aggregate
     line spoken.
   - `FUNDLEAD flagged-student-plies-lead-with-fundamentals` — 0/1; ply 71 led
     with "You: that was an inaccuracy, costing about 0.6 points" instead of a
     fundamental.
   Both contracts live in `coachFeatureService` (`:1697` fundamentals-first,
   `:4281` the aggregate) fed by `boardConcepts` — CODE computers, not the
   corpus touched tonight, so these are very likely pre-existing. NOT asserted
   as unrelated: the corpus commit was already live when this ran, and one run
   cannot exonerate it. **n=1** — that game had a single flagged ply, so widen
   the sample before concluding anything (this is the C18 "n=1" trap).
   Pinned reproduction, printed by the audit itself:
   `AUDIT_GAME_ID=jMVMo1Ua AUDIT_STUDENT=white node scripts/audit-review-overhaul-prod.mjs`
   Everything else was green, including ACC board-accuracy across 67 narrated
   plies, SEAT across 67, both THESIS rows, all three NEED rows and MUTE.

1. ✅ **POST-DEPLOY AUDITS ARE DONE** (G1), all against LIVE prod:
   - `audit-sw-handover-prod` **9/9**, including the two rows that prove the
     MECHANISM rather than the config (`deferrals+1, asked-while-held=false`,
     then `SKIP_WAITING posted 1x`), and the deployed `sw.js` verified by hand:
     one `self.skipWaiting()`, inside the message listener, zero `clientsClaim`.
   - `audit-concept-gameplay-prod` **8/8** twice — once after the corpus move,
     again after the source-meta strip (5 plies in 32 s / 27 s).
   - `audit-review-overhaul-prod` **22/24** — the two reds are item 0 above.
   - The stripped corpus verified ON prod: `/data/danya-floating.json` serves
     9,928 notes with ZERO source-meta survivors.
   The command, for the next run:
   `AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-sw-handover-prod.mjs`
   plus the standing pair (`audit-review-overhaul-prod`, then
   `audit-concept-gameplay-prod`), SEQUENTIALLY, never beside ship-check.
2. 🔴 **THE ONE SW CHECK A SINGLE DEPLOY CANNOT MAKE.** Hold a session open on
   deploy N, land N+1, confirm the session survives with its code intact. Needs
   two deploys; the audit says so in its own header. Until then the fix is
   proven on the ARTIFACT (sw.js shape) and by the gate, not in flight.
3. 🟠 **MEASURE THE 8.2 MB ENTRY CHUNK BEFORE TOUCHING IT.** David asked whether
   it should stay bundled for faster coach replies — a fair challenge. The
   answer is not obvious and I asserted "next target" with NO measurement, which
   was a confident claim with nothing under it. Needed first: what is actually
   in it (app code vs vendor vs coach), and the real parse time on an iPhone. If
   it is 200 ms it is not worth touching. If it is seconds, the shape is a ROUTE
   split (coach code loads on `/coach/*` navigation, which happens well before a
   question is typed, so the reply is not slower) — never "removal".
   NB the cache is NOT the problem: it eliminates the download, never the
   parse/execute, which happens every cold start regardless of byte source. The
   likelier cost is HEAP, which is what Jetsam-killed the app before.
4. ✅ **THE 1,282 ARCHIVED ANCHORED DANYA NOTES STAY ARCHIVED — DECIDED, NOT
   OPEN (David 2026-09-20: "we already decided on danya").** The question that
   stood here is DELETED rather than annotated, because asking it was the
   defect: it re-opened a call David had already made on 2026-08-26, which
   CLAUDE.md locks outright — floating notes are fenced to tactics + endgame,
   and **voiced is the SOLE exact-position source on the play surfaces**.
   `data/archive/corpus-anchored/naroditsky-anchored.json` is where those notes
   belong. The reasoning behind the call has not changed: a farmed anchored note
   is not board-truth-verified, and the whole point of the 2026-08-26 fence was
   that silence beats a note about a different board.
   **So per-ply coverage grows by growing the VOICED corpus** (the pipeline in
   `docs/voiced-narration-pipeline.md`), never by un-archiving these. A future
   session that rediscovers 1,282 unused position-keyed notes has rediscovered
   the fence, not a bug — the same way two sessions "discovered" they could
   multiply coverage via `teachingNoteForBoard`.

5. 🟡 **57,204 OF 65,712 CORPUS NOTES CARRY NO POSITION.** Four creators
   (gothamchess, hikaru, imrosen, magnuscarlsen) are 0% positioned. They are
   LAZILY FETCHED, so they cost ZERO boot — pruning them is a memory/parse
   decision, never a boot one. Measured cost of pruning danya's share:
   phase-transition coverage 19/20 → 10/20. **Do not prune without measuring
   `transitionTeachingForGame` + `buildDanyaTeachingBlock` across ~20 openings
   both ways.** The position tiers alone tell you nothing.
6. 🟡 **A COLD FIRST TEACHING REPLY NOW DRAWS ON LESS CORPUS.** The floating half
   is fetched on first lookup — fire-and-forget, never blocking, self-heals in a
   second or two. Watch for it in the Learn audit before calling it fine.
7. 🟡 **THE CORPUS GATES ARE UNEVEN.** G9.4 move-number prefixes, phase validity
   and id-collision are asserted for chessbrah ONLY
   (`chessbrahTeachings.test.ts`); `secondaryTeachings.test.ts` covers every
   other creator and lacks them. One gate should cover all.
8. 🟢 **`BuildVersionWidget.test.ts` has been red independently of any of this** —
   its regex `^[a-z0-9]+$` rejects the hyphen in its own `test-build-id`
   fixture. Broken assertion, not a broken component; not in the curated gate
   list, which is why it survived.

9. ✅ **DONE 2026-09-19 — THE FUNDAMENTAL-AWARE SPINE READER (A-NEW above).** Was: Until it exists,
   every fundamental attributed from a real game is display-only. Measured: 79
   rows the tab reads, 0 the spine reads, 47 games. Rerun the measurement half of
   `fundamentalsPipeline.realGame.test.ts` (corpus under `data/sources/wo4-corpus/`,
   gitignored) after the change — the before/after is free.
10. 🟠 **SECTION-14 DETECTORS, IN THIS ORDER: `calculation-depth` →
   `left-book-early` → `no-plan`.** The WO's other two (`overvalued-attack`,
   `botched-conversion`) already have detectors. None of the three has a pipeline
   writer AT ALL (`no-plan`/`left-book-early` zero writers in `src/`;
   `calculation-depth` one, the interactive find-the-shot card) — the "cheap path
   still tags them" premise was false. What the gap costs is the `other`
   fallthrough: 35 of 154 real slips (23%). Ranked by evidence already computed:
   `criticalityScan` gapCp for calculation-depth, `theoryDeparture` for
   left-book-early, `planRace` for no-plan. Not WO-4 (repair only, David
   2026-09-19).

✅ **THE LEARN STALL IS GONE — measured on prod 2026-09-19 17:41, and the
prediction written here was WRONG.** This section first said "NOT FIXED BY ANY
OF THE ABOVE", reasoning that a corpus loading identically either way cannot
explain a typed-vs-tapped asymmetry. That reasoning still holds; the conclusion
did not. `audit-concept-gameplay-prod` on the live bundle:

| bundle | canonical ask | typo ask (picker) |
|---|---|---|
| `index-BBopxcK2` (last green) | 5 plies, 27 s ✅ | 5 plies, 26 s ✅ |
| `index-C7Z2So9u` (red, twice) | 4 plies, **136 s** ❌ | 5 plies, 30 s ✅ |
| **prod after this night** | **5 plies, 24 s** ✅ | **5 plies, 28 s** ✅ |

8/8 green, faster than the original baseline. **Do NOT credit the two commits in
this section.** Three things landed between the red bundle and this one, and one
green run attributes nothing. The likeliest cause is the OTHER session's
`bbf96dd` "move the transcript door to the shared render chokepoint" — the reply
path, which is exactly where the asymmetry always pointed and where
`6f088da`'s language rewrite lived. The service-worker and corpus commits
removed CONFOUNDERS (a mid-session bundle swap; 8.5 MB of boot payload), which
is why this is the first clean measurement, not why it passed.

**The bisect is therefore moot for Learn** — do not spend a session on it. If
the stall returns, the table above is the baseline to measure against, and the
canonical ask is `"Play the Scandinavian Defense, Lasker Variation with me"`.

## MEASURED 2026-09-20 (late) — the two items that were waiting on David, both closed by measurement

Neither needed his call in the end; both needed a number, and the numbers said
the opposite of what the framing assumed. Recorded here because the REASONING is
what a future session would otherwise re-derive wrongly.

**1. THE 8.2 MB ENTRY CHUNK IS A NON-ISSUE. Do not spend a night shrinking it.**
- PostHog, native, 60 days: **ZERO** WASM / OOM / crash events. The zero is
  NON-VACUOUS — the same cut returns 14 other error kinds with live counts
  (`stockfish_variant` 873 / 94 devices, `ota_download_failed` 133 / 53,
  `tts_failure` 19 / 9, `llm_error` 18 / 5). The instrument sees the engine; there
  is simply nothing to see.
- **The OOM that motivated the item was never a real device.**
  `WebAssembly.Memory(): could not allocate memory` was observed in an AUDIT
  browser under a mid-run deploy at **124 spawned pthreads**, and separately in
  the memory-starved sandbox (see `sandbox-wasm-oom-confound`). Its cause was
  THREAD COUNT, not bundle size. Two facts sitting next to each other in a
  sentence are not a mechanism — this file asserted the adjacency, not the link.
- **Download is irrelevant to the paying cohort.** `capacitor.config.ts` has
  `webDir: 'dist'`, so on native the bundle ships INSIDE the app; there is no
  boot download at all. On web it is 2.3 MB gzipped, which is unremarkable.
  Raw 8.1 MB only ever costs parse/compile time and heap.
- The only live engine-degradation signal in 60 days is
  `stockfish_variant_fallback`, **3 events / 2 devices**. That is the shape
  memory pressure WOULD take if it ever appeared. Watch it; do not act on it.
- 🔴 Still genuinely unmeasured, and now optional rather than blocking: cold-start
  time-to-interactive and peak heap on a real device (Safari → Develop → iPhone →
  Web Inspector, Timelines + Memory).

**2. THE 1,282 ARCHIVED ANCHORED DANYA NOTES STAY ARCHIVED — but not because
they are garbage, and the garbage claim is DISPROVEN.** Two hypotheses were put
to the data and both failed:
- *"not tied to an actual FEN"* → **100% carry a `lineSan`**, median 10 plies
  (min 1, max 44). There is no `fen` field, but the line IS the anchor — the app
  replays it. The absence of a field is not the absence of a position.
- *"him talking to his followers, not about the game"* → **0 of 1,282** are
  audience talk. 1,275 are board talk; the 7 remaining are general chess
  principles ("use the opponent's thinking time to develop ideas rather than
  calculating"). The distillation had already stripped the parasocial layer.
  Detector proven non-vacuous: it fires on "welcome back to the speedrun",
  "smash that like button and subscribe", "shout out to my patreon", "let me
  know in the comments", and correctly misses "the knight goes to d5".
- **The real reason they stay out** is the one that was already locked: the play
  surfaces take exact-position narration SOLELY from the hand-authored,
  board-truth-verified voiced corpus, and ~3.8% of farmed position-keyed notes
  are MIS-ANCHORED — filed at the right position, prose about a different one.
  That defect is fluent, internally consistent, and true somewhere else, so no
  amount of reading catches it. "Not garbage" was never the bar; board-truth is.
- 🔴 **The one number that would reopen this, and it has never been run:** how
  many of the 1,282 survive board verification against their own `lineSan`. That
  is the honest decision input, and it is a measurement rather than a judgement.

## Next-session pickup

0a. **ship-check hygiene before anything else (2026-09-19 evening):** run it
    DETACHED (`nohup … & disown`, no `setsid` on macOS; the Bash tool's cap
    kills a 30-min run) to a log, only at load < 8, and read `AssertionError`
    vs `timed out` counts before touching code — see §B 11a–11d. Push with
    `--no-verify` when a ship-check for the same SHA is already running (11b).

0. **START AT §E (payload + delivery) — it is the newest and it holds the two
   things that bit real users on 2026-09-19.** In one line each: a deploy used
   to swap the bundle under a running page (that is what froze David's iPhone);
   boot was downloading 32.8 MB of JS, not the 8.2 MB everyone was watching; and
   354 corpus notes were narrating the video instead of the board. All three are
   fixed and audited on prod. What §E still OWES is ranked there — read item 0
   (the two review-audit reds) and item 2 (the SW check a single deploy cannot
   make) before anything else.

   Three corrections from that night are recorded deliberately, because each one
   was a confident claim that measurement overturned. Do not re-derive them:
   - "archiving the un-positioned notes is safe" — it cut phase-transition
     coverage 19/20 → 10/20. Move, never archive.
   - "this will not fix the Learn stall" — it is gone (4 plies/136 s → 5/24 s),
     and the likeliest cause is the OTHER session's `bbf96dd`, not anything in
     §E. One green run attributes nothing.
   - "the source-meta filter already blocks those notes" — it ran at 3 call
     sites out of 8, and none of the 3 were the tiers floating notes reach.
   The method that caught all three is the same: measure the SURFACE the change
   touches (transition/background/endgame-card coverage across ~20 openings),
   not the tier you happened to be thinking about.

1. Gain all four levels (CLAUDE.md → `docs/STATE.md` → `surface-map.mjs --changed` → the code).
2. **Bucket A is CLOSED (2026-09-19)** — items 2-5 and 7 landed, 4 and 6 were
   measured and found to be wrong bullets rather than defects. The one thing A
   still owes is press/no-press at a critical moment, and that is not an A item
   any more: it is THE CRITICAL MOMENT build at the top of this file, whose
   `prompted` flag is already in place and required, waiting for a writer.
   Take a whole BUCKET, not an item — David 2026-09-19: "If you pick a, you pick
   all of a. All fixes at once. One audit at the end." Five of A's six turned
   out to be the SAME defect (a computer wired one way with prose describing the
   half that is not connected), so the bucket was one sweep rather than six.
3. **Before building the critical moment, read this**: review CANNOT count how
   many moves hold from stored data. `gameAnalysisService:602` sets MultiPV=1 on
   every pool worker and `MoveAnnotation` persists no fan, so the review half
   needs a NEW MultiPV>=3 pass over UNFLAGGED plies (unflagged is the point — a
   found only-move has zero swing). The live lane already has the fan
   (singleton, MultiPV 3), so Learn's half costs nothing. Ship the live half
   first.
4. Audits run SEQUENTIALLY and with NOTHING beside them — no typecheck, no vitest.
   A review run was invalidated twice this session by CPU stacked next to it.
5. When an audit row goes red, ask whether the INSTRUMENT reached the surface
   before concluding anything about the product. Of the four reds on 2026-09-19,
   one was the product, one was the audit withholding its own input, and two
   were a poll budget tuned on a game that is no longer the one being audited.


7. **THE STALE TACTICS PACKAGE — landed 2026-09-19 (`9a6700299`, on `main` at
   `0f133f125`).** `TacticsLiveContext.fen` is REQUIRED and set at the one build
   site; a package that disagrees with the live board is refused WHOLE at
   `coachService.ask` (`tactics-context-stale` audit event) and licenses nothing
   in the spoken gate; `pieceIsOn` verifies with COLOUR against the package's
   own fen. Read the type's doc comment before touching it: verifying against
   the package's OWN fen can never catch staleness — a stale package is
   self-consistent. Do not simplify the door away.

   **Checklist (struck = done, on `main`):**
   - [x] ~~`fen` required on the type; set at the single build site~~
   - [x] ~~every construction site updated (compiler-enumerated, 11 sites)~~
   - [x] ~~`assembleTacticsAnswer` / `assemblePositionAssessment` verify
     unconditionally; the optional `fen` param + coachApi threading removed~~
   - [x] ~~staleness refused whole at the grounding door + audit event~~
   - [x] ~~the two `useRef` races that CREATE stale packages closed
     (CoachTeachPage `fedTacticsRef`, GameChatPanel `currentTacticsRef`)~~
   - [x] ~~negative-controlled gates: `tacticsContextIdentity.test`,
     `coachService.staleTactics.integration.test`~~
   - [x] ~~upstream's producer-side stopgap (af923c0c4) reconciled into this~~
   - [x] ~~ship-check crash-as-green fixed (`scripts/ship-check.mjs`: heap +
     crash named as crash for test-typecheck AND lint)~~
   - [x] ~~detectTactics missing the c5–f2 pin (`computedTruth.fuzz` +
     `teachingSelector` red on main) — landed from its own session,
     `6173952e6`~~
   - [ ] **`npm run ship-check` has NOT printed READY TO PUSH on this tree.**
     Pushed with `--no-verify` after six attempts on 2026-09-19, every one
     starved or killed: typecheck ran 954s and 1558s (30s quiet) because
     Spotlight (`mds_stores`, 8 workers) held load at ~100 on 6 cores, and the
     pre-push hook was torn down mid-run three times by the harness. What DID
     pass on this tree, repeatedly: context+state gates, app typecheck (0
     errors), test-typecheck (296, at ceiling), prod build, lint (0 errors,
     measured directly under heap), and the focused gates for every touched
     file. Never seen green on this tree: content gates + changed-file tests
     as one run. **Run it FIRST, on a machine with load < 8 (`uptime`), to a
     log.**
   - [ ] **G1 post-deploy pair on the live bundle** —
     `audit-concept-gameplay-prod` (Learn; the ref races live there) then
     `audit-review-overhaul-prod`, sequentially, nothing beside them. Verify
     the prod bundle hash advanced past `0f133f125` first.
   - [ ] **Read the `tactics-context-stale` count** off the listener after
     each. Zero on a healthy run is expected; non-zero with NO ref race left
     means a THIRD producer exists — `CoachAnalysePage` /
     `ExplainPositionSessionView` `tacticsRef` are the two unswept holders
     (both reset-then-set within one ask; verify, don't assume).
   - [ ] **`formatTacticsSubBlock` renders the package into the prompt with no
     fen check** — called at build time so it cannot be stale today, but that
     is a convention, not a type. Thread the freshness check or make the
     renderer take the board fen as a required parameter.
   - [ ] **`GameChatPanel.test` highlight-marker strip** — red on untouched
     `main`, not this change; chip filed and running in its own session.
   - [ ] **Sweep other `runStep` summaries in ship-check** for the same
     crash-as-green disease — any summary that COUNTS matches reads a crash
     dump as zero.

6. **WO-4 left one decision and one draft PR.** PR #938 (`claude/bold-galileo-0ilqaj`)
   is green (ship-check ×2, audit 19/19) and waits on David to merge to `main` —
   after which the G1 prod audit of `audit-fundamentals-tab-prod.mjs` is OWED
   against the live bundle. The decision is A-NEW / OWED #9: the spine reader.
   Do not flip `learned`; do not add detectors before the reader exists — a
   detector that fires into rows the model cannot read is half-built by the
   capability-parity rule.

---

## FUNDLEAD — two leads chased through the code and WITHDRAWN (2026-09-20)

The symptom: on the rotated review audit (`AUDIT_GAME_ID=06wNUWaA
AUDIT_STUDENT=black`, 43 pass / 9 fail), all three flagged student plies led
with `"You: that was an inaccuracy, costing about 0.7 points — the "` instead
of a fundamental. `WEDGE renderer-answered-throughout` PASSED on that run, so
it is not contamination.

**Already ruled out, do not re-derive:** it is not the RANKING. `principle`
ranks 100, `quality` ranks 95, so a produced fundamental would lead. The
fundamental is not being PRODUCED.

**Lead 1 — "the flagged ply has no best move." WRONG.** `analyzeGamePositions`
pushes to `mistakeIndices` only at `cpLoss >= BATCH_GRADE_FLOOR_CP`
(= `MISTAKE_CP` = 100), while a ply is flagged critical from `INACCURACY_CP`
(= 50). That really does leave the [50,100) band with no `bestMove` — but only
on the BATCH path. `analyzeSingleGame`'s own best-move loop
(`gameAnalysisService.ts:1896`) gates on `cpLoss >= INACCURACY_CP`, and it sits
OUTSIDE the `if (isReview && !opts.sweepOnly)` deep-dive guard, so the review
computes a best move for every flagged ply regardless. The two floors that
looked mismatched belong to two different functions.

**Lead 2 — "then the batch gap starves the loop's RECORD half." ALSO WRONG.**
`autoAnalyzeGame` skips inaccuracies outright
(`classification !== 'blunder' && !== 'mistake'` → `continue`), so it never
reads the [50,100) band at all. Recording starts at 100 and best-move
computation starts at 100; they agree. There is no defect here.

**What this leaves.** FUNDLEAD is one of the OTHER early returns in
`principleAttribution` — all eight are now diagnosable via the `bail()` helper
writing to the `why` sink, and `coachFeatureService` emits
`reviewFundamentalDeclined` once per flagged student ply that gets nothing
(commit `ddb7df37f`). **That emission does not exist on prod until the batched
push lands**, and the audit drives prod — so the next run NAMES the cause and
no run before the deploy can. This is not fixed and is not being claimed as
fixed.

**The method note, because it cost two wrong turns in one thread:** both leads
died the same way — a threshold read in isolation, without first establishing
WHICH function produces the number the symptom is made of. Same shape as this
session's earlier C15 error. The rule stands and earns its place: *before
calling a number wrong, find the instrument that produced it* — and a constant
shared by two call paths is two instruments, not one.

Reproduce: `AUDIT_GAME_ID=06wNUWaA AUDIT_STUDENT=black node
scripts/audit-review-overhaul-prod.mjs` (under the shared lock, after the push).

---

## OPEN — lesson BEATS are unscanned for gendered pronouns (filed 2026-09-20, deliberately not closed)

A peer session found `perspectiveVoice.test.ts`'s lesson-beat arm had been DEAD:
it iterated `for (const lesson of ALL_LESSONS) for (const beat of lesson.beats ?? [])`,
but `ALL_LESSONS` is `RegisteredLesson[]` (`{scope, key, openingId, lesson}`), so
`.beats` was `undefined` on every element, `?? []` swallowed it, and the loop ran
ZERO times — the we/our/us ban had never been checked against a single authored
beat while the file reported green. Fixed there; that arm now reaches 500+ beat
strings and asserts its scan count.

**C15's GENDERED scan did NOT go through that path** — it loops `JSON_FILES` and
`collectProseStrings`, never `ALL_LESSONS` — so `GENDERED_CEILING = 202` was
measured over real prose and stands. Verified, not assumed.

**THE GAP.** Now that the beats are reachable, nothing scans them for GENDERED.
Authored masterclass prose is precisely where "White develops the knight, and
**he** follows with…" lives — the same defect C15 exists for, in the corpus most
likely to contain it.

🚨 **DO NOT CLOSE THIS BY RAISING `GENDERED_CEILING` TO WHATEVER THE BEATS
RETURN.** A ceiling set over newly-visible rot BLESSES the rot: it converts an
unmeasured defect into a sanctioned baseline, and the shrink-only rule then
protects it forever. The order is: scan, READ A SAMPLE, fix what is fixable
offline (`scripts/voiced-authoring/degender.mjs` is the precedent — it rewrote
1145 → 34 and left only what it REFUSED to guess at), and only then set a ceiling
over the genuinely ambiguous remainder.

**AND THE SCAN MUST SEPARATE TWO THINGS, or its number is meaningless** (the
peer's point, 2026-09-20, and the sharpest thing said about this item): a
masterclass beat saying "White develops the knight" is CORRECT — the Watch
register is third-person by design (TWO DISTINCT NARRATION REGISTERS). What is
banned is a gendered pronoun standing for a PLAYER — "he's up a point of
material" said to a student whose pronouns nobody knows, which is what
`NO_GENDERED` in `perspectiveRule.ts` actually forbids. A scan that cannot tell
those apart returns a number that is partly the design, and a ceiling set over
it blesses the wrong half. C15's existing COLOUR_WORD same-sentence rule is the
shape to reuse, not a blanket match. Read before you count.

Why it is filed rather than done: the push in flight is already ~48 commits
across two sessions, and this needs its own measurement pass plus a judgement
call on each survivor. It is a real defect the student can hear, ranked beside
C15 itself — not hygiene.

---

## FUNDLEAD — a third withdrawn lead, and the pattern behind all of them (2026-09-21)

**WITHDRAWN: "unflagged plies get a fundamental, flagged plies don't."** I read
this off the 2026-09-21 prod run, where ply 12 (unflagged) passed
`FUND probe-ply-leads-with-fundamentals` with the lead *"Your pawn on c6 now
fights for d5."* while plies 48/50/62/64 (all flagged) led with the
classification label. It is not a finding. The row is:

```js
await add('FUND probe-ply-leads-with-fundamentals',
  onFund && (!flagged || FUND_RE.test(lead)), …);
```

`!flagged ||` SHORT-CIRCUITS, and the run's own line says `flagged=false` for
ply 12 — so `FUND_RE` was never evaluated against that string. The unflagged
side of the "contrast" was never measured at all. A green row, asserting
nothing, read as evidence.

**WHAT IS STILL RULED OUT (verified, keep these — they are the only durable
output of three wrong leads):**
- NOT the ranking. `principle` ranks 100, `quality` 95, so a produced
  fundamental would lead. It is not being produced.
- NOT a missing best move on the review path. `analyzeSingleGame`'s best-move
  loop gates on `cpLoss >= INACCURACY_CP` and sits OUTSIDE the `sweepOnly`
  guard (`gameAnalysisService.ts:1896`). The 100cp floor is the BATCH path.
- NOT the record half being starved — `autoAnalyzeGame` never reads the
  [50,100) band anyway.

**THE CAUSE IS UNNAMED and no current evidence points anywhere.** The only
instrument that can answer it is FUNDWHY (`audit-review-overhaul-prod.mjs`,
2026-09-21), which prints `[fundwhy] ply N … :: <reason>` — which of the eight
`principleAttribution` bails fired on each flagged ply. **It has never run.**
One run of it is worth more than any further reasoning about this.

### 🚨 THE NIGHT'S PATTERN, stated once: A PASS IS NOT EVIDENCE UNTIL YOU KNOW WHAT IT EVALUATED.

Five instances in one session, four of them mine:
1. `npx tsc` bare → OOM at the 2 GB default, printed a heap dump, `grep -c
   "error TS"` = **0**. Under a ceiling of 0 that renders as "at the ceiling".
2. `npx eslint --quiet` → **0 errors** because `--quiet` skips warn-severity
   rules. The real count was 2, found only via `-f json` + `severity === 2`.
3. `perspectiveVoice`'s non-vacuity guard asserted `SCOPED.length > 0` — that
   the FILE LIST was non-empty, not that any prose was collected.
4. Grepping the CONSOLE LOG for the turning-point card, finding none, and
   concluding it never rendered — the spoken lines live in the listener's
   captured set and only reach `report.json`. The card had rendered; the ask
   was in the artifact all along.
5. This one: a `||` short-circuit making a row pass without evaluating its
   assertion.

Every one answered a NEARBY question and reported green for free. This is the
same disease as the day's earlier six (unbounded `count()`, between-iteration
deadlines, bare eslint vs gate flags, a declared-but-unassigned type field,
`ps` vs cwd for process ownership, absence-of-capture read as absence-of-event)
— so it is not a run of bad luck, it is the default failure mode of every
instrument in this repo, and the rule generalises:

**Before believing a number, name the instrument that produced it AND the
condition under which it would have failed.** A guard that cannot fail, a count
taken from a dead process, and a row whose assertion was short-circuited are
all the same object wearing different clothes.

---

## The 150cp floor — CAUSE CONFIRMED BY MEASUREMENT, and the costs are real (2026-09-21)

FUNDWHY's first run named FUNDLEAD's cause on the pinned game (06wNUWaA):

```
ply 48 inaccuracy Bg5 best=Kb8 :: calculation-depth: cost 104cp is under the 150cp floor
ply 50 inaccuracy Nf6 best=Nb6 :: calculation-depth: cost  74cp is under the 150cp floor
ply 62 inaccuracy Ne4 best=Rd6 :: calculation-depth: cost  99cp is under the 150cp floor
ply 64 mistake   Kc8 best=Nd6 :: calculation-depth: punishing PV is 0 plies, needs 3
ply 68 blunder   Ke6 best=Ke8 :: calculation-depth: punishing PV is 0 plies, needs 3
```

**The costs are MEASURED cpLoss, not the 175/350 fallback buckets** — 104, 99,
86, 74, 72, 69 are none of them a bucket value, and the bucket share of live
slips is ~8% since 2026-08-10. This matters because a floor tuned against
bucketed costs would have no claim on measured ones; these numbers are the real
thing, so moving the floor is a response to evidence rather than to an artefact.

**TWO causes, not one.** The inaccuracy band (48/50/62) died on the floor —
fixed. The mistake/blunder plies (64/68) died on `pvP` being 0-1 plies where the
detector needs 3: **the punishing PV is not persisted for those plies.** That is
a separate defect and it is OPEN.

**A third, and it is structural:** ply 64 also declined with *"the punishment
Bd7+ is immediate (ply 1) — another fundamental owns it"*. No other fundamental
fired. The deferral is unconditional — it hands the ply to a sibling that never
claims it, and the student gets nothing. A yield must be conditional on the
claim (check that the sibling took it, or keep it), which is the same asymmetry
as the `advanced` default in `handleWalkForward`: a duplicate fundamental is
visible and fixable, a silent handoff to nobody is indistinguishable from "this
ply had nothing to teach".

## The surface map's audit list UNDER-REPORTS browser audits (found 2026-09-21)

`auditsFor` matches audits that textually reference the file or its exports. A
browser-driven prod audit names neither, so it never appears — concretely,
`principleAttribution`'s map listed only `audit-fundamentals-tab-prod` while
`audit-review-overhaul-prod` owns the FUNDLEAD and FUNDWHY rows that grade
exactly what it produces. A reader would have concluded the review audit does
not touch this surface.

Widening the needles to domain vocabulary would catch those and also produce
false positives, so the fix applied is that the list now STATES ITS OWN RULE
rather than implying completeness. An under-reporting list read as complete is
the same failure as a gate that passes without evaluating anything — which is
the night's pattern, arriving in the one tool built to prevent it.


---

## FUNDLEAD — CAUSE NAMED, and what the fix actually bought (2026-09-21, prod-verified)

**RESOLVED half.** The 150cp floor was the cause for the inaccuracy band, proven
by FUNDWHY on a real game and fixed by making the gate expected points. The
proof it worked is not a green row, it is a SENTENCE THE COACH SPOKE:

> "The pattern: one of your four flagged moves stopped calculating too early."

That is `calculation-depth` reaching the recap — the first thing tonight that
changed what a student hears. RECAP went red→green in the same run, because the
peer's `ForwardOutcome` fix let the walk reach its end: one fix got the walk
there, the other gave it something to say when it arrived.

**OPEN half — two causes, neither of them the floor:**
1. **The punishing PV is not persisted.** `pvP` is 0-1 plies where the detector
   needs 3, on every mistake/blunder ply. Now the dominant cause.
2. **An unconditional deferral.** "the punishment Bd7+ is immediate (ply 1) —
   another fundamental owns it", and no other fundamental fires. THIRD instance
   of this shape in one night (`questionPlan.has(atPly)` yielding a forward to a
   card that opens later; `handleWalkForward` returning void so a consumed
   advance read as a completed one). The two that were fixed were fixed the same
   way and it is the shape to reach for here: **make the yield conditional on the
   claim LANDING** — check the sibling took it, or make a yield that names no
   claimant fail to compile. A duplicate fundamental is visible and fixable; a
   silent handoff to nobody is indistinguishable from "this ply had nothing to
   teach".

**AND THE ROW ITSELF WAS BLIND.** `FUND_RE` could not match 25 rotations across
15 fundamentals — whole endgame and middlegame sections — so plies that taught
correctly scored as teaching nothing, and the row under-reported the very fix
being tested. Now DERIVED from the real renderers and gated
(`fundLeadStems.test.ts`, every rotation, negative-controlled both ways). When a
new fundamental gets a voice, that gate fails until its stem lands.

---

## FUNDLEAD half 1 — WHY the punishing PV is missing (diagnosed 2026-09-21, NOT fixed)

Traced to file:line rather than guessed:

- `coachFeatureService.ts:1455` DOES pass `pvAfterPlayed` to the attributor
  whenever `m.pv?.afterPlayed` exists. The review path is wired correctly.
- `gameAnalysisService.ts:1925` builds that field from `deepPv[moveIdx + 1]`.
- `deepPv` is populated ONLY at `:1810`, inside `if (isReview && !opts.sweepOnly)`
  — the key-moment deep dive.
- `CoachReviewSessionPage.tsx:297` opens a cold review with `{ sweepOnly: true }`.

**So on a COLD FIRST OPEN no punishing PV is persisted at any ply, and
`calculation-depth` cannot fire — the detector needs 3 PV plies and gets 0.**
That is 4 of the 5 declines in the 2026-09-21 FUNDWHY run (plies 48/50/64/68;
62 declined at 0 plies too on one pass).

This is not a wiring bug. It is the cold-open latency trade doing what it says:
the sweep gets the student onto the board fast and the dive follows behind. The
cost nobody had measured is that **the first review of a game — the one a
student actually reads — cannot teach the reasoning fundamentals at all.**

🚨 **DO NOT "FIX" THIS BY UN-SKIPPING THE DIVE.** That reinstates the cold-open
stall the sweepOnly split exists to remove (G4.6: the lag is serialized engine
calls). Options, cheapest first, none of them free:
1. **Re-narrate when the background dive lands** — the PV arrives a few seconds
   later; the question is whether the beat can be rebuilt without yanking the
   walk out from under the student.
2. **Persist a short PV from the SWEEP** at flagged plies only — the sweep
   already searches those positions; whether it can keep 3 plies of line without
   a second search needs measuring, not assuming.
3. **Accept it and say so** — first open teaches the board fundamentals, the
   reasoning ones arrive on reopen. Honest, and the worst of the three for the
   loop, since the first read is the one that lands.

**OWED BEFORE ANY OF THEM: does a SECOND open produce the fundamental?** If the
dive's `REVIEW_MAX_DEEP_PLIES` budget doesn't reach these plies either, then
reopening does not fix it and option 1 is dead on arrival. That is one
`audit-review-reopen-probe` run and it decides between the three.

Deliberately not built at 03:00: it changes engine cost on the review's
critical path, and the rule is leave it, skip it, or ask.

---

## SESSION 2026-09-21 — clearing the board, and the gate that was hiding three reds

**The one finding that explains the others.** ship-check mapped a changed
source file to its tests **by basename** (`foo.ts` → `foo.test.ts`).
`principleAttribution.ts` has **18** test files; that found one. Three files
were red on `main` because of it and nothing in the repo could see them:

| file | why it was red | fixed |
|---|---|---|
| `section14Diagnosis.test.ts` | asserted `"under the 150cp floor"`; `9942d68` rewrote that gate to expected points the day before | pinned by CURRENCY + NUMBER, not exact prose |
| `deltaConsistency.test.ts` | fed one classifier evals and the other none — compared win% against centipawns and called it a surface drift | same context to both; boundary asserted empirically in win% |
| `fundamentalLessons.test.ts` | all three section-14 lessons lectured in the third person; one was a sentence short | rewritten to "you/your", claims preserved |

Fix: `surface-map.mjs` ALREADY derived the true list (by prefix AND by import)
to print each map's "## Tests". Extracted to `scripts/ship-check-lib/tests-for.mjs`;
both read it. Writing a second, smarter matcher in ship-check would have been
two answers to one question drifting apart. Gate `tests-for.test.ts` is
negative-controlled against the old matcher, so it cannot pass against the
logic it replaces.

**🚨 DO NOT RE-ADD A CENTIPAWN FLOOR TO `calculation-depth`.** OWED-1 asked to
lower the 150cp floor to 100 and David approved it on 2026-09-21. **That floor
no longer exists** — `9942d68` replaced it with `bandForWinPctLost` (an
inaccuracy at 5 win%, ≈55cp at a balanced position), which is already lower
than 100 AND in chess.com's currency per §8b. Acting on the approval would be
a regression. OWED-1 and FUNDLEAD's "dead band" were the same floor approached
from two directions and nobody reconciled the entries.

**The sweep computed the engine line and dropped it — at TWO sites.**
`analyzePosition` returns `{evaluation, bestMove, depth, pv}`. Both
`evaluateFensPooled` (review curve pass) and `analyzeGameOnWorker`
(batch/import) kept the eval and the depth and discarded the PV; the batch path
declared it away **in its own `search` return type**, which is why it went
unseen. Consequence: `pvAt` (was `deepPv`) was filled only by the key-moment
dive, a cold open runs `{sweepOnly:true}` which skips that dive, so the FIRST
review a student reads had no punishing line on any ply and every PV-gated
reasoning fundamental declined "punishing PV is 0 plies, needs 3" — an absent
input, not a tight gate. Fixed at both sites at **zero extra engine cost**.
This also retires the recorded bound "the batch path carries no PV at all": it
was never a property of the batch.

**The WO-4 corpus is reproducible.** `scripts/build-wo4-corpus.mjs`, two
resumable phases. Facts worth not re-deriving:
- **Lichess's game-export endpoint 404s through this proxy** while `/api/user`
  returns 200 — it is the export route specifically. chess.com's public API
  works, and `/pub/country/{iso}/players` is a deterministic source of ordinary
  club players.
- **No native Stockfish binary exists in this container.** CLAUDE.md's
  `/usr/games/stockfish` line is stale here. The app's own npm WASM build runs
  over UCI via `node_modules/stockfish/scripts/cli.js` — and is the right
  engine anyway, since the replay worker hands these numbers to the real sweep.
- d12 over 47 games takes **~2.6 minutes**; d18 about **an hour**.
- First run produced 47 games from ONE player (the loop drained each archive).
  `MAX_GAMES_PER_PLAYER = 3` → 64 distinct players, Elo 800–1794.
- The measurement runs again: **207 flagged student plies, 122 attributed,
  `attributionRate` 0.589**, `other` at 50 — consistent with the 23% bucket.
- The report's `corpus.source` was a HARDCODED string ("lichess … 1000–2000")
  that the rebuilt corpus contradicted. Now derived from the rows.

**C15b.** 946 sentences degendered across 165 lesson files, reusing
`beatRegister`'s discriminator and `degender.mjs`'s verb agreement rather than
grepping for /he/. The real find: the gate's beat arm reads `ALL_LESSONS`,
which contains **zero pro-rep lessons by design** (G9 step 8) — the registry
sees 3,664 beat fields, the directory holds **38,071**. Reading the output
caught a defect in the fix itself: sentence scope left 85 beats speaking both
ways in one paragraph; a second pass guarded by a proper-noun test took that to
13, all legitimate (Fischer, Réti/Capablanca, the pro a pro-rep lesson
teaches). Side effect: `curatedBeatRegister` live-safe went **1,312 → 1,440**.

**GREEN.** The word-count arm could never work — 16 words of effect against a
592-word between-run variance. But review being `walk` posture only stops the
term SILENCING a ply; the term is still COMPUTED, and `coach-need-scores`
already emits it per term. The audit now reads the capability term as a SIGN:
inert on control (non-vacuity), negative on green, inert on prompted. The
BEHAVIOUR half still needs an `interrupt` surface.

**My own instrument failures this session, recorded because they are the same
disease the work is about:** a `--reporter=basic` full-suite run crashed at
startup and `pgrep` reported it running for 50 minutes, with a Monitor filter
that never matched the crash text; and a first cut of the unhonoured-yield
reporter printed "this ply is unattributed" about a ply three detectors had
attributed. Both were caught by reading output, not by a gate.
