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

Related: `docs/plans/2026-07-15-naroditsky-openings-and-coach-recommender.md`
(new openings must author to THIS grammar from day one) and
`docs/plans/naroditsky-video-grounding.md` (the transcript pipeline + per-video
map — this doctrine is that pipeline's Watch-side output standard).
