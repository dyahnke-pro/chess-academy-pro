/**
 * fetch-user-games — pull a chess.com user's recent PUBLIC games and emit them
 * in the app's GameRecord shape, for seeding an audit browser's IndexedDB so
 * the grounded verticals return REAL data. Public API, no auth.
 *   node scripts/fetch-user-games.mjs <username> [maxGames] > games.json
 */
const USER = process.argv[2];
const MAX = Number(process.argv[3] ?? 300);
if (!USER) { console.error('usage: node fetch-user-games.mjs <username> [maxGames]'); process.exit(1); }
const UA = { 'User-Agent': 'chess-academy-audit/1.0' };
const lc = USER.toLowerCase();

const arch = await (await fetch(`https://api.chess.com/pub/player/${lc}/games/archives`, { headers: UA })).json();
const months = arch.archives.slice().reverse(); // newest first

function resultOf(g) {
  const w = g.white.result, b = g.black.result;
  if (w === 'win') return '1-0';
  if (b === 'win') return '0-1';
  return '1/2-1/2';
}
function ecoOf(pgn) { const m = /\[ECO "([^"]+)"\]/.exec(pgn); return m ? m[1] : null; }
function dateOf(pgn, end) {
  const m = /\[Date "([^"]+)"\]/.exec(pgn); if (m) return m[1].replace(/\./g, '-');
  return new Date(end * 1000).toISOString().slice(0, 10);
}

const out = [];
for (const url of months) {
  if (out.length >= MAX) break;
  let month;
  try { month = await (await fetch(url, { headers: UA })).json(); } catch { continue; }
  const games = (month.games ?? []).slice().reverse(); // newest first within month
  for (const g of games) {
    if (out.length >= MAX) break;
    if (g.rules && g.rules !== 'chess') continue; // skip variants
    if (!g.pgn) continue;
    out.push({
      id: g.uuid ?? g.url ?? `${lc}-${out.length}`,
      pgn: g.pgn,
      white: g.white.username,
      black: g.black.username,
      result: resultOf(g),
      date: dateOf(g.pgn, g.end_time),
      event: `Chess.com ${g.time_class ?? ''}`.trim(),
      eco: ecoOf(g.pgn),
      whiteElo: g.white.rating ?? null,
      blackElo: g.black.rating ?? null,
      source: 'chesscom',
      termination: (g.white.result !== 'win' ? g.white.result : g.black.result),
      annotations: null,
      coachAnalysis: null,
      isMasterGame: false,
      openingId: null,
      timeControlId: undefined,
    });
  }
}
console.error(`[fetch] ${out.length} games for ${USER}`);
process.stdout.write(JSON.stringify(out));
