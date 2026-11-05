// THE TEACHING MOVES (PLAN.md § PHASE 2 REDESIGN, L1; David 2026-11-04: "the
// goal is not to match perfectly what he says. the goal is to TEACH LIKE HE
// DOES"). One vocabulary for what a coach DOES while thinking out loud — rule a
// tempting move out with its refutation, say what a quiet move is for, lay out
// their replies with the answer to each, weigh two good moves… — the same
// codes his own words are labelled with (`scripts/scoreboard/taxonomy.md`,
// held to this union by `teachingMoves.test.ts`).
//
// Every fact kind answers which teaching moves its facts make. Exhaustive over
// the one vocabulary of kinds (`CoachFactKind`), so a new kind fails to compile
// until it answers — the yardstick the Learn matrix is scored on, and the
// table that seats a fact in the moment table (L2/L4). An empty list is an
// answer: the fact describes the board or the record and makes no teaching
// move of its own. Pure: no imports but types.
import type { CoachFactKind } from './coachFact';

/** One teaching move. The prefix is its family: M the move and its purpose, H
 *  the thinking method, T tactics and danger, S strategy, P the position, E the
 *  endgame. */
export type TeachingMove =
  // The move and its purpose
  | 'M-PURPOSE-QUIET' | 'M-PURPOSE-PREVENT' | 'M-OPP-PURPOSE' | 'M-TWO-JOBS' | 'M-VERDICT' | 'M-RECAPTURE'
  | 'M-TRADE' | 'M-TEMPO' | 'M-REFUTED' | 'M-COMMON-WRONG' | 'M-OPP-COST' | 'M-REPLY-TREE' | 'M-PROVOKE'
  | 'M-MOVE-ORDER'
  // Thinking (the method)
  | 'H-CANDIDATES' | 'H-TWO-GOOD' | 'H-MENU' | 'H-CALC' | 'H-EVAL' | 'H-PRACTICAL' | 'H-DONT-PANIC'
  | 'H-OPP-THINK' | 'H-HABIT' | 'H-WISHLIST'
  // Tactics and danger
  | 'T-TACTIC' | 'T-THREAT' | 'T-HANG' | 'T-MATE' | 'T-LINE' | 'T-HIDDEN' | 'T-CHECKFIRST' | 'T-TRAP-AHEAD'
  | 'T-COUNT' | 'T-SAC-INITIATIVE' | 'T-INDIRECT-DEFENCE' | 'T-FALSE-ALARM'
  // Strategy
  | 'S-PLAN' | 'S-PLAN-VS-PLAN' | 'S-MANEUVER' | 'S-SQUARE-CHOICE' | 'S-BREAK' | 'S-SPACE' | 'S-KING-ATTACK'
  | 'S-CASTLING' | 'S-PROPHYLAXIS' | 'S-TENSION' | 'S-TIMING' | 'S-TRIGGER' | 'S-LONG-HORIZON' | 'S-WHEN-AHEAD'
  | 'S-PUSH-OR-HOLD'
  // The position
  | 'P-STRUCTURE' | 'P-PIECE-QUALITY' | 'P-PRINCIPLE' | 'P-OPENING-IDEA' | 'P-MOVE-ORDER' | 'P-THEORY'
  | 'P-EXCEPTION'
  // The endgame
  | 'E-CONVERT' | 'E-PASSER' | 'E-TECHNIQUE';

