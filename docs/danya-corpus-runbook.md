# Danya corpus runbook — wiring more YouTube transcripts into opening theory

The pipeline that turns Naroditsky teaching videos into the corpus every coach
surface grounds on (`src/data/danya-teachings.json`, loaded by
`danyaTeachingService`). Built + battle-tested 2026-07-29/30. Follow in order;
every step is resumable and idempotent.

## The chain

```
fetch-manifest → pull-transcripts → distill-v2 → merge-corpus → gates
                                                      ↓
                                    anchor-notes → apply-anchors → gates → push
```

## 0. Key + ground rules

- **DeepSeek key: pull from Vercel, never ask David.** The session env copy
  401s. `GET api.vercel.com/v10/projects/$P/env?teamId=$T` (bearer
  `$VERCEL_TOKEN`) → find `DEEPSEEK_KEY` env id → `/v1/projects/$P/env/<id>?teamId=$T&decrypt=true`.
- **Raw transcripts are NEVER committed** (plagiarism guard, David 2026-07-02).
  `data/sources/naroditsky-voice/transcripts/` is gitignored and dies with the
  container. That is by design — only distilled ORIGINAL prose ships.
- **Never re-pay for a distilled video:** the shipped corpus carries
  `v2VideoIds`; `distill-v2` skips those even in a fresh container.
- **G0 everywhere:** the model writes prose only. It does not emit moves
  (v1 did — that's why 3,710 notes shipped unpositioned) and does not emit
  the opening tag (v1 did — 543 mis-tags). Code owns both.

## 1. Add videos

`scripts/danya-corpus/fetch-manifest.mjs` — `PLAYLISTS` map holds his 10
teaching playlists (449 videos). To add more, add playlist keys there, or for
**non-playlist uploads** (~160 more on the channel) enumerate with
`yt-dlp --flat-playlist --print "%(id)s\t%(title)s" https://www.youtube.com/@DanielNaroditskyGM/videos`
and merge ids into `data/sources/naroditsky-voice/manifest.json` (same shape).
Prefer TEACHING videos; one-off game vids distill thin (~10 notes).

## 2. Pull transcripts

```bash
PULL_PACE_MS=8000 node scripts/danya-corpus/pull-transcripts.mjs
```
- YouTube bot-checks the datacenter IP after ~75 pulls. The script has a
  circuit breaker (5 consecutive fails → 30-min cooldown). Just leave it
  running; re-run until "0 missing". A few videos have NO captions — accept.
- Titles for manifest-less runs come from the oembed endpoint (no auth, no
  bot-check): `youtube.com/oembed?url=...&format=json`.

## 3. Distill (the expensive step)

```bash
# ALWAYS dry-run first — tracker/chunk stats, zero tokens:
node scripts/danya-corpus/distill-v2.mjs --id <VIDEOID> --dry
DEEPSEEK_KEY=<from vercel> node scripts/danya-corpus/distill-v2.mjs --concurrency 6
```
- ~20-50 notes/video (v1 managed 10.8). One prose-only call per 5k-char chunk.
- The opening tag is CODE-STAMPED from the video title against DB names
  (`openingFromTitle`) — never model-guessed. No title match → null tag.
- **Do NOT trust transcript position-tracking.** Four approaches all produced
  confidently-wrong boards (15 fake "games"; KIA at coverage 1.0; Scotch
  Fraser; nothing with the right opening supplied). Captions can't separate a
  move PLAYED from a square NAMED or a hypothetical NARRATED. The aligner
  fails closed; positions come from Stage 1 anchoring instead.
- Chunk failures throw loudly (a 401-dead key once reported "0 notes, exit 0"
  — that silent-zero class is fixed; keep it fixed).

## 4. Merge + gate

```bash
node scripts/danya-corpus/merge-corpus.mjs   # v2 wins per-video; carried notes keep breadth
npx vitest run src/data/danyaTeachings.test.ts src/services/danyaTeachingService.test.ts src/services/structureSignature.test.ts
```
- Merge enforces the depersonalization BAN mechanically (the gate's regex,
  mirrored) and G9.4 move-number stripping. Merge is O(n²)-ish — minutes.
- **Merge REASSIGNS note ids.** Anything keyed by id (an anchor report) is
  stale the moment you re-merge — regenerate it after.

## 5. Anchor (what makes notes deterministic)

```bash
node scripts/danya-corpus/anchor-notes.mjs    # ~6 min; report + defect list
node scripts/danya-corpus/apply-anchors.mjs   # writes HIGH-tier lineSans into the corpus
# re-run the gates, then push
```
- Anchoring replays each note's own SAN-in-prose against every candidate spine
  and accepts only roots where the note's piece-on-square claims are TRUE.
  Only the `high` tier is applied. This is what feeds `noteAtPosition` — the
  walkthrough splice, fact packages, and structure transfer all key off it.
- Run anchor AFTER the merge that will ship (id coupling above).

## 6. Ship

Commit `src/data/danya-teachings.json` + push to main (full ship-check hook).
Then the standard post-deploy checks; the audible end-to-end proof is
```bash
AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
AUDIT_OPENING="latvian gambit" node scripts/audit-teach-corpus-spoken-prod.mjs
```
(pick an opening whose positioned notes sit on SHALLOW unique prefixes —
shared prefixes like `e4 e5 Nf3 Nc6` collide on bucket[0] and deep marks
outrun the probe window; the script computes marks from the corpus itself).

## Where the notes flow at runtime (don't rewire, extend)

- Exact position → `noteAtPosition` → walkthrough splice
  (`openingGenerator`, genRev-stamped cache) + fact packages (thinkAloud,
  step narration) — spoken deterministically.
- Structure transfer → `notesForStructure` (`structureSignature.ts`) — same
  teaching in similar structures, truth-filtered against the live board.
- Chat/Q&A (Learn AND Play — full parity) → `coachService.ask` Danya block;
  bypass surfaces (mic, position narration, search) → `narrationGrounding`
  loader 5.

## Other creators

The pipeline is Naroditsky-pathed (`naroditsky-voice/` dirs, one corpus file,
`danyaTeachingService`). For another teacher: same scripts with new dirs +
manifest, but a SEPARATE corpus file + service seam — do NOT mix voices into
`danya-teachings.json`. The house VOICE stays Naroditsky-register regardless
(CLAUDE.md doctrine); another creator's corpus supplies IDEAS, not voice.

## The 3-tier walkthrough narration architecture (David 2026-07-30, LOCKED)

"Teach me X" on /coach/teach resolves narration in this order:

1. **Masterclass** — `masterclassWalkthroughAdapter.masterclassWalkthroughTree`
   adapts a monotonic `LessonScript` into a WalkthroughTree on the fly:
   authored beats, authored arrows + mentioned-move lead-the-eye arrows,
   ZERO LLM, instant. Rewinding/branching lessons (ruy, queens-gambit,
   kings-gambit) and roadmap/trap shapes fall through. Face/tour skip it.
2. **Baked video narration** — `bakedWalkthroughNarration.bakedNarrationFor`
   looks up `src/data/walkthrough-narrations.json` (built by
   `scripts/danya-corpus/narrate-from-video.mjs`): the teacher's transcript
   handed to the model OFFLINE, reworded, gated. Hit = deterministic spine
   narration, no note splice, no reword; zero runtime LLM when branch-free.
3. **Computed generation** — the existing DB-narration path (LLM prose +
   note splice + house-voice reword), template fallback never cached.

### Baking a new opening (Tier 2)

```bash
# spine comes from the RUNTIME resolution (print-spine tsx bridge) — a bake
# on any other line will never match at runtime:
node scripts/danya-corpus/narrate-from-video.mjs \
  --opening "<canonical name>" --videos <ytId1,ytId2> [--dry]
```

Gates (bake script + `src/data/walkthroughNarrations.test.ts` build gate):
legal spine, one idea per ply, 7-gram overlap, attribution leak, move-number
prefix, board-claim truth (claim named in the failure), and **ALIGNMENT** —
every idea must speak about its OWN ply's move (the first Latvian bake
shipped ideas shifted one ply; every board claim was true, only the own-move
check caught it). Repair loop = up to 2 rounds with the exact violation named.
After a successful bake: bump `WALKTHROUGH_GEN_REV` + shared `PROMPT_VERSION`
so cached trees regenerate, commit the JSON, push, then run
`AUDIT_TIER=baked AUDIT_OPENING="<name>" node scripts/audit-teach-tiers-spoken-prod.mjs`
against prod. Read the baked ideas against the board before shipping —
gates catch classes, not every semantic lie (the Latvian's "Qxg2 grabs the
rook on h8" passed every gate; hand-fix such plies in the JSON, the build
gate re-verifies).

