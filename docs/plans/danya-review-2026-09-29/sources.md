**Danya data inventory (excluding data/video-narration-voiced/)**

**1. Voice research notes: little in them, and nothing reads them at runtime.**
- `data/sources/naroditsky-voice/manifest.json` holds 607 video IDs and titles only, grouped by playlist (sensei 114, master-class 92, top-theory 81, speedrun 71, endgame 18, channel-other 158, …). The build scripts in `scripts/danya-corpus/*` (fetch-manifest, distill, batch-bake) use it. It is the index the corpora were distilled from; the app never loads it.
- `data/sources/danielnaroditsky-voice/` has 8 .md files, 746 lines:
  - `naroditsky-teaching-principles.md` lists 18 principles paraphrased from Listudy, plus register notes: short declarative sentences, "the point is", forks stated as "if X we do Y", and the rule to name what a move achieved rather than praise it.
  - `per-opening/_master-repertoire-notes.md` summarises the Gordima repertoire and his catchphrases.
  - The per-opening files (alapin, kid, …) are data fingerprints: game counts, score %, endgame mix, and mined blunder tables. The KID file is a Pass-A skeleton full of TODOs.
  - Only lesson `sources[]` comments and build scripts cite these files. Nothing consumes them at runtime.

**2. Game-derived build data: build-time only.**
- `danielnaroditsky-deep/`: 27 variation files. Each has a spine to its terminus, W/D/L, the games at the terminus, an endgame breakdown and the top 3 model games.
- `danielnaroditsky-trees/`: 36 files, split between opening trees and `*-model-games`.
- 10 `*-trap-candidates.json` files hold about 992 mined blunder patterns. Each has `beforeFen`, `blunderSan`, count, the victim's rating and the punish line; KIA alone has 361.
- Consumers are `scripts/pro-repertoire/*` and `scripts/catalog-sweep/*`; lessons only cite them in comments. They are distilled into `src/data/lessons/proNaroditsky*.ts`: 25 files, 739 `say:` beats. Those beats reach live Learn through `curatedBeatAt` (`CoachTeachPage.tsx:8144`), gated by seat and register.
- Also `pro-repertoires.json`: 11 `pro-naroditsky-*` openings, served on the /openings pages.

**3. Corpus notes**
- `src/data/danya-teachings.json` has 122 notes, all with `lineSan: []`. They are "positioned" only through `note-anchors.json`, and are distilled from 421 videos.
- `public/data/danya-floating.json` has 9,928 notes with the same schema: `{id, lineSan, opening, phase, explains, teaches, plans, concepts[], sources[yt:]}`.
  - By phase: middlegame 5,585, concept 1,772, opening 1,612, endgame 959.
  - 6,870 have an opening name. The concept vocabulary is not normalised: 6,443 distinct tags (e.g. "piece activity" and "piece-activity" both occur).
- Sampling 150 notes: most `teaches` fields are real method teaching — wishlist, remove the defender, least-valuable piece, "does he actually prevent it?", "don't fear the pin if it's pawn-defended", check forcing replies before your plan, "don't panic after a blunder", and endgame technique (knight vs pawns, f-pawn majority, luft on h6 not g6). There is noise too: cheating talk, book recommendations, rapport.
- Registered in `src/data/corpora.json:14-21`.
- Consumers:
  - Chat and generation via `buildDanyaTeachingBlock`: `coachService.ts:38`, `narrationGrounding.ts:49`, `openingGenerator.ts:53`.
  - Tactics drill: `TacticDrillPage.tsx:20`.
  - Endgame lessons: `EndgameLessonTab.tsx:53`.
  - Phase narration: `usePhaseNarration.ts:16`.
  - Position read: `positionReadComposer.ts:15`, which is gated by `corpusNotes`.
  - Mistake puzzles: `mistakeNarration.ts:5`.
  - Play's tapped "Why?" button: `groundedMoveWhy.ts:68` via `whyBestMove`, from `CoachGamePage.tsx:141`.
- The only link from the corpus to Learn free play is `danyaBehaviors.ts`. Its 25 computed behaviours carry weights equal to the corpus concept-tag counts, and a stride scheduler picks among them (`CoachTeachPage.tsx:1153, 8246`). Its header (line 20) still says "11,426 notes" in danya-teachings.json — a stale number.
- **Gap:** `danyaBehaviors` is wired **only** in Learn. Review does not call it, so it gets no corpus-rate behaviour mix.

