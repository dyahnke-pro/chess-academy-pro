# P0c-2 inventory — the loose computer, move wording, ThinkingStep (2026-10-04)

## Loose pieces
- EXISTED (private copies): `looseTrigger.ts:20-22` inline filter; `moveContrast.looseAfter` (:31). Both now call the one computer.
- NEW: `src/services/loosePieces.ts` `findLoosePieces(fen | Chess, color?)` — undefended non-king units, both sides, board order, `value`, `attackers`, `attacked`.
- KEPT DISTINCT: `positionReadingService.findHangingBySee` (SEE: loses material now).
- WORDING: `findAttackTargets` (positionReadingService ~:1615) called its SEE list "loose material" → "hanging material" (doc, comment, the `target` answer string, its tier-1 hint). `drillReasons.wrongMoveReason` said "loose — they take it for free" over a SEE list → "hanging — they win material there".
- CHAT: `groundedAnswer.assembleHangingAnswer` → a loose/undefended/unprotected ask now answers from `findLoosePieces` (`assembleLooseAnswer`), and says what is hanging separately (walk defect 13).
- NOT SWEPT (other private "no defender" scans, different questions): causalChain.exploitedLoosePiece, moveFundamentals, deliberation, reviewTeachingPoints, tacticsDetector, kingAttack, pinGeometry, reviewMoveTeaching, boardDelta, missedTacticService, pvPlayback, whyItFailed, pieceValueRead. Candidates for the next sweep.

## Move wording (walk defect 8)
- The ONE helper is `spokenMove.ts` (`sayMoveClause`, `sayMoveNoun`); `fen` is now a REQUIRED second argument (null = no board → old file/rank form). New `sayLine(startFen, sans, form)` walks a line.
- Callers swept: drillReasons (wrong-move + solved line), coachDrillService (`drillSolvedBeat` / `drillContinueBeat` take the board), CoachTeachPage (2 call sites, smallest change), openingAnnouncement (BookDeparture gained `fen`), openingIdentity (null — no board), liveTacticsContext (`sayLine(ctx.fen, …)`), learnBoardTeaching (trap: fen; break summary: null), tacticalRead (every closure takes the ply's board; reply boards computed).
- `voiceService.sanitizeForTTS` still renders raw-text "Nce7" as "c-knight to e7" — it has no board by construction.

## ThinkingStep
- NEW `src/services/thinkingSteps.ts`: `ThinkingStep`, `THINKING_STEPS` (order/name/shortName/tier/tags/layer), `THINKING_STEP_ORDER`, `stepsInTier`, `TAG_STEP` (the re-keyed COACH_TAG_HABIT), `STEP_METHOD_HABIT`, `habitForTag`, `METHOD_HABIT_STEP`, `LIVE_HABIT_STEP`, `LEARN_METHOD_CLAIM_STEP`, `stepForMethodClaim`, `tierProven`, `tierUnlocked`.
- `coachDecider.COACH_TAG_HABIT` deleted; `habitForCluster` joins tag → step → habit. Identical habits for all 26 tags (test pins the old table).
- `groundedAnswer.assembleMethodAnswer` reads its steps/order/names from `THINKING_STEPS`.
