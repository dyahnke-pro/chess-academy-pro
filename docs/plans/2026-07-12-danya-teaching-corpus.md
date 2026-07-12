# The Danya Teaching Corpus — position-keyed teaching for the whole coach (2026-07-12)

**David's directive (verbatim intent):** *"I want what he teaches in every
position. Accompanied by his explanation of the position. And the future
plans. Combined with the fork in the road and phase transitions. This is as
close to danya next to you as I think we can get! Make sure to unwire the
books, I don't want them intruding on danya."* Plus: *"I want as much of his
teachings as possible. Danya even has a series on openings! Get those too."*
And the unification order: *"I don't want 3 different behaviors from the
coach. So this new work needs to compliment or even take over the current
coach behavior."*

**The locked constraints that govern every step:**
- **REFERENCE ONLY — NEVER QUOTE** (David 2026-07-02 plagiarism guard).
  Transcripts are comprehension aids; every shipped note is ORIGINAL prose
  teaching the (public-domain) chess ideas he teaches. Raw transcripts stay in
  gitignored `data/sources/naroditsky-voice/transcripts/`, never committed.
- **G0** — the corpus adds computed/curated FACTS to the existing chokepoints
  (`voiceFacts`, the generation prompt). The LLM still decides nothing.
- **G3** — every move sequence in a note is chess.js-validated before it
  ships; invalid sequences are dropped, never repaired by guessing.
- Depersonalized in-app: the notes carry his IDEAS in the house voice; the
  app never names him (style, not attribution).

## The source set (449 videos, 10 playlists — channel @DanielNaroditskyGM)

| Playlist | Videos | ID |
|---|---|---|
| Naroditsky's Opening Lab (the openings series) | 5 | PLT1F2nOxLHOfzUTCQ7rCaiS5gbfaEkpDj |
| Top Theory Speedrun | 81 | PLT1F2nOxLHOc80pNT3XH1xUDyeom46R3X |
| Sensei SpeedRun | 114 | PLT1F2nOxLHOeyyw85utYJpWtSmxvA-2WR |
| Master Class Speedrun | 92 | PLT1F2nOxLHOefj_z54LNBpnASnIROm43e |
| SpeedRun (original) | 71 | PLT1F2nOxLHOcmi_qi1BbY6axf5xLFEcit |
| DYI Develop Your Instincts | 40 | PLT1F2nOxLHOdrvOyOXb_l2yGJrkwLA72Z |
| Beginner to Master Speedrun | 20 | PLT1F2nOxLHOfQ-eoJTpyvKkQFwYewDduj |
| End Game | 18 | PLT1F2nOxLHOfQI_hFiDnnWj4lb5KsviJ_ |
| Grandmaster Guide | 4 | PLT1F2nOxLHOfUGsnb1GREeaQ3vP9k_ys6 |
| Chess Mastery Explained | 4 | PLT1F2nOxLHOcZlKiT0J-ov5-RsM9taTvm |

## The note shape (position-keyed, per David's spec)

```jsonc
{
  "id": "dt-<video>-<n>",
  "openingIds": ["caro-kann"],        // canonical names/ids when nameable
  "lineSan": ["e4","c6","d4","d5","e5"], // chess.js-VALIDATED move prefix = the position key
  "phase": "opening" | "middlegame" | "endgame" | "concept",
  "explains": "…original prose: his explanation of THIS position…",
  "teaches": "…the idea he teaches here (weak square, trade, break)…",
  "plans": "…the future plan he lays out from here…",
  "concepts": ["outpost", "pawn-break-c5"],   // optional tags
  "sources": ["yt:<videoId>"]          // required, every note
}
```

Position-keying is by SAN prefix (longest-prefix lookup at runtime), same
family as the fact-chain / book-line lookups — never FEN-fuzzy.

## Pipeline (scripts/danya-corpus/) — resumable, incremental

1. **`fetch-manifest.mjs`** — enumerate the 10 playlists →
   `data/sources/naroditsky-voice/manifest.json` (id/title/playlist, committed).
