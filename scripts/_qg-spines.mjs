// Walk the LOCAL masters-db from each QG variation's defining prefix to >=20
// plies. STEER at named branch points (prefer a specific canonical move) so
// e.g. Classical stays the Orthodox main line instead of collapsing into the
// Exchange — but EVERY steered move is still verified present in the masters-db
// at that position (game count printed), so the spine stays DB-anchored (G3).
import fs from 'node:fs';
import { Chess } from '/home/user/chess-academy-pro/node_modules/chess.js/dist/esm/chess.js';
const db = JSON.parse(fs.readFileSync('/home/user/chess-academy-pro/public/data/openings-masters-db.json','utf8')).positions;
const key = (c) => c.fen().split(' ').slice(0,4).join(' ');
// prefer: map of ply-after-prefix index -> SAN to force (verified in db)
function walk(prefix, prefer = {}, target = 22, minGames = 4) {
  const c = new Chess();
  const line = [];
  const counts = [];
  for (const m of prefix) { c.move(m); line.push(m); }
  while (line.length < target) {
    const entry = db[key(c)];
    if (!entry || !entry.length) { counts.push('[dead]'); break; }
    const forced = prefer[line.length];
    let pick = forced ? entry.find((e) => e.san === forced) : entry[0];
    if (forced && !pick) { counts.push(`[MISS ${forced}!]`); pick = entry[0]; }
    if (!pick || pick.games < minGames) { counts.push(`[thin<${minGames}]`); break; }
    c.move(pick.san);
    line.push(pick.san);
    counts.push(`${pick.san}(${pick.games})`);
  }
  return { line, counts, ply: line.length };
}
// Steering keyed by absolute ply-length BEFORE the move is appended.
const VARS = {
  // Orthodox/Capablanca main line — steer Be7 (keep tension) not Exchange.
  'Classical (MAIN pill)': [['d4','d5','c4','e6'],
    { 5:'Nf6', 6:'Bg5', 7:'Be7', 8:'e3', 9:'O-O', 10:'Nf3', 11:'Nbd7', 12:'Rc1', 13:'c6', 14:'Bd3', 15:'dxc4', 16:'Bxc4', 17:'Nd5', 18:'Bxe7', 19:'Qxe7', 20:'O-O', 21:'Nxc3' }],
  'Exchange': [['d4','d5','c4','e6','Nc3','Nf6','cxd5','exd5','Bg5','c6','e3','Be7'],
    { 12:'Bd3', 13:'O-O', 14:'Qc2', 15:'Nbd7', 16:'Nge2', 17:'Re8', 18:'O-O', 19:'Nf8', 20:'Rab1', 21:'a5' }],
  'Tartakower': [['d4','d5','c4','e6','Nc3','Be7','Nf3','Nf6','Bg5','h6','Bh4','O-O','e3','b6'], {}],
  'QGA': [['d4','d5','c4','dxc4','Nf3','Nf6','e3','e6','Bxc4','c5','O-O','a6'],
    { 12:'Qe2', 13:'b5', 14:'Bb3', 15:'Bb7', 16:'Rd1', 17:'Nbd7', 18:'Nc3', 19:'Qb8', 20:'d5', 21:'exd5' }],
  'Slav': [['d4','d5','c4','c6','Nf3','Nf6','Nc3','dxc4','a4','Bf5'],
    { 10:'e3', 11:'e6', 12:'Bxc4', 13:'Bb4', 14:'O-O', 15:'Nbd7', 16:'Qe2', 17:'Bg6', 18:'e4', 19:'O-O', 20:'Bd3', 21:'Bh5' }],
  'Semi-Slav': [['d4','d5','c4','c6','Nf3','Nf6','Nc3','e6','e3'],
    { 9:'Nbd7', 10:'Bd3', 11:'dxc4', 12:'Bxc4', 13:'b5', 14:'Bd3', 15:'Bb7', 16:'O-O', 17:'a6', 18:'e4', 19:'c5', 20:'d5', 21:'Qc7' }],
  'Catalan': [['d4','Nf6','c4','e6','g3','d5','Bg2','Be7','Nf3','O-O','O-O','dxc4'],
    { 12:'Qc2', 13:'a6', 14:'a4', 15:'Bd7', 16:'Qxc4', 17:'Bc6', 18:'Bg5', 19:'Bd5', 20:'Qc2', 21:'Be4' }],
  'Anti-QGD Bf4': [['d4','d5','c4','e6','Nc3','Nf6','Bf4'],
    { 7:'Be7', 8:'e3', 9:'O-O', 10:'Nf3', 11:'c5', 12:'dxc5', 13:'Bxc5', 14:'a3', 15:'Nc6', 16:'Qc2', 17:'Qa5', 18:'Rd1', 19:'Rd8', 20:'Be2', 21:'Bd7' }],
};
for (const [name, [prefix, prefer]] of Object.entries(VARS)) {
  const { line, counts, ply } = walk(prefix, prefer);
  const ok = ply >= 20 ? 'OK' : 'SHORT';
  console.log(`\n=== ${name} === (${ply} plies) ${ok}`);
  console.log('  LINE:', line.join(' '));
  console.log('  walk:', counts.join(' '));
}