/** Every teaching move, in the taxonomy's order (the test reads the file). */
export const TEACHING_MOVE_LIST: readonly TeachingMove[] = [
  'M-PURPOSE-QUIET', 'M-PURPOSE-PREVENT', 'M-OPP-PURPOSE', 'M-TWO-JOBS', 'M-VERDICT', 'M-RECAPTURE',
  'M-TRADE', 'M-TEMPO', 'M-REFUTED', 'M-COMMON-WRONG', 'M-OPP-COST', 'M-REPLY-TREE', 'M-PROVOKE', 'M-MOVE-ORDER',
  'H-CANDIDATES', 'H-TWO-GOOD', 'H-MENU', 'H-CALC', 'H-EVAL', 'H-PRACTICAL', 'H-DONT-PANIC', 'H-OPP-THINK',
  'H-HABIT', 'H-WISHLIST',
  'T-TACTIC', 'T-THREAT', 'T-HANG', 'T-MATE', 'T-LINE', 'T-HIDDEN', 'T-CHECKFIRST', 'T-TRAP-AHEAD', 'T-COUNT',
  'T-SAC-INITIATIVE', 'T-INDIRECT-DEFENCE', 'T-FALSE-ALARM',
  'S-PLAN', 'S-PLAN-VS-PLAN', 'S-MANEUVER', 'S-SQUARE-CHOICE', 'S-BREAK', 'S-SPACE', 'S-KING-ATTACK',
  'S-CASTLING', 'S-PROPHYLAXIS', 'S-TENSION', 'S-TIMING', 'S-TRIGGER', 'S-LONG-HORIZON', 'S-WHEN-AHEAD',
  'S-PUSH-OR-HOLD',
  'P-STRUCTURE', 'P-PIECE-QUALITY', 'P-PRINCIPLE', 'P-OPENING-IDEA', 'P-MOVE-ORDER', 'P-THEORY', 'P-EXCEPTION',
  'E-CONVERT', 'E-PASSER', 'E-TECHNIQUE',
];

