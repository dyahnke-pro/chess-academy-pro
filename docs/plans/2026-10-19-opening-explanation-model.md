# How a strong coach explains an opening — the model for Learn (David 2026-10-19)

David: "take note of his explanation of the opening." Source: Naroditsky, *Sicilian
Najdorf — Theory Speed Run* (yt `zEqoGIgzk1E`), the first 33 minutes (the part the
app holds as own-words notes in `data/video-narration-voiced/zEqoGIgzk1E.json`).
This is the METHOD distilled — ideas and structure, original wording, never his
sentences (plagiarism guard, CLAUDE.md). It sits beside the agreed opening picture
(the chat of 2026-10-19) and is what Learn's opening phase builds toward.

## The method, in the order he uses it

1. **Name the road as you reach the fork — with the alternatives.** At the real
   decision point (after …Nf6 and Nc3) he stops and lays out the menu: the most
   popular choice, then the others by name and character (Najdorf, Classical,
   Dragon, Scheveningen, the rarer ones). The student learns that this move is a
   CHOICE between families of positions, not a single forced path.
2. **Give the choice a one-line identity.** The name, where it comes from, and
   what makes it what it is — one sentence, once.
3. **Name THEIR setup and its plan.** Not move-by-move: "this is the English
   Attack — the pawn holds e4, then the kingside pawns march once you castle
   there." The student hears what is coming for the next ten moves.
4. **Say which branch you choose and why, against the other main branch.** "The
   other main move is …e6; this line plays …e5 instead — a different kind of
   position." Choosing is explained by what it leads to, not by authority.
5. **Name the built-in cost of your own structure, and the move that pays it.**
   …e5 leaves d5 weak; that weakness is "the drawback of every …e5 Najdorf"; …Be6
   guards d5 and stops the bishop reaching c4. Every structure has its price, and
   the opening's moves are the payment plan.
6. **Announce the middlegame's character before it arrives.** Queen to d2 and
   long castling means opposite-side castling: a race — you storm one wing, they
   storm the other. The student knows what kind of game they are in BEFORE the
   middlegame, so every later move is read against it.
7. **For a non-obvious move: the instinctive move first, then the concrete
   point.** "You would develop to c6 without thinking — the point of the knight
   going to a6 is c7, to chase the bishop off b5." The habit taught: ask what the
   piece is FOR in this position, not where pieces usually go.
8. **Name the structural key move.** …d5 is the break that erases the weak d5
   square by changing the pawn structure — "the seminal idea" of the opening. The
   student leaves with the one structural lever that defines the line.
9. **Walk the branches out loud when the opponent has a real choice.** "If the
   bishop retreats, the pawn traps it; if it stays, the knight wins the bishop
   pair." Consequences, both ways, so the student sees why the position is good,
   not just that it is.
10. **Mark the danger signs specific to the line.** A forkable square to watch
    (b7 with a knight to d7), the back rank once the pieces leave (make luft at the
    calm moment), the desperado that turns a grab into a lost queen.
11. **Judge your own moves honestly.** When a move was impulsive, say so and say
    what had to be played — the coach models self-correction.

## What this means for Learn's opening phase (mapped to the agreed picture)

| His beat | Learn today | To build |
|---|---|---|
| 1 fork with named alternatives | the opening is named after the choice | name the families at the fork, from the DB / masters counts, once |
| 2 identity | `openingIdentity` / `openingEquivalence` | keep |
| 3 their setup + plan | their moves described one at a time | name their system (DB name) + its plan from master games |
| 4 why this branch | — | the chosen branch vs the main alternative, by what each leads to |
| 5 your structure's cost + the move that pays it | weak-square reads exist (`structureJudgement`, holes) | tie the hole to the opening and to the move that guards it |
| 6 middlegame character early | the phase handoff only | announce the race / the structure type when castling sides are set |
| 7 instinctive vs concrete point | `rejectedTempting` partly | own-move reason that names the natural alternative and why the played move is better |
| 8 the structural key move | masters break (`mastersPlanRead`) — currently silent in the opening | say it once as an idea (the break and what it changes), never as "play …d5 now" |
| 9 branches out loud | blocked when they name the student's move | OPEN DECISION for David: consequence form after their choice / on ask / Review only |
| 10 line-specific danger signs | `latentFork`, back-rank reads | keep; tie to the line |
| 11 honest self-judgement | the verdict + why | keep |

