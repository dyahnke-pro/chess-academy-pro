// openingRoads — WHY THIS ROAD AND NOT THE OTHER ONE, BY WHAT EACH ALLOWS
// (opening model beat 4, lead 2026-10-20: "a different kind of position" is a
// description with no reason — build what each road ALLOWS).
//
// Three computed reasons, each said only when it exists:
//   denies — the squares the chosen pawn move takes away from their pieces
//            (…a6: b5 is gone for the knight on d4 and the bishop on f1);
//   allows — the alternative's main reply in master games and the named line
//            it leads to (the Classical → the Richter-Rauzer with Bg5);
//   score  — the two roads' master-game scores from the student's side, said
//            in words and only as the close to a reason, never alone.
// Every fact comes from chess.js, the opening DB and the masters counts (G0).
import { Chess, type Square } from 'chess.js';
import { detectOpening } from './openingDetectionService';
import { isWaypointOpening } from './openingIdentity';
import type { LocalDbMove } from './masterPlayLookup';
import type { MovesAt } from './mastersPlanRead';
import { andList } from '../utils/andList';
import { squaresProof, NO_PROOF, type FactProof } from './proof';

export interface RoadReason {
  /** The reason, after "You chose the X" — one or two sentences. */
  text: string;
  squares: string[];
  proof: FactProof;
}

/** The alternative's main reply must be this share of its games to be "the" reply. */
export const MAIN_REPLY_SHARE = 0.3;
/** Two roads' scores differ in words only past this many points (of 100). */
export const SCORE_GAP = 3;
/** Fewer games than this on either road and the score says nothing. */
export const MIN_SCORE_GAMES = 500;

const PIECE: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function boardAfter(sans: readonly string[]): Chess | null {
  const c = new Chess();
  try { for (const s of sans) c.move(s); } catch { return null; }
  return c;
}

/** Their pieces that could step onto a square the chosen pawn move now covers. */
export function deniedSquares(fenBefore: string, san: string, student: 'w' | 'b'): Array<{ square: string; pieces: Array<{ piece: string; from: string }> }> {
  let after: Chess;
  let mv;
  try { after = new Chess(fenBefore); mv = after.move(san); } catch { return []; }
  if (!mv || mv.piece !== 'p') return [];
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  // Their moves on the board before, as if it were their turn.
  const parts = fenBefore.split(' ');
  parts[1] = them; parts[3] = '-';
  let theirs: ReturnType<Chess['moves']> & Array<{ from: string; to: string; piece: string }>;
  try { theirs = new Chess(parts.join(' ')).moves({ verbose: true }) as typeof theirs; } catch { return []; }
  const r = Number(mv.to[1]) + (student === 'w' ? 1 : -1);
  const out: Array<{ square: string; pieces: Array<{ piece: string; from: string }> }> = [];
  for (const df of [-1, 1]) {
    const sq = `${String.fromCharCode(mv.to.charCodeAt(0) + df)}${r}`;
    if (!/^[a-h][1-8]$/.test(sq)) continue;
    // Already covered by another pawn of the student's: nothing new is denied.
    const before = new Chess(fenBefore);
    if (before.attackers(sq as Square, student).some((a) => before.get(a)?.type === 'p')) continue;
    const pieces = theirs.filter((m) => m.to === sq && m.piece !== 'p' && m.piece !== 'k').map((m) => ({ piece: m.piece, from: m.from }));
    if (pieces.length) out.push({ square: sq, pieces: [...new Map(pieces.map((p) => [p.from, p])).values()] });
  }
  return out;
}

