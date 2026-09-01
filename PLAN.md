# PLAN — Coach: command every question, every weakness, teach the concept (2026-09-01)

Owner: David. The vision, agreed in full this session: the coach answers **any**
question (end the phrasing whack-a-mole), holds **full command of the weaknesses
tab** (specifics + history + improvement + drills), rolls errors up into a
**concept/theme it can teach**, and **generates endgame technique** on demand —
all without breaking **G0** (the LLM decides no chess content; it only phrases
facts computed in code).

## The G0 guarantee (the spine of every part below)
- The LLM **never picks the chess fact and never invents one.** It does two
  allowed things: (1) phrase computed facts via `voiceFacts` (the chokepoint),
  (2) — nothing else in the chess path.
- **Data decides**, not the LLM. Answer-computers self-gate (`null` when they
  don't apply); the one that returns real facts wins. No LLM router.
- Anything we **cannot compute** → honest decline + **log it**. Never invented
  chess. That is the hard ceiling and it is by design.

---

## Part I — The universal answering pipeline (ends the whack-a-mole)
Replace "match a phrasing to a lane" (finite regexes, infinite phrasings) with
"extract signals → run data-gated computers → self-heal + log".
1. **Deterministic signal extraction** (code): SAN? square? piece word?
   self-reference? time-reference? wh-word? comparison? board present?
2. **Candidate computers** keyed by signals; **first non-null wins**; priority
   breaks ties. All existing `assemble*`/`explain*`/`answer*` (63 today).
3. **Self-heal**: chess question, every computer null → computed position
   default or honest "can't verify yet" — never a dumb deflection.
4. **LLM phrases only** (`voiceFacts`).
5. **Every miss logged** (`safe-default-stock` telemetry) → the ranked backlog.
- [ ] P-I.1 signal extractor (pure, tested)
- [ ] P-I.2 candidate-map + data-decides dispatch (wrap, don't rip out the
      existing regex fast-path — it stays as the instant tier)
- [ ] P-I.3 self-heal on full-miss (chess→position-default; banter→grounded)
- [ ] P-I.4 deflection-log surfaced for the backlog read

## Part II — Full conversational DeepSeek, grounded chess (G0 intact)
- Free/warm on any **no-chess-claim** turn (rapport, motivation, "you there?").
- **Grounded** the instant it is a chess claim — board-specific AND **general
  theory** → the concept/book corpus (`chess-concepts.json`), never memory.
- Classifier stays **aggressive** (David: "leave aggressive"); banter lane's
  narrow SAN/eval/stat stripper stays; fully-stripped banter **self-heals to
  grounded** (P-I.3).
- [ ] P-II.1 theory lane → concept corpus (David: "route to grounded")
- [ ] P-II.2 capabilities overview ("what can you help with") → app manifest
- [ ] P-II.3 P3 — verify non-chess turns reach the warm lane

## Part III — Weaknesses: C‑ → A+ (full command of the tab)
**Use the weaknesses we already capture** (David point 3): tactical motifs,
mistake puzzles by classification+phase, opening weak-spots, conversion
failures, time-trouble, board-vision heatmap, misconceptions, trade motifs,
errors-by-situation, phase breakdown.
**Capture gaps to ADD (verify each, add the genuinely-missing):**
- [ ] missed-opponent-threat / prophylaxis failures (we capture *your* hang, not
      "you missed *their* threat") — the heart of the loose-piece concept
- [ ] endgame-type conversion (lost R+P / K+P), beyond generic thrown-wins
- [ ] blunder-vs-stronger-opponent
- [ ] self-inflicted structure damage
**A+ computers (net-new):**
- [ ] P-III.1 **weakness LIFECYCLE** over the full imported archive: FIXED
      (used-to, gone — "you beat this yourself"), PERSISTENT, NEW, MOST-PRESSING
- [ ] P-III.2 **motif → behavior → CONCEPT** rollup (hand-authored map, ~25
      tags → ~10 behaviors → a few corpus-grounded concepts) + teach the concept
- [ ] P-III.3 **motif-scoped drill** (extend `buildMistakeDrillQueue` beyond
      game-scope to a weakness tag/motif)
- [ ] P-III.4 **weakness briefing** — one prioritized picture (top weaknesses,
      each count + recency + trend + one-tap drill)
Dependencies: full archive imported + analyzed (R1 stall fix is load-bearing);
a sample floor ("need more history"); the map is hand-authored.

## Part IV — Confirmed gap-computers
- [ ] P-IV.1 **opponent-move "why"** (P6) — the opponent's last move from the
      threat/plan computers
- [ ] P-IV.2 **name-this-opening** — surface `detectOpening` as an answer
- [ ] (capabilities = P-II.2; theory = P-II.1)

## Part V — Endgame technique (content already farmed; wire + generate)
Naroditsky endgame teaching is already in the corpus (`danyaTeachingService
.endgameNoteForLesson`) + `endgame-principles.json` + concept corpus + Syzygy
tablebase (`assembleEndgameAnswer`).
- [ ] P-V.1 **endgame-technique computer** — route "how do I mate with K+R / hold
      this rook ending / what's the Lucena" → tablebase (exact) or Danya notes +
      principles + concept corpus (technique). voiceFacts phrases.
- [ ] P-V.2 **Level 1 generative teaching** — on request, walk the **tablebase**
      line for a requested ending (canonical FEN), narrate the technique it is
      *reading* (moves tablebase-perfect ≤7 pieces; >7 = engine, honestly
      labeled). Same inversion as `generateOpeningFromDbNarration`.
- [ ] P-V.3 (follow-on) Level 2 — full *playable* generated endgame walkthrough
      (WLPP-style, tablebase as truth). Bigger; David: Level 1 now, Level 2 next.

## Part VI — Leftover phase
- [ ] P-VI.1 **P7** — phase-scoped post-game review from `trainingFocus`

## Part VII — Observability (the convergence engine)
- [ ] audit fails if the banter lane ever ships a SAN/eval
- [ ] deflection-log report = the real missing-computer backlog

## Sequencing (dependency order)
1. Part IV gap-computers + Part II theory/capabilities + P-V.1 endgame computer
   — self-contained, low-risk, high-value, prove the pattern.
2. Part I self-heal (P-I.3) — targeted dispatch change.
3. Part III weakness A+ (needs the motif→concept map authoring + lifecycle).
4. Part I full pipeline (P-I.1/2/4) — the bigger refactor; wrap the fast-path,
   never rip it out (live paying app — no big-bang dispatch rewrite).
5. P-V.2 endgame generative, P-VI P7, Part VII observability.

## Ship discipline
Batch coherent, tested chunks to `main` (not per-fix, not one 50-file mega-push
on a live paying app). ship-check green + G0 gates before each push. Post-deploy
3-instrument silent audit. Then read the deflection log for the next computers.

## Decisions log
- 2026-09-01 (David): full conversational DeepSeek — free on no-chess-claim,
  grounded on every chess claim incl. general theory; classifier aggressive.
- 2026-09-01 (David): NO LLM router (breaks G0) — data-decides via self-gating
  computers; self-heal loved; deflection-log = the backlog.
- 2026-09-01 (David): weaknesses C‑→A+ — lifecycle (incl. fixed-before-app),
  motif→behavior→CONCEPT teaching, motif-drills. Add missing captures.
- 2026-09-01 (David): endgame technique via tablebase-grounded generation, same
  G0 inversion as openings; Level 1 now, Level 2 next.

## Next-session pickup
Start at Sequencing step 1. Every new computer self-gates + routes through
`voiceFacts`; every fact from chess.js / engine / tablebase / DB / corpus. Run
`npm run ship-check`, then the silent prod audit.
