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
import type { MatchupClass, MatchupResult } from './endgameMatchup';

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

export type ConceptSource = 'tactic' | 'matchup' | 'technique' | 'positional';

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
 *  fires (specific > the generic matchup principle). Currently: the opposition. */
function renderOppositionConcept(): ComputedConcept {
  return {
    id: 'opposition',
    name: 'The opposition',
    source: 'technique',
    squares: [],
    full: 'The opposition: the kings face off with an odd number of squares between them, and the side NOT to move has to give ground — taking it is how the stronger king forces its way in.',
    short: 'The opposition — force them back.',
    importance: 0,
  };
}

/**
 * Render a detected tactic into a ComputedConcept: the board-true INSTANCE (the
 * detector's own description) + the computed INVARIANT. `importance` is left 0
 * for the router to fill.
 */
export function renderTacticConcept(pattern: TacticPattern): ComputedConcept | null {
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
import { detectOpposition } from './endgameTechnique';

/**
 * The endgame concept for a position: the NAMED technique when a deterministic
 * detector fires (specific), else the matchup governing principle (general), else
 * null (not an ending). This is the specific>general>silent degrade.
 */
export function endgameConceptFor(fen: string): ComputedConcept | null {
  const m = classifyMatchup(fen);
  if (m.cls === 'pawn-endgame' || m.cls === 'kp-vs-k') {
    if (detectOpposition(fen)) {
      const opp = renderOppositionConcept();
      opp.importance = 0.6; // a fired technique outranks the generic principle
      return opp;
    }
  }
  return renderMatchupConcept(m);
}

export interface ConceptForBoardOptions {
  /** The student's side, when the board is their own game (frames "you/they").
   *  Omitted on a puzzle → the solver is inferred. */
  studentSide?: Side;
  /** Cap on concepts returned (lead + supports). Default 3. */
  max?: number;
}

/** Deterministic importance so the ranking is computed, never LLM-picked. The
 *  full rating-scaled importance filter (decision-leverage / realized-swing /
 *  must-defend / contested gate — plan §must-build 4) refines this in P4b; this
 *  is the coarse, honest ordering: decisive tactics first, then material-winning
 *  tactics, then the endgame teaching beat. */
const TACTIC_IMPORTANCE: Record<Exclude<TacticPatternType, 'none'>, number> = {
  mate_threat: 0.98, back_rank: 0.95, double_check: 0.93,
  fork: 0.85, skewer: 0.84, discovery: 0.83, removal_of_guard: 0.80,
  trapped_piece: 0.78, pin: 0.75, overload: 0.72, battery: 0.60,
};

/**
 * Read a board and return the teachable concept(s) present — COMPUTED and RANKED
 * most-important-first (multi-concept: David 2026-09-14 "Speak multi concepts").
 * Tactic concepts from `detectTactics` (FEN-only geometry) + the endgame
 * governing principle from the matchup classifier. Pure/synchronous/G0 — every
 * surface can call it inline. Empty array = nothing teachable here (quiet
 * position); the caller stays silent (empty > invented).
 *
 * NOTE: this analyzes the FEN it is given. A puzzle surface teaching "the concept
 * behind the SOLUTION" passes the position AFTER the key solving move (as
 * `explainPuzzleConcept` already replays); a live surface passes the live board.
 */
export function conceptForBoard(fen: string, opts: ConceptForBoardOptions = {}): ComputedConcept[] {
  const max = opts.max ?? 3;
  const out: ComputedConcept[] = [];
  const seen = new Set<string>();

  // 1. Tactics on the board (geometry, FEN-only).
  let tactics: ReturnType<typeof detectTactics>['tactics'] = [];
  try { tactics = detectTactics(fen).tactics; } catch { tactics = []; }
  for (const t of tactics) {
    if (t.type === 'none' || seen.has(t.type)) continue;
    const concept = renderTacticConcept(t);
    if (!concept) continue;
    concept.importance = TACTIC_IMPORTANCE[t.type] ?? 0.5;
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

  out.sort((a, b) => b.importance - a.importance);
  return out.slice(0, max);
}

// ─── conceptForSolution — the PUZZLE / solution path ─────────────────────────
import { computePlyFacts, type PrevCaptureContext } from './pvPlayback';
import { Chess } from 'chess.js';

export interface ConceptForSolutionOptions { studentSide?: Side; max?: number; }

/**
 * The concept behind a SOLUTION (puzzle / best line) — distinct from
 * `conceptForBoard` (a static live board). The harness proved the difference:
 * detecting tactics on an arbitrary position surfaces INCIDENTAL tactics, and the
 * decisive move isn't always the first. So this walks the solution, scores each
 * STUDENT move by its computed swing (`computePlyFacts`: mate > material gained,
 * +bonus for a landed tactic — a deterministic importance signal, no engine), and
 * teaches the tactic the KEY move actually LANDS, read back from `detectTactics`
 * at that exact position (full squares + description). The endgame matchup
 * principle rides from the start position. Ranked, multi-concept, G0.
 */
export function conceptForSolution(
  fen: string,
  solutionUci: string[],
  opts: ConceptForSolutionOptions = {},
): ComputedConcept[] {
  const out: ComputedConcept[] = [];
  const seen = new Set<string>();

  try {
    const eg = endgameConceptFor(fen);
    if (eg) { if (eg.source !== 'technique') eg.importance = 0.5; out.push(eg); seen.add(eg.id); }
  } catch { /* not an ending */ }

  try {
    const c = new Chess(fen);
    const studentColor: 'w' | 'b' = fen.split(' ')[1] === 'w' ? 'b' : 'w';
    let best: { fenAfter: string; tactic: string | null; isMate: boolean; from: string; to: string } | null = null;
    let bestScore = -1;
    let prev: PrevCaptureContext = { square: null, capturedValue: 0 };
    for (const u of solutionUci) {
      const fenBefore = c.fen();
      const mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined });
      if (!mv) break;
      const fenAfter = c.fen();
      const facts = computePlyFacts(fenBefore, fenAfter, { captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion }, prev);
      prev = mv.captured ? { square: mv.to, capturedValue: VAL[mv.captured] ?? 0 } : { square: null, capturedValue: 0 };
      if (mv.color === studentColor) {
        const score = facts.isMate ? 100 : facts.materialGained + (facts.tacticLanded ? 3 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = { fenAfter, tactic: facts.tacticLanded, isMate: facts.isMate, from: mv.from, to: mv.to };
        }
      }
    }
    if (best && (best.tactic || best.isMate)) {
      const type = best.tactic ?? 'mate_threat';
      let pattern: TacticPattern | null = null;
      try {
        pattern = detectTactics(best.fenAfter).tactics.find(
          (t) => t.type === type && (!t.beneficiary || t.beneficiary === studentColor),
        ) ?? null;
      } catch { pattern = null; }
      const concept = pattern
        ? renderTacticConcept(pattern)
        : renderTacticConcept({ type: type as TacticPatternType, involvedSquares: [best.from, best.to], description: '' });
      if (concept && !seen.has(concept.id)) {
        concept.importance = best.isMate ? 0.98 : 0.85;
        out.push(concept);
        seen.add(concept.id);
      }
    }
  } catch { /* unparseable — skip */ }

  out.sort((a, b) => b.importance - a.importance);
  return out.slice(0, opts.max ?? 3);
}
