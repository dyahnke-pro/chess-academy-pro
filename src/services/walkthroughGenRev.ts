// THE WALKTHROUGH GENERATION REV — one value, read by every cache of a
// generated lesson tree: the device's own (`openingGenerator.getCachedOpening`)
// and the shared one other users fill (`sharedOpeningCache`). Its history is in
// openingGenerator.ts; the fingerprint gate (walkthroughGenRev.gate.test.ts)
// fails when the beats change and this does not.
// 2026-10-20-batch4-beats: batch 4's one bump (one owner per claim, the
// student's own move says its job, the board teacher's new jobs).
// 2026-10-20-teach-p2: a prepared kick on a pinner names the pin it breaks;
// a pressure line is said from the student's seat.
// 2026-10-21-narration-b2: a pressure line names its target's owner ("your
// pawn on g7", never "the pawn on g7").
// 2026-10-28-three-facts: one bump for WO-DECIDER-02's lesson changes — the
// three facts (what a move sets up, what their last move aims at, how this
// one answers it), the quiet-move rule, the bishop pair, a forced loss said
// as the least loss.
// 2026-10-28-two-moves: what a move sets up looks two of its side's moves
// ahead, both seats (`deepFact`).
// 2026-10-28-one-reason: "most people play X here" is proved by the one reason
// and named on the naming rule (`alternativeProof`); "sets up" reaches five
// moves when the link is forced or the piece stood still and the strike wins.
// 2026-10-29-exact-line: one bump for WO-ALL-OPENINGS-01's lesson changes — a
// caller's exact line is taught as given (never the name's shortest row), from
// the caller's seat; a variation's hand-written intro speaks only on the move
// that makes it itself (never the Ulvestad on a 5…Nxd5 walk). The same
// unshipped bump carries the gems leaving the lesson (David 2026-10-29): no
// baked gem detours, and the punish stage from the puzzle DB, so a cached
// tree built with the opening's gems is rebuilt without them.
// 2026-10-29-v6: one bump for the v5/v6 Review re-run's fixes that lesson
// beats share — the opening contrast names the alternative as the
// alternative, a pawn plan is keyed by its file, two plans read on one move
// are one sentence, a bare check escape says nothing, the pressure line
// carries its stake.
// 2026-10-30-lesson-voice: one bump for the lesson voice (WO-THINK-01 P4) —
// a move says the guard it goes after, the target only its king guards, the
// central break, what a fianchetto bishop aims at, a piece's trip; the
// briefing reads 12 plies of the line ahead; a follow-up trade is a trade.
// 2026-10-30-build-4: one bump for WO-ONE-COACH-01 Build 4 — the opponent's
// move says its fundamentals, "not yet — first this" and the stop for both
// seats, a fundamental marks only the squares it says (the second job
// speaks), a developing move with tempo names its target once.
// 2026-10-30-build-5: the lesson composer's policy is fitted to Danya's notes
// (which computer leads, when a second job speaks — thought-policy.json).
// 2026-10-30-build-5b: every fundamental and the king's march said in full
// once a lesson, then referred to; a stop-a-push names no square its piece
// left; no structure claim in the middle of an exchange.
// 2026-10-30-capture-once: a capture is said once (WO-STORY-MATRIX-01 Phase 1
// step 4, `captureWords`) — after its SAN only what it leads to ("You play
// Bxc5 — it wins a pawn, and nothing can take back", never "it wins the pawn").
// 2026-11-04-story-matrix-wires: the lesson pass reads a null move per board
// and says what a move prepares with the rule behind it, the structural choice
// after their move (`linesStructure`), and closes on the plan the games show
// from the line's middlegame (`computedPlanAt`).
// 2026-11-05-weighed-replies: a lesson move also says the reply tree ("if they
// take on e5, you take back with the knight"), the tempting move that fails,
// the move of the same worth, and the piece's other squares (`ifTheyPlay`,
// `weighedMoves`); the reply tree's sentence opens through `openSentence`.
// 2026-11-08-human-voice: the coach talks like a person at the board (David:
// "I want all narrations to follow this pattern") — one idea a sentence, no
// semicolons or dash chains read aloud, "aiming at" for "eyeing", a long move
// line said as its key moves, the plan one step a sentence, two or three
// phrasings rotated on the board.
// 2026-11-08-marks: a lesson beat lights every square its spoken words name
// (marks sweep: "your queen on d8" went unlit when the note was the source).
// 2026-11-08-voice7: no dash chains in the moves weighed — the move of the
// same worth is one sentence ("Be7 and Bd6 both hold here, and what separates
// them is that their bishop does more on d6, with 8 squares from there against
// 2 on e7"), the square choice says its square, then the other square's fault
// ("Their bishop went to e4. On g4 it runs into …Bxf3+ …"); a move that hits a
// piece "attacks" or "hits" it; a move "drops" only the piece their line
// takes ("Bxh7+? That drops the bishop on h7", never the queen it left loose).
export const WALKTHROUGH_GEN_REV = '2026-11-08-voice7';
