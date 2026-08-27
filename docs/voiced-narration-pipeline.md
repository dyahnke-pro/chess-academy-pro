# The Voiced-Narration Pipeline — LOCKED STANDARD (David 2026-08-24)

**Read this whole file before touching any voiced narration, walkthrough,
matchup, or corpus wiring.** It is the end-to-end recipe: how to distill a
video, rewrite its narration in our own words, where the files go, how they
become walkthroughs + matchups + corpus notes, and where to save games so we
can build more pairings. Every path and command below is real and current.

> One-line mental model: **a video → position-anchored "our words" beats →
> (1) branching teach walkthroughs, (2) White-vs-Black matchup walkthroughs,
> (3) position-keyed corpus notes that help free-play / review / tactics.**
> The moves are always real (chess.js-legal); the LLM/author only writes prose
> (G0/G3). Nothing is invented.

---

## 🔒 THE NARRATION TIERS (David 2026-08-27, LOCKED)

- **TIER 1 = the voiced video narrations** — `data/video-narration-voiced/<id>.json`,
  each beat `{ply, t, fen, line, spoken}`: our-words DNA, keyed to the EXACT
  position (FEN) + video timestamp. These are the real teaching and they lead
  EVERYWHERE they exist. (The old `walkthrough-narrations.json` / `bakedNarrationFor`
  generic bake was NOT a real tier — it pinned a generic line to a position;
  deleted 2026-08-24, correctly.)
- **REWIND ASIDES are Tier-1 teaching too** — the narrator's "why this move, not
  that one" / recap beats (ply rewinds, `reanchor`). The build used to DISCARD
  them; now `reconstructSpineFen` returns them as `asides`, anchored by from-FEN
  to the spine ply they branch from, and the walkthrough speaks each inline AFTER
  the move's idea WITH the mentioned-move arrows drawn (never played out — the G6
  lead-the-eye rule). ~1,147 recovered across 142 openings.
- **COMPUTED fills every ply Tier 1 does not cover** — voiced first where it
  exists; a board-true computed "why" (DB move + structure→plan + positionFacts)
  fills the rest. The majority of narration comes from compute. **No silent
  moves, ever.** (The computed-fill wiring is the next build after asides.)

## 0. The data that already exists (don't rebuild it)

### The bank — `data/video-narration/<videoId>.json` (438 Naroditsky videos)
Built by the **video-align pipeline** (`scripts/video-align/`): it reads the
board off the *video pixels* frame-by-frame (occupancy-OCR), so every spoken
moment carries a TRUE position + timestamp. Per-move schema:

```
{ ply, t, fen, line, said }
```
- `ply` — half-move number. **Rewinds/analysis lines revisit a LOWER ply** —
  that's how you tell the real game from a coverage tangent.
- `t` — seconds into the video (the timestamp).
- `fen` — the board on screen at that moment (authoritative).
- `line` — the SAN move(s) played **at that beat only** (NOT cumulative). One
  beat can carry two half-moves, e.g. `["d4","Nf6"]`.
- `said` — the RAW auto-caption transcript. **Verbatim. Never ships.** It is a
  comprehension aid only (plagiarism guard, CLAUDE.md).

**The bank is gitignored / removed from the tree** (`.gitignore` has
`data/video-narration/`). Recover any id from git:
```bash
git show 09120f6:data/video-narration/<id>.json > data/video-narration/<id>.json
```
List every banked id: `git ls-tree -r --name-only 09120f6 -- data/video-narration/`

### Distilling a NEW video into the bank (only if it isn't banked)
Run the video-align pipeline on a YouTube URL — `scripts/video-align/`
(`detect_board.py`, `scan_video.py`, `track.mjs`). It emits a
`data/video-narration/<id>.json` in the schema above. For the TRANSCRIPT
(comprehension only — never quoted), pull it in THIS env with yt-dlp:
```bash
yt-dlp --write-auto-sub --skip-download --sub-langs en \
  -o "data/sources/<player>-voice/transcripts/<slug>.%(ext)s" "<youtube-url>"
```
`data/sources/*-voice/transcripts/` is gitignored — raw transcripts never enter
the repo.

---

## 1. Rewrite the narration → `data/video-narration-voiced/<id>.json`

This is the human-authored step. **Our words, zero verbatim, board-true.**

