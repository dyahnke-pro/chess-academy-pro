// THE MOVES MASTERS REALLY PLAY HERE — a BAR, never a count (G4.5): every move
// played in at least 2% of the master games at the position, and the leader
// always (so a position with one dominant move still speaks). One rule for every
// surface that names the master moves — the chat's answer, the Review theory
// lecture's sidelines and the alternatives it marches out. `.slice(0, 3)` used to
// delete the fourth-most-played move in the Ruy no matter how many games it had.
import type { MasterPlayMove } from './masterPlayTypes';

const REAL_SHARE = 0.02;

export function realMasterMoves<T extends Pick<MasterPlayMove, 'games'>>(moves: readonly T[], totalGames: number): T[] {
  const total = totalGames > 0 ? totalGames : moves.reduce((n, m) => n + m.games, 0);
  return moves.filter((m, i) => i === 0 || total <= 0 || m.games / total >= REAL_SHARE);
}
