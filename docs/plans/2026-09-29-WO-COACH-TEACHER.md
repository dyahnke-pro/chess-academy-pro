# WO-COACH-TEACHER — Learn free play + chat that teach like Naroditsky

**Owner of the whole:** the session that wrote this (2026-09-29). **Approved by David 2026-09-29.**
Source of the plan: `docs/plans/2026-09-29-danya-full-review.md` §FINAL PLAN (two-round brainstorm, 5 brains, real prod tape).
Evidence: `docs/plans/danya-review-2026-09-29/` (8 video-reader reports, sources audit, brainstorm r1, prod tape).

> **For a new session picking up a work order:** read §0 and §1, then ONLY your work order. Claim it by editing its **Status** line to `🔵 <your session / date>` in the same commit as your first code. Stay inside your **Files** list — another session owns the rest. Ship on a branch, merge to `main` when green (CLAUDE.md Deployment Policy).

---

## 0. What we are building, in one paragraph

Today Learn free play speaks ~1.3 disconnected labels per move ("A pawn break is available on d5", "Nf3 follows a principle…") and chat answers about half the questions asked (tape: 7/14; real App Store typed questions: ~17% answered, 38% got "I can't verify that precisely"). Naroditsky never stops talking — but it is ONE line of thought: what I want, what they want, what I'm checking, why this move — around a plan that SWITCHES as the board changes (tactical → positional → tactical), and when asked "why not X?" he plays X out and shows the refutation. Target: the same shape, every word still computed in code (G0).

## 1. Rules every work order obeys

1. **G0.** Code computes every chess fact. The model may only (a) phrase, (b) PARSE a chat question into the closed `BoardQuery` schema (David approved 2026-09-29). It never decides what is true.
2. **No caps (G4.5).** Selection is a ranker's decision, never "stop after N".
3. **One door (G4.5.15).** Everything Learn says passes `coachDecider` / the Learn turn door. A lane that speaks around it is a bug.
4. **Plans are not locked** (David 2026-09-29: "Plans change as the board does… tactical to positional back to tactics"). The current plan is re-read every turn; a switch is SAID.
5. **Corpus notes stay out of Learn free play** (CLAUDE.md 2026-09-23). His style reaches Learn through computers, never by reciting his notes.
6. **Audits**: hand-walk one of his games after each merged WO (CLAUDE.md "WALK IT, FLAG EVERYTHING, THEN FIX"), muted.
7. **Don't touch `src/components/Weaknesses/**` or the weaknesses services** — another session is fixing a freeze there.

## 2. Work orders

Dependency graph: `WO-0` and `WO-5` any time · `WO-1` first on the Learn side · `WO-2`, `WO-4` build pure now, wire after `WO-1` · `WO-3` + `WO-6` in parallel with everything.

---

### WO-0 — Tape bugs (hours)
**Status:** ⚪ open
**Files:** `src/services/questionIntents.ts`, `src/services/coachApi.ts` (only the lines named), the markup stripper wherever `[VOICE:` leaks.
- `[VOICE:` markup leaked into chat AND voice on a typo'd question (tape Q8).
- `\bwhy\s+not\b` sits in the best-move-reason list (`questionIntents.ts:~437`), so "why not e5?" answers with the best move. Route to a why-not lane (a stub that WO-3 fills; until then: evaluate X, say its cost vs best).
- "let's play, I'll be white" → "I'll answer with the Caro-Kann" then 1…e5 was played.
- Takeback ("take that back and play c6") → coach never replied again.
**Done:** each reproduced with a failing test first; tape questions Q4, Q8, Q12 re-asked on prod and answered.

---

### WO-1 — THE DOOR: every Learn line through one decision
**Status:** 🔵 this session, 2026-09-29
**Files:** `src/components/Coach/CoachTeachPage.tsx` (the per-turn narration path only), NEW `src/services/learnTurnDoor.ts`, `src/services/voicePackage.ts`, `src/services/coachDecisionEvents.ts`.

Today (engineer map, `brainstorm-r1/engineer.md`): ~15 lanes. One (`computePositionFacts` → `decide()`, `CoachTeachPage.tsx:~9073`) goes through the decider. The rest call `queueSpokenHint` (`:8482`, 19 call sites) into a pending list, and two `buildVoicePackage` passes (instant `:8345`, late `:10638`) order + dedupe but never CHOOSE.

- **1a — route + record, no audible change.** Every lane carries a `lane` id. Both package passes go through `learnTurnDoor.decideTurn()`, which today returns exactly what `buildVoicePackage` returned, and emits ONE `learn-turn-decision` row per turn: lanes offered, lanes kept, facts per turn, sentences per turn, lead lane. Gate: a test that fails if any call site speaks Learn per-turn narration without the door.
- **1b — the door picks a LEAD.** `decideTurn` returns `{ lead, support[], held[] }`. Lead rule (until WO-2 lands): a deciding moment → biggest stakes; otherwise the fact that answers "what's the plan / what do they want". Support must share squares or plan with the lead; the rest are `held` — available behind a "why?" / chat, not spoken. This is subsumption by relevance, not a cap.
- **1c — one sentence chain.** The lead + support render as one connected utterance (connectives: "so", "which is why", "but first") instead of stacked sentences.
**Done:** `learn-turn-decision` rows on a hand-walk of his game `3UqPa5eV2e0` show one lead per turn; tape ply 11 (four labels) comes out as one thought; ship-check green; hand-walk flags written.

