// moveFundamentals
// ----------------
// The POSITIVE fundamental computer (David 2026-09-06: "the fundamental computer
// needs to be added to all coach surfaces… compute which fundamentals matter
// most. If two are just as important state them both. Fundamental first then the
// rest of teaching.").
//
// For a strong move, it computes WHICH teaching fundamental(s) the move SERVES —
// development, king safety, an outpost, central control, an open file, king
// activity, a passed pawn — ranked by importance on THIS board, and renders them
// WOVEN, fundamental-first. It is the positive counterpart to the mistake-side
// `principleAttribution` (which names the fundamental a bad move BROKE).
//
// G0/G3: it decides nothing — every fundamental has a chess.js board test and
// names only real squares. It is a pure LEAF (chess.js + seeGain + phase only,
// never `groundedAnswer`) so it can be the shared source every coach surface
// pulls from without an import cycle.

import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { seeGain } from './positionReadingService';
import { classifyPhase } from './gamePhaseService';

export type MoveFundamentalId =
  | 'king-safety'
  | 'outpost'
  | 'development'
  | 'center'
  | 'open-file'
  | 'king-activity'
  | 'passed-pawn';

export interface MoveFundamental {
  id: MoveFundamentalId;
  /** Importance on THIS board, 0-100 — higher leads. */
  weight: number;
  /** Verb-first clause to APPEND after an already-named move ("develops into
   *  the game, fighting for the center on d4 and e5"). No piece/square restated. */
  led: string;
  /** Self-contained clause that names the piece ("develops the knight into the
   *  game…") — for standalone use where the move was not already spoken. */
  selfContained: string;
  /** Imperative plan clause ("develop into the game and fight for the center…")
   *  — for the ranked briefing ("The plan here: …"). Never names the SAN, so it
   *  teaches the idea without handing over the move on a live board. */
  imperative: string;
  /** Board squares the clause references (arrows / highlights). */
  squares: string[];
}

const PIECE_NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};
/** The squares "fighting for the center" is allowed to name. */
const CENTER: readonly string[] = ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'];
const CORE_CENTER: readonly string[] = ['d4', 'd5', 'e4', 'e5'];

function fileOf(sq: string): string { return sq[0]; }
function rankOf(sq: string): number { return Number(sq[1]); }
/** Rank from the mover's own side: 1 = back rank, 8 = far rank. */
function relRank(sq: string, color: 'w' | 'b'): number {
  return color === 'w' ? rankOf(sq) : 9 - rankOf(sq);
}

/** No enemy pawn can ever advance to attack `sq` — the classic outpost test. */
function isOutpost(board: Chess, sq: string, mover: 'w' | 'b'): boolean {
  const file = sq.charCodeAt(0);
  const rank = rankOf(sq);
  const enemy = mover === 'w' ? 'b' : 'w';
  const attackRank = mover === 'w' ? rank + 1 : rank - 1;
  if (attackRank < 1 || attackRank > 8) return false;
  for (const df of [-1, 1]) {
    const f = file + df;
    if (f < 97 || f > 104) continue;
    const adjFile = String.fromCharCode(f);
    for (let r = 1; r <= 8; r += 1) {
      const p = board.get(`${adjFile}${r}` as Square);
      if (!p || p.type !== 'p' || p.color !== enemy) continue;
      const canReach = enemy === 'w' ? r <= attackRank : r >= attackRank;
      if (canReach) return false;
    }
  }
  return true;
}

/** Central squares the piece on `to` now attacks (from the after-move board). */
function eyesCenter(after: Chess, to: string, mover: 'w' | 'b'): string[] {
  return CENTER.filter((s) => {
    try { return after.attackers(s as Square, mover).includes(to as Square); }
    catch { return false; }
  });
}

/** Is the pawn on `to` passed on the after-move board? No enemy pawn on the
 *  same or adjacent file ahead of it. */
