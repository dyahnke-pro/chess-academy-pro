/**
 * humanMove — THE OPPONENT PICKS A MOVE THE WAY A PLAYER OF ITS RATING WOULD
 * (David 2026-10-22: "And certainly make more human … Check to make sure this
 * is an app wide fix").
 *
 * A strength-limited engine does not play like a person. Stockfish's own Elo
 * cap stops at ~1150 in human terms (`UCI_Elo` 1320 and Skill 0 both measured
 * there), and its mistakes are random: it finds the deep tactic, then drops a
 * pawn for nothing. A 1200 player misses the deep tactic and still recaptures.
 *
 * So the move is chosen from every legal move by a small model FITTED on what
 * real players picked (`human-move-model.json`, from Lichess games at every
 * rating, every legal move scored by Stockfish — `humanMove.measure.test.ts`):
 * P(move) ∝ exp(w(rating) · features(move)), w bending with the rating. The features are what a move
 * costs (in winning chances, so a won position is not read as a blunder fest)
 * and what kind of move it is (a capture, a check, a piece running from an
 * attack, a piece left where it can be taken, a developing move …). The weights
 * move with the rating, so a 900 drops pieces where a 900 drops them and a 2000
 * almost never does. Every engine the app runs can feed it: it needs only a
 * score for each legal move.
 *
 * Pure: chess.js only, no engine, no database.
 */
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import model from '../data/human-move-model.json';

/** The features, in the model's order. A new one changes the model file. */
export const HUMAN_FEATURES = [
  'loss',        // winning chances lost against the best move (0..2)
  'lossSqrt',    // its square root: the first small loss costs the most
  'best',        // the engine's top move
  'capture',
  'captureValue',
  'check',
  'flee',        // the moved piece was attacked where it stood
  'leftHanging', // the moved piece can be taken where it lands, for less than it is worth or for free
  'knight',
  'bishop',
  'rook',
  'queen',
  'king',
  'castle',
  'develop',     // a knight or bishop leaving its first rank
  'promote',
  'backward',    // a piece (not a pawn) retreating toward its own side
  'distance',    // squares travelled / 7
  'edgePawn',    // a pawn on the a/b/g/h file
  'centre',      // lands on c3–f6
] as const;
export type HumanFeature = typeof HUMAN_FEATURES[number];

export interface HumanMoveModel {
  version: number;
  features: readonly string[];
  /** Weights at the centre rating. */
  base: readonly number[];
  /** Change per `scale` rating points above the centre. */
  slope: readonly number[];
  /** The bend: players do not improve in a straight line (a 1200 is much
   *  cleaner than an 800; a 2200 only a little cleaner than an 1800). */
  curve: readonly number[];
  centre: number;
  scale: number;
  /** The calibration: added to the rating asked for, fitted so the model's
   *  mistakes come at the players' rate at every band. */
  shift: number;
  /** The ratings it was fitted on; a rating outside reads as the nearest edge
   *  (the model is never asked about players it never saw). */
  range: readonly [number, number];
}

const MODEL = model as unknown as HumanMoveModel;
if (MODEL.features.join(',') !== HUMAN_FEATURES.join(',')) {
  throw new Error('human-move-model.json was fitted on a different feature list');
}

/** A legal move and what it is worth for the side making it (cp, after the
 *  move, the mover's view; a mate folded to ±2000+). */
export interface ScoredMove {
  uci: string;
  cp: number;
}

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Lichess's winning-chances curve (−1..1). */
export function winningChances(cp: number): number {
  return 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
}

function lowestAttacker(c: Chess, sq: Square, by: Color): number | null {
  let low: number | null = null;
  for (const a of c.attackers(sq, by)) {
    const p = c.get(a);
    if (!p) continue;
    const v = p.type === 'k' ? 100 : VALUE[p.type];
    if (low === null || v < low) low = v;
  }
  return low;
}

