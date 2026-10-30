import { Chess } from 'chess.js';
import { ALL_GEMS, isKnownSlipGem, isWeaponGem, type PunishGem } from '../data/lessons/punishGems';
import { positionOf } from '../utils/samePosition';

/**
 * What an opponent's reply IS, for the reply tree's tag (WO-COURSE-01 B):
 *  - `trap`     — a known mistake the engine proved loses at least a piece or
 *                 mates (`isWeaponGem`, the trap bar).
 *  - `mistake`  — a known mistake worth at least half a pawn (`isKnownSlipGem`);
 *                 never called a trap (F04).
 *  - `club`     — a reply club players make that no taught line covers
 *                 (`clubReplies`, WO-COURSE-01 D); its frequency is club
 *                 players', so it never competes for Main.
 *  - `main`     — the most played reply at its move, played in at least
 *                 MAIN_SHARE of the games there.
 *  - `sideline` — everything else.
 * The first two come from the engine-verified gems; the rest from where the
 * reply comes from and its own frequency. Nothing is decided by name.
 */
export type ReplyTag = 'trap' | 'mistake' | 'club' | 'main' | 'sideline';

/** Where a reply on the tree comes from: the course (curated and the games'
 *  replies), or the club replies. Every caller says which. */
export type ReplySource = 'course' | 'club';

export const MAIN_SHARE = 25;

let gemIndex: Map<string, PunishGem> | null = null;

function gemKey(openingId: string, fenBefore: string, san: string): string {
  return `${openingId}|${positionOf(fenBefore)}|${san.replace(/[+#!?]+$/, '')}`;
}

function index(): Map<string, PunishGem> {
  if (gemIndex) return gemIndex;
  gemIndex = new Map();
  for (const g of ALL_GEMS) {
    const c = new Chess();
    try {
      for (const san of g.lineMoves.trim().split(/\s+/).filter(Boolean)) c.move(san);
    } catch {
      continue;
    }
    gemIndex.set(gemKey(g.openingId, c.fen(), g.inaccuracy), g);
  }
  return gemIndex;
}

/** The known-mistake gem for the reply that ends `movesThroughReply`, if any —
 *  matched by the board before the reply and the reply itself, so a line that
 *  reaches the gem's board by another move order still finds it. */
export function gemForReply(openingId: string, movesThroughReply: string[]): PunishGem | null {
  if (movesThroughReply.length === 0) return null;
  const c = new Chess();
  try {
    for (const san of movesThroughReply.slice(0, -1)) c.move(san);
  } catch {
    return null;
  }
  return index().get(gemKey(openingId, c.fen(), movesThroughReply[movesThroughReply.length - 1])) ?? null;
}

/** The tag for one reply in its group (the replies at the same move). */
export function replyTag(
  openingId: string,
  movesThroughReply: string[],
  pct: number,
  isTopOfGroup: boolean,
  source: ReplySource,
): ReplyTag {
  const gem = gemForReply(openingId, movesThroughReply);
  if (gem && isWeaponGem(gem)) return 'trap';
  if (gem && isKnownSlipGem(gem)) return 'mistake';
  if (source === 'club') return 'club';
  return isTopOfGroup && pct >= MAIN_SHARE ? 'main' : 'sideline';
}
