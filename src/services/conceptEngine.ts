/**
 * conceptEngine — the ONE shared computer that reads a board and returns the
 * teachable concept(s) present, computed and ranked (never authored-from-the-LLM;
 * G0). Exposed everywhere the coach lives so a concept is taught the same way on
 * puzzles AND during live gameplay (docs/plans/2026-09-14-computed-concept-
 * detectors.md).
 *
 * This file grows across P1: side calculators (here) → concept renderer →
 * `conceptForBoard` router (ranked, multi-concept). Kept dependency-light and
 * pure so every surface can call it synchronously.
 */

import type { TacticPattern, TacticPatternType } from '../types/tacticTypes';
import { type PositionalConceptId, asPositionalConcept } from './conceptVocabulary';
import type { MatchupClass, MatchupResult } from './endgameMatchup';
import type { StockfishAnalysis } from '../types';
import { criticalityThresholds } from './criticalityScan';

export type Side = 'white' | 'black';

/** Side to move in a FEN. */
export function sideToMove(fen: string): Side {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

/**
 * The side that SOLVES a Lichess-style puzzle. Lichess FENs sit one ply before
 * the opponent's setup move (`solutionUci[0]`), so the solver is the side OPPOSITE
 * the FEN's side-to-move. This is the side the puzzle's resource belongs to — the
 * one whose concept we teach and frame as "you".
 */
export function solvingSide(fen: string): Side {
  return sideToMove(fen) === 'white' ? 'black' : 'white';
}

export type ConceptSource = 'tactic' | 'matchup' | 'technique' | 'positional' | 'mate';

export interface ComputedConcept {
  /** Stable id, e.g. 'fork' | 'rook-endgame'. */
  id: string;
  /** Display name, e.g. 'Fork' | 'Rook ending'. */
  name: string;
  source: ConceptSource;
  /** Lead-the-eye squares the narration names (agent first, then targets). */
  squares: string[];
  /** Gate-clean full teaching sentence(s): the board-true INSTANCE + the
   *  computed INVARIANT (why the pattern works). Spoken on full verbosity. */
  full: string;
  /** ≤8-word cue — the pattern named. Spoken on brief verbosity / shown below
   *  the board. */
  short: string;
  /** Ranking score, filled by the router (0..1). */
  importance: number;
  /** The board the INSTANCE sentence is true on, for a tactic concept. A tactic
   *  read off the engine's line lives on a FUTURE board; seating its pieces
   *  ("your"/"their") against the current board flips them (hand walk
   *  2026-09-24: after 21.Rxd8 the white rook on d8 skewers queen and rook — on
   *  the current board a BLACK rook stands on d8, so it was read "Their rook on
   *  d8 skewers their queen"). */
  boardFen?: string;
  /** The rule with no board instance — the detector could not name the
   *  pieces. A puzzle can teach it (the board in front of the student IS the
   *  instance); a live surface must not speak it alone (re-walk 1380, 16.Rxf3:
   *  "A trapped piece has no safe square…" about no piece). */
  bare?: true;
  /** The moves (SAN) from the board on screen to `boardFen`, when the concept
   *  lives on a future board. A live surface says them first — "After cxb3+,
   *  …" — or it states a future fact as present (walk 900, 27…Ba4+: "moving
   *  your pawn on b3" before any pawn stood there). */
  line?: string[];
}

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

/** Non-king material balance, white minus black, in pawns. */
export function materialBalance(fen: string): number {
  let bal = 0;
  for (const ch of fen.split(' ')[0]) {
    const v = VAL[ch.toLowerCase()];
    if (!v) continue;
    bal += ch === ch.toUpperCase() ? v : -v;
  }
  return bal;
}

/**
 * The stronger side by raw material, or 'balanced' within ~1 pawn. Used to frame
 * an endgame-technique concept toward the side trying to convert. A tie in
 * material (opposition, zugzwang, fortress) returns 'balanced' — those concepts
 * are framed by side-to-move / the solution instead.
 */
export function strongerSide(fen: string): Side | 'balanced' {
  const bal = materialBalance(fen);
  if (bal >= 1) return 'white';
  if (bal <= -1) return 'black';
  return 'balanced';
}

/**
 * The side a concept should be FRAMED for ("you" in narration). On a puzzle it's
 * the solver; when a solution is absent (live board) it's the stronger side, and
 * when material is level it's the side to move (whoever is about to act on the
 * idea). Callers on the student's own board pass `studentSide` to override.
 */
export function framingSide(
  fen: string,
  opts: { hasSolution?: boolean; studentSide?: Side } = {},
): Side {
  if (opts.studentSide) return opts.studentSide;
  if (opts.hasSolution) return solvingSide(fen);
  const stronger = strongerSide(fen);
  return stronger === 'balanced' ? sideToMove(fen) : stronger;
}

// ─── CONCEPT RENDERER ───────────────────────────────────────────────────────
//
// The INVARIANT templates below state each pattern's own defining rule in plain
// English. This is COMPUTED VOCABULARY — the same class as `tacticWord()` and
// `dnaLineNarrator`'s phrasing — NOT LLM-authored prose. It is the general idea
// (David 2026-09-14: "authored but still applies to other similar positions"),
// keyed to the DETECTED pattern and instantiated by the board-true instance, so
// the LLM decides nothing (G0). Neutral, square-based framing (never "we/our")
// satisfies the perspective gate; a `you/they` pronoun is used only where a side
// is unambiguous.

interface Register { full: string; short: string; }

/** Per-tactic invariant: WHY the pattern wins. General + reusable. */
const TACTIC_INVARIANT: Record<Exclude<TacticPatternType, 'none'>, Register> = {
  fork: { full: 'a fork hits two targets at once, and only one can escape — the other falls.', short: 'Fork — two targets, one falls.' },
  pin: { full: 'a pin freezes the piece in front: it can\'t move without exposing the more valuable piece behind it, so it can be piled on.', short: 'Pin — it can\'t move.' },
  skewer: { full: 'a skewer hits the valuable piece first; when it steps aside, the piece lined up behind it is lost.', short: 'Skewer — the piece behind falls.' },
  discovery: { full: 'a discovered attack unveils a second attacker by moving the piece in front, so two threats land at once.', short: 'Discovery — moving unveils an attack.' },
  double_check: { full: 'a double check attacks the king with two pieces at once, so it must move — nothing can block or capture both.', short: 'Double check — the king must move.' },
  back_rank: { full: 'a back-rank weakness leaves the king boxed in by its own pawns, so a rook or queen reaching the last rank is mate.', short: 'Back rank — the king is trapped.' },
  removal_of_guard: { full: 'removing the guard takes away the piece defending a key square, and what it protected falls.', short: 'Remove the defender.' },
  trapped_piece: { full: 'a trapped piece has no safe square, so it can be won whoever is to move.', short: 'Trapped piece — no escape.' },
  mate_threat: { full: 'a forced checkmate is coming unless it is answered right now.', short: 'Mate is threatened.' },
  overload: { full: 'an overloaded piece is doing two defensive jobs at once — take one duty away and the other collapses.', short: 'Overloaded — too many jobs.' },
  battery: { full: 'a battery stacks two pieces on the same line, multiplying their pressure down it.', short: 'Battery — doubled pressure.' },
};

const TACTIC_NAME: Record<Exclude<TacticPatternType, 'none'>, string> = {
  fork: 'Fork', pin: 'Pin', skewer: 'Skewer', discovery: 'Discovered attack',
  double_check: 'Double check', back_rank: 'Back-rank mate',
  removal_of_guard: 'Removing the guard', trapped_piece: 'Trapped piece',
  mate_threat: 'Mating threat', overload: 'Overloaded piece', battery: 'Battery',
};

/** Per-matchup-class governing principle. `null` = no endgame-technique concept
 *  (the tactic/positional detectors own those positions). */
const MATCHUP_PRINCIPLE: Record<MatchupClass, Register | null> = {
  'kp-vs-k': { full: 'a king-and-pawn race comes down to the opposition and the key squares in front of the pawn.', short: 'King and pawn — the opposition.' },
  'pawn-endgame': { full: 'in a pawn ending king activity, the opposition, and the outside passed pawn decide it — every tempo counts.', short: 'Pawn ending — activate the king.' },
  'rook-endgame': { full: 'in a rook ending activity is everything: put the rook behind the passed pawn and keep the king in the fight.', short: 'Rook ending — activity first.' },
  'queen-endgame': { full: 'a queen ending turns on checks and your own king\'s safety — cover the perpetual before you push.', short: 'Queen ending — mind perpetual check.' },
  'queen-vs-rook': { full: 'queen versus rook is a win with care, but the rook fights on with a fortress and stalemate tricks.', short: 'Queen vs rook — fortress tricks.' },
  'rook-vs-minor': { full: 'a rook against a minor piece usually converts, but watch for a fortress the minor can build.', short: 'Rook vs minor — watch fortresses.' },
  'opposite-bishops': { full: 'opposite-coloured bishops are famously drawish — each bishop guards squares the other can never touch.', short: 'Opposite bishops — drawish.' },
  'same-bishops': { full: 'a same-coloured bishop ending goes to the better bishop and the more active king.', short: 'Bishop ending — the better bishop.' },
  'bishop-vs-knight': { full: 'bishop versus knight: the bishop wants open lines and both wings, the knight wants an outpost and a fixed structure.', short: 'Bishop vs knight — open vs outpost.' },
  'knight-endgame': { full: 'a knight ending plays much like a pawn ending — king activity and the passed pawn decide it.', short: 'Knight ending — like pawns.' },
  'minor-endgame': { full: 'a minor-piece ending goes to activity, the better piece, and a centralized king.', short: 'Minor ending — activity and king.' },
  'rook-and-minor': { full: 'a rook-and-minor ending is won slowly: keep the pieces active and pile on the weakest pawn.', short: 'Rook and minor — stay active.' },
  'major-piece': { full: 'a major-piece ending turns on activity, the seventh rank, and king safety — a loose king invites perpetual check.', short: 'Major pieces — take the seventh.' },
  'mating-material': { full: 'this is enough to force mate — drive the lone king to the edge and box it in with king and piece together.', short: 'Force mate — king to the edge.' },
  complex: null,
  'non-endgame': null,
};

/** Uppercase the first letter of a sentence. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Named-technique concept for an ending, when a deterministic technique detector
 *  fires (specific > the generic matchup principle). `importance` is the
 *  technique's own (a fired theorem outranks the generic principle). */
function technique(id: string, name: string, full: string, short: string, squares: string[] = [], importance = 0.6): ComputedConcept {
  return { id, name, source: 'technique', squares, full, short, importance };
}

function renderOppositionConcept(): ComputedConcept {
  return technique(
    'opposition', 'The opposition',
    'The opposition: the kings face off with an odd number of squares between them, and the side NOT to move has to give ground — taking it is how the stronger king forces its way in.',
    'The opposition — force them back.',
  );
}

/**
 * Render a detected tactic into a ComputedConcept: the board-true INSTANCE (the
 * detector's own description) + the computed INVARIANT. `importance` is left 0
 * for the router to fill.
 */
export function renderTacticConcept(pattern: TacticPattern, boardFen: string): ComputedConcept | null {
  if (pattern.type === 'none') return null;
  const inv = TACTIC_INVARIANT[pattern.type];
  const desc = pattern.description.trim().replace(/[.!?]$/, '');
  return {
    id: pattern.type,
    name: TACTIC_NAME[pattern.type],
    source: 'tactic',
    squares: pattern.involvedSquares,
    full: desc ? `${cap(desc)} — ${inv.full}` : cap(inv.full),
    short: inv.short,
    importance: 0,
    boardFen,
    ...(desc ? {} : { bare: true as const }),
  };
}

/**
 * Render an endgame matchup into a ComputedConcept (the governing principle).
 * Returns null for classes with no endgame-technique concept (complex /
 * non-endgame) — those positions are taught by the tactic/positional detectors.
 */
export function renderMatchupConcept(m: MatchupResult): ComputedConcept | null {
  const principle = MATCHUP_PRINCIPLE[m.cls];
  if (!principle) return null;
  return {
    id: m.cls,
    name: cap(m.label),
    source: 'matchup',
    squares: [],
    full: cap(principle.full),
    short: principle.short,
    importance: 0,
  };
}

// ─── conceptForBoard — the ONE entry point ───────────────────────────────────
import { detectTactics } from './tacticsDetector';
import { classifyMatchup } from './endgameMatchup';
import {
  detectOpposition, detectKeySquares, detectRuleOfSquare, detectRookPawnCorner,
  detectLucena, detectPhilidor, detectCutOff, detectRookBehindPasser,
} from './endgameTechnique';

/**
 * The NAMED endgame technique a position teaches, when one of the deterministic
 * geometry predicates fires — routed by matchup class so a theorem is only
 * asked on the board it holds for. Most-specific first inside each class.
 * Every `full` states the geometry the detector proved plus the technique's
 * general rule; none claims a game result (the other king may still decide it).
 */
function namedTechniqueFor(fen: string, cls: MatchupClass): ComputedConcept | null {
  if (cls === 'kp-vs-k') {
    const ks = detectKeySquares(fen);
    if (ks?.kingOnKeySquare) {
      return technique(
        'key-squares', 'The key squares',
        `The king on ${ks.kingOnKeySquare} stands on a key square of the ${ks.pawn} pawn — from there the pawn promotes by force whoever is to move, so the whole fight in king and pawn against king is to reach one of those squares (${ks.keySquares.join(', ')}).`,
        'Key square — the pawn queens by force.', [ks.kingOnKeySquare, ks.pawn], 0.7,
      );
    }
    const corner = detectRookPawnCorner(fen);
    if (corner) {
      return technique(
        'rook-pawn-corner', 'The rook-pawn draw',
        `The ${corner.pawn} pawn is a rook pawn and the defending king holds the ${corner.corner} corner: it can never be driven out, and pushing the pawn only stalemates — a rook pawn alone cannot be forced through.`,
        'Rook pawn — the corner holds.', [corner.pawn, corner.corner], 0.65,
      );
    }
    // A pure RACE (the attacking king too far to support) is the rule of the
    // square, even if the kings happen to be aligned — the opposition only
    // governs when the kings are fighting over the pawn's squares.
    const race = detectRuleOfSquare(fen);
    if (race) {
      return technique(
        'rule-of-the-square', 'The rule of the square',
        race.defenderInside
          ? `The defending king is inside the square of the ${race.pawn} pawn — count the ranks to promotion, draw the square, and a king inside it catches the pawn on its own; the race then depends on the other king.`
          : `The defending king is outside the square of the ${race.pawn} pawn — count the ranks to promotion, draw the square, and a king outside it can never catch the pawn: it queens on its own.`,
        race.defenderInside ? 'Inside the square — the pawn is caught.' : 'Outside the square — the pawn queens.', [race.pawn], 0.65,
      );
    }
    const opp = detectOpposition(fen);
    if (opp) return renderOppositionConcept();
    if (ks) {
      return technique(
        'key-squares', 'The key squares',
        `The ${ks.pawn} pawn's key squares are ${ks.keySquares.join(', ')} — get the king onto one of them and the pawn promotes by force whoever is to move; the pawn itself waits until the king is there.`,
        'Head for a key square.', [ks.pawn, ...ks.keySquares], 0.6,
      );
    }
    return null;
  }
  if (cls === 'pawn-endgame') {
    // With several pawns only the DIRECT opposition is a concept — kings that
    // happen to share a rank three squares apart across a busy pawn ending are
    // not "in distant opposition" in any way that decides the position (the
    // 4,000-puzzle probe: every distant hit there was noise, every direct hit
    // a real face-off).
    const opp = detectOpposition(fen);
    return opp?.kind === 'direct' ? renderOppositionConcept() : null;
  }
  // Rook techniques: the pure rook ending, and R(+P) against a lone king
  // (classed as mating material) — cutting the king off is the same theorem
  // there. Each detector checks its own exact material.
  if (cls === 'rook-endgame' || cls === 'mating-material') {
    const lucena = detectLucena(fen);
    if (lucena) {
      return technique(
        'lucena', 'The Lucena position',
        `This is the Lucena position: the ${lucena.pawn} pawn on the seventh with the king in front of it and the defending king cut off. The win is to build a bridge — lift the rook to the fourth rank, then walk the king out of the checks and shelter it behind that rook.`,
        'Lucena — build the bridge.', [lucena.pawn], 0.75,
      );
    }
    const phil = detectPhilidor(fen);
    if (phil) {
      return technique(
        'philidor', 'The Philidor defence',
        phil.thirdRankSet
          ? `A Philidor rook ending: the defending king sits in front of the ${phil.pawn} pawn and the rook already holds the third rank, so the attacking king cannot come forward. Hold that rank; the moment the pawn steps up, drop the rook back and check from behind.`
          : `A Philidor rook ending: the defending king sits in front of the ${phil.pawn} pawn, which has not crossed the fifth rank. The drawing plan is the third-rank defence — put the rook on the third rank to fence the attacking king out, and once the pawn advances, check it from behind for as long as it takes.`,
        'Philidor — hold the third rank.', [phil.pawn], 0.7,
      );
    }
    const cut = detectCutOff(fen);
    if (cut) {
      const kind = /^[a-h]$/.test(cut.line) ? `${cut.line}-file` : `${cut.line}${cut.line === '1' ? 'st' : cut.line === '2' ? 'nd' : cut.line === '3' ? 'rd' : 'th'} rank`;
      return technique(
        'cut-off-king', 'Cutting off the king',
        `The rook on ${cut.rook} cuts the defending king off along the ${kind}: it cannot cross to reach the ${cut.pawn} pawn without stepping into the rook's line, so the pawn and king can advance on the far side unhindered.`,
        'Cut the king off.', [cut.rook, cut.pawn], 0.65,
      );
    }
    // Tarrasch's rule is only claimed on the pure rook ending — on a busier
    // board the file the rook holds is one factor among many.
    const behind = cls === 'rook-endgame' ? detectRookBehindPasser(fen) : null;
    if (behind) {
      return technique(
        'rook-behind-passer', 'Rook behind the passed pawn',
        behind.ownPawn
          ? `The rook on ${behind.rook} stands behind its own ${behind.pawn} pawn — Tarrasch's rule: from behind it pushes the pawn while staying free, and every step forward lengthens its reach.`
          : `The rook on ${behind.rook} stands behind the enemy ${behind.pawn} pawn — Tarrasch's rule: from behind it ties the pawn down, and every step the pawn takes shortens its own defender's leash.`,
        'Rook behind the passed pawn.', [behind.rook, behind.pawn], 0.6,
      );
    }
    return null;
  }
  // The wrong-bishop draw lives in a K+B+P vs K matchup (classed as a minor
  // ending) — the detector checks the exact material itself.
  const wrong = detectRookPawnCorner(fen);
  if (wrong?.kind === 'wrong-bishop') {
    return technique(
      'wrong-rook-pawn-bishop', 'The wrong-bishop draw',
      `The ${wrong.pawn} pawn is a rook pawn and the bishop never touches its promotion corner (${wrong.corner}), so with the defending king in that corner nothing can evict it and the pawn cannot be forced through — a wrong-bishop draw.`,
      'Wrong bishop — the corner holds.', [wrong.pawn, wrong.corner], 0.7,
    );
  }
  return null;
}

/**
 * The endgame concept for a position: the NAMED technique when a deterministic
 * detector fires (specific), else the matchup governing principle (general), else
 * null (not an ending). This is the specific>general>silent degrade.
 */
export function endgameConceptFor(fen: string): ComputedConcept | null {
  const m = classifyMatchup(fen);
  try {
    const named = namedTechniqueFor(fen, m.cls);
    if (named) return named;
  } catch { /* a predicate that throws teaches nothing — fall through to the principle */ }
  return renderMatchupConcept(m);
}

export interface ConceptForBoardOptions {
  /** The student's side, when the board is their own game (frames "you/they").
   *  Omitted on a puzzle → the solver is inferred. */
  studentSide?: Side;
  /** Cap on concepts returned (lead + supports). Default 3. */
  max?: number;
  /** The surface's EXISTING engine read (the eval-bar analysis
   *  `buildFedTacticsContext` guarantees). Never fetched here — one computer.
   *  When present, its PV is walked and its swing ranks the concepts. Only the
   *  fields actually read are required, so a `Pick` (as positionFacts holds)
   *  and the full analysis both fit. */
  analysis?: Pick<StockfishAnalysis, 'topLines' | 'evaluation'> | null;
  /** Student rating — scales the PV walk depth (`pvDepthForRating`) and the
   *  shared criticality thresholds. Default 1500. */
  rating?: number;
}

/** A DECISIVE tactic on the board right now (mate threat / back rank / double
 *  check) is worth naming even without a line; a bare geometric pin/fork sitting
 *  on a busy board is not (that is exactly the incidental-tactic noise the
 *  isolated tests surfaced). The LINE walk (`conceptForLine`) is what names the
 *  rest — from the engine's own PV, ranked by its swing. No static importance
 *  table: that would be the "second parallel criticality" CLAUDE.md forbids. */
const DECISIVE_ON_BOARD = new Set<TacticPatternType>(['mate_threat', 'back_rank', 'double_check']);

/**
 * Read a board and return the teachable concept(s) present — COMPUTED and RANKED
 * most-important-first (multi-concept: David 2026-09-14 "Speak multi concepts").
 *
 * ONE COMPUTATIONAL SYSTEM (David 2026-09-14): this is a CONSUMER of the
 * analysis the surface already holds, never its own engine. Geometry answers
 * instantly (decisive tactics on the board, the endgame principle/technique, the
 * board-provable positional ideas); when `opts.analysis` — the eval-bar read
 * `buildFedTacticsContext` already guarantees — is present, the engine's PV is
 * walked by `conceptForLine` and its swing ranks the story of the line. A cold
 * board degrades to geometry, never to silence-where-it-matters. Empty array =
 * nothing teachable (quiet position); the caller stays silent (empty > invented).
 */
export function conceptForBoard(fen: string, opts: ConceptForBoardOptions = {}): ComputedConcept[] {
  const max = opts.max ?? 3;
  const out: ComputedConcept[] = [];
  const seen = new Set<string>();

  // 0. The engine's line, when the surface already has one (the one computer).
  const line = opts.analysis?.topLines?.[0];
  if (line && line.moves.length > 0) {
    const studentColor: 'w' | 'b' = opts.studentSide
      ? (opts.studentSide === 'white' ? 'w' : 'b')
      : (fen.split(' ')[1] === 'w' ? 'w' : 'b'); // live board: the mover's line
    const depth = pvDepthForRating(opts.rating ?? DEFAULT_STUDENT_RATING);
    for (const c of conceptForLine({
      fen,
      uci: line.moves.slice(0, depth),
      studentColor,
      rootEvalCp: opts.analysis?.evaluation ?? null,
      lineEvalCp: line.evaluation,
      lineMate: line.mate ?? null,
    })) {
      if (seen.has(c.id)) continue;
      out.push(c);
      seen.add(c.id);
    }
  }

  // 1. Decisive tactics on the board right now (geometry, FEN-only, instant).
  let tactics: ReturnType<typeof detectTactics>['tactics'] = [];
  try { tactics = detectTactics(fen).tactics; } catch { tactics = []; }
  for (const t of tactics) {
    if (!DECISIVE_ON_BOARD.has(t.type) || seen.has(t.type)) continue;
    const concept = renderTacticConcept(t, fen);
    if (!concept) continue;
    concept.importance = 0.95;
    out.push(concept);
    seen.add(t.type);
  }

  // 2. The endgame governing principle (teaching beat), when it's an ending.
  try {
    const eg = endgameConceptFor(fen);
    if (eg && !seen.has(eg.id)) {
      // A teaching beat ranks below live tactics but is always worth saying in a
      // quiet ending (where no tactic fired, it becomes the lead). A fired named
      // technique keeps its own (higher) importance from endgameConceptFor.
      if (eg.source !== 'technique') eg.importance = out.length === 0 ? 0.55 : 0.5;
      out.push(eg);
      seen.add(eg.id);
    }
  } catch { /* not an ending — skip */ }

  // 3. Positional concepts — the quiet-position teaching (lead when nothing
  // tactical/endgame fired; a support otherwise). Board-provable only.
  for (const p of positionalConcepts(fen)) {
    if (seen.has(p.id)) continue;
    out.push(p);
    seen.add(p.id);
  }

  out.sort((a, b) => b.importance - a.importance);
  return dropGenericLead(out).slice(0, max);
}

// ─── conceptForLine — THE single walker (solution OR engine PV) ──────────────
import { computePlyFacts, pvDepthForRating, type PrevCaptureContext } from './pvPlayback';
import { classifyMatePattern } from './matePatterns';
import { Chess } from 'chess.js';

export interface LineInput {
  fen: string;
  /** The line in UCI — a puzzle's verified solution, or `topLines[0].moves`. */
  uci: string[];
  /** The side whose concept we teach (the solver / the student). */
  studentColor: 'w' | 'b';
  /** Root eval (white-POV cp) from the SAME analysis the line came from. */
  rootEvalCp?: number | null;
  /** The line's eval (white-POV cp) — the engine's own read of what the line
   *  delivers. With rootEvalCp this is the engine's SWING, the shared ranking
   *  signal. Omitted on a puzzle (its solution is already verified). */
  lineEvalCp?: number | null;
  /** Forced mate reported for the line (null/undefined = none). */
  lineMate?: number | null;
  max?: number;
  /** Restrict the walk to these concept sources. A caller that only needs the
   *  line's TACTIC (the tactic classifier, P4b) skips the endgame + positional
   *  beats — same walker, narrowed output, ~5ms saved per quiet ply. Omitted =
   *  every source (the teaching surfaces). */
  sources?: readonly ConceptSource[];
}

/**
 * Importance from the ENGINE'S swing, bucketed against the SHARED band-free
 * `criticalityThresholds` — the same scale `scanCriticality` uses, so there is
 * ONE criticality in the app (CLAUDE.md: never a second parallel one). Mover-POV:
 * a line that is good for the student scores high. Returns null when no engine
 * read is available (the caller falls back to board-true material).
 */
function importanceFromSwing(input: LineInput): number | null {
  if (input.lineMate != null) return 0.98; // forced mate — decisive, full stop
  if (input.rootEvalCp == null || input.lineEvalCp == null) return null;
  const whiteSwing = input.lineEvalCp - input.rootEvalCp;
  const moverSwing = input.studentColor === 'w' ? whiteSwing : -whiteSwing;
  const t = criticalityThresholds();
  if (moverSwing >= t.onlyMove) return 0.95;
  if (moverSwing >= t.critical) return 0.88;
  if (moverSwing >= t.notable) return 0.8;
  return 0.65; // a real line, modest gain — worth teaching, below the decisive tier
}

/**
 * The concept(s) of a LINE — the one walker behind both puzzles and the live
 * board (David 2026-09-14: "the forward looking PV is needed and stockfish
 * analysis all working together at the time to form a comprehensive picture").
 *
 * Walks the line with `computePlyFacts` — the app's existing per-ply computer,
 * whose `tacticLanded` is already reality-gated (agent = the moved piece,
 * targets winnable, sliders only for pins, and — added 2026-09-21 — the AGENT
 * SURVIVES: a fork whose forker can simply be captured is not a fork). That
 * last term reaches THIS function and not only the prose, because the key-move
 * score below weights a landed tactic at 10: a move whose "fork" was fake no
 * longer outranks a move that really wins material. Per STUDENT ply the key move is the
 * one that mates, else lands a real tactic with the most material, else wins
 * the most material. Importance = the engine's swing (shared thresholds) when the
 * line came with one, else board-true material. The technique the line REACHES
 * (the opposition) is preferred over the generic start principle; positional
 * ideas ride as supports. Ranked, multi-concept, G0 — the story of the line.
 */
export function conceptForLine(input: LineInput): ComputedConcept[] {
  const out: ComputedConcept[] = [];
  const seen = new Set<string>();
  const { fen, uci, studentColor } = input;
  const wants = (src: ConceptSource): boolean => !input.sources || input.sources.includes(src);
  let techConcept: ComputedConcept | null = null;

  // No position, no concept: an unparseable root FEN must not reach the
  // endgame / positional beats below (the matchup parser once read "nope"
  // as a minor-piece ending — specific-but-wrong on garbage).
  try { new Chess(fen); } catch { return out; }

  try {
    const c = new Chess(fen);
    let best: { fenAfter: string; tactic: string | null; isMate: boolean; to: string; material: number; line: string[] } | null = null;
    let bestScore = -Infinity;
    let prev: PrevCaptureContext = { square: null, capturedValue: 0 };
    const path: string[] = [];
    for (const u of uci) {
      const fenBefore = c.fen();
      const mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined });
      if (!mv) break;
      path.push(mv.san);
      const fenAfter = c.fen();
      const facts = computePlyFacts(fenBefore, fenAfter, { captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion }, prev);
      prev = mv.captured ? { square: mv.to, capturedValue: VAL[mv.captured] ?? 0 } : { square: null, capturedValue: 0 };
      if (mv.color !== studentColor) continue;
      // Key-move score: mate » real landed tactic (weighted by what it nets) »
      // material. Every term is board-true from computePlyFacts.
      const score = facts.isMate ? 1000 : (facts.tacticLanded ? 10 : 0) + facts.materialGained;
      if (score > bestScore) {
        bestScore = score;
        best = { fenAfter, tactic: facts.tacticLanded, isMate: facts.isMate, to: mv.to, material: facts.materialGained, line: [...path] };
      }
      if (!techConcept && wants('technique')) {
        const tech = endgameConceptFor(fenAfter);
        if (tech && tech.source === 'technique') techConcept = tech;
      }
    }

    // A DELIVERED mate is named by its pattern (Narration Voice Rule 7: "name
    // the pattern, not the move") — the geometry classifier over the mated
    // board, vocabulary from mating-patterns.json. Falls through to the
    // generic mate register when no named pattern matches.
    if (best?.isMate && wants('mate')) {
      const mp = classifyMatePattern(best.fenAfter);
      if (mp && !seen.has(mp.id)) {
        out.push({
          id: mp.id,
          name: mp.name,
          source: 'mate',
          squares: mp.squares,
          // Prospective phrasing on purpose: the same line walker serves a
          // solved puzzle AND a live engine PV that merely REACHES the mate.
          full: `${mp.name} — ${mp.recognition}`,
          short: `${mp.name}.`,
          importance: 0.98,
        });
        seen.add(mp.id);
        best = null;
      }
    }
    if (best && (best.tactic || best.isMate) && wants('tactic')) {
      const type = best.tactic ?? 'mate_threat';
      const landingSquare = best.to;
      let pattern: TacticPattern | null = null;
      try {
        // Re-fetch the SAME pattern computePlyFacts validated: same type AND its
        // agent square is the square the student's move landed on. Type-only
        // matching could return a different pattern of that type (e.g. the
        // opponent's pin) — the bug the integration exposed.
        pattern = detectTactics(best.fenAfter).tactics.find(
          (t) => t.type === type && t.involvedSquares[0] === landingSquare,
        ) ?? null;
      } catch { pattern = null; }
      const concept = pattern
        ? renderTacticConcept(pattern, best.fenAfter)
        : renderTacticConcept({ type: type as TacticPatternType, involvedSquares: [best.to], description: '' }, best.fenAfter);
      if (concept && !seen.has(concept.id)) {
        concept.line = best.line;
        const fromEngine = importanceFromSwing(input);
        concept.importance = best.isMate
          ? 0.98
          : (fromEngine ?? Math.min(0.9, 0.7 + Math.max(0, best.material) * 0.04));
        out.push(concept);
        seen.add(concept.id);
      }
    }
  } catch { /* unparseable line — teach nothing from it */ }

  // Endgame teaching beat: the technique reached during the solution (preferred),
  // else the start-position matchup principle.
  try {
    const eg = techConcept ?? ((wants('technique') || wants('matchup')) ? endgameConceptFor(fen) : null);
    if (eg && !seen.has(eg.id) && wants(eg.source)) {
      if (eg.source !== 'technique') eg.importance = 0.5;
      out.push(eg);
      seen.add(eg.id);
    }
  } catch { /* not an ending */ }

  // Positional teaching beat — many quiet/defensive puzzles are about a
  // positional idea rather than a tactic; the board-provable positional concepts
  // catch those (lead when nothing else fired, a support otherwise).
  if (wants('positional')) {
    for (const p of positionalConcepts(fen)) {
      if (seen.has(p.id)) continue;
      out.push(p);
      seen.add(p.id);
    }
  }

  out.sort((a, b) => b.importance - a.importance);
  return dropGenericLead(out).slice(0, input.max ?? 3);
}

