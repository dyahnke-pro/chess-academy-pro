/**
 * THE STUDENT'S PLAN ON THIS BOARD, AS FACTS (one coach, 2026-10-09: "We need
 * the chat to think and calculate like the coach").
 *
 * These computers used to live only inside chat's "what's my plan?" answer, so
 * the narration — the coach's own read of the board — never had them, and a
 * quiet position read as nothing at all. Extracted here, ONE producer, read by
 * both: the plan answer renders from it, and `computePositionFacts` adds it to
 * the one read. Board-true (chess.js + the position-reading computers); the
 * engine is not consulted.
 */
import { openSentence } from '../utils/openSentence';
import { Chess } from 'chess.js';
import { deriveNextPlanFacts, worstPieceNote, worstPieceRoute } from './nextPlans';
import { methodRead, methodPlanSentence, whyThisPlan } from './planChoice';
import { stripThink } from '../utils/thinkPause';
import { structurePlanFact } from './nextPlans';
import { findPawnBreaks, findOpenFiles } from './positionReadingService';
import { holeTargets } from './positionReadingService';
import { isUndevelopedInOpening } from '../utils/undeveloped';
import { flipSideToMove } from './threatOut';
import { andList, orList } from '../utils/andList';
import { pieceRef } from './pieceRef';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const cap = (s: string): string => openSentence(s);

type LeverKind = 'develop' | 'break' | 'file' | 'outpost' | 'worst';

interface PlanLever {
  kind: LeverKind;
  /** Phrased to follow "the plan is to …". */
  phrase: string;
  /** The squares the lever is about, coupled at emission (never read back from prose). */
  squares: string[];
}

/** A plan sentence and the squares it is about — the board lights every one
 *  while it is said (David 2026-11-05: "If a single square is being named it
 *  must also be highlighted"). */
interface PlanSentence { text: string; squares: string[] }

interface BoardPlanFacts {
  /** The structural trump (a passed pawn, an isolani), or null. A sentence. */
  trump: string | null;
  /** The squares the trump is about. */
  trumpSquares: string[];
  /** Every plan the structure earns, each with its method. */
  plans: PlanSentence[];
  /** The concrete levers, most to least decisive. */
  levers: PlanLever[];
  /** Why the first plan comes first (planChoice), or null. A clause. */
  why: string | null;
  /** More than one plan of different kinds — the why is an order, not a lone reason. */
  ordered: boolean;
  /** How the plan is found — the three questions, their answers, and the plan
   *  those answers make, with why that order (planChoice). Null when the answers
   *  make no plan or a bigger plan (a passer, a piece to convert) outranks them. */
  method: string | null;
  /** The squares the method's plan already names — a lever on only these
   *  squares says the same thing again. */
  methodSquares: string[];
}

const STEMS = ['Alongside that, aim to ', 'On top of that, work to ', 'And the third piece of it: '];

/**
 * `side` is whose plan; `voice` is who hears it — 'you' when it is the
 * student's own plan, 'they' when the student asked about the opponent's
 * ("what is black trying to do?"). The 'they' voice carries the levers only:
 * the structure and plan sentences are written to the student.
 */
