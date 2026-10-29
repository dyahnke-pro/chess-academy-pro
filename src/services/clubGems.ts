// clubGems — THE TRAPS CLUB PLAYERS ACTUALLY FALL INTO, ON ANY LINE
// (WO-ALL-OPENINGS-01 O2, David 2026-10-28: "There has to be a way for the gem
// calculator to work" · "the sexy, juicy traps that attract beginners").
// Mined offline (`scripts/all-openings/mine-club-gems.mjs`) from every position
// club players under 1600 reached in 20+ games of a Lichess month: a move
// played in 1%+ of them that the other side's best play punishes by at least a
// piece or mate, played out to a quiet board, agreed by a second deeper read,
// and never a move masters play there. Ranked by juice. Read here as a LOOKUP
// (`isLookupPath` — never kept on the phone).
//
// A gem is found by its BOARD, so a line that reaches the slip's position by
// another move order still meets it; the gem is then replayed along the line's
// own moves. Every move is one club players played or the engine's (G3).
import { Chess } from 'chess.js';
import { loadDataJson } from './dataFile';
import { MATE_CP } from '../data/lessons/punishGems';
import type { PunishGem } from '../data/lessons/punishGems';
import type { AnnotationArrow, CommonMistake } from '../types';

export const CLUB_GEMS_PATH = '/data/club-gems.json';

export interface ClubGem {
  /** A TRAP (the punish wins a piece or mates — `TRAP_BAR_CP`) or a KNOWN
   *  MISTAKE (it costs a pawn or more and leaves the punisher half a pawn or
   *  better — never called a trap, F04). Absent in an index mined before the
   *  known tier: a trap. */
  tier?: 'trap' | 'known';
  /** The move order club players reached the slip's board by most. */
  line: string;
  slip: string;
  by: 'white' | 'black';
  /** The mover's best move instead (engine), when the miner read it. */
  best: string | null;
  /** Games under 1600 that played the slip, and its share of the position. */
  games: number;
  share: number;
  /** The slip's mover's score in those games (low: the trap works). */
  moverScore: number | null;
  punish: string;
  mate: boolean;
  /** Material the punish wins (pawns). */
  won: number;
  endCp: number;
  juice: number;
}

interface ClubGemFile { meta: { gems: number }; boards: Record<string, ClubGem[]> }

/** The opening id a gem filed by its board carries: it belongs to no one
 *  opening — any line that reaches the board meets it. */
export const CLUB_GEM_OPENING = 'club';

let fileJob: Promise<ClubGemFile | null> | null = null;
function gemFile(): Promise<ClubGemFile | null> {
  if (!fileJob) {
    fileJob = (loadDataJson(CLUB_GEMS_PATH) as Promise<ClubGemFile | null>).catch(() => null);
    void fileJob.then((f) => { if (!f) fileJob = null; });
  }
  return fileJob;
}

/** A gem met on a line: where on the line (`atPly`: the slip would be the
 *  line's move `atPly`) and the line's own moves to it. */
export interface GemOnLine { gem: ClubGem; atPly: number; prefix: string[] }

/** The gems whose slip position the line reaches (its start to its end), most
 *  juice first. A slip the line itself plays is not a gem of the line. Pure
 *  over the index. */
export function gemsOnLine(boards: ClubGemFile['boards'], lineSans: readonly string[]): GemOnLine[] {
  const out: GemOnLine[] = [];
  const c = new Chess();
  for (let k = 0; k <= lineSans.length; k += 1) {
    const key = c.fen().split(' ').slice(0, 4).join(' ');
    for (const gem of boards[key] ?? []) {
      if (gem.slip === lineSans[k]) continue;
      out.push({ gem, atPly: k, prefix: lineSans.slice(0, k) });
    }
    if (k === lineSans.length) break;
    try { c.move(lineSans[k]); } catch { break; }
  }
  return out.sort((a, b) => b.gem.juice - a.gem.juice);
}

/** Every gem in the index, by board. Null when the index cannot be read. */
export async function clubGemBoards(): Promise<ClubGemFile['boards'] | null> {
  return (await gemFile())?.boards ?? null;
}

/** The gems on a line, read from the index. Never rejects. */
export async function clubGemsOnLine(lineSans: readonly string[]): Promise<GemOnLine[]> {
  const file = await gemFile();
  return file ? gemsOnLine(file.boards, lineSans) : [];
}

const PIECE_WON: Array<[number, string]> = [[9, 'the queen'], [5, 'a rook'], [3, 'a piece'], [2, 'two pawns'], [1, 'a pawn']];
/** What the punish does, in words the board backs: a mate, the material it
 *  wins, or — an attack the engine reads as winning before any material falls
 *  (the Damiano's 4.Qh5+) — that it wins by force. A known mistake that wins
 *  no material leaves the punisher the better game, and says only that. */
function payoff(gem: ClubGem): string {
  if (gem.mate) return 'mates';
  const what = PIECE_WON.find(([v]) => gem.won >= v)?.[1];
  if (what) return `wins ${what}`;
  return gem.tier === 'known' ? 'takes the better game' : 'wins by force';
}

