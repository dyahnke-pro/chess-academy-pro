// qgen.cjs <movesFile> <plies> <seat w|b> <runId>
// Prints "LEVEL|question" lines for the position after <plies> moves: the
// REPEAT set adapted to this board (legal, position-specific SANs and squares)
// plus a rotating NEW set drawn by runId from the L1/L2/L3/composite pool.
const { Chess } = require('chess.js');
const fs = require('fs');
const [,, file, pliesArg, seatArg, runArg] = process.argv;
const moves = fs.readFileSync(file, 'utf8').trim().split(/\s+/);
const plies = Number(pliesArg); const me = seatArg; const run = Number(runArg || 0);
const c = new Chess(); for (const m of moves.slice(0, plies)) c.move(m);
if (c.turn() !== me) { console.error('student is not to move at this ply'); process.exit(1); }
const them = me === 'w' ? 'b' : 'w';
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const cells = c.board().flat().filter(Boolean);
const mine = cells.filter((x) => x.color === me); const theirs = cells.filter((x) => x.color === them);
const legal = c.moves({ verbose: true });
const quiet = legal.filter((m) => !m.captured && !/[+#]/.test(m.san));
const pick = (arr, k = 0) => (arr.length ? arr[(run + k) % arr.length] : null);
const centreFirst = (a) => [...a].sort((x, y) => Math.abs(3.5 - (x.to.charCodeAt(0) - 97)) - Math.abs(3.5 - (y.to.charCodeAt(0) - 97)));
const alt1 = pick(centreFirst(quiet).slice(0, 6), 0)?.san;
const alt2 = pick(centreFirst(quiet).slice(0, 6), 3)?.san;
const myPawn = pick(mine.filter((x) => x.type === 'p' && 'cdef'.includes(x.square[0])).concat(mine.filter((x) => x.type === 'p')), 0);
const myPiece = pick(mine.filter((x) => 'nbrq'.includes(x.type)), 1);
const theirPawn = pick(theirs.filter((x) => x.type === 'p'), 2);
const theirPiece = pick(theirs.filter((x) => 'nbrq'.includes(x.type)), 0);
const hist = c.history(); const lastOpp = hist[hist.length - 1];
const tempo = (() => { const p = c.fen().split(' '); p[1] = them; p[3] = '-'; try { return new Chess(p.join(' ')); } catch { return null; } })();
const oppMove = tempo ? pick(centreFirst(tempo.moves({ verbose: true }).filter((m) => !m.captured)).slice(0, 5), 1)?.san : null;
const hasQ = mine.some((x) => x.type === 'q') && theirs.some((x) => x.type === 'q');
const knight = mine.find((x) => x.type === 'n') ?? mine.find((x) => x.type === 'b');
// A capture that gives up material by a naive count — the sacrifice to ask about.
const sac = legal.find((m) => m.captured && VAL[m.piece] > VAL[m.captured] + 1) ?? legal.find((m) => /\+/.test(m.san) && m.captured);
const capture = legal.find((m) => m.captured);
const out = [];
const add = (lvl, q) => { if (q && !/undefined|null/.test(q)) out.push(`${lvl}|${q}`); };
// REPEAT set — the same 13 kinds every run, adapted to this board.
add('L2', 'What should I play here?');
add('L2', alt1 && `Why is that better than ${alt1}?`);
add('L1', 'What is my opponent threatening?');
add('L2', alt2 && `What happens if I play ${alt2}?`);
add('L1', myPawn && `Is my ${myPawn.square} pawn weak?`);
add('L2', "What's the plan in this position?");
add('L2', lastOpp && `Why did they play ${lastOpp}?`);
add('L1', theirPawn && `Can I win the pawn on ${theirPawn.square}?`);
add('L1', 'Which of my pieces is worst?');
add('L2', myPiece && `Is my ${NAME[myPiece.type]} on ${myPiece.square} good or bad?`);
add('L2', hasQ ? 'Should I trade queens?' : 'Should I trade rooks?');
add('L2', knight && `Where should my ${NAME[knight.type]} go?`);
add('L2', oppMove && `What if they play ${oppMove}?`);
// NEW pool — rotated by run so each run asks a different slice.
const pool = [
  ['L1', 'Whose move is it?'], ['L1', 'Is anything hanging?'], ['L1', 'Is there a mate here?'],
  ['L1', 'Is this a draw?'], ['L1', theirPawn && `Can they take on ${myPawn?.square}?`], ['L1', 'What opening is this?'],
  ['L2', alt1 && alt2 && `${alt1} or ${alt2}?`], ['L2', capture && `Is ${capture.san} a good trade?`], ['L2', 'Should I castle?'],
  ['L2', 'Where does my rook belong?'], ['L2', "What's my biggest weakness?"],
  ['L2', theirPiece && `What does their ${NAME[theirPiece.type]} on ${theirPiece.square} do?`],
  ['L2', theirPiece && `Couldn't they just move the ${NAME[theirPiece.type]}?`], ['L2', 'Is my king safe?'],
  ['L2', 'Who is better and why?'],
  ['L3', 'How should I think about this position?'], ['L3', 'What should I aim for in the endgame?'],
  ['L3', 'What mistake do I keep making?'], ['L3', 'Where did this game turn?'],
  ['C', sac && `Is ${sac.san} sound?`], ['C', 'Do I have a strong attack?'], ['C', 'Should I push for a win or hold?'],
].filter(([, q]) => q);
for (let k = 0; k < 9; k += 1) { const [l, q] = pool[(run * 9 + k) % pool.length]; add(`NEW-${l}`, q); }
console.log([...new Set(out)].join('\n'));