export interface ConceptForSolutionOptions { studentSide?: Side; max?: number; }

/** The concept behind a PUZZLE solution — `conceptForLine` over the verified
 *  solution (the solver is the side opposite the FEN's turn: Lichess convention). */
export function conceptForSolution(
  fen: string,
  solutionUci: string[],
  opts: ConceptForSolutionOptions = {},
): ComputedConcept[] {
  const studentColor: 'w' | 'b' = opts.studentSide
    ? (opts.studentSide === 'white' ? 'w' : 'b')
    : (fen.split(' ')[1] === 'w' ? 'b' : 'w');
  return conceptForLine({ fen, uci: solutionUci, studentColor, max: opts.max });
}

// ─── POSITIONAL concept source (§E) ──────────────────────────────────────────
import { boardConcepts } from './boardConcepts';
import { DEFAULT_STUDENT_RATING } from './ratingBands';

/** Positional-tag → invariant (computed vocabulary; general + reusable). Only the
 *  board-PROVABLE tags boardConcepts emits — never intent judgements. */
// Typed over the union (2026-09-17): this and POSITIONAL_PRIORITY were both
// `string`-keyed, so a typo in either produced NO concept, silently. A Record
// over PositionalConceptId makes a missing or misspelled member fail to compile.
const POSITIONAL_INVARIANT: Record<PositionalConceptId, { name: string; full: string; short: string }> = {
  'passed-pawn': { name: 'Passed pawn', full: 'A passed pawn: no enemy pawn can stop it, so push it — enemy pieces must drop back to babysit it, and that ties them down.', short: 'Passed pawn — push it.' },
  'knight-outpost': { name: 'Knight outpost', full: 'A knight outpost: a knight on a hole the enemy pawns can no longer challenge is a monster — it can\'t be kicked, so build the position around it.', short: 'Outpost — it can\'t be kicked.' },
  'king-safety': { name: 'King safety', full: 'The king is exposed: before anything else, count its flight squares and the attackers heading its way — safety comes before ambition.', short: 'King safety — count the attackers.' },
  'pawn-storm': { name: 'Pawn storm', full: 'A pawn storm: pawns marching at the enemy king pry it open — every push is a crowbar against its shelter.', short: 'Pawn storm — pry the king open.' },
  'piece-activity': { name: 'Active rook', full: 'An active rook on the seventh rank or an open file is a highway — it hits pawns from behind and cramps the enemy; seize the file before they do.', short: 'Active rook — take the file.' },
  'open-file': { name: 'Open file', full: 'An open file is a highway for the rooks — occupy it, double on it, and use it to break into the enemy camp.', short: 'Open file — occupy it.' },
  'bishop-pair': { name: 'Bishop pair', full: 'The bishop pair rakes open diagonals in tandem — open the position so both bishops can breathe and the pair tells.', short: 'Bishop pair — open it up.' },
  'pawn-structure': { name: 'Pawn weakness', full: 'A pawn weakness — an isolated or doubled pawn can\'t be defended by another pawn, so it\'s a permanent target: fix it, then pile on.', short: 'Weak pawn — a fixed target.' },
  'development': { name: 'Development lead', full: 'A lead in development is temporary — get the last pieces out and open lines now, before the opponent catches up and it evaporates.', short: 'Develop — use the lead fast.' },
};

