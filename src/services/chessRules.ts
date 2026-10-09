/**
 * THE RULES OF CHESS, READ OFF THE BOARD (live replay 2026-10-09: "What is en
 * passant?" got "I don't have a specific lesson on that idea yet").
 *
 * A rule is not opinion and not book prose — it is what chess.js enforces. So
 * each answer is the rule in plain words, followed by what the rule means on
 * THIS board right now when there is one: whether an en passant capture is
 * available, whether each side may castle and exactly why not, how close the
 * fifty-move count is. Everything after the definition is computed (G0).
 */
import { andList } from '../utils/andList';
import { Chess, type Square } from 'chess.js';

export type ChessRule =
  | 'en-passant' | 'castling' | 'stalemate' | 'promotion' | 'repetition'
  | 'fifty-move' | 'insufficient-material' | 'checkmate' | 'check';

/** Which rule a question asks about, or null. Order matters: "checkmate" before "check". */
const RULE_RE: ReadonlyArray<[ChessRule, RegExp]> = [
  ['en-passant', /\ben\s*pass?ant\b|\bin\s+passing\b/i],
  ['castling', /\bcastl(?:e|es|ed|ing)\b/i],
  ['stalemate', /\bstale\s*mate\b/i],
  ['promotion', /\bpromot(?:e|es|ed|ion|ing)\b|\bqueening\b|\bunderpromot/i],
  ['repetition', /\b(?:three\s*fold|3\s*fold|threefold)\b|\brepetition\b|\brepeat(?:ing)?\s+(?:the\s+)?(?:position|moves?)\b/i],
  ['fifty-move', /\b(?:fifty|50)[\s-]*moves?\b/i],
  ['insufficient-material', /\binsufficient\s+material\b|\bnot\s+enough\s+(?:material|pieces)\s+to\s+(?:mate|checkmate|win)\b/i],
  ['checkmate', /\bcheck\s*mate\b/i],
  ['check', /\bcheck\b/i],
];

/** Rules whose NAME is only ever a rule — said anywhere, in any wording, the
 *  student is asking about the rule ("en passant?", "en passant confuses me",
 *  "how does it work, en passant"). */
const NAME_ONLY: ReadonlySet<ChessRule> = new Set<ChessRule>(['en-passant', 'stalemate', 'promotion', 'repetition', 'fifty-move', 'insufficient-material']);

/** "Castle", "check" and "mate" are also everyday move words ("castle here?",
 *  "is that check?"), so for them only a request for the RULE itself counts:
 *  what it is, how it works, what it means, the rules of it. */
