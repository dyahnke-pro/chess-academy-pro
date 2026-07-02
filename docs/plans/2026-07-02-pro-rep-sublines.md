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

## 🔒 THE STYLE STANDARD — whole pro rep, "played out + explained every step" (David 2026-07-02)
After watching a Naroditsky Dragodorf video (`IHjt6amFgyE`), David locked the bar
for the ENTIRE pro rep:
> "He played both lines out on the board so you could see it and explained it
> every step of the way. I want the entire pro rep done in this style."

Concretely, every opening / variation / subline is a Watch lesson that:
- **plays the line out on the board move-by-move** (LessonScript beats via the
  LessonPlayer — the existing WLPP Watch);
- **explains EVERY step** — the *idea behind each move*, not just the move
  (the "why": fight for the weak square, trade its defender, plant the outpost,
  the concrete tactic), in his teaching register;
- **shows BOTH lines** — his practical choice AND the sound alternative
  (the teach-both decision below);
- **names no player** (depersonalized) and speaks in two registers.

### 🔒 TRANSCRIPT GROUNDING — the enabler, and the PLAGIARISM GUARDRAIL
- yt-dlp WORKS from this env (the old "YouTube sandbox-blocked" note is STALE) —
  `yt-dlp --write-auto-sub --skip-download --sub-langs en <url>` pulled a full
  auto-caption VTT. So every opening can be grounded in his ACTUAL video teaching.
