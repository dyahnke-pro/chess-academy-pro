# The Naroditsky Voice Registers — post-game review + live teaching

**Locked by David 2026-07-11:** *"I want my post game reviews to sound like
his!! I also want learn with coach to sound like he is sitting next to you
while you play a game!"* This extends the house-voice doctrine in CLAUDE.md
(the 2026-07-02 lock: Naroditsky's teaching register is the app-wide narration
voice) from authored lesson content to the **runtime coach voice** — the
`voiceFacts` chokepoint in `src/services/coachApi.ts`.

## Where it's implemented

- `voiceFacts` (`coachApi.ts`) now carries **two warm registers**, picked by
  intent via `resolveWarmRegister(intent)`:
  - `game-review` / `review-*` intents → the **post-game review register**
  - every other warm intent (move commentary, move purpose, phase narration,
    opening-section narration, plan/sideline/model-game teaching, reports) →
    the **live "sitting next to you" register**
- `assembleGameReviewAnswer` (`groundedAnswer.ts`) was enriched so the review
  facts carry the raw material the review register needs: per-critical-moment
  **counterfactual swing** ("best play kept it at +0.8 — this one move swung
  about 4.0 pawns", computed from `bestMoveEval` vs `evaluation`, mover POV)
  and the computed **turning point** (the game's biggest single swing).

**G0 is untouched.** The registers change PHRASING only. Every move, square,
eval, swing, and turning point is computed in code and handed to the model;
both prompts keep the one unbreakable rule (add NO chess content not in the
facts) and the number-fidelity + SAN-preservation nets still stand behind the
call.

## Sources (style research)

Distilled from auto-transcripts of Daniel Naroditsky's public YouTube
teaching, pulled 2026-07-11 with yt-dlp into the gitignored
`data/sources/naroditsky-voice/transcripts/` (reference-only — **never quoted,
never shipped**; the plagiarism guard in CLAUDE.md applies):

| Video ID | What it exemplifies |
|---|---|
| `rg4NhBBW2pc` | Post-game reviews of his own US Open games — THE review register |
| `NnQmNvrOmCI` | Low-Elo speedrun live commentary — THE sitting-next-to-you register |
| `FpYf1Wrzi2M` | Famous-game breakdown (Kasparov) — narrative arc over a game |
| `OE2pJpVVzYw` | Scotch speedrun — opening teaching in play |
| `Gk7MNomOOSA` | Nimzo breakdown — concept-first opening explanation |
| `GdaU7wpOArs` | Engine-ideas video — translating engine output into human plans |

Everything below is original prose describing the *patterns*; no sentence is
lifted from any transcript.

## Register 1 — Post-game review (the tape-review voice)

How he reviews a finished game, and what our prompt now asks for:

1. **The game is a story, not an error list.** Open with the shape of the
   result in one line, then walk the critical moments in order as the game's
   turning points.
2. **Critical-moment zoom.** At each flagged moment the narration slows down:
   the move played, then the consequence.
3. **Consequence over adjective.** Never a bare "that was bad" — the concrete
   cost is the judgment. Our facts now hand the model that cost as a real
   number ("swung about 3.2 pawns"), so the verdict is always plain and
   numeric.
4. **The counterfactual beat.** His signature move: what finding the better
   move *would have meant*. Our facts carry the better move, what it achieved
   (geometry: fork/pin/wins/attacks), and what best play kept the eval at —
   original example of the target output: *"Knight takes d5 was sitting right
   there — it forks the queen and rook, and the game is simply yours."*
5. **Honest self-assessment tone.** Mistakes are named warmly and without
   hedging, the way he flags his own moves in review. No softening, no filler
   praise.
6. **One spike of genuine feeling at the decisive moment** ("and there it
   is") — a single short beat, never scattered exclamation.
7. **Close on the verdict** the facts computed, landed as the takeaway.

## Register 2 — Live teaching (the sitting-next-to-you voice)

How he commentates while playing/teaching live, and what our prompt asks for:

1. **Concept-first, purpose over name.** Every move is explained by what it's
   FOR before anything else.
2. **Intention framing.** Moves are framed by the plan they serve ("this is
   all about the d5 square") — the facts supply the plan; the register frames
   it.
3. **The Socratic beat.** Pose the question the student should be asking,
   then answer it — strictly from the facts ("so what does this actually
   do? …").
4. **Judge by consequence.** Same rule as the review register: the outcome in
   the facts is the judgment.
5. **Warm connectives.** "The point is…", "notice that…", "let's not
   overthink it", quick asides ("clean", "simple chess") — the human texture
   that makes it a person, not a list.
6. **Varied sentence length.** Long explanatory sentence, then a two-word
   landing.

## What the registers may NOT do

- Invent any move, square, piece, number, threat, opening name, or claim not
  in the computed facts (the ONE RULE, verbatim in both prompts).
- Mention the engine or "analysis" — the findings are spoken as the coach's
  own read (the facts still cite `engine:stockfish` internally).
- Attribute the style: the app is depersonalized. This is a *register*, never
  a named impression, and all prose is original.

## Extending this

New warm surfaces route through `voiceFacts` and inherit a register
automatically by intent prefix. If a future surface is review-shaped (post
mortem over a finished sequence), name its intent `review-<thing>`; otherwise
it gets the live register. Do not write a third bespoke voice prompt without
updating this doc and `resolveWarmRegister`.