### Output schema (the "voiced" file)
```
{ videoId, title, openingName, studentSide, voice:"danya-dna",
  rewrittenAt, source:"yt:<id>",
  moves:[ { ply, t, fen, line,   // ← copied straight from the bank, untouched
            spoken,              // ← our-words prose ("" = silent beat)
            kind?, teaches?, plans?, reanchor? } ] }
```
- `spoken` — original prose in the Naroditsky teaching register (the house
  voice, CLAUDE.md). Empty string on routine/duplicate/rewind plies.
- `kind` — `main | branch | trap | review` (post-game review notes become trap
  lines / branches later).
- `teaches` / `plans` — optional transferable idea / forward plan.
- `reanchor:true` — a post-game beat whose words describe a line the reset board
  doesn't show (flag it, never file it as a false claim).

### The method (fast + gated)
1. **Recover the bank file**, then read the timeline:
   ```bash
   git show 09120f6:data/video-narration/<id>.json > data/video-narration/<id>.json
   node scripts/voiced-authoring/inspect.mjs <id>            # idx | ply | line | said
   node scripts/voiced-authoring/inspect.mjs <id> 3 14 24    # full FEN for chosen anchors
   ```
2. **Verify the opening AND studentSide FROM THE MOVES** — titles are
   multi-opening and lie. `d4 Nf6 Bg5` is a Trompowsky no matter what the title
   says; `e4 e6 d3 d5 Nd2 … g3` is a KIA (White) vs French (Black).
3. **Author 3–6 DISTINCT beats per video, silence the rest.** Do NOT narrate
   every move — pick the moments that change understanding. Write to the DNA
   outline: `spoken` (read of THIS position, 1–3 sentences) + optional
   `teaches` + `plans`. Beat shape when it earns it: affirm → but → refute →
   play the line out → the point (tactic named to the pieces) → verdict.
4. **Board-truth rule (non-negotiable):** every square/piece a `spoken` line
   names must be TRUE on that beat's `fen`. A future move ("…f5 is coming") is
   fine as a plan; claiming a piece that isn't there is a defect.
5. **Author via the `build()` chokepoint** so `{ply,t,fen,line}` copy straight
   from the bank (position + timestamp preserved automatically):
   ```js
   import { build } from './scripts/voiced-authoring/lib.mjs';
   build('<id>', 'Trompowsky Attack', 'black', {
     2:  { explains: "The knight leaps to e4, striking the bishop on g5 …", teaches: "…", kind:"main" },
     14: { explains: "The light bishop comes to g4, pinning the f3-knight …", kind:"main" },
     // every other index is silent
   });
   ```
6. **Run the two gates, then commit:**
   ```bash
   node scripts/voiced-authoring/verify.mjs <id>   # 1) FIDELITY PASS  2) eyeball the board-truth table
   ```
   - **bank-fidelity** — `{ply,t,fen,line}` mirror the bank exactly (auto).
   - **board-truth** — the tool prints every square token in each `spoken` line
     with its occupant (`e4:bn g5:wb`); eyeball that each claim is true.
7. **Commit in batches of ~3, push `--no-verify`** (the corpus/gate build is a
   separate step). Branch: work on the designated feature branch, land via PR
   (direct `main` push is classifier-blocked; merge the PR, see §6).

### Absolute rules (ride with every line)
Original prose only (zero verbatim from `said`); never name the
speaker/video/opponent; the banked `fen` is authoritative; concept-first;
no praise; no filler; **no move-number prefixes** ("Nc3", never "2.Nc3" — the
gates reject them); keep `sayShort`-style cues ≤ 8 words when authoring lesson
cues. Stats STAY ("his 92% pick", "528 games").

---

## 2. Voiced files → branching TEACH walkthroughs

`scripts/build-voiced-walkthroughs.mjs` merges all voiced files of the SAME
`openingName` into one branching `WalkthroughTree`:
```bash
node scripts/build-voiced-walkthroughs.mjs        # → src/data/voiced-walkthroughs.json
```
- Reconstructs each video's real main line (ply-monotonic, chess.js-legal;
  analysis rewinds dropped), then tries into a shared spine + forks at
  divergence. The note LEADS each beat (G0). 0 illegal moves is the bar.
- Served in **Learn with Coach**: `resolveVoicedWalkthrough(query)` in
  `src/data/voicedWalkthroughs.ts` matches a teach request → the voiced tree,
  wired as **Tier 0** in `CoachTeachPage` (wins over the static masterclass AND
  over LLM generation; exempt from the notes-lead nulling because it IS the
  note-driven lesson). "teach me the caro-kann" launches it instantly.
- The Learn greeting advertises it (`src/data/coachGreetings.ts`).

