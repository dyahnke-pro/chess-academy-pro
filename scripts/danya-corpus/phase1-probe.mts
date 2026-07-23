// Phase-1 dial-in probe: run OUR opening-theory lecture on a rebuilt Danya game
// and print the beats, so we can compare to his actual transcript. Pure
// functions + the shipped masters DB (no browser).
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildOpeningTheoryLecture, buildTheoryLectureBeats, resolveOpeningIdeas } from '../../src/services/reviewOpeningTheory';
import { detectOpeningTranspositional } from '../../src/services/openingDetectionService';
import type { MasterPlayResult, MasterPlayMove } from '../../src/services/masterPlayTypes';

const dbRaw = JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8')) as { positions: Record<string, Array<{ san: string; games: number; rating?: number; white?: number; draws?: number; black?: number }>> };
const positions = dbRaw.positions;
const key = (fen: string): string => fen.split(/\s+/).slice(0, 4).join(' ');
// Rich review sidecar (W/D/L + topGames) — consulted FIRST, exactly like the app.
const sidecar = JSON.parse(readFileSync('public/data/danya-review-openings.json', 'utf8')) as Record<string, { totalGames: number; moves: Array<{ san: string; games: number; white?: number; draws?: number; black?: number }>; topGames?: Array<{ white?: string; black?: string; year?: number; result?: string }> }>;

const lookup = async (fen: string): Promise<MasterPlayResult> => {
  const k = key(fen);
  const rich = sidecar[k];
  if (rich && rich.moves.length > 0) {
    const moves: MasterPlayMove[] = [...rich.moves].sort((a, b) => b.games - a.games).map((m) => {
      const w = m.white ?? 0, d = m.draws ?? 0, b = m.black ?? 0, g = w + d + b || m.games;
      return { san: m.san, games: m.games, white: w, draws: d, black: b, whitePct: g ? w / g : 0, drawPct: g ? d / g : 0, blackPct: g ? b / g : 0 };
    });
    return { fen: k, totalGames: rich.totalGames, moves, source: 'local', topGames: rich.topGames } as MasterPlayResult;
  }
  const raw = positions[k] ?? [];
  const total = raw.reduce((s, m) => s + m.games, 0);
  const moves: MasterPlayMove[] = raw.map((m) => {
    const w = m.white ?? 0, d = m.draws ?? 0, b = m.black ?? 0;
    const g = m.games || (w + d + b);
    return { san: m.san, games: m.games, white: w, draws: d, black: b, whitePct: g ? w / g : 0, drawPct: g ? d / g : 0, blackPct: g ? b / g : 0, averageRating: m.rating };
  });
  return { fen: k, totalGames: total, moves, source: total > 0 ? 'local' : 'none' } as MasterPlayResult;
};

function movesFromPgn(pgn: string): { sans: string[]; fens: string[] } {
  const c = new Chess();
  c.loadPgn(pgn);
  const history = c.history();
  const replay = new Chess();
  const fens = [replay.fen()];
  const sans: string[] = [];
  for (const san of history) {
    replay.move(san);
    sans.push(san);
    fens.push(replay.fen());
  }
  return { sans, fens };
}

const file = process.argv[2] ?? 'data/sources/danya-10games/fABTn305.pgn';
const color = (process.argv[3] as 'white' | 'black') ?? 'black';
const pgn = readFileSync(file, 'utf8');
const { sans, fens } = movesFromPgn(pgn);
const openingName = detectOpeningTranspositional(sans.slice(0, 12))?.name ?? 'this opening';

console.log(`\n=== ${file} ===`);
console.log(`detected opening name: ${openingName}`);
console.log(`first 14 sans: ${sans.slice(0, 14).join(' ')}`);

const lec = await buildOpeningTheoryLecture(fens, sans, openingName, { lookup });
if (!lec) { console.log('NO LECTURE (left book immediately / DB miss)'); process.exit(0); }
console.log(`\nlecture: ${lec.branches.length} branches, startGames=${lec.startGames}, departurePly=${lec.departurePly}`);
const beats = buildTheoryLectureBeats(lec, resolveOpeningIdeas(openingName), color);
console.log(`\n--- ${beats.length} BEATS (what our coach says in Phase 1) ---\n`);
for (const b of beats) {
  console.log(`[${b.kind}] mv${b.moveNumber} ${b.moverColor}${b.showSan ? ` show:${b.showSan}` : ''}`);
  console.log(`   ${b.fact}`);
  if (b.dive?.length) console.log(`   DIVE: ${b.dive.map((d) => d.san).join(' ')}`);
  console.log();
}
