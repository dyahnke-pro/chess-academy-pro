# Bad course lines — the five tab dips and the seven losing lessons/plans (WO-COURSE-01)

Goal: no course line teaches the student a losing position. Source: PLAN.md
WO-COURSE-01, "Upstream dips (writing phase)" — five tab lines that pass through
≈ −1.2 before their replies branch, and the seven tab lessons / middlegame plans
that end below −1.5 at depth 20 (grounding baselines).

Method, every line: Stockfish 16 (native, one thread) at **depth 20**, evals from
the **student's seat**. Each student move's loss = engine best − the move (both
at depth 20). Moves come only from data: the masters DB, the master tree (TWIC
2200+), the strong-online tree, and the pro's own game tree; past the data,
THE ONE walker (`scripts/course-replies/line-walk.mjs`, unchanged), driven
through `repair-course-lines.mjs` for the masterclass tab and with the same
parameters for the pro tabs and plans. Replies of a rebuilt tab: orphans pruned
(`prune-orphan-sublines.mjs`), their narrations retired
(`retire-subline-narration.mjs`), new replies built by `build-course-sublines.mjs`
`MERGE_TABS` (+ `MERGE_FROM_PLY`, so they come from the rebuilt part of the line).
Grounding rebuilt, near-bar boards re-read at depth 20 (`deepen-grounding.cjs`).

## Group (a) — the five tab lines

