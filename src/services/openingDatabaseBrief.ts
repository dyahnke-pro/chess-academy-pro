// openingDatabaseBrief
// --------------------
// WHAT AN OPENING IS, FROM THE DATABASES (David 2026-10-27: "Tell me more about
// the a3 sicillian" was answered "There's no answer for that one yet" — the
// chat only knew openings its identity file had something to say about). Every
// named line in the opening database has moves, and the masters' games past it
// say who scores and what gets played next. All of it computed; the phrasing
// pass only voices it (G0). Nothing here is recalled.

import { Chess } from 'chess.js';
import { findShortestCanonicalPgn, inferStudentSideFromName } from './openingDetectionService';
import { loadOpeningIdentity, openingIdentityLine, planFor } from './openingIdentity';
import { preparesBreakBeat } from './mastersPlanRead';
import { fetchLichessExplorer } from './lichessExplorerService';
import { repliesOverBar, resultsLine } from './explorerTeachLine';
import { andList } from '../utils/andList';
import type { LichessExplorerResult } from '../types';

export interface OpeningDatabaseBrief {
  name: string;
  /** The line's moves, from the opening database. */
  moves: string[];
  text: string;
  /** The masters' games were read (false: the network was unreachable, and
   *  the brief says only what the bundled data knows). */
  mastersRead: boolean;
}

/** The brief, in the order a student needs it: what the line is, what its
 *  defining move is for, what the opening aims at, who scores, and what gets
 *  played next. Null when the name is not in the opening database. */
export async function openingDatabaseBrief(
  name: string,
  /** The games database at a position — the one network boundary, injectable. */
  masters: (fen: string) => Promise<LichessExplorerResult> = (fen) => fetchLichessExplorer(fen, 'masters'),
): Promise<OpeningDatabaseBrief | null> {
  const pgn = findShortestCanonicalPgn(name);
  if (!pgn) return null;
  const moves = pgn.split(/\s+/).filter(Boolean);
  const seat = inferStudentSideFromName(name);
  const student: 'w' | 'b' = seat === 'white' ? 'w' : 'b';

  const board = new Chess();
  let fenBeforeLast = board.fen();
  try {
    for (const san of moves) {
      fenBeforeLast = board.fen();
      board.move(san);
    }
  } catch {
    return null;
  }
  const lastMover: 'w' | 'b' = moves.length % 2 === 1 ? 'w' : 'b';

  const parts: string[] = [`The ${name} is ${moves.join(' ')}.`];
  try {
    await loadOpeningIdentity();
    const prepares = preparesBreakBeat(fenBeforeLast, moves[moves.length - 1], planFor(name), lastMover === student);
    if (prepares) parts.push(prepares);
    const identity = openingIdentityLine(name, student, 'seat', null)?.text;
    if (identity) parts.push(identity);
  } catch { /* the identity file is unreachable — the database still speaks */ }

  let mastersRead = false;
  try {
    const r = await masters(board.fen());
    mastersRead = true;
    const results = resultsLine({ white: r.white, draws: r.draws, black: r.black }, 'masters', seat);
    if (results) parts.push(results);
    const total = r.white + r.draws + r.black;
    const replies = repliesOverBar(r, 'masters');
    if (replies.length > 0 && total > 0) {
      const mover = board.turn();
      const said = replies.map((m) => `${mover === 'b' ? '…' : ''}${m.san} in ${Math.round(((m.white + m.draws + m.black) / total) * 100)}%`);
      parts.push(`The masters answer ${andList(said)} of their games.`);
    }
  } catch { /* offline — the brief is what the bundled data knows */ }

  return { name, moves, text: parts.join(' '), mastersRead };
}
