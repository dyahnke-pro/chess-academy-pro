import { Chess } from 'chess.js';
for (const l of process.argv.slice(2)) {
  const g = new Chess();
  for (const s of l.split(' ')) g.move(s);
  const h = g.history({ verbose: true }); const last = h[h.length-1]; const sq = last.to;
  const hit=[];
  for (const f of 'abcdefgh') for (const r of '12345678') { const t=f+r; if(t===sq) continue; if (g.attackers(t,last.color).includes(sq)) hit.push(t); }
  console.log(`\n${last.san} on ${sq} (${last.color})`);
  console.log('  empty  :', hit.filter(t=>!g.get(t)).join(' '));
  console.log('  pieces :', hit.filter(t=>g.get(t)).map(t=>`${t}:${g.get(t).color}${g.get(t).type}`).join(' '));
}
