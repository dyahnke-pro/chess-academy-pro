# Computers batch 1 — opening, order and timing (report)

Branch `claude/computers-batch-1` (base `claude/reads-rotation`). Skipped by
instruction: Repertoire fit, Lore and reputation (need authored data).

Every computer below is a pure leaf (chess.js + engine lines handed in; no
Dexie, no LLM, no `Math.random`), every spoken claim carries a real `Proof`
(`squaresProof` / `legalLineProof` / an engine line said short), stems rotate on
a stable key (`rotateStem` + `stemKeyOf`), no digits in speech, you/they voice.
Each read only EXPLAINS the engine's choice where an engine move is involved —
it never argues for a different move.

## Per act

| act | computer | built / extended | Learn lane | position reads (chat, read-position, Why, live coach, phase) | Review facet | DIAGNOSE (student model) |
|---|---|---|---|---|---|---|
| Opening equivalence (inserted / reversed) | `openingEquivalence.ts` | NEW — reuses the offline position index `openingPositions` (no new index, no runtime replay of the DB) | `openingEquivalence` (rides with the name, said once) | `equivalence` clause via `orderReads` → `depthClauses` | `[equivalence]`, once a game (`once:` identity) | n/a — a name for the board poses no question the student can miss |
| Off-book method (which capture) | `captureChoice.ts` | NEW — uses the one `isOutpost` and `knightReach` | `captureChoice` | `capture-choice` (names the move → only where the move may be named) | `[capture-choice]` | held → `created-pawn-weakness` (`recordTeachingEvidence`); a miss → the live slip capture |
| Mirror-structure race | `planRace.pawnSquareRaces` / `pawnSquareRaceRead` / `pawnSquareTaken` | EXTENDED `planRace.ts` (a third race kind, same rule: same plan, same terminal event, one unit) | `breakRace` | `plan-race` (names the move) | `[plan-race]` | held → `mistimed-pawn-break`; miss → slip capture |
| Pattern fails here (F04's when-it-fails half) | `patternFails.ts` | NEW — the refutation is the engine's own multi-PV line, said short | `patternFails` (page now hands `topLines` to `studentMoveTeaching`) | `refuted` (needs ≥2 engine lines) | **skipped in Review**: the review context carries one engine line (best + played), never the tempting move's line, so there is nothing to prove it with | held → `calculation-depth`; miss → slip capture |
| Move-count ledger for trades | `tempoCount.tradeLedger` + `captureTooEarly` | EXTENDED `tempoCount.ts` — the piece-identity replay is now ONE exported `trackPieces`, shared with `tempoCount` | `tradeLedger` | `timing` (`captureTooEarly`: "taking on c4 now develops their bishop for free") | `[timing]` | held → `tempo-handed`; miss → slip capture |
| Order from what they have NOT played | `notYetPlayed.ts` | NEW — uses `homeSquaresOf` + `legalSeeGainFor` | `notYetPlayed` | `timing` (`notYetIdea`, names no move) | `[timing]`, once a game | held → `neglected-development`; miss → slip capture |
| Kick map | `kickMap.ts` | NEW — the landing squares counted on the board, the plan proven by the engine's line (capture, their recapture, the pawn kick) | `kickMap` | `kick` (names the move) | `[kick]` | held → `tempo-handed`; miss → slip capture |
| Hold a resource until it bites | `holdResource.ts` | NEW — the "until" is played out with chess.js: their knight develops, the bishop pins it, and with the pin standing every recapture of the capture is a pawn that doubles | `holdResource` | `timing` (`holdIdea`) | `[timing]`, once a game | held → `bad-trade`; miss → slip capture |

## Vocabulary (shared tables, additive)

- `FacetTag` += `equivalence`, `capture-choice`, `kick`.
- `ClauseKind` += `equivalence`, `capture-choice`, `kick`, `plan-race`, `timing`
  (the last two are review's names, so one name on both sides).
- `FACET_RANK`, `FACET_ROLE`, `CLAUSE_ROLE`, `FACT_LAYER`, `FACT_PROOF`
  (`proven` for the three new kinds), `CLAUSE_TIE`, `clauseKindForTag`: one row each.
- `LearnLane` += 8 lanes, each answered in `LEARN_LANES`, `DNA_BEAT` and
  `COMPUTER_ROLES` (owed stays 0).
- `DepthClause` gains an optional `proof`, forwarded by `positionFacts` to the
  door, so these clauses arrive proven.
- Review's say-once ledger accepts a generic `once:` identity (two lines in
  `coachFeatureService`).

## Wiring

- Learn: `learnBoardTeaching.studentMoveTeaching` → `orderTeaching` (one call;
  the page gained no import, one prop: `topLines`).
- Position reads: `thinkAloud.depthClauses` → `orderReads` (one call) — reaches
  Learn's position facts, `useLiveCoach`, `usePhaseNarration`,
  `positionReadComposer` (read this position / chat) and `whyBestMove`.
- Review: `reviewFullData.computeMoveFacets`, section "7d+".

## Not done / honest gaps

- **Who an inserted move favours** ("…thrown in favours Black"): needs the
  reference position's own engine eval, which no surface holds on the move
  path. The identity is said; the verdict is not (never a guess).
- **Pattern fails in Review**: no line for the tempting move in the review
  context (see table).
- The mirror race speaks only the square race (both pawns can step onto one
  square on files c–f, ranks 4–5); a race of breaks on DIFFERENT squares has no
  common unit and stays silent, per `planRace`'s own rule.
- No prod audit was run from this session (branch only, by instruction).

## Files

New: `src/services/{openingEquivalence,captureChoice,notYetPlayed,kickMap,holdResource,patternFails,orderReads,orderTeaching}.ts`,
`src/services/orderComputers.test.ts`.
Extended: `tempoCount.ts`, `planRace.ts`, `thinkAloud.ts`, `positionFacts.ts`,
`reviewFacetRank.ts`, `reviewFullData.ts`, `learnBoardTeaching.ts`,
`learnTurnDoor.ts`, `computerRoles.ts`, `coachFeatureService.ts`,
`components/Coach/CoachTeachPage.tsx` (one prop).

## Tests

`src/services/orderComputers.test.ts` — 31 cases on real chess.js-validated
positions (QGD …dxc4 after Bd3, the Kan's Bxf5 exf5, 1.c4 e5 2.Nc3, the Nimzo
…Bb4+ held until Nc3, the Nimzowitsch 3.dxe5 Nxe5 4.f4, a Lichess back-rank
puzzle, the reversed Sicilian, the Alapin-as-Alekhine), each computer with a
negative case where it must stay silent, plus the three wiring paths shown to
carry the fact out with a real proof and (Learn) the held row.