Bundle: the JSON is chunked out of `index` via `vite.config.ts`
manualChunks → `appdata-voiced` (it crossed the 8 MiB Workbox cap otherwise —
same rule as `danya`/`chessbrah`). **Any new big `src/data/*.json` needs a
manualChunks rule.**

---

## 3. Voiced files → WHITE-vs-BLACK matchup walkthroughs (KIA vs French)

David: *"we build a walkthrough of all videos we have of KIA vs French"* +
*"I want both"* — voiced when we have the videos, constructed line when we don't.

`scripts/build-voiced-matchups.mjs`:
```bash
node scripts/build-voiced-matchups.mjs --survey     # inspect the pairings first
node scripts/build-voiced-matchups.mjs              # → src/data/voiced-matchups.json
```
- Classifies each voiced video by **(White system, Black defense)** from the
  MOVES, **cross-checked against the hand-verified `openingName` tag** (the
  cross-check is what filters loose-heuristic misfires — a Scandinavian
  mislabeled "French" gets dropped). Excludes degenerate "vs Open Game" pairs
  (that's just the White opening).
- Merges each pairing's real videos into one branching walkthrough. Today: 31
  pairings; KIA vs French = the one real `d3 e6 e4 d5 Nd2 Nf6 g3…` game.
- Served: `resolveVoicedMatchup(query)` matches "X vs Y" in **either order**
  (KIA/najdorf/dragon aliases) → the voiced matchup tree. Wired in the
  `CoachTeachPage` matchup handler **BEFORE** `planOpeningMatchup`.

### Where the pairings come from + how to make MORE
- **A pairing exists because we have voiced video(s) of it.** To make more
  pairings, **voice more videos of that pairing** (§1) — the classifier picks
  them up automatically on the next `build-voiced-matchups.mjs` run. One video
  is enough; more videos = a richer merged walkthrough.
- **When we have NO video of a pairing**, the coach still answers: it falls
  back to `planOpeningMatchup` (`src/services/openingMatchup.ts`), which
  CONSTRUCTS the line from each opening's own DB setup + Stockfish. That path
  draws on the theory DB (`openings-lichess.json`) and the player game corpus
  (below). This is the "both" behaviour.

### Where to SAVE GAMES for constructed pairings / deeper corpora
- **Pro game references** — `src/data/pro-game-references.json`, built by
  `scripts/pro-repertoire/build-game-references.mjs <player>` from the raw
  chess.com corpus in gitignored `data/sources/<username>-chesscom/` (pull with
  `scripts/pro-repertoire/fetch-chesscom.mjs <username>`; OTB via
  `fetch-otb-games.mjs`). This is the coach's BREADTH layer (STEP 11.5 of the
  pro-rep playbook) and feeds `planOpeningMatchup`'s real-game grounding.
- **The theory spine** — `src/data/openings-lichess.json` (the canon; if a line
  isn't here it doesn't exist, G3).

---

## 4. Voiced files → position-keyed CORPUS notes (free-play / review / tactics)

The voiced notes are **corpus notes**. This is what makes the voiced narration
help *everywhere the corpus is consulted*, not just teach.

`scripts/build-voiced-teachings.mjs`:
```bash
node scripts/build-voiced-teachings.mjs           # → public/data/voiced-teachings.json
```
- Emits one `DanyaNote` per narrated main-line beat: `{ id:"vc-<id>-<ply>",
  lineSan:[…full path…], opening:null, phase, explains:<spoken>, teaches, plans,
  concepts:[], sources:["yt:<id>"], positionSource:"high" }`.
