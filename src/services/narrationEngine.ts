import { Chess, type Move } from 'chess.js';
import { getConcept } from './chessConceptService';

/**
 * narrationEngine — deterministic, $0, zero-hallucination move
 * narration for every surface in the app (openings walkthroughs,
 * coach Learn/Play move commentary, tactics, game review).
 *
 * Composes one line from three FREE sources, no LLM call:
 *   1. MOVE FACTS  — chess.js: what the move does (capture, check,
 *      castle, promotion, development, the squares it now attacks).
 *   2. VERDICT     — the eval (stored verifiedEval for opening lines,
 *      or local-Stockfish cp/mate for live surfaces) phrased in
 *      plain language ("a clear pawn up", "winning", "forced mate").
 *   3. WISDOM      — a one-line strategic framing pulled from the
 *      book-concept library (chess-concepts.json) when the move's
 *      tactical theme or the named concept resolves.
 *
 * The LLM stays reserved for free-form coach chat. Everything
 * narration-shaped routes through here at zero ongoing API cost.
 *
 * Kid surfaces must use `narrateMoveKid` (no book prose, no SAN,
 * spelled-out pieces) per the kid contract.
 */

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

export interface MoveNarrationInput {
  /** FEN before the move is played. */
  fenBefore: string;
  /** The move in SAN (e.g. "Bxf7+", "O-O", "e4"). */
  san: string;
  /** Optional eval AFTER the move from the mover's perspective.
   *  cp = centipawns (+ = mover better); mate = mate-in-N (+ for
   *  mover). Opening lines pass their stored verifiedEval; live
   *  surfaces pass the local-Stockfish result. */
  evalCp?: number | null;
  evalMate?: number | null;
  /** Optional tactical theme (fork, pin, mate, sacrifice, …) — drives
   *  the wisdom layer. Tactics/trap surfaces have this. */
  theme?: string | null;
  /** Optional concept id (e.g. 'pos-center', 'pawn-isolated') to pull
   *  a specific book framing. */
  conceptId?: string | null;
}

interface MoveFacts {
  mover: 'white' | 'black';
  pieceName: string;
  san: string;
  isCapture: boolean;
  capturedName: string | null;
  toSquare: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isCastle: 'king' | 'queen' | null;
  isPromotion: string | null;
  /** Squares the moved piece now attacks (enemy-occupied only). */
  newTargets: string[];
}

