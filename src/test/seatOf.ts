/** The seat a test board's move is played from — the side to move. A test
 *  hands the record writers the student's own move, so its seat is the
 *  board's mover (`recordSeat`). Throws on an unreadable board. */
export function seatOf(fen: string): 'white' | 'black' {
  const side = fen.trim().split(/\s+/)[1];
  if (side === 'w') return 'white';
  if (side === 'b') return 'black';
  throw new Error(`seatOf: unreadable board ${fen}`);
}