## Rules that still bind
- LEARN NAMES NO MOVE UNASKED: beats 3–8 are said as ideas and plans; the
  student's next move is never named unless asked (beat 9 waits for David's call).
- Every chess fact computed (DB, masters counts, engine, the board) — the voice
  only phrases it (G0).
- Original wording; the video is a comprehension source only.

## Baseline across 7 speed runs

Sources: **Naj** Najdorf (zEqoGIgzk1E, Black) · **Sco** Scotch Gambit (Y-a6cV08zDM, Black) · **QGD** Queen's Gambit Declined Exchange-Bf4 (lLkqjBOGgek, Black) · **CK** Caro-Kann Exchange (rkoC8ZlqOII, Black) · **Ala** Alapin 2…d5 (G_V3C8LQ_ik, White) · **Dan** Danish Gambit (pipfrQRET80, White) · **Cat** Catalan-type Semi-Slav (EfHnGTCO1s4, White).

### 1. Beat × video

| # | Beat | Naj | Sco | QGD | CK | Ala | Dan | Cat | n/7 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Fork with the families named | ✓ | ✓ | — | ✓ | ✓ | — | ✓ | **5** |
| 2 | One-line identity | ✓ | ✓ᵃ | — | ✓ | ✓ | ✓ | ✓ | **6** |
| 3 | Their system and its plan | ✓ | — | — | ✓ | — | ✓ | — | 3 |
| 4 | Why this branch over the other main one | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | **6** |
| 5 | Built-in cost of the structure + the move that pays it | ✓ | — | ✓ | ✓ | ✓ᵇ | ✓ | ✓ | **6** |
| 6 | Middlegame character announced early | ✓ | ✓ᶜ | — | ✓ | ✓ | ✓ | ✓ᶜ | **6** |
| 7 | Instinctive move first, then the concrete point | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **7** |
| 8 | The structural key move | ✓ | ✓ | ✓ | ✓ᵈ | ✓ᵉ | ✓ | ✓ | **7** |
| 9 | Branches played out | ✓ | ✓ | ✓ᶠ | ✓ | ✓ | ✓ | ✓ | **7** |
| 10 | Danger signs specific to the line | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | **6** |
| 11 | Honest verdict on his own moves | ✓ | — | — | ✓ | ✓ | — | — | 3 |

ᵃ only in the post-game review · ᵇ the cost he names is the OPPONENT's (their move shuts in a bishop or gives up a square) · ᶜ only at the hand-off to the middlegame · ᵈ late and minor; this line's defining idea is the bishop problem (beat 5) · ᵉ a piece route (Na3–b5–c7), not a pawn break · ᶠ one direction only, never both sides of a choice

### 2. Order

**Typical sequence** (average position across the videos):
**1 → 2 → {5, 4, 7} → 10 → 9 → 6 → 8 → 11**

- 1 and 2 open the phase (1 averages 0.03 of the way through; 2 averages 0.1 by median).
- 5, 4 and 7 come next, mixed move by move: the cost, the choice, and the natural move he rejects, each said at the move it belongs to.
- 10 (danger) and 9 (branches) fill the middle. They follow the opponent's threats, so they can land anywhere.
- 6 splits two ways. It comes early once the castling sides or a queen trade are fixed (Naj, CK, Ala, Dan), or as the last line before the middlegame (Sco, Cat).
- 8 is usually the last idea before the middlegame (QGD, CK, Ala, Cat).
- 11 comes last, and only when a slip happened.

**Exceptions**
- **Dan** opens with 7, 10 and 8, because a gambit's tactics start at once. Its key move (the e5 push) is the immediate threat, so 8 comes early.
- **Sco** saves identity and theory for the review, so 2 comes last.
- **QGD** never names the fork, the identity, their system or the character. Its whole phase is about development order (7 → 4 → 5 → 10 → 9 → 8).
- **CK** announces the character third, right after the fork.

### 3. Pace

