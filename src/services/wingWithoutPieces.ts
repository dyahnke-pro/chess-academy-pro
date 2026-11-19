// wingWithoutPieces — "BRING A PIECE BEFORE YOU OPEN THE FILE" (Danya have-check, 2026-11-19).
//
// Danya, "Mysterious GM Moves": after …b5 is prevented, White plays on the
// queenside with a4-a5-a6, "but to open the b-file White must bring a piece to
// the queenside — so the queen must leave h5". A pawn break opens lines; a
// line with none of your pieces near it is opened for the opponent. No
// computer compared where a side's pawn play is with where its pieces are.
//
// The read, chess.js only, on the move the caller asks about (the engine's
// best or the student's move):
//   - the move is a pawn push (not a capture) on a wing — the a- to c-file or
//     the f- to h-file — that advances past the pusher's third rank and is a
//     LEVER: in contact with an enemy pawn now or after its next step (a clamp
//     that opens nothing is not this);
//   - the pusher has at least two officers (knight, bishop, rook, queen), and
//     NONE of them stands on that wing (the three files of it);
//   - the WHY names the officers and where they stand.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { andList } from '../utils/andList';

export interface WingWithoutPieces {
  wing: 'queenside' | 'kingside';
  push: { from: Square; to: Square };
  officers: { square: Square; piece: PieceSymbol }[];
  text: string;
  squares: Square[];
}

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const PLURAL: Record<PieceSymbol, string> = { p: 'pawns', n: 'knights', b: 'bishops', r: 'rooks', q: 'queens', k: 'kings' };
const QUEENSIDE = 'abc';
const KINGSIDE = 'fgh';

function relRank(sq: string, c: Color): number {
  return c === 'w' ? Number(sq[1]) : 9 - Number(sq[1]);
}

function officerPhrase(officers: WingWithoutPieces['officers']): string {
  const byType = new Map<PieceSymbol, Square[]>();
  for (const o of officers) byType.set(o.piece, [...(byType.get(o.piece) ?? []), o.square]);
  return andList([...byType].map(([t, sqs]) => (sqs.length === 1 ? `your ${NAME[t]} on ${sqs[0]}` : `your ${PLURAL[t]} on ${andList(sqs)}`)));
}

/** The pushed pawn is in contact with an enemy pawn now or after its next step — the push is a lever, not a clamp. */
function opensLines(c: Chess, at: Square, me: Color): boolean {
  const them: Color = me === 'w' ? 'b' : 'w';
  const pawnHits = (sq: Square, by: Color): boolean => c.attackers(sq, by).some((a) => c.get(a)?.type === 'p');
  const f = at.charCodeAt(0);
  const r = Number(at[1]) + (me === 'w' ? 1 : -1);
  for (const df of [-1, 1]) {
    const t = `${String.fromCharCode(f + df)}${r}`;
    if (f + df < 97 || f + df > 104 || r < 1 || r > 8) continue;
    const p = c.get(t as Square);
    if (p && p.type === 'p' && p.color === them) return true;
  }
  if (pawnHits(at, them)) return true;
  if (r < 1 || r > 8) return false;
  const next = `${at[0]}${r}` as Square;
  return !c.get(next) && pawnHits(next, them);
}

/** A wing pawn push made with every officer on the other side of the board, or null. Phrased for the mover. */
export function wingWithoutPieces(fen: string, san: string): WingWithoutPieces | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const me = c.turn();
  let m;
  try { m = c.move(san); } catch { return null; }
  if (m.piece !== 'p' || m.captured || m.promotion) return null;
  const file = m.from[0];
  const wing = QUEENSIDE.includes(file) ? 'queenside' : KINGSIDE.includes(file) ? 'kingside' : null;
  if (!wing || relRank(m.to, me) < 4) return null;
  if (!opensLines(c, m.to, me)) return null;
  const wingFiles = wing === 'queenside' ? QUEENSIDE : KINGSIDE;
  const officers: WingWithoutPieces['officers'] = [];
  let onWing = 0;
  for (const row of c.board()) {
    for (const p of row) {
      if (!p || p.color !== me || p.type === 'p' || p.type === 'k') continue;
      officers.push({ square: p.square, piece: p.type });
      if (wingFiles.includes(p.square[0])) onWing++;
    }
  }
  if (officers.length < 2 || onWing > 0) return null;
  const otherWing = officers.every((o) => (wing === 'queenside' ? KINGSIDE : QUEENSIDE).includes(o.square[0]));
  const where = otherWing ? `all on the ${wing === 'queenside' ? 'kingside' : 'queenside'}` : `all away from the ${wing}`;
  const text = `The ${file}-pawn push starts play on the ${wing}, but ${officerPhrase(officers)} are ${where}. A file opened there with none of your pieces near it is opened for them — bring a piece over before the lines open.`;
  return { wing, push: { from: m.from, to: m.to }, officers, text, squares: [m.from, m.to, ...officers.map((o) => o.square)] };
}