/** The features of one legal move. `loss` is in winning chances. */
export function moveFeatures(before: Chess, m: Move, loss: number, isBest: boolean): number[] {
  const me = m.color;
  const them: Color = me === 'w' ? 'b' : 'w';
  const pieceValue = VALUE[m.piece];
  const flee = m.piece !== 'k' && before.isAttacked(m.from, them) ? 1 : 0;
  let leftHanging = 0;
  if (m.piece !== 'k') {
    const after = new Chess(m.after);
    const attacker = lowestAttacker(after, m.to, them);
    if (attacker !== null) {
      const defended = after.attackers(m.to, me).length > 0;
      if (!defended || attacker < (m.promotion ? VALUE[m.promotion] : pieceValue)) leftHanging = 1;
    }
  }
  const fromRank = Number(m.from[1]);
  const toRank = Number(m.to[1]);
  const homeRank = me === 'w' ? 1 : 8;
  const forward = me === 'w' ? toRank - fromRank : fromRank - toRank;
  const fileD = Math.abs(m.from.charCodeAt(0) - m.to.charCodeAt(0));
  const rankD = Math.abs(toRank - fromRank);
  const toFile = m.to[0];
  const values: Record<HumanFeature, number> = {
    loss,
    lossSqrt: Math.sqrt(loss),
    best: isBest ? 1 : 0,
    capture: m.captured ? 1 : 0,
    captureValue: m.captured ? VALUE[m.captured] / 9 : 0,
    check: /[+#]$/.test(m.san) ? 1 : 0,
    flee,
    leftHanging,
    knight: m.piece === 'n' ? 1 : 0,
    bishop: m.piece === 'b' ? 1 : 0,
    rook: m.piece === 'r' ? 1 : 0,
    queen: m.piece === 'q' ? 1 : 0,
    king: m.piece === 'k' && !m.isKingsideCastle() && !m.isQueensideCastle() ? 1 : 0,
    castle: m.isKingsideCastle() || m.isQueensideCastle() ? 1 : 0,
    develop: (m.piece === 'n' || m.piece === 'b') && fromRank === homeRank ? 1 : 0,
    promote: m.promotion ? 1 : 0,
    backward: m.piece !== 'p' && forward < 0 ? 1 : 0,
    distance: Math.max(fileD, rankD) / 7,
    edgePawn: m.piece === 'p' && 'abgh'.includes(toFile) ? 1 : 0,
    centre: 'cdef'.includes(toFile) && toRank >= 3 && toRank <= 6 ? 1 : 0,
  };
  return HUMAN_FEATURES.map((f) => values[f]);
}

/** Every scored legal move with its features (moves the engine did not score
 *  are left out — an unscored move has no cost to weigh). */
export function featureRows(fen: string, scored: readonly ScoredMove[]): Array<{ uci: string; cp: number; x: number[] }> {
  if (scored.length === 0) return [];
  const before = new Chess(fen);
  const byUci = new Map<string, Move>();
  for (const m of before.moves({ verbose: true })) byUci.set(`${m.from}${m.to}${m.promotion ?? ''}`, m);
  const bestCp = Math.max(...scored.map((s) => s.cp));
  const bestWc = winningChances(bestCp);
  const rows: Array<{ uci: string; cp: number; x: number[] }> = [];
  for (const s of scored) {
    const m = byUci.get(s.uci);
    if (!m) continue;
    const loss = Math.max(0, bestWc - winningChances(s.cp));
    rows.push({ uci: s.uci, cp: s.cp, x: moveFeatures(before, m, loss, s.cp === bestCp) });
  }
  return rows;
}

/** The model's weights at a rating. */
export function weightsAt(rating: number, m: HumanMoveModel = MODEL): number[] {
  const r = Math.min(m.range[1], Math.max(m.range[0], rating + m.shift));
  const z = (r - m.centre) / m.scale;
  return m.base.map((b, i) => b + m.slope[i] * z + m.curve[i] * z * z);
}

/** P(each move) for a player of `rating`. */
export function humanMoveProbabilities(
  fen: string,
  scored: readonly ScoredMove[],
  rating: number,
  m: HumanMoveModel = MODEL,
): Array<{ uci: string; cp: number; p: number }> {
  const rows = featureRows(fen, scored);
  if (rows.length === 0) return [];
  const w = weightsAt(rating, m);
  const logits = rows.map((r) => r.x.reduce((a, v, i) => a + v * w[i], 0));
  const top = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - top));
  const z = e.reduce((a, v) => a + v, 0);
  return rows.map((r, i) => ({ uci: r.uci, cp: r.cp, p: e[i] / z }));
}

export interface HumanPick {
  uci: string;
  /** The picked move's probability. */
  p: number;
  /** What it gives up against the best move (cp). */
  cpLoss: number;
  /** How many scored moves it was chosen from. */
  candidates: number;
}

/** One move for a player of `rating`, drawn from the model — genuinely random
 *  on purpose (the sparring partner must not become a book). */
export function pickHumanMove(
  fen: string,
  scored: readonly ScoredMove[],
  rating: number,
  rand: () => number = Math.random,
): HumanPick | null {
  const probs = humanMoveProbabilities(fen, scored, rating);
  if (probs.length === 0) return null;
  const bestCp = Math.max(...probs.map((q) => q.cp));
  let u = rand();
  for (const q of probs) {
    u -= q.p;
    if (u <= 0) return { uci: q.uci, p: q.p, cpLoss: bestCp - q.cp, candidates: probs.length };
  }
  const last = probs[probs.length - 1];
  return { uci: last.uci, p: last.p, cpLoss: bestCp - last.cp, candidates: probs.length };
}
