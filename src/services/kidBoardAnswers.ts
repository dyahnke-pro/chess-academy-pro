/**
 * kidBoardAnswers — the COMPUTED answers to a child's question about the board
 * (kid surface, `/kid/play-games/:gameId`, the "Ask the Coach" box).
 *
 * G0 for kids: every chess fact a child hears is computed HERE, by chess.js on
 * the live position, and handed to the phrasing seam already written as plain,
 * kid-safe prose (spelled-out pieces, square names, never notation, no praise).
 * The model may only rephrase it; with no model the text below IS the answer.
 *
 * A pure leaf: chess.js + the shared `andList`/`orList`, nothing else. No coach
 * state, no weakness spine, no adult phrasing (kid non-negotiable 10).
 *
 * The answer kinds are the kid surface's whole vocabulary (plan 2026-10-04,
 * "Kids are unified too"): hint, where-can-it-go, is-it-safe, concept — plus the
 * computed "let's look at the board" line for anything else. `concept` is
 * answered by the shared concept spine in kidGameCoach; this module owns the
 * three board kinds and the board line.
 */
import { Chess } from 'chess.js';
import type { Color, PieceSymbol, Square } from 'chess.js';
import { andList, orList } from '../utils/andList';
// CAPTURE semantics (king = 100): used only to say an attacker is worth less
// than the piece it attacks — the trade that would cost.
import { CAPTURE_VALUE } from './pieceValues';

export type KidAnswerKind = 'hint' | 'where-can-it-go' | 'is-it-safe' | 'concept' | 'look-at-board';

const PIECE_WORD: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};


/** Words a child uses for each piece. "horse"/"horsey" is how most young
 *  children say knight. "castle" is deliberately NOT here: "can I castle?" is a
 *  question about castling, and reading it as "rook" would answer the wrong one. */
const PIECE_ALIASES: ReadonlyArray<{ re: RegExp; piece: PieceSymbol }> = [
  { re: /\bpawns?\b/, piece: 'p' },
  { re: /\b(knights?|horses?|horsey|horsie)\b/, piece: 'n' },
  { re: /\bbishops?\b/, piece: 'b' },
  { re: /\brooks?\b/, piece: 'r' },
  { re: /\bqueens?\b/, piece: 'q' },
  { re: /\bkings?\b/, piece: 'k' },
];

const SAFETY_RE =
  /\b(safe|unsafe|danger|dangerous|attack(?:ed|ing)?|under attack|protect(?:ed|ing)?|defend(?:ed|ing)?|guard(?:ed|ing)?|hanging|threat(?:en(?:ed)?)?|in check|get taken|be taken|can (?:they|it|he|she) (?:take|capture|eat|get))\b/;
const WHERE_RE =
  /\b(where (?:can|could|does|do|should|will|would)\b|how (?:does|do|can|could) (?:the |a |an |my |your |their |this |that )?(?:pawn|knight|horse|horsey|bishop|rook|queen|king)s?\b|which squares?\b|what squares?\b|moves? can\b|can (?:my |the |this |that )?\w+ (?:go|move)\b)/;
