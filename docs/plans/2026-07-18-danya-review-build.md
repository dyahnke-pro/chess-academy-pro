# The Danya Review Build (David 2026-07-18: "IF YOU CAN MAKE THIS REAL")

Companion to `2026-07-18-danya-review-standard-gap.md` (the measured gap).
This is the execution plan for the painted picture, in ranked order. Every
phase is G0-clean: facts computed (engine PV, DBs, eval trace, buckets),
voice only phrases.

David's refinement (locked): before the coach plays a winning line out, it
ASKS the student to SPOT THE SEQUENCE first — play their calculation on the
board, judged ply-by-ply against the PV. Failing deep in the line is not
"wrong", it's DATA: tag a `calculation-depth` weakness bucket ("long
tactical sequences") with the depth they reached. The spot-first flow is
the diagnostic; the playback is the teaching.

## Phase 1 — PV playback + spot-the-sequence (THE CORE)
- `src/services/pvPlayback.ts`: compute the full winning/punishment line
  from a review position (Stockfish PV at review time, chess.js-validated),
  with per-move grounded narration facts (captures, checks, threats,
  material delta) for the voice.
- Extend find-the-shot: after the first move is found/revealed, the coach
  asks "can you see the follow-up?" → student plays THEIR line for the
  mover's side on the board, engine answers for the defender; each student
  ply judged vs the PV (exact or eval-equivalent = credit). Reach the end →
  full credit, prosody spike. Fall off at ply N → capture
  `calculation-depth` bucket entry {reachedPlies, totalPlies, fen, pv} and
  the coach plays the WHOLE line out with narration.
- "Watch it play out": animate the PV on the walk board (arrows + voice),
  auto-paced, cancellable.
- Bucket: add `calculation` category entry to the weakness/misconception
  capture with sequence-depth metadata; surfaces in /weaknesses + drills.

## Phase 2 — model-game injection
- Theme-match the paused review position (motif signature: outpost /
  kingside storm / structure / endgame type + opening family) against
  `model-games.json` (646) + `pro-game-references.json`; when a match
  clears the bar, offer "watch how a GM handled this exact idea" → play the
  matching stretch on the board, then return to the review.

## Phase 3 — principle distillation
- Hand-authored principle text per misconception tag (G0: the tag is
  computed; the principle is curated, not LLM-invented), spoken at the
  reveal + "that's the Nth time this month" from bucket counts.

## Phase 4 — theory-departure moment
- Find the divergence ply vs `openings-lichess.json` (+ masters DB counts),
  offer "book ended here — want to see the main line?" → play the book
  continuation on the board, then return.

## Phase 5 — theme of the game
- Classify the dominant motif from the eval trace + mistake clusters +
  structures; open and close the review with it.

## 🔒 PREVIOUSLY PLAYED GAMES GET ALL OF THIS (David 2026-07-18: "I also
want this behavior for review with coach so previously played games get
the same post review.")

VERIFIED IN CODE (2026-07-18): `CoachReviewSessionPage` adapts EVERY stored
`GameRecord` (chess.com import / lichess import / past coach game) into the
SAME `CoachGameReview` component, and runs `analyzeSingleGame` (Stockfish)
on any game where `gameNeedsAnalysis` — filling per-ply evals +
classifications + bestMove-on-flagged-plies. So all five phases, built
inside CoachGameReview + its services, apply to previously played games
AUTOMATICALLY. Data nuances the build must respect:
- Stored analysis keeps `bestMove` only on MISTAKE plies (deeper pass) and
  stores NO PV. Fine: the question moments are exactly the flagged plies,
  and Phase 1 computes the PV at review time from the position (never from
  stored data). Do NOT add a PV column to the schema; compute + optional
  in-memory cache.
- Pre-fix pawn-unit records are already flagged for re-analysis by
  `gameNeedsAnalysis` — no extra migration needed.
