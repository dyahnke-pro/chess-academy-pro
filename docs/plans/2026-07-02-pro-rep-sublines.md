# PLAN — Sublines for the ELITE PRO REPERTOIRE (2026-07-02)

**Owner:** David. **Branch:** `claude/elite-pro-sublines-ih3sai`.
**One-liner:** Give the pro-rep openings the same Level-3 SUBLINE layer the
masterclass openings have — but derived from **the pro's own game tree**, not
theory, and teaching BOTH the pro's practical line AND the sound line.

## The ask (David, 2026-07-02)
> "Add sublines to the elite pro repertoire… follow the standard used for main
> openings. Remember the lines NEED to be what the pros actually played against
> different opponent moves. Pro database."

And on how to teach a dubious practical line:
> "Show what the elite player played and explain that in the narration (NO
> NAMES), then say it's losing then show the best move/continuation. Ideally
> find a winning game of theirs in that position. Walk through the lines fully —
> the position might [be] losing according to stockfish but humans aren't
> computers. Teach both."

## How main openings do sublines (the standard we mirror)
- **DATA:** `scripts/build-course-sublines.mjs` walks each variation spine by FEN
  against the **masters DB**, branches at opponent-to-move nodes, ranks by
  frequency, trims to the middlegame terminus (`reachesMiddlegame`). Emits
  `src/data/course-sublines.json` keyed `openingId → varIndex → CourseSubline[]`.
- **NARRATION:** hand-authored `SublineNarration` in
  `src/data/lessons/sublineNarration*.ts`, keyed
  `${openingId}::${varIndex}::${triggerMove}@${atPly}`. Absent → honest baseline.
- **RUNTIME (already generic):** `buildCourse` (`openingCourse.ts:161`) reads
  `SUBLINES[opening.id]`; `SublinePanel` lists them (Watch/Play) and self-hides
  when empty; `sublineLesson.ts` converts to a playable/custom line.
- **GATES:** `soundness-sweep-sublines.mjs`, `audit-subline-soundness.mjs`,
  `sublineNarration.test.ts`.

**Why pro-reps have zero sublines today:** `build-course-sublines.mjs` never
includes them in `targets` (only masterclass + anti + gambits). Everything
downstream already works for `pro-*` ids generically — pro variations carry into
`OpeningRecord` via `reconcileProRepertoires`. The gap is DATA only.

## The ONE architectural difference — spine/subline SOURCE (G9)
Pro-rep sublines come from the player's own corpus, NOT theory:
`data/sources/<player>-trees/<slug>.json` — a move trie where every node carries
`{games, wins, draws, losses, children}` (children keyed by SAN). At each
opponent-to-move node along a variation spine, the node's `children` ARE the
moves that pro actually faced, with their real record. Branch on each; follow
the pro's actual most-played reply to the middlegame terminus.

Player → tree-dir prefix: naroditsky→danielnaroditsky, aman→chessbrah,
caruana→fabianocaruana, carlsen→magnuscarlsen, ericrosen→imrosen,
gothamchess→gothamchess, hikaru→hikaru, samayraina→samayraina.
Opening slug = `pro-<player>-<slug>` → `<slug>`.

## Decisions (David, 2026-07-02)
1. **Teach BOTH.** The subline follows the pro's actual practical line
   (grounded in their tree, no names in narration). Engine-eval the terminus
   (student POV). When it's dubious/losing per Stockfish, SAY SO honestly and
   ALSO surface the engine's best continuation — pair the practical line with
   the fix. Soundness gate LABELS, does not reject (inverts the main-opening
   rule). Anchor to a real winning game of the pro's from that position where
   findable (authored ceiling; floor uses W/D/L + eval).
2. **Threshold = 1 game.** Even a single game the pro played in a variation is
   enough to build a subline from — follow that one game.
3. **Stockfish installed** (`/usr/games/stockfish`).

## Build steps
- [x] STEP 0 — examine main-opening subline pipeline + confirm pro gap + trees on disk.
- [ ] STEP 1 — `scripts/pro-repertoire/build-pro-sublines.mjs`: read trees,
      branch on opponent-faced moves (≥1), follow pro's most-played reply to
      terminus, engine-eval (student POV), record W/D/L + eval + engine-best
      when dubious. Emit → merge `pro-*` keys into `course-sublines.json`.
- [ ] STEP 2 — extend `CourseSubline` (openingCourse.ts) with optional pro fields
      (`record`, `evalCp`, `dubious`, `engineBest`, `engineBestLine`). Existing
      main-opening consumers ignore them.
- [ ] STEP 3 — `sublineLesson.ts` "teach both" baseline: walk the pro line; when
      `dubious`, intro/beat names the engine's best line honestly.
- [ ] STEP 4 — pilot Naroditsky end-to-end; verify shape + render + soundness.
- [ ] STEP 5 — hand-authored `SublineNarration` for flagship sublines (no names).
- [ ] STEP 6 — gates (pro soundness = label not reject) + audit script.
- [ ] STEP 7 — scale to all 8 players; ship to main; 3-instrument audit.

## Pilot: Naroditsky (danielnaroditsky-trees present; 10 openings).
```

## Next-session pickup
Start at STEP 1 — the generator. Pilot `pro-naroditsky-caro-kann` (color black,
10 variations, tree at `data/sources/danielnaroditsky-trees/caro-kann.json`).
