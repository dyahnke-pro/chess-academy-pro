# Family D — checker pass (2026-11-23)

card | what changed | rows added | rows cut | still unbuildable
---|---|---|---|---
errorWhy | 14 line cites fixed (failedRead :1347, caused :1332, consequence ternary :1455, farLoss :1413, single :1383, hunt :1372, allowed-mate :1297, allowed/missedRead :1281-1282, backwardLook :216/:445); E3o Learn variant cleaned; MistakeCause gains still-hanging + gambit-offer; Learn guard on a moved misplaced piece's square; H6 added | E21 (their missed capture: your piece still loose, `missedCaptureStillOn`), E22 (gambit-file offer, inaccuracy) | 0 | E9 walks-into-fork (declared kind, never emitted — needs the new branch + a proof board); E14 missed-win needs the new branch (F4)
moveJob / moveIntent | stopReason :686 (counts :708-709), threatDid :534, does :538, quiet-stop :522, pass loop :290, gone :323-329, mateGone :339, reply-played :349, constants :181-193, unlocked :374 | J13 (stop the mate: back-rank luft, `prevents.mate`) | 0 | J2/J12 StopProof from the engine line (needs `reads.after`/`everyAfter` pv — no saved passBefore reads in g-*.jsonl, so no proof board)
moveStops | winningChecks :41, TheirWant.hit :181 / motif :184, flight :152 | 0 | 0 | MS1–MS5 need `moveLetsIn` (does not exist yet; F1)
findProphylaxis | interface :30, uncached read :239, first-want loop :251-274, gates :242-256; checker ran it on both proof boards (ply 14 → null; ply 20 → kick d5/…e6, not the game's fork); P1 candidate and the F4 proof claim corrected | F4 sensitivity edit: preventions beyond one-step pawn/king step | 0 | P1–P3 have NO proof board (the ply-14 pin and ply-20 fork were created by the move itself — moveLetsIn's, not this computer's)
breakStopped / stopsBreak | B3 truncated sentence finished (breakMissed via `breakDueNow :160`); drops-pawn cites :223 / moveStops :206; breakStoppedLine :236; checker re-ran the c3 board (d5 → their …d5 break, how 'illegal'; moveStops → kick …h6) | §F6 (moved from §H: one break source) | H2 (build question) | B1 `breakAllowed` and the engine-line drops-pawn (F2/F3) not built
breakPrep | breakPrepLine :138, breakDueNow :160, pawnBreak :82, lostBefore :88-94, gates :59-83 | 0 | 0 | BP1 needs `prematureBreak` (F2); no BP1 proof board in the 109
preparesBreakClause | preparesBreakBeat :357, gates :346/:348; H1 (a build question) moved to §F4 with its answer | §F4 | H1 | PB1 needs breakPrep's `aim` (breakStopped F1)
studentMovePoint | studentMovePointFact :864, slipAnswerText :948, MovePointFact :856, takesBack :886, captureRead :911 | 0 | 0 | — (kind field F1)
deepFact | B2/B4 cites corrected (forcedSoFar :160, via :167, stoodStill :196, check :179, same mover :194, deepFactRead :150) | 0 | 0 | DF1 needs the run on their reply line (F2)
bindingFact | binding :374, theirTarget :327, gates :387/:392/:399/:417-419 | 0 | 0 | BF1 needs `missedAnswer` (F2)
intoTheirCamp | B4 rewritten: check/game-over :207, capture/unsafe skip :212-214, `cut-off` fires only on the side's move 12 exactly (`CUT_OFF_MOVE :85`) — a move-number description; infiltration :149 | 0 | 0 | C1 needs the run on their reply (F1)
pieceTempo | newHits :30 | 0 | 0 | —
kickAfterRecapture | cites verified, no change | 0 | 0 | K2/K3: no proof board; `recaptureIntoKick` not built
allowedClause | errorWhy's allowedReason :1283 (readReason :1267) | 0 | 0 | —
lineCut | gates :34 / weights :55-57; L1 Learn variant: the landing square is not said (it is the move just played) | 0 | 0 | L1 blocked-guard needs whyItFailed edit (F2)
pieceCage | had-≥2 gate :96 | 0 | 0 | PC1 needs the reverse-seat call; PC4 bishops not built
describeMoveInfluence | pressReason declared :35, set :58 | 0 | 0 | MI1 needs typed targets (F1)
buildReviewMoveTeachingFact | moverEyes :608, winnableTarget :611-619, minorAttacksPiece :620, opposite wings :561-569, winnable said :819 | 0 | 0 | —
computeMoveFundamentals | openingWindowOpen :329, reasonFor :1533 (not exported) | F12 king-activity (endgame), F13 open-diagonal, F14 prepare-break → breakPrep | 0 | `fundamentalDelta` (F1) not built
principleLine | cites verified | 0 | 0 | —
principleContrastLine | window :1815, played test :1817-1818 | 0 | 0 | —
ruleException | interface :28, hitBy :38, centreClosed :55, lead :102, wasHit :100, twice gate :88/:98; B3 "returns null :108" corrected (falls through, final return :127) | 0 | 0 | RE1–RE3 need `broken` (F1)
pieceMovedAgain | MovedAgain :38-46, FINE_CP :32/:141/:169, winnable landing :146 | 0 | 0 | —
keptHome | gates :292/:294 | 0 | 0 | KH1 inversion not built
opensCheck | B3 (truncated, garbled) rewritten: (a) their road opened on their reply line, (b) the student opened a line to their own king; OC1 Learn variant drops the pawn's name; gates :49/:89 | 0 | 0 | OC1/OC2: neither inversion is computed today
openingTheoryFacts | readBoard :50, aimOf :71, "leaves the masters' moves" :109, constants :20-32 | 0 | 0 | —
openingStoryAt | namesStudentMoves drop :419 | 0 | 0 | OS1 hole fields not typed (F1)
openingEquivalence | verified, no change | 0 | 0 | —
openingAnnouncementForGame | studentJustLeftBook :254, openingNameForBoard :262 | 0 | 0 | —
knownSlip | the Learn contradiction re-stated with the real path (Learn reads it through the registry `readBoardAll('slipsOnLine')` :10153 / lane `knownSlip` :10297, no direct import — why the import gate passes); gates :215/:223; KS1 stem drops "club players play" (share) and its Learn variant no longer names the slip just played | 0 | 0 | KS1 motif (F2)
theirOpeningVerdict / openingSlip | OpeningSlip :76, Shot :69, played-move noun :342 and :307; SL1 better-move job "more flexible" replaced by the shot it avoids | 0 | 0 | SL5 seat-flipped openingSlip not built
positionalReason | concessionReason :123, boardReason :138, bestJobReason :201, movedSan :141, push :151, gaps :150/:196, bars :152-195; PR7 Learn variant: a moved piece's square is not said | PR12 mistimed-pawn-break (bestJob lever → breakStopped aim, silent without it), PR13 defender-left files `missed-opponents-threat` (habit = BF1) | 0 | PR12 needs breakStopped F1 aim
INDEX | counts updated (errorWhy 22, moveJob 13, fundamentals 14, positionalReason 13, prophylaxis 5 edits, breakStopped/preparesBreakClause open questions) | — | — | —
