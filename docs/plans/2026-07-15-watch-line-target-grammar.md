# 🔒 WATCH-LINE TARGET GRAMMAR — mirror the Naroditsky board language (David 2026-07-15, emphatic: "God damn this is GOLD!!! I want the opening watch lines to mirror this as close as possible!!!")

David watched Naroditsky teach on stream and locked the FORM for all opening
Watch lines. Three reference frames (speedrun vs FrankfurtAirport, 2026-07-15
screenshots):

1. **"attacking b7"** — the attacker (Qf3) highlighted BLUE, a single long
   arrow drawn f3→b7 down the full diagonal (the attack RAY), and the TARGET
   pawn on b7 highlighted RED. A second red square marks the OTHER hanging
   piece the same idea hits.
2. **"you can play h4 and really smash Black's very weak pawns"** — the PLAN
   move drawn as an arrow up the file (h2→h4), the weak target pawns (g5, h6)
   highlighted RED, the supporting piece (Bg3) BLUE.
3. **"White is already better — it's because of e5"** — the strong-point pawn
   (e5) highlighted BLUE, and the two pieces it strangles (the bad c8-bishop,
   the backward e7-pawn) highlighted RED.

## The grammar (extends the locked lead-the-eye colour language)

Existing registers stay: ORANGE = the move's two squares (auto), GREEN =
vision arrows, YELLOW = key squares the narration names, BLUE = context.
**NEW register: RED = the TARGET/VICTIM** — the square/piece being attacked,
won, restricted, or named as weak.

**The rule: every narration claim of attack / threat / weakness / "better
because of X" is PAINTED, not just spoken:**
- "X attacks/hits/eyes Y" → arrow from X's square to Y's square (the full ray,
  attacker BLUE or the arrow itself) + Y highlighted RED.
- "the weak pawns on g5/h6" / "smash at the weak pawns" → each named weak
  square RED (+ the plan-move arrow that exploits them).
- "better because of the e5 pawn / the outpost / the bad bishop" → the
  strong-point BLUE, the piece(s) it dominates RED.
- The eye must land on the exact squares as the words are spoken (the existing
  sentence-grained reveal via narrationSegments applies unchanged).

## Implementation status
- **Renderer: ALREADY SUPPORTED.** `AnnotationArrow.color` / 
  `AnnotationHighlight.color` are free strings — red renders today with zero
  code changes. This is an AUTHORING standard, not an engine change.
- **Board-truth gates apply as-is**: every arrow originates on a real piece
  with a clear sight-line (lessonIntegrity); every claim true on the board
  (narrationAccuracy). A red highlight on a square the narration doesn't name,
  or a "target" that isn't actually attacked, is a defect.
