# Adaptive post-game review — the per-level spec (concepts + questions)

**Why this doc:** shallow "beginners get easy, advanced get hard" is not a spec.
This maps, for each of the app's four skill bands, EXACTLY which concepts the coach
is allowed to name, in what register, and EXACTLY which questions it asks — every
element tied to a G0 source so it's buildable (the LLM voices a computed fact; it
never invents chess). Grounded in the Naroditsky teaching register (he tiers
explicitly: core idea for all, then "for the advanced players…").

## The four bands (from `strengthCalibrationService.SKILL_BANDS`)

| Band | Baseline | Self-description | Interrupt gate (`slipDetector`) |
|---|---|---|---|
| **newcomer** | 600 | "Still learning how the pieces move" | blunders only (cpLoss ≥ 200) — and gently |
| **beginner** | 900 | "I know the rules, play casually" | blunders only |
| **intermediate** | 1300 | "I know openings and basic tactics" | mistakes + blunders (≥ 100) |
| **advanced** | 1800 | "I play rated games, study seriously" | inaccuracies + up (≥ 50) |

`level = bandFor(playerRating)` — a pure function off the profile rating the review
already has. Everything below keys off `level`.

## 🔒 TWO DIALS, NOT ONE (David 2026-07-19: "I'm intermediate but I want deeper concepts too!!")

Concept DEPTH and question DIFFICULTY are **separate dials** — the 4-way button is how
the user controls the first without touching the second:

- **Concept depth (narration)** = the USER'S CHOICE via the toggle. An intermediate
  player who wants prophylaxis, move-order nuance, and the counter-rule sets it to Pro and
  gets them — appetite for teaching is not capped by rating.
- **Question difficulty (what we ask them to FIND)** = their ACTUAL demonstrated skill
  (the adaptive level from decision 1). This keeps questions ANSWERABLE — cranking the
  voice to Pro must NOT start asking an intermediate to find a 5-move quiet combination.

So the toggle deepens the *lesson*, not the *test*. Default (`auto`) ties concept depth to
the adaptive level; the moment the user picks a band, that pick drives narration depth
while questions stay pinned to demonstrated skill.

## 🔒 QUESTION DIFFICULTY = A PER-CONCEPT ADAPTIVE TEST (David 2026-07-19)

The "difficulty" dial is NOT one number for the player — it's a **per-concept adaptive
test** (computerized-adaptive-testing style). "Answerable, but some harder than we think
they can answer" — we deliberately probe ABOVE the estimate to find the real ceiling and
keep it a genuine test, then let the outcome move it:

- **A per-concept ability estimate**, stored on the profile (Dexie), one per concept
  DIMENSION — e.g. `calculation-depth`, `piece-safety`, `threat-awareness`,
  `pawn-structure`, `king-safety`, `endgame-technique`, `opening-principles`,
  `eval-judgment`. Each is a small rating (seeded from the player's game rating, then it
  diverges as evidence comes in).
- **Difficulty selection = estimate + a probe delta** (aim a notch ABOVE current ability,
  so the question is a real stretch — the "desirable difficulty" of learning science),
  clamped so it's reachable, never impossible.
- **Update from the outcome, per concept:** correct → raise THAT concept's estimate (and
  next question on it steps up — for a wizard the estimates climb until the questions are
  genuinely hard); wrong (or needed the full hint) → lower it / dial back on that concept
  and re-ask an easier version of the same idea. Only the concept that was tested moves —
  a blown endgame question doesn't touch their tactics estimate.
- **Result:** a live per-concept skill map. Wizard-at-tactics + shaky-positionally is
  represented honestly, and each concept converges on its own true ceiling.
- **This IS the demonstrated-skill signal** for decision 1 (the adaptive level) AND the
  targeting signal for decision 3 (a low, high-miss concept = a weakness to drill more).