- ACCEPTANCE GATE (every phase): the repro script must drive BOTH entry
  points — a fresh coach game's post-game review AND a STORED game via
  `/coach/review/:gameId` — and assert identical feature behavior.

## THE STEP-BY-STEP (engineered for first-time green)

Honest framing: nothing "guarantees" first-time success. What this plan
does is make every step VERIFIABLE BEFORE THE NEXT STARTS — the same
probe-first / services-before-UI / tests-before-wiring / repro-before-ship
discipline that took the Vienna Qf3 and Hikaru builds gate-green first try.
Nothing is authored from assumption; every integration point was read in
code before this plan was written.

### Phase 0a — CONTAINMENT NET on voiceFacts (David 2026-07-18: "how do
we get the llm to not say what we want instead of other random things? …
it had a tangent about what a knight fork was")

DIAGNOSIS (verified in coachApi.ts): voiceFacts's existing nets catch
INVENTED NUMBERS (`introducedNumbers` → trip → serve computed prose) and
DROPPED critical tokens (`mustPreserve`). A conceptual tangent — a
knight-fork definition, generic advice — adds no number and drops no
token, so it passes BOTH nets; the only thing standing against it is the
prompt's "add NOTHING" line, which is prompt-begging, not a gate. That is
the hole the tangent went through, and it's live TODAY on every
voiceFacts vertical.

THE FIX — the symmetric third net, same shape as introducedNumbers (pure,
zero extra LLM calls, fallback = the computed prose, never a regen):
1. `introducedChessTerms(facts, out)` — closed-vocabulary scan of the
   OUTPUT for chess content absent from the FACTS: SAN-shaped tokens,
   square names (a1-h8), piece words, and the concept lexicon (fork,
   pin, skewer, discovered attack, outpost, zwischenzug, … — reuse the
   tactics/misconception term lists already in the codebase). Any hit →
   trip → serve the computed facts + `claim-validator-trip`
   (source=voiceFacts.containment) audit for observability.
2. SENTENCE BUDGET — output sentences ≤ facts sentences + 1. A 3-fact
   bundle phrased into 8 sentences is padding/tangent even when the
   vocabulary passes (motivational rambling has no chess terms at all).
   Deterministic, cheap.