**4. `public/data/danya-play-db.json`: 31,842 FENs → `{total, moves[{san, games, w, d, l}]}` from his games.**
- Consumed only by review: `hisPlayLookup.ts:34` → `reviewStrategicOrientation.ts:51,416` and `coachFeatureService.ts:4633`.
- **Under-used:** Learn free play and Play never ask it "what does he play here / how does it score". That would be a natural computed "his move here" fact on Learn.

**5. `public/data/danya-review-openings.json` (100 FENs) is misnamed.** It holds Lichess *masters* W/D/L and topGames, not Danya data (`reviewOpeningsSource.ts:1-12`). It is used only by the review opening lecture (`CoachGameReview.tsx:2857`). Rename it to prevent confusion.

**6. Voiced corpus**
- `voiced-teachings.json` has 7,477 notes, all exact-position, with `positionSource` and `studentSide`. Only 945 have `teaches` filled and none has concepts, so this corpus cannot feed concept weights or the drills.
- `voiced-walkthroughs.json` has 205 trees and `voiced-matchups.json` has 46. Both are consumed by `voicedWalkthroughs.ts:14-15` → `CoachTeachPage.tsx:94`, i.e. the teach-X lesson and matchups.

**7. `public/data/pro-game-references.json`: 530 Naroditsky games out of 2,209.**
- Consumers: `proGameReferenceData.ts`, `playerGames.ts:22` (chat envelope), `lookupPlayerGames.ts:16`, `ProGamesPage.tsx:7-8` and `dataLoader.ts:11`.
- Not used by review, Learn or Play narration.

**8. Docs**
- `naroditsky-voice-register.md` defines the two registers.
- `2026-08-23-danya-teaching-point-coverage.md:33-69` is a 33-row detector matrix.
- `2026-09-24-speedrun-target.md` has 25 rows (L1–L11, H1–H14).
- PLAN.md:464 WO-DANYA-01 has these open items:
  - a quiet-move purpose computer;
  - the plan arc;
  - subsumption of same-claim pairs (B);
  - review line arrows and a walk button (D).

**Unused or under-used with teaching value (ranked)**
1. **The trap-candidate files (about 992 patterns).** Each is a real opponent blunder with a frequency and a punish line. Nothing at runtime uses them outside the hand-authored trap lessons. They could feed Learn/Play gem detection ("a common slip here, 30 of his games") and review.
2. **`danya-play-db` is used by review only.** Learn and Play could compute "his choice here, N games, X%".
3. **The floating notes' `teaches` text** is a catalogue of methods for which no computer exists. It only feeds concept weights and chat.
4. **The deep endgame breakdowns** are not used by the endgame lessons at runtime.
5. **`danyaBehaviors` is absent from review.**

**Danya behaviours in these sources that the app has no computer for.** I grepped `src/services` for wishlist, least-valuable piece and remove-the-cause and found nothing; the rest come from the doc matrices marked missing or partial.
- **Wishlist method:** work backwards from the target square to the piece that gets there (principles #13; speedrun H9).
- **Least-valuable piece does the job:** defensive duty or task assignment (#1, #7, H10). Piece values exist; no advisor.
- **Remove the cause, not the symptom:** trade the attacker instead of blocking (#10).
- **Principle plus its exception:** L4 and coverage #19. The exception is never said.
- **One move, two jobs / multi-effect** (L6, #23).
- **Structural cost of the opponent's move:** "c5 leaves a hole on d5" (L11).
- **Opponent intent as a two-step plan:** "he wants X, then Y" (L1). There is only a partial `opponentIntentRead`.
- **Wasted move / punish the slow move / keep the tension:** coverage #15, #16, #21.
- **"Does he actually prevent it?" and inaccessible weak squares:** #17, #18.
- **Pin assessment by the defender:** a pawn-defended pin is harmless (#16).
- **Dynamic vs static edge: cash in the initiative before it expires** (#11, #12). Initiative, counterplay, coordination and simplification have no metric (coverage P4b).
- **Plans are ≤3 moves / switch the target:** #9, #14 and coverage #24.
- **Candidates posed as a question, "two good squares", as a habit** (L3).
- **Method beats:** don't panic / split the position (H5), three ways to meet a check (H6), question the knee-jerk (H7), one decisive comparison (H8).
- **Transposition and move-order traps** (coverage #2).
- **Luft choice h6 vs g6.** This appears in the floating notes; there is no computer for it.