| | Opening plies | Plies with teaching | Silent or bare | Where he dwells |
|---|---|---|---|---|
| Naj | ~27 (to …d5) | ~16 | book plies 2–7 named only; routine White moves | the fork (~45 s), the English Attack, the race, …Na6/…Nc7, …d5 |
| Sco | 23 | ~10 | 5 book plies; forced recaptures | first real choice (>1 min); after ply 15, only the opponent's moves |
| QGD | 21 | 6 | every book move; every White move until the hand-off | development-order choices |
| CK | 24 | ~7 deep stops, plus a short grade on most plies | own recaptures and routine moves | bishop problem, Nf6/Bg4 order, the pin, trade on f3, Nc5 plan, g7 drawback |
| Ala | 14 | ~5 deep stops, plus a short clause on every book ply | forced recaptures | the crossroads, the opponent's deviation, own non-obvious moves |
| Dan | ~10 | 3 | book plies 1–4; …Nf6; e5 | Nxc3, …Bb4, …d5 |
| Cat | 23 | ~12 entries, half of them sidelines | routine book moves on both sides | Black's fork, own setup choices, sidelines |

**Pattern**
- Book moves before the first real fork get nothing, or only the move named.
- Forced recaptures and routine development get nothing.
- He speaks at three kinds of moment: the first fork, the student's own non-obvious choices, and the opponent's deviation or threat.
- Real teaching lands on about a third to half of opening plies (from 3/10 to ~16/27). Notes run 1–4 sentences.
- He has two styles. Some videos are silent on book moves (Sco, QGD, Dan, Cat). Others give each book move a one-clause tag (Naj, CK, Ala). Neither style says more than a clause on a book move.
- In 4 of 7 videos (Sco, CK, Ala, Dan) the full theory tree waits for a rewind after the game.

### 4. Core vs situational

**CORE (≥5/7). Learn must always do these:** 1, 2, 4, 5, 6, 7, 8, 9, 10.
- **1** is skipped when the student's own first moves already fix one system (QGD, and a gambit played as White in Dan). Trigger: a real fork among named families exists.
- **9** is used live in 7/7, but only on the opponent's actual choice and only one way. The full tree goes to the post-game rewind in 4/7.

  This is the evidence for David's open decision on beat 9: the consequence form after their choice, live; the full tree in Review.

