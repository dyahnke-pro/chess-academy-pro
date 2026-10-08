# F04 Compare: how the reference coach teaches traps and gems, against our trap systems, plus hand-build lists for the Bishop's Opening and the Jobava London

Code was read in /home/user/wt-work (read-only, HEAD `ea7ddeaf0`; other sessions are editing coachApi.ts and reviewOpeningTheory.ts, so I re-checked those lines at the end). Note numbers are indexes into `public/data/voiced-teachings.json` `notes[i]`.

**How the engine numbers were made:** Stockfish 18 (single-thread WASM), depth 18, one line. Evals are in pawns, from the student's side (White), after the reply shown. Shares are Lichess blitz, rapid and classical games, pulled through the app's `/api/lichess-explorer` proxy:
- **lo** = 1000–1400
- **hi** = 1600–2000

**Not done yet** (owed when the lists are built by hand):
- A theory check against published sources.
- A `proofCut` ledger at the quiet end of each line. I used material counted along 14–20 plies of the engine line instead.
- The narration.

Raw results are in `/tmp/claude-0/-home-user-chess-academy-pro/61fdf752-44c7-57cb-be1e-44a85a8d5754/scratchpad/f04/`: `verify-{bishop,jobava,jobava-b,extra,extra2,extra3}.json` and `explorer-cache.json`.

## 1. Corrections to the brief (measured)