3. (Sharpening, optional) definition-shape stripper — sentences matching
   didactic-definition patterns ("A knight fork is…", "In chess, X
   means…") whose subject isn't defined in the facts get stripped at
   sentence granularity (the stripChessyStraySentences pattern) before
   the whole-reject check, preserving the good sentences.

WHERE: inside voiceFacts core, right after the existing fidelity check —
ONE chokepoint, so every current vertical (the tactical-strengths answer
that tangented) AND the future review playback inherit it. The
`voiceFactsBatch` wrapper then applies all three nets PER LINE.

NOTE: this fixes a LIVE bug as well as hardening the future playback.
DECISION (David 2026-07-18: "Fold the bug fix into the build"): it ships
AS PART OF the build — Phase 0a is the first thing the build session
lands, not a standalone pre-release.

### Phase 0 — preflight probes (before ANY authoring)
0.1 PV probe: confirm `stockfishEngine` can yield a FULL PV line (not just
    bestmove) — the UCI `pv` field. If `analyzePosition` doesn't expose it,
    extend the engine wrapper to return `pv: string[]` (one place,
    stockfishEngine.ts only, per the repo rule). VERIFY: throwaway script
    prints a 6–10-ply PV for 3 fixed FENs; every move chess.js-legal.
0.2 Board-animation probe: confirm the walk board can render a scripted
    move queue (today `walkExplorationFen` shows ONE explored position +
    engine reply — the playback needs a paced multi-ply queue). VERIFY:
    the mechanism drives 6 plies on the walk board in a repro script.
0.3 Bucket probe: read `MISCONCEPTION_TAGS` taxonomy + `logMisconception`
    input shape; confirm adding a `calculation` tag + metadata field is
    additive (no migration). VERIFY: unit test logs + aggregates it.

### Phase 1 — PV playback + spot-the-sequence + calculation bucket
1.1 `src/services/pvPlayback.ts` (pure service, no UI):
    `computePvLine(fen, firstUci?, maxPlies=8)` → `{ moves: san[],
    facts: RICH per-ply fact bundles (see R1: candidates+evals incl.
    near-miss tension, plans+preconditions, king safety, structure,
    scope/outposts, threats made/parried, opponent's idea, named
    patterns — all chess.js/engine-computed) }`. Engine-absent → null
    (empty > invented). Spoken lines come from ONE batched voiceFacts
    call over the bundles (R1), validated per line, deterministic
    fallback per ply. TESTS: legality of every ply; facts board-true;
    graceful null; fallback rendering exists for every fact class.
1.2 `src/services/sequenceChallenge.ts` (pure): judge the student's
    attempted continuation vs the PV — exact SAN match OR eval-equivalent
    (engine probe within ~30cp) counts; returns per-ply verdicts +
    `reachedPlies/totalPlies`. TESTS: exact path, equivalent path,
    fall-off depth, drifted-board rejection.
1.3 Bucket: add `calculation` tag (label "Long tactical sequences") to the
    misconception taxonomy + drill mapping; `logMisconception` metadata
    carries `{reachedPlies, totalPlies, fen, pvSan}`. TESTS: taxonomy,
    aggregation, drill plan resolves.
1.4 UI wiring in `CoachGameReview` (smallest possible diff): after a shot
    resolves (found OR hint) and the PV has ≥4 plies → "Can you see the
    follow-up?" card → sequence mode: student plays THEIR side on the
    board, the defender's PV reply auto-plays; each ply judged (1.2).
    Complete → prosody-spike credit. Fall off → log bucket (1.3) + the
    coach PLAYS THE FULL LINE OUT (paced queue from 0.2) with per-ply
    voice from 1.1 facts. Interaction rules: never stacks with another
    card; any user turn cancels; arrows suppressed while the question is
    open (no answer leaks — same honesty contract as find-the-shot).
    TESTS: component test for card state machine.
1.4b STRETCH (tape-observed, cut freely if scope presses): after the PV
    playback, one "what if he defends differently?" branch — the
    defender's best ALTERNATIVE at the critical ply (engine's #2 defense)
    played out briefly, exactly his "if he doesn't take — that was the
    lesser evil — then I lift my rook" move. Computable; adds the
    both-lines dimension. Not a Phase-1 blocker.
1.5 Repro script (`scripts/audit-review-sequence.mjs`): drives BOTH entry
    points (fresh coach-game review + stored game via /coach/review/:id,
    fixture-loader seeded), asserts: card appears on a flagged moment,
    correct sequence → credit, wrong sequence → bucket row in Dexie +
    playback animates ≥4 plies, zero console/page errors.
1.6 ship-check → main → post-deploy audit battery for /coach/review.

### Phase 2 — model-game injection
🔄 TAPE-CALIBRATED (2026-07-18 second pass): his cameo is RARE (~1 per
video, never more), NAMED ("Bobby Fischer, White, 1971, candidates match
vs Petrosian — one of the most famous games of all time"), enters at the
THEMATIC MOMENT (he fast-forwards non-relevant stretches), makes the
comparison VISUAL and explicit ("look at this beautiful outpost… look at
this pathetic bishop — much like in our game"), and ties back at the end.
2.1 Probe: motif signature of a review position (reuse detectTactics +
    structure facts) vs `model-games.json` (646) `criticalMoments` +
    opening family. Print top-3 matches for 5 test positions; hand-check
    they're genuinely thematic. NO SHIP until the probe convinces.
2.2 `modelGameMatcher.ts` (pure, scored match with a hard floor — below
    floor = NO cameo; empty > tenuous). HARD CAP: ONE cameo per review
    (the best match, if any). TESTS on the probe corpus.
2.3 UI: cameo card NAMES players/year/event (all in model-games.json
    metadata), jumps STRAIGHT to the thematic stretch (never replays from
    move 1), plays it (0.2 queue), and the tie-back line must cite the
    SHARED feature verified on BOTH boards (same outpost square / same
    structure — geometric check, not vibes).
2.4 Repro + ship (same both-entry-points gate).

### Phase 3 — principle distillation
🔄 TAPE-CALIBRATED: he doesn't just STATE the principle — he immediately
DRILLS it ("would Bishop d3 be acceptable according to the application of
our device? … why not? Qxd3 and he's opened the d-file"). The principle
is a tool the student applies on the spot, not a poster on the wall.
3.1 Hand-author one principle line per misconception tag (curated map in
    src/data — G0: tag computed, text curated, never LLM-invented).
3.2 Wire into the why-picker/shot reveals + "Nth time this month" from
    bucket counts. TESTS: every tag has a principle; counts accurate.
3.3 APPLICATION MINI-QUIZ (the "device" pattern): after stating the
    principle, offer 2-3 candidate moves from the SAME position and ask
    which complies — candidates and the verdict computed (engine eval +
    the principle's predicate), the reveal explains the failing
    candidate concretely. One per principle moment, skippable.
3.4 Repro + ship.

### Phase 4 — theory-departure moment
🔄 TAPE-CALIBRATED: he QUIZZES theory ("what's the main move here?")
before telling, and speaks to what's common at the student's LEVEL, not
only master practice.
4.1 Divergence ply via POSITION matching against openings-lichess (+ the
    masters DB counts at the divergence node, + the AMATEUR explorer's
    rating-band popularity — both proxies exist).
4.2 "Book ended here" card: first ASK "what's the main move here?"
    (reuse the guidedFind machinery — board answer, hint, reveal), THEN
    the book-line playback (0.2 queue) with both master and your-level
    stats. Self-hides when the game never left known book or the DB has
    no continuation.
4.3 Repro + ship.

### Phase 5 — theme of the game
🔄 REDESIGNED (2026-07-18 second pass): he NEVER opens with the theme —
zero "this game is about X" openers on tape. The theme EMERGES: it gets
named at the MOMENT the evidence peaks ("transformation of the
advantage", spoken as it happens on the board, reprised after the model
game and at the wrap). Front-loading was both anti-tape and the maximum
blast-radius spot for a wrong theme (R2). New shape:
5.1 `gameThemeClassifier.ts` unchanged mechanics: closed theme set,
    multi-evidence predicates, hard confidence floor, no-theme fallback.
    PLUS: the classifier returns the PEAK-EVIDENCE PLY (where the theme
    became undeniable).
5.2 The theme is NAMED at the peak-evidence moment during the walk
    ("this is the thread of the game — …"), reprised in the
    turning-point reveal and the closing line. The INTRO stays factual
    (today's opening line) — no theme promise up front, so a
    borderline theme can still be dropped mid-review with nothing
    dangling. Repro + ship.

### Standing rules for every phase
- Services + tests land BEFORE any UI wiring (a red service test never
  reaches the component).
- Every new spoken line goes through voiceService (G5 verbosity contract)
  and states only computed facts (G0); questions never contain the answer.
- Every phase's repro drives BOTH review entry points (fresh + stored).
- Adversarial pass per the audit doctrine before calling a phase done:
  mash-tap during playback, cancel mid-sequence, cold-cache stored game,
  game with no flagged moves (cards must self-hide), engine unavailable.

## RISK REGISTER — points of failure + mitigations (David 2026-07-18:
"identify points of failure … tell me your plans on how to mitigate them")

### R1 — Coach narration style/wording (David-flagged, HIGH)
🔄 REDESIGNED (David 2026-07-18: "R1 seems wrong to me. Review the video
transcripts again. He doesn't have too many moves that are silent.
Prebuilt phrases become repetitive." — VERIFIED against the transcripts:
across 3 videos, ZERO near-silent minutes, ~27-30 caption lines/min,
continuous think-aloud. And his variety comes from CONTENT diversity, not
phrasing: one routine stretch covers candidate calculation ("F5
technically wins the piece — wait, let's calculate"), conditional plans
("we might castle queenside IF black hurts himself kingside"), a named
pattern ("the Pillsbury Knight"), assessment, and decision tension
("it's actually really hard to decide"). The earlier silence-default +
stem-rotation phrasebook contradicted both measurements and is DEAD.)

FAILURE MODE (as corrected): two ways to be un-Danya — (a) canned
template phrases going repetitive across reviews (templates around a few
fact classes CANNOT produce his content diversity; they stale in ~10
reviews), and (b) under-narrating (his register is continuous; a mostly
silent playback is not the standard).

MITIGATIONS (redesigned):
- VARIETY BY CONTENT, NOT SYNONYMS — a RICH FACT EXTRACTOR computes many
  DISTINCT fact classes per position: candidate moves + evals (including
  the near-miss the engine also liked — his "it's hard to decide"
  tension is a computable fact: two candidates within ~40cp), plans and
  their preconditions, king-safety state, structure changes, piece
  scope/stability/outposts, threats made and parried, the opponent's
  idea (what their last move enabled), named patterns where real. With
  8-12 fact classes, consecutive plies genuinely have DIFFERENT things
  to say — the same reason Danya never repeats: the content differs.
- PHRASING = voiceFacts, NOT canned templates. The app's own G0
  architecture is the anti-repetition machine: code computes the fact
  bundle per ply; the LLM's only job is to phrase those facts in the
  Danya register (the sanctioned chokepoint — "its ONLY job, on EVERY
  path, is to phrase those facts"). Natural phrasing over varied fact
  bundles doesn't stale like templates. Quality over cost per David's
  2026-07-06 lock ("I don't care about cost, I care about quality").
- ONE CALL PER PLAYBACK, not per ply: batch the whole line's fact
  bundles into a single voiceFacts call returning per-ply lines before
  playback starts (no per-ply LLM latency mid-animation). Validate the
  returned lines against the fact bundles (board-truth gate below);
  any line that fails validation falls back to its deterministic
  rendering for THAT ply only.
- TALK DENSITY MATCHED TO DANYA: every ply with a computed fact speaks
  (with rich extraction that is nearly every ply). The Narration Voice
  Rules' "silence is acceptable" governs FILLER — Danya never fills, he
  always has content; so the rule here is "no fact → no line", not
  "cap the lines".
- BOARD-TRUTH GATE stays: every square/piece/claim in a spoken line is
  verified against the FEN at that ply + the computed facts
  (narrationAccuracy discipline on the dynamic path). A line that names
  anything outside its fact bundle is rejected → deterministic fallback.
- DETERMINISTIC FALLBACK LAYER: a minimal template rendering per fact
  class exists ONLY as the offline/LLM-failure fallback — never the
  primary voice.
- GOLDEN-TRANSCRIPT CHECK adapts: snapshot the FACT BUNDLES (stable,
  deterministic) not the phrasing; plus a repetition audit across a
  10-review corpus (n-gram overlap between reviews) asserting the
  phrasing doesn't converge template-like. All speech still routes
  through voiceService (G5 contract).

### R2 — The theme (David-flagged, HIGH; Phase 5)
FAILURE MODE: a wrong theme ("this game was about d5" on a mutual
blunderfest) poisons the review's credibility; a vapid forced theme reads
fake. BLAST RADIUS REDUCED by the 2026-07-18 second-pass redesign: the
theme is no longer the review's FIRST claim — per tape, it's named at the
peak-evidence moment mid-walk (never promised up front), so a borderline
theme drops silently with nothing dangling.
MITIGATIONS:
- CLOSED THEME SET with computable predicates, each requiring MULTIPLE
  independent evidence points (e.g. "conversion collapse" = student held
  ≥ +2.0 for ≥10 plies then lost; "one-square story" = ≥2 flagged moves
  geometrically tied to the same square via chess.js; "opening disaster" =
  eval ≤ −1.5 by ply 12 attributable to student moves). No LLM choice.
- HARD CONFIDENCE FLOOR: below floor → NO theme; the review opens with
  today's factual intro. Empty > generic > wrong — the house doctrine.
- GEOMETRY-VERIFIED WORDING: the theme line may only name squares/pieces
  the evidence actually touched (checked, not vibed).
- PROBE BEFORE SHIP: run the classifier over the David-games fixture
  corpus; hand-agree ≥80% of assigned themes or Phase 5 DOESN'T SHIP.
  It is deliberately last and severable.

### R3 — PV wrongness / inconsistency (HIGH; Phase 1 core)
FAILURE MODE: review-time PV computed shallow is refutable a ply later —
the coach teaches a "winning line" that isn't; or the live PV's first move
contradicts the STORED bestMove the shot question just used.
MITIGATIONS: seed the PV from the stored bestMove (consistency by
construction); depth floor (≥14) + node budget; VERIFY THE LINE DELIVERS —
terminal eval of the PV must hold ≥ the initial advantage (soundness-sweep
doctrine per line), else truncate to the last verified ply or skip the
sequence question entirely. A line we can't verify is a line we don't ask.

### R4 — Sequence-judging false negatives (HIGH; the trust-killer)
FAILURE MODE: student plays an eval-EQUIVALENT move (or a transposition)
that isn't the literal PV move; naive SAN-matching marks them WRONG. One
"I was right and it said I wasn't" destroys trust in the whole feature —
and mis-tags the calculation bucket with false data.
MITIGATIONS: per-ply equivalence probe (engine eval of their move within
~30cp of the PV move → CREDIT, and the line re-seeds from their move);
transposition check (same resulting FEN after 2 plies → credit); when the
equivalence probe can't run (engine busy/timeout) → ACCEPT generously and
log for audit — never punish on missing data. The `calculation-depth`
bucket is tagged ONLY on eval-verified fall-off, never on ambiguity.

### R5 — Engine contention on device (MED-HIGH)
FAILURE MODE: review already runs whole-game analysis, engine lines, and
the exploration reply engine; adding PV compute + equivalence probes on
a phone's WASM Stockfish → stalls, "the coach froze".
MITIGATIONS: all new engine work goes through stockfishEngine's existing
priority queue at prefetch priority (never cancels user-facing analysis);
PV precomputed 1-2 plies BEFORE the card shows (prefetch during the walk);
hard time budget per call with graceful degradation — no PV in budget →
no sequence question this moment (plain reveal, as today). The walk UI is
never blocked on the engine.

### R6 — Card state-machine collisions (MED-HIGH)
FAILURE MODE: the review already juggles faucet/shot/rewind/turning-point/
reading-quiz cards as independent useStates; adding sequence + model-game
+ theory cards multiplies overlap bugs (two cards open, walk advancing mid
playback, playback running after navigation) — the class the 2026-06-12
adversarial audit exists for.
MITIGATIONS: REFACTOR FIRST — one `activeCard` discriminated-union owner
with an explicit priority order replaces the scattered booleans BEFORE any
new card lands (small, mechanical, test-covered). Playback holds a
cancellation token — any user turn/nav kills it. The per-phase adversarial
pass (mash-tap, cancel mid-sequence, out-of-order) is the enforcement.

### R7 — Model-game mismatch (MED; Phase 2)
FAILURE MODE: a tenuous GM cameo ("this is just like Fischer" when it
isn't) reads fake-deep — worse than no cameo.
MITIGATIONS: hard match floor on the motif signature; the cameo must cite
CONCRETE shared features verified on both boards (same outpost square /
same structure), else self-hide; probe corpus hand-checked before ship;
default is NO cameo.

### R8 — Theory-departure false confidence (MED; Phase 4)
FAILURE MODE: move-prefix matching against openings-lichess mislabels
transpositions — "book ended at move 6" when the position re-enters book
a move later.
MITIGATIONS: match by POSITION (FEN-set derived from DB lines), not move
order; claim departure only when the position leaves the known-FEN set
for good; show the masters-DB game count as the evidence; ambiguous →
self-hide.

### R9 — Stored-game data gaps (MED; the "previous games" promise)
FAILURE MODE: imported/old games lack bestMove on unflagged plies, may
carry stale pawn-unit evals, missing openingName — features silently
degrade exactly where David asked for parity.
MITIGATIONS: per-phase BOTH-ENTRY-POINTS acceptance gate (fresh + stored
via /coach/review/:gameId) with the David-games fixture as corpus;
`gameNeedsAnalysis` already flags stale records for re-analysis; every
card self-hides cleanly when its data precondition is absent (no broken
half-cards).

### R10 — Scope/latency of the build itself (MED)
FAILURE MODE: big-bang landing where phase 3's bug blocks phase 1's value.
MITIGATION: already structural — one phase = one main landing, severable;
Phase 5 explicitly droppable (R2); order is value-ranked so a stop after
any phase still shipped the most important remaining thing.

## FUNCTION-LEVEL DESIGN + DATA AUDIT (David 2026-07-18: "plan how
specifically each function will be coded and wired… Do we already capture
all the required data? Do we need to add anything?" — every claim below
was VERIFIED against the code/data this session, not assumed.)

### Verified foundations (exist today, no changes needed)
- **Full PV**: `stockfishEngine.analyzePosition()` already returns
  `topLines: AnalysisLine[]` with `moves: string[]` (the UCI `pv` line,
  MultiPV-parsed) + eval + mate. Phase 1 needs ZERO engine changes.
- **voiceFacts chokepoint**: `voiceFacts(facts, opts)` exists with the
  `mustPreserve` fidelity net (SAN tokens verified verbatim or the
  computed prose is served), `warm` voicing, and — already — a dedicated
  `'review'` register via `resolveWarmRegister()` ("the post-game
  tape-review register"). R1's phrasing layer is this, unchanged.
- **Per-ply data**: live coach games store `evaluation / preMoveEval /
  bestMove / classification` per `CoachGameMove`; stored/imported games
  get the same via `analyzeSingleGame` (bestMove on flagged plies).
- **Misconception pipeline**: closed 17-tag taxonomy in
  `src/data/misconceptionTags.ts` (each tag carries label + drill
  mapping), `logMisconception` + `getMisconceptionProfile` aggregation +
  `mapTagToDrills`. Additive tag = one array entry.
- **Model-game pool**: 646 entries with `white/black/whiteElo/blackElo/
  year/event/openingId/middlegameTheme/lessonSummary`; 92 carry
  `criticalMoments[{moveNumber,color,fen,annotation,concept}]`.
- **Masters DB is POSITION-KEYED**: `public/data/openings-masters-db.json`
  = 131,895 positions keyed by truncated FEN (no move counters) → SAN
  frequency lists. Phase 4's position-based book matching is direct —
  no precompute, just truncate the FEN the same way.
- **Explorer games at ANY level** (David 2026-07-18: "not always GM…
  he searches the db for any game that fits the structure; GM preferred,
  else 2100-2300"): the proxy passes ALL query params through — VERIFIED
  live: `source=masters` → 15 named topGames (Carlsen–Caruana w/ year +
  game id); `source=lichess&ratings=2200,2500&topGames=4` → real 2700+
  lichess games per position. Full PGNs via the existing
  `api/lichess-game-export` proxy. Add `speeds=blitz,rapid,classical`
  to filter out ultraBullet junk. NO proxy changes needed.

### The gaps — what we do NOT have (David: "I want to know first")
1. **A structural-motif extractor (the one genuinely NEW fact-computer).**
   We compute tactics (`detectTactics`), phase/material
   (`gamePhaseService`), move geometry (`describeMoveGeometry`) — but
   NOTHING computes board STRUCTURE: pawn islands/chains, open/half-open
   files, outpost squares (protected, unassailable by pawns), passed
   pawns, castling wings + pawn-storm state, color complexes, endgame
   type. This is load-bearing for Phase 2 matching ("fits the structure
   on the board"), Phase 5 themes, and R1's rich fact bundles. NEW
   `src/services/boardStructure.ts` — pure chess.js, fully computable,
   unit-testable. Biggest single new component; write + test FIRST in
   Phase 0/1 since three phases lean on it.
2. **voiceFactsBatch wrapper (small).** `voiceFacts` phrases ONE facts
   string → one string. Playback needs N per-ply lines from one call: a
   thin wrapper formats N bundles into one numbered prompt, splits the
   result, validates each line against ITS bundle (mustPreserve per
   line), falls back per-ply on any miss. Rides the existing chokepoint —
   no new G0 surface.
3. **`calculation` misconception tag (planned, additive).** Not in the
   17; add id `calculation-depth`, label "Long tactical sequences",
   drill mapping → lichess puzzle themes `long`/`veryLong` (+ crushing),
   metadata `{reachedPlies,totalPlies,fen,pvSan}` on the log entry.
4. **Model-game FEN index (tiny, build-time).** To match "same structure"
   fast at review time, precompute a signature per model-game
   criticalMoment (from boardStructure) into a small generated JSON —
   or compute lazily per review (92 entries × cheap chess.js — fine).
   Decision: lazy first, index only if slow.
5. **Nothing new needs CAPTURING at game time.** All five phases run on
   data we already store (evals/classifications/FENs/PGN) + review-time
   computation (PV, structure) + existing DBs/proxies. No schema
   changes, no new telemetry, no migration.

### Wiring map (function → caller)
- `boardStructure.describeStructure(fen)` → used by pvPlayback facts,
  modelGameMatcher, gameThemeClassifier, and (bonus) available to the
  coach's grounded Q&A later.
- `pvPlayback.computePvLine(fen, firstUci?, maxPlies)` → engine
  `analyzePosition` (prefetch priority) → per-ply facts via chess.js +
  detectTactics + boardStructure → spoken lines via `voiceFactsBatch`
  (register 'review', mustPreserve = SANs/squares per line) →
  `CoachGameReview` playback queue.
- `sequenceChallenge.judgeAttempt(pv, attempt, engineProbe)` →
  called from the walk board's onMove during sequence mode; fall-off →
  `logMisconception({tag:'calculation-depth', …})`.
- `modelGameMatcher.findCameo(fen, openingId)` → boardStructure
  signature vs (1) model-games criticalMoments, (2) masters explorer
  topGames at the position family, (3) amateur explorer
  `ratings=2000,2200&topGames=4&speeds=blitz,rapid,classical` — GM
  preferred, high-amateur fallback (David's rule) → full PGN via
  game-export proxy → playback queue + tie-back line citing the shared
  structural feature verified on both boards.
- `principles.ts` (curated map tag→principle) → why-picker/shot reveals;
  application quiz candidates from engine top moves + the principle's
  predicate.
- `theoryDeparture.findDeparture(fens[])` → masters-DB position lookup
  per ply (truncated-FEN match) → first ply whose position is absent →
  card (guidedFind ask → book playback via explorer continuation).
- `gameThemeClassifier.classify(segments)` → eval trace + citations +
  boardStructure at key plies → {theme, peakPly} | null.

## Status: PLAN LOCKED (David 2026-07-18: "Plan only. Lock it in. Will
build once usage resets."). No build started. Phase 0 begins on go-signal.
