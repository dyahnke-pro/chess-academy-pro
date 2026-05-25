import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const EX = 'https://chess-academy-pro.vercel.app/api/lichess-game-export?id=';

// Real Black-winning master games, one per variation (Rubinstein omitted — the
// masters DB has no Black win in its topGames; it self-hides, empty > losing).
// criticalMoment = the keystone where the variation's signature structure is on
// the board; annotation describes that achieved structure (Black-oriented).
const GAMES = [
  { id: 'mg-french-advance', gameId: 'e09n1mAb', openingId: 'french-defence',
    cmMove: 14, concept: 'The queenside clamp',
    overview: 'Advance Variation — Carlsen grinds down Giri from the Black side. The locked centre hands Black a fixed target and the queenside space to work on.',
    theme: 'Queenside space and the f5-knight against the fixed chain',
    summary: 'Carlsen shows the Advance plan: clamp the queenside, post pieces against d4, and convert the structural edge.',
    cmNote: "Black has the French Advance structure: the chain is fixed, Black has struck the d4-base with …c5 and …Nc6, and the queenside is where Black will press. No counterplay for White's bishop-blocked centre." },
  { id: 'mg-french-winawer', gameId: 'Fnn3oRqP', openingId: 'french-defence',
    cmMove: 12, concept: 'Doubled c-pawns and the initiative',
    overview: 'Winawer — Carlsen beats Anand from the Black side. The trade on c3 wrecks White’s queenside, and Black plays on the structural target.',
    theme: 'The doubled c-pawns and dark-square play after …Bxc3+',
    summary: 'A model Winawer: Black gives up the bishop to cripple White’s pawns, then plays against the lasting weakness.',
    cmNote: 'The Winawer bargain is on the board: Black has traded the dark-squared bishop with …Bxc3+ and White carries doubled, immobile c-pawns — the permanent target Black plays against for the whole game.' },
  { id: 'mg-french-classical', gameId: 'MPyj7jx4', openingId: 'french-defence',
    cmMove: 13, concept: 'Opposite-wing race',
    overview: 'Classical (4.Bg5) — Morozevich, the great French expert, outraces Shirov from the Black side after opposite-side castling.',
    theme: 'Opposite-side castling and the …c5/…f6 levers',
    summary: 'Morozevich demonstrates the Classical race: open the centre and storm the wing where White’s king has fled.',
    cmNote: 'Black has the Classical structure with the dark-squared bishops traded and the …c5/…f6 levers in hand. With kings set to race, Black’s pawns and pieces turn toward White’s wing.' },
  { id: 'mg-french-tarrasch', gameId: 'SxBJfJ0U', openingId: 'french-defence',
    cmMove: 13, concept: 'Siege of the isolated pawn',
    overview: 'Tarrasch (3.Nd2) — Ponomariov defeats Shirov from the Black side, pressing the isolated d-pawn the line hands Black.',
    theme: 'Play against White’s isolated d4-pawn',
    summary: 'A clean Tarrasch: Black blockades d5, lines up against d4, and grinds the isolated pawn down.',
    cmNote: 'The exchanges have left White an isolated d4-pawn — the heart of the Tarrasch. Black blockades the d5-square and aims every piece at d4, the long-term target.' },
  { id: 'mg-french-exchange', gameId: 'lcfJDBZM', openingId: 'french-defence',
    cmMove: 12, concept: 'Activity in symmetry',
    overview: 'Exchange — Grischuk beats Carlsen himself from the Black side, proving the "drawish" Exchange has bite when Black plays for the open file.',
    theme: 'Seize the open e-file and out-play in symmetry',
    summary: 'Even the world’s best can be outplayed in the Exchange: Grischuk grabs the file and the initiative.',
    cmNote: 'The symmetrical Exchange structure is set. There are no weaknesses — so Black plays for the only imbalance, grabbing the open e-file first and nursing a small initiative.' },
  { id: 'mg-french-burn', gameId: 'EBBoofCq', openingId: 'french-defence',
    cmMove: 13, concept: 'The bishop pair',
    overview: 'Burn Variation — Anand wins from the Black side. After …dxe4 Black keeps the two bishops and a clean structure, then opens the position for them.',
    theme: 'The bishop pair after …dxe4 and …Bxf6',
    summary: 'Anand showcases the Burn: concede the centre, keep the bishops, and let them rake an opening position.',
    cmNote: 'Black has the Burn’s payoff — the two bishops and a flawless structure after …dxe4. The plan is to complete development and break to unleash the bishop pair.' },
  { id: 'mg-french-fortknox', gameId: 'lfHawyyv', openingId: 'french-defence',
    cmMove: 12, concept: 'The solved bad bishop',
    overview: 'Fort Knox — Karpov, the great defender, beats Kamsky from the Black side, with the once-bad bishop traded and a fortress structure.',
    theme: 'Solving the bad bishop via …Bd7–c6',
    summary: 'Karpov’s Fort Knox: trade the problem bishop, build a weakness-free fortress, and outplay from solidity.',
    cmNote: 'The Fort Knox idea is complete: the normally-bad light-squared bishop reached c6 and was traded, leaving Black a symmetrical, weakness-free position with no targets for White.' },
  { id: 'mg-french-milnerbarry', gameId: 'k4edn7pF', openingId: 'french-defence',
    cmMove: 15, concept: 'Converting the extra pawn',
    overview: 'Milner-Barry Gambit — Giri refutes the gambit from the Black side, accepting the pawn, defusing the attack, and converting.',
    theme: 'Accept the gambit, neutralise the attack, win the endgame',
    summary: 'Giri’s antidote to the Milner-Barry: take the pawn, play …Bd7 and …a6, trade the attackers, and convert the extra material.',
    cmNote: 'Black accepted the gambit pawn and consolidated. With the dangerous light-squared bishop neutralised and the attack defused, the extra pawn becomes a winning advantage.' },
  { id: 'mg-french-mccutcheon', gameId: 'kY1eRcs6', openingId: 'french-defence',
    cmMove: 12, concept: 'The wrecked structure',
    overview: 'McCutcheon — Nakamura wins from the Black side after the combative …Bb4, leaving White doubled c-pawns and an exposed king.',
    theme: 'Punishing White’s doubled c-pawns and stranded king',
    summary: 'Nakamura’s McCutcheon: trade the dark bishop to wreck White’s pawns and chase the king, then convert the structural edge.',
    cmNote: 'The McCutcheon has done its work: White’s c-pawns are doubled and crippled, the king has been dragged from its castle, and Black plays on both lasting weaknesses.' },
];

