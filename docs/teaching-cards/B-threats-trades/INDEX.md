# Family B — threats and trades: card index

Saved data only. The run on saved boards: `src/scratch-B/run.test.ts` (deleted after the run; chess.js only, no engine) over David's 12 games in `audit-reports/teaching-census-data/g-*.jsonl` — 804 plies, 56 student moves and 69 opponent moves costing ≥ 100 cp (cost = the saved read before minus the saved read after, mover's seat).

computer | slots ready (L/C/B/H) | lessons found | build edits | open questions
---|---|---|---|---
computeMustDefend | L partly, C partly, B no, H no | 11 (MD1–MD11) | 6 | 2 (Learn cp floor; ignored-threat vs costReason line)
detectNewThreat | L partly, C yes, B partly, H no | 9 (NT1–NT9) | 5 | 1 (wrong-method answer below mistake cost)
buildOpponentIntent | L no, C partly, B partly, H no | 4 (OI1–OI4; mostly a refutation source) | 3 (delete the renderer) | 1 (chat silence on quiet boards)
pictureCounterplay | L partly, C partly, B partly, H no | 11 (CP1–CP11) | 4 | 1 (cp floor 50 vs mistake)
theirTarget | L partly, C partly, B partly, H no | 5 (TT1–TT5) | 3 | 1 (silence on a correct defence)
readTheirMove | L partly, C yes, B partly, H no | 10 (RT1–RT10, 7 reads) | 5 | 1 (their mistake when the student punished it)
theirMoveCost | L partly, C partly, B no, H no | 7 (TC1–TC7) | 4 | 1 (naming the knight route in Learn)
theirMoveStructure | L partly, C partly, B no, H partly | 6 (SM1–SM6, 5 reads) | 4 | 1 (lesson about an earlier student move)
counterThreat | L yes, C yes, B partly, H no | 5 (CTH1–CTH5) | 4 | 1 (drop the credit line)
threatStoppedBy | L partly, C partly, B partly, H no | 5 (TS1–TS5) | 3 | 0
threatPurpose | L partly, C yes, B no, H no | 6 (TP1–TP6) | 3 | 0
mateThreatLever | L yes, C yes, B no, H no | 5 (ML1–ML5) | 3 | 0
detectLatentDanger | L partly, C partly, B no, H no | 7 (LD1–LD7) | 4 | 0
detectTradeCreatesPin | L yes, C partly, B no, H partly | 4 (TPN1–TPN4) | 4 | 0
provenThreatLine | L no (proof only), C yes, B no, H no | 3 (PT1–PT3, consequence slot) | 3 | 0
obligationLifted | L partly, C partly, B no, H no | 3 (OL1–OL3) | 3 (incl. delete the readTheirMove twin) | 0
habitsOf | L yes, C partly, B n/a, H yes | 4 (HB1–HB4) | 3 | 1 (within-game counts = record recital?)
opponentHabits | L yes, C partly, B n/a, H yes | 4 (OH1–OH4) | 3 | 1 (shared with habitsOf)
tradeJudgement / readTrade | L partly, C partly, B no, H no | 10 (TJ1–TJ10) | 5 | 1 (trade floor 50 vs 100)
exchangeIdeas | L yes, C partly, B partly, H partly | 10 (EI1–EI10, 16 reads) | 4 | 0
tradeRelievesCramp | L yes, C partly, B partly, H no | 5 (CR1–CR5) | 4 (incl. a board-truth fix) | 0
defenderTradeMade | L yes, C yes, B partly, H no | 5 (DT1–DT5) | 3 (add missed/allowed forms) | 0
tradeKeptAt | L yes, C yes, B n/a, H partly | 6 (TK1–TK6, via the inverse) | 3 | 0
settledExchange | L no, C yes, B no, H no | 6 (SE1–SE6) | 3 | 0
recaptureChoice | L partly, C yes, B partly, H no | 7 (RC1–RC7) | 4 | 0
tensionKept / tensionReleased | L yes, C yes, B partly, H no | 7 (TR1–TR7) | 5 | 0
fileTradeAt | L yes, C yes, B n/a, H no | 4 (FT1–FT4, via inverses) | 2 | 0
tradeOfferAt | L yes, C yes, B n/a, H no | 3 (TO1–TO3, via the inverse) | 2 | 0
readConversion | L yes, C partly, B no, H partly | 8 (CV1–CV8) | 3 | 1 (decided-game silence)
characterTurn | L yes, C yes, B n/a, H partly | 6 (CH1–CH6; mostly the consequence slot) | 3 | 0
