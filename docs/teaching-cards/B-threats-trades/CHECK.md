# Family B — checker pass (2026-11-23)

card | what changed | rows added | rows cut | still unbuildable
---|---|---|---|---
computeMustDefend | fixed 4 line cites (167→175,166→172,165→174,168→176); B2 adds dropped HangingPiece.defended; exchange-line not free (legalSeeGain must return it); H Q2 moved to F7 | MD12 (mate first), MD13 (guarded vs hanging) | 0 | exchange[] needs legalSeeGain change
detectNewThreat | NT-IGN condition was wrong (describeThreatPrevention null ≠ not met, 7854) → standing-threat test via F1; NT1 stem hard-coded 'knight' for any forker → {forker}; 2 line cites | NT10 (bluff/over-reaction, Review mostly) | 0 | NT-IGN needs F1 (standing flag)
buildOpponentIntent | 3 line cites fixed (55–95→55–86, 64→66, 93→83, 66–68→69–79) | 0 | 0 | — (rows depend on other computers' reasons, stated)
pictureCounterplay | 3 line cites fixed (breakOpen 899, counterplaysOf 931/926 via 1038, 867) | CP12 (second resource) | 0 | CP12 needs F3 (full list exported)
theirTarget | 4 line cites fixed (stays 305, moveHit 314, runner-up 356, registry 6250/6251) | TT6 (double attack via runnerUp) | 0 | TT6 needs F1 runnerUp
readTheirMove | obligationLifts gate was inverted in B1 ("student guarded it" → the student LEFT it hanging, 278); 6 line cites fixed (446→448, 449→451, 452→455, 194→193, 220→209, 366→377, F4 516→519) | 0 | 0 | — 
theirMoveCost | 8 line cites fixed (helpers 40/45, interface 23–29, gates 70/87/89/123/137/158, returns 96/124/140/159); TC1 Learn variant now uses heldText (hop = student's future move) | 0 | 0 | — 
theirMoveStructure | 4 line cites fixed (146, 357, 362–366, 374); SM3 condition made deterministic (hole square = blow square; no 'earlier move' claim) | 0 | 0 | SM1 needs F1 forkSquare
counterThreat | 5 line cites fixed (interface 20–28, 41, 50–51, 54–57, 62–69); B4 notes king excluded from hit | 0 | 0 | CTH3 needs F2 zwischenzug scan
threatStoppedBy | 8 line cites fixed (stillWorks 34, interface 28–33, gates 65/77–82/84/140/146) | 0 | 0 | TS1/TS4 need F1 mechanism enum
threatPurpose | 7 line cites fixed (apparentTarget 21, piecesWonByMover 117, 41, 52/63, 57–65, 53/64/154/155/124–150); B4 notes a capture's apparent target is its victim (TP1 can't fire on captures) | 0 | 0 | TP1 needs F2 defendedApparent
mateThreatLever | 5 line cites fixed (27–56, 32/34/36, 35–39, 40–43, 44–47); flagged gain = whole line swing, not proven caused by the defence (ML1 wording needs F1 gives) | 0 | 0 | ML1 'stopping it costs you' needs F1 gives
detectLatentDanger | 7 line cites fixed (104–166, 27–44, 117–121, 164, gates 125–141, +123 enemy-first gate); LD4 'frozen, can't move at all' false for sliders on their own line → guarded | 0 | 0 | LD1 guard needs F1 wins; LD-OPEN needs F2 openedBy
detectTradeCreatesPin | 6 line cites fixed (196, 215, 198/219, 183) | 0 | 0 | every row needs F1 createsPin (no played-move form exists; no proof board possible yet)
provenThreatLine | 4 line cites fixed (hits 52, cheaper 67, free 61, 35–43, 106) | 0 | 0 | PT1 needs F1 ProofFacts
obligationLifted | twin's extra gate was described inverted (student LEFT it hanging, opponentMoveReads 278, not guarded) → F1 field renamed leftHangingByStudent; 5 line cites fixed (15–23, 38, 50–52, 56–61) | OL4 (got away with an ignored threat, Review) | 0 | OL1 needs F3 spentOn
habitsOf | 4 line cites fixed (250–277, gates 225/230/238/259); FOUND: sound gate defeated in Learn/lessons (thinkAloud 345/352, boardBundle 469–470, moveThoughtFacts 583–584 pass empty sound set) → new F3 | 0 | 0 | HB1/HB2 need F1 instance lists; HB1 false on sacrifices until F3
opponentHabits | inherits the defeated sound gate (F1 now points at habitsOf F3); registry line 5927 | 0 | 0 | OH1 needs F2 tookBy
tradeJudgement | 14 line cites fixed (readTrade 189–386, helpers 58/83/102/135, TradeRead 32–44, good/bad[0] 338–342, edge0 300, gates 214–216/234/238/335/336/306–328/351–356, tradeJudgement 22/41–46/53–64/67–69) | 0 | 0 | TJ1 needs F2 colourTargets
exchangeIdeas | cites verified correct; B4 adds the three inconsistent meanings of costCp=null (275/420/438 pass, 224 refuses, 749 not-costly); F1 gate now also refuses null | 0 | 0 | EI4 needs F3 missed form; EI1 counts need F2 facts
tradeRelievesCramp | 7 line cites fixed (interface 31–40, gates 57–58/59–71/78/84/85–91, F1 95, registry 7713); verified the board-truth defect is real (target words from m.captured inside the line) | 0 | 0 | CR1 needs F3 before/after diff
defenderTradeMade | 4 line cites fixed (constants 43–51, DefenderTrade 67–77, DefenderJob 53–58, 218–219) | 0 | 0 | DT1/DT2 need F1 missed/allowed forms; no mistake board yet
tradeKeptAt | 4 line cites fixed (reasonFor 87–145, constants 33–38, TradeKept 46–53, 174) | 0 | 0 | every mistake row needs F1 tradeReasonAgainst (no TK-TRADED board yet)
settledExchange | cites verified correct (389–409, 27–55, 402–407, registry 2201) | 0 | 0 | SE2 needs F1 retakeCost
recaptureChoice | 5 line cites fixed (RecaptureFacts 16–25, readRecapture 73, options[0] 148, 145); B4 notes the no-fault rule is the caller's and a caller breaks it | 0 | 0 | RC1–RC5 need F1 typed plus/minus
tensionKept-tensionReleased | 9 line cites fixed (constants 52–54, bestQuiet 170, recaptureFor 78–96, TensionRead 37–50, gates 205/176/215/245/182–184, registry 7851/7871) | 0 | 0 | — 
fileTradeAt | FOUND: praise gate is MISTAKE_CP (100), so inaccuracies (the run's Rf1 at 80cp) are praised — new F3 → INACCURACY_CP; 2 line cites (FileTrade 26–28, 62) | 0 | 0 | FT1/FT2 need F1 inverses; no mistake board
tradeOfferAt | 4 line cites fixed (constants 21–23, TradeOffer 25, leadOf 51, gates 47/52/55/59–69) | 0 | 0 | TO1 needs F1 offerDeclined; no mistake board
readConversion | 5 line cites fixed (kingOpen 160, CONVERSION_EDGE 43, steps 30, ConversionRead 32–42, gates 101/69) | 0 | 0 | CV1–CV6 need F1 stepKept
characterTurn | 11 line cites fixed (characterOf 70, stepCharacter 141–147, provenTacticLive 66, sharpGap 48, looseOnBoard 166, SWITCH 92, TACTICAL_WHY 124, constants 38–43, CharacterStep 114, quietBalance 73, pending 142/144, BoardKind 212/239) | 0 | 0 | CH1 needs F2 causedBy; no run board (needs story state)

## Family-wide

- **New cause kinds not in `MistakeCauseKind`.** The family's §E/§F propose ~15 causes the errorWhy card's exhaustive D0 list does not have (`threat-ignored`, `allowed-counterplay`, `decoy-defended`, `mate-threat-lever`, `opened-pin`, `key-defender`, `cramp-trade`, `trade-doubles`, `wrong-recapture:<kind>`, `bad-trade:<key>`, `conversion-trade`, `missed-counter-threat`, `released-tension`, …). Each must either become a D0 member (with its `Record` row) or map onto an existing one (`allowed-capture` / `allowed-tactic` + motif / `positional` + tag). Until then those rows have no deterministic trigger in `mistakeLesson`.
- **Good-move readers praise mistakes.** Three gates in this family let a costly move be praised: `exchangeIdeas` (5 reads ungated, and three meanings of `costCp = null`), `recaptureChoice` (caller does not honour the no-fault rule), `fileTradeAt` (gate at 100 cp, so 50–99 cp inaccuracies are praised). Under mistakes-only, every praise form must be gated at `INACCURACY_CP` and refuse an unknown cost.
- **Most §D mistake rows need an inverse ("missed"/"allowed") form that does not exist.** detectTradeCreatesPin, tradeKeptAt, fileTradeAt, tradeOfferAt, defenderTradeMade have NO proof board for any mistake row; the build must add the inverse functions (each card's F1) before those rows can be proven.
