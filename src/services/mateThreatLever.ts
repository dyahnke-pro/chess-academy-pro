// mateThreatLever — THE MATE THREAT THAT WINS SOMETHING ELSE (Danya have-check, 2026-11-19).
//
// Danya (rooks-on-the-seventh-revisited#3): "notice that White did not advance
// his h-pawn with the express intention of giving checkmate; he was merely
// aiming to win the g6 pawn … the threat of mate should often be used as a way
// of transforming the advantage." The mate reads find a forced mate; the
// threat reads say what is threatened. Nothing read the threat of mate that is
// never carried out — the defender parries it and pays for the parry.
//
// The read, chess.js and the engine's best line only (G0): one of the side to
// move's first three moves in the best line, a quiet one (no capture, check
// or promotion), threatens mate in one (handed the
// move again, a move mates — the null-move probe), the line itself never
// mates, and by the line's end (ten moves or fewer) that side is a pawn or
// more up on material against the board now. The side stands a pawn better
// by the line where it is scored. Both seats.
import { Chess, type Color, type Square } from 'chess.js';
import { type EngineLine, lineScore, playLine, sortedLines } from './engineLineRead';
import { sideToMoveAs } from './threatOut';
import { materialBalance } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { countWords } from '../utils/countWords';
import { renderMateLever } from './teachingSentence';

export interface MateThreatLever { side: Color; move: string; mate: string; gain: number; text: string; squares: Square[] }

export function mateThreatLever(fen: string, lines: readonly EngineLine[], student: Color): MateThreatLever | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const side = c.turn();
  const ls = sortedLines(lines, side);
  if (!ls.length || ls[0].mate != null) return null;
  // Unscored (the record's one line): the line's own material proves the gain.
  if (ls[0].cp != null && lineScore(ls[0], side) < 100) return null;
  const { moves, boards } = playLine(fen, ls[0].moves, 10);
  if (moves.some((m) => m.san.endsWith('#'))) return null;
  const sign = side === 'w' ? 1 : -1;
  const gain = Math.round((materialBalance(boards[boards.length - 1]) - materialBalance(fen)) * sign);
  if (gain < 1) return null;
  for (let i = 0; i < Math.min(moves.length, 6); i += 2) {
    const m = moves[i];
    // A quiet threat: a capture or a promotion wins its material by itself.
    if (m.san.includes('+') || m.captured || m.promotion) continue;
    const probe = sideToMoveAs(boards[i + 1], side);
    if (!probe) continue;
    const mate = new Chess(probe).moves({ verbose: true }).find((r) => r.san.endsWith('#'));
    if (!mate) continue;
    const you = side === student;
    const key = stemKeyOf(`${fen}|mate-lever`);
    const won = countWords(gain, { unit: true });
    const mateSan = mate.san.replace('#', '');
    const text = renderMateLever({ you, first: i === 0, move: m.san, mate: mateSan, won, stem: key });
    return { side, move: m.san, mate: mate.san, gain, text, squares: [m.from, m.to, mate.to] };
  }
  return null;
}