2. **`pull-transcripts.mjs`** — yt-dlp auto-subs per video into the gitignored
   transcripts dir; skips existing; rate-limited. Resumable.
3. **`distill.mjs`** — per video: VTT → clean text → ONE DeepSeek call with a
   strict schema (notes above) + hard rules (original prose, no sentences from
   the transcript, moves only as he demonstrates them) → chess.js-validate
   every `lineSan` (drop invalid) → **7-gram overlap gate vs the transcript**
   (any 7-word run shared with the transcript kills the note) → per-video JSON
   in `data/sources/naroditsky-voice/distilled/` (committed — this is original
   content). Resumable (skips distilled).
4. **`merge-corpus.mjs`** — all distilled notes → `src/data/danya-teachings.json`
   (dedup by lineSan+teaches similarity, bounded prose lengths, sources
   required). Prints coverage stats (openings covered / notes / phase mix).
5. **Gate** — `src/data/danyaTeachings.test.ts`: every note has legal lineSan
   (chess.js), non-empty explains/teaches, `yt:` source, prose length bounds,
   no banned attribution strings ("Naroditsky", "Danya", "I " first-person
   quotes), no move-number-prefix robotics (G9.4 regex).

## Runtime wiring — TWO funnels, no per-surface forks

- **`src/services/danyaTeachingService.ts`** — loads the corpus; lookups:
  `notesForPrefix(historySans)` (longest prefix match),
  `notesForOpening(nameOrId)`, `planNoteForPhase(historySans, phase)`.
- **Spine (all 13 chat surfaces):** in `coachService.askImpl`, beside the
  playerGames/masterPlay sources — when the live history/ask matches covered
  notes, inject a compact `DANYA TEACHING CONTEXT` block (the same class of
  curated grounding as the book block it replaces).
- **Generation (Tier-3 lessons):** `openingGenerator` narration prompt gets
  `buildDanyaNarrationContext(openingName)` where the book block used to be.
- **Fork-in-the-road:** `buildForkTalk` options gain `teachingNote` when a
  road's move matches a covered continuation — the deliberation speaks his
  take on each road.
- **Phase transitions:** `usePhaseNarration` appends the matched `plans` note
  to its computed extraFacts on opening→middlegame for covered paths.
- **Live step narration:** `CoachTeachPage` appends `notesForPrefix` output to
  `moveNarrationFacts` — voiced through the same chokepoint shipped today.

## Unwiring the books (David: "I don't want them intruding on danya")

- REMOVE book-passage injection from coach SPEECH: the
  `buildOpeningNarrationContext` block in `openingGenerator`, and the
  book-grounding block (`loadBookGroundingForLive` / `buildCoachChatContext`)
  in the chat spine. The Danya block takes those slots.
- KEEP (not coach speech): the BookReader surfaces on opening pages
  (From-the-Books / Classic Wisdom read-aloud) — explicit user-tapped READING
  features, not the coach's voice. Concept fallback definitions (one-line
  modern definitions) stay for "what is a fork" until the corpus covers them.
- Flagged for David: if he wants the book READER surfaces gone too, that's a
  separate content decision — not assumed here.

## Rollout

- **Wave 1 (this session):** pipeline + Opening Lab (5) + Top Theory Speedrun
  (81) distilled → corpus shipped → runtime wired → books unwired → gates +
  audit green on main.
- **Wave 2:** remaining ~363 videos — the pipeline is resumable; run
  `pull-transcripts` + `distill` + `merge` again (documented in the scripts).
- Every wave re-runs the merge + gates; the corpus only grows.

## Status

- [x] Playlists enumerated + counted (449)
- [ ] Wave-1 transcripts pulled
- [ ] Distiller + gates built
- [ ] Corpus merged + committed
- [ ] Runtime wired (spine + generator + fork + phase + step narration)
- [ ] Books unwired from coach speech
- [ ] Ship + audit
