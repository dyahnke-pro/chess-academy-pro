// secondAttacker — A SECOND ATTACKER MAKES THE COUNT (Danya speedruns
// S-ZY3NtFO20, 13.Qf3: "Qf3 adds a second attacker to f6, so taking twice on f6
// becomes the threat"; 1Rejj6niwvo, 5.Bc4: "queen on h5 plus bishop on c4 both
// aimed at f7 is a mate-in-one pattern"; NnQmNvrOmCI, 6.Ng5: "then Bc4 adds a
// second attacker on f7").
//
// The board fact: the move puts a piece on a target that one piece of the
// mover's already hits, and the count now wins it. Before the move the
// exchange on the target won nothing (`legalSeeGainFor` ≤ 0); after it the
// same exchange wins material, or taking there is mate. A newcomer smaller
// than the target is a plain attack, not a count, and is left to the threat
// readers. Both seats. PURE: chess.js and the legal exchange.
import { openSentence } from '../utils/openSentence';
import { unmarked } from '../utils/sanMark';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor, asIfToMove } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import { PIECE_NAMES } from '../types/tacticTypes';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { andList, withArticle } from '../utils/andList';

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;
const worth = (t: PieceSymbol): number => (t === 'k' ? 100 : MATERIAL_VALUE[t] ?? 0);

export interface SecondAttacker {
  /** The target, an enemy piece or pawn. */
  target: Square;
  targetPiece: PieceSymbol;
  /** The piece that joined, on its new square. */
  newcomer: { square: Square; piece: PieceSymbol };
  /** The attacker that was already there. */
  partner: { square: Square; piece: PieceSymbol };
  /** The mover's attackers and the target's guards, after the move. */
  attackers: number;
  guards: { square: Square; piece: PieceSymbol }[];
  /** What the exchange on the target now wins (pawns), 0 when it mates. */
  gain: number;
  /** The capture on the target that mates, or null. */
  mate: string | null;
}

/** The count made by the move `san` from `fenBefore`, or null. */
export function secondAttacker(fenBefore: string, san: string): SecondAttacker | null {
  let before: Chess;
  let after: Chess;
  let mv;
  try {
    before = new Chess(fenBefore);
    after = new Chess(fenBefore);
    mv = after.move(san);
  } catch { return null; }
  if (mv.captured || mv.promotion || mv.piece === 'p' || mv.piece === 'k' || after.inCheck() || after.isGameOver()) return null;
  const me = mv.color;
  const them: Color = me === 'w' ? 'b' : 'w';
  const fenAfter = after.fen();
  const asMe = asIfToMove(fenAfter, me);
  if (!asMe) return null;
  let best: SecondAttacker | null = null;
  for (const row of after.board()) for (const cell of row) {
    if (!cell || cell.color !== them || cell.type === 'k') continue;
    const sq = cell.square;
    const atk = after.attackers(sq, me);
    if (atk.length < 2 || !atk.includes(mv.to)) continue;
    // The newcomer joins: it did not hit the target from where it stood, and
    // another attacker already did and still does.
    if (before.attackers(sq, me).includes(mv.from)) continue;
    const partnerSq = before.attackers(sq, me).find((s) => s !== mv.from && atk.includes(s));
    if (!partnerSq) continue;
    // The count, not a smaller piece hitting a bigger one.
    if (worth(mv.piece) < worth(cell.type)) continue;
    const gainBefore = legalSeeGainFor(fenBefore, sq, me);
    if (gainBefore > 0) continue;
    const gain = legalSeeGainFor(fenAfter, sq, me);
    const mate = mateByCapture(asMe, sq);
    if (gain < 1 && !mate) continue;
    const read: SecondAttacker = {
      target: sq, targetPiece: cell.type,
      newcomer: { square: mv.to, piece: mv.piece },
      partner: { square: partnerSq, piece: after.get(partnerSq)?.type ?? 'p' },
      attackers: atk.length,
      guards: after.attackers(sq, them).map((g) => ({ square: g, piece: after.get(g)?.type ?? 'p' })),
      gain: mate ? 0 : gain, mate,
    };
    // The mate first, then the biggest win.
    if (!best || (read.mate && !best.mate) || (!best.mate && !read.mate && read.gain > best.gain)) best = read;
  }
  return best;
}

/** A capture on `sq` for the side to move on `fen` that mates, or null. */
function mateByCapture(fen: string, sq: Square): string | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  for (const m of c.moves({ verbose: true })) {
    if (m.to !== sq || !m.captured) continue;
    c.move(m);
    const mate = c.isCheckmate();
    c.undo();
    if (mate) return m.san;
  }
  return null;
}

const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five'];
const count = (n: number): string => NUMBER[n] ?? String(n);
const ORDINAL: Record<number, string> = { 3: 'third', 4: 'fourth', 5: 'fifth' };

function wins(gain: number): string {
  if (gain >= 5) return 'a rook';
  if (gain >= 3) return 'a piece';
  if (gain === 2) return 'two pawns';
  return 'a pawn';
}

/** Said from the mover's seat (`own`: your / their), one idea a sentence,
 *  phrasings rotated on the board. */
export function secondAttackerLine(s: SecondAttacker, own: 'your' | 'their', fen: string): string {
  const other = own === 'your' ? 'their' : 'your';
  const nc = NAME[s.newcomer.piece];
  const partner = `the ${NAME[s.partner.piece]} on ${s.partner.square}`;
  const target = `${other} ${NAME[s.targetPiece]} on ${s.target}`;
  const guardName = (g: { square: Square; piece: PieceSymbol }): string => (g.piece === 'k' ? 'the king' : `the ${NAME[g.piece]} on ${g.square}`);
  const guarded = s.guards.length === 0 ? 'nothing guards it'
    : s.guards.length === 1 && s.guards[0].piece === 'k' ? 'only the king guards it'
      : s.guards.length <= 2 ? `${andList(s.guards.map(guardName))} ${s.guards.length === 1 ? 'guards' : 'guard'} it`
        : `${count(s.guards.length)} pieces guard it`;
  const key = stemKeyOf(`${fen}|secondAttacker|${s.target}`);
  // "Both" only when there are two: a third attacker is said as the third
  // (the speedrun replay 2026-11-17: "your knight and the queen on f6 both hit
  // their knight on d4. That's three attackers").
  const join = s.attackers > 2
    ? `${cap(own)} ${nc} adds ${withArticle(`${ORDINAL[s.attackers] ?? 'new'} attacker`)} on ${target}.`
    : rotateStem([
      `${cap(own)} ${nc} joins ${partner} against ${target}.`,
      `Now ${own} ${nc} and ${partner} both hit ${target}.`,
      `${cap(own)} ${nc} adds a second attacker on ${target}, beside ${partner}.`,
    ], key);
  const tally = `That's ${count(s.attackers)} attackers, and ${guarded}.`;
  // Their capture is THEIR threat, said as one ("Taking on c3 now wins a
  // piece" about their bishop read as advice to the student).
  const point = s.mate
    ? `${unmarked(s.mate)} would be mate.`
    : own === 'your' ? `Taking on ${s.target} now wins ${wins(s.gain)}.` : `They threaten to take on ${s.target} and win ${wins(s.gain)}.`;
  return `${join} ${tally} ${point}`;
}

function cap(s: string): string {
  return openSentence(s);
}
