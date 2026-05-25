// Extend a QG spine past the local-DB death point using the LIVE masters
// explorer (reachable in this sandbox). Each appended ply is masters-backed
// (game count printed) — DB-anchored per G3. chess.js gives UCI + legality.
import { Chess } from '../node_modules/chess.js/dist/esm/chess.js';
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
async function masters(uciCsv) {
  const url = `${PROXY}?source=masters&play=${uciCsv}`;
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`explorer ${r.status}`);
  return r.json();
}
async function walk(prefixSan, prefer = {}, target = 22, minGames = 8) {
  const c = new Chess();
  const uci = [];
  for (const m of prefixSan) { const mv = c.move(m); uci.push(mv.from + mv.to + (mv.promotion ?? '')); }
  const line = [...prefixSan];
  const trail = [];
  while (line.length < target) {
    let data;
    try { data = await masters(uci.join(',')); } catch (e) { trail.push(`[err ${e.message}]`); break; }
    const moves = data.moves ?? [];
    if (!moves.length) { trail.push('[dead]'); break; }
    const forced = prefer[line.length];
    let pick = forced ? moves.find((m) => m.san === forced) : moves[0];
    if (forced && !pick) { trail.push(`[MISS ${forced}]`); pick = moves[0]; }
    const games = (pick.white ?? 0) + (pick.draws ?? 0) + (pick.black ?? 0);
    if (games < minGames) { trail.push(`[thin<${minGames} ${pick.san}(${games})]`); break; }
    const mv = c.move(pick.san);
    uci.push(mv.from + mv.to + (mv.promotion ?? ''));
    line.push(pick.san);
    trail.push(`${pick.san}(${games})`);
  }
  return { line, trail, ply: line.length };
}
// Steering keyed by absolute ply-length BEFORE the move is appended — keeps
// each variation on its identity line where the raw most-popular move would
// drift into a sibling. Every steered move is verified present in masters
// (printed game count) so the spine stays DB-anchored.
const SPINES = {
  'Classical (MAIN pill)': [['d4','d5','c4','e6'],
    { 5:'Nf6', 6:'Bg5', 7:'Be7', 8:'e3', 9:'O-O', 10:'Nf3', 11:'Nbd7', 12:'Rc1', 13:'c6', 14:'Bd3', 15:'dxc4', 16:'Bxc4', 17:'Nd5', 18:'Bxe7', 19:'Qxe7', 20:'O-O', 21:'Nxc3' }],
  'Exchange': [['d4','d5','c4','e6','Nc3','Nf6','cxd5','exd5','Bg5','c6','e3','Be7'], {}],
  'Tartakower': [['d4','d5','c4','e6','Nc3','Be7','Nf3','Nf6','Bg5','h6','Bh4','O-O','e3','b6'], {}],
  'QGA': [['d4','d5','c4','dxc4','Nf3','Nf6','e3','e6','Bxc4','c5','O-O','a6'], {}],
  'Slav': [['d4','d5','c4','c6','Nf3','Nf6','Nc3','dxc4','a4','Bf5'], {}],
  'Semi-Slav': [['d4','d5','c4','c6','Nf3','Nf6','Nc3','e6','e3'], {}],
  'Catalan': [['d4','Nf6','c4','e6','g3','d5','Bg2','Be7','Nf3','O-O','O-O','dxc4'], {}],
  'Anti-QGD Bf4': [['d4','d5','c4','e6','Nc3','Nf6','Bf4'], {}],
};
const only = process.argv[2];
for (const [name, [prefix, prefer]] of Object.entries(SPINES)) {
  if (only && name !== only) continue;
  const { line, trail, ply } = await walk(prefix, prefer);
  console.log(`\n=== ${name} === (${ply} plies) ${ply>=20?'OK':'SHORT'}`);
  console.log('LINE:', line.join(' '));
  console.log('walk:', trail.join(' '));
}