---

### WO-2 — The plan thread (switches with the board)
**Status:** ⚪ open — build the pure computer now, wire after WO-1
**Files:** NEW `src/services/planThread.ts` (+ test). Reads `planArc.ts`, `positionFacts.ts`, `boardPlan.ts`; does NOT edit them.
- `readPlanThread(prev, board, facts) → { plan, character: 'tactical'|'positional'|'conversion'|'defence', switched, why }`. Board picks the plan (their concession, the structure, `planArc`'s dominant aim). Character flips on: a tactic appears/vanishes, material changes, structure changes, a plan lands or dies.
- A switch is a fact: "The position has changed — now it's about the king." A plan landing: "There it is — that's what the knight tour was for."
- **Plan-aware grading:** a move serving the current plan whose compensation holds a few plies deep is "deliberate", never "a mistake" (tape plies 29, 41 — the outpost move called a mistake).
- **"First X, so that Y":** when the plan move fails now, name the obstacle (own piece in the way, a kick with tempo, a piece left hanging) and the quiet move that removes it.
**Done:** unit tests on tape `3UqPa5eV2e0` positions (plan = open the centre → switch at d5 → Nd2-c4 reroute → outpost c6 = landed); wired into WO-1's lead rule.

---

### WO-3 — A coach you can talk to (BoardQuery chat)
**Status:** ⚪ open
**Files:** NEW `src/services/boardQuery.ts` (schema + resolver), NEW `src/services/boardQueryAnswer.ts`, the fall-through in `coachApi.ts` (`~6335-6389`, `~6484-6500`, stock line `~1772`), `questionIntents.ts` only to hand off.
- **Schema (closed):** `kind`: why | why-not | what-if | is-good | plan | meaning | eval | meta. `subject`: a SAN (chess.js-validated from the right side), `last-move` by seat ("that" = the last ply, resolved in CODE by coordinates), a piece on a square, the position, a plan by seat, a concept id. `seat`: me | them.
- **Parser:** the 55 regex lanes stay as the fast path; anything they miss goes to the model, which may ONLY fill the schema. Validation by chess.js; unresolvable → a clarifying question with the candidate moves as choices ("the queen move or the pawn take?"). The stock "can't verify" line is deleted.
- **Answers:** why-not / what-if → play X, the refutation from `computePvLine`, a consequence read from `positionFacts`: "X? Then Y, Z — and [consequence]." Echo the parsed question so a misparse is visible. "Explain that last move" replays that move's WO-1 decision. "What's the plan" names WO-2's plan.
**Done:** the tape's 14 questions + the 86 real typed native questions (`brainstorm-r1/dialogue.md`) re-asked: most answered, zero stock lines; the exhaustive routing audit green.

---

### WO-4 — Repeats that shrink, across games
**Status:** ⚪ open — pure now, wire after WO-1
**Files:** NEW `src/services/exposureRegister.ts` (+ Dexie store with version bump + upgrade, per standing orders), reads the heat map.
- Per concept, persisted: full rule + reason → short callback ("f3 again") → trigger cue only → deliberate silence at the trigger, then speak to the result ("you found it" / "it was there"). The step comes from the student's own record (red holds full; green goes silent), never the rating.
- Rule → exception only after the rule is learned (grey gets both in one breath; red gets the rule only).
- Silent-at-trigger results feed `capabilityEvidence` — the only honest green.
**Done:** a two-game test on one device shows the second game's callback shorter; silent repeat writes capability evidence.

---

### WO-5 — The measuring stick
**Status:** ⚪ open
**Files:** NEW `data/danya-labels/*.json`, NEW `scripts/audit-danya-match.mjs`. No app code.
- Hand-label ~200 in-game plies from ~20 of his games (spread across ratings), by IDEA kind (plan / their plan / tactic / structure / prerequisite / switch / verdict), never by words. Skip the ~25 bare/defective distilled videos (reader reports list them).
- Score our `learn-turn-decision` lead against the label. Report per idea kind + a chat score from WO-3's question set.
- Do NOT score word overlap. Do NOT target his distilled 0.6 sentences/ply.
**Done:** a baseline number committed before WO-1b merges.

---

### WO-6 — The scratch board
**Status:** ⚪ open
**Files:** NEW `src/components/Coach/ScratchLinePlayer.tsx` (+ test), its mount point in `CoachTeachPage.tsx` coordinated with WO-1's owner.
- Plays a line on the Learn board (arrows per move, voice per move), then snaps back to the game position. Board input disabled while it runs; any tap cancels and snaps back. Uses `ConsistentChessboard`.
- Used by WO-3 (why-not / what-if) and later by WO-2 ("first X so that Y").
**Done:** plays a 4-ply refutation and restores the exact game FEN; a board move during playback cancels cleanly.

---

## 3. What we are NOT doing yet
- The L2–L9 computer list in the review doc is parked until WO-1..3 land — more lanes today means more disconnected labels.
- No authored history / psychology / anecdotes.
- No corpus notes in Learn free play.

## 4. Status board (update in the same commit as the work)
| WO | status | owner |
|---|---|---|
| WO-0 bugs | ⚪ | — |
| WO-1 door | 🔵 | this session |
| WO-2 plan thread | ⚪ | — |
| WO-3 BoardQuery chat | ⚪ | — |
| WO-4 shrinking repeats | ⚪ | — |
| WO-5 measuring stick | ⚪ | — |
| WO-6 scratch board | ⚪ | — |
