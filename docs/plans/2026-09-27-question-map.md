# The question map — three levels, one computer per question

David 2026-09-27: "I want three levels of questions. Basic, more advanced, and
advanced." … "questions should match a map" … "questions that elicit a response
from multiple computers to answer correctly. Like is a sac on f7 sound? Do I have a
strong attack?"

## The rule

Every question type maps to exactly ONE answering computer (a lane). A composite
question has ONE verdict computer and named evidence computers, plus a
contradiction rule saying which wins when they disagree. The model phrases; it
never decides (G0).

A question is "answered" only when all four hold, and the walk grades each:

1. **Routed** — the lane the map names fired (not the best-move fallback).
2. **Seated** — "you" is the student, "they" the opponent, whichever side asks.
3. **Board-true** — every square/piece claim is true on the board it names.
4. **Answers the question asked** — not a neighbouring question.

## L1 — basic: one fact off the board

| question | lane | computer | status |
|---|---|---|---|
| Whose move is it? / what colour am I? | whose-turn / live-colour | chess.js | ✅ |
| Is anything hanging? What's the threat? | tactics | `buildTacticsLiveContext` | ✅ |
| Is there a mate? | mate | chess.js + engine mate | ✅ |
| Is it a draw? | draw | chess.js | ✅ |
| What did they just play? | last-move | move history | ✅ |
| Can I take on c5? / can they? | capture-on | chess.js SEE | ✅ |
| Is my d4 pawn weak? | pawn-strength | structure reader | ✅ (fixed 2026-09-27: was graded as the move 4.d4) |
| Which of my pieces is worst? | board question (piece quality) | `findPieceQuality` | ✅ |
| What opening is this? | name-opening | Lichess DB | ✅ |

## L2 — one idea: compare, hypothesise, judge

| question | lane | computer | status |
|---|---|---|---|
| What's the best move? | best-move | engine (settled search) | ✅ |
| Is Nf3 OK? / what if I play d5? | candidate | engine `searchUntilStable` + `betterMoveReason` | ✅ |
| **What if THEY play d5?** | **opponent-hypothetical** | tempo board (`tempoFen`) + engine | ✅ NEW |
| Nf3 or d4? / better than Nf3? | compare-moves | engine on both | ✅ (versus-best added) |
| Why did they play Qc8? | opponent-move | engine + move purpose | ✅ |
| Why is Bb5 the best move? | why-best | `explainBestMoveGrounded` | ✅ |
| **Should I trade queens?** | **trade** | `findTradeMove` + engine + material count | ✅ NEW |
| What's the plan? | plan | `deriveNextPlans` / plan arc | ⚠️ two plans ran together (format) |
| Is my bishop on e3 good or bad? | piece quality | `findPieceQuality` | ✅ (fixed: was graded as 10.Be3) |
| Couldn't he just move the queen? | piece-options | `computePieceOptions` | ✅ |

## L3 — whole game / method / race / record

| question | lane | computer | status |
|---|---|---|---|
| Where did the game turn? | retrospective / review | `criticalityScan` | ✅ |
| How should I think here? | method | `methodBeat` | ✅ |
| Who wins the race? | endgame / plan race | `planRace` | ✅ (passers + file collision only) |
| How do I win this ending? | endgame technique | `endgameTechnique` | ✅ |
| What do I keep getting wrong? | mistakes / weakness briefing | weakness spine | ✅ |
| Am I improving? | progress / trend | capability evidence | ✅ |

## Composite — several computers, one verdict

| question | verdict computer | evidence computers | contradiction rule | status |
|---|---|---|---|---|
| Is Bxf7+ sound? | engine eval at the quiet end of a SACRIFICE-policy search (floor 16–22) | SEE offer (what is given), `detectTactics` on the line, the line itself | the eval wins; the tactic is named only if it is ON the line; an unsettled search is said as a first read | ✅ (sac policy + hedge) |
| Do I have a strong attack? | engine eval + attackers-vs-defenders count near the king | king exposure, open files toward the king, piece count in the king zone | "strong" needs BOTH a count edge and an eval edge; a count edge the engine does not back is "pieces aimed, no breakthrough yet" | ⚠️ attack-assessment lane exists; the contradiction rule is not yet explicit |
| Should I push for a win or hold? | eval band | material edge, king safety, time | eval band wins | ❌ not built |
| Is my position better? | eval band | positional edges (`assessPositionalEdge`) | eval says WHO; edges say WHY; an edge contradicting the eval is named as "but" | ✅ |

## Test per type

About 10 types per level × 3 phrasings, driven on a live Learn board through the
hand driver (`/tmp/ask.sh`-style), each graded on the four checks above. The
2026-09-27 Sicilian 1200 walk went 7/13; the three misroutes and the wrong seat
are fixed and fenced (`questionWalk.sicilian1200.test.ts`,
`groundedAnswer.opponentHypothetical.test.ts`, `groundedAnswer.trade.test.ts`).
Re-ask all 13 after the merge.
