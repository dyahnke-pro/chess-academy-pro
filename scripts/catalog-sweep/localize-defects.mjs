// For each soundness suspect: walk the REAL line (pulled from the data files,
// never memory), eval every position, find the ply where the student's eval
// first crosses -1.0, and check the engine's preference at the ply before —
// line-fault (student's own move slid) vs the opening's nature.
import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import fs from 'fs';

const SF = '/usr/games/stockfish';
function ev(fen, ms = 5000) {
  return new Promise((res) => {
    const sf = spawn(SF);
    let cp = null; let best = null;
    sf.stdout.on('data', (d) => {
      const s = d.toString();
      const all = s.match(/score (cp|mate) (-?\d+)/g);
      if (all) { const last = all[all.length - 1].match(/(cp|mate) (-?\d+)/); cp = last[1] === 'mate' ? (Number(last[2]) > 0 ? 9999 : -9999) : Number(last[2]); }
      const b = s.match(/bestmove (\S+)/);
      if (b) { best = b[1]; sf.kill(); res({ cp, best }); }
    });
    sf.stdin.write(`position fen ${fen}\ngo movetime ${ms}\n`);
    setTimeout(() => { try { sf.kill(); } catch {} res({ cp, best }); }, 9000);
  });
}

const repertoire = JSON.parse(fs.readFileSync('src/data/repertoire.json', 'utf8'));
const pro = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8')).openings;
const anti = JSON.parse(fs.readFileSync('src/data/anti-openings.json', 'utf8'));
function line(list, id, varName) {
  const e = list.find((x) => x.id === id);
  if (!e) return null;
  if (!varName || varName === '<main>') return { pgn: e.pgn, student: e.color === 'black' ? 'b' : 'w' };
  const v = (e.variations ?? []).find((x) => x.name === varName);
  return v ? { pgn: v.pgn, student: e.color === 'black' ? 'b' : 'w' } : null;
}

const SUSPECTS = [
  ['rep:pirc-defence::Austrian Attack', line(repertoire, 'pirc-defence', 'Austrian Attack')],
  ['rep:pirc-defence::150 Attack', line(repertoire, 'pirc-defence', '150 Attack')],
  ['anti:anti-colle-black::Colle System (Nbd2)', line(anti, 'anti-colle-black', 'Colle System (Nbd2)')],
  ['rep:vienna-game::Vienna vs 2...Nc6', line(repertoire, 'vienna-game', 'Vienna vs 2...Nc6')],
  ['pro:pro-gothamchess-english::Symmetric (…e5)', line(pro, 'pro-gothamchess-english', 'Symmetric (…e5)')],
  ['rep:old-indian-defence::Old Indian: Seirawan System', line(repertoire, 'old-indian-defence', 'Old Indian: Seirawan System')],
  ['rep:old-indian-defence::Old Indian: Main Line with d5', line(repertoire, 'old-indian-defence', 'Old Indian: Main Line with d5')],
  ['pro:pro-carlsen-modern::Classical Nf3', line(pro, 'pro-carlsen-modern', 'Classical Nf3')],
  ['rep:benoni-defence::Modern Main Line (Nd2/f3) with ...b5 Race', line(repertoire, 'benoni-defence', 'Modern Main Line (Nd2/f3) with ...b5 Race')],
  ['rep:caro-kann::Advance Variation', line(repertoire, 'caro-kann', 'Advance Variation')],
];

for (const [label, spec] of SUSPECTS) {
  if (!spec) { console.log(`\n=== ${label}: NOT FOUND in data`); continue; }
  const { pgn, student } = spec;
  const sans = pgn.trim().split(/\s+/);
  const c = new Chess();
  let prev = null;
  let out = `\n=== ${label} (student ${student}, ${sans.length}p)\n  pgn: ${pgn}`;
  for (let i = 0; i < sans.length; i++) {
    const mover = c.turn();
    if (!c.move(sans[i])) { out += `\n  ILLEGAL ${sans[i]} @${i}`; break; }
    const { cp } = await ev(c.fen(), 4000);
    if (cp == null) continue;
    const stud = c.turn() === student ? cp : -cp;
    if (stud < -100 && (prev == null || prev >= -100)) {
      out += `\n  crosses -1.0 after ply${i + 1} ${sans[i]} (mover ${mover}${mover === student ? ' ← STUDENT' : ''}): ${stud}cp`;
      c.undo();
      const before = await ev(c.fen(), 6000);
      out += ` | before(${c.turn()}tm): best ${before.best} ${before.cp}cp`;
      c.move(sans[i]);
    }
    prev = stud;
  }
  const fin = await ev(c.fen(), 6000);
  const studFin = fin.cp == null ? null : (c.turn() === student ? fin.cp : -fin.cp);
  out += `\n  terminus: ${studFin}cp`;
  console.log(out);
}
console.log('\nLOCALIZE DONE');
