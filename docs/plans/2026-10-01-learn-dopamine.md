# Learn with Coach — the reward layer ("dopamine") — HANDOFF PLAN

Status: **PLAN ONLY — not built.** Agreed with David 2026-10-01 in the Tactics
session (branch `tactics-walk-fixes`), handed to the Learn session. Read the four
levels of context (CLAUDE.md § THE FOUR LEVELS) before building; run
`node scripts/surface-map.mjs --changed` first.

## The idea

Bright neon lights, sound and phone vibration that fire when the student EARNS
it — the same reward layer as the Tactics deep-run mode, applied to Learn
(`/coach/teach` live play). Arcade, NOT casino: no reels, coins, levers or
"JACKPOT" (Apple's "Simulated Gambling" age-rating box would push the app to
17+ and kill the Kids section). Enhance the app's EXISTING neon theme; do not
invent a new one.

## The one rule

**Only skill earns a reward.** Book moves, recaptures and forced replies are
silent — a chime on every best move is noise by move 10 and worthless when it
is really earned. The board's own decision moments are unpredictable, which is
the variable-reward schedule, honestly earned. No speed bonus (speed must not
count — David).

**The coach's VOICE stays dry.** Narration Voice Rule 5 (no "Great job!")
stands. The machine celebrates (sound/light/haptic); the coach never praises.

## Reward moments (smallest → biggest)

Every trigger is an ALREADY-COMPUTED signal — no new detector, no LLM (G0).

| # | Moment | Signal (existing computer) | Reward |
|---|---|---|---|
| 1 | Best move found at a REAL decision | `nextMoveAdvice` / `narrationImportance` deciding tier (critical / only-move / swing) AND the played move = engine best (match by COORDINATES, never SAN — G4.5.2) | chime + light burst + light tap |
| 2 | Threat parried | standing threat from the threat probe (`threatCheck` / `threatOut`) and the student's move answers it | "SAVED" ping + shield flash on the defended piece |
| 3 | Punished their mistake | opponent's move cpLoss ≥ band bar AND the student plays the punishing (best) move | heavy chord + starburst on the capture square + double tap |
| 4 | Found the gem | Learn's live gem detection (names the opportunity, withholds the square) → student plays it | biggest in-game burst + fanfare |
| 5 | Only move found | `criticalityScan` only-move tier, student found it | gold flash + rising chord |
| 6 | A skill turns GREEN | `capabilityEvidence` crosses `capabilityProven` (HELD_FOR_PROVEN / PROVEN_MIN_IMPORTANCE / PROVEN_MIN_GAMES) | red tile → green "PINS: PROVEN" |

#6 is the loop made visible — the moment the coach learns you got better.
⚠️ GAP: today capability evidence is written at post-game analysis
(`autoAnalyzeGame` / `gameAnalysisService`), not live in `CoachTeachPage`. A
mid-game green needs either a live posed+held check against the same bar, or #6
moves to the recap. Do NOT build a second "proven" bar — reuse
`capabilityProven` (one detector, two consumers).

## Around the moments

- **Decision streak** — small neon counter of decision moments answered in a
  row. Book/obvious moves neither count nor break it. Soft reset on a miss.
- **Recap medals** at game end, each counting up with a chime: decisions found
  7/9 · threats parried 3 · punished 2 · gems 1 · skills turned green 1.
- **On a miss** — no sound, no flash. The coach teaches it as today; the record
  still captures it (`learnSilentCapture` contract unchanged).

## Guardrails

- Reward sound plays BEFORE the voice; voice ducks a beat; never talks over the
  coach.
- Sound obeys the existing sound toggle + volume (`soundService` — synthesized,
  extend it, no audio files); vibration gets its own toggle; motion obeys
  `prefers-reduced-motion`.
- Haptics: `@capacitor/haptics` (live on iOS only after a native build David
  asks for) with `navigator.vibrate` fallback (Android web; iOS Safari has none).
  The Tactics session is adding the plugin — share ONE haptics service.
- Algo audit rule (CLAUDE.md): a reward is a computed decision → emit one
  `learn-reward` row (moment kind, signal that earned it) through one door, with
  a contract row in `algoAuditContract.test.ts` and an assertion in
  `audit-concept-gameplay-prod.mjs` (e.g. zero rewards on book plies).
- Never on Play (`/coach/play` volunteers nothing — PLAY_VOLUNTEERS_COACHING).
  Decide with David whether Play gets the SILENT visual/haptic layer.

## Open calls for David (Tactics-session votes in brackets)

1. Green-tile pop-up mid-game or only in the recap? [mid-game, small, corner —
   subject to the live-evidence GAP above]
2. Decision streak visible during Learn? [yes]
3. Remember the best decision streak? [yes, shown only in the recap]

## Shared with the Tactics build (avoid duplicating)

Tactics (`tactics-walk-fixes`) is building the reward layer for puzzles: rising
per-pip chime, solve chord, rank fanfare, starbursts, haptics, neon enhance.
Build Learn on the SAME reward service — one sound/light/haptic vocabulary
across the app (capability parity).