function isPassedPawn(after: Chess, to: string, mover: 'w' | 'b'): boolean {
  const enemy = mover === 'w' ? 'b' : 'w';
  const file = to.charCodeAt(0);
  const rank = rankOf(to);
  for (const df of [-1, 0, 1]) {
    const f = file + df;
    if (f < 97 || f > 104) continue;
    const adjFile = String.fromCharCode(f);
    for (let r = 1; r <= 8; r += 1) {
      const p = after.get(`${adjFile}${r}` as Square);
      if (!p || p.type !== 'p' || p.color !== enemy) continue;
      const ahead = mover === 'w' ? r > rank : r < rank;
      if (ahead) return false;
    }
  }
  return true;
}

/** The file has no FRIENDLY pawns (half-open); open when neither side has one. */
function fileOpenness(after: Chess, file: string, mover: 'w' | 'b'): 'open' | 'half-open' | null {
  let friendly = 0;
  let enemy = 0;
  for (let r = 1; r <= 8; r += 1) {
    const p = after.get(`${file}${r}` as Square);
    if (!p || p.type !== 'p') continue;
    if (p.color === mover) friendly += 1; else enemy += 1;
  }
  if (friendly > 0) return null;
  return enemy === 0 ? 'open' : 'half-open';
}

function countHomeMinors(board: Chess, mover: 'w' | 'b'): number {
  const home: Square[] = mover === 'w'
    ? (['b1', 'g1', 'c1', 'f1'] as Square[])
    : (['b8', 'g8', 'c8', 'f8'] as Square[]);
  let n = 0;
  for (const sq of home) {
    const p = board.get(sq);
    if (p && p.color === mover && (p.type === 'n' || p.type === 'b')) n += 1;
  }
  return n;
}

/**
 * computeMoveFundamentals — every fundamental the move serves, board-verified,
 * sorted most-important first. Empty when the move has no positive point worth
 * naming (a routine shuffle) OR the piece simply hangs on its square (the
 * recapture-safety guard, mirroring the old quietPurposePhrase).
 */
