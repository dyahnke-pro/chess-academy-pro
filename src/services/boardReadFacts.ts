/**
 * BOARD READ FACTS — every fact the app's computers make about one board, for
 * the read (David 2026-11-18: "Read this position" in his manner): the
 * standing and the kind of position (`boardKind`), the target (`targetSelector`,
 * both seats), the board's own reads (`computePositionFacts`, every candidate
 * before any door), the plan (`boardPlan`: the siege, the quiet steps, the
 * second front) and theirs, the tempting moves refuted by their own lines or
 * by what they give up (`temptingOnBoard`, `positionalReason.boardReason`) — ours and
 * their best try after our move — and what the engine's best move does
 * (`moveThoughtFacts` on the board after it).
 *
 * `readDecider.decideRead` picks which of them a read says and orders them.
 * The engine is a parameter, so the app (Stockfish in a worker) and the
 * offline fitter (`scripts/board-facts-dump.ts`, native Stockfish) build the
 * SAME facts the decider was trained on.
 */
import { Chess } from 'chess.js';
import { computePositionFacts, type PositionFactsInput } from './positionFacts';
import { consideredTries } from './tryCandidates';
import { temptingOnBoard, standingRefutations, candidateMoves, TEMPTING_COST_CP, type WeighRead, type ConsideredTries } from './weighedMoves';
import { seatCp } from './winChance';
import { foldScore } from './humanReply';
import { boardReason } from './positionalReason';
import { phaseOfFen } from './boardConcepts';
import { boardKind } from './positionCharacter';
import { standingTarget, opponentTargets, targetLine } from './targetSelector';
import { siegeOf, stepsOf, switchWing } from './boardPlan';
import { planSteps, planStepsText } from './planSteps';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { moveThoughtFacts } from './moveThoughtFacts';
import { standingRead } from './reviewMoveBriefing';
import { stakeValue } from './factStakes';
import { classifyMatePattern } from './matePatterns';
import { NO_PREV_CAPTURE } from './captureRun';
import type { ReadFact } from './readDecider';
import type { AnalysisLine, StockfishAnalysis } from '../types';
import type { IntroTense } from '../utils/moveIntro';
import type { ImportanceTier } from './narrationImportance';
import { writerFor, momentPosture, plainThreatsSeenFor } from './writerRegister';
import { readBoardAll } from './boardComputers';

/** A read the student asked for ("read this position"): the asked answer's
 *  writer settings (`writerRegister`). */
const ASKED_WRITER = writerFor('chat');

/** One engine read of a board: its lines, best first. Null when unread. */
export type BoardReader = (fen: string) => Promise<readonly AnalysisLine[] | null>;

export type BoardFact = ReadFact;

/** What a read never says beside a forced mate: plans, conversion advice and
 *  the kind of position. */
const BESIDE_MATE: ReadonlySet<string> = new Set(['standing-bare', 'convert', 'compensation', 'eval', 'character', 'siege', 'plan-steps', 'plan-race', 'structure-plan', 'switch-wing', 'their-plan', 'refuted-positional']);

/** The best move's facts that say who stands better, not what the move does. */
const VERDICT_KINDS: ReadonlySet<string> = new Set(['eval', 'compensation', 'convert']);

export interface BoardReadInput {
  fen: string;
  studentColor: 'w' | 'b';
  rating: number;
  /** The engine's read of THIS board (MultiPV), best line first. */
  before: readonly AnalysisLine[];
  /** Reads any other board the facts need (each tempting move, the board after the best move). */
  read: BoardReader;
  /** A puzzle still being solved: nothing that rules a move in or out. */
  withhold: boolean;
  /** 'now' in the app (the move is shown, not played); the fitter's facts were built 'past'. */
  tense: IntroTense;
  history: readonly string[];
  theory: boolean;
  /** Read the moves a player is drawn to (the student's turn only). */
  readTempting: boolean;
  /** REQUIRED: the student's record for the need term (null on a fitter's board). */
  studentNeedContext: PositionFactsInput['studentNeedContext'];
  /** Passed through to the board's reads: the record, and the last move on each side. */
  extra?: Pick<PositionFactsInput, 'studentWeaknesses' | 'evalBoard' | 'lastMove' | 'opponentLastMove'>;
}

