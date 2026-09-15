// structureProse — the STRUCTURE atoms, spoken as English from the student's
// seat (David 2026-09-15, reading a real prod review transcript: "I want you
// reading and evaluating the actual narration outputs").
//
// `describeStructure` emits a machine inventory — "isolated pawns white a3",
// "White knight outpost d4" — and the review spoke it verbatim, so the coach
// said "Isolated pawn white a3." and "Black knight outpost d4." to a student
// playing Black. Two defects in one line: it is not English, and it names a
// COLOUR where the app's one perspective law (CLAUDE.md, 2026-08-28) says the
// student is "you/your" and the opponent is "they/their".
//
// This renders the same computed atoms as prose, seat-correct, with same-kind
// atoms of the same side grouped ("your a7 and b7 pawns are passed"). It adds
// NO claim the atom did not carry — pure re-phrasing of a computed fact, so it
// stays inside G0.
export type StudentSeat = 'w' | 'b' | null;

interface Atom {
  kind: 'open-file' | 'passed' | 'isolated' | 'doubled' | 'outpost';
  side: 'w' | 'b' | null;
  value: string;
  piece?: string;
}

/** Parse one machine atom. Returns null when the shape is unknown — the caller
 *  then keeps the raw atom rather than dropping a computed fact. */
export function parseStructureAtom(atom: string): Atom | null {
  const t = atom.trim();
  let m = /^open file ([a-h])$/i.exec(t);
  if (m) return { kind: 'open-file', side: null, value: m[1].toLowerCase() };
  m = /^(passed|isolated) pawn (white|black) ([a-h][1-8])$/i.exec(t);
  if (m) return { kind: m[1].toLowerCase() as 'passed' | 'isolated', side: m[2].toLowerCase() === 'white' ? 'w' : 'b', value: m[3].toLowerCase() };
  m = /^doubled pawn (white|black) ([a-h])-file$/i.exec(t);
  if (m) return { kind: 'doubled', side: m[1].toLowerCase() === 'white' ? 'w' : 'b', value: m[2].toLowerCase() };
  m = /^(White|Black) (knight|bishop) outpost ([a-h][1-8])$/i.exec(t);
  if (m) return { kind: 'outpost', side: m[1].toLowerCase() === 'white' ? 'w' : 'b', value: m[3].toLowerCase(), piece: m[2].toLowerCase() };
  return null;
}

function possessive(side: 'w' | 'b' | null, seat: StudentSeat): string {
  if (side === null) return '';
  if (seat === null) return side === 'w' ? "White's" : "Black's";
  return side === seat ? 'your' : 'their';
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Render the atoms of one [structure] facet as one sentence, seat-correct.
 *  Unknown atom shapes are passed through verbatim so no computed fact is lost. */
export function renderStructureAtoms(atoms: string[], seat: StudentSeat): string {
  const parsed = atoms.map((a) => ({ raw: a, atom: parseStructureAtom(a) }));
  const clauses: string[] = [];

  const files = parsed.filter((p) => p.atom?.kind === 'open-file').map((p) => p.atom!.value);
  if (files.length) clauses.push(`the ${list(files.map((f) => `${f}-file`))} ${files.length > 1 ? 'are' : 'is'} open`);

  for (const kind of ['passed', 'isolated'] as const) {
    for (const side of ['w', 'b'] as const) {
      const sq = parsed.filter((p) => p.atom?.kind === kind && p.atom.side === side).map((p) => p.atom!.value);
      if (!sq.length) continue;
      const poss = possessive(side, seat);
      clauses.push(sq.length > 1
        ? `${poss} pawns on ${list(sq)} are ${kind}`
        : `${poss} ${sq[0]}-pawn is ${kind}`);
    }
  }

  for (const side of ['w', 'b'] as const) {
    const f = parsed.filter((p) => p.atom?.kind === 'doubled' && p.atom.side === side).map((p) => p.atom!.value);
    if (!f.length) continue;
    clauses.push(`${possessive(side, seat)} pawns are doubled on the ${list(f.map((x) => `${x}-file`))}`);
  }

  for (const p of parsed) {
    if (p.atom?.kind !== 'outpost') continue;
    clauses.push(`${possessive(p.atom.side, seat)} ${p.atom.piece} sits on an outpost at ${p.atom.value}`);
  }

  for (const p of parsed) if (!p.atom) clauses.push(p.raw);

  if (!clauses.length) return '';
  const s = list(clauses);
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
}
