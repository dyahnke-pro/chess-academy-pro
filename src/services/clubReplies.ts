// clubReplies — THE REPLIES CLUB PLAYERS MAKE THAT NO TAUGHT LINE COVERS
// (WO-COURSE-01 D, David 2026-10-27: "Let's add … the users moves" → "own
// games first + the student's band"). The reply tree listed what masters and
// 2200+ players answer; a student rated 1000–2000 meets other moves — 3…h6
// against the Italian in 18% of their games at 1000–1200, which no taught line
// played. The explorer walk measured them at three rating bands; the builder
// (scripts/course-replies/build-club-replies.mjs) walked each to the
// middlegame through the ONE course walker and graded its last board. They
// are FETCHED per opening when its page opens (`/data/club-replies/`), never
// bundled.
//
// A club reply is filed by its BOARD, so it is shown wherever a tab reaches
// that board: on the tab's own line from the first ply a tab's replies may sit
// on (`replyFloorPly`, the rule the games' replies follow), or inside a reply
// the tab shows — then it carries `via`, the moves of that reply's line to
// the board, as part of its identity (`replyIdentity`). It is never shown
// where the tab or a reply already plays it, and never twice. Its order: the
// replies the student met in their own games first (`facedReplies`), then by
// how often players at the student's band meet it with this opening.
import { Chess } from 'chess.js';
import { loadDataJson } from './dataFile';
import { detectOpening } from './openingDetectionService';
import { replyIdentity } from './replyIdentity';
import { timesFaced, type FacedIndex } from './facedReplies';
import { positionOf } from '../utils/samePosition';
import type { ChapterSubline } from './openingCourse';

export const CLUB_REPLIES_DIR = '/data/club-replies/';

/** One built line, as the builder writes it. */
export interface ClubReplyRecord {
  /** The board the reply is made on (FEN without move counters). */
  board: string;
  /** The reply (SAN). */
  san: string;
  /** The student's answer and the line after it, to the middlegame. */
  cont: string[];
  /** Games behind the reply at 1000–2000, and its share at its board (%). */
  games: number;
  pct: number;
  /** % of the games with the opening reaching this reply, by rating band. */
  reach: Record<string, number>;
  /** Its share at its board (%), by rating band, where the walk read it. */
  share?: Record<string, number>;
  /** The engine's read of the line's last board, the student's centipawns. */
  endCp: number | null;
  middlegame: boolean;
  gambit?: boolean;
}

interface ClubReplyFile {
  openingId: string;
  bands: string[];
  replies: ClubReplyRecord[];
}

interface ClubReplyIndex {
  bands: string[];
  /** Opening id → the number of club replies its file holds. */
  openings: Record<string, number>;
}

let indexJob: Promise<ClubReplyIndex | null> | null = null;
function clubIndex(): Promise<ClubReplyIndex | null> {
  if (!indexJob) {
    indexJob = (loadDataJson(`${CLUB_REPLIES_DIR}index.json`) as Promise<ClubReplyIndex | null>).catch(() => null);
    void indexJob.then((f) => { if (!f) indexJob = null; });
  }
  return indexJob;
}

const files = new Map<string, Promise<ClubReplyRecord[]>>();

/** The club replies of one opening — [] for an opening the walk has none for
 *  (the index says so, and no file is asked for). Once per session; never
 *  rejects. */
export function clubRepliesOf(openingId: string): Promise<ClubReplyRecord[]> {
  const hit = files.get(openingId);
  if (hit) return hit;
  const job = clubIndex()
    .then(async (index) => {
      if (!index?.openings[openingId]) return [];
      const file = (await loadDataJson(`${CLUB_REPLIES_DIR}${openingId}.json`)) as ClubReplyFile | null;
      return file?.replies ?? [];
    })
    .catch(() => [])
    .then((replies) => { if (replies.length === 0) files.delete(openingId); return replies; });
  files.set(openingId, job);
  return job;
}

/** Test seam. */
export function __resetClubReplies(): void {
  indexJob = null;
  files.clear();
}

/** A band's Lichess buckets: "1400,1600" → [1400, 1600]. */
function bucketsOf(band: string): number[] {
  return band.split(',').map(Number).filter(Number.isFinite);
}

/**
 * A per-band number at the STUDENT's band (`explorerBandFor(rating).band`):
 * each of the student's Lichess buckets reads the measured band that holds it,
 * or the nearest one, and the two are averaged — a student at 1200–1400 sits
 * half in the walk's 1000–1200 band and half in its 1400–1600. Null when
 * nothing was measured. Pure.
 */
export function valueAtBand(values: Readonly<Record<string, number>> | undefined, studentBand: string): number | null {
  const measured = Object.entries(values ?? {}).map(([band, v]) => ({ buckets: bucketsOf(band), v })).filter((m) => m.buckets.length);
  if (measured.length === 0) return null;
  const read = bucketsOf(studentBand).map((b) => {
    const holds = measured.find((m) => m.buckets.includes(b));
    if (holds) return holds.v;
    const dist = (m: { buckets: number[] }): number => Math.min(...m.buckets.map((x) => Math.abs(x - b)));
    return [...measured].sort((a, z) => dist(a) - dist(z))[0].v;
  });
  if (read.length === 0) return null;
  return read.reduce((s, v) => s + v, 0) / read.length;
}

