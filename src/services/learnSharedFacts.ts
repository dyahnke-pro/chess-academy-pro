// ONE COACH IN LEARN (David 2026-11-17: "Remember we have a unified coach. So
// all computers feed the coach to all surfaces. It's only the narrations that
// differ."). The lesson, Review and chat read one fact set for a move
// (`moveThoughtFacts`); Learn ran its own lanes and never read it, so every
// computer that lives only in the shared set was silent in Learn. This turns
// the shared facts for a move into Learn facts on the `thought` lane:
//   - a computer Learn's own lanes already said this turn is not said twice;
//   - a fact that names a move the student has yet to find is marked so
//     (LEARN NAMES NO MOVE UNASKED): every move its words or its lines name is
//     checked on the board the student moves on next, and the door holds it.
// The door decides what speaks, exactly as for every other Learn fact.
// Learn reaches the shared set through this one door (`learnThoughtTurn`):
// the page hands over the two moves and their reads, never the set itself.
import type { ThoughtFact } from './thoughtComposer';
import { moveThoughtFacts, type MoveThoughtInput } from './moveThoughtFacts';
import type { IntentReads } from './moveIntent';
import type { LearnFactParts } from './learnTurnDoor';
import { namedSan, namesMoves, namesPlayableStudentMove, studentMovesInLine, type NamedMove } from './studentMoveNaming';
import { writerFor, namesPlayedMoveFor, plainThreatsSeenFor } from './writerRegister';

/** Learn's writer settings (`writerRegister`). */
const LEARN_WRITER = writerFor('learn');

// A piece move, a pawn capture or castling names a move wherever it stands. A
// bare square ("the d5 square", "your pawn on e4") names one only after a word
// that plays it ("…d5", "play d5", "then d5") — otherwise every square would read
// as a pawn push and hold true facts that name no move.
const SAN_TOKEN = /(?:^|[^A-Za-z0-9])((?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|O-O-O|O-O)(?:=[QRBN])?)(?=[+#!?,.;:)\s]|$)/g;
const PAWN_PUSH = /(?:…|\b(?:play|plays|playing|push|pushes|pushing|then|with|answer|answers|after)\s+)([a-h][1-8](?:=[QRBN])?)(?=[+#!?,.;:)\s]|$)/g;

/** The student's moves a shared fact names, legal on the board they move on
 *  next: in its words and in every line it carries. */
export function sharedFactNamesStudentMove(f: Pick<ThoughtFact, 'text' | 'lines'>, fenNow: string, student: 'w' | 'b'): boolean {
  const parts = fenNow.split(' ');
  parts[1] = student;
  parts[3] = '-';
  const studentBoard = parts.join(' ');
  const named: NamedMove[] = [];
  for (const re of [SAN_TOKEN, PAWN_PUSH]) {
    for (const m of f.text.matchAll(re)) {
      const nm = namedSan(studentBoard, m[1]);
      if (nm) named.push(nm);
    }
  }
  if (namesPlayableStudentMove(namesMoves(student, fenNow, ...named))) return true;
  return (f.lines ?? []).some((l) => namesPlayableStudentMove(studentMovesInLine(l.fen, l.sans, student, fenNow, 1)));
}

/** The shared facts for a move, as Learn facts on the `thought` lane — the
 *  ones whose computer Learn's own lanes did not already say this turn. */
export function sharedFactsForLearn(
  facts: readonly ThoughtFact[],
  opts: { fenNow: string; student: 'w' | 'b'; saidComputers: ReadonlySet<string> },
): Array<LearnFactParts & { gradeFen: string }> {
  const out: Array<LearnFactParts & { gradeFen: string }> = [];
  const seen = new Set<string>();
  for (const f of facts) {
    if (!f.text.trim() || opts.saidComputers.has(f.computer)) continue;
    const key = `${f.computer}|${f.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      lane: 'thought',
      factKind: f.kind,
      computer: f.computer,
      text: f.text,
      fen: f.fen,
      gradeFen: f.fen,
      proof: f.proof,
      namesStudentMove: f.namesStudentMove || sharedFactNamesStudentMove(f, opts.fenNow, opts.student),
      squares: f.squares,
      claims: f.claims,
      stakes: f.stakes,
      ...(f.lines ? { lines: f.lines } : {}),
      ...(f.heldForm ? { heldForm: f.heldForm } : {}),
    });
  }
  return out;
}

/** One move of a Learn turn, as the shared set reads it. */
export interface LearnTurnMove {
  fenBefore: string;
  san: string;
  history: readonly string[];
  prev: MoveThoughtInput['prev'];
  theirLast: MoveThoughtInput['theirLast'];
  reads: IntentReads;
  costCp: number | null;
}

/** THE LEARN TURN'S SHARED FACTS — the student's move and their reply, each
 *  read by the one fact set (both seats), as Learn facts on the `thought`
 *  lane (`sharedFactsForLearn`). */
export function learnThoughtTurn(args: {
  studentMove: LearnTurnMove;
  reply: LearnTurnMove | null;
  fenNow: string;
  student: 'w' | 'b';
  saidComputers: ReadonlySet<string>;
}): Array<LearnFactParts & { gradeFen: string }> {
  const read = (m: LearnTurnMove, moverIsStudent: boolean): ThoughtFact[] => moveThoughtFacts({
    fenBefore: m.fenBefore, san: m.san, moverIsStudent, namesPlayedMove: namesPlayedMoveFor(LEARN_WRITER, moverIsStudent), plainThreatsSeen: plainThreatsSeenFor(LEARN_WRITER, false), tense: LEARN_WRITER.tense, theory: LEARN_WRITER.theory, story: LEARN_WRITER.story,
    prev: m.prev, line: null, history: [...m.history], theirLast: m.theirLast, phrases: null, reads: m.reads, costCp: m.costCp,
  });
  const facts = [...read(args.studentMove, true), ...(args.reply ? read(args.reply, false) : [])];
  return sharedFactsForLearn(facts, { fenNow: args.fenNow, student: args.student, saidComputers: args.saidComputers });
}
