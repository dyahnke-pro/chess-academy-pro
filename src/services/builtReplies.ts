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
import type { CommonMistake, MiddlegamePlan, OpeningRecord, OpeningReply } from '../types';
import { clubGemsOnLine, clubGemToMistake, clubGemToPunishGem } from './clubGems';
import { modelGamesForLine } from './modelGameIndex';
import type { LineGames } from './modelGameIndex';
import { isKnownSlipGem, isWeaponGem } from '../data/lessons/punishGems';
import type { PunishGem } from '../data/lessons/punishGems';
import { buildReplies } from './gamesCourse';
import { computedPlanAt } from './computedPlan';
import { masterTreeAt } from './masterTree';
import { deepTreeAt } from './deepTree';
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
  const job = buildReplies(line, from, opening.color, { lookup: deepTreeAt })
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
  plans.clear();
  gems.clear();
  lineGames.clear();
}

const plans = new Map<string, Promise<MiddlegamePlan | null>>();

/** The middlegame plan masters played from a tab's last board, for a tab with
 *  no hand-written plan (WO-ALL-OPENINGS-01 O5). Once per session; never
 *  rejects; null when the tree has too little to say. */
export function builtPlanFor(opening: OpeningRecord, lineIndex: number): Promise<MiddlegamePlan | null> {
  const line = sansOf(lineIndex === MAIN_LINE_INDEX ? opening.pgn : opening.variations?.[lineIndex]?.pgn);
  const key = `${opening.id}|${lineIndex}|${line.join(' ')}`;
  const hit = plans.get(key);
  if (hit) return hit;
  const job = computedPlanAt(line, opening.color, opening.id, `computed-${opening.id}-${lineIndex}`, { lookup: masterTreeAt })
    .catch(() => null)
    .then((plan) => { if (!plan) plans.delete(key); return plan; });
  plans.set(key, job);
  return job;
}

export interface BuiltGems {
  /** The opponent's club slips on this tab that are TRAPS (they lose a piece
   *  or get mated), and their punishment. */
  weapons: PunishGem[];
  /** The opponent's KNOWN MISTAKES on this tab — club slips the punish wins
   *  half a pawn or more from, under the trap bar — most common first (David
   *  2026-10-29: "Known mistakes for you user and opponent"). */
  theirSlips: PunishGem[];
  /** The student's own club slips on this tab — traps and known mistakes — to
   *  avoid, most common first. */
  watchOuts: CommonMistake[];
}

const gems = new Map<string, Promise<BuiltGems>>();

/** The traps the gem calculator found on a tab's line, split by who falls
 *  into them (WO-ALL-OPENINGS-01 O2). Once per session; never rejects. */
export function builtGemsFor(opening: OpeningRecord, lineIndex: number): Promise<BuiltGems> {
  const line = sansOf(lineIndex === MAIN_LINE_INDEX ? opening.pgn : opening.variations?.[lineIndex]?.pgn);
  const key = `${opening.id}|${lineIndex}|${line.join(' ')}`;
  const hit = gems.get(key);
  if (hit) return hit;
  const job = clubGemsOnLine(line)
    .then((hits): BuiltGems => {
      const theirs = hits.filter((h) => h.gem.by !== opening.color)
        .map((h) => clubGemToPunishGem(h, opening.id))
        .filter((g): g is PunishGem => g !== null);
      return {
        weapons: theirs.filter(isWeaponGem),
        theirSlips: theirs.filter((g) => !isWeaponGem(g) && isKnownSlipGem(g)).sort((a, b) => b.games - a.games),
        watchOuts: hits.filter((h) => h.gem.by === opening.color)
          .sort((a, b) => b.gem.games - a.gem.games)
          .map(clubGemToMistake)
          .filter((m): m is CommonMistake => m !== null),
      };
    })
    .catch((): BuiltGems => ({ weapons: [], theirSlips: [], watchOuts: [] }))
    .then((r) => { if (r.weapons.length + r.theirSlips.length + r.watchOuts.length === 0) gems.delete(key); return r; });
  gems.set(key, job);
  return job;
}

const lineGames = new Map<string, Promise<LineGames>>();

/** A tab's model game and the endings its side won from it, from the master
 *  games (WO-ALL-OPENINGS-01 O6). Once per session; never rejects. */
export function builtGamesFor(opening: OpeningRecord, lineIndex: number): Promise<LineGames> {
  const line = sansOf(lineIndex === MAIN_LINE_INDEX ? opening.pgn : opening.variations?.[lineIndex]?.pgn);
  const key = `${opening.id}|${lineIndex}|${line.join(' ')}`;
  const hit = lineGames.get(key);
  if (hit) return hit;
  const job = modelGamesForLine(line, opening.color, opening.id)
    .catch((): LineGames => ({ modelGame: null, endgames: [] }))
    .then((r) => { if (!r.modelGame) lineGames.delete(key); return r; });
  lineGames.set(key, job);
  return job;
}