**SITUATIONAL (3/7)**
- **3 (their system):** triggered when the opponent is running a named, recurring setup with one goal (English Attack; Exchange-Bf4 aiming Nc5 to bury the bishop; the defender's …d5 return in the Danish).
- **11 (own verdict):** triggered when his own opening move carries an engine cost, or a drawback that changes his plan (Naj …Nxd5, CK …Qc7 overloading g7, Ala Na3 vs Bb5).

### 5. New beats the 11 miss

**Recurring (3–4 of 7). Candidates for the core:**

| Beat | Videos | Computer |
|---|---|---|
| Answer the student's worry, or defuse a false alarm, before it lands | QGD, CK, Ala, Cat | `falseAlarm.ts`, `ruleException.ts` (the "twice" rule should also accept `centreClosed`), `tempoCount.ts` tradeLedger, `theirMoveCost.ts`. Partial. |
| A rule stated as a law, with its condition or exception | QGD, CK, Ala, Cat | `principleVoice.ts`, `ruleException.ts`, `kingAttackReads.ts` (its wing-vs-centre line needs widening). Partial. |
| Theory tree walked after the game, not during it | Sco, CK, Ala, Dan | `branchExplorer.ts` + `reviewOpeningTheory.ts`; not wired as a post-game rewind |
| Move order as the choice (which of their lines exist; when order is free) | QGD, CK, Dan | `moveOrder.ts` covers only a one-move swap costing ≥100cp. **Needs new:** a DB comparison of which branches each order allows (`openingBranches.ts` + masters data). |
| Deny their square through the order of development | Sco, QGD, CK | `prophylaxis.ts` (pin/kick/fork kinds only) + `outpost.ts`. **Needs a new deny-square kind.** |
| Material vs lasting assets (the menu against a gambit, giving the pawn back, valuing an imbalance) | Sco, Ala, Dan | `practicalReads.ts` givePawnBack. The menu and the asset comparison: **needs new**. |

**Pairs (2 of 7):**

| Beat | Videos | Computer |
|---|---|---|
| Practical choice vs objective best | Sco, Ala | none (no opponent-prep or playability data); the engine gap comes from `criticalityScan.ts` |
| Thinking method said aloud (name the one threat; forcing line first; scan their checks) | Sco, Dan | `methodBeat.ts`, `thinkingForcingStep.ts`, `threatAnswer.ts` |
| Named defensive resource | Sco, Dan | `practicalReads.ts` defendsBoth, `tacticGeometry.ts` interposeFacing |
| Grade or credit their move (how common it is, what it intends) | CK, Ala | `theoryDeparture.ts`, `linePickerPopularity.ts`, `strongChoice.ts`, `squareRole.ts` / `keySquares.ts` |
| Line ends with a verdict (number or label) | Dan, Ala | `evalBand.ts`, `criticalityScan.ts`, `pvPlayback.ts` |
| Plan timing: pieces first, then the break; "not yet" | QGD, Cat | **needs new** (`planChooser.ts` is partial) |
| One idea linked across branches or openings | CK, Ala | `motifLedger.ts` works within one game only. **Needs new.** |

**Single videos:**
- Duty parity (QGD): `exchangeIdeas.ts` dutyParity.
- Endgame foresight from an opening trade (CK): `endgameMatchup.ts`.
- Model-game illustration (CK): `modelGameService.ts` exists, but nothing selects a game by principle.
- A concept defined the moment it happens (Cat): `reviewSacrifice.ts`.
- Piece destination and the dormant piece (Cat): `squareJudgement.ts` is partial; the dormant piece **needs new**.
- Pace habit, talking on their move and staying silent on your own reply (Sco): no computer; it is a door rule.

### 6. Core beats → computers

| Beat | Existing computers (`src/services/`) | Gap |
|---|---|---|
| 1 Fork menu | `openingBranches.ts` (branchesAt, isFork), `masterPlayLookup.ts`, `lichessExplorerService.ts`, `linePickerPopularity.ts`, `branchExplorer.ts` | wire as one fork line |
| 2 Identity | `openingIdentity.ts` (identityFor, openingIdentityLine, definingMoveIdea), `openingAnnouncement.ts`, `openingEquivalence.ts` | none |
| 4 Why this branch | `refutedAlternative.ts`, `theoryDeparture.ts`, `planChoice.ts` | when the alternative costs no centipawns (Be7 vs Nf6, Bg4 "overrated"), the reason is what each allows. **Needs a new allows-comparison** (openingBranches + masters score). |
| 5 Structure cost + the move that pays it | `positionReadingService.ts` (bad bishop), `pieceQuality.ts`, `structureJudgementKit.ts`, `pawnJudgement.ts`, `outpost.ts`, `theirMoveCost.ts`, `exchangeIdeas.ts` | **needs new:** a link that ties the cost to the opening and to the move that pays it |
| 6 Character early | `mastersPlanRead.ts` (castle sides → opposite castling), `planRace.ts`, `kingSafety.ts`, `kingAttackReads.ts`, `gamePhaseService.ts` (queens off), `development.ts`, `positionalRead.ts`, `structureSignature.ts`, `structureReads.ts`, `endgameMatchup.ts` | **needs new:** one "character of the coming game" computer; nothing reads a race against an uncastled king |
| 7 Instinctive vs concrete | `learnTurnDoor.ts` rejectedTempting, `playCommentary.ts` buildRejectedTempting, `refutedAlternative.ts`, `deliberation.ts`, `bookMoveWhy.ts`, `speedRunReads.ts` uglyButRight, `moveOrder.ts` | development-order reasons under `ORDER_COST_CP` (100cp) are never said |
| 8 Key move | `mastersPlanRead.ts` (PlanBreak + PieceHome), `practicalReads.ts` givePawnBack, `movePlan.ts`, `planChooser.ts` | **needs new:** an opening's signature multi-hop piece route (Ala Na3–b5–c7, QGD …Ne4 then recapture with the pawn) |
| 9 Branches out loud | `pvPlayback.ts` computePvLine, `masterPlayLookup.ts`, `refutedAlternative.ts`, `practicalReads.ts`, `sacrificeLedger.ts`, `exchangeLedger.ts`, `speedRunReads.ts` goodInEveryBranch, `branchExplorer.ts` | computers exist; the delivery form is David's call (LEARN NAMES NO MOVE UNASKED) |
| 10 Danger signs | `openingTrapDetector.ts` + `gambit-punish-gems.json`, `latentFork.ts`, `latentDanger.ts`, `pinGeometry.ts`, `tacticsDetector.ts`, `moveOrder.ts`, `outpost.ts`, `practicalReads.ts` mateThreatCostsYou | tie each sign to the line |

Every file named above exists under `/home/user/learn-wt/src/services/`. Najdorf pace was measured from `/home/user/learn-wt/data/video-narration-voiced/zEqoGIgzk1E.json`, our own rewrite, which captions every ply, so its count of bare move names is inflated. 