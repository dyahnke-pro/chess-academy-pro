// openingRoads — WHY THIS ROAD AND NOT THE OTHER ONE, BY WHAT EACH ALLOWS
// (opening model beat 4, lead 2026-10-20: "a different kind of position" is a
// description with no reason — build what each road ALLOWS).
//
// Three computed reasons, each said only when it exists:
//   denies — the squares the chosen pawn move takes away from their pieces
//            (…a6: b5 is gone for the knight on d4 and the bishop on f1);
//   jobs   — what the chosen move does against what the other would
//            (…Nf6 attacks e4, where …Bc5 brings the bishop out), and the
//            attack the chosen road invites in master games (Ng5 on f7);
//   score  — the two roads' master-game scores from the student's side, said
//            in words and only as the close to a reason, never alone.
// Every fact comes from chess.js, the opening DB and the masters counts (G0).
import { Chess, type Square } from 'chess.js';
import { moveJob, MINE, THEIRS, type PriorCapture } from './bookMoveWhy';
import { MIN_ALTERNATIVE_SHARE } from './refutedAlternativeCore';
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

/** A reply to the chosen road is one it invites at this share of its games. */
const INVITE_SHARE = MIN_ALTERNATIVE_SHARE / 100;
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

/** The chosen road's master replies that attack the student, as the move it
 *  invites ("it invites Ng5, which joins their bishop on c4 against your pawn
 *  on f7"): the most-played reply with a real share whose job is an attack. */
export function invitedAttack(afterMine: readonly string[], student: 'w' | 'b', movesAt: MovesAt): { san: string; clause: string; squares: string[] } | null {
  const b = boardAfter(afterMine);
  if (!b) return null;
  const ms = movesAt(b.fen());
  const total = ms?.reduce((n, m) => n + m.games, 0) ?? 0;
  if (!ms || total === 0) return null;
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  for (const m of [...ms].sort((x, y) => y.games - x.games)) {
    if (m.games / total < INVITE_SHARE) break;
    const j = moveJob(b.fen(), m.san, them, THEIRS);
    if (j && j.kind === 'attack' && /\byour\b/.test(j.clause)) return { san: m.san, clause: j.clause, squares: j.squares };
  }
  return null;
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
  // EACH ROAD'S OWN JOB (lead 2026-10-20: "the Giuoco Piano is mostly met by
  // the Classical" talked about the road not taken). What the chosen move
  // does against what the other move would do, from the move computer — said
  // when the pawn move's squares are not already its reason.
  const sayJob = (san: string, clause: string): string => `${dot(san, i.student)} ${clause.replace(/^it /, '')}`;
  // The capture the chosen move may answer (…Qxd5 takes BACK on d5).
  const last = i.prefix.length ? i.prefix[i.prefix.length - 1] : null;
  let prior: PriorCapture | null = null;
  if (last && /x/.test(last)) {
    const pb = boardAfter(i.prefix.slice(0, -1));
    const pm = pb ? (() => { try { return pb.move(last); } catch { return null; } })() : null;
    if (pm?.captured) prior = { to: pm.to, captured: pm.captured };
  }
  const mineJob = moveJob(fenBefore, i.chosenSan, i.student, MINE, prior);
  const altJob = moveJob(fenBefore, i.altSan, i.student, MINE, prior);
  const invite = invitedAttack([...i.prefix, i.chosenSan], i.student, i.movesAt);
  if (!denied.length && mineJob && altJob && mineJob.clause !== altJob.clause) {
    parts.push(`${sayJob(i.chosenSan, mineJob.clause)}, where ${sayJob(i.altSan, altJob.clause)}${invite ? `; it invites ${dot(invite.san, them)}, which ${invite.clause.replace(/^it /, '')}` : ''}.`);
    squares.push(...mineJob.squares, ...(invite?.squares ?? []));
  } else if (invite) {
    parts.push(`${dot(i.chosenSan, i.student)} invites ${dot(invite.san, them)}, which ${invite.clause.replace(/^it /, '')}.`);
    squares.push(...invite.squares);
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