function asAnalysis(lines: readonly AnalysisLine[]): StockfishAnalysis {
  const top = lines[0];
  return {
    bestMove: top?.moves[0] ?? '',
    evaluation: top?.evaluation ?? 0,
    isMate: top?.mate !== null && top?.mate !== undefined,
    mateIn: top?.mate ?? null,
    depth: top?.depth ?? 0,
    topLines: [...lines],
    nodesPerSecond: 0,
  };
}

export interface BoardFactSet {
  facts: BoardFact[];
  /** The one door's importance tier for the board (null when unread). */
  tier: ImportanceTier | null;
}

export async function boardReadFacts(i: BoardReadInput): Promise<BoardFactSet> {
  const side: 'w' | 'b' = i.fen.split(' ')[1] === 'b' ? 'b' : 'w';
  const facts: BoardFact[] = [];
  const top = i.before[0];
  if (!top) return { facts, tier: null };

  const pf = await computePositionFacts({
    theory: i.theory, namesPlayedMove: ASKED_WRITER.namesPlayedMove, boardComputers: 'composer', posture: momentPosture('chat'), namesBestMove: !i.withhold,
    fen: i.fen, moverColor: side, studentColor: i.studentColor, rating: i.rating, analysis: asAnalysis(i.before), history: [...i.history],
    studentNeedContext: i.studentNeedContext, ...(i.extra ?? {}),
  });
  const them: 'w' | 'b' = i.studentColor === 'w' ? 'b' : 'w';
  const mine = side === i.studentColor;
  const whose = mine ? 'your' : 'their';
  const povCp = top.mate == null ? top.evaluation * (i.studentColor === 'w' ? 1 : -1) : null;
  // A FORCED MATE IS THE STORY: no plan, no "finish developing", no kind of
  // position beside it (every-surface gate D, "plans beside mate").
  const mateOnBoard = top.mate != null;
  const done = (): BoardFactSet => ({ facts: mateOnBoard ? facts.filter((f) => !BESIDE_MATE.has(f.kind)) : facts, tier: pf.importance.tier });

  // THE STANDING and THE KIND OF POSITION: who stands better and why, read
  // off this board (his read opens on it), and what kind of play it asks for.
  // A forced mate is the concept read's, not a score's.
  // Whose mate it is, off the score's sign (White's seat); never on a puzzle
  // still being solved, where "there is a mate" is the hint.
  const studentMates = mateOnBoard && (top.evaluation > 0) === (i.studentColor === 'w');
  if (mateOnBoard && !i.withhold) {
    facts.push({ from: 'position', kind: 'standing', text: studentMates ? 'There is a forced mate here for you.' : 'They have a forced mate here.', squares: [] });
  }
  // A PUZZLE'S MATE, BY ITS PATTERN: on a board still being solved the mate's
  // name is the lesson and names no square of the answer (David's puzzle
  // flags, 2026-11-19: the mate puzzles were silent).
  if (mateOnBoard && i.withhold && studentMates) {
    const pattern = matePatternOf(i.fen, top.moves);
    if (pattern) {
      const text = rotateStem([`There is a forced mate here: the pattern is ${pattern}.`, `This one ends in mate, and the pattern is ${pattern}. Find the forcing moves that get there.`], stemKeyOf(`${i.fen}|mate-pattern`));
      facts.push({ from: 'position', kind: 'mate-pattern', text, computer: 'classifyMatePattern', squares: [] });
    }
  }
  if (povCp !== null) {
    // A standing with no reason on the board is its own kind: the decider says
    // a verdict only with its reason.
    const st = standingRead(i.fen, povCp, i.studentColor, i.before);
    facts.push({ from: 'position', kind: st.reasoned ? 'standing' : 'standing-bare', text: st.text, squares: [] });
    const k = boardKind(i.fen, i.studentColor, povCp, i.before);
    if (k) facts.push({ from: 'position', kind: 'character', text: k.text, squares: [] });
  }
  // THE TARGET the board turns on, for the side to move when it is the
  // student, and the student's own pawn the other side can win.
  const target = mine ? standingTarget(i.fen, side, povCp, top.moves[0] ?? null) : null;
  if (target) facts.push({ from: 'position', kind: 'target', text: targetLine(target, i.fen, 'your'), squares: [target.square] });
  const theirTarget = opponentTargets(i.fen, them).find((t) => t.attackers.length + t.reachers.length > t.guards.length);
  if (theirTarget) facts.push({ from: 'position', kind: 'their-target', text: targetLine(theirTarget, i.fen, 'their'), squares: [theirTarget.square] });

  for (const c of pf.candidates) {
    if (i.withhold && c.kind === 'deliberation') continue;
    facts.push({ from: 'position', kind: c.kind, text: c.text, computer: c.computer, squares: c.squares, stakes: stakeValue(c.stakes) });
  }

  // THE PLAN ON THE BOARD (his "attack down the c-file at the knight on c6"),
  // over the board's own engine lines: the siege, the quiet steps (a plain
  // trade allowed), the second front when the target holds. Not on a puzzle
  // still being solved: a plan names its moves.
  if (!i.withhold) {
    // THE KINGS AS THE BOARD STANDS (his "a formidable mass of pieces on the
    // kingside, while Black's rooks are far from the king"): the siege on
    // either king, the student's own first.
    for (const f of readBoardAll('kingSiegeNow', { fen: i.fen, student: i.studentColor, studentCp: povCp })) {
      facts.push({ from: 'position', kind: f.kind, text: f.text, computer: f.computer, squares: f.squares });
    }
    const siege = siegeOf(i.fen, i.before, whose);
    if (siege) facts.push({ from: 'position', kind: 'siege', text: siege.text, computer: 'siege', squares: siege.squares });
    const steps = stepsOf(i.fen, i.before, whose);
    if (steps) facts.push({ from: 'position', kind: 'plan-steps', text: steps.text, computer: 'planSteps', squares: steps.squares });
    const second = mine ? switchWing(i.fen, side, 'your', i.before[0]?.moves ?? []) : null;
    if (second) facts.push({ from: 'position', kind: 'switch-wing', text: second.text, computer: 'switchWing', squares: second.squares });
    // THEIR PLAN: their next quiet moves in the engine's line, after our best
    // move and their reply.
    if (top.moves.length > 2) {
      try {
        const b = new Chess(i.fen);
        b.move({ from: top.moves[0].slice(0, 2), to: top.moves[0].slice(2, 4), promotion: top.moves[0][4] });
        b.move({ from: top.moves[1].slice(0, 2), to: top.moves[1].slice(2, 4), promotion: top.moves[1][4] });
        const p = planSteps(b.fen(), top.moves.slice(2), top.moves[1], 3, true, true);
        // planSteps reads the side NOT to move on the board it is given — the
        // other side here, so "their plan" is ours when the side to move is
        // theirs. Said from the student's seat.
        if (p) facts.push({ from: 'position', kind: 'their-plan', text: planStepsText(p, mine ? 'their' : 'your'), computer: 'planSteps', squares: [...p.steps.flatMap((x) => [x.from, x.to]), ...(p.aim ? [p.aim] : [])] });
      } catch { /* an unplayable line shows no plan */ }
    }
  }

  // The tempting moves, each read to its own line — the student's turn only,
  // never on a puzzle still being solved (ruling a move out narrows the answer).
  // A move that loses nothing yet still costs a pawn or more is refuted by what
  // it gives up (`positionalReason`): his "b5 at once allows …e5, with strong
  // central counterplay and a dead bishop".
  if (!i.withhold && i.readTempting && mine) {
    const tempting: WeighRead[] = [{ evaluation: top.evaluation, mate: top.mate, moves: top.moves }];
    // THE PLAN'S DIRECT TRY (WO-PICTURE-01 P2): the frontal hit on their weak
    // pawn, the storm at their king — weighed for the plan, not for the eye,
    // so it is read whatever a player at the rating would pick.
    // AND THE MOVES WEIGHED FOR A REASON (`reasonTries`): every capture and
    // check, a passed pawn's push, the king's step in an ending, a quiet move
    // that threatens or defends — each read, whatever the eye says.
    const considered: ConsideredTries = consideredTries(i.fen);
    const weighed = candidateMoves(i.fen, i.rating, { played: null, scored: null });
    const toRead = [...weighed.map((c) => ({ uci: c.uci, from: c.from, to: c.to })), ...[...considered.keys()].filter((u) => !weighed.some((c) => c.uci === u)).map((u) => ({ uci: u, from: u.slice(0, 2), to: u.slice(2, 4) }))];
    for (const c of toRead) {
      if (c.uci === top.moves[0]) continue;
      const after = new Chess(i.fen);
      try { after.move({ from: c.from, to: c.to, promotion: c.uci[4] }); } catch { continue; }
      if (after.isGameOver()) continue;
      const t = (await i.read(after.fen()).catch(() => null))?.[0];
      if (t) tempting.push({ evaluation: t.evaluation, mate: t.mate, moves: [c.uci, ...t.moves], earlier: t.earlier?.moves ? [c.uci, ...t.earlier.moves] : null });
    }
    const refuted = temptingOnBoard({ fen: i.fen, student: i.studentColor, rating: i.rating, reads: tempting, priorMove: null, considered });
    for (const t of refuted) facts.push({ from: 'tempting', kind: 'refuted', text: t.text, computer: 'temptingOnBoard', squares: [t.uci.slice(0, 2), t.uci.slice(2, 4)] });
    // A check or capture that wins nothing ("Nxe7+ Rxe7 gives no relief"):
    // the same computer's forcing-move shape, never beside its material refutation.
    const standing = standingRefutations({ fen: i.fen, student: i.studentColor, rating: i.rating, reads: tempting, considered });
    const empty = standing.filter((t) => !refuted.some((r) => r.uci === t.uci));
    for (const t of empty) facts.push({ from: 'tempting', kind: 'refuted', text: t.text, computer: 'temptingOnBoard', squares: t.squares });
    // THE PICTURE'S CONCLUSIONS (WO-PICTURE-01 P3): the verdict read after
    // these tries ("better, but hard to finish") and the try that survives
    // them, off the refutations just made — kept in the read's facts for the
    // decider (P5 speaks them).
    const picture = { fen: i.fen, student: i.studentColor, rating: i.rating, reads: tempting, considered, refuted: { tempting: refuted, standing }, lines: i.before };
    for (const f of [...readBoardAll('pictureVerdict', picture), ...readBoardAll('picturePlan', picture)]) {
      facts.push({ from: 'position', kind: f.kind, text: f.text, computer: f.computer, squares: f.squares });
    }
    // One rule-out a move: a try said by what it does to the result already
    // carries its board reason (`tryMechanism` reads `boardReason` too).
    const said = new Set([...refuted.map((t) => t.san), ...empty.map((t) => t.san)]);
    const bestSan = sanOf(i.fen, top.moves[0]);
    for (const r of tempting.slice(1)) {
      const san = sanOf(i.fen, r.moves[0]);
      if (!san || said.has(san)) continue;
      // What a move gives up explains a QUIET move; a capture or a check that
      // fails is refuted by its line or not at all.
      if (/x|\+|#/.test(san)) continue;
      if (seatCp(tempting[0], side) - seatCp(r, side) < TEMPTING_COST_CP) continue;
      // The board after the two moves, said in the present (the concession
      // reads a move already played: "it took your last defender").
      const why = boardReason(i.fen, san, bestSan, phaseOfFen(i.fen) ?? 'middlegame');
      if (!why) continue;
      const lead = rotateStem([`${san} looks natural, but it isn't the move`, `${san} is tempting here, but it doesn't hold up`], stemKeyOf(`${i.fen}|positional|${san}`));
      facts.push({ from: 'tempting', kind: 'refuted-positional', computer: 'boardReason', text: `${lead}: ${why.note.replace(/^./, (x) => x.toLowerCase())}`, squares: r.moves[0] ? [r.moves[0].slice(0, 2), r.moves[0].slice(2, 4)] : [] });
    }
  }

  // What the best move does, read on the board after it; and their best try
  // there, refuted by its own line (his "…Nd8 would have led to immediate
  // calamity, as Black cannot stop the rook penetration to c7").
  const uci = top.moves[0];
  if (uci) {
    const board = new Chess(i.fen);
    let san: string;
    try { san = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? 'q' }).san; } catch { return done(); }
    const fenB = board.fen();
    const after = await i.read(fenB).catch(() => null);
    // The game behind the board (one-coach unlock, 2026-11-19): the best move's
    // facts read the moves played to reach it (the opening, a piece moved
    // again, the queen chased, the habits) — never an empty game on a board
    // that has one. A puzzle hands no moves.
    const game = gameBehind(i.history, i.fen);
    // THEIR LIKELY REPLIES, each read to its own line (the moves the eye weighs
    // for them on the board after our best move, and the engine's best): the
    // tempting try of theirs refuted below, and the reply tree the best move's
    // facts read (`ifTheyPlay`: his "if Black plays …Nxe3, you take back and
    // the d5-square is yours") — read ONCE for both.
    const theirs: WeighRead[] = [];
    if (after?.[0] && !i.withhold && i.readTempting && mine) {
      theirs.push({ evaluation: after[0].evaluation, mate: after[0].mate, moves: after[0].moves });
      for (const c of candidateMoves(fenB, i.rating, { played: null, scored: null })) {
        if (c.uci === after[0].moves[0]) continue;
        const b2 = new Chess(fenB);
        try { b2.move({ from: c.from, to: c.to, promotion: c.uci[4] }); } catch { continue; }
        if (b2.isGameOver()) continue;
        const t = (await i.read(b2.fen()).catch(() => null))?.[0];
        if (t) theirs.push({ evaluation: t.evaluation, mate: t.mate, moves: [c.uci, ...t.moves], earlier: t.earlier?.moves ? [c.uci, ...t.earlier.moves] : null });
      }
    }
    const replier: 'w' | 'b' = side === 'w' ? 'b' : 'w';
    const everyAfter = theirs.length >= 2
      ? { replies: theirs.map((r) => ({ uci: r.moves[0], cp: foldScore(seatCp(r, replier), r.mate === null ? null : replier === 'w' ? r.mate : -r.mate), mate: r.mate === null ? null : replier === 'w' ? r.mate : -r.mate, pv: r.moves })), rating: i.rating }
      : null;
    if (after) {
      for (const f of moveThoughtFacts({
        fenBefore: i.fen, san, moverIsStudent: mine, namesPlayedMove: ASKED_WRITER.namesPlayedMove, plainThreatsSeen: plainThreatsSeenFor(ASKED_WRITER, false), tense: i.tense, theory: false, story: false, moveReads: ASKED_WRITER.moveReads,
        prev: NO_PREV_CAPTURE, line: top.moves.slice(1), history: game.history, theirLast: game.theirLast, phrases: null, reads: { before: [...i.before], after: [...after], passBefore: [], passAfter: [], everyAfter }, costCp: 0,
      })) {
        // A puzzle still being solved keeps only who stands better: what the
        // best move does is the answer.
        if (i.withhold && !VERDICT_KINDS.has(f.kind)) continue;
        facts.push({ from: 'bestMove', kind: f.kind, text: f.text, computer: f.computer, squares: f.squares, stakes: stakeValue(f.stakes), restates: f.restates === true });
      }
      if (theirs.length > 0) {
        const theirRefuted = temptingOnBoard({ fen: fenB, student: i.studentColor, rating: i.rating, reads: theirs, priorMove: { fenBefore: i.fen, san } });
        for (const t of theirRefuted) {
          facts.push({ from: 'tempting', kind: 'their-refuted', text: t.text, computer: 'temptingOnBoard', squares: [t.uci.slice(0, 2), t.uci.slice(2, 4)] });
        }
        for (const t of standingRefutations({ fen: fenB, student: i.studentColor, rating: i.rating, reads: theirs }).filter((x) => !theirRefuted.some((r) => r.uci === x.uci))) {
          facts.push({ from: 'tempting', kind: 'their-refuted', text: t.text, computer: 'temptingOnBoard', squares: t.squares });
        }
      }
    }
  }
  return done();
}

/** The named pattern the engine's line mates with, when it plays to mate. */
function matePatternOf(fen: string, line: readonly string[]): string | null {
  const b = new Chess(fen);
  try { for (const m of line) b.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }); } catch { return null; }
  if (!b.isCheckmate()) return null;
  const p = classifyMatePattern(b.fen());
  return p ? p.name.replace(/ Mate$/, ' mate') : null;
}

function sanOf(fen: string, uci: string | undefined): string | null {
  if (!uci) return null;
  try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return null; }
}

/** The moves played to reach `fen` and the last of them, when the history
 *  replays to that board; an empty game otherwise (a puzzle, a set-up board). */
export function gameBehind(history: readonly string[], fen: string): { history: string[]; theirLast: { fenBefore: string; san: string } | null } {
  if (history.length === 0) return { history: [], theirLast: null };
  const b = new Chess();
  let before = b.fen();
  try { for (const san of history) { before = b.fen(); b.move(san); } } catch { return { history: [], theirLast: null }; }
  if (b.fen().split(' ').slice(0, 4).join(' ') !== fen.split(' ').slice(0, 4).join(' ')) return { history: [], theirLast: null };
  return { history: [...history], theirLast: { fenBefore: before, san: history[history.length - 1] } };
}