- **Rollout**: (1) NEW lessons/beats author to this grammar from now on
  (masterclass + pro-rep + anti-openings); (2) sweep EXISTING Watch lessons'
  attack/threat/weakness sentences to add the missing ray+red-target paint —
  incremental, per-opening passes (don't rip up working content in one sweep);
  (3) extend `lessonIntegrity` with a heuristic gate: a beat whose `say`
  matches /attack|threaten|weak|hangs|hitting|target/ must carry ≥1 arrow or
  non-orange highlight (audit-first, then hard-fail once the backlog clears).

## 🔒🔒 THE VIDEO-GROUNDED WATCH — full teaching arc, not just move-beats (David 2026-07-15, emphatic: "Really use these videos to get an amazing opening walkthrough for my users please!! It kinda goes against how we make the WATCH portion currently, but I really want the full explanation in there. He gives us gems even!!")

This EXTENDS the Watch authoring standard (supplements G9.2 STEP 7 — David
explicitly acknowledged it "goes against how we make the WATCH currently"):

- **The Watch mirrors the VIDEO's teaching arc, not just the move list.** Per
  opening: pull his video transcript (yt-dlp pipeline, reference-only), and
  author the Watch to follow HIS teaching flow — the line move-by-move PLUS the
  full explanation he gives at each step: the why, the plan behind the setup,
  the "if Black castles, then d5" conditional branches, the named games he
  cites, the punishment of the natural-but-wrong reply.
- **The GEMS he drops mid-teaching are first-class content.** When the video
  shows a tactical nugget (the queen trap, the b7 crush, the h4 smash at weak
  pawns), it becomes EITHER an illustrative beat inside the Watch (a short
  what-if excursion painted with the target grammar, returning to the main
  line) OR a punish-gem in the weapons section — hand-curated per the
  traps-by-hand doctrine, engine-verified, both registers narrated.
- **Illustrative what-if excursions are sanctioned inside Watch lessons.** The
  beat plays the natural-looking wrong move, paints the refutation
  (ray + red target), speaks the why, then returns to the spine. Every
  excursion move chess.js-legal + engine-verified (G3 — his video shows the
  idea; the engine proves it).
- **Full explanation depth beats brevity.** Watch beats on these builds run as
  long as the teaching needs (the 60-120w guideline yields to the video's
  actual teaching density). sayShort/Learn cue rules unchanged.
- **All original prose** (plagiarism guard: his ideas, never his sentences),
  all board-verified (narrationAccuracy), all painted (target grammar above).
- **🔒 USE THE ENGINE FREELY WHEN BUILDING (David 2026-07-15: "Naroditsky uses
  the engine in his post game reviews. Don't be afraid to use it when building
  the walkthrough and the opening lines.").** Stockfish is a first-class
  BUILD instrument for these walkthroughs — verify every taught line, eval the
  what-if excursions, find the refutation the video gestures at, extend a line
  the video leaves hanging. The engine PROVES; the video TEACHES; the LLM only
  phrases (G3/G0 unchanged — the engine is the sanctioned verification tool,
  not a banned bot).
- **🔒 THE WALKTHROUGH STRUCTURE (David 2026-07-15):** the build covers ALL the
  lines he points out in the video. The MAIN LINE he recommends = the primary
  Watch/Learn lesson (the Learn tab's line); every other line he shows becomes
  a VARIATION tab or SUBLINE beneath it, each with its own beats. Nothing he
  teaches in the video gets dropped — if he shows it, we teach it (engine-
  verified, original prose).

Related: `docs/plans/2026-07-15-naroditsky-openings-and-coach-recommender.md`
(new openings must author to THIS grammar from day one) and
`docs/plans/naroditsky-video-grounding.md` (the transcript pipeline + per-video
map — this doctrine is that pipeline's Watch-side output standard).

## BUILDOUT SCOREBOARD (updated 2026-07-15 ~05:35 UTC — the video-grounded loop)

Shipped to main/prod (each: corpus tree + video mining + engine verification on
every line + red-target grammar + gates green):
1. ✅ `anti-pirc-battery` — 150 Battery & d5 Squeeze (new entry + 8-beat lesson,
   3 variations + Ng4 gem). counter-rep: pirc/modern two-rec families.
2. ✅ `belgrade-gambit` — new entry + 8-beat lesson, 4 variations (…Ne5 refuted
   +3.68 gem; h6→Bf4 engine-settled). counter-rep: open-e5 two-rec.
3. ✅ anti-scandinavian: Modern 2…Nf6 variation (+0.46; prior sound build kept).
4. ✅ `anti-french-tarrasch` — his lifetime line (2,361g corpus) + 6-beat lesson.
   counter-rep french: Tarrasch + KIA.
5. ✅ anti-smith-morra-black: …Nf6 decline variation (650g @ 72.5%).
6. ✅ anti-london-black: …c5+…Qb6 poison variation (555g @ 68.4%).
7. 🚚 `anti-philidor` — Bc4 System + Legal's-mate trap (verified checkmate) +
   center-fork-trick defusal; FIXES the counter-rep bug where "philidor"
   recommended the Ruy. (pushing)

G1: post-deploy-audit.yml fired on GH runners vs prod @ 0bb52fa (run
29391505031) — this container's Chromium can't reach prod (proxy resets);
runners can.

## REMAINING QUEUE (task #8) — same per-opening cadence
Check-existing-first (the Scandi lesson taught us), then increment:
- Tier 2: Vienna (pro-gothamchess-vienna exists — ground/increment), Four
  Knights/Glek (8 vids, net-new candidate), Accelerated Dragon/Maróczy (both
  sides), QGD (black), Hippo (anti), Grand Prix (anti-grand-prix-black exists),
  English, Grünfeld (anti-grunfeld-exchange exists), King's Gambit
  (anti-kings-gambit-black DONE by prior video-grounding), Italian, Owen (anti),
  Nimzo-Larsen. Trees to extract per target; transcripts re-pullable via yt-dlp.
- Task #6: red-target sweep of pre-2026-07-15 lessons (incremental, per-opening).
- Coach theme note: the d5 space-punch is HIS signature across Pirc/Belgrade/
  Scandi — candidate for a cross-opening concept the coach cites.