1. **The first gem loses.** In 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Bxf7+? Kxf7 5.Ng5+, Black answers 5...Qxg5! (lo 77.8% / hi 87.9%) and White is −5.06. The e7 square is empty, so the queen reaches g5, and nothing guards g5. Even after the line the brief gives, 5...Ke8? (14.4/7.0%) 6.Qxg4, White is only +2.03 — a pawn. Under F04 this is a PATTERN with conditions, not a trap (see P1 in §5).
2. **"Bishop's Opening: zero gems" is true only by opening id.** `getPunishGemsForOpening` filters on the id (punishGems.ts:107-110), and `gemTrapChoices('bishops-opening')` returns `[]` (gemTrapMenu.test.ts:40). But 62 mined gems sit on positions reachable in Bishop's move orders, 25 of them weapon-tier. The live lanes are keyed by position (gemCrushLines.ts:116-139), so they would already fire there. The Jobava has 0 gems by id and only 1 by transposition, and that one is not a weapon.
3. **The gem bar changed.** The code bar is now `TRAP_BAR_CP = 300` (punishGems.ts:66-70): 69 of 389 gems are weapons (344 mined + 45 gambit), all 69 are narrated, across 36 openings. But 20 of those 69 end their stored line with less than 3 points of material (an exchange or two pawns). So "≥ 300cp" and F04's "at least a piece" still disagree on 29% of them.
4. **The unlock ladder is no longer the blocker.** `areWeaponsUnlocked` returns true (wlppLadder.ts:62-64). Today a gem can be heard only from the opening page of those 36 openings: the gem's Watch or Learn, or its locked Play line (OpeningPlayMode.tsx:435). It never comes up in Learn's live game (see G11).
5. **The Jobava's hand-written "traps" are not traps.** There are 5 "Weapon:" lessons in `src/data/lessons/pro<RC>JobavaTrapLessons.ts` (`<RC>` stands for the reference coach's name). None wins material:
   - Four end level on material.
   - The fifth (Bd6) stops mid-exchange (Bxd6 is played but ...Qxd6 is not), so it is level too.
   - The first one is a 3.e4 French line, not the Jobava. It marks the main-line 4...Nf6 as "??" and names a top grandmaster with three ratings (:33).
   - :36 says "exf6 closes Black's bishop diagonal". There is no legal exf6 there (Black's e-pawn is on e6), and the main recapture, ...Qxf6, is never mentioned.
6. **Across all the hand-written trap lessons, few clear the bar.** Of the 57 lessons my parser could read in 16 `*TrapLessons.ts` files (the RULEBOOK says 17), only 18 end in mate or a piece won.

## 2. Our trap systems (each defines "trap" its own way)

| # | System | Bar | Reads / writes |
|---|---|---|---|
| 1 | Mined + gambit gems (punish-gems.json, gambit-punish-gems.json → punishGems.ts:66-100) | confirmed ≥ 300cp; known slip = confirmed or positional (:78-86) | Opening page (OpeningDetailPage.tsx:1742-1745), chat chips (gemTrapMenu.ts:72-85, coachApi.ts:4485), punish stage (gemPunishLessons.ts:184-209), Learn (findLivePunishment gemCrushLines.ts:747, trapAheadAt :564, teachableSlipAt :167), Review (reviewFullData.ts:990, coachFeatureService.ts:2960), OpeningPlayMode.tsx:435 |
| 2 | 16 hand-written `*TrapLessons.ts` files | `kind:'trap'` set by hand | Opening page named traps (OpeningDetailPage.tsx:907-985) and pro trapLines (:1143+) |
| 3 | repertoire / pro trapLines + trap-line-classifications.json + trap-engine-verification.json | 'trap' ≥ +200cp (trapEngineBacking.test.ts:42-52) | Chat downgrade (coachApi.ts:4392-4408) |
| 4 | openingTrapDetector + positionTrapScan | popular ≥ 40 games, ≤ −200cp (openingTrapDetector.ts:21-31) | Hands an LLM prompt with game counts and points (openingTrapDetector.ts:120-125 → CoachGamePage.tsx:3593-3603, coachService.ts:876, envelope.ts:763) |
| 5 | gemFinder (runs live per lesson, CoachTeachPage.tsx:1059) | +100cp and 2 pawns (gemFinder.ts:50-54); has an engine-only fallback with no human frequency (:79-86) | Bakes gems into the lesson tree |
| 6 | engineDeltaLines.detectEnginePunish | 150cp and 1 pawn (engineDeltaLines.ts:140, :195) | OpeningPlayMode.tsx:445 |
| 7 | openingBlunderService | Lichess puzzle themes 'opening' + a tactic theme (openingBlunderService.ts:19-37, :165-190) | /tactics/opening-traps (App.tsx:667); writes only the puzzle rating (OpeningBlundersPage.tsx:312-319) |
| 8 | openingGenerator punish stage | gems first (:4002), then puzzles found by ECO tag "NOT the opening's trap lines" (:3755-3757) | Coach stage |
| 9 | trapLearning (warn → test → green) | — | Record tag 'missed-opponents-threat' (trapLearning.ts:23); written only from Learn (CoachTeachPage.tsx:9076) |
| 10 | forkTrick | — | `trickSidestepped` is called (positionFacts.ts:896/900, learnBoardTeaching.ts:796, reviewFullData.ts:1111). `forkTrickFor` (:81) has no caller of its own, so the student's own fork trick is never said |

- **The parity test covers only one pair.** `trapBarParity.test.ts` checks that #1 agrees with the audit helper; nothing else is held to the bar.
- **Engine reads are separate (against D7).** #4, #5 and #6 each make their own engine reads.

## 3. How the reference coach teaches traps

**Setting a trap: only with a move that is sound anyway.**
- "It makes a perfectly sound theoretical move while quietly laying a snare" (2444, vc-HAMhInc37gI-8; also 4579).
- "the quiet c3 first. It looks like nothing, but it lays a trap" (62).
- "the best defensive moves both improve your position and set a trap" (343).
- Bc4 against the Philidor "sets an immediate trap" (1181).

**He refuses gimmicks.**
- "I don't want to make gimmicky trap-setting moves unless you're losing" (4517, vc-_X7t6o3o6JM-21).
- On trying to trap a bishop by overplaying the queenside: that is playing "for gimmicks" (2960).

**Patterns come with their conditions.**
- "The precondition is a bishop on c4" for the centre fork trick (6631-6634).
- Queens facing each other, kings uncastled, the enemy queen guarded only by its king: then the Bxf7+ deflection works (7150).

**When the opponent walks in, he names it and plays the refutation, including the simplest one.**
- "There it is … a Noah's Ark trap attempt … you can just take on b5 … And there's a direct refutation — the bishop to d5!" (2527).
- "And the trap springs — a knight to b5 … strong players walk right into it" (6157), then "don't overthink it" (6158), then castle long with check (6159).

**He credits a correct defence.**
- "Black finds the correct reply" (63).
- "a good way to sidestep the traps" (118).

**Avoiding a trap: the tempting move, why it is what they want, then the move that does the same job safely.**
- The tempting Bc3 "is exactly what Black wants" (5346); Nc3 instead: "same square, but no pin" (5347).
- "not the more natural square, which would walk into a fork" (5077).
- "don't take the bait" (5078).
- "two obvious candidate moves both fail" (7133-7134).
- "grabbing the offered pawn is a blunder" (4319).

**Each trap becomes a rule the student keeps.**
- "never lean on a pin alone to keep your queen safe" (3117).
- "back up to the last move where you had a choice" (3219).

**How often, in words, never numbers.**
- "strong players walk right into it", "a trap a lot of beginners miss" (2913).

## 4. Gaps

Each gap gives what he teaches, what we say (tape quote or template), the computer that should produce it, and the F01 verb.

**G1. Saying that the student's move sets a trap.**
- **He:** 62, 2444, 343, 6157.
- **We:** nothing. In three Learn games no gem or trapAhead lane spoke at all (learn5.log:76).
- **Computer:** the data exists. The gem index is keyed by position (gemCrushLines.ts:116-139), and `trapAheadAt` (:564) works for either side to move. But its only Learn caller returns null unless the student is to move (learnBoardTeaching.ts:541). MISSING: a "trap set" lane that runs after the student's move, and a `setup` field in the library so bait moves can be stored (Légal's Nxe5, the Jobava's Nb5).
- **Verb:** PLAN + CONSEQUENCES.

**G2. The opponent walks in: name it, show the refutation, say why.**
- **He:** 2527, 6157-6158.
- **We:** "That's a known trap at club level. Hold on — your opponent just slipped. There is a punish right here. Can you find it?" (gemCrushLines.ts:801-802 + :737). After the student's move: "That's the punish. …" or "That was the chance — …" (:942-943). Never heard on any tape.
- **Computer:** exists (findLivePunishment :747, gemResolution :928). Missing: the pattern name and the mechanism. Also, every student is asked, while F05 limits questions to a long-standing weakness (D3).
- **Verb:** IDENTIFY + CONSEQUENCES.

**G3. Name the trap or pattern (V10).**
- **He:** "a Noah's Ark trap attempt" (2527); "the center fork trick" (6631).
- **We:**
  - "after Bg4, punish with Bxf7+" (chat chips, coachApi.ts:4388-4391)
  - "Punish X with Y" (punishGems.ts:252)
  - "If White tries X here — natural-looking, but a mistake — Black crushes with Y, winning a piece." (gemCrushLines.ts:409)
- **Computer:** MISSING. `PunishGem` has no name or motif field (punishGems.ts:17-40).
- **Verb:** RECOGNIZE.

**G4. Pattern taught with its conditions (F04).**
- **He:** 6631, 7150.
- **We:** the pattern is named only when the engine's best move is the sacrifice, and only for Bxh7+ (greekGift, moveInsight.ts:668-676). No conditions, no failing case. The brief's first gem is exactly that failing case.
- **Computer:** MISSING `sacConditions`: who covers the landing square and what guards the target, from `chess.attackers` plus `proofCut`.
- **Verb:** KNOWLEDGE + RECOGNIZE.

**G5. A pin that breaks with tempo (brief item 7).**
- **He:** 3117; Légal's mate itself.
- **We:** "Remember — a pin freezes the piece in front: it can't move without exposing the more valuable piece behind it, so it can be piled on." (learn5.log:31). Said with no exception.
- **Computer:** `isRealPin` (pinGeometry.ts:135-165) has no test for the pinned piece leaving with check, a bigger threat or a discovery, nor for whether it lands safely. That second part is what kills the first gem.
- **Verb:** KNOWLEDGE.

**G6. An unsound sacrifice explained right after it is played (S12).**
- **He:** 3219, 2960.
- **We:** In Learn, nothing. In opening Watch: "Bxf7+? An unsound sacrifice … Black has everything covered — there is no real follow-up." (punishGemNarration.ts:3457). It names no failed condition.
- **Computer:** MISSING. Needs G4 plus one shared engine read.
- **Verb:** CONSEQUENCES.

**G7. Warn with the mechanism and the safe alternative.**
- **He:** 5346-5347, 5077, 7133-7134, 4319.
- **We:** "Careful here: {move} looks natural, and club players sometimes play it — but it walks into a known trap." (learnBoardTeaching.ts:573). It also draws every move of the punishment as arrows (:553-568) while the words name none of them (G8.5: no marks without words).
- **Computer:** `trapAheadAt` and `trapSpeaks` exist. Missing: the mechanism clause (from the tactic detector on the punish line plus `computePayoff`, gemCrushLines.ts:264-296) and the alternative move (from the shared engine read).
- **Verb:** PREVENT.

**G8. After a warned trap: credit, or show what happened.**
- **He:** 63, 118.
- **We:** silence. The student's answer is only recorded (CoachTeachPage.tsx:9071-9078).
- **Computer:** the record states exist (trapDecision, trapLearning.ts:48-64). Missing the V6 line when the trap was red and the student held it ("you stepped around it this time"), and "that was the trap — here is how they take it" when they fell in.
- **Verb:** RECOGNIZE.

**G9. The student walks into a known trap in Review, Play or an imported game.**
- **He:** names it ("Bg5 is the trap people fall into", 7218).
- **We:** the generic blunder line: "You: that was a blunder, costing about two pawns — the stronger move was bishop to f5 …" (rev-g1.tape:11; that slip is not in the library, but this is the only shape Review has). reviewFullData.ts:996-1019 has a branch for "you avoided it" and one for "they slipped", but none for "you walked in". Only Learn writes trap meetings.
- **Computer:** exists (computeGemCrush :311, noteTrapMeeting :111). Missing: the walked-in branch, and calling the record from outside Learn.
- **Verb:** IDENTIFY + CONSEQUENCES.

**G10. Review credit when a trap was avoided.**
- **We:**
  - When the student avoided one: "Players at your level often play X here — it loses to Y…" (reviewFullData.ts:1001-1007). No credit to the student.
  - When the opponent avoided one: the sentence exists (gemCrushLines.ts:693-696) but has no caller. Its only call passes `opponentPlayedInaccuracy: true` (coachFeatureService.ts:2964-2965), so it is dead code.
- **Verb:** RECOGNIZE.

**G11. The coach never walks into a gem in Learn.**
- **We:** no gem or trap lane in three Learn games (learn5.log:76).
- **Computer:** `teachableSlipAt` (:167) and `pickTaughtSlip` (coachGameEngine.ts:417) exist but are gated by `slipsAllowed` (:239-249):
  - Above 2000, never.
  - On Hard, never.
  - On Medium, the default (appStore.ts:242), only when the student's measured rating is under 1000. With no data the default rating is 400 (ratingBands.ts:65), so only a fresh install qualifies.
  - At most once per game (:439-441).
  - The coach's natural play never reaches a gem position on its own (gemCrushLines.ts:147-156).
- F03 and F10 say the trap record should decide this, not a rating.
- **Verb:** enables RECOGNIZE + IDENTIFY.

**G12. Famous traps sit outside the library the live lanes read.**
- Légal's mate and the Blackburne Shilling exist only as Italian-page lessons (italianGameTrapLessons.ts:35-75). No gem holds either, so no live lane can spring Légal or warn about 5.Nxf7??.
- The Shilling lesson marks 4.Nxe5 "??" (:73). The engine has it at −0.59; the losing moves come on move 5 (A1 in §5).
- **Computer:** MISSING a library entry shape for a bait move followed by a two-step slip.
- **Verb:** PREVENT + RECOGNIZE.

**G13. The poisoned grab: the queen trap seen before it happens.**
- **He:** 5346.
- **We:** told only once it was over: "Their knight to b3 … prepares rook to a1, to hit your queen on a2." then "Watch out — your queen on a2 is attacked and has no safe square — it is trapped." (learn5.log:67-68). Nothing was said when ...Qxa2 was played.
- **Computer:** `findTrappedPieces` needs the piece to be attacked already (tacticsDetector.ts:448-470). MISSING: counting the grabbing piece's exits before the grab.
- **Verb:** PREVENT.

**Defects found along the way:**
- **False claims (D10):**
  - punishGemNarration.ts:1870 calls the Qxe5+ fork (king up the file, knight on e4 below the queen) a skewer.
  - pro<RC>JobavaTrapLessons.ts:33 and :36 (see §1, item 5).
  - The Shilling lesson's "Nxe5??" (italianGameTrapLessons.ts:73).
- **Numbers and rating language (V8 / F10):**
  - `gem.why`: "At your level opponents play Bc5 here in 2% of games … (+5.3)" (mine-punish-gems.mjs:263), shown under each gem at OpeningDetailPage.tsx:2284. "At your level" really means the fixed 1600/1800/2000 bands (mine-punish-gems.mjs:29).
  - The trap prompt "played N times on Lichess, but it's losing by X points" goes to the language model (openingTrapDetector.ts:124).
- **App talk (V5), and a stale reference:** "Drill an opening's Watch and Learn rungs and I'll surface its trap weapons" (coachApi.ts:4496). The rungs gate is retired.
- **Overclaim in chat:** "has real, verified traps" (groundedAnswer.ts:4787) is said over hand-written trap lines, most of which fail F04.
- **One trap, three record tags (R5):** gems are tagged 'missed-tactic' (computerRoles.ts:47); trapAhead is declared with tag null (:90); trapLearning actually writes 'missed-opponents-threat' (trapLearning.ts:23).
- **Hard limits in Review:** gems are checked only up to ply 24 (reviewFullData.ts:988, coachFeatureService.ts:2958), which hides 1 of the 69 weapons. Only one trap is said per Review walk (reviewOpeningTheory.ts:727-732).

## 5. Bishop's Opening trap list (student White)

### Set — traps you can spring

**B1. Légal's mate, Bishop's move order** (priority: replaces the first gem as the f7 flagship). 1.e4 e5 2.Bc4 d6 3.Nf3 Bg4 4.Nc3, then:
- **(a)** 4...h6, 4...a6 or 4...g6 (lo 4.2%, 3.0%, under 1%). 5.Nxe5! is sound (+1.9). Now 5...Bxd1?? is played by lo 52.9/56.9/67.1% (hi 49.4/48.0/68.4%), and 6.Bxf7+ Ke7 7.Nd5# is mate. The correct reply is 5...dxe5 6.Qxg4, a pawn for White.
- **(b)** 4...Nc6 (17.2/19.6%) 5.h3 Bh5 (43.3/63.0%) 6.Nxe5! (+1.89). Now 6...Bxd1?? (38.0/27.4%) is mate; 6...Nxe5 7.Qxh5 is +1.82. This is the same position as the existing Italian lesson, by transposition.
- **Conditions, each engine-checked:**
  - Your queen must be able to reach the bishop after ...dxe5 or ...Nxe5. With ...Nc6 in, a knight landing on e5 guards g4, so play h3 first and take only on h5. Taking at once (5.Nxe5?!) is −2.96: 5...Nxe5! is played by 46.8/66.0%, though 5...Bxd1?? still mates for 43.0/29.7%.
  - No black knight on f6, because it covers d5. (4...Nf6 5.h3 Bh5 6.Nxe5? is −3.33, and ...Bxd1 no longer mates: −3.46.)
  - Your knight must be on c3, to give Nd5#.
- **Status:** TRAP (mate). Reference: 1181.

**B2. The f7 battery after ...Bxf3.**
- 4.Nc3 or 4.h3, then ...Bxf3 5.Qxf3 Nc6?? 6.Qxf7#.
- How often ...Bxf3 is chosen: 26.2/15.1% after 4.Nc3, 67.8/47.6% after 4.h3.
- How often ...Nc6?? follows: 2.2/1.0% after 4.Nc3, 1.3/0.5% after 4.h3.
- **Status:** TRAP (mate), but rare. Defences: ...Nf6, ...Qf6, ...Qe7, ...Qd7.

**B3. Qb3 against ...Bg4.**
- 2...Bc5 3.Nf3 d6 4.c3 Bg4 (26.5/24.6%) 5.Qb3! (engine choice, +0.86).
- Losing replies — each engine line takes b7 and then the a8 rook:

  | Reply | lo / hi | Eval |
  |---|---|---|
  | 5...Qf6 | 20.0 / 12.7% | +2.79 |
  | 5...Qe7 | 10.9 / 6.5% | +3.17 |
  | 5...b6 | 7.9 / 3.6% | +3.57 |
  | 5...Qd7 | 2.7 / 3.3% | +2.95 |

- **Status:** a rook is won by material, but 5...Qf6 and 5...Qd7 sit under the 300cp bar (see D1).

**B4. Noah's Ark, refuted.**
- 3...c6 4.d4 b5 5.Bb3 exd4 6.Nxd4 c5? (27.8/11.6%).
- 7.Nxb5 is +4.00 (engine best); 7.Bd5 wins the exchange. 2527 names both.
- **Status:** the 14-ply line gains a pawn plus the attack, or the exchange (D1).

**B5. Library gems that transpose — alias them, no new authoring.**
- 25 weapons. Examples:
  - 2...Nf6 3.Nc3 Nxe4 4.Qh5 g6? 5.Qxe5+ (5.5%, +4.8)
  - the Vienna 2...Nc6 3.Nc3 Bc5 4.Qg4 family
  - the Italian Møller lines via 2...Nc6 3.Nf3 Bc5 4.c3

**B6. Qh5 against ...Bc5 or ...Nc6 (D4).**
- Against 2...Bc5, 3.Qh5 is −0.21 with best play. But:

  | Reply | lo / hi | Result |
  |---|---|---|
  | 3...Nf6?? | 4.9 / 1.4% | Qxf7# |
  | 3...Nc6?? | 2.1 / 0.9% | Qxf7# |
  | 3...d6?? | 1.2 / 0.7% | Qxf7# |
  | 3...g6? | 15.2 / 4.6% | 4.Qxe5+ wins the c5 bishop (+5.37) |
  | 3...Nh6? | 11.0 / 2.0% | +3.69 |

  In all, 37% (lo) and 12% (hi) of replies lose a piece or more.
- Against 2...Nc6, 3.Qh5: 3...Nf6?? (5.8/3.2%) Qxf7#; 3...g6 4.Qf3 Nd4?? (2.3/0.6%) Qxf7#.

**B7. Boden-Kieseritzky (D4).**
- 2...Nf6 3.Nf3 Nxe4 4.Nc3 Nxc3 5.dxc3. The gambit is unsound: −0.67 after 5...f6!.
- Black's slips:

  | Reply | lo / hi | Eval |
  |---|---|---|
  | 5...e4? | 9.1 / 2.5% | +3.71 |
  | 5...h6? | 4.2 / 1.6% | +3.67 |
  | 5...d6 | 18.7 / 24.5% | +2.82 |

### Pattern — taught with its conditions (F04), explained after an unsound try (S12)

**P1. Bxf7+, Ng5+, Qxg4.**
- **Fails:** the brief's line, 3...Bg4 4.Bxf7+? Kxf7 5.Ng5+ Qxg5! (−5.06).
- **Works:** 2...Nf6 3.d3 Bc5 4.Nf3 Ng4?! (16.9/7.2%) 5.Bxf7+ Kxf7 6.Ng5+ Kg8 7.Qxg4 (+1.43). With d3 in, the c1 bishop guards g5. White wins a pawn and Black loses castling.
- **The check that tells them apart:** does their queen reach g5 through an empty e7? Does anything of yours guard g5? Is the piece on g4 loose?

**P2. The pin that breaks with a bigger threat.**
- Légal's 5.Nxe5 and P1's Ng5+ both break a pin.
- The condition: the piece that leaves must land safely.

### Avoid — traps set for the student

**A1. Blackburne Shilling, Bishop's move order** (priority). 2...Nc6 3.Nf3 Nd4:
- 4.Nxd4! (38.9/42.1%) is +1.27.
- 4.Nxe5?! (25.9/18.5%) is −0.59: dubious, not yet lost.
- After 4...Qg5, these lose:

  | Move | lo / hi | Result |
  |---|---|---|
  | 5.Nxf7?? | 38.2 / 25.9% | mate: Qxg2 Rf1 Qxe4+ Be2 Nf3# |
  | 5.Nf3? | 12.5 / 10.1% | −3.74 |
  | 5.Ng4? | 6.9 / 13.3% | −3.05 |
  | 5.Qg4? | 1.6 / 1.1% | −4.55 |
  | 5.c3? | 1.4 / 1.7% | −4.29 |

  Together that is 61% of lo-band players who reach this position.
- These hold: 5.O-O (−0.57) and 5.Bxf7+ (−0.79; Black's best is 5...Kd8!).

**A2. f7 sacrifices without the conditions.**
- 2...Nc6 3.Bxf7+?? (lo 2.3%) is −3.25.
- 2...d6 3.Bxf7+?? (2.6%) is −3.17.

**A3. Premature Légal.**
- 4...Nc6 5.Nxe5?! with the bishop still on g4 is −2.96 (covered by B1's conditions).

## 6. Jobava London trap list (student White)

After 1.d4 d5 2.Nc3 Nf6 3.Bf4, Black's third move in the lo band: Nc6 25.8%, e6 21.1%, Bf5 18.3%, a6 16.7%, c6 5.2%, c5 3.5%, g6 3.0%.

**The one mechanism:** Nb5 aims at c7. Either Nxc7+ forks the king and the a8 rook, or Bxc7 hits the queen and the rook. 4.Nb5 is sound in every line checked (+0.71 to −0.12). The defence is different in each line, and that difference is what to teach.

### Set

**J1. 3...Nc6 4.Nb5 (+0.71)** — priority.

| Reply | lo / hi | Eval |
|---|---|---|
| 4...Rb8 | 6.1 / 1.2% | +3.52 |
| 4...a6 | 4.1 / 1.2% | +4.61 |
| 4...e6 | 3.5 / 2.7% | +3.75 |
| 4...Bf5 | 3.2 / 2.0% | +3.13 |
| 4...Bd7 | 2.2 / 0.8% | +5.14 |
| 4...Qd7 | 1.8 / 0.4% | +4.09 |

21% of lo and 8% of hi lose. The only defence is 4...e5! (72.9/89.0%) 5.dxe5 (+0.65).

**J2. 3...e6 4.Nb5 (+0.14).**

| Reply | lo / hi | Eval |
|---|---|---|
| 4...c6 | 4.4 / 1.0% | +3.67 |
| 4...a6 | 2.0 / 0.6% | +4.38 |
| 4...Nc6 | 1.2 / 0.3% | +3.75 |
| 4...Bd7 | 1.0 / 0.1% | +3.94 |

About 9% of lo lose. Defences: 4...Bd6 (50.1/36.8%), 4...Na6 (33.6/55.4%), 4...Bb4+.

**J3. 3...Bf5 4.Nb5 (−0.12).**

| Reply | lo / hi | Eval |
|---|---|---|
| 4...c6 | 4.7 / 1.3% | +3.13 |
| 4...Nc6 | 3.1 / 0.6% | +3.13 |
| 4...e6 | 2.8 / 2.2% | +3.33 |
| 4...a6 | 1.2 / 0.3% | +3.57 |
| 4...Qd7 | 1.1 / 0.1% | +3.79 |

About 13% of lo lose. Defence: 4...Na6 (69.2/86.7%). 4.e3 sets nothing here.

**J4. 3...g6 4.Nb5 (−0.03).**
- 4...Bg7??, the natural fianchetto (7.3/7.7%): Nxc7+ Kf8 Nxa8, +3.77. This is the most natural-looking slip in the whole set.
- 4...c6 (5.4/1.1%): +3.87.
- Defence: 4...Na6 (69.6/86.3%).

**J5. The reference coach's line: 3...c5 4.e3 Nc6 5.Nb5** (6156-6159).
- 4...Nc6 is played by 37% in both bands and already costs a pawn (+1.62). That makes it a known slip, not a trap.
- The trap comes after 5...e5 (32.7/60.4%) 6.dxe5:

  | Reply | lo / hi | Result |
  |---|---|---|
  | 6...Nh5?? | 21.4 / 17.4% | 7.Qxh5, a free knight (+3.56) |
  | 6...Nd7? | 14.7 / 11.1% | 7.e6! (+3.24) |
  | 6...Nxe5? | 7.5 / 2.0% | 7.Bxe5 (+5.16) |
  | 6...Ng4? | 3.5 / 5.2% | 7.e6 (+3.54) |

  That is 47% (lo) and 36% (hi) losing a piece or more.
- These hold: 6...a6 7.Nc3 (+1.68, his line), 6...Ne4 (+2.56), 6...Qa5+ (+1.65).
- The other branch: 5...Qa5+ (56.8/35.2%) 6.c3 is +1.89.

**J6. 2...Nc6 3.Bf4 Nxd4?? (lo 5.0%) 4.Qxd4.**
- +3.80: a free knight. The lesson is to count the guards of d4.

**J7. 3...Nbd7 4.Nb5 (+1.06)** — rare, low priority.
- 4...c6 (11.9/2.5%) is +5.24; the only defence is 4...e5.

### Avoid

**JA1. 2...Nc6 3.Nxd5?? (lo 2.2%) Qxd5.**
- −3.45: the queen guards d5.

**JA2. Opening principles, not traps** (from 5072-5079).
- After 3...a6 4.e3 c5 5.dxc5 Nc6:

  | Move | lo / hi | Eval |
  |---|---|---|
  | 6.a3! | 18.6 / 37.1% | +0.48 (engine best) |
  | 6.Nf3 | 35.6 / 38.3% | +0.14 |
  | 6.Bd3? | 22.0 / 8.2% | −0.93 |

- The Be2-not-Bd3 fork (5077) and the ...Qe8 bait (5078) were not engine-checked here.

**Checked and empty** — no natural move loses material:
- 3...c5 4.e3 Qb6 (every natural reply is between −0.53 and +0.84)
- 3...Bf5 4.e3 and 4.f3
- 2...e6 3.Bf4
- 2...Bf5 3.Bf4
- 3...a6 4.e3

**Existing lessons:** delete all 5 lessons in pro<RC>JobavaTrapLessons.ts as traps (see §1, item 5). Keep any true idea as an opening principle.

## 7. Decisions for David

1. **D1 — the bar.** Should "at least a piece" be measured by material at the quiet end (the exchange ledger) or by ≥ 300cp? They disagree on 20 of the 69 shipped weapons, and on B3, B4 and the Nxc7+ forks, which win the exchange first.
2. **D2 — two-step traps.** Légal's real slip is the queen grab after White's own bait move. The miner's model (one slip at a book position) cannot store that. Should the library get a `setup` field?
3. **D3 — the gem question.** The gem callout asks every student to find the punish (gemCrushLines.ts:736-740). F05 allows a question only for a long-standing weakness, and the reference coach names the move and plays it. Should the default be to name and show, and ask only when the record is red?
4. **D4 — trap-setting moves he would call gimmicks.** Qh5 (B6) and the Boden-Kieseritzky (B7, unsound with best play): build them as Set items, as Avoid knowledge only, or skip them? (Reference: 4517, 2960.)
5. **D5 — what decides the coach's slip.** Today it is a rating (`slipsAllowed`). Should the trap record decide instead (grey or red means the coach may slip)?
6. **D6 — the f7 flagship.** Use Légal (B1) as the flagship, and keep the brief's first gem as the failing half of the P1 pattern lesson?
7. **D7 — "at your level".** The library's frequencies come from fixed bands. Which band should be stored, and how should the coach phrase it without a rating?