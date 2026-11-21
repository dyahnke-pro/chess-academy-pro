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
import { MATERIAL_VALUE } from './pieceValues';
import { Chess } from 'chess.js';
import { flipSideToMove } from './threatOut';
import { computePositionFacts, type PositionFactsInput } from './positionFacts';
import { consideredTries } from './tryCandidates';
import { temptingOnBoard, standingRefutations, candidateMoves, TEMPTING_COST_CP, type WeighRead, type ConsideredTries, type ChangeReasonArgs } from './weighedMoves';
import { changeReasonWithEngine } from './futures';
import type { BundleEngine } from './engineComputers';
import { seatCp } from './winChance';
import { foldScore } from './humanReply';
import { boardReason } from './positionalReason';
import { phaseOfFen } from './boardConcepts';
import { boardKind } from './positionCharacter';
import { standingTarget, opponentTargets, targetLine } from './targetSelector';
import { siegeOf, stepsOf, switchWing } from './boardPlan';
import { planSteps, planStepsText } from './planSteps';
import { andList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { moveThoughtFacts } from './moveThoughtFacts';
import { signedBand, standingRead } from './reviewMoveBriefing';
import { stakeValue } from './factStakes';
import { classifyMatePattern } from './matePatterns';
import { defenderCheckRun } from './checkRun';
import { NO_PREV_CAPTURE } from './captureRun';
import type { ReadFact } from './readDecider';
import type { AnalysisLine, StockfishAnalysis } from '../types';
import type { IntroTense } from '../utils/moveIntro';
import type { ImportanceTier } from './narrationImportance';
import { writerFor, momentPosture, plainThreatsSeenFor } from './writerRegister';
import { readBoardAll, pictureConclusionsOf } from './boardComputers';
import { tellPictureFacts } from './planThread';
import { threadsOfRead, type ReadStory } from './gameStory';
import { evalBand } from './evalBand';
import type { TrySource } from './tryReadBudget';
import { boardAfter, isForcingThreat, nowBoard, renderQuietThreat, renderTryGroup } from './teachingSentence';

/** A read the student asked for ("read this position"): the asked answer's
 *  writer settings (`writerRegister`). */
const ASKED_WRITER = writerFor('chat');

/** One engine read of a board: its lines, best first. Null when unread.
 *  `source` says which try the board comes from, so the surface's budget
 *  (`tryReadBudget`) sets the read's depth and time. The reads of one step
 *  are asked together: a reader with a pool runs them in parallel. */
export type BoardReader = (fen: string, source: TrySource) => Promise<readonly AnalysisLine[] | null>;

export type BoardFact = ReadFact;

/** What a read never says beside a forced mate: plans, conversion advice and
 *  the kind of position. */
const REFUTABLE_PLAN_KINDS: ReadonlySet<string> = new Set(['structure-plan', 'plan-steps', 'plan-now', 'pawn-break']);
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
  /** REQUIRED: read a try no pure reader finds a reason for again, with the
   *  engine-backed computers on its futures (`tryReadBudget(surface).engineFutures`). */
  engineFutures: boolean;
  /** REQUIRED: the student's record for the need term (null on a fitter's board). */
  studentNeedContext: PositionFactsInput['studentNeedContext'];
  /** REQUIRED: the game's story, where the read is of a game the coach is
   *  telling (Learn's "read this position"): the opening's story rides in the
   *  best move's facts, and the picture's conclusions are told against what
   *  the game already said (`planThread.tellPictureFacts` — an unchanged one
   *  is not said again, a changed one is said as the change). Null on a
   *  standalone board (a puzzle, Play, Review's Read, a lesson). Plain data:
   *  the read runs in a worker. */
  story: ReadStory | null;
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

/** A fact before its board is stamped: the bundle stamps every fact once,
 *  as it hands the set over (`stampBoard`). */
type DraftFact = Omit<BoardFact, 'board'>;

/** THE BOARD STAMP (CLAUDE.md, EVERY FACT KNOWS ITS BOARD): a board fact is
 *  about the board on screen; a tempting move's refutation about the board
 *  after that try; what the best move does about the board after it. */
export function stampBoard(fen: string, f: DraftFact, best: string | null): BoardFact {
  const path = f.from === 'tempting' && f.move ? [f.move] : f.from === 'bestMove' && best ? [best] : [];
  const board = path.length ? boardAfter(fen, path, f.from === 'tempting' ? 'try' : 'line') : null;
  return { ...f, board: board ?? nowBoard(fen) };
}

export async function boardReadFacts(i: BoardReadInput): Promise<BoardFactSet> {
  const side: 'w' | 'b' = i.fen.split(' ')[1] === 'b' ? 'b' : 'w';
  const facts: DraftFact[] = [];
  // A FINISHED GAME HAS A READ WITH NO ENGINE (F4): the mate's pattern and
  // the material it was done with, from the side that delivered it.
  const finished = finishedRead(i.fen);
  if (finished) return { facts: [finished], tier: null };
  const top = i.before[0];
  if (!top) return { facts: [], tier: null };

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
  // NO PLAN STEP THE BOARD'S OWN READ REFUTES (F1/F5, board 5: "break with
  // h6" beside "h6 … doesn't work"): a plan fact whose first square — the
  // square its first step goes to, as its producer couples it — is where a
  // refuted try lands is that try, already ruled out.
  const refutedTo = (): Set<string> => new Set(facts.filter((f) => f.kind === 'refuted').flatMap((f) => [f.move, ...(f.also ?? [])]).filter((u): u is string => !!u).map((u) => u.slice(2, 4)));
  const refutedPlan = (f: DraftFact, to: Set<string>): boolean => REFUTABLE_PLAN_KINDS.has(f.kind) && f.squares.length > 0 && to.has(f.squares[0]);
  const done = (): BoardFactSet => {
    const to = refutedTo();
    const kept = facts.filter((f) => !refutedPlan(f, to));
    const said = mateOnBoard ? kept.filter((f) => !BESIDE_MATE.has(f.kind)) : kept;
    return { facts: said.map((f) => stampBoard(i.fen, f, top.moves[0] ?? null)), tier: pf.importance.tier };
  };

  // THE STANDING and THE KIND OF POSITION: who stands better and why, read
  // off this board (his read opens on it), and what kind of play it asks for.
  // A forced mate is the concept read's, not a score's.
  // Whose mate it is, off the score's sign (White's seat); never on a puzzle
  // still being solved, where "there is a mate" is the hint.
  const studentMates = mateOnBoard && (top.evaluation > 0) === (i.studentColor === 'w');
  if (mateOnBoard && !i.withhold) {
    facts.push({ from: 'position', kind: 'standing', text: studentMates ? 'There is a forced mate here for you.' : 'They have a forced mate here.', squares: [], claims: [`standing:mate${studentMates ? '+' : '-'}`] });
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
    facts.push({ from: 'position', kind: st.reasoned ? 'standing' : 'standing-bare', text: st.text, squares: [], reasonSquares: st.reasonSquares, claims: [`standing:${signedBand(povCp)}`] });
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
    facts.push({ from: 'position', kind: c.kind, text: c.text, computer: c.computer, squares: c.squares, stakes: stakeValue(c.stakes), claims: c.claims });
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
      facts.push({ from: 'position', kind: f.kind, text: f.text, computer: f.computer, squares: f.squares, claims: f.claims });
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
  // The tries read here are the picture's input too (WO-PICTURE-01 P6): the
  // best move's facts read the verdict and plan off them (`reads.tries`).
  let triesRead: WeighRead[] | null = null;
  if (!i.withhold && i.readTempting && mine) {
    const tempting: WeighRead[] = [{ evaluation: top.evaluation, mate: top.mate, moves: top.moves, root: true }];
    triesRead = tempting;
    // THE PLAN'S DIRECT TRY (WO-PICTURE-01 P2): the frontal hit on their weak
    // pawn, the storm at their king — weighed for the plan, not for the eye,
    // so it is read whatever a player at the rating would pick.
    // AND THE MOVES WEIGHED FOR A REASON (`reasonTries`): every capture and
    // check, a passed pawn's push, the king's step in an ending, a quiet move
    // that threatens or defends — each read, whatever the eye says.
    const considered: ConsideredTries = consideredTries(i.fen);
    const weighed = candidateMoves(i.fen, i.rating, { played: null, scored: null });
    const toRead: Array<{ uci: string; from: string; to: string; source: TrySource }> = [
      ...weighed.map((c) => ({ uci: c.uci, from: c.from, to: c.to, source: 'eye' as const })),
      ...[...considered].filter(([u]) => !weighed.some((c) => c.uci === u)).map(([u, t]) => ({ uci: u, from: u.slice(0, 2), to: u.slice(2, 4), source: t.why })),
    ];
    // Every try's board, read together (the pool runs them side by side), kept in order.
    // ONE MOVE PER BOARD: a try the board's own deep read already holds
    // (root MultiPV) is scored from that read, never re-read shallower — a
    // second, shallower score of the same move is how a read named …Kf8 as
    // the move while its own read had …Kd8 best.
    for (const c of toRead) {
      const root = i.before.find((l, k) => k > 0 && l.moves[0] === c.uci);
      if (root && !tempting.some((t) => t.moves[0] === c.uci)) tempting.push({ evaluation: root.evaluation, mate: root.mate, moves: [...root.moves], earlier: root.earlier?.moves ? [...root.earlier.moves] : null, root: true });
    }
    const boards = toRead.flatMap((c) => {
      if (c.uci === top.moves[0] || i.before.some((l) => l.moves[0] === c.uci)) return [];
      const after = new Chess(i.fen);
      try { after.move({ from: c.from, to: c.to, promotion: c.uci[4] }); } catch { return []; }
      return after.isGameOver() ? [] : [{ uci: c.uci, fen: after.fen(), source: c.source }];
    });
    const reads = await Promise.all(boards.map((b) => i.read(b.fen, b.source).catch(() => null)));
    boards.forEach((b, k) => {
      const t = reads[k]?.[0];
      if (t) tempting.push({ evaluation: t.evaluation, mate: t.mate, moves: [b.uci, ...t.moves], earlier: t.earlier?.moves ? [b.uci, ...t.earlier.moves] : null });
    });
    const refuted = temptingOnBoard({ fen: i.fen, student: i.studentColor, rating: i.rating, reads: tempting, priorMove: null, considered });
    // TRIES THAT WALK INTO ONE MATE ARE ONE IDEA (0Km5u …Kg8: …Qxc3, …Bc8,
    // …Be8 and …Bh4 each "they play Rf8+ … Qxf8#"): said once, by the most
    // tempting, the rest named with it — grouped by the mating square.
    const mateSq = (t: (typeof refuted)[number]): string | null => (t.reason.mate ? t.reason.plies.at(-1)?.uci.slice(2, 4) ?? null : null);
    const mateGroups = new Map<string, typeof refuted>();
    for (const t of refuted) { const k = mateSq(t); if (k) mateGroups.set(k, [...(mateGroups.get(k) ?? []), t]); }
    for (const t of refuted) {
      const k = mateSq(t);
      const g = k ? mateGroups.get(k) ?? [] : [];
      if (g.length > 1) {
        if (g[0] !== t) continue;
        const names = g.map((x) => `${side === 'b' ? '…' : ''}${x.san}`);
        facts.push({ from: 'tempting', kind: 'refuted', text: `${t.text} ${andList(names.slice(1))} ${names.length === 2 ? 'walks' : 'walk'} into the same mate on ${k}.`, computer: 'temptingOnBoard', squares: [...new Set(g.flatMap((x) => [x.uci.slice(0, 2), x.uci.slice(2, 4)]))], move: t.uci, also: g.slice(1).map((x) => x.uci) });
        continue;
      }
      facts.push({ from: 'tempting', kind: 'refuted', text: t.text, computer: 'temptingOnBoard', squares: [t.uci.slice(0, 2), t.uci.slice(2, 4)], move: t.uci });
    }
    // A check or capture that wins nothing ("Nxe7+ Rxe7 gives no relief"):
    // the same computer's forcing-move shape, never beside its material refutation.
    const noReason: ChangeReasonArgs[] = [];
    let standing = standingRefutations({ fen: i.fen, student: i.studentColor, rating: i.rating, reads: tempting, considered,
      onDrop: (_u, gate, f) => { if (gate === 'no-reason' && f) noReason.push(f); } });
    // A TRY THE PURE READ LEAVES WITHOUT A REASON is read again where the
    // surface has the time: the engine-backed computers on its futures
    // (zugzwang, a threat's real point, what a move prepares) — the reason a
    // standalone board cannot hold.
    if (i.engineFutures && noReason.length > 0) {
      const engine: BundleEngine = { analyzePosition: async (fen) => asAnalysis([...((await i.read(fen, 'future').catch(() => null)) ?? [])]) };
      const reasons = new Map<string, string>();
      const found = await Promise.all(noReason.map((f) => changeReasonWithEngine(f, engine).catch(() => null)));
      noReason.forEach((f, k) => { const r = found[k]; if (r && f.tryLine.moves[0]) reasons.set(f.tryLine.moves[0], r); });
      if (reasons.size > 0) standing = standingRefutations({ fen: i.fen, student: i.studentColor, rating: i.rating, reads: tempting, considered, engineReasons: reasons });
    }
    const empty = standing.filter((t) => !refuted.some((r) => r.uci === t.uci));
    // TRIES REFUTED FOR ONE COMPUTED REASON ARE ONE IDEA (F2, Alekhine's gun:
    // Qc3 and Qc2 each "…Rfc8 meets it. The better move puts your rook on the
    // open c-file"): grouped by the reason's key, never by its words, said once.
    const groups = new Map<string, typeof empty>();
    // …and tries that meet the SAME reply are one idea too (puzzle reads
    // 2026-11-20: …Kh4, …Kf6 and …Kh6 each "fail to Bd3", said four times).
    for (const t of empty) { const k = t.reasonKey ?? `reply:${t.reply}`; groups.set(k, [...(groups.get(k) ?? []), t]); }
    // A TRY THAT CHANGES THE RESULT'S BAND (F2, board 4: …Ke7 throws the
    // win) is the verdict's own "but", said beside it.
    const bandOf = (uci: string): number | null => { const r = tempting.find((x) => x.moves[0] === uci); return r ? stepOfCp(seatCp(r, i.studentColor)) : null; };
    const topBand = stepOfCp(seatCp(top, i.studentColor));
    const shifts = (uci: string): boolean => { const b = bandOf(uci); return b !== null && b !== topBand; };
    for (const g of groups.values()) {
      const [t, ...more] = g;
      if (more.length === 0) { facts.push({ from: 'tempting', kind: 'refuted', text: t.text, computer: 'temptingOnBoard', squares: t.squares, move: t.uci, ...(shifts(t.uci) ? { bandShift: true } : {}) }); continue; }
      const oneReason = g.every((x) => x.reasonKey !== null && x.reasonKey === t.reasonKey);
      const text = renderTryGroup(g.map((x) => x.data.name), [...new Set(g.map((x) => x.reply))], oneReason ? t.data : { ...t.data, why: null, whyPath: null });
      facts.push({ from: 'tempting', kind: 'refuted', text, computer: 'temptingOnBoard', squares: [...new Set(g.flatMap((x) => x.squares))], move: t.uci, also: more.map((x) => x.uci) });
    }
    // THE PICTURE'S CONCLUSIONS (WO-PICTURE-01 P3 → P5): the verdict read
    // after these tries ("better, but hard to finish") and the try that
    // survives them, off the refutations just made. The decider says them in
    // Danya's order with what they rest on: the verdict carries the tries it
    // names (`tries`, each refutation its "but"), the plan the line it plays
    // (`line`, what its "because" and its details are read against).
    const picture = { fen: i.fen, student: i.studentColor, rating: i.rating, reads: tempting, considered, refuted: { tempting: refuted, standing }, lines: i.before };
    const conc = pictureConclusionsOf(picture);
    // The verdict with its reason: a standing that already gave the band and
    // the board's reason leads, and the verdict goes on from it ("You're
    // slightly better — their king is in the middle. But it is hard to finish
    // them off …") — the band said once.
    const standing0 = facts.find((f) => f.kind === 'standing' && f.from === 'position' && !f.computer);
    const sameBand = !!conc && povCp !== null && stepOfCp(povCp) === conc.verdict.step;
    // Told against the game's story when the read has one: the conclusion the
    // game already said, unchanged, is not news.
    const memory = i.story ? threadsOfRead(i.story) : null;
    const told = <F extends Parameters<typeof tellPictureFacts>[0][number]>(fs: readonly F[]): F[] => (memory ? tellPictureFacts(fs, memory, i.studentColor) : [...fs]);
    for (const f of told(readBoardAll('pictureVerdict', picture))) {
      const merged = standing0 && sameBand && conc?.verdict.joined ? `${standing0.text} ${conc.verdict.joined}` : f.text;
      facts.push({ from: 'position', kind: f.kind, text: merged, computer: f.computer, squares: f.squares, claims: f.claims, tries: conc?.but.map((t) => t.uci) ?? [], ...(merged !== f.text && standing0?.reasonSquares ? { reasonSquares: standing0.reasonSquares } : {}), ...(f.conclusion ? { conclusion: f.conclusion } : {}),
        ...(conc ? { afterStanding: conc.verdict.afterStanding } : {}) });
    }
    for (const f of told(readBoardAll('picturePlan', picture))) {
      const line = tempting.find((r) => r.moves[0] === conc?.plan?.uci)?.moves ?? top.moves;
      facts.push({ from: 'position', kind: f.kind, text: f.text, computer: f.computer, squares: f.squares, claims: f.claims, line: [...line], ...(f.conclusion ? { conclusion: f.conclusion } : {}) });
    }
    // A failed try no refuter words (the line that sends the piece straight
    // back, his "…Qf6 is met by Rh5, and the queen has to go back") is said
    // in the verdict's own words, so every try the verdict names has its "but".
    for (const t of conc?.but ?? []) {
      if (facts.some((f) => f.move === t.uci || f.also?.includes(t.uci))) continue;
      facts.push({ from: 'tempting', kind: 'refuted', text: t.text, computer: 'pictureVerdict', squares: [t.uci.slice(0, 2), t.uci.slice(2, 4)], move: t.uci });
    }
    // THE DEFENDER'S CHECKS, RUN OUT (F3): every check they have after the
    // best move is a try, and where the checks end the promotion computer
    // reads the board the student faces.
    if (top.moves[0]) {
      const run = await defenderCheckRun(i.fen, top.moves[0], i.studentColor, (fen) => i.read(fen, 'their-eye').catch(() => null)).catch(() => null);
      if (run) facts.push({ from: 'bestMove', kind: 'technique', computer: 'defenderCheckRun', text: run.text, squares: run.promotion ? [run.promotion.from, run.promotion.to] : [], checksRead: run.checksRead });
    }
    // THE QUIET MOVE SAYS ITS THREAT (0Km5u …Qe3, puzzle reads 2026-11-20:
    // "the only move that holds" and never what it threatens): given a free
    // move after it, the engine's best for the mover — said when it wins two
    // pawns more than the board already holds, or mates.
    if (mine && top.moves[0]) {
      const quiet = ((): { san: string; after: string } | null => {
        try { const b = new Chess(i.fen); const m = b.move({ from: top.moves[0].slice(0, 2), to: top.moves[0].slice(2, 4), promotion: top.moves[0][4] }); return m.captured || b.inCheck() ? null : { san: m.san, after: b.fen() }; } catch { return null; }
      })();
      const free = quiet ? flipSideToMove(quiet.after) : null;
      const nm = free ? await i.read(free, 'quiet-threat').catch(() => null) : null;
      const t = nm?.[0];
      if (quiet && free && t?.moves[0]) {
        const sign = side === 'w' ? 1 : -1;
        const gain = t.mate != null ? (t.mate * sign > 0 ? 10000 : -10000) : t.evaluation * sign - (top.mate == null ? top.evaluation * sign : 10000);
        const threatSan = sanOf(free, t.moves[0]);
        if (threatSan && (gain >= THREAT_GAIN_CP || (t.mate != null && t.mate * sign > 0))) {
          const mates = t.mate != null && t.mate * sign > 0;
          const to = t.moves[0].slice(2, 4);
          // "THREATENS" ONLY A FORCING MOVE (CLAUDE.md rule 2): a check, a
          // capture, a mate, a promotion, an attack on a bigger or loose
          // piece. A quiet follow-up is what the move PREPARES (0Km5u …Rd8
          // "threatens …b4", 0CegO Ke3 "…Kd2": no such threat).
          const forcing = mates || isForcingThreat(free, t.moves[0]);
          const follow = `${side === 'b' ? '…' : ''}${threatSan}`;
          facts.push({ from: 'bestMove', kind: forcing ? 'aspect-threat' : 'aspect-prepares', computer: 'quietThreat', text: renderQuietThreat({ san: quiet.san, follow, mates, forcing }), squares: [top.moves[0].slice(2, 4), to], stakes: stakeValue({ points: mates ? 100 : gain / 100, plies: 2 }), claims: [`quiet-threat:${to}`] });
        }
      }
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
      facts.push({ from: 'tempting', kind: 'refuted-positional', computer: 'boardReason', text: `${lead}: ${why.note.replace(/^(The|Your|Their|That|It)\b/, (x) => x.toLowerCase())}`, squares: r.moves[0] ? [r.moves[0].slice(0, 2), r.moves[0].slice(2, 4)] : [] });
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
    const after = await i.read(fenB, 'best-after').catch(() => null);
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
      const replies = candidateMoves(fenB, i.rating, { played: null, scored: null }).flatMap((c) => {
        if (c.uci === after[0].moves[0]) return [];
        const b2 = new Chess(fenB);
        try { b2.move({ from: c.from, to: c.to, promotion: c.uci[4] }); } catch { return []; }
        return b2.isGameOver() ? [] : [{ uci: c.uci, fen: b2.fen() }];
      });
      const replyReads = await Promise.all(replies.map((r) => i.read(r.fen, 'their-eye').catch(() => null)));
      replies.forEach((r, k) => {
        const t = replyReads[k]?.[0];
        if (t) theirs.push({ evaluation: t.evaluation, mate: t.mate, moves: [r.uci, ...t.moves], earlier: t.earlier?.moves ? [r.uci, ...t.earlier.moves] : null });
      });
    }
    const replier: 'w' | 'b' = side === 'w' ? 'b' : 'w';
    const everyAfter = theirs.length >= 2
      ? { replies: theirs.map((r) => ({ uci: r.moves[0], cp: foldScore(seatCp(r, replier), r.mate === null ? null : replier === 'w' ? r.mate : -r.mate), mate: r.mate === null ? null : replier === 'w' ? r.mate : -r.mate, pv: r.moves })), rating: i.rating }
      : null;
    if (after) {
      for (const f of moveThoughtFacts({
        fenBefore: i.fen, san, moverIsStudent: mine, namesPlayedMove: ASKED_WRITER.namesPlayedMove, plainThreatsSeen: plainThreatsSeenFor(ASKED_WRITER, false), tense: i.tense, theory: false, story: !!i.story, moveReads: ASKED_WRITER.moveReads,
        prev: NO_PREV_CAPTURE, line: top.moves.slice(1), history: game.history, theirLast: game.theirLast, phrases: null, reads: { before: [...i.before], after: [...after], passBefore: [], passAfter: [], everyAfter, tries: triesRead }, costCp: 0,
      })) {
        // A puzzle still being solved keeps only who stands better: what the
        // best move does is the answer.
        if (i.withhold && !VERDICT_KINDS.has(f.kind)) continue;
        // The picture's conclusions are read above, off this read's own tries
        // (said once, in Danya's order): the fact set's copy is for the other
        // surfaces.
        if (f.source === 'picture') continue;
        facts.push({ from: 'bestMove', kind: f.kind, text: f.text, computer: f.computer, squares: f.squares, stakes: stakeValue(f.stakes), restates: f.restates === true, claims: f.claims });
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

const PIECE_POINTS: Readonly<Record<string, number>> = MATERIAL_VALUE;
const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const SIDE_NAME = { w: 'White', b: 'Black' } as const;

/** The read of a board with no legal move: checkmate (its pattern, the
 *  mating piece and what guards it, the material it was done with) or
 *  stalemate. Null on a board still in play. */
export function finishedRead(fen: string): BoardFact | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  if (!b.isCheckmate() && !b.isStalemate()) return null;
  const mated = b.turn();
  const winner: 'w' | 'b' = mated === 'w' ? 'b' : 'w';
  const points = { w: 0, b: 0 };
  for (const row of b.board()) for (const p of row) if (p) points[p.color] += PIECE_POINTS[p.type];
  const material = (side: 'w' | 'b'): string => {
    const other: 'w' | 'b' = side === 'w' ? 'b' : 'w';
    const gap = points[side] - points[other];
    if (gap <= -3) return `${SIDE_NAME[side]} did it far behind in material: ${points[side]} points against ${SIDE_NAME[other]}'s ${points[other]}.`;
    if (gap >= 3) return `${SIDE_NAME[side]} is ahead in material, ${points[side]} points against ${points[other]}.`;
    return 'The material is close to level.';
  };
  if (b.isStalemate()) {
    return { from: 'position', kind: 'standing', text: `Stalemate: ${SIDE_NAME[mated]} has no legal move and is not in check, so it is a draw. ${material(winner)}`, squares: [], board: nowBoard(fen) };
  }
  const king = b.board().flat().find((p) => p && p.type === 'k' && p.color === mated);
  const checkers = king ? b.attackers(king.square, winner) : [];
  const parts: string[] = [];
  const squares: string[] = [];
  for (const sq of checkers) {
    const piece = b.get(sq);
    if (!piece) continue;
    squares.push(sq);
    const guards = b.attackers(sq, winner).map((g) => { const gp = b.get(g); return gp ? `the ${PIECE_NAME[gp.type]} on ${g}` : null; }).filter((x): x is string => !!x);
    parts.push(`the ${PIECE_NAME[piece.type]} on ${sq} gives mate${guards.length > 0 ? `, guarded by ${guards.join(' and ')}` : ''}`);
  }
  const pattern = classifyMatePattern(fen);
  const name = pattern ? `, ${pattern.name.replace(/ Mate$/, ' mate')}` : '';
  const how = parts.length > 0 ? `: ${parts.join(', and ')}` : '';
  return { from: 'position', kind: 'standing', text: `Checkmate${name}${how}. ${material(winner)}`, squares, board: nowBoard(fen) };
}

const BAND_STEP: Record<ReturnType<typeof evalBand>, number> = { level: 0, slightly: 1, clearly: 2, decisive: 3 };
/** The standing's band as a step from the student's seat (the picture's own scale). */
function stepOfCp(cp: number): number { return Math.sign(cp) * BAND_STEP[evalBand(cp)]; }

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

/** A quiet move's threat is said from two pawns' gain. */
const THREAT_GAIN_CP = 200;

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