/** Most-instructive-first, so the lead positional concept is the decisive one. */
const POSITIONAL_PRIORITY: readonly PositionalConceptId[] = ['passed-pawn', 'knight-outpost', 'king-safety', 'pawn-storm', 'piece-activity', 'open-file', 'bishop-pair', 'pawn-structure', 'development'];

/** Tags SHARP enough to LEAD a quiet position on their own. The rest (bishop
 *  pair, a pawn weakness, a development lead) are true on nearly every
 *  middlegame — platitudes as a lead ("empty > generic"). They ride only as
 *  SUPPORTS behind a real lead. Measured 2026-09-14: letting them lead took
 *  puzzle silence 57%→3% while agreement did not move — noise, not teaching. */
const POSITIONAL_LEAD_ELIGIBLE = new Set<PositionalConceptId>(['passed-pawn', 'knight-outpost', 'king-safety', 'pawn-storm', 'piece-activity', 'open-file']);

/** Drop positional platitudes that would be the LEAD (or the only) concept.
 *  A generic positional idea is fine as a support behind a real lead. */
function dropGenericLead(out: ComputedConcept[]): ComputedConcept[] {
  const lead = out[0];
  const leadTag = lead ? asPositionalConcept(lead.id) : null;
  if (!lead || lead.source !== 'positional' || (leadTag && POSITIONAL_LEAD_ELIGIBLE.has(leadTag))) return out;
  return out.filter((c) => c.source !== 'positional');
}