export function computeMoveFundamentals(
  fenBefore: string,
  moveSan: string,
  moverColor: 'white' | 'black',
): MoveFundamental[] {
  const mover: 'w' | 'b' = moverColor === 'white' ? 'w' : 'b';
  let before: Chess;
  let after: Chess;
  let mv: ReturnType<Chess['move']>;
  try {
    before = new Chess(fenBefore);
    after = new Chess(fenBefore);
    mv = after.move(moveSan);
  } catch { return []; }
  if (!mv) return [];

  // Recapture-safety: never dress a piece that HANGS on its landing square as a
  // positional gain (a rook that "eyes the center" but drops to a queen is not a
  // merit). Castling / passed-pawn pushes clear this trivially.
  if (seeGain(after, mv.to as Square) > 0) return [];

  const moveNumber = Number(fenBefore.split(' ')[5]) || 1;
  const phase = classifyPhase(fenBefore, moveNumber);
  const out: MoveFundamental[] = [];

  // ── KING SAFETY — castling. The one move that both tucks the king away and
  //    activates a rook; in the opening/middlegame it is usually the priority.
  if (mv.san === 'O-O' || mv.san === 'O-O-O') {
    const kingTo = mv.san === 'O-O' ? (mover === 'w' ? 'g1' : 'g8') : (mover === 'w' ? 'c1' : 'c8');
    const rookTo = mv.san === 'O-O' ? (mover === 'w' ? 'f1' : 'f8') : (mover === 'w' ? 'd1' : 'd8');
    out.push({
      id: 'king-safety',
      weight: phase === 'endgame' ? 45 : 92,
      led: 'castles your king into safety and swings the rook toward the center',
      selfContained: 'castling gets your king to safety and brings the rook toward the center',
      imperative: 'castle your king to safety and bring the rook toward the center',
      squares: [kingTo, rookTo],
    });
  }

  // ── OUTPOST — a minor planted where no enemy pawn can ever evict it.
  if ((mv.piece === 'n' || mv.piece === 'b') && relRank(mv.to, mover) >= 5 && isOutpost(after, mv.to, mover)) {
    const name = PIECE_NAME[mv.piece];
    out.push({
      id: 'outpost',
      weight: 84,
      led: `lands on the ${mv.to} outpost, a square no pawn can ever kick it from`,
      selfContained: `plants the ${name} on the ${mv.to} outpost, where no pawn can challenge it`,
      imperative: `plant the ${name} on the ${mv.to} outpost, where no pawn can challenge it`,
      squares: [mv.to],
    });
  }

  // ── DEVELOPMENT — a minor coming off its home rank into the game. Weight
  //    scales with how much is still undeveloped: the more pieces at home, the
  //    more urgent development is.
  const homeRank = mover === 'w' ? 1 : 8;
  if ((mv.piece === 'n' || mv.piece === 'b') && rankOf(mv.from) === homeRank && !out.some((f) => f.id === 'outpost')) {
    const name = PIECE_NAME[mv.piece];
    const eyes = eyesCenter(after, mv.to, mover).filter((s) => CORE_CENTER.includes(s)).slice(0, 2);
    const homeAfter = countHomeMinors(after, mover);
    const weight = Math.min(82, 55 + 6 * (homeAfter + 1));
    const centerTail = eyes.length ? `, fighting for the center on ${eyes.join(' and ')}` : '';
    out.push({
      id: 'development',
      weight,
      led: `develops into the game${centerTail}`,
      selfContained: `develops the ${name} into the game${centerTail}`,
      imperative: `develop into the game${centerTail}`,
      squares: [mv.to, ...eyes],
    });
  }

  // ── CENTER — a central pawn advance (space), or a piece already in play newly
  //    contesting the core center. (A developing minor already carries the
  //    center in its own clause above, so it does not double-count here.)
  if (mv.piece === 'p' && CENTER.includes(mv.to) && relRank(mv.to, mover) >= 4) {
    out.push({
      id: 'center',
      weight: 66,
      led: `stakes out the center and grabs space`,
      selfContained: `stakes out the center with the pawn to ${mv.to}`,
      imperative: `stake out the center and grab space with the pawn to ${mv.to}`,
      squares: [mv.to],
    });
  } else if (mv.piece !== 'p' && mv.piece !== 'k' && rankOf(mv.from) !== homeRank && !out.some((f) => f.id === 'development' || f.id === 'outpost')) {
    const eyes = eyesCenter(after, mv.to, mover).filter((s) => CORE_CENTER.includes(s)).slice(0, 2);
    if (eyes.length >= 2) {
      out.push({
        id: 'center',
        weight: 52,
        led: `takes aim at the center, hitting ${eyes.join(' and ')}`,
        selfContained: `repositions the ${PIECE_NAME[mv.piece]} to take aim at ${eyes.join(' and ')}`,
        imperative: `take aim at the center, hitting ${eyes.join(' and ')}`,
        squares: [mv.to, ...eyes],
      });
    }
  }

  // ── OPEN FILE — a rook (or queen) onto an open / half-open file: the file
  //    where a rook belongs.
  if (mv.piece === 'r' || mv.piece === 'q') {
    const openness = fileOpenness(after, fileOf(mv.to), mover);
    if (openness) {
      const name = PIECE_NAME[mv.piece];
      const fileName = `${fileOf(mv.to)}-file`;
      out.push({
        id: 'open-file',
        weight: phase === 'endgame' ? 60 : 72,
        led: `takes the ${openness} ${fileName}, where the ${name} belongs`,
        selfContained: `brings the ${name} to the ${openness} ${fileName}`,
        imperative: `take the ${openness} ${fileName}, where the ${name} belongs`,
        squares: [mv.to],
      });
    }
  }

  // ── KING ACTIVITY — in the endgame the king is a fighting piece. A king step
  //    toward the center (higher relative rank, or toward the d/e files).
  if (mv.piece === 'k' && phase === 'endgame') {
    const towardCentreRank = relRank(mv.to, mover) > relRank(mv.from, mover);
    const centreFileDist = (sq: string) => Math.min(Math.abs(sq.charCodeAt(0) - 100), Math.abs(sq.charCodeAt(0) - 101)); // dist to d/e
    const towardCentreFile = centreFileDist(mv.to) < centreFileDist(mv.from);
    if (towardCentreRank || towardCentreFile) {
      out.push({
        id: 'king-activity',
        weight: 88,
        led: `marches your king toward the center, where it fights in the endgame`,
        selfContained: `activates the king toward the center, a fighting piece in the endgame`,
        imperative: `march your king toward the center — in the endgame it is a fighting piece`,
        squares: [mv.to],
      });
    }
  }

  // ── PASSED PAWN — push a passer; passed pawns must be pushed.
  if (mv.piece === 'p' && isPassedPawn(after, mv.to, mover)) {
    out.push({
      id: 'passed-pawn',
      weight: phase === 'endgame' ? 84 : 62,
      led: `pushes your passed pawn — passed pawns must be pushed`,
      selfContained: `pushes the passed pawn to ${mv.to} — passed pawns must be pushed`,
      imperative: `push your passed pawn — passed pawns must be pushed`,
      squares: [mv.to],
    });
  }

  return out.sort((a, b) => b.weight - a.weight);
}

