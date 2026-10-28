// builtReplies — EVERY TAB'S REPLIES, BUILT FROM THE GAMES (WO-ALL-OPENINGS-01,
// David 2026-10-28: "all opening masterclasses and all tabs in the opening
// should now have every subline and tabia listed out … match the depth of
// chessable"). The reply tree read only `course-sublines.json`, built offline
// for the ~150 taught openings, so the ~2,700 openings built from the games
// showed none and the taught ones stopped at what that build kept. This builds
// the selected tab's replies from the deep master tree when the tab is opened
// (`gamesCourse.buildReplies`) — every move a move masters played (G3) — once
// per session. The curated replies still come first (`ReplyTree`).
import { Chess } from 'chess.js';
import type { OpeningRecord, OpeningReply } from '../types';
import { buildReplies } from './gamesCourse';
import { masterTreeAt } from './masterTree';
import { detectOpening } from './openingDetectionService';
import { openingFamily } from './openingKey';
import { MAIN_LINE_INDEX } from '../utils/wlppLadder';

function sansOf(pgn: string | undefined): string[] {
  const out: string[] = [];
  const c = new Chess();
  for (const tok of (pgn ?? '').trim().split(/\s+/)) {
    if (!tok || /^\d+\.+$/.test(tok)) continue;
    const san = tok.replace(/^\d+\.+/, '');
    try { out.push(c.move(san).san); } catch { break; }
  }
  return out;
}

/** The first ply that is inside the opening: replies before it leave the
 *  opening (1…c5 against a Vienna is the Sicilian, not a reply). Pure. */
export function openingStartPly(lineSans: readonly string[], openingName: string): number {
  const family = openingFamily(openingName).toLowerCase();
  for (let n = 1; n <= lineSans.length; n += 1) {
    const d = detectOpening([...lineSans.slice(0, n)]);
    if (d && openingFamily(d.name).toLowerCase() === family) return n;
  }
  return Math.min(lineSans.length, 4);
}

/** The ply a line first leaves `other`. Pure. */
function branchPly(line: readonly string[], other: readonly string[]): number {
  let i = 0;
  while (i < line.length && i < other.length && line[i] === other[i]) i += 1;
  return i;
}

/** A reply that IS another taught line (a tab, or the main line) is shown
 *  there, never twice. Pure. */
export function isTaughtLine(reply: OpeningReply, lines: readonly (readonly string[])[]): boolean {
  return lines.some((l) => l.length > reply.atPly && l.slice(0, reply.atPly + 1).every((san, k) => san === reply.moves[k]));
}

const built = new Map<string, Promise<OpeningReply[]>>();

/** The replies of one tab (`lineIndex`, MAIN_LINE_INDEX for the main line),
 *  read off the deep master tree. Never rejects; [] when the tree has none. */
export function builtRepliesFor(opening: OpeningRecord, lineIndex: number): Promise<OpeningReply[]> {
  const key = `${opening.id}|${lineIndex}|${lineIndex === MAIN_LINE_INDEX ? opening.pgn : opening.variations?.[lineIndex]?.pgn ?? ''}`;
  const hit = built.get(key);
  if (hit) return hit;
  const main = sansOf(opening.pgn);
  const tabs = (opening.variations ?? []).map((v) => sansOf(v.pgn));
  const line = lineIndex === MAIN_LINE_INDEX ? main : tabs[lineIndex] ?? [];
  const start = openingStartPly(line, opening.name);
  const from = lineIndex === MAIN_LINE_INDEX ? start : Math.max(start, branchPly(line, main) + 1);
  const others = [main, ...tabs].filter((_, k) => k - 1 !== lineIndex);
  const job = buildReplies(line, from, opening.color, { lookup: masterTreeAt })
    .then(({ replies, incomplete }) => {
      if (incomplete) built.delete(key);
      return replies.filter((r) => !isTaughtLine(r, others));
    })
    .catch(() => { built.delete(key); return []; });
  built.set(key, job);
  return job;
}

/** Test seam. */
export function __resetBuiltReplies(): void {
  built.clear();
}
