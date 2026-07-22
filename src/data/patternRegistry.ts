/**
 * THE PATTERN REGISTRY — every tactical pattern the app can COMPUTE, with its
 * identify → recognize → prevent teaching (David 2026-07-22: "pattern
 * recognition is HUGE in chess!!! I want a section dedicated to teaching
 * it!!! Make sure the coach knows ALL listed/available/computed patterns!!!
 * GROUNDED!!!").
 *
 * Grounding contract (G0/G3):
 * - Every entry names its DETECTOR — the code path that computes the pattern
 *   live (tacticsDetector geometry, detectNewThreat, findHangingPieces, or
 *   engine-verified puzzle themes). The coach may NAME a pattern on a board
 *   only when its detector reports it — the registry is vocabulary, never a
 *   license to see patterns that aren't computed.
 * - `puzzleThemes` binds each pattern to the CC0 Lichess puzzle corpus for
 *   drilling — real positions, engine-verified solutions, never invented.
 * - The identify/recognize/prevent prose teaches the pattern's GEOMETRY in
 *   the same language the computed narration generators speak
 *   (describeThreatRecognition / describeThreatPrevention), so the section
 *   and the coach's live call-outs are one voice.
 * - `sources[]` per the narrationSources allowlist.
 */

export interface TacticPatternLesson {
  id: string;
  name: string;
  /** How the app computes this pattern live — the grounding statement. */
  detector: string;
  /** Lichess puzzle theme tags that drill this pattern (real, engine-verified). */
  puzzleThemes: string[];
  /** IDENTIFY — what the pattern IS, named plainly. */
  identify: string;
  /** RECOGNIZE — the geometry to spot a move BEFORE it lands. */
  recognize: string;
  /** PREVENT — how to defuse it (or exploit it when it's yours). */
  prevent: string;
  sources: string[];
}

