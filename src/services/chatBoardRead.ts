/**
 * CHAT ANSWERS FROM THE COMPUTED FACTS (David 2026-10-09: "route it from
 * computed facts to chat"). A board question reads the same `positionFacts`
 * result the narration computed for this position — every computer it runs
 * (think-aloud depth, line tactics, king reads, trade and defence ideas, the
 * plan race, latent dangers, the deliberation, structure plans) — instead of a
 * few computers called by hand. A cache miss (home chat, review, a position
 * the narration never reached) computes it once, here, the same way.
 *
 * Selection, never a second ranking: a question that names a piece, square or
 * move keeps the facts whose squares touch it, in the door's order; an open
 * question takes what the door chose to speak, in the student-asked posture.
 */
import { Chess } from 'chess.js';
import { computePositionFacts, clauseText, type ClauseItem } from './positionFacts';
import { cachedPositionFacts } from './positionFactsCache';
import { getCachedStockfish } from '../hooks/stockfishFenCache';
import { lastMoveIfStudent, lastMoveIfOpponent } from './lastMoveOfLine';
import type { StockfishAnalysis } from '../types';

export interface ChatBoardInput {
  fen: string;
  studentColor: 'white' | 'black';
  history: readonly string[];
  ask: string;
  rating?: number;
  /** The engine line the chat turn already holds, when the eval cache is empty. */
  enginePlan?: { pvSan: ReadonlyArray<string>; evalCp: number | null; mateIn: number | null } | null;
}

const PIECE: Record<string, string> = { pawn: 'p', knight: 'n', night: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };

/** The squares a question points at: named squares, plus the squares of a
 *  named piece ("my bishop", "their knight") on this board. Empty = an open ask. */
export function questionSquares(ask: string, fen: string, student: 'w' | 'b'): string[] {
  const t = ask.toLowerCase().replace(/\b([a-h])\s+([1-8])\b/g, '$1$2');
  const out = new Set<string>([...t.matchAll(/\b([a-h][1-8])\b/g)].map((m) => m[1]));
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return [...out]; }
  for (const m of t.matchAll(/\b(my|your|their|his|her|the)\s+(pawn|knight|night|bishop|rook|queen|king)s?\b/g)) {
    const type = PIECE[m[2]];
    const side: 'w' | 'b' | null = m[1] === 'my' ? student : m[1] === 'the' ? null : student === 'w' ? 'b' : 'w';
    for (const row of chess.board()) for (const p of row) {
      if (p && p.type === type && (side === null || p.color === side)) out.add(p.square);
    }
  }
  // A move in SAN names its destination square.
  for (const m of t.matchAll(/\b[nbrqk]?x?([a-h][1-8])\b/g)) out.add(m[1]);
  return [...out];
}

function analysisFor(fen: string, plan: ChatBoardInput['enginePlan']): Pick<StockfishAnalysis, 'topLines' | 'evaluation' | 'isMate' | 'mateIn' | 'seldepth' | 'depth' | 'wdl'> | null {
  const cached = getCachedStockfish(fen);
  if (cached?.topLines?.length) return cached;
  if (!plan || plan.pvSan.length === 0) return null;
  const c = new Chess(fen);
  const uci: string[] = [];
  for (const san of plan.pvSan) {
    try { const m = c.move(san); if (!m) break; uci.push(`${m.from}${m.to}${m.promotion ?? ''}`); } catch { break; }
  }
  if (uci.length === 0) return null;
  const evaluation = plan.evalCp ?? 0;
  return { topLines: [{ rank: 1, evaluation, mate: plan.mateIn ?? null, moves: uci }], evaluation, isMate: plan.mateIn != null, mateIn: plan.mateIn ?? null, depth: 0, seldepth: 0 } as Pick<StockfishAnalysis, 'topLines' | 'evaluation' | 'isMate' | 'mateIn' | 'seldepth' | 'depth' | 'wdl'>;
}

/** The clauses that answer this question on this board, best first — or null
 *  when the computed facts say nothing about what was asked. */
export async function chatBoardClauses(i: ChatBoardInput): Promise<ClauseItem[] | null> {
  const student: 'w' | 'b' = i.studentColor === 'white' ? 'w' : 'b';
  const focus = questionSquares(i.ask, i.fen, student);
  let hit = cachedPositionFacts(i.fen, student);
  // An open ask needs the student-asked posture: an `interrupt` result may be
  // silent by design, and silence is not an answer to a question.
  if (!hit || (focus.length === 0 && hit.posture !== 'walk')) {
    const analysis = analysisFor(i.fen, i.enginePlan ?? null);
    if (!analysis) return hit && focus.length > 0 ? select(hit.result.candidates, focus) : null;
    const sans = [...i.history];
    const lm = lastMoveIfStudent(sans, i.studentColor, i.fen);
    const om = lastMoveIfOpponent(sans, i.studentColor, i.fen);
    try {
      const result = await computePositionFacts({
        posture: 'walk',
        fen: i.fen,
        moverColor: i.fen.split(' ')[1] === 'b' ? 'b' : 'w',
        studentColor: student,
        rating: i.rating,
        analysis,
        ...(lm ? { lastMove: lm } : {}),
        ...(om ? { opponentLastMove: om } : {}),
        history: sans,
      });
      hit = { result, posture: 'walk' };
    } catch { return null; }
  }
  if (focus.length === 0) return hit.result.clauses.length ? hit.result.clauses : null;
  return select(hit.result.candidates, focus);
}

function select(candidates: readonly ClauseItem[], focus: readonly string[]): ClauseItem[] | null {
  const f = new Set(focus);
  const about = candidates.filter((c) => (c.squares ?? []).some((s) => f.has(s)));
  return about.length ? [...about].sort((a, b) => b.rank - a.rank) : null;
}

/** The answer text: the selected facts, in order. */
export async function chatBoardAnswer(i: ChatBoardInput): Promise<string | null> {
  const clauses = await chatBoardClauses(i);
  if (!clauses) return null;
  const text = clauseText(clauses).join(' ').trim();
  return text || null;
}

