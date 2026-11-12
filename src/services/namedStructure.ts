// THE PAWN STRUCTURE BY NAME, WITH ITS PLAN (gap D1, David 2026-11-12: "I
// want that done"). Theory names the structure an opening reaches and teaches
// its plans by it — "this is a Carlsbad structure: White's plan is the
// minority attack". The isolani and the hanging pawns are named by
// `nextPlans`; this names the other classical structures, each read off the
// exact pawns on the board (never the opening's name), with the plans every
// strong player knows for it (the mainstream understanding, said in our
// words: Capablanca / Nimzowitsch / Kmoch on chains, bases and breaks).
//
// Said only when the move CREATES the structure (it was not on the board
// before), from the student's seat. Pure (chess.js).
import { Chess, type Color } from 'chess.js';

export type StructureName =
  | 'carlsbad' | 'french-chain' | 'kid-chain' | 'maroczy' | 'stonewall' | 'hedgehog' | 'benoni' | 'scheveningen';

export interface NamedStructure {
  name: StructureName;
  /** The structure's name as said ("the Carlsbad structure"). */
  title: string;
  /** Whose pawns make the shape it is named from: 'w' / 'b'. */
  owner: Color;
  /** The pawns the reading rests on, lit while it is said. */
  squares: string[];
  /** Each side's plan, from that side ("the minority attack, b4 and b5"). */
  plan: Record<Color, string>;
}

type Pawns = Record<Color, Set<string>>;

function pawnsOf(fen: string): Pawns | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  const out: Pawns = { w: new Set(), b: new Set() };
  for (const row of b.board()) for (const c of row) if (c && c.type === 'p') out[c.color].add(c.square);
  return out;
}

const fileHas = (set: Set<string>, file: string): boolean => [...set].some((sq) => sq[0] === file);
const has = (set: Set<string>, ...sqs: string[]): boolean => sqs.every((sq) => set.has(sq));

/** Every rule: the shape, read for one side as `owner` (the side whose pawns
 *  name it), and the two plans. Read for both colours where the shape can be
 *  either side's (the Stonewall). */
interface Rule {
  name: StructureName;
  title: string;
  match: (p: Pawns) => { owner: Color; squares: string[] } | null;
  plan: Record<Color, string>;
}

