/**
 * calculationEvidence — the Calculation drill's half of the student model.
 *
 * The drill TAUGHT (it serves positions, refutes wrong tries, explains the
 * concept) and recorded nothing, so a student could solve fifty forced mates
 * and the heat map stayed grey. Capability parity with the puzzle board: the
 * same computer (`recordCapabilityEvidence` — what the board POSED, and whether
 * the first answer HELD) fed the same way PuzzleBoard feeds it.
 *
 * ONE row set per puzzle, on the student's FIRST answer, because that is the
 * answer to the question the board posed; later tries were coached. A Lichess
 * puzzle carries no cpLoss, so a wrong first answer is sized from its theme
 * tags (`cpFromThemes`), exactly as the puzzle board sizes it.
 */
import { Chess } from 'chess.js';
import { recordCapabilityEvidence } from './capabilityEvidence';
import { cpFromThemes } from './puzzleMethod';
import { MISTAKE_CP } from './engineConstants';

export interface CalculationAnswer {
  /** The drill's start position — the student to move. */
  fen: string;
  /** The answer, as squares (drag or tap). */
  from: string;
  to: string;
  /** Did the drill accept it as the solution move? */
  accepted: boolean;
  /** The served puzzle's theme tags — they size a wrong answer. */
  themes: readonly string[];
  /** A hint was revealed, or Skip/Reveal played the answer for them. */
  prompted: boolean;
}

/** Is from→to a legal move on this board? An illegal drop is not an answer. */
export function isLegalMove(fen: string, from: string, to: string): boolean {
  try {
    return new Chess(fen).moves({ verbose: true }).some((m) => m.from === from && m.to === to);
  } catch {
    return false;
  }
}

/**
 * Record the first answer. Returns the rows written (0 for an illegal or
 * unreadable answer — an illegal drop is not an answer to anything).
 */
export async function recordCalculationFirstAnswer(answer: CalculationAnswer): Promise<number> {
  let san: string;
  let moverColor: 'white' | 'black';
  try {
    const chess = new Chess(answer.fen);
    moverColor = chess.turn() === 'w' ? 'white' : 'black';
    const piece = chess.get(answer.from as Parameters<Chess['get']>[0]);
    const promotes = piece?.type === 'p' && (answer.to.endsWith('8') || answer.to.endsWith('1'));
    san = chess.move({ from: answer.from, to: answer.to, promotion: promotes ? 'q' : undefined }).san;
  } catch {
    return 0;
  }
  return recordCapabilityEvidence({
    fenBefore: answer.fen,
    playedSan: san,
    moverColor,
    cpLoss: answer.accepted ? 0 : (cpFromThemes(answer.themes) ?? MISTAKE_CP),
    origin: 'puzzle',
    prompted: answer.prompted,
  });
}