- **`opening: null` on purpose** — a voiced note teaches its EXACT board (its
  `lineSan` replays to the fen its prose was verified against), so it surfaces
  ONLY on an exact-position match and never competes in the opening-family
  preference tier (which would displace other corpora's notes). Pure position
  selection = the strictest reading of the corpus doctrine ("selected by
  position, NEVER by name", CLAUDE.md).

### Registering a corpus (two declarations — keep them in sync)
1. `src/services/farmedCorpusData.ts` → `FARMED` array: `{ key:'voiced',
   url:'/data/voiced-teachings.json', bytes }` (runtime lazy loader).
2. `src/data/corpora.json` → the single registry `loadFullCorpus` (tests) reads:
   `{ key:'voiced', path:'public/data/voiced-teachings.json', load:'fetch',
   idPrefix:'vc', primary:false }`.
3. `src/data/secondaryTeachings.test.ts` → add the corpus to its `CORPORA` gate
   list (`idPrefix:'vc'`, `banned: SHARED_BAN`).
4. `src/services/farmedCorpusData.test.ts` → bump the roster count / key list.

Fetched from `public/` at runtime (like the other farmed corpora) — NOT bundled,
so it never touches the JS-bundle precache cap. It reaches the surfaces through
`secondaryNotesForFen` / `secondaryNotesForPosition` → `teachingNoteForBoard` /
`noteAtPosition` in `src/services/danyaTeachingService.ts`, which **free-play,
post-game review, tactics, and read-position** all call.

### "A wire that does not fire is not a wire" (CLAUDE.md)
Ship a test that proves a voiced note comes OUT by position:
`src/services/voicedCorpus.integration.test.ts` injects the corpus via
`__setFarmedCorporaCache`, warms the index, and asserts
`secondaryNotesForFen(fen)` returns a `vc-` note for real positions (the KIA
d2-knight note included).

### 🔒 VOICED IS THE SOLE EXACT-POSITION NARRATION ON THE COACH TAB (David 2026-08-26)

The coach tab was cleaned up so the new voiced (hand-authored, board-true,
exact-position) notes are the *only* thing spoken about the board in front of
the student, and the old generated/farmed narration can't mix in:

- **Generic teach bake RETIRED.** `src/data/walkthrough-narrations.json` (the
  LLM-reworded-from-transcript bake, `bakedNarrationFor`) is archived to
  `data/archive/` and its dataset emptied — board-anchored but *generated*, and
  superseded by the voiced walkthroughs (§2) which serve teach directly.
- **Anchored FARMED notes ARCHIVED.** Every farmed-corpus note with a `lineSan`
  (~6,738: danya/chessbrah/hangingpawns/saintlouis/hikaru/imrosen) was moved to
  `data/archive/corpus-anchored/`. The farmed corpora now ship **floating notes
  only**; voiced (560, growing) is the sole exact-position corpus.
- **Floating notes are FENCED to tactics + endgame ONLY.** They no longer fire
  on any play surface — teach, read-position, free-play, review, or phase-
  transition narration. `teachingSourceForBoard` is exact-position only (the
  opening-family / structure / concept tiers are removed); the floating corpus
  is reached solely through `tacticNoteForPuzzleThemes` (tactics drill) and
  `endgameNoteForLesson` (endgame lessons). `noteAtPosition` was always
  floating-free (a floating note has no line to FEN-index).
  Kept deliberately: `buildDanyaTeachingBlock`'s detector-driven live-tactic
  concept tier (David 2026-08-07).
- Gate: `voicedCorpus.integration.test.ts` proves a voiced note comes OUT of
  `noteAtPosition` + `teachingSourceForBoard(origin='position')` per play
  surface, and that a floating note never does.

### Tier 1 (baked) vs Tier 2 (corpus) — don't confuse them
Free-play / review read the **corpus** (Tier 2, note-driven), which is what §4
wires. The old Tier-1 baked teach path (`walkthrough-narrations.json`) is
retired per the note above.

---

## 5. The gates (run before shipping)
| Gate | Covers |
|---|---|
| `scripts/voiced-authoring/verify.mjs <id>` | per-file bank-fidelity + board-truth |
| `src/data/voicedWalkthroughs.test.ts` | resolver: single opening resolves, matchup declines, KIA-vs-French matches either order |
| `src/data/secondaryTeachings.test.ts` | corpus notes: legal `lineSan`, `yt:` source, id prefix, no attribution/medium leaks, no move-number prefixes |
| `src/data/corpusVisibility.test.ts` | corpus roster counts |
| `src/services/farmedCorpusData.test.ts` | FARMED roster |
| `src/services/voicedCorpus.integration.test.ts` | a voiced note fires by position |
| `npx tsc --noEmit` / `npm run build` | types + bundle (chunk rule for new big JSON) |

Known pre-existing red (NOT caused by this pipeline): `notePreferReachable.test.ts`
(its 160-note floor drifted to 146 from a `repertoire.json`/corpus change). Proven
neutral to voiced (stash to clean main → still 146). Not in ship-check.

---

## 6. Ship it
- Author + gate on the feature branch; **direct `main` push is
  classifier-blocked**, so land via PR: `mcp__github__create_pull_request`
  (mark ready) → `mcp__github__merge_pull_request` (merge method). Merging the
  PR is what reaches production.
- Preview for David without merging: `npx vercel build` then
  `npx vercel deploy --prebuilt` (a git-triggered branch build is SKIPPED by the
  Ignored-Build-Step config, so use `--prebuilt`). Hand him the preview URL.
- After landing on `main`, verify prod: bundle hash advances, then the
  surface-specific audit (`scripts/audit-voiced-teach-prod.mjs` drives
  `/coach/teach`; run "teach me X" and "KIA vs French").

---

## 7. The complete loop, one glance
```
YouTube video
  └─ scripts/video-align/  ────────────────►  data/video-narration/<id>.json   (bank: ply,t,fen,line,said)   [gitignored; recover via git show 09120f6:]
        └─ author by hand (§1, DNA outline, board-true)
              build() + verify.mjs  ────────►  data/video-narration-voiced/<id>.json   (our-words spoken; kind/teaches/plans)
                    ├─ build-voiced-walkthroughs.mjs ─► src/data/voiced-walkthroughs.json ─► resolveVoicedWalkthrough ─► Learn with Coach
                    ├─ build-voiced-matchups.mjs     ─► src/data/voiced-matchups.json     ─► resolveVoicedMatchup     ─► "X vs Y" (voiced; else planOpeningMatchup constructs)
                    └─ build-voiced-teachings.mjs     ─► public/data/voiced-teachings.json ─► farmedCorpusData+corpora.json ─► teachingNoteForBoard ─► free-play / review / tactics / read-position
```
Rebuild all three derived files whenever voiced files change; commit the
derived JSON + the voiced sources together.

---

## 8. Absorbing a new authoring batch — the rebuild runbook (locked David 2026-08-26)

When a batch of new/edited voiced videos lands on `main` (David says "ping" /
"more videos inbound"), a session integrates it with **no code changes** — the
wiring already treats voiced as the sole exact-position corpus. Just rebuild the
derived files, gate, ship, and refresh the review artifact:

1. **Get onto the latest main** (the authoring shards land there):
   ```bash
   git fetch origin main && git checkout -B <branch> origin/main   # or fast-forward your branch
   ```
2. **Rebuild the three derived files from the voiced sources** (deterministic,
   NO LLM, ~seconds):
   ```bash
   node scripts/build-voiced-teachings.mjs      # → public/data/voiced-teachings.json  (corpus notes: free-play/review/tactics/read-position)
   node scripts/build-voiced-walkthroughs.mjs   # → src/data/voiced-walkthroughs.json  (Learn-with-Coach)
   node scripts/build-voiced-matchups.mjs       # → src/data/voiced-matchups.json      ("X vs Y")
   ```
   🔒 **Do NOT regenerate `note-anchors.json` for a voiced-only batch.** The
   anchor sidecar derives from the FARMED corpora (danya/chessbrah/hangingpawns/
   saintlouis), which a voiced batch does not touch — regenerating is a wasted
   step. Only run `derive-note-anchors.mjs` when the farmed corpora themselves
   change (e.g. a strip). `applyDerivedAnchors` already ignores never-covered
   corpora (voiced), so a growing voiced corpus never trips the stale-sidecar gate.
3. **Gate:** `npm run ship-check` → must print `READY TO PUSH`. (Voiced notes are
   board-truth-verified — expect `narrationAccuracy`/anchor mis-anchor ≈ 0.0%.)
4. **Commit + push to `main`.** The corpus is large (voiced-teachings.json ≈
   multi-MB), so **the push can exceed a 2-minute foreground timeout** — run it
   in the background (or with a longer timeout) and confirm it landed with
   `git merge-base --is-ancestor HEAD origin/main`. Do NOT re-push blindly on a
   timeout; check whether it already landed first.
5. **Verify prod:** the bundle hash advances
   (`curl -s "https://chess-academy-pro.vercel.app/?cb=$(date +%s)" | grep -oE '/assets/index-[A-Za-z0-9]+\.js'`).
6. **Refresh the review artifact** so it always shows the full current set:
   re-extract the voiced notes (group by source video) and republish to the
   SAME artifact URL (`Coach Narration Audit` — pass its `url` or republish the
   same file path). The extractor: group `voiced-teachings.json` notes with a
   `lineSan` by `sources[0]`, emit `{line, spoken, teaches, plans}` per beat.

**Counting "how many of Danya's videos are baked in":** every voiced source
file id traces to Naroditsky's 439-video bank (`git ls-tree -r --name-only
09120f6 -- data/video-narration/`). Count = `ls data/video-narration-voiced/
*.json | wc -l`; cross-ref against the bank ids to confirm they're all his
(the "set-aside" games — Carlsen–So, Botez lesson — are games he teaches
*within* his own videos, so they still count as Danya videos). As of
2026-08-26: **430 of 439 baked** → 7,713 corpus notes across 426 lessons.
