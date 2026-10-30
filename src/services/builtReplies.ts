// builtReplies — EVERY TAB'S REPLIES, BUILT FROM THE GAMES (WO-ALL-OPENINGS-01,
// David 2026-10-28: "all opening masterclasses and all tabs in the opening
// should now have every subline and tabia listed out … match the depth of
// chessable"). The reply tree read only `course-sublines.json`, built offline
// for the ~150 taught openings, so the ~2,700 openings built from the games
// showed none and the taught ones stopped at what that build kept. This builds
// the selected tab's replies from the stored trees (the master tree, then the
// strong-online tree past it — `storedTreeAt`, the games that built the line)
// when the tab is opened (`gamesCourse.buildReplies`) — every move a move
// strong players played (G3) — once per session. The curated replies still
// come first (`ReplyTree`).
import type { CommonMistake, MiddlegamePlan, OpeningRecord, OpeningReply } from '../types';
import { clubGemsOnLine, clubGemToMistake, clubGemToPunishGem } from './clubGems';
import { modelGamesForLine } from './modelGameIndex';
import type { LineGames } from './modelGameIndex';
import { isKnownSlipGem, isWeaponGem } from '../data/lessons/punishGems';
import type { PunishGem } from '../data/lessons/punishGems';
import { buildReplies } from './gamesCourse';
import { tabPlanFor } from './computedPlan';
import { storedTreeAt, storedTreeAnswer } from './deepTree';
import { detectOpening, normForFamily, resolveOpeningEntry } from './openingDetectionService';
import { openingFamily } from './openingKey';
import { MAIN_LINE_INDEX } from '../utils/wlppLadder';
import { branchPly, sansOf, tabLineSans } from './tabLine';

/** The first ply that is inside the opening: replies before it leave the
 *  opening (1…c5 against a Vienna is the Sicilian, not a reply). The family is
 *  matched through the one family normalizer: the course spells "Caro-Kann
 *  Defence", the database "Caro-Kann Defense", and a plain lowercase compare
 *  never matched — every British-spelled page fell to the ply-4 fallback and
 *  lost its earlier replies (1.e4 c6 2.Nf3 / 2.c4 on the Caro-Kann). Pure. */
export function openingStartPly(lineSans: readonly string[], openingName: string): number {
  // The family is the database's name for it, never the page's own label: a
  // page called "Sicilian: Dragon" has the family "Sicilian", which no
  // database name carries ("Sicilian Defense"), so the walk fell back to ply 4
  // and hid 2.c3 from a Dragon page.
  const family = normForFamily(openingFamily(resolveOpeningEntry(openingName)?.canonicalName ?? openingName));
  for (let n = 1; n <= lineSans.length; n += 1) {
    const d = detectOpening([...lineSans.slice(0, n)]);
    if (d && normForFamily(openingFamily(d.name)) === family) return n;
  }
  return Math.min(lineSans.length, 4);
}

/** The first ply a page's REPLIES may sit on (WO-ALL-OPENINGS-01 O10).
 *  Inside the opening (`openingStartPly`), and — when the page is named by the
 *  OPPONENT's move — after that move: on the Mengarini page (1.e4 c5 2.a3, a
 *  Black student) 2.Nf3 is not a reply, it is another Sicilian with its own
 *  page. When the STUDENT's move names the page (the Najdorf's …a6, the
 *  Caro-Kann's …c6), the opponent's moves before it stay: a Najdorf player
 *  still meets 2.c3. Pure over the opening DB. */