/** The alternative's main reply and the named line it opens, from master games. */
export function mainReplyLine(afterAlt: readonly string[], movesAt: MovesAt): { san: string; name: string } | null {
  const b = boardAfter(afterAlt);
  if (!b) return null;
  const ms = movesAt(b.fen());
  const total = ms?.reduce((n, m) => n + m.games, 0) ?? 0;
  if (!ms || total === 0) return null;
  const top = [...ms].sort((x, y) => y.games - x.games)[0];
  if (top.games / total < MAIN_REPLY_SHARE) return null;
  const here = detectOpening([...afterAlt])?.name ?? null;
  const name = detectOpening([...afterAlt, top.san])?.name ?? null;
  if (!name || name === here || isWaypointOpening(name)) return null;
  return { san: top.san, name };
}

/** The student's master-game score on a move, 0..100, or null without the counts. */
function scoreFor(m: LocalDbMove | undefined, student: 'w' | 'b'): number | null {
  if (!m || m.white === undefined || m.draws === undefined || m.black === undefined) return null;
  const n = m.white + m.draws + m.black;
  if (n < MIN_SCORE_GAMES) return null;
  return (100 * ((student === 'w' ? m.white : m.black) + m.draws / 2)) / n;
}

/** "knights on d4 and c3 and bishop on f1" — one noun per kind of piece. */
function piecesWords(ps: ReadonlyArray<{ piece: string; from: string }>): string {
  const byKind = new Map<string, string[]>();
  for (const p of ps) byKind.set(p.piece, [...(byKind.get(p.piece) ?? []), p.from]);
  return [...byKind].map(([k, sqs]) => `${PIECE[k]}${sqs.length > 1 ? 's' : ''} on ${andList(sqs)}`).join(', and their ');
}

const label = (name: string): string => (name.includes(':') ? name.slice(name.indexOf(':') + 1).trim() : name).replace(/ Variation\b/g, '').trim();
const dot = (san: string, side: 'w' | 'b'): string => `${side === 'b' ? '…' : ''}${san}`;

/**
 * Why the chosen road and not the main alternative, from the board BEFORE the
 * choice (`prefix`). Null when no reason is computed — a score alone, or "a
 * different kind of position", is not a reason, and the story stays quiet.
 */
export function roadReason(i: {
  prefix: readonly string[]; chosenSan: string; altSan: string; altName: string; student: 'w' | 'b'; movesAt: MovesAt;
}): RoadReason | null {
  const before = boardAfter(i.prefix);
  if (!before) return null;
  const fenBefore = before.fen();
  const them: 'w' | 'b' = i.student === 'w' ? 'b' : 'w';
  const parts: string[] = [];
  const squares: string[] = [];
  const denied = deniedSquares(fenBefore, i.chosenSan, i.student);
  if (denied.length) {
    parts.push(`${dot(i.chosenSan, i.student)} takes ${andList(denied.map((d) => d.square))} away from their ${piecesWords(denied.flatMap((d) => d.pieces))}.`);
    squares.push(...denied.map((d) => d.square));
  }
  // The alternative's main answer, unless masters answer the chosen move the
  // same way — then it says nothing about the difference between the roads.
  const reply = mainReplyLine([...i.prefix, i.altSan], i.movesAt);
  const afterMine = boardAfter([...i.prefix, i.chosenSan]);
  const mineTop = afterMine ? [...(i.movesAt(afterMine.fen()) ?? [])].sort((x, y) => y.games - x.games)[0]?.san ?? null : null;
  if (reply && reply.san !== mineTop) {
    parts.push(`The other main road, the ${label(i.altName)}, is mostly met by the ${label(reply.name)}, with ${dot(reply.san, them)}.`);
  }
  if (!parts.length) return null;
  const ms = i.movesAt(fenBefore) ?? [];
  const mine = scoreFor(ms.find((m) => m.san === i.chosenSan), i.student);
  const alt = scoreFor(ms.find((m) => m.san === i.altSan), i.student);
  if (mine !== null && alt !== null && Math.abs(mine - alt) >= SCORE_GAP) {
    parts.push(mine > alt ? `In master games your road has held up better.` : `In master games the ${label(i.altName)} has held up a little better.`);
  }
  return { text: parts.join(' '), squares, proof: squaresProof(parts[0], squares) ?? NO_PROOF.description };
}
