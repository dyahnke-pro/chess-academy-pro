// Fetch a chess.com live game by id, decode its TCN moveList to a SAN PGN,
// validate with chess.js. Usage: node scripts/fetch-chesscom-game.mjs <gameId>
import { Chess } from 'chess.js';

const TCN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?{~}(^)[_]@#$';

function decodeTcn(moveList) {
  const moves = [];
  for (let i = 0; i < moveList.length; i += 2) {
    const move = {};
    let p1 = TCN.indexOf(moveList[i]);
    let p2 = TCN.indexOf(moveList[i + 1]);
    if (p2 > 63) {
      move.promotion = 'qnrbkp'[Math.floor((p2 - 64) / 3)];
      p2 = p1 + (p1 < 16 ? -8 : 8) + ((p2 - 64) % 3) - 1;
    }
    if (p1 > 75) {
      move.drop = 'pnbrqk'[p1 - 79];
    } else {
      move.from = TCN[p1 % 8] + (Math.floor(p1 / 8) + 1);
    }
    move.to = TCN[p2 % 8] + (Math.floor(p2 / 8) + 1);
    moves.push(move);
  }
  return moves;
}

export async function fetchChesscomGame(gameId) {
  const res = await fetch(`https://www.chess.com/callback/live/game/${gameId}`, {
    headers: { 'User-Agent': 'chess-academy-pro/audit' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for game ${gameId}`);
  const json = await res.json();
  const g = json.game;
  const h = g.pgnHeaders ?? {};
  const decoded = decodeTcn(g.moveList);
  const chess = new Chess();
  const sans = [];
  for (const m of decoded) {
    const made = chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    if (!made) throw new Error(`illegal decoded move ${JSON.stringify(m)} at ply ${sans.length + 1}`);
    sans.push(made.san);
  }
  return {
    gameId,
    white: h.White,
    black: h.Black,
    whiteElo: h.WhiteElo ? Number(h.WhiteElo) : undefined,
    blackElo: h.BlackElo ? Number(h.BlackElo) : undefined,
    result: h.Result,
    year: h.Date ? Number(String(h.Date).slice(0, 4)) : undefined,
    eco: h.ECO,
    event: h.Event,
    pgn: sans.join(' '),
    plies: sans.length,
    sans,
    url: `https://www.chess.com/game/live/${gameId}`,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const id = process.argv[2];
  fetchChesscomGame(id)
    .then((g) => {
      console.log(`${g.white} (${g.whiteElo}) vs ${g.black} (${g.blackElo})  ${g.result}  ${g.eco} ${g.year}`);
      console.log(`${g.plies} plies / ${Math.ceil(g.plies / 2)} moves`);
      console.log(g.pgn);
    })
    .catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
}