const HINT_RE =
  /\b(what (?:should|do|can|could|would) i (?:do|play|move|try)|what now|what next|next move|do next|play next|help|hint|clue|stuck|good move|best move|which move|why|what(?:'s| is) the (?:move|plan)|show me)\b/;

/** Which kind of question this is. Deterministic, keyword-shaped — the same
 *  input always routes the same way. `concept` is decided by the shared concept
 *  detector in kidGameCoach (it knows the corpus), so this only returns the
 *  board kinds or null. */
export function classifyKidBoardQuestion(question: string): Exclude<KidAnswerKind, 'concept' | 'look-at-board'> | null {
  const q = question.toLowerCase();
  if (SAFETY_RE.test(q)) return 'is-it-safe';
  if (WHERE_RE.test(q)) return 'where-can-it-go';
  if (HINT_RE.test(q)) return 'hint';
  return null;
}

function opposite(c: Color): Color {
  return c === 'w' ? 'b' : 'w';
}

function load(fen: string): Chess | null {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

/** The same board with `color` to move, so a child can ask where their piece
 *  can go while the other side is still thinking. En passant is cleared: it is
 *  a right of the side that was to move, and it would not survive the switch. */
function withTurn(fen: string, color: Color): Chess | null {
  const parts = fen.split(' ');
  if (parts.length < 4) return null;
  if (parts[1] === color) return load(fen);
  parts[1] = color;
  parts[3] = '-';
  return load(parts.join(' '));
}

/** "your knight on f3" / "their pawn on e5". */
function nameAt(chess: Chess, sq: Square, kid: Color): string {
  const p = chess.get(sq);
  if (!p) return `the empty square ${sq}`;
  return `${p.color === kid ? 'your' : 'their'} ${PIECE_WORD[p.type]} on ${sq}`;
}

function capitalise(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function allSquares(chess: Chess): Array<{ sq: Square; type: PieceSymbol; color: Color }> {
  const out: Array<{ sq: Square; type: PieceSymbol; color: Color }> = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell) out.push({ sq: cell.square, type: cell.type, color: cell.color });
    }
  }
  return out;
}

/** The pieces the question is about. A named square wins; then a named piece
 *  type (the kid's own by default, the other side's when they say "their" /
 *  name the other colour); `null` when the question names neither. An empty
 *  named square is returned as `{ empty }` so the answer can say so. */
export type KidPieceRef =
  | { kind: 'squares'; squares: Square[] }
  | { kind: 'empty'; square: Square }
  | { kind: 'missing'; color: Color; piece: PieceSymbol };

export function resolvePieceRef(question: string, fen: string, kid: Color): KidPieceRef | null {
  const chess = load(fen);
  if (!chess) return null;
  const q = question.toLowerCase();
  const sqMatch = /\b([a-h][1-8])\b/.exec(q);
  if (sqMatch) {
    const sq = sqMatch[1] as Square;
    return chess.get(sq) ? { kind: 'squares', squares: [sq] } : { kind: 'empty', square: sq };
  }
  const alias = PIECE_ALIASES.find((a) => a.re.test(q));
  if (!alias) return null;
  const kidWord = kid === 'w' ? 'white' : 'black';
  const otherWord = kid === 'w' ? 'black' : 'white';
  const theirs =
    /\b(their|theirs|opponent'?s?|enemy|other (?:side|player)'?s?)\b/.test(q) ||
    (new RegExp(`\\b${otherWord}(?:'s)?\\b`).test(q) && !new RegExp(`\\b${kidWord}(?:'s)?\\b`).test(q));
  const color = theirs ? opposite(kid) : kid;
  const squares = allSquares(chess)
    .filter((p) => p.type === alias.piece && p.color === color)
    .map((p) => p.sq);
  return squares.length > 0 ? { kind: 'squares', squares } : { kind: 'missing', color, piece: alias.piece };
}

function missingLine(ref: { color: Color; piece: PieceSymbol }, kid: Color): string {
  const whose = ref.color === kid ? 'You have' : 'They have';
  return `${whose} no ${PIECE_WORD[ref.piece]} left on the board.`;
}

// ─── IS IT SAFE ──────────────────────────────────────────────────────────────

/** One piece's safety, every fact computed: who attacks it, who protects it,
 *  and whether an attacker is worth less than it (the trade that costs). */
export function safetyFactsForSquare(fen: string, sq: Square, kid: Color): string {
  const chess = load(fen);
  const piece = chess?.get(sq);
  if (!chess || !piece) return `There is no piece on ${sq} right now.`;
  const enemy = opposite(piece.color);
  const name = nameAt(chess, sq, kid);
  const attackers = chess.attackers(sq, enemy);
  const defenders = chess.attackers(sq, piece.color);
  const attackerNames = andList(attackers.map((a) => nameAt(chess, a, kid)));

  if (piece.type === 'k') {
    return attackers.length > 0
      ? `${capitalise(name)} is in check from ${attackerNames}.`
      : `${capitalise(name)} is not in check right now.`;
  }
  if (attackers.length === 0) {
    return `${capitalise(name)} is safe right now — nothing is attacking it.`;
  }
  const lines = [`${capitalise(name)} is under attack from ${attackerNames}.`];
  if (defenders.length === 0) {
    lines.push('Nothing is protecting it, so it could be taken.');
  } else {
    lines.push(`${capitalise(andList(defenders.map((d) => nameAt(chess, d, kid))))} ${defenders.length === 1 ? 'protects' : 'protect'} it.`);
    if (attackers.every((a) => chess.get(a)?.type === 'k')) {
      lines.push(`${piece.color === kid ? 'Their' : 'Your'} king cannot take it, because it is protected.`);
    }
  }
  const cheaper = attackers
    .map((a) => chess.get(a)?.type)
    .filter((t): t is PieceSymbol => t !== undefined && t !== 'k' && CAPTURE_VALUE[t] < CAPTURE_VALUE[piece.type]);
  if (cheaper.length > 0 && defenders.length > 0) {
    const cheaperWord = andList(cheaper.map((t) => PIECE_WORD[t]));
    lines.push(`Careful: their ${cheaperWord} ${cheaper.length === 1 ? 'is' : 'are'} worth less than ${piece.color === kid ? 'your' : 'their'} ${PIECE_WORD[piece.type]}, so trading would cost ${piece.color === kid ? 'you' : 'them'}.`);
  }
  return lines.join(' ');
}

/** Every piece of `color` that is under attack right now, each with its full
 *  safety facts. Empty when nothing is attacked. No cap (G4.5). */
function attackedPieceFacts(fen: string, color: Color, kid: Color): string[] {
  const chess = load(fen);
  if (!chess) return [];
  return allSquares(chess)
    .filter((p) => p.color === color && chess.attackers(p.sq, opposite(color)).length > 0)
    .map((p) => safetyFactsForSquare(fen, p.sq, kid));
}

export function kidSafetyFacts(question: string, fen: string, kid: Color): string {
  const ref = resolvePieceRef(question, fen, kid);
  if (ref?.kind === 'empty') return `There is no piece on ${ref.square} right now.`;
  if (ref?.kind === 'missing') return missingLine(ref, kid);
  if (ref?.kind === 'squares') return ref.squares.map((sq) => safetyFactsForSquare(fen, sq, kid)).join(' ');
  const attacked = attackedPieceFacts(fen, kid, kid);
  return attacked.length > 0 ? attacked.join(' ') : 'None of your pieces is under attack right now.';
}

// ─── WHERE CAN IT GO ─────────────────────────────────────────────────────────

/** Every square one piece can legally reach, captures named, castling named.
 *  Computed on the board with that piece's side to move. */
export function whereFactsForSquare(fen: string, sq: Square, kid: Color): string {
  const base = load(fen);
  const piece = base?.get(sq);
  if (!base || !piece) return `There is no piece on ${sq} right now.`;
  const name = capitalise(nameAt(base, sq, kid));
  const chess = withTurn(fen, piece.color);
  if (!chess) return `${name} cannot be moved on this board.`;
  const moves = chess.moves({ square: sq, verbose: true });
  if (moves.length === 0) {
    if (chess.isCheck()) {
      return `${name} cannot move right now, because ${piece.color === kid ? 'your' : 'their'} king is in check and this piece cannot help.`;
    }
    // Pinned: lifting it off the board would expose its own king.
    const probe = new Chess(chess.fen());
    probe.remove(sq);
    const kingSq = allSquares(probe).find((p) => p.type === 'k' && p.color === piece.color)?.sq;
    if (kingSq && probe.attackers(kingSq, opposite(piece.color)).length > 0) {
      return `${name} cannot move right now — it has to stay where it is to keep ${piece.color === kid ? 'your' : 'their'} king safe.`;
    }
    return `${name} cannot move right now — its way is blocked.`;
  }
  const quiet = new Set<string>();
  const captures = new Map<string, string>();
  const castles: string[] = [];
  for (const m of moves) {
    if (m.isKingsideCastle()) castles.push('castle on the kingside');
    else if (m.isQueensideCastle()) castles.push('castle on the queenside');
    else if (m.captured) captures.set(m.to, `capture ${nameAt(chess, m.isEnPassant() ? (`${m.to[0]}${m.from[1]}` as Square) : m.to, kid)}`);
    else quiet.add(m.to);
  }
  const extras = [...captures.values(), ...castles];
  if (quiet.size === 0) return `${name} can ${orList(extras)}.`;
  const goes = `${name} can go to ${orList([...quiet])}.`;
  return extras.length > 0 ? `${goes} It can also ${orList(extras)}.` : goes;
}

export function kidWhereFacts(question: string, fen: string, kid: Color): string {
  const ref = resolvePieceRef(question, fen, kid);
  if (ref?.kind === 'empty') return `There is no piece on ${ref.square} right now.`;
  if (ref?.kind === 'missing') return missingLine(ref, kid);
  if (ref?.kind === 'squares') return `On this board: ${ref.squares.map((sq) => whereFactsForSquare(fen, sq, kid)).join(' ')}`;
  // No piece named — say which of their pieces can move at all.
  const chess = withTurn(fen, kid);
  if (!chess) return kidBoardLine(fen, kid);
  const movable = [...new Set(chess.moves({ verbose: true }).map((m) => m.from))];
  if (movable.length === 0) return 'None of your pieces can move right now.';
  return `The pieces you can move are ${andList(movable.map((sq) => nameAt(chess, sq, kid)))}.`;
}

// ─── HINT ────────────────────────────────────────────────────────────────────

/** Spell a move in kid words from chess.js's own move record. */
function spellMove(chess: Chess, san: string): { text: string; to: Square; type: PieceSymbol } | null {
  try {
    const m = chess.move(san);
    const piece = PIECE_WORD[m.piece];
    let text = m.isKingsideCastle()
      ? 'castle on the kingside'
      : m.isQueensideCastle()
        ? 'castle on the queenside'
        : `move your ${piece} from ${m.from} to ${m.to}`;
    if (m.captured) text += `, capturing their ${PIECE_WORD[m.captured]}`;
    if (m.promotion) text += ` and turn it into a ${PIECE_WORD[m.promotion]}`;
    return { text, to: m.to, type: m.piece };
  } catch {
    return null;
  }
}

export interface KidHintInput {
  fen: string;
  kid: Color;
  /** The scripted next move the child should play (kid #17 — the script is the
   *  source of truth). Absent when the game is over or the opponent moves next. */
  expectedNextSan?: string;
  /** The scripted teaching concept for that move ("center control"). */
  teachingConcept?: string;
}

/** The next scripted move, spelled out, and WHY — what it does on the board
 *  after it is played (check, mate, the enemy pieces it then attacks) and the
 *  idea the lesson attaches to it. All computed. */
export function kidHintFacts(input: KidHintInput): string {
  const chess = load(input.fen);
  if (!chess) return 'Let\'s look at the board together.';
  if (chess.turn() !== input.kid) {
    return `It is their turn right now — watch where they move. ${kidBoardLine(input.fen, input.kid, false)}`.trim();
  }
  if (!input.expectedNextSan) return kidBoardLine(input.fen, input.kid);
  const spelled = spellMove(chess, input.expectedNextSan);
  if (!spelled) return kidBoardLine(input.fen, input.kid);
  // `chess` now holds the position AFTER the move.
  const lines = [`Try this: ${spelled.text}.`];
  if (chess.isCheckmate()) lines.push('That is checkmate — the game is over!');
  else if (chess.isCheck()) lines.push('That puts their king in check.');
  const targets = allSquares(chess)
    .filter((p) => p.color !== input.kid && p.type !== 'k')
    .filter((p) => chess.attackers(p.sq, input.kid).includes(spelled.to))
    .map((p) => nameAt(chess, p.sq, input.kid));
  if (targets.length > 0 && !chess.isCheckmate()) {
    lines.push(`From ${spelled.to} your ${PIECE_WORD[spelled.type]} will attack ${andList(targets)}.`);
  }
  if (input.teachingConcept) lines.push(`This move is about ${input.teachingConcept}.`);
  return lines.join(' ');
}

// ─── THE BOARD LINE ──────────────────────────────────────────────────────────

/** "Let's look at the board" — the answer for a question no kid kind covers.
 *  It still names something TRUE: check, or every one of the child's pieces
 *  that is under attack, or that none is. */
export function kidBoardLine(fen: string, kid: Color, withOpener = true): string {
  const chess = load(fen);
  const opener = withOpener ? 'Let\'s look at the board together. ' : '';
  if (!chess) return opener.trim();
  if (chess.turn() === kid && chess.isCheck()) {
    const kingSq = allSquares(chess).find((p) => p.type === 'k' && p.color === kid)?.sq;
    if (kingSq) return `${opener}${safetyFactsForSquare(fen, kingSq, kid)}`;
  }
  const attacked = attackedPieceFacts(fen, kid, kid);
  return attacked.length > 0
    ? `${opener}${attacked.join(' ')}`
    : `${opener}None of your pieces is under attack right now.`;
}
