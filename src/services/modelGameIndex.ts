// modelGameIndex — A MODEL GAME AND ITS ENDGAMES FOR ANY LINE
// (WO-ALL-OPENINGS-01 O6, David 2026-10-28: "The builder needs to be able to
// build all aspects of the opening tabs on the fly. Middle games, gems, end
// game, etc."). Built offline from The Week in Chess
// (`scripts/all-openings/build-model-games.mjs`): for every board 50+ master
// games reached, the strongest win for each side that passed through it, and
// the endings that side won from there with their share. Read here as LOOKUPS
// (`isLookupPath` — never kept on the phone).
//
// A line meets its model game at the deepest board on it the index holds; the
// endgame is that win carried into the ending it reached (the endgame
// doctrine: a real master game of the same line, walked into its ending).
// Every move is a move masters played (G3); every word is a count (G0).
import { Chess } from 'chess.js';
import { loadDataJson } from './dataFile';
import type { MiddlegamePlan, ModelGame, PlayableMiddlegameLine } from '../types';

export const MODEL_GAMES_BASE = '/data/model-games/';
/** The index starts this deep: earlier boards are every game's. */
const FIRST_PLY = 10;
/** Plies of an ending shown from the board it began on. */
const ENDING_PLIES = 30;

interface SideEntry { wins: number; game: number; endings: Array<{ kind: string; share: number; game: number }> }
type IndexFile = Record<string, { w?: SideEntry; b?: SideEntry }>;
export interface GameRecord {
  white: string; black: string; wElo: number; bElo: number; event: string; year: number | null;
  result: '1-0' | '0-1'; sans: string; eg: { ply: number; kind: string } | null;
}

/** FNV-1a — the master tree's board hash (`masterTree.boardHash`). Pure. */
function boardHash(key: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const jobs = new Map<string, Promise<unknown>>();
function lookup<T>(path: string): Promise<T | null> {
  let job = jobs.get(path);
  if (!job) {
    job = loadDataJson(path).catch(() => null);
    jobs.set(path, job);
    void job.then((v) => { if (!v) jobs.delete(path); });
  }
  return job as Promise<T | null>;
}

async function gameRecord(n: number): Promise<GameRecord | null> {
  const meta = await lookup<{ gameFiles: number }>(`${MODEL_GAMES_BASE}meta.json`);
  if (!meta) return null;
  const file = await lookup<Record<string, GameRecord>>(`${MODEL_GAMES_BASE}games/${n % meta.gameFiles}.json`);
  return file?.[String(n)] ?? null;
}

const lastName = (s: string): string => s.split(',')[0].trim();

/** The record as a model game the section and viewer read. Pure. */
export function recordToModelGame(n: number, rec: GameRecord, openingId: string, side: 'white' | 'black', wins: number): ModelGame {
  const winnerWhite = rec.result === '1-0';
  const [winner, winnerElo, loser, loserElo] = winnerWhite
    ? [rec.white, rec.wElo, rec.black, rec.bElo]
    : [rec.black, rec.bElo, rec.white, rec.wElo];
  const moves = Math.ceil(rec.sans.split(' ').length / 2);
  return {
    id: `computed-mg-${n}`,
    openingId,
    white: rec.white,
    black: rec.black,
    whiteElo: rec.wElo,
    blackElo: rec.bElo,
    result: rec.result,
    year: rec.year ?? 0,
    event: rec.event,
    pgn: rec.sans,
    studentSide: side,
    overview: `${lastName(winner)} (${winnerElo}) beat ${lastName(loser)} (${loserElo}) in ${moves} moves — the strongest win for ${side === 'white' ? 'White' : 'Black'} among the ${wins.toLocaleString('en-US')} master wins that passed through this line.`,
    criticalMoments: [],
    middlegameTheme: rec.eg ? `Won in a ${rec.eg.kind} ending` : '',
    lessonSummary: '',
  };
}

/** One ending that side won from the line, as an endgame plan: the master
 *  game's own moves to the board the ending began on (`lineMoves`, Gate C),
 *  then the ending played out. Null when the record has no ending. Pure. */
export function recordToEndgamePlan(n: number, rec: GameRecord, openingId: string, kind: string, share: number): MiddlegamePlan | null {
  if (!rec.eg) return null;
  const sans = rec.sans.split(' ');
  const c = new Chess();
  try { for (const s of sans.slice(0, rec.eg.ply)) c.move(s); } catch { return null; }
  const fen = c.fen();
  const tail = sans.slice(rec.eg.ply, rec.eg.ply + ENDING_PLIES);
  const arrows: PlayableMiddlegameLine['arrows'] = [];
  const play = new Chess(fen);
  for (const s of tail) {
    let mv;
    try { mv = play.move(s); } catch { return null; }
    arrows.push([{ from: mv.from, to: mv.to, color: 'orange' }]);
  }
  if (tail.length < 4) return null;
  const winner = rec.result === '1-0' ? rec.white : rec.black;
  return {
    id: `computed-eg-${n}-${kind.replace(/\s+/g, '-')}-endgame`,
    openingId,
    criticalPositionFen: fen,
    lineMoves: sans.slice(0, rec.eg.ply),
    title: `The ${kind} ending`,
    overview: `${share}% of the master wins from this line reached a ${kind} ending. ${lastName(winner)} won this one (${rec.event}${rec.year ? ` ${rec.year}` : ''}).`,
    pawnBreaks: [],
    pieceManeuvers: [],
    strategicThemes: [],
    endgameTransitions: [],
    playableLines: [{ fen, moves: tail, annotations: tail.map(() => ''), arrows, title: `How ${lastName(winner)} won the ${kind} ending` }],
  };
}

export interface LineGames { modelGame: ModelGame | null; endgames: MiddlegamePlan[] }

/** The model game and endgames for a line, from the deepest board on it the
 *  index holds for the student's side. Never rejects. */
export async function modelGamesForLine(lineSans: readonly string[], side: 'white' | 'black', openingId: string): Promise<LineGames> {
  const keys: string[] = [];
  const c = new Chess();
  for (const s of lineSans) {
    try { c.move(s); } catch { break; }
    keys.push(c.fen().split(' ').slice(0, 4).join(' '));
  }
  const color = side === 'white' ? 'w' : 'b';
  for (let i = keys.length - 1; i >= FIRST_PLY - 1; i -= 1) {
    const h = boardHash(keys[i]);
    const index = await lookup<IndexFile>(`${MODEL_GAMES_BASE}index/${h.slice(0, 2)}.json`);
    const entry = index?.[keys[i]]?.[color];
    if (!entry) continue;
    const rec = await gameRecord(entry.game);
    const modelGame = rec ? recordToModelGame(entry.game, rec, openingId, side, entry.wins) : null;
    const endgames: MiddlegamePlan[] = [];
    for (const e of entry.endings) {
      const er = await gameRecord(e.game);
      const plan = er ? recordToEndgamePlan(e.game, er, openingId, e.kind, e.share) : null;
      if (plan) endgames.push(plan);
    }
    return { modelGame, endgames };
  }
  return { modelGame: null, endgames: [] };
}

/** Test seam. */
export function __resetModelGameIndex(): void {
  jobs.clear();
}