- **Difficulty axes are computable per concept:** calculation → combo depth (1→2→3→4+
  ply from `computePvLine`); eval-judgment → the tolerance band (better/equal/worse →
  ±1.0 → ±0.5); piece-safety → obvious hang → deeper/defended-looking hang; threat →
  1-move threat → a quiet setup; etc. So "harder" is a concrete, gradable knob, not a vibe.
- **G0:** the CONTENT of every question is still computed (the fork/eval/line is real);
  the adaptive test only picks WHICH difficulty rung of a real, computed question to pose.

## The core principle

The **fact is computed once; the level chooses the register + the question.** A
hanging knight, a fork, a weak pawn, an eval — computed once via
`detectTactics` / `boardStructure` / Stockfish. `level` decides:
1. **whether** it's spoken at all (concept allowlist),
2. **how** it's phrased (vocabulary register),
3. **whether/how** it becomes a question (question family + difficulty).

So we never say "outpost" to a newcomer, never say "your knight is safe now" to an
advanced player, and never ask a newcomer to find a 4-move combination.

---

## 1. CONCEPT ALLOWLIST — what the coach may name, per band

A concept is spoken only if it's in the band's column **and** the detector found it.
Higher bands inherit lower-band concepts but phrase them tighter (or skip the
obvious ones). ✅ = in scope · — = out of scope (too advanced / too basic).

| Concept (all G0-detected) | newcomer | beginner | intermediate | advanced |
|---|---|---|---|---|
| A piece is hanging / can be taken free (`detectTactics.hangingPieces`) | ✅ centerpiece | ✅ | ✅ (terser) | — (too obvious; only if part of a combo) |
| A piece is directly attacked (chess.js attackers) | ✅ | ✅ | — | — |
| Material count in a trade (piece values) | ✅ | ✅ | — | — |
| Named 1-move tactic: fork / pin / skewer / check (`detectTactics`) | — | ✅ named | ✅ | ✅ (only if non-obvious) |
| Develop your pieces / castle (development state) | — | ✅ | ✅ (terser) | — |
| Control the centre (central pawns/pieces) | — | ✅ | ✅ | — |
| Weak pawns: isolated / doubled / backward (`boardStructure`) | — | — | ✅ | ✅ |
| Open / half-open files (`boardStructure`) | — | — | ✅ | ✅ |
| Outpost / hole ("no pawn can challenge it") | — | — | ✅ | ✅ |
| Both sides' plans from pawn majorities (`reviewStrategicOrientation`) | — | — | ✅ | ✅ |
| Pawn breaks (the move that challenges the chain) | — | — | ✅ | ✅ |
| The two bishops / bishop-vs-knight imbalance | — | — | ✅ (light) | ✅ |
| Prophylaxis (stop their idea before your own) | — | — | — | ✅ |
| Move-order subtlety ("force the queen back FIRST, then e6") | — | — | — | ✅ |
| The counter-rule ("push the majority, but not f5 — it concedes e5") | — | — | — | ✅ |
| Space vs material / initiative as an imbalance | — | — | light | ✅ |
| Named endgame technique (Lucena/Philidor/opposition/zugzwang) | — | — | the pattern name only | ✅ + the method |
| Named mate pattern (back-rank / smothered — `reviewMoveTeaching`) | ✅ (name it) | ✅ | ✅ | ✅ |

