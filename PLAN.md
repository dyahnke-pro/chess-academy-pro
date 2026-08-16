# SEQUENCE — locked with David 2026-08-15

1. **The hand-written notes land** (other session). Keyed by note id into
   `public/data/corpus-spoken.json`; `spokenBeatText` returns them VERBATIM, so
   whatever is written is exactly what is spoken. Confirm that session has
   COMMITTED before it is stopped — two engine commits nearly stranded in a
   container tonight, and a container is reclaimed without warning.

2. **Full audit.** Muted, always: `await ctx.addInitScript(muteTtsForAudit)`.
   An audit needs to know WHAT was said, not to hear it — the listener reads the
   text out of `coach-narration-spoken`, so synthesising bills for audio nobody
   is in the room for.

   SCOPE — everything below is currently UNAUDITED on prod:
   - `ee5a7cb9` UCI_Elo + MultiPV live/review + searchmoves. The priority: it
     changes how the opponent PICKS MOVES in a live game, and no unit test can
     tell you whether a 1729 now faces a 1729.
   - `bacb0c04` the no-dead-lanes gate
   - `f156bb76` bake gate change + moveOrderArrows, AND ~471 notes baked with
     the length/move gates lifted whose wording is live and unheard
   - the hand-written notes from step 1

   Instrument: `scripts/audit-teach-corpus-spoken-prod.mjs`, verdict from
   PostHog by `audit_run_id`. Its marks now come from the BAKE, so a
   hand-written note appearing in the transcript IS the proof it fired.

3. **Then the sync** (video alignment) — see the section below.

# PLAN — computed voice narration (2026-08-15, active)

David: *"I'm willing to spend your context on better hand written notes. But you
need to guarantee me that you can get them to fire when they are supposed to!!!"*

This is the pickup doc for that. Everything below is measured, not assumed.

---

## THE GUARANTEE, AND THE ORDER THAT MAKES IT ONE

**Wording has ZERO effect on whether a note is selected.** Selection runs on the
note's POSITION metadata — `isVerifiedPosition`, `noteDescribesPosition`,
`noteStaysInScope`, phase match, `noteOpeningConflicts`. Once a note IS selected,
`spokenBeatText` returns its bake entry **verbatim** ("THE BAKE WINS"), no model
in the path.

So the failure mode is not bad prose. It is **writing beautiful prose for notes
that were never going to be selected** — the same shape as every bug this session
found. Do it in this order and it cannot happen:

1. **MEASURE which note ids actually get selected** on the openings we teach.
   `computedVoiceAudit.report.test.ts` walks 12 openings through the real
   selectors and records the tier + note that spoke per ply.
2. **WRITE spoken forms only for those ids**, straight into
   `public/data/corpus-spoken.json` keyed by note id: `{ "<id>": { "spoken": "…" } }`.
   No LLM call — that file is a plain Map lookup at runtime.
3. **VERIFY** with the muted prod audit. The probe's marks now come FROM the bake,
   so the new wording appearing in the PostHog transcript IS the proof it fired.

**Known-good example to copy:** `dt-48c` ("Black's main tricky move is queen to
e7…") is PROVEN to fire — heard on prod 2026-08-15, matched by the probe. It has
**no bake entry**, so it currently speaks as raw distilled transcript pruned to
one sentence. It is the first note to hand-write, and the template for the rest.

### The rules a hand-written spoken form must satisfy
(`gateSpoken` in `scripts/bake-spoken-notes.mjs` — length and move gates were
REMOVED 2026-08-15 on David's call; these remain)
- **Anchored note** (has `lineSan`): may name only squares the SOURCE named.
  `invented square` is still a rejection — an unearned claim.
- **Floating note** (no `lineSan`): may name **NO** square and **NO** move. Its
  geometry belongs to another game.
- No verbatim lifting: ≥6-word shared run with the source is a rejection
  (plagiarism guard — 1,071 notes hit this; it is working as intended).
- No banned phrases ("excellent", praise), no control tokens.
- Keep the note's chess terms (compensation, initiative, prophylaxis…) — do not
  simplify them away.
- **Length and move order are FINE now.** A note may walk a line; the board draws
  it (`moveOrderArrows`).

---

## WHAT LANDED TONIGHT (all on `main`, ship-check green)

| Fix | Evidence |
|---|---|
| `pvSpoke` no longer lets the routine plan silence the corpus | suppression 93.9% → 19.8% |
| Teaching ladder asks every tier | tiers-with-something-that-never-spoke 5 → 0 |
| Coach could not see mate **at all** (guard nullified its own inputs) | now any depth; "it would stop the mate" |
| Delta's "why" — grammar corruption; better move never named on structural reads | 3/5 → 4/5 with a why |
| Bake taught as the wrong colour ("we offer the gambit" to a Black student) | fixed |
| Full Stockfish capture: wdl, seldepth, nodes, nps, bounds, hashfull | was 4 of 13 fields; `nodesPerSecond` was hardcoded 0 |
| `UCI_LimitStrength` + `UCI_Elo` | never sent; engine now told the Elo directly |
| `eval` mining — per-piece quality + material/positional split | "your rook on a1 is doing the least of anything you own" |
| MultiPV 3 live / 8 review, `go searchmoves` | |
| **Prefetch hang** — a dropped prefetch was `await`ing the brain search | 79/79; live candidate for coach stalls |
| No-dead-lanes gate in ship-check | 10 lanes + all 13 package ranks |
| Move-order arrows | dt-48c draws 6 arrows instead of 6 SANs in audio |
| Audit instrument (was measuring raw corpus, not the bake) | 0 → 10 marks matched on prod |

---

## OPEN, RANKED

1. **Hand-write the spoken forms** — the job above. ~4,600 notes lack a bake
   entry; do NOT attempt all of them. Do the ones measured as *selected* on
   taught openings first; that is a few dozen and it is what students hear.
2. **`corpus-position` selecting notes about other positions** — a Najdorf ply
   spoke "…a Fried Liver situation". The exact-tier predicate is already heavily
   guarded, so this needs measurement before touching: it may be a legitimate
   COMPARISON rather than a misfile. Measure, then decide. Do not guess — that is
   what produced the c8-bishop and near-zero-threshold bugs.
3. **The bake remainder** — resumable, writes incrementally, currently 60,753
   entries / 60,433 spoken. A one-time LLM spend David has sanctioned but
   deprioritised in favour of hand-written notes.
4. **Gem lane still 0%** on real games — the lookup is healthy (60/60) and
   `pickTaughtSlip` exists, but `slipsAllowed` gates medium/auto to
   `studentElo < 1000`, so David at ~1729 can never see it. His call.

---

## INSTRUMENTS

- `src/services/computedVoiceAudit.report.test.ts` — 12 openings, real Stockfish
  WASM from `node_modules`, ~3 min. The regression instrument for lane coverage.
- `src/services/laneReachability.test.ts` — in ship-check. Fails the build when a
  lane becomes structurally unable to speak.
- `scripts/audit-teach-corpus-spoken-prod.mjs` — muted prod audit.
  `AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app`
  Verdict lands in PostHog keyed by `audit_run_id` (local listener cannot attach
  over https). **`muteTtsForAudit` is armed — audits cost zero TTS.**

## THE LESSON THIS SESSION KEEPS TEACHING

Five lanes were found computing correctly and reaching nobody; two more nearly
shipped that way, including one caught minutes before by probing a real position.
Every one passed its own unit tests, because **a test that calls a function with
values chosen to satisfy it can never ask whether those values occur.**

Probe a real position. Measure before writing. A green test is not a working
feature.