const RULES: readonly Rule[] = [
  {
    // White: d4, no c-pawn; Black: c6 + d5, no e-pawn (the Queen's Gambit
    // Exchange). Plans: White's minority attack; Black's play in the centre
    // and on the kingside (…Ne4, …f5, the e-file).
    name: 'carlsbad', title: 'the Carlsbad structure',
    match: (p) => (p.w.has('d4') && !fileHas(p.w, 'c') && p.b.has('d5') && (p.b.has('c6') || p.b.has('c7')) && !fileHas(p.b, 'e') && fileHas(p.w, 'e') ? { owner: 'w', squares: ['d4', 'd5'] } : null),
    plan: { w: 'push b4 and b5, the minority attack, to leave a weak pawn on c6', b: 'play in the centre and on the kingside, with a knight to e4 and sometimes …f5' },
  },
  {
    // The French chain: White d4 + e5, Black d5 + e6.
    name: 'french-chain', title: 'the French pawn chain',
    match: (p) => (has(p.w, 'd4', 'e5') && has(p.b, 'd5', 'e6') ? { owner: 'w', squares: ['d4', 'e5', 'd5', 'e6'] } : null),
    plan: { w: 'use the space the chain gives on the kingside and attack there with f4 and f5', b: 'hit the chain at its base with …c5, then at its head with …f6' },
  },
  {
    // The King's Indian chain: White d5 + e4, Black d6 + e5.
    name: 'kid-chain', title: "the King's Indian pawn chain",
    match: (p) => (has(p.w, 'd5', 'e4') && has(p.b, 'd6', 'e5') ? { owner: 'b', squares: ['d5', 'e4', 'd6', 'e5'] } : null),
    plan: { w: 'open the queenside with c5 against the base on d6', b: 'attack on the kingside with …f5 and a pawn storm' },
  },
  {
    // The Maróczy bind: White c4 + e4, no d-pawn; Black has no c-pawn.
    name: 'maroczy', title: 'the Maróczy bind',
    match: (p) => (has(p.w, 'c4', 'e4') && !fileHas(p.w, 'd') && !fileHas(p.b, 'c') && fileHas(p.b, 'd') ? { owner: 'w', squares: ['c4', 'e4'] } : null),
    plan: { w: 'keep …b5 and …d5 from ever working and squeeze', b: 'wait for the right moment for …b5 or …d5, which frees the game' },
  },
  {
    // The Stonewall: c3 + d4 + e3 + f4 (or c6 + d5 + e6 + f5).
    name: 'stonewall', title: 'the Stonewall',
    match: (p) => (has(p.w, 'c3', 'd4', 'e3', 'f4') ? { owner: 'w', squares: ['c3', 'd4', 'e3', 'f4'] }
      : has(p.b, 'c6', 'd5', 'e6', 'f5') ? { owner: 'b', squares: ['c6', 'd5', 'e6', 'f5'] } : null),
    plan: { w: 'put a knight on e5 and attack on the kingside, minding the hole on e4', b: 'put a knight on e4 and attack on the kingside, minding the hole on e5' },
  },
  {
    // The Hedgehog: Black a6 + b6 + d6 + e6, no c-pawn; White c4 + e4.
    name: 'hedgehog', title: 'the Hedgehog',
    match: (p) => (has(p.b, 'a6', 'b6', 'd6', 'e6') && !fileHas(p.b, 'c') && has(p.w, 'c4', 'e4') ? { owner: 'b', squares: ['a6', 'b6', 'd6', 'e6'] } : null),
    plan: { w: 'keep the bind and stop …b5 and …d5', b: 'wait behind the pawns, then strike with …b5 or …d5' },
  },
  {
    // The Modern Benoni: White d5, Black c5 + d6, no Black e-pawn.
    name: 'benoni', title: 'the Benoni structure',
    match: (p) => (p.w.has('d5') && has(p.b, 'c5', 'd6') && !fileHas(p.b, 'e') ? { owner: 'b', squares: ['d5', 'c5', 'd6'] } : null),
    plan: { w: 'break with e5 in the centre and aim a knight at d6 from c4', b: 'push the queenside majority with …b5 and use the long diagonal' },
  },
  {
    // The Scheveningen centre: Black d6 + e6, no c-pawn; White e4, no d-pawn.
    name: 'scheveningen', title: 'the Scheveningen centre',
    match: (p) => (has(p.b, 'd6', 'e6') && !fileHas(p.b, 'c') && p.w.has('e4') && !fileHas(p.w, 'd') ? { owner: 'b', squares: ['d6', 'e6', 'e4'] } : null),
    plan: { w: 'attack on the kingside with f4 and g4, and break with e5', b: 'use the half-open c-file and break with …d5 or …b5' },
  },
];

function structuresOn(fen: string): NamedStructure[] {
  const p = pawnsOf(fen);
  if (!p) return [];
  const out: NamedStructure[] = [];
  for (const r of RULES) {
    const m = r.match(p);
    if (m) out.push({ name: r.name, title: r.title, owner: m.owner, squares: m.squares, plan: r.plan });
  }
  return out;
}

/** The named structure the move creates, or null when none appears with it. */
export function namedStructureFormed(fenBefore: string, san: string): NamedStructure | null {
  let fenAfter: string;
  try { const c = new Chess(fenBefore); c.move(san); fenAfter = c.fen(); } catch { return null; }
  const had = new Set(structuresOn(fenBefore).map((s) => s.name));
  return structuresOn(fenAfter).find((s) => !had.has(s.name)) ?? null;
}

/** The sentence, from the student's seat: "This is the Carlsbad structure:
 *  your plan is …; theirs is …". */
export function namedStructureLine(s: NamedStructure, student: Color): string {
  const them: Color = student === 'w' ? 'b' : 'w';
  return `That makes it ${s.title}. Your plan is to ${s.plan[student]}. Theirs is to ${s.plan[them]}`;
}
