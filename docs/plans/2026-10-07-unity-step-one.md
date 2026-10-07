# Unity, step one — one decider per question, Review keeps its identity (2026-10-07)

David, 2026-10-07: *"I want total unity wherever possible. How much can we unify
without review turning into learn? It must maintain its identity. Step one is
unification. Save this work list."*

Source: the 52-error list from the Learn free-play + Review walk (2 Learn games
as Black, Scandinavian, and their 2 reviews; tapes `/tmp/claude-0/learn5.log`,
`rev-g1.tape`, `rev-g2.tape`). About 25 of the 52 come from two or more producers
speaking about the same thing with nothing deciding between them. Those 25 are
this step. The other ~27 (false claims from one wrong computer, describe-only
lines, report voice) come AFTER unity, because several of them change once
there is one producer per fact.

Builds on `2026-10-01-unify-the-coach.md` (A1 one grade, A2 Review calls Learn's
student-move lanes, B3 a tactic's rule once). That doc is the per-computer list;
this one is per-QUESTION: one answer to each question the coach answers.

Every row is a root-cause fix: name the second producer, delete it or route it
through the one decider, and prove it with a test on the walked position that
fails on the old code. Nothing new is built.

## THE LINE — what is shared, and what stays Review's own

**Shared (one computer, both surfaces):** the facts. What the move was worth,
why, what the better move was and why, where the game turned, what each side's
plan is, what has already been said this game, and the words for each grade.

**Review's own (declared once, never copied from Learn):**
- **Tense and seat**: retrospective — "you played X", "the game turned at…".
  Learn is present tense.
- **Posture `walk`**: every ply is a beat; importance ranks a moment, never
  silences it. Learn is `interrupt`.
- **The game is the unit**: one thesis, the 1–3 moments it turned on, the recap
  and the result card. Learn has no thesis.
- **Withholding**: the turning point is ASKED (board tap) before it is told;
  the cause is restated after ("Again you missed…"). Learn names the move at
  deciding moments.
- **Hindsight lines**: the stronger line played out against what happened.

If a change would make Review speak present tense, gate on `interrupt`, drop the
thesis, or tell a turning point before asking it, it has crossed the line — stop.

## Work list

| # | one question | today: who answers it | one decider | errors closed |
|---|---|---|---|---|
| U1 | **Where did the game turn?** | `selectTurningPoints` (questionPlan, the questions) · `turningPointCandidates`/`renderThesis` (teachingSelector, the closing) · the critical-moment card ("This is the moment — X keeps you in it") | one turning-point computer, computed once per game; questions, card and closing all read its result | 19, 21, 22 |
| U2 | **How bad was this move, in words?** | grade label (`classifyCpLoss`/`gradeMove`) and the cost sentence are chosen separately, so "imprecise" sits on "wins it outright" and "an inaccuracy" on two pawns | the grade WORD is derived from the same swing the cost sentence states — one table, label + cost together | 16, 17, 18 |
| U3 | **Why was this move good/bad, and what was better?** | several reason producers per ply (verdict reason, better-move reason, card reason, hindsight line) each say their own "why" | one reason per move per game, picked once; later lines refer back, never re-derive | 20 |
| U4 | **One engine read per position** | Review grades at 12/16 (pool), the card fans at 14/1500 ms, reasons read 12–13-deep lines — three searches can disagree on the best move | every Review producer reads the SAME stored read for a position (the verdict store's `bestUci` + one line per position per game) | 19, 20 (engine half) |
| U5 | **What is the plan?** | several plan producers speak back to back ("The plan changes here" ×2; kingside storm then queenside majority; "attack their king" then "you're in trouble") | one plan thread per game: a plan is stated once, a CHANGE is said only when the plan computer's verdict flips | 23, 24, 25 |
| U6 | **Whose fact is it?** | one geometry read from both seats ("a discovered attack in waiting" + "pinned by your rook" on d5) | subsumption by squares across seats (factSelector) — one claim, the side it matters to | 26 |
| U7 | **Is this a question or an answer?** (Learn) | the threat alert and the question are separate lanes; the alert names the answer, then the question asks it | the door orders them: a question owns its ply; the alert waits or becomes the answer to it | 27, 28 |
| U8 | **When is the answer allowed?** (Review) | the "your answer was X" / "the stronger move was X" producers fire before and after the turning question on their own | the withholding rule lives in ONE place (the surface's `withholds`); every producer that names the turning move reads it | 29, 30, 7, 8 |
| U9 | **What has been said this game?** | each lane keeps (or lacks) its own say-once memory; the walk re-speaks plies after a turning stop | one per-game claim ledger keyed by claim identity, shared by every lane and by the walk after a stop | 31–39 |
| U10 | **What does this ply lead with?** | an unrelated pin line and a callback come before "your queen is trapped" | the decider's computed ORDER (stakes) across all lanes, not lane order | 48 |

## Order
1. **U4 then U1** — one read, then one turning point; U3, U5 and U8 all read the
   turning point.
2. **U2** — independent, small, every flagged move on every surface.
3. **U3, U8** — one reason, one withholding rule.
4. **U9** — one ledger; makes U5/U6 repeats impossible rather than filtered.
5. **U5, U6, U7, U10.**
6. Walk Learn AND Review on fresh games, every claim counted; then the ~27
   non-unity errors by cause.

## Status (2026-10-07, after David's go)
- [x] U1 one turning point — `gameTurn`; thesis, closing and theme read it; second builder deleted.
- [x] U2 one grade-and-cost table — `GRADE_WORD` + `costFitsGrade`; Learn and Review both.
- [x] U3 one reason per move — the reveal reads the verdict's stored reason; a taught ply is not re-narrated.
- [x] U4 one engine read — the stored verdict (what the student was told) supplies the best move to every Review producer; a search that picked another drops its line rather than contradict it (`gameAnalysisService`, oneVerdict test "U4 one read").
- [x] U5 one plan thread — one plan per side when kings are opposite; a plan holds two moves before it changes.
- [x] U6 one claim, one seat — Learn's door collapses same-geometry facts (danger first, then stake).
- [x] U7 question vs answer — the turn's question is asked after the instant decision and held when already answered.
- [x] U8 one withholding rule — `reviewWithholding.advantageWasMissed`, read by the verdict and the projections.
- [x] U9 one spoken ledger — Review playback never re-speaks a ply on an automatic pass; the yielded critical line is gone.
- [x] U10 lead order — the trapped queen/rook is found in the INSTANT wave (trappedOnBoard at the head of the threat chain) and the threat fact carries its computed stakes (threatStakes), so it outranks lane order. Confirm on the next Learn walk.
