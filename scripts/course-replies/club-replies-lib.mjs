// The pure half of the club-reply builder (WO-COURSE-01 D) — what a walk reply
// IS against the current course, and the file the app fetches. No engine, no
// disk: build-club-replies.mjs runs the engine and writes; the tests run these.
import { Chess } from 'chess.js';
import { pos, isGambitName } from './course-lines.mjs';

/** Worse than a pawn down for the student at the line's last board: the
 *  course's own bar (groundingSublines.test.ts LOSING_CP). A gambit is judged
 *  like the gambit, never by it. */
export const LOSING_CP = -100;

/** Why a walk reply did not become a line. */
export const DROP_REASONS = /** @type {const} */ ([
  'off-course',      // no taught line reaches its board any more (the course changed after the walk)
  'illegal',         // the reply is not a legal move on its board
  'taught',          // a taught line plays it there (the course changed after the walk)
  'transposes',      // the board after it is a taught board: the student's answer is a taught line
  'no-continuation', // the walk found no move past the reply
  'unsound',         // the line ends below LOSING_CP for the student (not a gambit)
  'pending',         // not built yet (re-run the shards)
]);

/**
 * What a walk reply is against the current course: a CANDIDATE (with the moves
 * of the first taught line that reaches its board), or the reason it is not.
 * @param {Map<string, { path: string[], next: Set<string>, line: number }>} taught  from taughtBoards
 * @param {{ fen: string, san: string }} reply
 */
export function classifyReply(taught, reply) {
  const board = pos(reply.fen);
  const node = taught.get(board);
  if (!node) return { status: 'off-course', board };
  const c = new Chess();
  for (const san of node.path) c.move(san);
  if (pos(c.fen()) !== board) return { status: 'off-course', board };
  let m;
  try { m = c.move(reply.san); } catch { m = null; }
  if (!m) return { status: 'illegal', board };
  if (node.next.has(m.san)) return { status: 'taught', board, san: m.san };
  if (taught.has(pos(c.fen()))) return { status: 'transposes', board, san: m.san };
  return { status: 'candidate', board, san: m.san, path: node.path, line: node.line };
}

/** The name of the taught line `li` sits on: the opening for the main line,
 *  the variation for a variation, the variation a reply line is filed under. */
export function lineName(o, li) {
  if (li === 0) return o.name;
  if (li < o.spine.length) return o.variations.filter((v) => v.sans.length)[li - 1]?.name ?? o.name;
  const s = o.sublines[li - o.spine.length];
  return s && s.tab >= 0 ? o.variations[s.tab]?.name ?? o.name : o.name;
}

/** Is a reply on line `li` judged like a gambit (the one rule, gambit-name.cjs)? */
export function isGambitReply(o, li) {
  return isGambitName(o.name) || isGambitName(o.id) || isGambitName(lineName(o, li));
}

/** The engine's score (side to move) as the STUDENT's centipawns. */
export function studentCp(score, fen, studentColor) {
  const toMove = fen.split(' ')[1] === 'w' ? 'white' : 'black';
  return toMove === studentColor ? score : -score;
}

/** The reply's share of the games at its board in one rating band, read from
 *  the walk's own explorer cache (the board it looked up there), or null. */
export function bandShare(cache, board, san) {
  const at = cache?.[board];
  if (!at?.total) return null;
  const g = at.moves.find((m) => m.san === san)?.games ?? 0;
  return Math.round((g / at.total) * 1000) / 10;
}

/** The cache key of one built line. */
export const lineKey = (openingId, board, san) => `${openingId}|${board}|${san}`;

/**
 * One opening's club-reply file and why each walk reply did or did not make
 * it. `built` holds the engine results by lineKey: { cont, endCp, stop,
 * share? } — from the line cache, or from the file already shipped.
 * @returns {{ file: object | null, counts: Record<string, number>, rows: object[] }}
 */
export function assembleOpening(o, walkEntry, taught, built, bands, bandCaches) {
  const counts = { kept: 0 };
  const rows = [];
  for (const r of walkEntry.replies ?? []) {
    const cls = classifyReply(taught, r);
    let status = cls.status;
    let row = null;
    if (status === 'candidate') {
      const res = built.get(lineKey(o.id, cls.board, cls.san));
      const gambit = isGambitReply(o, cls.line);
      if (!res) status = 'pending';
      else if (!res.cont?.length) status = 'no-continuation';
      else if (!gambit && res.endCp !== null && res.endCp < LOSING_CP) status = 'unsound';
      else {
        status = 'kept';
        // The walk's explorer cache, else the share the line already shipped
        // with (a checkout without the gitignored cache keeps it).
        const share = {};
        for (const b of bands) {
          const s = bandShare(bandCaches[b], cls.board, cls.san) ?? res.share?.[b] ?? null;
          if (s !== null) share[b] = s;
        }
        row = {
          board: cls.board,
          san: cls.san,
          cont: res.cont,
          games: r.games,
          pct: r.nodeShare,
          reach: Object.fromEntries(bands.map((b) => [b, r.bandReach?.[b] ?? 0])),
          ...(Object.keys(share).length ? { share } : {}),
          endCp: res.endCp,
          middlegame: res.stop === 'middlegame',
          ...(gambit ? { gambit: true } : {}),
        };
      }
    }
    counts[status] = (counts[status] ?? 0) + 1;
    if (row) rows.push(row);
  }
  rows.sort((a, b) => b.games - a.games || a.board.localeCompare(b.board) || a.san.localeCompare(b.san));
  return { file: rows.length ? { openingId: o.id, bands, replies: rows } : null, counts, rows };
}
