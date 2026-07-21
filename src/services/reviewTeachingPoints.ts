/**
 * reviewTeachingPoints — the missing Naroditsky TEACHING MESSAGES (David 2026-07-20,
 * "add the missing teaching points"). Each is a reusable chess LESSON he leans on,
 * computed from the board (G0 — chess.js only; the LLM voices, never decides):
 *
 *   M2  attacker/defender COUNT on a contested piece ("more attackers than
 *       defenders — it falls").
 *   M6  the King & Queen are the WORST defenders (a piece leaning only on the
 *       enemy K/Q — hit the guard, the piece drops).
 *   M20 a rook on the SEVENTH ("pigs on the seventh").
 *   M8/M32 a BAD enemy bishop hemmed in by its own pawns.
 *   M12 the WORST-PLACED friendly piece — improve it.
 *   M14/M23 push the passed pawn; knights are poor blockers.
 *
 * Every clause is emitted ONLY when the board actually shows it (empty > generic >
 * invented). Squares/pieces are always real, so the narration-accuracy gate holds.
 */
import { Chess, type Color, type Square } from 'chess.js';

const PIECE_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

interface Cell { type: string; color: Color; square: string; }
function cells(chess: Chess): Cell[] {
  const out: Cell[] = [];
  for (const row of chess.board()) for (const c of row) if (c) out.push({ type: c.type, color: c.color, square: c.square });
  return out;
}
function isLight(sq: string): boolean { return ((sq.charCodeAt(0) - 97) + (Number(sq[1]) - 1)) % 2 === 1; }

/**
 * M2 — COUNT the attackers and defenders on the most contested piece. Reports the
 * single most valuable target where one side has MORE attackers than defenders:
 * an enemy piece the student can win, or a student piece under threat to shore up.
 */
export function attackerDefenderCount(fen: string, studentColorWB: Color): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  let best: { text: string; value: number } | null = null;
  // OFFENSIVE only — the M2 lesson is "more attackers than defenders → it falls".
  // We deliberately do NOT flag the student's own overloaded piece: it collides
  // with an intentional sacrifice (the sacked rook/queen is MEANT to be loose).
  for (const c of cells(chess)) {
    if (c.color !== enemy || c.type === 'k' || c.type === 'p') continue;
    const sq = c.square as Square;
    const atk = chess.attackers(sq, studentColorWB).length;
    const def = chess.attackers(sq, enemy).length;
    if (atk === 0 || atk <= def) continue; // need a genuine numerical overload
    const cand = { value: PIECE_VAL[c.type] ?? 0,
      text: `count the attackers and defenders on their ${PIECE_NOUN[c.type]} on ${sq}: ${plural(atk, 'attacker')} to ${plural(def, 'defender')} — more attackers than defenders, so it falls` };
    if (!best || cand.value > best.value) best = cand;
  }
  return best ? best.text : null;
}

function plural(n: number, noun: string): string { return `${n} ${noun}${n === 1 ? '' : 's'}`; }

/**
 * M6 — the King and Queen are the WORST defenders: a piece leaning ONLY on the
 * enemy king or queen to hold it is loose, because the moment the royal defender is
 * hit it must abandon the piece. Reports an enemy piece the student attacks whose
 * only defender is the enemy K or Q.
 */
export function royalDefenderTarget(fen: string, studentColorWB: Color): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  for (const c of cells(chess)) {
    if (c.color !== enemy || c.type === 'k' || c.type === 'p') continue;
    const sq = c.square as Square;
    if (chess.attackers(sq, studentColorWB).length === 0) continue; // must be under attack
    const defenders = chess.attackers(sq, enemy);
    if (defenders.length === 0) continue; // that's just hanging — a different lesson
    const allRoyal = defenders.every((d) => { const t = chess.get(d)?.type; return t === 'k' || t === 'q'; });
    if (allRoyal) {
      const guard = chess.get(defenders[0])?.type === 'q' ? 'queen' : 'king';
      return `their ${PIECE_NOUN[c.type]} on ${sq} is guarded only by the ${guard} — and the king and queen are the worst defenders, because the moment you hit the guard the piece drops`;
    }
  }
  return null;
}

