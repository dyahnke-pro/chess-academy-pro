# Family F — structure & plans — INDEX

computer | slots ready (L/C/B/H) | lessons found | build edits | open questions
---|---|---|---|---
findColorComplexWeakness | L partly / C partly / B no / H no | 14 (CC1-CC14) | 6 (new colourConceded(fenBefore,san) w/o the ≥2-hole gate; DrawbackKind colour-conceded; expose settle square; pawn targets count toward gate; delete count renderers) | tag choice; speak at 69cp?; pawns-onto-colour rule
chainBase | L yes / C partly / B no / H no | 7 (CB1-CB7) | 4 (expose lostBefore/defenders; new missedChainBase trigger; costReason allowed+isChainBase → recipe) | GUARDED good move Review-only?
frozenTarget | L yes / C yes / B no / H partly | 8 (FT1-FT8) | 4 (expose weakness kind + why-frozen; new frozenBy(fenBefore,san) trigger; recipe on pawn-weakened; cut the roll-call) | defend-elsewhere judgement; seat check vc-_zT8aWZh2x0-44
pawnCentre | L partly / C partly / B no / H no | 6 (PC1-PC6) | 4 (new centreConceded(fenBefore,san); expose starved pieces; recipe on space-conceded; stop standing text in Learn) | speak on inaccuracy?
centreDuo | L partly / C partly / B no / H no | 4 (CD1-CD4) | 3 (keep all duos; new deformedBy trigger; recipe on pawn-weakened+duo) | shared "recapture toward the centre" wording
pawnBreak | L partly / C partly / B no / H no | 10 (PB1-PB10) | 5 (type every dropped field; SEE on struck + lone pawn after; new meetBreak 3-ways; recipe on mistimed-pawn-break / file-opened) | take-first as option or only as engine best
leverPasser | L partly / C partly / B no / H no | 5 (LP1-LP5) | 4 (expose inside/outside/toQueen; new allowedLever trigger; Learn refusal → pastBetterNameable; recipes passed-pawn-neglected + allowed-passer) | LP1 at inaccuracy?
pawnMajority | L yes / C partly / B no / H no | 6 (PM1-PM6) | 3 (toQueen + king race; recipes on pawn-weakened / passed-pawn-neglected; renderer Review-only) | book-trade exception
inaccessibleHole | L yes / C yes / B n/a / H no | 4 (IH1-IH4) | 3 (stop discarding the reach<4 case → holeMade = outpost-conceded trigger; keep minor+route; IH1 as guard row) | merge with holeAccess?
harmlessWeakPawns | L yes / C n/a / B n/a / H n/a | 3 (HW1-HW3) | 3 (expose eval; register as guard row on pawn-weakened; expose aimable pawns) | —
squareForPiece | L yes / C partly / B partly / H no | 4 (SP1-SP4) | 3 (expose safe counts; stop before-move speech, trace truncated said line; recipe on no-plan) | who spoke "The plan with g4 leaves a hole on f4."
secondFront | L yes / C partly / B partly / H no | 4 (SF1-SF4) | 2 (expose switch move; recipe on no-plan) | —
blockade | L yes / C partly / B no / H no | 7 (BL1-BL7) | 4 (pushTo/toQueen on lifted; new blockadeMissed; DrawbackKind blockade-lifted; recipe) | new tag vs passed-pawn-neglected
passedPawnPush | L partly / C partly / B partly / H no | 4 (PP1-PP4) | 4 (typed return; both seats; delete before-move "push it"; recipe on passed-pawn-neglected) | knight-poor-blocker vs knight-best-blockader wording
describeStructure | L no / C no / B no / H no (data source) | 4 via a diff (DS1-DS4) | 2 (new structureDiff(before,after) shared change reader; delete the structure-state description fact) | —
namedStructureFormed | L yes / C n/a / B partly / H no | 4 (NS1-NS4) | 3 (typed planMoves per rule; export structuresOn; recipe on no-plan/mistimed-break) | say the plan when engine best ≠ plan move?
readPosition | L partly / C partly / B no / H no | 15 kinds-rows (RP-K1..RP-REC; full pilot grid kept) | 5 (typed payload per kind; lever consequence via pawnBreak meetBreak; new readPositionDiff trigger; Learn only via recipe; delete leverStem) | king exception in Learn?; bishop-pair cause
boardPlanFacts | L partly / C partly / B yes(after move) / H no | 4 (BP1-BP4) | 3 (leverOfMove matcher; Record<LeverKind,tag>; before-move plan out of Learn) | chat keeps before-move plan?
structurePlanFact | L yes / C partly / B no / H no | 6 (SPF1-SPF6) | 3 (type stopper/blocker/race; expose announce/changed event w/ move; recipe IQP trade) | new cause traded-into-target?
strategicReason | L yes / C partly / B yes(after) / H no | 4 (SR1-SR4) | 4 (return the lead fundamental; fill 10 null reasons; drop before-move "The plan here" from Learn; SR1 = BM slot for every positional tag) | wording of missing reasons
planSteps / planOfTheBoard | L partly / C partly / B yes(after) / H no | 4 (PS1-PS4) | 4 (return gate verdict + runners-up; planFollowed dual-use check; planSteps out of before-move Learn; recipe on no-plan/misplaced-piece) | PS1 when starts>0
planThreadTurn | L partly / C yes / B no / H yes(method) | 5 (PT1-PT5) | 4 (type theirStep; answeredStep check; Learn only after mistake; new cause ignored-pressure + method as HABIT) | ignored-pressure cause?
planChoice | L partly / C partly / B partly / H no | 3 (PCh1-PCh3) | 3 (return gap+aims; planChoseWeaker check; before-move line out of Learn) | speak at 80-99cp?
planRaceClause | L yes / C yes / B no / H no | 5 (PR1-PR5) | 4 (return typed race; register follows surface — today always review/past tense; raceFlipped trigger; recipes per race kind) | —
pawnSquareTaken | L yes / C yes / B n/a(credit) / H no | 3 (PST1-PST3) | 3 (pawnSquareLost trigger; recipe on space-conceded; credit Review-only) | —
gameArcSteps | L partly / C partly / B no / H no | 4 (GA1-GA4; Review-only, hindsight) | 2 (carry the drop cause; Review recipe on no-plan) | —
buildMiddlegameOrientation | L yes / C partly / B no / H no | 4 (MO1-MO4) | 3 (expose wrong-way push + wing counts; "your opponent's" → "their"; recipe MO1) | —
picturePlan | L no / C partly / B yes(after) / H partly | 7 (PP-1..PP-7) | 3 (delete "So the quiet X" lead; refuterGroups; recipe on answered-by-tactic/held-by-defender) | —
pictureTarget | L partly / C yes / B partly / H yes | 5 (TG1-TG5) | 3 (traits into LESSON; recipe on missed-weak-target/missed-plan-route; before-move target out of Learn) | —
pictureLedger | L no / C partly / B no / H partly | 4 (LG1-LG4) | 3 (ledgerDiff itemiser; delete balance-sheet text from Learn; recipe by trait) | —
priority (buildPriorityFirst) | L yes / C yes / B yes / H partly | 4 (PF1-PF4) | 3 (before-move package out of Learn, keep resolve miss form; one producer with pictureTarget for missed-weak-target; run for O) | —
linesStructure | L yes / C partly / B partly / H no | 3 (LS1-LS3; Review/chat mostly) | 2 (remove before-move reads from Learn; type labels+gap) | LS1 ever in Learn?
boardStructure | L yes / C yes / B no / H no | 6 (BS1-BS6) | 3 (boardStructureDiff trigger; type keyPawn/secondWeakness counts; standing reads out of Learn) | —
studentMoveStructure | L partly / C partly / B yes / H no | 11 (SM1-SM11; 9 mistake reads already teach) | 4 (split texts into typed slots; heldForm → pastBetterNameable after the move; route 9 mistake reads by cause, 14 credits out of Learn; fix same-idea 166) | credits in Learn?
findMinorityAttack | L partly / C partly / B partly / H no | 4 (MA1-MA4) | 4 (counts + weakAfter + half-open; name the recaptured pawn; before-move lever out of Learn; recipe on no-plan/mistimed-break) | —