export function replyStartPly(lineSans: readonly string[], openingName: string, student: 'white' | 'black'): number {
  const family = openingStartPly(lineSans, openingName);
  // THE MOVE THAT NAMES THE PAGE is the first ply this line carries the name
  // on — never the end of the longest database line under that name. The
  // resolver keeps the longest line (the Dragon's runs on to 6.Be3, the
  // London's to 3…d6), so both pages read as named by the opponent's move and
  // hid every reply before it, 3.Bb5+ and 6.Be2 against the Dragon included.
  const name = resolveOpeningEntry(openingName)?.canonicalName;
  let namedAt = 0;
  if (name) {
    for (let n = 1; n <= lineSans.length; n += 1) {
      if (detectOpening([...lineSans.slice(0, n)])?.name === name) { namedAt = n; break; }
    }
  }
  if (namedAt === 0) return family;
  const namedBy: 'white' | 'black' = (namedAt - 1) % 2 === 0 ? 'white' : 'black';
  return namedBy === student ? family : Math.max(family, namedAt);
}

/** A reply that IS another taught line (a tab, or the main line) is shown
 *  there, never twice. Pure. */
export function isTaughtLine(reply: OpeningReply, lines: readonly (readonly string[])[]): boolean {
  return lines.some((l) => l.length > reply.atPly && l.slice(0, reply.atPly + 1).every((san, k) => san === reply.moves[k]));
}

const built = new Map<string, Promise<OpeningReply[]>>();

/** A tab's line — the one reader in `tabLine`, re-exported for the reply
 *  tree, which reads it beside the floor. */
export { tabLineSans };

/** The first ply a tab's replies may sit on — the ONE rule for every reply
 *  source (the games, the club): inside the opening (`replyStartPly`), and on
 *  a variation tab after it leaves the main line, since a reply on the trunk
 *  the two share is the main line's. Pure over the opening DB. */
export function replyFloorPly(opening: OpeningRecord, lineIndex: number): number {
  const line = tabLineSans(opening, lineIndex);
  const start = replyStartPly(line, opening.name, opening.color);
  return lineIndex === MAIN_LINE_INDEX ? start : Math.max(start, branchPly(line, sansOf(opening.pgn)) + 1);
}

/** The replies of one tab (`lineIndex`, MAIN_LINE_INDEX for the main line),
 *  read off the stored trees. Never rejects; [] when the trees have none. */
export function builtRepliesFor(opening: OpeningRecord, lineIndex: number): Promise<OpeningReply[]> {
  const key = `${opening.id}|${lineIndex}|${lineIndex === MAIN_LINE_INDEX ? opening.pgn : opening.variations?.[lineIndex]?.pgn ?? ''}`;
  const hit = built.get(key);
  if (hit) return hit;
  const main = sansOf(opening.pgn);
  const tabs = (opening.variations ?? []).map((v) => sansOf(v.pgn));
  const line = lineIndex === MAIN_LINE_INDEX ? main : tabs[lineIndex] ?? [];
  const from = replyFloorPly(opening, lineIndex);
  const others = [main, ...tabs].filter((_, k) => k - 1 !== lineIndex);
  const job = buildReplies(line, from, opening.color, { lookup: storedTreeAt })
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
  const line = tabLineSans(opening, lineIndex);
  const key = `${opening.id}|${lineIndex}|${line.join(' ')}`;
  const hit = plans.get(key);
  if (hit) return hit;
  // The plan reads the games that built the line — the master tree, then the
  // stored online tree past it (O9) — and never the live explorer: its walk
  // reads dozens of boards, and the proxy was refused within ten live reads
  // when a plan walked them (2026-10-29).
  const job = tabPlanFor(opening, lineIndex, storedTreeAnswer)
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
  const line = tabLineSans(opening, lineIndex);
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
  const line = tabLineSans(opening, lineIndex);
  const key = `${opening.id}|${lineIndex}|${line.join(' ')}`;
  const hit = lineGames.get(key);
  if (hit) return hit;
  const job = modelGamesForLine(line, opening.color, opening.id)
    .catch((): LineGames => ({ modelGame: null, endgames: [] }))
    .then((r) => { if (!r.modelGame) lineGames.delete(key); return r; });
  lineGames.set(key, job);
  return job;
}