function parseFacts(fenBefore: string, san: string): MoveFacts | null {
  const c = new Chess(fenBefore);
  let move: Move;
  try {
    move = c.move(san.replace(/[+#!?]+$/, ''));
  } catch {
    return null;
  }
  const mover: 'white' | 'black' = move.color === 'w' ? 'white' : 'black';
  // Squares the moved piece now attacks that hold an enemy piece.
  const after = new Chess(c.fen());
  const enemy = move.color === 'w' ? 'b' : 'w';
  const newTargets: string[] = [];
  for (const sq of after.moves({ square: move.to, verbose: true })) {
    if (sq.captured) newTargets.push(sq.to);
  }
  void enemy;
  return {
    mover,
    pieceName: PIECE_NAMES[move.piece] ?? 'piece',
    san: move.san,
    isCapture: Boolean(move.captured),
    capturedName: move.captured ? (PIECE_NAMES[move.captured] ?? 'piece') : null,
    toSquare: move.to,
    isCheck: move.san.includes('+'),
    isCheckmate: move.san.includes('#') || c.isCheckmate(),
    isCastle: move.san === 'O-O' ? 'king' : move.san === 'O-O-O' ? 'queen' : null,
    isPromotion: move.promotion ? (PIECE_NAMES[move.promotion] ?? 'queen') : null,
    newTargets,
  };
}

// ── Verdict phrasing ──────────────────────────────────────────────
function verdict(evalCp?: number | null, evalMate?: number | null): string | null {
  if (evalMate != null && evalMate !== 0) {
    return evalMate > 0 ? `forced mate in ${evalMate}` : null;
  }
  if (evalCp == null) return null;
  const a = Math.abs(evalCp);
  if (a < 50) return null;                       // roughly equal — no verdict
  const side = evalCp > 0 ? 'now' : 'but';
  if (a >= 500) return `${side} winning`;
  if (a >= 300) return evalCp > 0 ? 'now up decisive material' : 'losing material';
  if (a >= 150) return evalCp > 0 ? 'now clearly better' : 'now clearly worse';
  return evalCp > 0 ? 'now slightly better' : 'now slightly worse';
}

// ── Tactical-theme phrasing ───────────────────────────────────────
const THEME_PHRASE: Record<string, string> = {
  fork: 'a fork — two targets at once',
  pin: 'a pin that freezes the defender',
  skewer: 'a skewer through to the piece behind',
  mate: 'the mating blow',
  mateIn1: 'mate in one',
  mateIn2: 'mate in two',
  mateIn3: 'mate in three',
  sacrifice: 'a sacrifice for the attack',
  hangingPiece: 'collecting the loose piece',
  attractionDeflection: 'an attraction — dragging the defender off',
  deflection: 'a deflection of the defender',
  attackingF2F7: 'the f7 strike',
  exposedKing: 'opening the king',
  kingsideAttack: 'the kingside attack',
  queensideAttack: 'the queenside break',
  discoveredAttack: 'a discovered attack',
  smotheredMate: "a smothered mate",
  trappedPiece: 'trapping the piece',
  capturingDefender: 'removing the defender',
};

// ── Public: deterministic move narration ──────────────────────────
export function narrateMove(input: MoveNarrationInput): string {
  const f = parseFacts(input.fenBefore, input.san);
  if (!f) return '';

  // 1. The move fact — what just happened, concretely.
  let fact: string;
  if (f.isCheckmate) {
    fact = `${f.san} — checkmate`;
  } else if (f.isCastle) {
    fact = `castles ${f.isCastle}side, tucking the king away`;
  } else if (f.isPromotion) {
    fact = `${f.san} promotes to a ${f.isPromotion}`;
  } else if (f.isCapture) {
    fact = `${f.san} takes the ${f.capturedName} on ${f.toSquare}`;
  } else {
    fact = `${f.san} brings the ${f.pieceName} to ${f.toSquare}`;
  }
  if (f.isCheck && !f.isCheckmate) fact += ', with check';

  // 2. What it now threatens (only when it adds signal).
  let threat = '';
  if (!f.isCheckmate && f.newTargets.length > 0) {
    threat = ` — eyeing ${f.newTargets.slice(0, 2).join(' and ')}`;
  }

  // 3. The verdict (eval), if decisive enough.
  const v = verdict(input.evalCp, input.evalMate);

  // 4. The wisdom layer — theme phrasing or a book concept framing.
  let wisdom = '';
  if (input.theme && THEME_PHRASE[input.theme]) {
    wisdom = THEME_PHRASE[input.theme];
  } else if (input.conceptId) {
    const concept = getConcept(input.conceptId);
    if (concept) {
      const passage = concept.passages[0];
      if (passage) {
        // Trim a book passage to a short clause.
        wisdom = `${concept.name.toLowerCase()} — the idea ${passage.author.split(/[;,]/)[0].trim()} stresses`;
      } else if (concept.fallbackDefinition) {
        wisdom = concept.name.toLowerCase();
      }
    }
  }

  // Assemble: fact (+ threat) — wisdom — verdict.
  const parts = [fact + threat];
  if (wisdom) parts.push(wisdom);
  if (v) parts.push(v);
  return parts.join('. ').replace(/\.\./g, '.') + '.';
}

// ── Public: kid-safe variant (no SAN, spelled-out, no book prose) ──
export function narrateMoveKid(input: Pick<MoveNarrationInput, 'fenBefore' | 'san'>): string {
  const f = parseFacts(input.fenBefore, input.san);
  if (!f) return '';
  if (f.isCheckmate) return 'Checkmate! The game is won.';
  if (f.isCastle) return 'The king castles to safety.';
  if (f.isCapture) return `The ${f.pieceName} captures the ${f.capturedName}.`;
  if (f.isCheck) return `The ${f.pieceName} gives check!`;
  if (f.isPromotion) return `The pawn becomes a ${f.isPromotion}!`;
  return `The ${f.pieceName} moves to a new square.`;
}