/** The gem's tier in the hand-written gems' terms: a trap is `confirmed` with
 *  its end eval (it clears `TRAP_BAR_CP`); a known mistake is `confirmed` from
 *  a pawn, `positional` under it — so `isWeaponGem` keeps it off every trap
 *  surface and `isKnownSlipGem` keeps it on the principle ones. */
function punishTier(gem: ClubGem): PunishGem['tier'] {
  return gem.tier === 'known' && gem.endCp < 100 ? 'positional' : 'confirmed';
}

/** The opponent's slip as a weapon gem on `openingId`'s tab — the shape the
 *  weapon section plays (`gemToPlayableLine`), narrated on the fly
 *  (`computed`). Pure. */
export function clubGemToPunishGem(hit: GemOnLine, openingId: string): PunishGem | null {
  const punishSeq = hit.gem.punish.split(/\s+/).filter(Boolean);
  if (punishSeq.length === 0) return null;
  const c = new Chess();
  try {
    for (const s of [...hit.prefix, hit.gem.slip, ...punishSeq]) c.move(s);
  } catch {
    return null;
  }
  const playLine = [...hit.prefix, hit.gem.slip, ...punishSeq].join(' ');
  return {
    openingId,
    lineMoves: hit.prefix.join(' '),
    inaccuracy: hit.gem.slip,
    freqPct: hit.gem.share,
    games: hit.gem.games,
    practicalScore: hit.gem.moverScore === null ? 0 : 100 - hit.gem.moverScore,
    mainMove: hit.gem.best ?? '',
    punish: punishSeq[0],
    punishSeq,
    playLine,
    engineCp: hit.gem.mate ? MATE_CP : hit.gem.endCp,
    tier: punishTier(hit.gem),
    why: `${hit.gem.share}% of club players under 1600 play ${hit.gem.slip} here, and ${punishSeq[0]} ${payoff(hit.gem)}.`,
    computed: true,
  };
}

/** A gem as the gem index files it: by its board, under no opening, from the
 *  move order clubs reached it by. No replay — the board key IS the index key,
 *  and every surface that uses a gem replays its line and drops it when the
 *  line does not play. Pure. */
export function clubGemForIndex(gem: ClubGem): PunishGem | null {
  const punishSeq = gem.punish.split(/\s+/).filter(Boolean);
  if (punishSeq.length === 0) return null;
  const lineMoves = gem.line.trim();
  return {
    openingId: CLUB_GEM_OPENING,
    lineMoves,
    inaccuracy: gem.slip,
    freqPct: gem.share,
    games: gem.games,
    practicalScore: gem.moverScore === null ? 0 : 100 - gem.moverScore,
    mainMove: gem.best ?? '',
    punish: punishSeq[0],
    punishSeq,
    playLine: [lineMoves, gem.slip, ...punishSeq].filter(Boolean).join(' '),
    engineCp: gem.mate ? MATE_CP : gem.endCp,
    tier: punishTier(gem),
    why: `${gem.share}% of club players under 1600 play ${gem.slip} here, and ${punishSeq[0]} ${payoff(gem)}.`,
    computed: true,
  };
}

/** The student's OWN slip as a watch-out: the position, the slip, the move to
 *  play instead and the punishment played out. Null without the engine's
 *  move. Pure. */
export function clubGemToMistake(hit: GemOnLine): CommonMistake | null {
  if (!hit.gem.best) return null;
  const c = new Chess();
  try { for (const s of hit.prefix) c.move(s); } catch { return null; }
  const fen = c.fen();
  try { new Chess(fen).move(hit.gem.best); new Chess(fen).move(hit.gem.slip); } catch { return null; }
  const punishSeq = hit.gem.punish.split(/\s+/).filter(Boolean);
  const explanation = `${hit.gem.share}% of club players under 1600 play ${hit.gem.slip} here, and ${punishSeq[0] ?? 'the reply'} ${payoff(hit.gem)}. ${hit.gem.best} keeps the position.`;
  // Watch plays the slip punished; Learn and Practice drill the move instead.
  const shown = [hit.gem.slip, ...punishSeq];
  const arrows: AnnotationArrow[][] = [];
  const board = new Chess(fen);
  for (const s of shown) {
    let mv;
    try { mv = board.move(s); } catch { return null; }
    arrows.push([{ from: mv.from, to: mv.to, color: 'orange' }]);
  }
  return {
    fen,
    wrongMove: hit.gem.slip,
    correctMove: hit.gem.best,
    explanation,
    lineMoves: [...hit.prefix],
    punishmentLine: {
      fen,
      moves: shown,
      annotations: shown.map((_, i) => (i === 0 ? explanation : '')),
      arrows,
      title: `${hit.gem.slip}? — ${punishSeq[0] ?? ''} ${payoff(hit.gem)}`.trim(),
    },
  };
}

/** Test seam. */
export function __resetClubGems(): void {
  fileJob = null;
}
