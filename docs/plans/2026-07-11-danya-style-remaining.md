# PLAN — Remaining Danya-style coach builds (#20 think-aloud, #23 rating-banded, #25 SSML)

Owner: David · 2026-07-11 · All three APPROVED by David ("1 I like, but the
user should be playing… 6 for sure, again combine with 1? … 7 yes … 9 good
call!"). Shipped tonight from the same approval batch: callbacks (#19), walk
narration register (#22), blunder rewind (#21), session bookends (#24). This
doc carries the designs for the three that are sensitive enough to deserve a
fresh session: one touches G4 (the most locked TTS contract), one touches the
Lichess rate-limit surface we JUST fixed, one is the biggest narration build
of the set.

Style reference: `docs/naroditsky-voice-register.md` + the gitignored
transcripts in `data/sources/naroditsky-voice/transcripts/` (reference-only,
never quote).

## #20 — Think-aloud coaching while the STUDENT plays (Learn) + principle-then-exception

David's reshape of the speedrun idea: the USER plays; the coach deliberates
out loud at real decision points, Danya-style — what the position wants, which
ideas are in the air, why the tempting one fails — WITHOUT handing the move.

**Where:** Learn only (`CoachTeachPage` reply-narration block — the same
`facts` pipeline the fact-chain and questions use). Play stays pure (locked).

**Gate (deterministic, in code):**
- Student's turn after the coach reply; NO question armed (`questionArmed`
  false) — the think-aloud and the questions are alternate registers, never
  stacked.
- Middlegame phase (the opening fact-chain owns the opening).
- A genuine decision moment: engine MultiPV gap between line 1 and line 2
  ≥ 80cp (there is something to find), OR a principle-exception fired (below).
- Throttle: min 6-ply gap; skip when the eval is dead-lost/dead-won (> ±5).

**Facts (all computed — G0):**
- Positional reads from `positionReadingService` (`developmentRead`,
  `kingSafetyRead`, `findPieceQuality`, `findWeakPawns`) — square-anchored.
- The engine PLAN from `enginePlanContext` (PV maneuver themes), phrased as
  what-the-position-wants, NOT as "play X".
- The tempting-but-wrong beat: `buildAlternativesContext` (already built for
  the alternatives assembler) — when line 2 is a natural-looking move that
  loses ground, name what its punishing reply does (`describeMoveGeometry`).
- HARD RULE in the instruction: "Do NOT name or recommend a specific move for
  the student — deliberate about the position's demands only." The facts
  handed over must not contain the engine's line-1 SAN (compute around it), so
  the narration CANNOT leak it — same honesty-by-construction as the questions.

**Principle-then-exception detector (`src/services/principleDetector.ts`, new):**
Cheap chess.js checks over the game history + current position:
- early queen sortie (queen off back rank before 3+ minor pieces developed)
- same piece moved twice in the opening while others sit home
- wing-pawn grab with an uncastled king
- knights-before-bishops inversion
- early h/a-pawn pushes with the center unresolved
Cross against the engine: when the engine's PREFERRED continuation itself
violates one (gap ≥ 80cp in its favor), emit the exception fact: "the rule
says develop first — here the concrete line overrides it because {computed
geometry}". When the STUDENT's last move violated one AND lost eval, the
principle names the lesson. Concept corpus (`chess-concepts.json`) supplies
`concept:` source ids for the classical framing where tagged.

**Voice:** the live register (already shipped) phrases it; think-aloud facts
get a leading marker sentence so the register opens deliberatively ("Let's
think about what this position wants…").

**Tests:** principleDetector unit tests per rule (positive + negative FENs);
gate tests (gap, phase, throttle); a leak test asserting the think-aloud fact
block never contains the engine's best-move SAN.

## #23 — Rating-banded reality everywhere

"At your level, people play X; masters never touch it." Extend beyond gems.

**The rate-limit constraint (do NOT regress today's fix):** the out-of-book
prefetch cutoff (masterPlayWatcher, 2026-07-11) exists because live explorer
calls per move tripped Lichess rate limits. Rating-banded facts must therefore
be **cache-only at narration time**: read `masterPlayCache` (masters) and add
an amateur-band cache warmed by the SAME watcher prefetch (one extra ratings=
band call per already-sanctioned prefetch, sharing the cutoff + dedup), never
a fresh call from the narration path.

**Where the fact lands:** the opening fact-chain (append "at your level /
at master level" splits when both caches are warm for the position) + the
move-question grounded answers (masterPlayContext already carries masters
frequencies — add the amateur split when cached).

**Fact shape:** "At your level (≈{band}), {san} is the most common move here
({pct}%); masters prefer {masterSan} ({masterPct}%)." Only when both sides
have ≥50 games — empty > generic.

**Tests:** cache-only contract test (no network call from the fact builder),
split-fact composition tests, the watcher's cutoff still honored.

## #25 — SSML prosody spike on decisive beats

**G4 WARNING:** `/api/tts` is the most locked contract in the app (streaming
canonical, chunked, no buffered path). Polly supports SSML in streaming
synthesis (`TextType: 'ssml'`) — the change is ADDITIVE and must not touch
the streaming path shape.

**Design:**
- `api/tts.ts`: accept optional `prosody: 'spike'`; when set, wrap the
  (escaped!) text in `<speak><prosody rate="+8%" pitch="+6%">…</prosody></speak>`
  and set `TextType: 'ssml'`. Everything else identical. XML-escape the text
  (& < >) — a SAN like "Qxe7+" is safe but narration text may carry '&'.
- `voiceService`: `speakForced(text, { prosodySpike?: true })` threads the
  flag to the tts request. NO string sniffing — only explicit call sites.
- Call sites (deterministic beats only): guided-find/hold `confirm` lines,
  turning-point "You called it", the walk's brilliancy stems ("And there it
  is"), review reveal lead-ins when correct.
- Web-speech fallback tier ignores the flag (no SSML there).

**Tests:** api/tts unit (ssml wrapping + escaping + streaming headers
unchanged); voiceService threads the option; a G4 regression assertion that
no `arrayBuffer()`/buffered path appears.

## Sequencing

1. #20 (the flagship — biggest teaching payoff)
2. #23 (needs the watcher-cache extension first)
3. #25 (small, G4-careful, best done in isolation)

Each ships per the house rules: ship-check → main → bundle-hash verify →
functional audit vs localhost (Chromium→prod blocked in web containers) →
G2 stream pull.