export function boardPlanFacts(fen: string, side: 'white' | 'black', voice: 'you' | 'they' = 'you'): BoardPlanFacts | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const myC: 'w' | 'b' = side === 'white' ? 'w' : 'b';
  const your = voice === 'you' ? 'your' : 'their';
  const trumpFact = voice === 'you' ? structurePlanFact(fen, myC) : null;
  const trump = trumpFact?.text ?? null;
  // Stacked plans vary the stem after the first (question walk 2026-09-27).
  const facts = voice === 'you' ? deriveNextPlanFacts(fen, myC, { namesStudentMoves: true }) : [];
  const plans: PlanSentence[] = facts.map((f, i) => {
    const c = cap(f.text);
    const t = (i === 0 ? c : c.replace(/^The plan from here is to /, STEMS[(i - 1) % STEMS.length])).trim();
    return { text: /[.!?]$/.test(t) ? t : `${t}.`, squares: [...f.squares] };
  });
  const levers: PlanLever[] = [];
  // A pawn break to open the position (findPawnBreaks reads the side to move).
  const asSide = chess.turn() === myC ? fen : voice === 'they' ? flipSideToMove(fen) : null;
  if (asSide) {
    const breaks = findPawnBreaks(asSide);
    if (breaks.length) levers.push({ kind: 'break', phrase: `break with ${orList(breaks)} to open the position`, squares: [...breaks] });
  }
  // A rook belongs on an open / half-open file.
  const files = findOpenFiles(fen);
  const rookFiles = [...new Set([...files.open, ...(myC === 'w' ? files.whiteSemiOpen : files.blackSemiOpen)])];
  if (rookFiles.length) levers.push({ kind: 'file', phrase: `put a rook on the ${orList(rookFiles)} file`, squares: [] });
  // An outpost — a hole in THEIR camp a minor of yours can get to and hold
  // (the one bar, `holeTargets`), named for the piece that gets there: "plant
  // a knight" only where a knight arrives.
  const theirC = myC === 'w' ? 'b' : 'w';
  const knightHoles = holeTargets(fen, theirC, myC, 'n');
  const bishopHoles = knightHoles.length ? [] : holeTargets(fen, theirC, myC, 'b');
  // One or two holes are named; three or more are "the holes in their camp", lit on the
  // board (a list of squares read out is the robot, David 2026-11-05).
  const holeWords = (holes: readonly string[]): string => (holes.length <= 2 ? `on ${orList(holes)}` : 'in one of the holes in their camp');
  if (knightHoles.length) levers.push({ kind: 'outpost', phrase: `plant a knight ${holeWords(knightHoles)}`, squares: [...knightHoles] });
  else if (bishopHoles.length) levers.push({ kind: 'outpost', phrase: `post a bishop ${holeWords(bishopHoles)}`, squares: [...bishopHoles] });
  // In the opening the plan IS development: name the minors still home (walk 5,
  // 2026-09-23). Leads the levers.
  const home: Array<{ type: string; square: string }> = [];
  for (const row of chess.board()) for (const p of row) {
    if (p && p.color === myC && (p.type === 'n' || p.type === 'b') && isUndevelopedInOpening(fen, myC, p.type, p.square)) home.push({ type: p.type, square: p.square });
  }
  if (home.length) {
    levers.unshift({
      kind: 'develop',
      phrase: `bring ${homeWords(chess, home, myC, your)} into the game, since development comes first`,
      squares: home.map((h) => h.square),
    });
  }
  // Improve the worst-placed piece — a BAR, not a cap (G4.5): only once it is
  // genuinely misplaced, never an undeveloped piece on its home rank.
  const worst = worstPieceNote(fen, myC);
  const homeRank = myC === 'w' ? '1' : '8';
  const pastOpening = (Number.parseInt(fen.split(' ')[5] ?? '1', 10) || 1) >= 10;
  const viewer = voice === 'you' ? myC : theirC;
  // The rook with no file is the open-file lever's (said above), never a
  // second "better square" for the same rook.
  // No road, no plan (WO-DEPTH-01, 2026-11-08): "find a better square for
  // your knight" names no square and no job — the read says what is wrong
  // with the piece ("stuck on the rim"); the plan says where it goes, or
  // nothing (the Colle board: the h5 knight has no safe road).
  const road = worst && worst.kind !== 'no-file-rook' && (worst.misplaced || pastOpening || worst.square[1] !== homeRank)
    ? worstPieceRoute(fen, worst.square)
    : null;
  if (worst && road) {
    const ref = pieceRef(fen, worst.square, viewer);
    levers.push({ kind: 'worst', phrase: `bring ${ref ? ref.words : `${your} ${PIECE[worst.piece]} on ${worst.square}`} to ${road.target}, ${road.aim}`, squares: [worst.square, ...road.route] });
  }
  // Chat was ASKED: the method is said as a question and its answers at once.
  // The answers ARE the plan (planChoice.methodPlan) — unless a passed pawn or
  // an extra piece to convert outranks all three questions.
  const methodOwns = facts[0] && facts[0].kind !== 'passer' && facts[0].kind !== 'convert';
  const read = voice === 'you' && methodOwns ? methodRead(fen, myC) : null;
  const mp = read ? methodPlanSentence(read, fen) : null;
  return {
    trump, trumpSquares: trumpFact?.squares ?? [], plans, levers,
    why: whyThisPlan(facts),
    ordered: facts.some((p) => p.kind !== facts[0]?.kind),
    methodSquares: mp ? mp.squares : [],
    method: mp ? stripThink(mp.text) : null,
  };
}

/** The minors still at home, named as a person names them: "both knights",
 *  "your dark-squared bishop", "your other knight" — the squares are lit on the
 *  board, never read out as a list (David 2026-11-05). */
function homeWords(chess: Chess, home: ReadonlyArray<{ type: string; square: string }>, myC: 'w' | 'b', your: string): string {
  const total = (t: string): number => chess.board().flat().filter((p) => p && p.color === myC && p.type === t).length;
  const parts: string[] = [];
  for (const t of ['n', 'b'] as const) {
    const at = home.filter((h) => h.type === t);
    if (at.length === 0) continue;
    if (at.length >= 2) { parts.push(`${at.length === 2 ? 'both' : 'all your'} ${PIECE[t]}s`); continue; }
    if (t === 'b' && total('b') === 2) {
      const sq = at[0].square;
      const light = (sq.charCodeAt(0) - 97 + Number(sq[1])) % 2 === 0;
      parts.push(`${your} ${light ? 'light' : 'dark'}-squared bishop`);
    } else parts.push(`${your} ${total(t) > 1 ? 'other ' : ''}${PIECE[t]}`);
  }
  return andList(parts);
}

/** The levers as sentences, for the narration's read: one step a sentence,
 *  so no sentence lists a run of squares (David 2026-11-05) and none chains
 *  steps with semicolons (2026-11-08). Null when none. */
export function leverSentence(levers: readonly PlanLever[]): string | null {
  if (levers.length === 0) return null;
  // ONE STEP A SENTENCE, SAID LIKE A PERSON (David 2026-11-08: "I want all
  // narrations to follow this pattern" — "The plan is to break with a4 to
  // open the position; put a rook on the d or e files; improve your rook on
  // a1" was heard 50 times in the four baseline games). The opener rotates
  // on the plan itself, so one board always reads the same.
  const key = stemKeyOf(levers.map((l) => l.phrase).join('|'));
  const lead = rotateStem(['The plan: ', "Here's the plan: ", 'The plan from here: '], key);
  return levers.map((l, i) => {
    if (i === 0) return `${lead}${l.phrase}.`;
    const join = i === levers.length - 1 && i > 1 ? 'And ' : 'Then ';
    return `${join}${l.phrase}.`;
  }).join(' ');
}