**🔒 GROUNDED CERTAINTY — we do NOT emulate his hedging (David 2026-07-19).** Danya
says "I'm not guaranteeing I'm right, we'll check after the game / I'll run it on the
computer so I don't lie to you." He hedges because he's a HUMAN calculating at the
board. **We ARE the computer, and Stockfish already ran in the background — so we
KNOW we're right.** This is our leg up on him: never hedge, never "as far as I know",
never "let me check". State the engine-verified fact FLAT and with confidence ("This
is winning." / "The eval is +2.4." / "…e5 forks — that drops the piece."). The
honesty is that every claim is G0-grounded (we only speak what was computed), not
that we perform doubt. The §6 "calibrated honesty markers" row from the transcript
is therefore INVERTED for us: replace hedging with grounded certainty. (The one place
we still soften: a genuinely double-edged practical choice where the engine's best and
the human-practical differ — there we say BOTH honestly, e.g. "objectively X; at human
speed Y is the practical try" — that's not hedging, that's teaching both truths.)

**Register per band (same fact, different words):**
- **newcomer:** spelled-out moves, no SAN, no jargon. "Your knight on f3 can be taken for free — nothing is guarding it."
- **beginner:** named tactics + one-line principles. "That drops the knight to a fork — develop and castle first."
- **intermediate:** structural + plan language, short "if…then" lines. "The c6-pawn is backward on a half-open file — a lasting target; your plan is the queenside majority."
- **advanced:** full GM register, imbalances, prophylaxis, meta-cognition, the counter-rule, the practical-vs-objective distinction. "Objectively the majority push is best, but at human speed …g5 first is the practical try; just don't commit the c-pawn or d5 falls into their lap."

---

## 2. QUESTION FAMILY — what the coach asks, per band

Every question: the probe carries ZERO board facts (honesty contract), the student
commits (pick / play / type / hint), THEN the grounded reveal grades it. The
DIFFERENCE per band is the question TYPE, the ANSWER required, and the REVEAL depth.

| Question type | newcomer | beginner | intermediate | advanced | G0 source |
|---|---|---|---|---|---|
| **Spot-the-hanging-piece** — "Which of your pieces can they take for free?" (tap it) | ✅ primary | ✅ | — | — | `detectTactics.hangingPieces` |
| **Yes/no safety** — "Is your queen safe here?" | ✅ | — | — | — | attackers + escape squares |
| **Explain-the-why** (why was that a slip?) — reason picker | simple (2 chips) | ✅ (3–4 chips) | ✅ (full chips) | ✅ + deeper reveal | classification + `buildSlipReveal` |
| **Find-the-move** (single tactic) — play it on the board | — | ✅ 1-move | ✅ | ✅ | `computePvLine` first move |
| **Type-not-move** — "What kind of move wins — a capture or a check?" | — | ✅ 2 options | ✅ 3–4 options | ✅ (incl. quiet/desperado) | `detectTactics` type of best move |
| **Find-the-sequence** — the combo + follow-up (spot-the-sequence) | — | — | ✅ 2–3 ply | ✅ 3–5 ply | `computePvLine` |
| **Choice-between-two** — "Which recapture/break is better?" | — | — | ✅ | ✅ (subtle) | Stockfish evals of 2 candidates |
| **Guess-the-eval** — better / equal / worse (coarse) → numeric (precise) | — | — | ✅ 3-band | ✅ numeric ±0.5 | Stockfish eval |
| **Move-order** — "Does the order matter here?" | — | — | — | ✅ | engine eval of the two orders |
| **Trap / most-popular-wrong** — "The tempting move is X — why is it wrong?" | — | — | light | ✅ | popular move (explorer) + engine refutation |
| **Prophylaxis** — "What's their threat — stop it first" | — | — | — | ✅ | opponent's best reply threat (`detectTactics` after their move) |
| **Hint ladder** on stall | 1 rung (point at the piece) | 2 rungs (piece → area) | 3 rungs (piece → area → square) | reveal only on ask | properties of the best move revealed in stages |

**Interrupt frequency** rides the existing `slipDetector` gate (table at top), so a
newcomer is stopped only on real blunders and an advanced player on inaccuracies.

**Grading register per band:** newcomer/beginner → warm, concrete, never harsh
("Right — the knight was hanging"). intermediate → precise ("Right; that also
opened the file"). advanced → the reasoned burial + the deeper point ("Plausible,
but it walks into …Ng4 and now f2 is the real target").

---

## 3. WORKED EXAMPLE — one position, four reviews

Position: student (White) just played a move that dropped a knight to a fork; the
engine's move was a quiet defensive one; eval swung from +0.3 to −2.5. Same computed
facts (`hangingPieces: Nf3`, `tactic: fork on e5`, `bestMove: Re1`, `cpLoss: 280`).

- **newcomer** — *voice:* "Careful — your knight on f3 can be taken for free now."
  *question (blunder gate fires):* "Which of your pieces can the opponent grab?" →
  tap f3-knight → "Right — nothing was guarding it." No fork jargon, no best move.
- **beginner** — *voice:* "That drops the knight — the pawn forks your knight and
  bishop." *question:* "Why was that a mistake?" chips: [it hung a piece] [I walked
  into a fork] [I missed a threat] → reveal names the fork + "castle and develop
  before pushing."
- **intermediate** — *voice:* "That runs into …e5, forking f3 and c4 — you had Re1
  first, keeping the tension." *question:* "You had a cleaner move here — find it"
  (play on board) → hint ladder → reveal restates the logic (why Re1 holds).
- **advanced** — *voice:* "…e5 is the fork, but the deeper cost is the c4-bishop's
  diagonal — Re1 keeps it and pre-empts …e5 entirely; objectively forced, practically
  obvious once you see the pin." *question:* "The tempting move dropped a piece —
  what should you have calculated first?" → prophylaxis / find-the-line, numeric
  eval reveal.

---

## 4. OPPONENT COMMENTARY depth, per band (ties to task #17)

Same "read the opponent" instinct Danya uses on every move, tiered:

| Band | What the coach says about the opponent's move | G0 source |
|---|---|---|
| newcomer | only a DIRECT threat to a piece: "their bishop now attacks your knight." | chess.js attackers on student pieces |
| beginner | a named 1-move threat: "they threaten a fork on b6." | `detectTactics` after opp move |
| intermediate | the opponent's PLAN + target: "they're eyeing your backward c6-pawn / preparing the f5 break." | `boardStructure` student weaknesses + majority |
| advanced | the opponent's real idea incl. prophylaxis: "the capture isn't the point — it's the follow-up …Ng4 hitting f2; you had to stop it first." | opp best-line threat via `computePvLine` |

---

## 5. IMPLEMENTATION SKETCH (how `level` threads through)

1. `reviewLevel.ts` — `type ReviewLevel = 'newcomer'|'beginner'|'intermediate'|'advanced'`;
   `bandFor(rating): ReviewLevel` (reuse `SKILL_BANDS` thresholds).
2. Every narration builder (`reviewMoveTeaching`, `reviewStrategicOrientation`,
   `buildSlipReveal`, the conversion/mate namers) takes `level` and (a) gates on the
   concept allowlist, (b) picks the register. Default `intermediate` when unknown
   (today's behaviour) so nothing regresses.
3. A `phraseByLevel(fact, level)` helper table per concept — the SAME computed fact,
   four phrasings. This is where the register lives; the fact never changes.
4. Question layer: a `questionForSlip(level, slipFacts)` that returns which card to
   raise (spot-the-hanging-piece / explain-why / find-move / type-not-move / choice /
   eval / trap / prophylaxis) + its difficulty, keyed by the table in §2. The blocking
   gate stays `slipDetector`.
5. Opponent commentary: `buildOpponentMoveTeaching(fenBefore, san, level, studentColor)`
   per §4, wired into `buildReviewSegments` for opponent moves (currently silent).
6. Tests: a per-level snapshot of the worked example (§3) — assert newcomer never
   emits SAN/jargon, advanced emits the counter-rule, the question type matches the
   band. Plus the existing content gates.

## DECISIONS (David 2026-07-19)

**1. Level is ADAPTIVE, not a fixed rating band.** No hard-and-fast "your rating = your
level" rule. Start from the profile rating, then ADJUST from live performance signals:
if the player is clearly advancing (recent-game accuracy implies a higher level than
their set band) or under-handicapped (mis-calibrated low), bump the effective level up;
if they're struggling below their band (hanging pieces often, low accuracy, missing the
questions), ease it down. The level tracks the PLAYER, not a static number.
- **Signal sources (all already in the app):** recent-game accuracy vs band
  (`accuracyService` over stored `games`), the weakness report severity
  (`weaknessSpine`/`misconceptionService`), puzzle-rating vs game-rating divergence, and
  live question outcomes in the review (got it / needed a hint / missed).
- **`effectiveLevel = adjust(bandFor(rating), performanceSignal)`** — clamped to ±1 band
  from the rating so a hot streak can't rocket a 900 to "pro". Manual toggle overrides.

**2. A 4-WAY MANUAL TOGGLE — the user decides how much they hear.** Upper-corner control
on the review surface: **Beginner · Intermediate · Advanced · Pro.** Overrides the
auto-detected level (an advanced player can force "spell out the basics"; an improver can
force "talk to me like a pro"). Internal mapping: newcomer+beginner→**Beginner**,
intermediate→**Intermediate**, advanced→**Advanced**, plus a new top tier **Pro** (the
"advanced viewers" register — deepest calculation, move-order nuance, prophylaxis, the
counter-rule, minimal hand-holding). Persist the choice in the profile
(`reviewNarrationLevel: 'auto'|'beginner'|'intermediate'|'advanced'|'pro'`, default
`auto`). Standing-order checklist: new UI surface → loading/empty/error states; new
profile flag → Dexie version bump + retroactive default `auto`; new setting → PostHog
event `review_level_changed {from,to,wasAuto}`.

**3. QUESTIONS FOR EVERYONE — targeted at what they're WEAK at (needs more refinement).**
Questions are how people learn, so every band gets them (even newcomers) — the rule is
"give them questions they CAN answer." Two dials:
- **Difficulty** — calibrated to the level so the question sits in reach (newcomer:
  recognise a hanging piece; pro: find the 4-move quiet combination). Zone-of-proximal-
  development: never trivial, never impossible.
- **Topic targeting** — use the player's OWN game data + weakness report to pick WHICH
  question to ask at a flagged moment. If their weakness bucket says "hangs pieces" →
  spot-the-hanging-piece; "misses forks" → find-the-fork / type-not-move; "bad pawn
  structure" → a structural choice question; "weak endgames" → a conversion question. The
  review's flagged moments become PERSONALISED drills on their real weaknesses.
  - **G0 wiring:** `misconceptionService` / `weaknessSpine` already bucket the player's
    recurring mistakes (fed by exactly this review's slip capture — the loop closes on
    itself). `questionForSlip(level, slipFacts, weaknessProfile)` picks the card type by
    (a) what the position affords (`detectTactics`/`boardStructure`), (b) the level's
    difficulty ceiling, (c) the player's top open weakness — preferring a card that
    trains a weakness the position happens to expose.
  - **🚧 STILL TO REFINE WITH DAVID:** the exact weakness→question-type map; how hard to
    bias toward weaknesses vs teaching what the position most wants; whether a wrong
    answer re-asks an easier version (hint ladder) or just reveals; how the "answerable"
    floor is computed per level; and whether question cadence itself adapts (more when
    they're learning a weak area, fewer when solid).

**4. TEACH the advanced players — but never "always" (David 2026-07-19).** No forced
second layer on every move (that's the generic filler we ban — "always" is out). BUT
advanced/pro players must keep LEARNING, not just be told they played well: whenever a
genuine deeper point IS computed (a real subtlety — prophylaxis, a move-order nuance, the
counter-rule, a hidden imbalance), SURFACE it for them; never withhold the lesson. The
rule is: teach when there's something real to teach, and at the top bands lean toward
surfacing the deeper computed point rather than staying quiet — but if nothing deeper is
computed, stay quiet (empty > generic > invented). So the difference between Advanced and
Pro isn't "Pro always gets an extra sentence" — it's "Pro gets the deepest layer we can
actually compute, every time we can compute one."

## Superseded / no longer open
- ~~Band source: one rating or split?~~ → decision 1 (adaptive, not a fixed band).
- ~~Manual override?~~ → yes, decision 2 (4-way toggle).
- ~~Newcomer questions?~~ → YES, everyone gets questions (decision 3).
- ~~Advanced second layer always vs computed?~~ → decision 4 (teach when computed, never
  "always").