| # | Line (id) | Before (d20, student) | Decision | After (d20 unless noted) | What changed |
|---|---|---|---|---|---|
| 1 | Czech Benoni — `benoni-defence` var 5 | 3…e5 itself gives the ground: −0.67 → **−1.21** after 4.Nc3; line stays −0.94…−1.25 through move 10 (end −0.73); replies 6.Bd3 −1.31, 6.Nf3 −1.26, 6.f3 −1.14, 6.h3 −1.10 | **Removed** (no sound Czech line: the dip is the move that defines it) | — | Lesson removed from `benoniDefenceVariations.ts` (so it is no longer auto-appended as a tab); its 10 replies and 5 narrations removed; variation data kept so no index/progress moves (Philidor Counter-Gambit precedent). `variationTabs.ts` comment says why. |
| 2 | Dragon "Dragadorf Hybrid" — `sicilian-dragon` var 6 | 8…O-O loses 71 → **−1.28** after 9.O-O-O; 18-ply lesson beat **−1.80**; replies g4@16 −1.07, g4@18 −1.38 | **Rebuilt** at ply 15 | Tab end **−0.88** (−0.76 in the depth-20 cache); every student move ≤ 13cp off best | 8…b5 (masters 49 games, engine −0.79) then the walker: a4 bxa4 Nxa4 O-O Be2 Bd7. Masters' 8…Nbd7 (332 g) walks to −1.30, 8…h5 (171 g) to −1.01/−1.11 — both drift below −1.0, so the sound data move was taken. Lesson: 3 beats → 4, rewritten (why not castle: O-O-O and g4 reach your king first; …b5 threatens …b4; …bxa4 opens the b-file; …Bd7 hits the a4-knight). Explanation rewritten. 4 orphaned replies pruned (2 narrations retired); new replies O-O-O@16 −0.54, g4@16 −0.57, Bh6@16 −0.63 (d14/20). No plan on this tab. |
| 3 | Samay vs Rossolimo — `pro-samayraina-sicilian-black` var 2 | 5…e5 loses 61–67 → **−1.12** (White's best 6.d3; PV d3 a6 Ba4 b5 Bb3 Nf6 f4 → −1.44); reply d3@10 **−1.21** | **Rebuilt** at ply 9 | Tab end **−0.47** (d20 walk); replies −0.59 / −0.36 / −0.28 (d14) | 5…a6: engine best (−0.37), Samay's own second choice (26 games, 58%, vs …e5 28 games, 27%), master tree 47 games vs …e5 1. Then his tree Ba4 b5 Bb3 e6 and the walker d3 Bb7. Lesson beats 2–3 rewritten (teaches why not …e5); explanation rewritten ("played about as often in these games"). 10 orphaned replies (no narrations) replaced by Bc4@10, Be2@10, Bd3@10 (master tree). No plan on this tab. |
| 4 | Naroditsky Dragodorf "English Attack (Be3)" — `pro-naroditsky-dragodorf` var 0 | Same 8…O-O dip, **−1.28**; replies g4@18 **−1.46**, Kb1@18 **−2.32** (old explanation claimed "engine near-level") | **Rebuilt** at ply 15 | Tab end **−0.88** (same line as #2); plan end **−0.85** (−0.75 cache) | 8…b5 — Naroditsky's own teaching (voice note dt-1u2: "b5 over immediate kingside castling") — same walk as #2. Four beats (castle / O-O-O / Nc6 / bxc6) replaced by three; two other beats lose unproven claims ("head start", "about to live"); header comment and explanation rewritten. Replies g4@18, Kb1@18 pruned; O-O-O@16, g4@16, Bh6@16 added with evals. Plan `mp-pronardragodorf-english-queenside` re-anchored at the new end, line walked: O-O Qc7 b4 d5 e5 Qxe5 Nb6 Ra7 (the …d5 strike, the b6 fork, …Ra7), retitled. |
| 5 | Hikaru vs Austrian — `pro-hikaru-pirc-modern` var 3 | No single bad move (largest 33cp, 4…c6); the …c6/…d5 line drifts to **−1.03** at the end; replies Bd3@12 −1.04, Bd3@16 −1.08 | **Rebuilt** at ply 7 | Tab end **−0.41** (one walker move, …Ngf6, 48cp off best); replies −0.04 … −0.77 | 4…b5: engine best, the masters' first choice (155 vs …c6 4), Hikaru's second (30 games, 88%). His tree Nf3 Bb7 Bd3 d6, then the walker: Qe2 Nd7 Be3 b4 Na4 Ngf6 Bd2 c5 e5 Nd5. Beats 2–3 rewritten; explanation rewritten (…c6 named, with its pawn's edge). 8 orphaned replies (no narrations) replaced by 7 from the master tree. Plan `mp-pro-hikaru-pircmodern-austrian` re-anchored at the new end: f5 gxf5 Ng5 e6 Qh5 Qe7 Nxe6 Qxe6 → **−0.03**, retitled "Meet the f5 Break". |

## Group (b) — the seven lessons / plans below −1.5

| # | Item | Before (d20) | Decision | After (d20) | What changed |
|---|---|---|---|---|---|
| 6 | `caro-kann :: caroKannTrapLessons.ts :: 11-ply` | mate (−∞) | **Kept** — a warning lesson | — | "Watch out: the Qe2 smothered mate": the 11-ply beat shows …Ngf6?? Nd6#, the next beat rewinds to the fix …Ndf6, and the Learn/Practice line is the fix (`getCaroTrapPlayableLine` takes the last beat). The mate is the lesson. It stays the one entry in the lessons baseline: the gate judges every `moves:` literal as a taught line and cannot tell a warning's punishment beat (see "Open" below). |
| 7 | `pro-caruana-taimanov :: …Variations.ts :: 8-ply` | 4…Qc7 **−1.61** (5.Nb5 hits the queen) | **Rebuilt** (move order) | 8-ply beat **−0.50**; tab −0.33 (d14) | Caruana's games never play 4…Qc7 (84 games: 4…a6 48, 4…Nc6 35; the deep file for this tab had 0 games). The tab now plays his 4…a6 5.Nc3 Qc7 (5 games) — the same board from ply 10 on, so the 10 replies and 5 narrations stand (move orders updated). Beat 1 teaches why the pawn goes first; beats 2–4 reworded to you/they. Explanation rewritten. |
| 8 | `sicilian-dragon :: sicilianDragonVariations.ts :: 18-ply` | **−1.80** | Fixed by #2 | beats −0.60 / −0.47 / −0.90 (d20/d20/d14) | See #2. |
| 9 | Plan `mp-semislav-main` "Semi-Slav Botvinnik: Extra Pawns…" | **−1.83** (…Qf6 loses 58; anchor sat beside the main line with a wrong castling field) | **Rebuilt + re-anchored** at the main line's end (Gate C) | **0.00** | Walker from the main line's last board: Bxc4 Qc7 Ne2 g4 b4 O-O b5 axb5 (all student moves 0cp). Retitled "Castle, Then Collect the b-Pawn"; overview, breaks, maneuvers, themes, annotations, cues, arrows, highlights rewritten. |
| 10 | Plan `mp-progothamchess-pirc-150-b5` "Pirc vs 150 Attack: …b4…" | **−1.59** (…Nfd7 loses 74; anchored off every tab line) | **Rebuilt + re-anchored** at the 150 tab's end | **−0.63** (…c5 38cp off best) | h4 h6 Nge2 Qc7 Ng3 Nb6 b3 a6 Qd2 c5. Retitled "…Nb6, …a6 and the …c5 Break"; all text rewritten. |
| 11 | Plan `mp-proericlondon-h4-storm` "Opposite-castle h4-h5 storm" | **−1.68** (h5 loses 70, hxg6 loses 148) | **Rebuilt** (same anchor, the tab's end) | **+0.99** | b5 f3 Qa5 Bh6 b4 Nb1 (student moves 0–2cp). Retitled "Opposite castling: trade the g7-bishop, sidestep …b4"; text rewritten. |
| 12 | Plan `mp-proamanfrench-classical` "the a4 Break and the Long Diagonal" | **−1.80** (a4 loses 106, Nd1 82) | **Rebuilt** (same anchor, the tab's end) | **+0.08** | c5 Rfd1 b4 dxc5 — dxc5 opens the d-file so Rd1 hits the queen and …bxc3 loses it to Rxd8 (checked with chess.js). Retitled "Rd1 and dxc5 Against …c5"; text rewritten. |

Also: `pirc-defence :: Austrian Attack` sat in the lines baseline but reads −0.88
at depth 20 now (the earlier deepen pass) — a stale entry, removed.

## Baselines (shrink only)

- `groundingLessons` 3 → 1 (Caruana 8-ply, Dragon 18-ply gone; the Caro warning stays)
- `groundingPlans` 4 → 0
- `groundingLines` 1 → 0
- `groundingSublines` 27 → 16 (Czech ×4, Dragadorf ×2, Naroditsky ×2, Samay ×1, Hikaru ×2)
- `sublineBoardClaims` 780 → 779 (the retired Czech narration's claim)

## Tooling changed

`scripts/build-course-sublines.mjs`: forks from offline data (masters DB → master
tree → online tree → the pro's own tree → club explorer only with a token) — it
used to call the live app proxy, which the WO's own rule forbids; `MERGE_TABS`
builds only the named tabs, accepts pro openings, and `MERGE_FROM_PLY` refills a
rebuilt tab from its rebuilt part. The walker itself is unchanged.

## Checks run

- The project's soundness tools at depth 16: `line-soundness.mjs` on the five
  rebuilt/reordered tab lines and `subline-soundness.mjs` on the 16 new replies —
  no flags (no student move ≥ 100cp off best, no missed punishment, no line
  ending on the opponent's move).
- Gates (all green): grounding lessons / plans / lines / sublines / traps /
  mistakes / gems / continuation, courseSublinesOnTab, sublineLeadMove,
  sublineBoardClaims, sublineNarration, lessonTabIntegrity, lessonIntegrity,
  narrationAccuracy, lessonDepth, wlppNarration, proRepNarrationAccuracy,
  proRepNarrationVoice, proRepLessonArrows, proRepLessonAccuracy,
  proRepPlanAccuracy, proRepTabPlanCoverage, proRepLessonCoverage,
  perspectiveVoice, middlegamePlanThemes, middlegamePlanContinuity,
  middlegamePlanner, variationMiddlegameDepth, openingManifests, openingCourse,
  recordRevs (fingerprints regenerated with the bumped revisions),
  narrationFactCheck (it caught two plan sentences — a fork claimed for the
  knight on g5 that only forks from e6, and a discovered attack worded as the
  pawn hitting the queen — both reworded).
- `vitest related` over the changed TS files (lessons, narration files,
  variationTabs, dataLoader): all green except `readsAsQuestion` "costs the
  opening gate nothing on the real set", which exceeds its own 120 s budget on
  this machine at load 21 (133 s alone); its assertions pass (dropped 0, wrong
  lesson 1 of the allowed 2).
- App typecheck green in each commit hook; the test typecheck
  (`tsc -p tsconfig.tests.json`) passed on the final tree (it was OOM-killed
  inside the hook twice on the shared machine, so those commits used
  `--no-verify` after the rest of the hook was green).

## Narration standard applied

Student = you/your, opponent = they/White; no move-number prefixes; every
`sayShort` ≤ 8 words; claims checked on the board with chess.js (pieces named
on their squares exist; arrows from non-pawn pieces with clear lines; highlights
name only squares the text names); engine claims backed by the depth-20 reads
above ("more than a pawn", "small edge", "about level").

## Open / not done

- The lessons grounding gate cannot tell a warning lesson's punishment beat
  from a taught line, so the Caro Qe2-mate warning stays in its baseline by
  design; a fix would make enumLessons read the lesson's warning kind.
- Other tabs' subline narrations that are still bound were not re-read here.
- Deeper than the masters DB, the walker plays the engine (depth 12); the master
  tree knows more there (e.g. Hikaru 7.O-O 110 games where the walker played
  Qe2). Feeding the master tree to the walker would change every future build,
  so it was left for a decision.
- `refresh-pro-evals.mjs` recomputes every dubious pro line's `engineBestLine`
  and the engine's choices drift run to run (e.g. Hikaru Bd3@6 d5 → d6), so only
  the 13 new lines took its values; the 7 existing dubious lines were left as
  they were.
- `course-sublines.json`, `grounding-items.json` and `grounding-evals.json` are
  regenerated single files; a parallel build touching replies (another session
  was working on club replies) will conflict there and must be rebuilt, not
  hand-merged.
