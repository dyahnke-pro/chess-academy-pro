// At a fork in the theory, describe BOTH roads and let the student choose.
//
// David 2026-08-10: "Have the coach narrate with the forward PV the two
// different paths and have the coach ask which path they want to walk down.
// This happens only when still in book/theory… This mirrors Naroditsky's
// alternative lines. Would be very useful in review with coach — ex if your
// opponent played x sort of lines."
//
// The entry picker already offers roads at the START of a family. This is the
// same idea ten moves in: the line the student is walking reaches a real
// branch point, and instead of the lesson silently picking one, the coach says
// what each road leads to and asks.
//
// "ONLY WHILE IN BOOK" needs no flag. The roads come from the opening DB
// (`branchesAt`), and past theory the DB has nothing — so a position off the
// map simply has no fork, and the question never arises. That is the honest
// boundary: the coach offers a choice exactly as long as it has real lines to
// offer, and stops the moment it would be inventing them (G3).
//
// The PREVIEW of each road is computed, not described from memory: play that
// branch's own deepest DB line and read the plan off it the same way the
// look-ahead does. So "this one opens the d-file and trades the knights" is
// arithmetic over moves the database actually contains.
import { Chess } from 'chess.js';
import { branchesAt, type OpeningBranch } from './openingBranches';
import { planFromUci, keySquareLine } from './lookaheadPlan';

export interface ForkRoad {
  /** The move that commits to this road. */
  san: string;
  /** What it is called — the name a student would recognise. */
  name: string;
  eco: string;
  /** Where it leads, computed from the road's own line. '' when the DB line is
   *  too short to say anything honest about. */
  preview: string;
  /** How many named lines live down here — how much theory they are choosing. */
  lines: number;
}

export interface ForkOffer {
  /** The roads, most-theory-first. Always two or more; a single continuation
   *  is not a choice and never reaches here. */
  roads: ForkRoad[];
  /** The question, computed. Names both roads and what each leads to. */
  said: string;
}

/** SANs → UCI by replaying, so the plan reader can take them. */
function uciFor(fen: string, sans: readonly string[]): string[] {
  // A caller can hand this any string — an unreadable board is a reason to say
  // nothing, never a reason to throw inside a lesson.
  let board: Chess;
  try { board = new Chess(fen); } catch { return []; }
  const out: string[] = [];
  for (const san of sans) {
    let mv;
    try { mv = board.move(san); } catch { break; }
    if (!mv) break;
    out.push(`${mv.from}${mv.to}${mv.promotion ?? ''}`);
  }
  return out;
}

/** Everything true of where a road leads, best first.
 *
 *  The caller picks from these; it does not just take the top one, because a
 *  fork is a CHOICE and two roads whose previews read identically help nobody
 *  choose. The student's own half leads — they are picking which game to play,
 *  and what THEY get to do is what decides it. */
function previewsOf(
  fen: string,
  branch: OpeningBranch,
  historyLength: number,
  studentColor: 'white' | 'black',
): string[] {
  // The branch's deepest line INCLUDES the moves already played, so the part
  // that is new starts where the history ends.
  const ahead = branch.deepestPgn.slice(historyLength);
  if (ahead.length < 4) return [];
  const uci = uciFor(fen, ahead);
  if (uci.length < 4) return [];
  const plan = planFromUci(fen, uci, studentColor);
  if (!plan) return [];
  return [plan.mine.text, plan.theirs.text, keySquareLine(plan.keySquares)].filter(Boolean);
}

/**
 * The fork the student is standing on, or null when there is no real choice.
 *
 * Null covers three cases and they are all the same answer: off the map, only
 * one continuation, or nothing computable to say about the roads. Silence beats
 * asking a question whose options cannot be described.
 */