- **🚨 REFERENCE ONLY — NEVER QUOTE (David 2026-07-02: "Do not quote him exactly,
  I do not want to be hit with plagiarism").** The transcript tells us WHICH
  established ideas he teaches at each move; the narration is ORIGINAL prose
  teaching those (public-domain) ideas, grounded in the concept corpus + DB +
  engine. ZERO verbatim lifting — "translation, not invention" (the masterclass
  doctrine). Raw transcripts live in gitignored `data/sources/*-voice/transcripts/`
  as research notes — never committed, never shipped as narration.

### The per-opening recipe (the "this style" production line)
1. Find his speedrun/theory video for the opening → pull transcript (yt-dlp).
2. Move-skeleton FIRST (Gate D): main + variations + sublines to the middlegame,
   from his tree (or the DB where his tree is thin), every move chess.js-legal.
3. Engine-verify every tactic/eval; teach-both on dubious lines.
4. Author Watch beats EVERY STEP in his voice — ORIGINAL prose from the ideas,
   arrows/highlights on every named square, two registers, no name.
5. Self-verify (legality / narrationAccuracy / soundness) → next opening.

### HONEST FINDING — his blitz tree ≠ every video line
His chess.com corpus is overwhelmingly the STANDARD Najdorf `...e5` (6.Be3 e5 =
224g); the **Dragodorf `...g6` is thin (~27g scattered)** — it's a *teaching*
line he showcased, not his blitz weapon. So the Dragodorf's moves ground on the
video + theory DB + engine (all G3-legal), NOT primarily his own games. Flag any
opening where the tree is thin so depth is never faked from games that aren't there.

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

## 🔒 SPEEDRUN-DRIVEN REPERTOIRE EXPANSION (David 2026-07-02: "look up all his speedrun videos and use them to expand his repertoire")
Enumerated his channel via `yt-dlp --flat-playlist` (607 videos, **427 speedrun
episodes**). Each title lists the openings it covers → parsed into an
opening→video-IDs catalog at `data/sources/danielnaroditsky-voice/speedrun-catalog.json`
(gitignored research map). His TEACHING repertoire spans ~33 families; the app
has 10. Build order = his teaching frequency (video count), NEW first:

**NEW openings to add (ranked by how much he teaches them):**
Sicilian complex (Open/Sozin/Classical/Scheveningen 42, Taimanov/Kan 23, Dragon
3, Grand Prix 5, Moscow/Canal 1) · French 11 · Philidor 10 · Scandinavian 9 ·
Smith-Morra 9 · Nimzo 9 · Scotch 8 · London 4 · Vienna 4 · English 3 · Elephant 2
· Pirc 2 · Latvian 2 · Trompowsky/Catalan/Bird/Benoni 1 each.
**HAVE (10):** Caro-Kann, Alapin, Najdorf, KID, Alekhine, Glek/KIA, Rossolimo,
Jobava London, Ruy Lopez, Fantasy-Caro (+ the Dragodorf pilot in flight).

Per opening: look up its speedrun ID(s) in the catalog → pull transcript
(yt-dlp) → move-skeleton (tree where rich, DB/explorer where his tree is thin —
flag it) → engine-verify → author Watch beats every-step in the Naroditsky house
voice (ORIGINAL prose, no quoting) → self-verify → next. ONE AT A TIME.

## Pilot: Naroditsky (danielnaroditsky-trees present; 10 openings).
```

## PROGRESS LOG (autonomous grind, 2026-07-02 night)
**Shipped to `main` + gate-verified (narrationAccuracy / proRepNarrationAccuracy /
lessonIntegrity / proRepNarrationVoice / typecheck all green each batch):**
- ✅ **P0 FIX** — openings tab was stuck on "Loading…" from a pre-existing boolean
  IndexedDB-key crash (`getRepertoireOpenings`/`getFavoriteOpenings` used
  `.where('isRepertoire'/'isFavorite').equals(true)`; IndexedDB has no boolean
  keys → DataError). Fixed to JS `.filter()`. NOT caused by this build (present
  on the prior deploy). Live.
- ✅ **Dragodorf** — full course: main (every-step, with when-to-play scope) +
  3 variation tabs (English Attack / Classical / h3 Adams, every-step,
  engine-sound) + **22 sublines** (explorer+Stockfish, teach-both floor).
- ✅ **Naroditsky mains deepened to every-step** (were 4-6 beats): Najdorf 5→12,
  Ruy 5→12, KIA 4→8, Alekhine 4→8, Rossolimo 4→8, KID 5→10, Jobava 6→9.
  (Caro-Kann 18 + Alapin 12 were already deep.)

**UPDATE (later same night):** ✅ ALL 11 Naroditsky MAINS every-step (Najdorf,
Ruy, KIA, Alekhine, Rossolimo, KID, Jobava, Fantasy deepened; Caro/Alapin/
Dragodorf already deep). ✅ **Najdorf variations** (Be3/Be2/h3/Bc4) all every-step
→ Najdorf is a fully every-step opening (main + 4 variations + trap lessons).
⚠️ FLAG for the variation grind: some variation `pgn`s in pro-repertoires.json
are SHORT / don't reach a middlegame (e.g. `pro-naroditsky-alekhine` "c4 Modern
Main" mg=FALSE at 11 plies; "Nc3 Two Knights" only 8 plies). Those must be
EXTENDED (explorer most-played + Stockfish, engine-sound) BEFORE authoring the
every-step lesson — same Gate B rule as the Fantasy main fix.

**UPDATE 2 (deep in the night):** Fully every-step openings now (main + all
variations): **Dragodorf** (+22 sublines), **Najdorf** (+4 var), **Alekhine**
(+3 var, spines extended + baseline shrunk), **Ruy** (+3 var). All 11 mains done.
⚠️ Process note: run the gate as a SEPARATE verified step before commit+push —
one narration-nit red (future-tense "d4-pawn"/"g7-bishop" claims) briefly shipped
in d00a070, fixed in c520733. Not a runtime break, but don't chain commit after
gate without checking the exit.
⚠️ Short variation spines still to EXTEND before authoring (Gate B): KIA
`vs ...e5 (Reti gambit)` (7 plies, mg=FALSE) — walk it to a middlegame
(explorer+Stockfish, White is +1.2 so sound) like the Alekhine c4 / Fantasy fixes.

**REMAINING variation sets to deepen (each: brief→eval→author→gate→ship):**
KIA (7 var, extend Reti), Rossolimo (5), Alapin (2 thin), Caro-Kann (2 thin:
Advance Bf5 + d3), Jobava (3), Fantasy (3), KID (already ~8-beat, light touch).

**THEN:**
1. Fantasy-Caro main (6 beats, `proNaroditskyFantasyCaro.ts`) → every-step.
2. ALL Naroditsky VARIATION lessons (many 5-8 beats) → every-step, per file
   `proNaroditsky*Variations.ts`. Use the brief→author→gate loop.
3. Sublines for every Naroditsky opening (most have none) → `build-pro-sublines.mjs`
   (tree) where his games are rich, `build-dragodorf-sublines.mjs` pattern
   (explorer+Stockfish) where thin — none left out — then author every-step.
4. Then **Levy / GothamChess**: pull his YouTube speedrun/theory videos (yt-dlp),
   build/deepen his 18 openings + variations + sublines to the same standard.
   His speedrun catalog approach = the Naroditsky one (enumerate channel, map
   openings→videos, transcript-ground, house voice, no quoting).

**The recipe per lesson (proven this session):** get the spine → `node` brief
script prints per-ply piece from→to + terminus engine eval (student POV; must be
≥ ~-1.0 or an honest gambit) → author every-step beats (original prose, house
voice, when-to-play, arrows only from real pieces on clear sight-lines, sayShort
≤8 words and NO apostrophes in single-quoted sayShort) → gate → commit → ship.

## Next-session pickup
Start at STEP 1 — the generator. Pilot `pro-naroditsky-caro-kann` (color black,
10 variations, tree at `data/sources/danielnaroditsky-trees/caro-kann.json`).