/**
 * pickLeadingFundamentals — the top fundamental, plus a co-leader only when it
 * is nearly as important (within 12 weight AND ≥ 55). David: "if two are just
 * as important state them both."
 */
export function pickLeadingFundamentals(funds: readonly MoveFundamental[]): MoveFundamental[] {
  if (funds.length === 0) return [];
  const top = funds[0];
  const lead = [top];
  const second = funds[1];
  if (second && second.id !== top.id && second.weight >= 55 && top.weight - second.weight <= 12) {
    lead.push(second);
  }
  return lead;
}

/** Woven, fundamental-first render of the leading fundamental(s). `form` picks
 *  the led clause (append after an already-named move) or the self-contained
 *  clause (names the piece). Returns null when nothing fires. */
function renderStrategic(
  fenBefore: string,
  moveSan: string,
  moverColor: 'white' | 'black',
  form: 'led' | 'selfContained' | 'imperative',
): string | null {
  const lead = pickLeadingFundamentals(computeMoveFundamentals(fenBefore, moveSan, moverColor));
  if (lead.length === 0) return null;
  return lead.map((f) => f[form]).join(', and ');
}

/** The LED positional clause (verb-first) — for a surface that has ALREADY named
 *  the move, e.g. the hint ("Your knight to f3 — {this}"). Null when quiet. */
export function strategicWhyLed(
  fenBefore: string,
  moveSan: string,
  moverColor: 'white' | 'black',
): string | null {
  return renderStrategic(fenBefore, moveSan, moverColor, 'led');
}

/** The SELF-CONTAINED positional clause (names the piece) — for standalone use,
 *  e.g. review ("the best move was Nf3 — it {this}"). Null when quiet. */
export function strategicWhySelfContained(
  fenBefore: string,
  moveSan: string,
  moverColor: 'white' | 'black',
): string | null {
  return renderStrategic(fenBefore, moveSan, moverColor, 'selfContained');
}

/** The IMPERATIVE plan clause (never names the SAN) — for the ranked DNA briefing
 *  ("The plan here: {this}"). Teaches the idea without handing over the move on a
 *  live board. Null when the move has no fundamental worth naming. */
export function strategicWhyImperative(
  fenBefore: string,
  moveSan: string,
  moverColor: 'white' | 'black',
): string | null {
  return renderStrategic(fenBefore, moveSan, moverColor, 'imperative');
}
