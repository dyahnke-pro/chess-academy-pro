// THE LEARN AND REVIEW REPLAYS of a game with its engine reads, shared by the
// decision baseline and the speedrun replay measure (one copy, never two).
import { onCoachDecision, type CoachDecisionRow } from '../services/coachDecisionEvents';
import { computePositionFacts, type PositionFactsResult } from '../services/positionFacts';
import { mateContext } from '../utils/mateContext';
import { analysisOf, linesOf, replayPlies, reviewSegments, type ReplayGame } from './replayGame';
import { INACCURACY_CP } from '../services/engineConstants';

export interface FixtureGame extends ReplayGame { id: string; rating: number }

/** One source's record: the door's rows and the lines it let speak. */
export interface SourceRecord { rows: CoachDecisionRow[]; spoken: string[] }

/** Runs `fn`, keeping every decision the one door emitted while it ran. */
export async function withRows<T>(fn: () => T | Promise<T>): Promise<{ rows: CoachDecisionRow[]; result: T }> {
  const rows: CoachDecisionRow[] = [];
  const off = onCoachDecision((r) => { rows.push(r); });
  try { return { rows, result: await fn() }; } finally { off(); }
}

export const clausesSaid = (pf: PositionFactsResult): string => pf.clauses.map((c) => `[${c.kind}] ${c.text}`).join(' ');

export async function reviewSource(g: FixtureGame): Promise<SourceRecord> {
  const { rows, result } = await withRows(() => reviewSegments(g, g.rating));
  return { rows, spoken: result.map((s) => `${s.ply}: ${s.narration ?? ''}`) };
}

/** Learn's live lane after each of the student's moves and the coach's reply:
 *  the arguments CoachTeachPage hands `computePositionFacts` (posture `walk`,
 *  its own board computers, the reads of the student's move, the reply that
 *  made the board), with the said set carried move to move. */
export async function learnSource(g: FixtureGame, onTurns?: (turns: Array<Array<{ kind: string; text: string; claim: string }>>) => void): Promise<SourceRecord> {
  const plies = replayPlies(g);
  const student: 'w' | 'b' = g.studentSide === 'white' ? 'w' : 'b';
  const said = new Set<string>();
  // The story's structure thread: the plan the student last heard.
  let planHeard: string | null = null;
  const out: SourceRecord = { rows: [], spoken: [] };
  const turns: Array<Array<{ kind: string; text: string; claim: string }>> = [];
  // The game's graded sound plies, as the page keeps them (`LearnMemory.
  // soundPlies`): each student move priced under an inaccuracy.
  const soundPlies = new Set<number>();
  for (let k = 0; k + 1 < plies.length; k++) {
    const p = plies[k];
    const r = plies[k + 1];
    if (p.own && p.costCp !== null && p.costCp < INACCURACY_CP) soundPlies.add(k + 1);
    if (!p.own || r.after.length === 0) continue;
    const historySans = g.sans.slice(0, k + 1);
    const { rows, result } = await withRows(() => computePositionFacts({ theory: true, namesPlayedMove: true,
      boardComputers: 'surface',
      posture: 'walk',
      fen: r.fenAfter,
      history: g.sans.slice(0, k + 2),
      soundPlies: new Set(soundPlies),
      moverColor: student,
      studentColor: student,
      rating: g.rating,
      analysis: analysisOf(r.after),
      lastMove: {
        fenBefore: p.fenBefore, san: p.san, cpLoss: p.costCp, historySans,
        reads: p.best ? {
          historySans, bestMoveUci: p.best.uci, bestPvUci: p.best.pv, playedPvUci: p.reply?.pv ?? [], price: null,
          ...mateContext(analysisOf(p.before), analysisOf(p.after), g.studentSide),
        } : null,
        fanBefore: linesOf(p.before),
      },
      alreadySaid: new Set(said),
      structurePlanHeard: planHeard,
      opponentLastMove: { fenBefore: r.fenBefore, san: r.san },
    }));
    for (const t of result.remember) said.add(t);
    planHeard = result.structurePlanSaid ?? planHeard;
    out.rows.push(...rows);
    out.spoken.push(`${r.ply}: ${clausesSaid(result)}`);
    turns.push(result.clauses.map((c) => ({ kind: c.kind, text: c.text, claim: c.claim ?? c.claims[0] ?? c.text })));
  }
  onTurns?.(turns);
  return out;
}

