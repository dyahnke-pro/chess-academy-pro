// THE PATTERN THAT FAILS HERE (batch 1; F04's when-it-fails half) — his "the
// queen check and grab on g6 lose a piece here to a counter-check". A stock
// shot — a check that also hits a loose piece, or a capture of a piece that
// looks free — is the move a student reaches for on sight. The teaching is the
// exception: played out on THIS board it loses, and the line says to what.
//
// Pure: chess.js reads the pattern off the move; the refutation is the
// engine's own line for that move, handed in (a multi-PV line), never
// invented. An engine line is said short (proof.ts) and drawn in full.
import { Chess, type Square } from 'chess.js';
import { lineProofFromUci, type Proof } from './proof';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

type Line = { moves: readonly string[]; evaluation: number; mate: number | null };

export interface PatternFail {
  text: string;
  /** The tempting move, SAN. */
  tempting: string;
  pattern: 'forking-check' | 'free-grab';
  /** The piece the pattern aims to win (its square). */
  target: string;
  /** Their counter-check in the line, SAN, when there is one. */
  counter: string | null;
  /** What the student ends up losing within the line's first plies. */
  loses: string;
  proof: Proof;
  squares: string[];
}

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
/** The tempting line must cost at least this much against the best line. */
export const PATTERN_FAIL_GAP_CP = 150;

function seatCp(fen: string, l: Line): number {
  const white = l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation;
  return fen.split(' ')[1] === 'w' ? white : -white;
}

function material(c: Chess, side: 'w' | 'b'): number {
  return c.board().flat().reduce((s, x) => s + (x && x.color === side ? VAL[x.type] : 0), 0);
}

/** The stock pattern a move looks like, read off the board. */
function patternOf(fen: string, san: string): { pattern: PatternFail['pattern']; target: string } | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const me = board.turn();
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  let m;
  try { m = board.move(san); } catch { return null; }
  if (m.san.includes('+')) {
    // A CHECK THAT ALSO HITS a loose or bigger piece: the "check and grab".
    for (const cell of board.board().flat()) {
      if (!cell || cell.color !== them || cell.type === 'k' || cell.type === 'p') continue;
      const hits = board.attackers(cell.square, me).includes(m.to);
      if (!hits) continue;
      const loose = board.attackers(cell.square, them).length === 0;
      if (loose || VAL[cell.type] > VAL[m.piece]) return { pattern: 'forking-check', target: cell.square };
    }
    return null;
  }
  if (m.captured && m.captured !== 'p') {
    // A GRAB OF A PIECE THAT LOOKS FREE: nothing of theirs guarded it.
    const before = new Chess(fen);
    if (before.attackers(m.to, them).length === 0) return { pattern: 'free-grab', target: m.to };
  }
  return null;
}

/**
 * `fen` with the student to move; `lines` the engine's multi-PV lines there
 * (best first). For a line other than the best whose first move is a stock
 * pattern, that costs ≥ `PATTERN_FAIL_GAP_CP` against the best and leaves the
 * student no better than level, the line is played out: the counter-check it
 * meets, and the material it loses within six plies. Silent when the line
 * shows no material loss — then the board has no short reason to say.
 */
export function patternFails(fen: string, lines: readonly Line[], playedSan: string | null = null): PatternFail | null {
  if (lines.length < 2) return null;
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const me = board.turn();
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const bestCp = seatCp(fen, lines[0]);
  const strip = (x: string): string => x.replace(/[+#]$/, '');
  for (const l of lines.slice(1)) {
    const uci = l.moves[0];
    if (!uci) continue;
    let san: string;
    try { san = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { continue; }
    if (playedSan && strip(playedSan) === strip(san)) continue;
    const cp = seatCp(fen, l);
    if (bestCp - cp < PATTERN_FAIL_GAP_CP || cp > 50) continue;
    const pat = patternOf(fen, san);
    if (!pat) continue;
    // Play the line out: the counter-check, and what it costs within six plies.
    const c = new Chess(fen);
    const startDiff = material(c, me) - material(c, them);
    let counter: string | null = null;
    let worst = 0;
    const plies = l.moves.slice(0, 6);
    let played = 0;
    for (let i = 0; i < plies.length; i += 1) {
      let mv;
      try { mv = c.move({ from: plies[i].slice(0, 2), to: plies[i].slice(2, 4), promotion: plies[i][4] }); } catch { break; }
      played += 1;
      if (i % 2 === 1 && !counter && mv.san.includes('+')) counter = mv.san;
      // Judge material after each of the student's moves AND theirs, keeping
      // the worst point reached after their move (their capture landed).
      if (i % 2 === 1) worst = Math.min(worst, (material(c, me) - material(c, them)) - startDiff);
    }
    // MATE outranks every count: the line ends with the student mated, or the
    // engine scores it as a mate against them.
    const mated = (c.isCheckmate() && c.turn() === me) || (l.mate != null && (me === 'w' ? l.mate < 0 : l.mate > 0));
    // The line must end where it is still a loss, not mid-recapture.
    const end = (material(c, me) - material(c, them)) - startDiff;
    const lost = Math.max(-worst, -end) > 0 ? Math.min(-worst, -end) : 0;
    if ((!mated && lost < 1) || played < 2) continue;
    const loses = mated ? 'the game to mate' : lost >= 9 ? 'the queen' : lost >= 5 ? 'a rook' : lost >= 3 ? 'a piece' : lost >= 2 ? 'two pawns' : 'a pawn';
    const proof = lineProofFromUci(fen, plies.slice(0, played));
    if (!proof) continue;
    const tgt = new Chess(fen).get(pat.target as Square);
    const tName = NAME[tgt?.type ?? 'p'];
    const cc = counter ? (them === 'b' ? `…${counter}` : counter) : null;
    san = me === 'b' ? `…${san}` : san;
    const cost = mated
      ? `but here it runs into mate${cc ? `, and the counter-check ${cc} starts it` : ''}`
      : `but here it loses ${loses}${cc ? ` to the counter-check ${cc}` : ''}`;
    const text = pat.pattern === 'forking-check'
      ? rotateStem([
        `The check ${san} hitting the ${tName} on ${pat.target} looks like a fork, ${cost}.`,
        `${san} with check and the grab on ${pat.target} is the pattern your eye goes to, ${cost}.`,
      ], stemKeyOf(fen))
      : rotateStem([
        `Grabbing the ${tName} on ${pat.target} with ${san} looks free, ${cost}.`,
        `The ${tName} on ${pat.target} only looks loose: ${san} takes it, ${cost}.`,
      ], stemKeyOf(fen));
    let from = '';
    try { from = new Chess(fen).move(san.replace(/^…/, '')).from; } catch { /* checked above */ }
    return { text, tempting: san.replace(/^…/, ''), pattern: pat.pattern, target: pat.target, counter, loses, proof, squares: [from, pat.target].filter(Boolean) };
  }
  return null;
}
