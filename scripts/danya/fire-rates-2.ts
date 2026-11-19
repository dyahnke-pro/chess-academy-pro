// Fire rate of the Danya have-check computers, batch 2, over every board.
// Usage: npx tsx scripts/danya/fire-rates-2.ts [board-facts.jsonl]   (VERBOSE=1 prints every line)
import { readFileSync } from 'fs';
import { Chess } from 'chess.js';
import { urgentStrike } from '../../src/services/urgentStrike';
import { theirWorstPiece } from '../../src/services/theirWorstPiece';
import { kingInOpen } from '../../src/services/kingInOpen';
import { kingActivityGap } from '../../src/services/kingActivityGap';
import { zugzwangIfPassed } from '../../src/services/zugzwangIfPassed';
import { leverPasser } from '../../src/services/leverPasser';
import { coordinationGap } from '../../src/services/coordinationGap';
import { endgameVerdict } from '../../src/services/endgameVerdict';
import { defenderInTime } from '../../src/services/defenderInTime';
import { tactify } from '../../src/services/tactify';
import { misplacedQueen } from '../../src/services/misplacedQueen';

const SRC = process.argv[2] ?? 'audit-reports/danya-havecheck/board-facts-2026-11-19-unlocked.jsonl';
interface Board { id: string; fen: string; best: string; lines: { moves: string[]; cp: number | null; mate: number | null }[] }
const boards: Board[] = readFileSync(SRC, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Board);
const turn = (fen: string) => new Chess(fen).turn();
const bestUci = (b: Board) => b.lines[0]?.moves[0] ?? '';
const bestSan = (b: Board) => { try { const c = new Chess(b.fen); const u = bestUci(b); return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { return b.best; } };

// The boards whose Danya read needs each idea (havecheck rows, narration flags, no-computer tags).
export const NEED: Record<string, string[]> = {
  misplacedQueen: ['how-to-win-equal-positions#1', 'queen-the-supporting-actress#0', 'the-art-of-maneuvering#0', 'queen-the-supporting-actress#3'],
  theirWorstPiece: ['mastering-intuition-part-1#1', 'alekhines-gun2#2'],
  kingInOpen: ['the-discovered-check-reloaded#1', 'the-discovered-check-reloaded#2', 'the-tactical-detector#0', 'the-terrifying-grinder-of-chess#1'],
  kingActivityGap: ['beginner-chess-strategy#6', 'rooks-on-the-seventh-revisited#0'],
  zugzwangIfPassed: ['in-pursuit-of-zugzwang#0'],
  leverPasser: ['pawn-endgames-a-practical-guide#3', 'petrosians-exchange-sacrifices-explained#0', 'mastering-opposite-colored-bishops#3'],
  coordinationGap: ['mysterious-gm-moves#3', 'never-trust-your-opponent#1', 'modern-chess-technique#3', 'positional-combinations#0', 'the-art-of-maneuvering#0', 'mastering-the-queen-sacrifice#1', 'modern-chess-technique#1', 'mysterious-gm-moves#2', 'the-knockout-blow#3', 'how-to-survive-an-attack#0'],
  endgameVerdict: ['rooks-on-the-seventh-revisited#0', 'magnus-carlsens-best-endgame-wins#0', 'how-to-survive-an-attack#0', 'the-positional-rook-lift#1', 'the-tactical-detector#2'],
  defenderInTime: ['positional-combinations#4'],
  tactify: ['how-to-win-equal-positions#1', 'desperado-defense#2', 'how-to-win-equal-positions#2'],
  urgentStrike: ['queen-the-supporting-actress#5', 'queen-the-supporting-actress#2', 'the-greek-gift-sacrifice-lives-on#3', 'the-double-attack#1'],
};
const COMPUTERS: Record<string, (b: Board) => { text: string } | null> = {
  misplacedQueen: (b) => misplacedQueen(b.fen, b.lines, turn(b.fen)),
  theirWorstPiece: (b) => theirWorstPiece(b.fen, turn(b.fen), b.lines[0]?.moves ?? null),
  kingInOpen: (b) => kingInOpen(b.fen, b.lines, turn(b.fen)),
  kingActivityGap: (b) => kingActivityGap(b.fen, b.lines, turn(b.fen)),
  zugzwangIfPassed: (b) => zugzwangIfPassed(b.fen, turn(b.fen)),
  leverPasser: (b) => leverPasser(b.fen, b.lines, turn(b.fen)),
  coordinationGap: (b) => coordinationGap(b.fen, b.lines, turn(b.fen)),
  endgameVerdict: (b) => endgameVerdict(b.fen, b.lines, turn(b.fen)),
  defenderInTime: (b) => defenderInTime(b.fen, b.lines, turn(b.fen)),
  tactify: (b) => tactify(b.fen, b.lines, turn(b.fen)),
  urgentStrike: (b) => urgentStrike(b.fen, b.lines, turn(b.fen)),
};
const only = process.env.ONLY;
for (const [name, run] of Object.entries(COMPUTERS)) {
  if (only && only !== name) continue;
  const needed = new Set(NEED[name] ?? []);
  let hit = 0; let elsewhere = 0;
  const lines: string[] = [];
  for (const b of boards) {
    let r: { text: string } | null = null;
    try { r = run(b); } catch (e) { lines.push(`  ! ${b.id}: ${(e as Error).message}`); }
    if (!r) continue;
    if (needed.has(b.id)) hit++; else elsewhere++;
    lines.push(`  ${needed.has(b.id) ? '*' : ' '} ${b.id}: ${r.text}`);
  }
  console.log(`${name}: needing boards ${hit}/${needed.size}, elsewhere ${elsewhere}/${boards.length - needed.size}`);
  if (process.env.VERBOSE) console.log(lines.join('\n'));
}
void bestSan;