/** Board-provable positional concepts present (from boardConcepts), rendered and
 *  priority-ordered. Endgame-type + tactic tags are excluded (owned by the
 *  matchup classifier + detectTactics). Importance sits below tactics/endgame —
 *  positional teaching is the quiet-position lead, a support otherwise. */
export function positionalConcepts(fen: string): ComputedConcept[] {
  let bc: ReturnType<typeof boardConcepts>;
  try { bc = boardConcepts(fen); } catch { return []; }
  if (!bc) return [];
  const out: ComputedConcept[] = [];
  for (const tag of POSITIONAL_PRIORITY) {
    if (!bc.concepts.includes(tag)) continue;
    const t = POSITIONAL_INVARIANT[tag];
    // Sharp ideas may lead a quiet position; generic ones are supports only.
    const importance = POSITIONAL_LEAD_ELIGIBLE.has(tag) ? 0.4 : 0.3;
    out.push({ id: tag, name: t.name, source: 'positional', squares: [], full: t.full, short: t.short, importance });
  }
  return out;
}

/** The computed INVARIANT for a landed tactic type — the general "why it works",
 *  in both registers — so a per-ply/line renderer (review projections, Learn/Play
 *  engine deltas) can teach the idea once where the tactic lands instead of a
 *  bare "lands a fork". Same vocabulary the concept engine speaks (one voice).
 *  Null for the no-tactic sentinel / an unknown type. */
export function tacticInvariant(type: string): Register | null {
  if (type === 'none') return null;
  return (TACTIC_INVARIANT as Record<string, Register | undefined>)[type] ?? null;
}