export const PATTERN_REGISTRY: TacticPatternLesson[] = [
  {
    id: 'fork',
    name: 'The Fork',
    detector: 'tacticsDetector (fork geometry) + detectNewThreat (null-move threat scan)',
    puzzleThemes: ['fork'],
    identify: 'One piece attacks two targets at once. The defender can save one — not both.',
    recognize: "Two valuable pieces sitting one knight's-hop (or one diagonal, one file) from the same square — that alignment IS the fork, a move before it lands. Scan for squares your opponent's knight can reach that touch two of your pieces.",
    prevent: 'Break the alignment before the fork exists: move one of the two targets, cover the landing square, or strike the piece that guards the forking square — the guard is what holds the combination together.',
    sources: ['https://en.wikipedia.org/wiki/Fork_(chess)'],
  },
  {
    id: 'pin',
    name: 'The Pin',
    detector: 'tacticsDetector (ray-trace: attacker → pinned piece → bigger piece behind)',
    identify: 'A piece cannot move — or should not move — because a bigger piece stands behind it on the same line.',
    puzzleThemes: ['pin'],
    recognize: 'Read the long lines. When your knight or bishop shares a diagonal or file with your queen, rook, or king, every enemy bishop and rook eyeing that line is a pin waiting to happen. A pinned defender is not a defender.',
    prevent: 'Step off the shared line early, block the line with a lesser piece, or challenge the pinning piece. When the pin is yours: pile up on the pinned piece — it cannot run.',
    sources: ['https://en.wikipedia.org/wiki/Pin_(chess)'],
  },
  {
    id: 'skewer',
    name: 'The Skewer',
    detector: 'tacticsDetector (ray-trace: big piece in front, target behind)',
    puzzleThemes: ['skewer'],
    identify: 'A pin reversed: the BIG piece stands in front and must move, exposing the piece behind it.',
    recognize: 'Same long-line reading as the pin, with the values flipped — your queen or king standing on a line with a loose piece behind it invites a check or attack that collects what stands behind.',
    prevent: "Don't park your king or queen on open lines with loose pieces behind them. Break the alignment before a rook or bishop finds it.",
    sources: ['https://en.wikipedia.org/wiki/Skewer_(chess)'],
  },
  {
    id: 'discovered-attack',
    name: 'The Discovered Attack',
    detector: "tacticsDetector ('discovery' — front piece moves, the piece behind attacks)",
    puzzleThemes: ['discoveredAttack'],
    identify: 'One piece moves and a DIFFERENT piece behind it delivers the attack — two threats from one move.',
    recognize: 'Look for enemy pieces standing on lines with their own bishop, rook, or queen behind them. That front piece is a loaded spring: wherever it jumps, the piece behind fires. The front piece can even move with its own threat — two attacks, one tempo.',
    prevent: 'Never leave your king or queen on a line where only one enemy piece stands between you and a slider. Trade off or block the battery before it uncoils.',
    sources: ['https://en.wikipedia.org/wiki/Discovered_attack'],
  },
  {
    id: 'double-check',
    name: 'The Double Check',
    detector: "tacticsDetector ('double_check' — two pieces give check at once)",
    puzzleThemes: ['doubleCheck'],
    identify: 'A discovered attack where BOTH pieces give check. Blocking is impossible and neither checker can be captured to stop both — the king MUST move.',
    recognize: 'The same loaded-spring geometry as the discovery, aimed at your king. When both the front piece and the piece behind can hit the king, count the king\'s escape squares FIRST — a double check with no flight square is mate.',
    prevent: 'Treat any enemy battery pointed at your king as urgent. Give the king air early (luft), and never allow the front piece a jump that itself attacks the king.',
    sources: ['https://en.wikipedia.org/wiki/Double_check'],
  },
  {
    id: 'back-rank-mate',
    name: 'The Back-Rank Mate',
    detector: "tacticsDetector ('back_rank' — trapped king behind its own pawns, heavy piece on the rank)",
    puzzleThemes: ['backRankMate'],
    identify: 'A rook or queen lands on the home rank and the king, fenced in by its own unmoved pawns, has nowhere to run.',
    recognize: "Count the king's flight squares before the checks start. Three unmoved pawns in front of a castled king plus one undefended home rank = the pattern. Every heavy-piece trade that leaves the rank thin makes it worse.",
    prevent: 'Make luft — push one pawn a single square in front of your castled king — or keep a rook home until the rank is safe. When the pattern is theirs, deflect or overload the one piece guarding the rank.',
    sources: ['https://en.wikipedia.org/wiki/Back-rank_checkmate'],
  },
  {
    id: 'removal-of-guard',
    name: 'Removing the Guard',
    detector: "tacticsDetector ('removal_of_guard') + describeThreatPrevention (undermine-the-guard mechanism)",
    puzzleThemes: ['deflection', 'attraction'],
    identify: 'The target is defended — so the combination strikes the DEFENDER first. Capture it, chase it, or drag it away, and the target falls.',
    recognize: 'For every attacked piece, ask WHO guards it — and whether that guard has a second job. A piece defending two things at once is already overloaded; one forcing move collects the other.',
    prevent: "Don't let one piece carry two duties. When the engine's defense starts with a strike at a quiet piece, that piece was the guard holding everything together — the same mechanism runs in both directions.",
    sources: ['https://en.wikipedia.org/wiki/Deflection_(chess)', 'https://en.wikipedia.org/wiki/Decoy_(chess)'],
  },
  {
    id: 'hanging-piece',
    name: 'The Hanging Piece',
    detector: 'findHangingPieces (attacked, insufficiently defended — SEE-verified)',
    puzzleThemes: ['hangingPiece'],
    identify: 'A piece attacked more times than it is defended — or defended by pieces that lose the exchange sequence.',
    recognize: 'An undefended piece is a standing invitation: even when nothing attacks it yet, every enemy move gains a tempo by hitting it, and every tactic in the position flows toward it. Scan your own camp for loose pieces after every trade.',
    prevent: 'Keep your pieces connected — defended by a pawn or by each other. "Loose pieces drop off" is the counting rule: before any sequence, count attackers vs defenders on every piece you leave behind.',
    sources: ['https://en.wikipedia.org/wiki/Hanging_piece'],
  },
  {
    id: 'mating-net',
    name: 'The Mating Net',
    detector: "detectNewThreat (kind 'mate') + detectForcedMatingSequence",
    puzzleThemes: ['mateIn2', 'mateIn3'],
    identify: 'The king\'s escape squares disappear one by one until a check has no answer. The net closes BEFORE the mate lands.',
    recognize: "Count the king's flight squares before the checks start — that number is the whole story. Each covered square tightens the net; when it reaches zero, any check is mate. Attackers read this count; defenders must too.",
    prevent: 'Spend a move on king safety the moment the count drops: make luft, trade a pair of attackers, bring a defender back. A quiet defensive move while there are still two flight squares beats a desperate one when there are none.',
    sources: ['https://en.wikipedia.org/wiki/Checkmate_pattern'],
  },
  {
    id: 'sacrifice',
    name: 'The Sacrifice',
    detector: 'describeSacrifice + sacrificeCompensation (engine-verified compensation)',
    puzzleThemes: ['sacrifice'],
    identify: 'Material given up on purpose — for mate, for a decisive attack, or to win MORE material back by force.',
    recognize: 'A sacrifice is sound only when the follow-up is forced: count the checks, captures, and threats after the sac. If every defensive try loses, the material never mattered. If the attack can be declined or survived, it was just a blunder with confidence.',
    prevent: 'When offered material, ask WHY before you take. Count the forcing sequence after the capture — the engine-verified rule from the review: a "free" pawn that walks into a fork was never free.',
    sources: ['https://en.wikipedia.org/wiki/Sacrifice_(chess)'],
  },
  {
    id: 'trapped-piece',
    name: 'The Trapped Piece',
    detector: 'engine-verified puzzle corpus (escape-square counting)',
    puzzleThemes: ['trappedPiece'],
    identify: 'A piece with no safe square left. It does not need to be attacked yet — once its escape squares are gone, winning it is a matter of one more move.',
    recognize: "Count a piece's retreat squares the same way you count a king's flight squares. A knight on the rim, a bishop that grabbed a poisoned pawn, a queen deep in enemy territory — each move that takes an escape square is a move of the net.",
    prevent: "Before sending a piece into enemy territory, count its way home. If the answer is 'one square, and they can cover it', the raid loses the piece.",
    sources: ['https://en.wikipedia.org/wiki/Trapped_piece'],
  },
];

/** Every TacticPatternType the live detector can emit maps to a lesson —
 *  the "coach knows ALL computed patterns" contract, testable. */
export const DETECTOR_TYPE_TO_LESSON: Record<string, string> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discovery: 'discovered-attack',
  double_check: 'double-check',
  back_rank: 'back-rank-mate',
  removal_of_guard: 'removal-of-guard',
};