### Comparative bridges (baked "what's different" — David 2026-07-31)

When the runtime spine ends in a fork with ≥2 branches, the bake also emits
`bridges` — per-sideline comparative prose ("where the main continuation
plays X toward plan A, today's line answers Y toward plan B") spoken by
`useTeachWalkthrough.pickFork` ONLY to a returning student (teaching-ledger
visits > 0), with flip registers, falling back to the computed v1 template
on any miss. Re-bake bridges alone (never churns reviewed narration):

```bash
node scripts/danya-corpus/narrate-from-video.mjs \
  --opening "<canonical name>" --videos <same ids> --bridges-only
```

Bridge gates (bake + build): both SANs named (the comparison anchor), board
claims true at the DIVERGENCE FEN — the prompt forces MOTION phrasing
("lands on b5") over location ("the knight on b5") because the fork position
predates both continuations — plural/list claims ("pawns on e6 and c5")
count per square, flipped register must actually differ from the primary.
Hand-review remains mandatory: the first Taimanov bridge said "chase it with
d6" (d6 blunts Nd6+; …a6 does the chasing) and its flip register inverted a
FACT ("White develops freely" for Black's tempo gain) — classes no gate
catches. Ground every claim in the branch's real `extensionMoves` before
shipping.

## Tier-2 openings = the FUTURE MASTERCLASS QUEUE (David 2026-07-30)

Every Tier-2 baked opening is a flagged candidate for a full masterclass
build (playbook + G9.x). When one gets its masterclass, Tier 1 takes over
automatically and the baked entry goes dormant — nothing to remove.

| Opening | Baked | Notes |
|---|---|---|
| Latvian Gambit | ✅ 14 plies | 2 dedicated videos |
| Four Knights: Glek System | dormant | masterclass EXISTS — Tier 1 serves it |
| Elephant Gambit | ✅ 8 plies | 3 videos |
| Sicilian: Grand Prix Attack | ✅ 5 plies | 6 videos — deep video coverage, strong masterclass candidate |
| Bird Opening | ✅ 18 plies | 2 videos |
| Torre Attack | ❌ bake rejected (side-voice confusion; 1 multi-topic video) | needs dedicated source or hand-authoring |
| Hippopotamus Defense | ❌ bake rejected (DB spine is the joke Nh6 line; narration described the wrong side) | classic double-fianchetto hippo needs a curated spine first |

Video-covered openings that already HAVE masterclasses (no Tier-2 needed):
scandinavian (17 vids), philidor (14), smith-morra (13), french (16),
accelerated dragon (8), najdorf (6), vienna gambit (6), danish (6),
stafford (2), benko (1), catalan (1) — these videos are still voice-corpus
input for masterclass narration polish.
