#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';
const SRC_DIR = 'data/sources/danielnaroditsky-chesscom';
const OPENINGS = {
  'pro-naroditsky-alekhine':       { prefix: ['e4','Nf6'], color: 'black' },
  'pro-naroditsky-jobava-london':  { prefix: ['d4','d5','Nc3'], color: 'white' },
  'pro-naroditsky-ruy-lopez':      { prefix: ['e4','e5','Nf3','Nc6','Bb5'], color: 'white' },
};
function pgnToSan(pt) {
  const i = pt.search(/\n\n/); if (i < 0) return null;
  let b = pt.slice(i).replace(/\{[^}]*\}/g, '');
  let prev; do { prev = b; b = b.replace(/\([^()]*\)/g, ''); } while (b !== prev);
  b = b.replace(/\b\d+\.+\s*/g, '').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  return b ? b.split(/\s+/).filter(Boolean) : null;
}
function matches(m, p) { if (m.length < p.length) return false; for (let i=0;i<p.length;i++) if (m[i] !== p[i]) return false; return true; }
const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.jsonl'));
for (const [oid, cfg] of Object.entries(OPENINGS)) {
  const cands = [];
  for (const f of files) {
    for (const line of fs.readFileSync(path.join(SRC_DIR, f), 'utf8').split('\n').filter(Boolean)) {
      let g; try { g = JSON.parse(line); } catch { continue; }
      if (!g.pgn) continue;
      const isWhite = (g.white?.username || '').toLowerCase() === 'danielnaroditsky';
      const isBlack = (g.black?.username || '').toLowerCase() === 'danielnaroditsky';
      if (cfg.color === 'white' && !isWhite) continue;
      if (cfg.color === 'black' && !isBlack) continue;
      const m = pgnToSan(g.pgn); if (!m || !matches(m, cfg.prefix)) continue;
      const result = g.pgn.match(/\[Result "([^"]+)"\]/)?.[1] || '*';
      const win = (cfg.color === 'white' && result === '1-0') || (cfg.color === 'black' && result === '0-1');
      if (!win) continue;
      const opp = cfg.color === 'white' ? g.black : g.white;
      const rating = opp?.rating || 0;
      if (rating < 2400) continue;
      if (m.length < 40) continue;
      const ch = new Chess(); let ok = true;
      for (const s of m) { try { ch.move(s); } catch { ok = false; break; } }
      if (!ok) continue;
      cands.push({ url: g.url, oppName: opp?.username, oppRating: rating, result, plies: m.length, pgn: m.join(' ') });
    }
  }
  cands.sort((a,b) => b.oppRating - a.oppRating);
  console.log(`\n=== ${oid} === (${cands.length} cands ≥2400)`);
  for (let i = 0; i < 4 && i < cands.length; i++) {
    const c = cands[i];
    console.log(`[${i}] ${c.oppName} (${c.oppRating}) ${c.result} plies=${c.plies}`);
    console.log(`    url: ${c.url}`);
    console.log(`    pgn: ${c.pgn}`);
  }
}
