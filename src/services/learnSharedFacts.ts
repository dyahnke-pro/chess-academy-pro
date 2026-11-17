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
// A LEAF over chess.js and the fact shapes.
import type { ThoughtFact } from './thoughtComposer';
import type { LearnFactParts } from './learnTurnDoor';
import { namedSan, namesMoves, namesPlayableStudentMove, studentMovesInLine, type NamedMove } from './studentMoveNaming';

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