/** WHICH TEACHING MOVES EACH KIND OF FACT MAKES. */
export const TEACHING_MOVES: Record<CoachFactKind, readonly TeachingMove[]> = {
  // ── danger ──
  threat: ['T-THREAT'],
  'must-defend': ['T-THREAT'],
  // ── the name ──
  opening: ['P-OPENING-IDEA'],
  'last-here': [],
  equivalence: ['P-MOVE-ORDER'],
  // ── the move: what it changed ──
  principle: ['P-PRINCIPLE'],
  quality: ['M-VERDICT'],
  praise: ['M-VERDICT'],
  move: ['M-VERDICT'],
  trade: ['M-TRADE'],
  forced: ['M-VERDICT'],
  sac: ['T-SAC-INITIATIVE'],
  'sac-why': ['T-SAC-INITIATIVE'],
  does: ['M-PURPOSE-QUIET'],
  note: ['P-OPENING-IDEA'],
  held: ['M-PURPOSE-QUIET'],
  rule: ['P-PRINCIPLE'],
  stopped: ['M-PURPOSE-PREVENT'],
  point: ['M-PURPOSE-QUIET'],
  'move-job': ['M-PURPOSE-QUIET'],
  fundamental: ['P-PRINCIPLE'],
  'opening-cost': ['M-OPP-COST'],
  // ── their side ──
  'opp-dev': ['M-OPP-PURPOSE'],
  'opp-target': ['M-OPP-PURPOSE', 'T-THREAT'],
  'their-cost': ['M-VERDICT'],
  'their-read': ['M-OPP-PURPOSE'],
  'opponent-intent': ['M-OPP-PURPOSE', 'S-PLAN'],
  'opponent-leans': ['M-OPP-PURPOSE'],
  'opening-theirs': ['P-OPENING-IDEA', 'M-OPP-PURPOSE'],
  // ── the choices ──
  refuted: ['M-REFUTED'],
  // The phantom threat — "it looks aggressive but wins nothing, no need to
  // react" (`detectBluff`): the false alarm and its calm, not practical play.
  bluff: ['T-FALSE-ALARM', 'H-DONT-PANIC'],
  contrast: ['H-TWO-GOOD', 'M-REFUTED'],
  // "The other capture hands their knight d5 for good" — which recapture, and
  // the square it gives away for the rest of the game.
  'capture-choice': ['M-RECAPTURE', 'S-LONG-HORIZON'],
  kick: ['M-TEMPO'],
  deliberation: ['H-CANDIDATES', 'M-REFUTED'],
  'key-moment': ['H-HABIT'],
  'stop-flaw': ['M-REFUTED'],
  'opening-fork': ['H-MENU', 'P-THEORY'],
  priority: ['S-TIMING'],
  // ── not yet / prevention ──
  timing: ['S-TIMING'],
  'prevent-test': ['M-PURPOSE-PREVENT', 'S-PROPHYLAXIS'],
  'not-yet': ['S-TIMING'],
  // ── the line ──
  consequence: ['T-LINE'],
  // The line walked out loud move by move to what it achieves (`sayLine`,
  // deliberation's line played out): his "I go here, he goes there".
  line: ['T-LINE', 'H-CALC'],
  // ── the story ──
  'plan-now': ['S-PLAN'],
  'plan-race': ['S-PLAN-VS-PLAN', 'T-COUNT'],
  'plan-arc': ['S-PLAN'],
  'plan-opening': ['P-OPENING-IDEA', 'S-PLAN'],
  'plan-middlegame': ['S-PLAN'],
  'plan-line': ['S-PLAN', 'T-LINE'],
  'structure-plan': ['S-PLAN', 'P-STRUCTURE'],
  'student-leans': ['S-PLAN'],
  'opening-story': ['P-OPENING-IDEA'],
  // ── structure and pieces ──
  structure: ['P-STRUCTURE'],
  passer: ['E-PASSER'],
  badbishop: ['P-PIECE-QUALITY'],
  worst: ['P-PIECE-QUALITY'],
  minority: ['S-PLAN', 'P-STRUCTURE'],
  complex: ['P-STRUCTURE'],
  king: ['S-KING-ATTACK'],
  rook7: ['P-PIECE-QUALITY'],
  judgement: ['H-EVAL'],
  // "After X, d5 is weak for good, and their knight gets there in three" —
  // the long-term consequence of the move, with the route.
  'hole-access': ['S-MANEUVER', 'S-SQUARE-CHOICE', 'S-LONG-HORIZON'],
  // ── tactics ──
  tactic: ['T-TACTIC'],
  loose: ['T-HANG'],
  count: ['T-COUNT'],
  royal: ['T-TACTIC'],
  trapped: ['T-TACTIC'],
  'king-read': ['S-KING-ATTACK'],
  'latent-danger': ['T-HIDDEN'],
  'latent-chance': ['T-HIDDEN'],
  // ── endgame technique ──
  endgame: ['E-TECHNIQUE'],
  technique: ['E-TECHNIQUE'],
  // ── concepts and nuggets ──
  stock: ['S-PLAN'],
  'trade-idea': ['M-TRADE'],
  'defence-idea': ['T-INDIRECT-DEFENCE'],
  nugget: ['P-PRINCIPLE'],
  'attack-pattern': ['S-KING-ATTACK', 'T-MATE'],
  concept: ['T-TACTIC'],
  'speedrun-read': ['S-PLAN'],
  // ── the verdict ──
  eval: ['H-EVAL'],
  delta: ['H-EVAL'],
  verdict: ['M-VERDICT'],
  'game-end': [],
  murky: ['H-EVAL', 'H-PRACTICAL'],
  status: ['H-EVAL'],
  convert: ['E-CONVERT', 'S-WHEN-AHEAD'],
  // ── the habit ──
  method: ['H-HABIT'],
  how: ['H-HABIT'],
  'their-habit': ['H-HABIT'],
  'your-habit': ['H-HABIT'],
  // ── the lesson composer's kinds ──
  'aspect-threat': ['T-THREAT'],
  'aspect-wins': ['T-HANG'],
  'aspect-trade': ['M-TRADE'],
  'aspect-least-loss': ['M-VERDICT'],
  'aspect-tactic-lands': ['T-TACTIC'],
  'aspect-tactic-set-up': ['T-TACTIC', 'M-PURPOSE-QUIET'],
  'aspect-check': [],
  'aspect-promotes': ['E-PASSER'],
  'aspect-opens-king': ['S-KING-ATTACK'],
  'aspect-outpost': ['P-STRUCTURE', 'S-SQUARE-CHOICE'],
  'aspect-passer': ['E-PASSER'],
  'aspect-passer-handed': ['E-PASSER', 'M-OPP-COST'],
  'aspect-opens-file': ['P-PRINCIPLE'],
  'aspect-their-weakness': ['P-STRUCTURE'],
  'aspect-own-weakness': ['P-STRUCTURE', 'M-OPP-COST'],
  'aspect-own-king-cover': ['S-KING-ATTACK', 'M-OPP-COST'],
  checkmate: ['T-MATE'],
  'board-teacher': ['M-PURPOSE-QUIET'],
  'deep-fact': ['T-LINE'],
  binding: ['M-PURPOSE-PREVENT'],
  route: ['S-MANEUVER'],
  stop: ['M-PURPOSE-PREVENT'],
  // ── the teaching moves' own kinds (2026-11-05) ──
  // "If they X, you play Y" (`ifTheyPlay`), each branch played out.
  'reply-tree': ['M-REPLY-TREE', 'T-LINE'],
  // "X first: Y straight away runs into R" (`moveOrder`), "A first, because
  // it clears the road B needs" (`findEnablingMove`).
  'move-order': ['M-MOVE-ORDER', 'S-TIMING'],
  // Castling by hand: the plan, its steps, the walk done (`castleByHandMove`).
  castling: ['S-CASTLING', 'S-PLAN'],
  // "Most players at your level play X here" with its cost and line
  // (`refutedFromFan`); a known club mistake played (`knownSlip`).
  'common-wrong': ['M-COMMON-WRONG', 'M-REFUTED'],
  // A known club mistake or trap at the board, named before it is played.
  'trap-ahead': ['T-TRAP-AHEAD', 'M-COMMON-WRONG'],
  // Their threat was real and you did not have to react (`falseAlarm`).
  'false-alarm': ['T-FALSE-ALARM', 'H-DONT-PANIC'],
  // A beginner's rule the move breaks, and why it is right here (`ruleException`).
  'rule-exception': ['P-EXCEPTION', 'P-PRINCIPLE'],
  // Whether this ending is worth pressing or holding, by its type (`pushOrHold`).
  'push-or-hold': ['S-PUSH-OR-HOLD'],
  // The habit of asking what their move is doing — the opponent's shoes
  // (`methodBeat`, the opponent-threat habit).
  'opp-think': ['H-OPP-THINK', 'H-HABIT'],
  // Checks, captures, threats first — the forcing scan (`methodBeat`).
  'forcing-scan': ['T-CHECKFIRST', 'H-HABIT'],
  // ── the teaching moves' new computers (2026-11-05) ──
  // The pawn break and what it is for (`pawnBreak`): the pawn it strikes, the
  // file it opens for the rooks, the bishop it frees.
  'pawn-break': ['S-BREAK'],
  // Opposite-coloured bishops (`oppositeBishops`): the read of who it favours
  // and how to play it — the attack on the bishop's colour, or the drawish ending.
  'opposite-bishops': ['H-EVAL', 'S-PLAN'],
  // ── the teaching moves' own kinds, round 2 (2026-11-05): computers that
  // already made them, filed under a kind that named another move ──
  // The speed-run reads (`speedRunReads.SPEED_RUN_KIND`): the move that makes
  // them commit a pawn, concede castling or a weak pawn, or block on an
  // awkward square; keep the tension; the rejected move that works after the
  // preparation.
  provoke: ['M-PROVOKE'],
  tension: ['S-TENSION'],
  trigger: ['S-TRIGGER', 'S-TIMING'],
  // Their idea's one condition (`opponentMoveReads.READ_FACT_KIND`): "Nd5
  // needs one thing to work: your rook on e7".
  'their-trigger': ['S-TRIGGER', 'M-OPP-PURPOSE'],
  // The behaviours' own kinds (`danyaBehaviors`): more space and what to do
  // with it; the piece's wish square and the road there.
  space: ['S-SPACE', 'S-PLAN'],
  wishlist: ['H-WISHLIST', 'S-MANEUVER'],
  // ── the last one, round 3 (2026-11-05) ──
  // One move doing two jobs at once (`thoughtComposer`): the second job the
  // composer says behind the move's lead — "it develops, and it also sets a
  // trap" — admitted by the test fitted on the moves he calls two jobs.
  'two-jobs': ['M-TWO-JOBS'],
};