/** A share as the row prints it: whole percent from 10, a tenth below. */
function printedShare(pct: number): number {
  return pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10;
}

/** The board before each ply of `moves` (index p = before move p), as far as
 *  the moves are legal. */
function boardsAlong(moves: readonly string[]): string[] {
  const c = new Chess();
  const out = [positionOf(c.fen())];
  for (const san of moves) {
    try { c.move(san); } catch { break; }
    out.push(positionOf(c.fen()));
  }
  return out;
}

function sameMove(a: string | undefined, b: string): boolean {
  return a !== undefined && a.replace(/[+#!?]+$/, '') === b.replace(/[+#!?]+$/, '');
}

interface ClubTabInput {
  records: readonly ClubReplyRecord[];
  /** The tab's own line (SAN) and the tab's index. */
  tabLine: readonly string[];
  lineIndex: number;
  /** The first ply a reply may sit on (`replyFloorPly`). */
  from: number;
  /** Replies shown on the tab whose lines a club reply may sit inside: the
   *  curated replies (the lines the walk walked). */
  anchors: readonly ChapterSubline[];
  /** Every reply already shown on the tab — a club reply never repeats one. */
  shown: readonly ChapterSubline[];
  /** The identity (`replyIdentity`) of every curated reply of the opening. */
  reserved: ReadonlySet<string>;
  /** The student's band (`explorerBandFor(rating).band`). */
  studentBand: string;
  /** What the student's opponents played in their own games. */
  faced: FacedIndex | null;
}

/** The club replies a tab shows, as reply rows, in their order. Pure. */
export function clubRepliesOnTab(input: ClubTabInput): ChapterSubline[] {
  const { tabLine, lineIndex, from } = input;
  const tabBoards = boardsAlong(tabLine);
  const onTab = new Map<string, number>();
  tabBoards.forEach((b, p) => { if (p >= from && !onTab.has(b)) onTab.set(b, p); });
  const inReply = new Map<string, { anchor: ChapterSubline; ply: number }>();
  const anchors = [...input.anchors].sort((a, b) => a.atPly - b.atPly || a.triggerMove.localeCompare(b.triggerMove));
  for (const anchor of anchors) {
    boardsAlong(anchor.moves).forEach((b, p) => {
      if (p > anchor.atPly && !onTab.has(b) && !inReply.has(b)) inReply.set(b, { anchor, ply: p });
    });
  }
  const shownAt = new Set(input.shown.map((s) => `${boardsAlong(s.moves.slice(0, s.atPly))[s.atPly] ?? ''}|${s.triggerMove.replace(/[+#!?]+$/, '')}`));
  const trunkName = detectOpening([...tabLine])?.name ?? '';

  const rows: ChapterSubline[] = [];
  for (const r of input.records) {
    let prefix: string[];
    let tab: number;
    let via: string | undefined;
    const p = onTab.get(r.board);
    const nested = p === undefined ? inReply.get(r.board) : undefined;
    if (p !== undefined) {
      if (sameMove(tabLine[p], r.san)) continue;
      prefix = tabLine.slice(0, p);
      tab = lineIndex;
    } else if (nested) {
      if (sameMove(nested.anchor.moves[nested.ply], r.san)) continue;
      prefix = nested.anchor.moves.slice(0, nested.ply);
      tab = nested.anchor.tab;
      via = nested.anchor.moves.slice(nested.anchor.atPly, nested.ply).join(' ');
    } else {
      continue;
    }
    if (shownAt.has(`${r.board}|${r.san.replace(/[+#!?]+$/, '')}`)) continue;
    const moves = [...prefix, r.san, ...r.cont];
    if (boardsAlong(moves).length !== moves.length + 1) continue;
    const ref = { tab, triggerMove: r.san, atPly: prefix.length, ...(via ? { via } : {}) };
    if (input.reserved.has(replyIdentity(ref))) continue;
    const named = detectOpening([...moves]);
    rows.push({
      ...ref,
      name: named && named.plyCount > ref.atPly && named.name !== trunkName ? named.name : '',
      pct: printedShare(valueAtBand(r.share, input.studentBand) ?? r.pct),
      games: r.games,
      moves,
      reachesMiddlegame: r.middlegame,
      club: {
        reach: Math.round((valueAtBand(r.reach, input.studentBand) ?? 0) * 100) / 100,
        met: timesFaced(input.faced, r.board, r.san),
        endCp: r.endCp,
      },
    });
  }
  return rows.sort((a, b) => (b.club?.met ?? 0) - (a.club?.met ?? 0) || (b.club?.reach ?? 0) - (a.club?.reach ?? 0) || b.games - a.games);
}
