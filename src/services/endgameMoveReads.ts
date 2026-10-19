// THE STUDENT'S MOVE, READ FOR WHAT A STRONG PLAYER NAMES IN THE LATER GAME
// (Alekhine walk 2026-10-19, against his narration of 1rcEbI44WqE): doubling
// the rooks on the seventh, walking the king to the centre once the queens are
// off, and leaving a pawn for development on purpose. Each is earned by the
// board and by the engine's cost of the move — a good move's reason, never a
// verdict on a mistake. Names squares, never the next move.
import { Chess, type Color, type Square } from 'chess.js';
import { play, piecesOf, type StructureRead } from './structureJudgementKit';
import { squaresProof } from './proof';
import { legalSeeGainFor } from './positionReadingService';
import { MATERIAL_VALUE, materialBalance } from './pieceValues';
import { andList } from '../utils/andList';

/** A move the engine counts as sound: anything costlier is a mistake to grade, not a plan to name. */
const SOUND_CP = 50;
/** Piece material (no pawns, no king) at or under a rook and two minors: an ending. */
const ENDING_PIECES = 11;

const rankOf = (sq: string): number => Number(sq[1]);
const relRank = (sq: string, side: Color): number => (side === 'w' ? rankOf(sq) : 9 - rankOf(sq));
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const boardOf = (fen: string): Chess | null => { try { return new Chess(fen); } catch { return null; } };

/** Both rooks on the seventh — said the move the second one arrives. */
export function rooksOnSeventh(fenBefore: string, san: string, student: Color, cpLoss: number): StructureRead | null {
  if (cpLoss >= SOUND_CP) return null;
  const r = play(fenBefore, san);
  if (!r || r.mv.piece !== 'r' || r.mv.color !== student || relRank(r.mv.to, student) !== 7) return null;
  const onSeventh = piecesOf(r.after, student, 'r').filter((s) => relRank(s, student) === 7);
  if (onSeventh.length < 2) return null;
  const them = other(student);
  const pawns = piecesOf(r.after, them, 'p').filter((s) => relRank(s, student) === 7).sort();
  const king = piecesOf(r.after, them, 'k').at(0);
  const boxed = !!king && relRank(king, student) === 8;
  if (pawns.length === 0 && !boxed) return null;
  const hits = pawns.length ? `they hit ${pawns.length === 1 ? `the pawn on ${pawns[0]}` : `the pawns on ${andList(pawns)}`} from the side` : '';
  const box = boxed ? `${hits ? ', and ' : ''}they box their king onto the back rank` : '';
  const text = `Both your rooks are on the seventh now: ${hits}${box}. Doubled there, each one guards the other while they eat along the rank.`;
  const squares = [...onSeventh, ...pawns, ...(king && boxed ? [king] : [])];
  const proof = squaresProof(text, squares);
  return proof ? { act: 'rooks-on-seventh', text, squares, proof, key: 'rooks-on-seventh' } : null;
}

const CENTRE = ['d4', 'd5', 'e4', 'e5'];
const toCentre = (sq: string): number => Math.min(...CENTRE.map((c) =>
  Math.max(Math.abs(c.charCodeAt(0) - sq.charCodeAt(0)), Math.abs(rankOf(c) - rankOf(sq)))));
const pieceMaterial = (c: Chess, side: Color): number => c.board().flat().reduce((n, p) =>
  n + (p && p.color === side && p.type !== 'p' && p.type !== 'k' ? MATERIAL_VALUE[p.type] ?? 0 : 0), 0);

/** The king walks toward the centre once the queens are off and the game is an ending. */
export function kingToCentre(fenBefore: string, san: string, student: Color, cpLoss: number): StructureRead | null {
  if (cpLoss >= SOUND_CP) return null;
  const before = boardOf(fenBefore);
  const r = play(fenBefore, san);
  if (!before || !r || r.mv.piece !== 'k' || r.mv.color !== student || r.mv.captured || r.mv.san.startsWith('O-')) return null;
  if (r.after.board().flat().some((p) => p?.type === 'q')) return null;
  if (pieceMaterial(r.after, 'w') > ENDING_PIECES || pieceMaterial(r.after, 'b') > ENDING_PIECES) return null;
  if (toCentre(r.mv.to) >= toCentre(r.mv.from)) return null;
  // Out of a check, stepping toward the middle is a plan only when the king
  // had another way out (Alekhine 53.Ke2: Ke1 also met …Rf6+).
  if (before.inCheck() && !before.moves({ verbose: true }).some((m) => m.piece === 'k' && m.to !== r.mv.to && toCentre(m.to) >= toCentre(m.from))) return null;
  const text = `Your king steps up to ${r.mv.to}: with the queens off it is no longer a target but a fighting piece, and from the middle it reaches either wing.`;
  const squares = [r.mv.to];
  const proof = squaresProof(text, squares);
  return proof ? { act: 'king-to-centre', text, squares, proof, key: 'king-to-centre' } : null;
}

/** Developing moves made: minors off their home squares, plus castling. */
function developed(c: Chess, side: Color): number {
  const home: Square[] = side === 'w' ? ['b1', 'c1', 'f1', 'g1'] : ['b8', 'c8', 'f8', 'g8'];
  const out = home.filter((sq) => { const p = c.get(sq); return !(p && p.color === side && (p.type === 'n' || p.type === 'b')); }).length;
  const king = piecesOf(c, side, 'k').at(0);
  return out + (king && ['g1', 'c1', 'g8', 'c8'].includes(king) ? 1 : 0);
}

/** Student pawns the opponent can win outright. */
const loosePawns = (c: Chess, fen: string, student: Color): Square[] =>
  piecesOf(c, student, 'p').filter((s) => legalSeeGainFor(fen, s, other(student)) > 0);

/** A pawn left to be taken on purpose, for a lead in development — said only
 *  when the engine agrees the move is sound. */
export function pawnForDevelopment(fenBefore: string, san: string, student: Color, cpLoss: number): StructureRead | null {
  if (cpLoss >= SOUND_CP) return null;
  // A pawn up already, giving one back is `givePawnBack`, not a sacrifice.
  if ((student === 'w' ? 1 : -1) * materialBalance(fenBefore) >= 1) return null;
  const before = boardOf(fenBefore);
  const r = play(fenBefore, san);
  if (!before || !r || r.mv.color !== student || r.mv.captured || r.after.inCheck()) return null;
  const was = new Set(loosePawns(before, fenBefore, student));
  const fresh = loosePawns(r.after, r.after.fen(), student).filter((s) => !was.has(s));
  if (fresh.length === 0) return null;
  const lead = developed(r.after, student) - developed(r.after, other(student));
  if (lead < 2) return null;
  const sq = fresh[0];
  const text = `You leave the pawn on ${sq} to them on purpose: you are ${lead} developing moves ahead, and every move they spend taking it is another move your pieces get into the fight first.`;
  const proof = squaresProof(text, [sq]);
  return proof ? { act: 'pawn-for-development', text, squares: [sq], proof, key: `pawn-for-development:${sq}` } : null;
}
