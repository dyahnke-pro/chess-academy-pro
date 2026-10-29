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
import { andList, countWord } from '../utils/andList';
import type { MiddlegamePlan, ModelGame, ModelGameCriticalMoment, PlayableMiddlegameLine } from '../types';

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

const boardOf = (c: Chess): string => c.fen().split(' ').slice(0, 4).join(' ');
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE: Record<string, [string, string]> = {
  q: ['the queen', 'queens'], r: ['a rook', 'rooks'], b: ['a bishop', 'bishops'], n: ['a knight', 'knights'], p: ['a pawn', 'pawns'],
};
/** Material won before material only counts once it holds this many plies. */
const HOLD_PLIES = 2;

type Counts = Record<'w' | 'b', Record<string, number>>;
function counts(c: Chess): Counts {
  const out: Counts = { w: { q: 0, r: 0, b: 0, n: 0, p: 0 }, b: { q: 0, r: 0, b: 0, n: 0, p: 0 } };
  for (const row of c.board()) for (const p of row) if (p && p.type !== 'k') out[p.color][p.type] += 1;
  return out;
}
const points = (side: Record<string, number>): number => Object.entries(side).reduce((a, [t, k]) => a + VALUE[t] * k, 0);

/** "a knight", "two pawns", "the queen" — what one side gave up between two
 *  boards, in the order queen → pawn. */
function lostPieces(before: Record<string, number>, after: Record<string, number>): { words: string[]; types: string[] } {
  const words: string[] = []; const types: string[] = [];
  for (const t of ['q', 'r', 'b', 'n', 'p']) {
    const k = before[t] - after[t];
    if (k <= 0) continue;
    words.push(k === 1 ? PIECE[t][0] : `${countWord(k)} ${PIECE[t][1]}`);
    for (let i = 0; i < k; i += 1) types.push(t);
  }
  return { words, types };
}

function momentAt(ply: number, annotation: string, concept: string): ModelGameCriticalMoment {
  return { moveNumber: Math.ceil(ply / 2), color: ply % 2 === 1 ? 'white' : 'black', annotation, concept };
}

/** THE MODEL GAME, NARRATED FROM ITS OWN MOVES (WO-ALL-OPENINGS-01 O6). Four
 *  kinds of moment, every one counted off the board — no engine, no prose
 *  model (G0): where the game leaves the student's line (or reaches its end),
 *  each time the winner's material lead grows by two points and holds, the
 *  board the ending began on, and how the game finished. Spectator register:
 *  the players by name, since the student plays neither side. Pure. */
export function modelGameMoments(rec: GameRecord, lineSans: readonly string[]): ModelGameCriticalMoment[] {
  const sans = rec.sans.split(' ');
  const winnerColor: 'w' | 'b' = rec.result === '1-0' ? 'w' : 'b';
  const loserColor: 'w' | 'b' = winnerColor === 'w' ? 'b' : 'w';
  const winner = lastName(winnerColor === 'w' ? rec.white : rec.black);
  const line = new Map<string, number>();
  const lc = new Chess();
  for (let i = 0; i < lineSans.length; i += 1) {
    try { lc.move(lineSans[i]); } catch { break; }
    line.set(boardOf(lc), i + 1);
  }
  const c = new Chess();
  const boards: Counts[] = [counts(c)];
  const captured: boolean[] = [false];
  let lastOnLine: { ply: number; linePly: number } | null = null;
  for (let i = 0; i < sans.length; i += 1) {
    let mv;
    try { mv = c.move(sans[i]); } catch { return []; }
    boards.push(counts(c));
    captured.push(Boolean(mv.captured));
    const at = line.get(boardOf(c));
    if (at !== undefined) lastOnLine = { ply: i + 1, linePly: at };
  }
  const plies = sans.length;
  const moments: ModelGameCriticalMoment[] = [];
  if (lastOnLine && lastOnLine.ply < plies) {
    moments.push(momentAt(lastOnLine.ply, lastOnLine.linePly === line.size
      ? 'Your line ends here. From now on the players choose their own moves.'
      : 'The game leaves your line after this move.', 'line'));
  }
  const lead = (b: Counts): number => points(b[winnerColor]) - points(b[loserColor]);
  let mark = 0;
  for (let i = 1; i <= plies; i += 1) {
    const hold = Math.min(...boards.slice(i, Math.min(plies, i + HOLD_PLIES) + 1).map(lead));
    if (lead(boards[i]) < mark + 2 || hold < mark + 2) continue;
    // The trade that led into it is part of the same story: count from the
    // board before the first capture of the run.
    let from = i - 1;
    while (from > 0 && captured[from]) from -= 1;
    const to = Math.min(plies, i + HOLD_PLIES);
    const won = lostPieces(boards[from][loserColor], boards[to][loserColor]);
    const gave = lostPieces(boards[from][winnerColor], boards[to][winnerColor]);
    mark = hold;
    if (won.words.length === 0) continue;
    const exchange = won.types.join('') === 'r' && (gave.types.join('') === 'b' || gave.types.join('') === 'n');
    const what = exchange ? 'the exchange' : `${andList(won.words)}${gave.words.length ? ` for ${andList(gave.words)}` : ''}`;
    moments.push(momentAt(i, `${winner} wins ${what}: ${countWord(hold)} point${hold === 1 ? '' : 's'} of material up.`, 'material'));
  }
  if (rec.eg && rec.eg.ply > 0 && rec.eg.ply <= plies) {
    moments.push(momentAt(rec.eg.ply, `The ${rec.eg.kind} ending starts here.`, 'ending'));
  }
  moments.push(momentAt(plies, c.isCheckmate() ? 'Checkmate.' : `${winner} won from here.`, 'result'));
  // One moment per move: the later kinds speak the more decisive news.
  const byMove = new Map<string, ModelGameCriticalMoment>();
  for (const m of moments) byMove.set(`${m.moveNumber}-${m.color}`, m);
  return [...byMove.values()].sort((a, b) => a.moveNumber - b.moveNumber || (a.color === 'white' ? -1 : 1));
}

/** The record as a model game the section and viewer read. Pure. */
export function recordToModelGame(n: number, rec: GameRecord, openingId: string, side: 'white' | 'black', wins: number, lineSans: readonly string[]): ModelGame {
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
    criticalMoments: modelGameMoments(rec, lineSans),
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
    const modelGame = rec ? recordToModelGame(entry.game, rec, openingId, side, entry.wins, lineSans) : null;
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

