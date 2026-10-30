// replyTree — how a tab's replies are GROUPED and ORDERED on the reply tree
// (WO-COURSE-01 B + D). Pure, so the order is tested without a page.
//
// A group is the replies made on ONE board: on the tab's own line ("After
// 3…Bf5"), or inside a reply the tab shows ("After 3…Nf6 4.d3" — a club reply
// inside the Two Knights reply). Groups run in move order, the tab's own line
// first at a ply.
//
// Inside a group (David: "own games first" + "the student's band"):
//   1. the replies the student met in their own games, most met first;
//   2. the course's replies (curated, then the games'), most played first;
//   3. the club replies, by how often players at the student's band meet them.
// The Main tag still belongs to the course reply that leads the course's own
// order — moving a met sideline to the top never makes it Main, and a club
// reply's club share never takes Main from a course reply.
import { Chess } from 'chess.js';
import { timesFaced, type FacedIndex } from './facedReplies';
import { numberedMove } from '../utils/numberedMove';
import { positionOf } from '../utils/samePosition';
import type { ChapterSubline } from './openingCourse';

export interface ReplyRow {
  subline: ChapterSubline;
  /** Times the student met this reply in their own games. */
  met: number;
  /** The course reply that leads its group (drives the Main tag). */
  isTop: boolean;
}

export interface ReplyGroup {
  /** A stable id: the ply, and for a group inside a reply the moves from where
   *  its line leaves the tab. */
  id: string;
  atPly: number;
  /** "3…Bf5", or "3…Nf6 4.d3" inside a reply; null at the first move. */
  after: string | null;
  rows: ReplyRow[];
}

function boardBefore(s: ChapterSubline): string {
  const c = new Chess();
  for (const san of s.moves.slice(0, s.atPly)) {
    try { c.move(san); } catch { return ''; }
  }
  return positionOf(c.fen());
}

/** The tab's replies, grouped by the board they are made on and ordered. */
export function groupReplies(tabLine: readonly string[], rows: readonly ChapterSubline[], faced: FacedIndex | null): ReplyGroup[] {
  const byPath = new Map<string, ChapterSubline[]>();
  for (const s of rows) {
    const path = s.moves.slice(0, s.atPly).join(' ');
    const g = byPath.get(path) ?? [];
    g.push(s);
    byPath.set(path, g);
  }
  const groups = [...byPath.values()].map((subs): { group: ReplyGroup; onTab: boolean } => {
    const atPly = subs[0].atPly;
    const path = subs[0].moves.slice(0, atPly);
    let leaves = 0;
    while (leaves < path.length && leaves < tabLine.length && path[leaves] === tabLine[leaves]) leaves += 1;
    // On the tab's line — or on past its end, where a folded variation's
    // replies sit (its lesson runs further than the tab's line) — the group
    // names the move it answers. Inside a reply whose line LEFT the tab's,
    // every move from where it left.
    const diverged = leaves < path.length && leaves < tabLine.length;
    const fromPly = diverged ? leaves : Math.max(0, atPly - 1);
    const after = atPly === 0 ? null : path.slice(fromPly).map((san, k) => numberedMove(fromPly + k, san)).join(' ');
    const course = subs.filter((s) => !s.club).sort((a, b) => b.pct - a.pct || b.games - a.games);
    const club = subs.filter((s) => s.club).sort((a, b) => (b.club?.reach ?? 0) - (a.club?.reach ?? 0) || b.games - a.games);
    const top = course[0];
    const row = (s: ChapterSubline): ReplyRow => ({ subline: s, met: s.club ? s.club.met : timesFaced(faced, boardBefore(s), s.triggerMove), isTop: s === top });
    const ordered = [...course, ...club].map(row);
    const met = ordered.filter((r) => r.met > 0).sort((a, b) => b.met - a.met);
    // Exactly on the tab's line: the id is the ply (one board per ply there).
    const onTab = leaves === path.length;
    return {
      group: {
        id: onTab ? String(atPly) : `${atPly}-in-${path.slice(leaves).join('-')}`,
        atPly,
        after,
        rows: [...met, ...ordered.filter((r) => r.met === 0)],
      },
      onTab,
    };
  });
  return groups
    .sort((a, b) => a.group.atPly - b.group.atPly || Number(b.onTab) - Number(a.onTab) || a.group.id.localeCompare(b.group.id))
    .map((g) => g.group);
}