/** M20 — a student rook that has reached the SEVENTH rank ("pigs on the seventh"). */
export function rookOnSeventh(fen: string, studentColorWB: Color): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const rank = studentColorWB === 'w' ? '7' : '2';
  const rook = cells(chess).find((c) => c.type === 'r' && c.color === studentColorWB && c.square[1] === rank);
  return rook ? `your rook has reached the seventh on ${rook.square} — a rook on the seventh is a pig, chewing through the pawns and pinning the king back` : null;
}

/**
 * M8/M32 — a BAD enemy bishop: hemmed in by its OWN pawns fixed on its colour, so
 * it has little scope. Requires ≥4 enemy pawns on the bishop's colour AND the
 * bishop itself has ≤2 squares (genuinely bad, not just theoretically).
 */
export function badEnemyBishop(fen: string, studentColorWB: Color): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  // Past the opening only — an UNDEVELOPED starting bishop has 0 squares and 4
  // same-colour pawns too, but it isn't "bad", just not out yet (the false
  // positive the diagnostic caught at moves 2-9).
  const fullmove = Number(fen.split(' ')[5] ?? '0');
  if (fullmove < 12) return null;
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  for (const c of cells(chess)) {
    if (c.type !== 'b' || c.color !== enemy) continue;
    // A bishop still on its home square is undeveloped, not bad.
    if ((enemy === 'w' && (c.square === 'c1' || c.square === 'f1')) || (enemy === 'b' && (c.square === 'c8' || c.square === 'f8'))) continue;
    const light = isLight(c.square);
    const ownPawnsSameColour = cells(chess).filter((p) => p.type === 'p' && p.color === enemy && isLight(p.square) === light).length;
    if (ownPawnsSameColour < 4) continue;
    if (mobility(chess, c.square as Square, enemy) > 2) continue;
    return `their bishop on ${c.square} is a bad piece — hemmed in behind its own pawns on the same colour, with almost nowhere to go`;
  }
  return null;
}

/**
 * M12 — the student's WORST-PLACED piece: the minor or rook with the fewest legal
 * squares. The "what do I do when there's no tactic" lesson — find it a job. Only
 * fires past the opening and only when a piece is genuinely stuck (≤1 square).
 */
export function worstPlacedFriendlyPiece(fen: string, studentColorWB: Color): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const fullmove = Number(fen.split(' ')[5] ?? '0');
  if (fullmove < 10) return null;
  let worst: { sq: string; type: string; m: number } | null = null;
  for (const c of cells(chess)) {
    if (c.color !== studentColorWB) continue;
    if (c.type !== 'n' && c.type !== 'b' && c.type !== 'r') continue;
    const m = mobility(chess, c.square as Square, studentColorWB);
    if (!worst || m < worst.m) worst = { sq: c.square, type: c.type, m };
  }
  if (worst && worst.m <= 1) {
    return `your worst-placed piece is the ${PIECE_NOUN[worst.type]} on ${worst.sq} — it has almost no squares, so the plan is to reroute it somewhere it actually does a job`;
  }
  return null;
}

/**
 * M14/M23 — a student PASSED pawn is a trump that must be pushed; and if the enemy
 * has a knight, remember knights are poor at stopping a runner. Reports the passer +
 * the push cue (+ the knight note when it applies).
 */
export function passedPawnPush(fen: string, studentColorWB: Color, passedSquare: string | null): string | null {
  if (!passedSquare) return null;
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  const enemyHasKnight = cells(chess).some((c) => c.type === 'n' && c.color === enemy);
  const knightNote = enemyHasKnight ? ', and their knight is a poor blocker — knights are bad at stopping a runner' : '';
  return `your passed pawn on ${passedSquare} wants to run — passed pawns are meant to be pushed${knightNote}`;
}

/** Legal-move count for the piece on `sq` as if it were `color`'s turn. */
function mobility(chess: Chess, sq: Square, color: Color): number {
  const parts = chess.fen().split(' ');
  parts[1] = color; parts[3] = '-';
  try { return new Chess(parts.join(' ')).moves({ square: sq, verbose: true }).length; } catch { return 99; }
}