export function forkOfferAt(
  historySans: readonly string[],
  fen: string,
  studentColor: 'white' | 'black',
  /** How many roads to offer. Three is a choice; six is a menu. */
  max = 3,
): ForkOffer | null {
  const branches = branchesAt(historySans);
  if (branches.length < 2) return null;

  const shown = branches.slice(0, max);
  const options = shown.map((b) => previewsOf(fen, b, historySans.length, studentColor));

  // SAY WHAT IS DIFFERENT ABOUT EACH ROAD. Taking each road's best line
  // produced "Sicilian: you want to win a pawn. Closed Sicilian: you want to
  // win a pawn" — both true, and useless for choosing between them, which is
  // the one thing this beat exists to do. So each road takes its highest-ranked
  // line that no OTHER road is already using; a road with nothing distinctive
  // left falls back to how much theory it carries, which is at least a real
  // difference between them.
  const taken = new Set<string>();
  const roads: ForkRoad[] = shown.map((b, i) => {
    const distinct = options[i].find((line) => !taken.has(line));
    if (distinct) taken.add(distinct);
    const preview = distinct
      ?? (options[i].length > 0
        ? `the busiest of these — ${b.lines} named lines run through it`
        : '');
    return { san: b.san, name: b.name, eco: b.eco, lines: b.lines, preview };
  });

  // A road nobody can describe is still a road — it keeps its name and its
  // theory count. But if NOTHING can be described, the question is empty.
  if (!roads.some((r) => r.preview)) return null;

  const described = roads.filter((r) => r.preview);
  const sentences = described.map((r) => `${r.name}: ${r.preview}`);
  const others = roads.length - described.length;
  const tail = others > 0
    ? ` There ${others === 1 ? 'is' : 'are'} ${others} more road${others === 1 ? '' : 's'} out of here too.`
    : '';

  return {
    roads,
    // No move is named as an instruction — the road's NAME is what the student
    // picks, and the tiles carry the move. Same honesty contract as everywhere
    // else: describe the choice, never make it for them.
    said: `The theory splits here. ${sentences.join(' ')}${tail} Which one do you want to walk?`,
  };
}

/**
 * THE ROADS NOT TAKEN — the review form of the same fork.
 *
 * David 2026-08-10: "in review it will help show what the user could have
 * played. If you played x it could have won a pawn."
 *
 * Identical machinery, pointed at a game already finished: the position had a
 * real branch point, the student took one road, and the others are still
 * describable. The only differences are tense and audience — this is
 * RETROSPECTIVE (the locked review register), and it compares against a move
 * that is already on the board rather than asking for one.
 *
 * Returns null when the student's move WAS a road out of the fork and the
 * others carry nothing to say, and null off-book, and null when the position
 * never forked. A review that lists alternatives at every ply is noise; the
 * point is the moments where the game could have gone somewhere describable.
 */
export function roadsNotTakenAt(args: {
  historySans: readonly string[];
  fen: string;
  /** What the student actually played from this position. */
  playedSan: string;
  studentColor: 'white' | 'black';
  max?: number;
}): { roads: ForkRoad[]; said: string } | null {
  const offer = forkOfferAt(args.historySans, args.fen, args.studentColor, args.max ?? 3);
  if (!offer) return null;

  const bare = args.playedSan.replace(/[+#]$/, '');
  const others = offer.roads.filter((r) => r.san.replace(/[+#]$/, '') !== bare && r.preview);
  if (others.length === 0) return null;

  const took = offer.roads.find((r) => r.san.replace(/[+#]$/, '') === bare);
  // PAST TENSE, per the retroactive rule: the move happened, so what the other
  // roads WOULD have given is a conditional about a game that is over.
  const lead = took
    ? `You took the ${took.name} here.`
    : 'This was a branch point.';
  const alts = others.map((r) => `The ${r.name} was there too — ${asCouldHave(r.preview)}`);
  return {
    roads: others,
    said: `${lead} ${alts.join(' ')}`,
  };
}

/** "You want to win a pawn" → "it could have won you a pawn."
 *
 *  A deterministic re-voicing, not a re-computation: the fact is the same, the
 *  tense and the person are what change. Anything the rewriter does not
 *  recognise is passed through inside a conditional frame rather than guessed
 *  at, so an unfamiliar clause reads as clumsy at worst, never as false. */
function asCouldHave(preview: string): string {
  const p = preview.trim().replace(/\.$/, '');
  const mine = /^You want to (.+)$/.exec(p);
  if (mine) return `it could have let you ${mine[1]}.`;
  const theirs = /^They want to (.+)$/.exec(p);
  if (theirs) return `they would have been trying to ${theirs[1]}.`;
  const drift = /^You bring your pieces toward (.+?) over the next few moves$/.exec(p);
  if (drift) return `your pieces would have headed for ${drift[1]}.`;
  const drift2 = /^They bring their pieces toward (.+?) over the next few moves$/.exec(p);
  if (drift2) return `their pieces would have headed for ${drift2[1]}.`;
  return `that road led toward: ${p}.`;
}