const DEFINITION_ASK_RE = /\b(?:what(?:'s|\s+is|\s+are|\s+does)|how\s+(?:does|do)\b[^?]*\bwork|explain|define|definition|meaning|mean|rules?\b)/i;

export function ruleAsked(ask: string): ChessRule | null {
  const t = ask.replace(/[\u2018\u2019]/g, "'");
  for (const [rule, re] of RULE_RE) {
    if (!re.test(t)) continue;
    if (NAME_ONLY.has(rule)) {
      // "I promoted earlier — was that right?" is about a move, not the rule.
      if (/\b(?:was|did|were)\b/i.test(t) && /\b[a-h][1-8]\b|=[QRBN]/i.test(t)) return null;
      return rule;
    }
    return DEFINITION_ASK_RE.test(t) && !/\b[KQRBN]?x?[a-h][1-8]\b/.test(t) ? rule : null;
  }
  return null;
}

const DEFINITION: Record<ChessRule, string> = {
  'en-passant': 'En passant is a pawn capture. When a pawn moves two squares from its starting square and lands right beside an enemy pawn, that enemy pawn may capture it as if it had moved only one square — moving diagonally onto the square it skipped. The capture must be made on the very next move, or the chance is gone.',
  castling: 'Castling moves the king two squares toward a rook, and that rook jumps to the square the king crossed — all in one move. You may castle only if neither the king nor that rook has moved yet, every square between them is empty, your king is not in check, and the king does not pass through or land on a square the enemy attacks.',
  stalemate: 'Stalemate is when the side to move has no legal move and its king is NOT in check. The game ends at once as a draw — so when you are winning, make sure your opponent always has a move.',
  promotion: 'A pawn that reaches the last rank must be promoted, on the same move, to a queen, rook, bishop or knight of its own colour — almost always a queen. It does not matter how many queens are already on the board.',
  repetition: 'If the same position occurs three times with the same player to move and the same castling and en passant rights, either player may claim a draw (threefold repetition). The moves need not be consecutive.',
  'fifty-move': 'If fifty moves by each side pass with no capture and no pawn move, either player may claim a draw (the fifty-move rule). Any capture or pawn move resets the count to zero.',
  'insufficient-material': 'If neither side has enough pieces left to checkmate — king against king, king and bishop or king and knight against a bare king, or bishops all on one colour — the game is a draw at once.',
  checkmate: 'Checkmate is when the king is attacked and there is no legal move that gets it out of check — it cannot move to a safe square, the attacker cannot be captured, and nothing can be put in the way. Checkmate ends the game.',
  check: 'Check means the king is attacked. The side in check must get out of it on the very next move in one of three ways: move the king to a safe square, capture the attacking piece, or block the line of attack.',
};

function enPassantNow(chess: Chess): string | null {
  const caps = chess.moves({ verbose: true }).filter((m) => m.isEnPassant());
  const side = chess.turn() === 'w' ? 'White' : 'Black';
  if (caps.length === 0) return 'There is no en passant capture available on this board right now.';
  const list = caps.map((m) => `the pawn on ${m.from} can take on ${m.to}`).join(', or ');
  return `On this board it is available right now: ${side}'s ${list} (${caps.map((m) => m.san).join(' / ')}).`;
}

/** Why the student may or may not castle on each wing, from the board —
 *  said to them ("you"), never by colour (one perspective, 2026-08-28). */
export function castlingNow(chess: Chess, side: 'w' | 'b'): string {
  const fen = chess.fen();
  const rights = fen.split(' ')[2] ?? '-';
  const rank = side === 'w' ? '1' : '8';
  const enemy = side === 'w' ? 'b' : 'w';
  const who = 'You';
  const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const wings: Array<{ name: string; flag: string; right: string; between: string[]; path: string[]; rook: string }> = [
    { name: 'kingside', flag: 'k', right: side === 'w' ? 'K' : 'k', between: ['f', 'g'], path: ['e', 'f', 'g'], rook: 'h' },
    { name: 'queenside', flag: 'q', right: side === 'w' ? 'Q' : 'q', between: ['b', 'c', 'd'], path: ['e', 'd', 'c'], rook: 'a' },
  ];
  const parts: string[] = [];
  for (const w of wings) {
    if (!rights.includes(w.right)) { parts.push(`${who} can no longer castle ${w.name} — your king or your ${w.rook}-rook has already moved`); continue; }
    const blocked = w.between.map((f) => `${f}${rank}`).filter((s) => chess.get(s as Square));
    if (blocked.length) {
      // "your knight on b1, bishop on c1 and queen on d1" — the owner once
      // per run of the same side.
      let last: string | null = null;
      const named = blocked.map((sq) => {
        const p = chess.get(sq as Square);
        if (!p) return sq;
        const owner = p.color === side ? 'your' : 'their';
        const lead = owner === last ? '' : `${owner} `;
        last = owner;
        return `${lead}${PIECE[p.type]} on ${sq}`;
      });
      parts.push(`${who} cannot castle ${w.name} yet — ${andList(named)} ${blocked.length > 1 ? 'are' : 'is'} still in the way`);
      continue;
    }
    const attacked = w.path.map((f) => `${f}${rank}`).filter((s) => chess.isAttacked(s as Square, enemy));
    if (attacked.length) {
      parts.push(attacked[0] === `e${rank}`
        ? `${who} cannot castle ${w.name} now — your king is in check`
        : `${who} cannot castle ${w.name} now — your king would cross or land on ${attacked.join(' and ')}, which they attack`);
      continue;
    }
    parts.push(`${who} can castle ${w.name}`);
  }
  return `${parts.join('; ').replace(/; You /g, '; you ')}.`;
}

function promotionNow(chess: Chess): string | null {
  const promos = chess.moves({ verbose: true }).filter((m) => m.isPromotion() && m.promotion === 'q');
  return promos.length ? `On this board the pawn on ${promos[0].from} can promote right now (${promos[0].san}).` : null;
}

function fiftyNow(fen: string): string | null {
  const half = Number.parseInt(fen.split(' ')[4] ?? '0', 10) || 0;
  if (half < 20) return null;
  return `On this board ${Math.floor(half / 2)} moves each have passed without a capture or pawn move.`;
}

export interface RuleAnswer { rule: ChessRule; facts: string }

/** The rule in plain words, then what it means on this board. */
export function answerRuleQuestion(ask: string, fen: string | null, student: 'w' | 'b'): RuleAnswer | null {
  const rule = ruleAsked(ask);
  if (!rule) return null;
  const lines = [DEFINITION[rule]];
  let chess: Chess | null = null;
  try { chess = fen ? new Chess(fen) : null; } catch { chess = null; }
  if (chess) {
    if (rule === 'en-passant') { const n = enPassantNow(chess); if (n) lines.push(n); }
    if (rule === 'castling') lines.push(`On this board, ${castlingNow(chess, student).replace(/^You /, 'you ')}`);
    if (rule === 'promotion') { const n = promotionNow(chess); if (n) lines.push(n); }
    if (rule === 'fifty-move') { const n = fiftyNow(chess.fen()); if (n) lines.push(n); }
    if (rule === 'stalemate' && chess.isStalemate()) lines.push('This position IS stalemate — the game is drawn.');
    if (rule === 'checkmate' && chess.isCheckmate()) lines.push('This position IS checkmate.');
    if (rule === 'check' && chess.inCheck()) lines.push(`Right now ${chess.turn() === 'w' ? 'White' : 'Black'} is in check.`);
    if (rule === 'insufficient-material' && chess.isInsufficientMaterial()) lines.push('This position is already a draw by insufficient material.');
  }
  return { rule, facts: lines.join(' ') };
}
