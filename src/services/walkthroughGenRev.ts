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
export const WALKTHROUGH_GEN_REV = '2026-10-29-v6';