function parsePgn(text) {
  const h = (k) => (text.match(new RegExp(`\\[${k} "([^"]+)"\\]`)) || [])[1];
  const body = text.split(/\n\n/).slice(1).join('\n');
  const sans = body
    .replace(/\{[^}]*\}/g, '')
    .replace(/\[%[^\]]*\]/g, '')
    .replace(/\d+\.(\.\.)?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((x) => x && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(x));
  return {
    white: h('White'), black: h('Black'), whiteElo: Number(h('WhiteElo')) || undefined,
    blackElo: Number(h('BlackElo')) || undefined, result: h('Result'),
    year: Number((h('Date') || '').slice(0, 4)) || undefined, event: h('Event'), sans,
  };
}

function fenAtMove(sans, moveNumber, color) {
  // ply index for White's move N = (N-1)*2; Black's move N = (N-1)*2+1.
  const ply = (moveNumber - 1) * 2 + (color === 'black' ? 1 : 0);
  const c = new Chess();
  for (let i = 0; i <= ply && i < sans.length; i++) c.move(sans[i]);
  return c.fen();
}

const data = JSON.parse(readFileSync(PATH, 'utf-8'));
const existing = new Set(data.map((g) => g.id));
let added = 0;
for (const g of GAMES) {
  if (existing.has(g.id)) { console.log('skip:', g.id); continue; }
  const r = await fetch(EX + g.gameId);
  if (!r.ok) { console.log('EXPORT FAIL', g.id, r.status); continue; }
  const p = parsePgn(await r.text());
  if (p.result !== '0-1') { console.log('NOT A BLACK WIN, skip', g.id, p.result); continue; }
  // critical moment AFTER Black's move cmMove (color black)
  const fen = fenAtMove(p.sans, g.cmMove, 'black');
  const entry = {
    id: g.id, openingId: g.openingId, studentSide: 'black',
    white: p.white, black: p.black, whiteElo: p.whiteElo, blackElo: p.blackElo,
    result: p.result, year: p.year, event: p.event,
    pgn: p.sans.join(' '),
    overview: g.overview,
    criticalMoments: [{ moveNumber: g.cmMove, color: 'black', fen, annotation: g.cmNote, concept: g.concept }],
    middlegameTheme: g.theme,
    lessonSummary: g.summary,
  };
  data.push(entry);
  added++;
  console.log('added', g.id, `(${p.white} vs ${p.black}, ${p.sans.length} plies)`);
}
writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log('total model games now', data.length, '| added', added);
