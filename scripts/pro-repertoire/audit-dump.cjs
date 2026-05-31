// FULL pro-rep structural audit — every opening's spine plies, variation plies,
// plan ply-length + ann/cue/source coverage + legality, model-game legality/
// overview, pitfall narration coverage. A structured extract for a linear human
// walk (not pass/fail). Run: node scripts/pro-repertoire/audit-dump.cjs [openingId]
const { Chess } = require('chess.js');
const repo = require('../../src/data/pro-repertoires.json');
const mpRaw = require('../../src/data/middlegame-plans.json');
const plans = Array.isArray(mpRaw) ? mpRaw : mpRaw.plans;
const mgRaw = require('../../src/data/model-games.json');
const games = Array.isArray(mgRaw) ? mgRaw : mgRaw.games;
const cm = require('../../src/data/common-mistakes.json');

function legalPlies(pgn) {
  if (!pgn) return { n: 0, illegal: null };
  const c = new Chess();
  const toks = pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/\$\d+/g, ' ').trim().split(/\s+/).filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
  let n = 0;
  for (const m of toks) { try { if (c.move(m)) n++; else return { n, illegal: m }; } catch { return { n, illegal: m }; } }
  return { n, illegal: null };
}

const argv = process.argv[2];
const out = [];
for (const o of repo.openings) {
  if (argv && o.id !== argv) continue;
  out.push(`\n${'='.repeat(78)}\n${o.id}  [${o.playerId}] color=${o.color} eco=${o.eco || '?'}\n${o.name || ''}\n${'='.repeat(78)}`);
  const main = legalPlies(o.pgn);
  out.push(`OPENING SPINE: ${main.n} plies${main.illegal ? ` ⚠️ ILLEGAL at "${main.illegal}"` : ''}${main.n < 20 ? ' ⚠️ SHORT (<20, may not reach middlegame)' : ''}`);
  out.push(`  overview: ${o.overview ? o.overview.slice(0, 90) + '…' : '⚠️ MISSING'}`);
  out.push(`  keyIdeas: ${(o.keyIdeas || []).length}${(o.keyIdeas || []).length < 3 ? ' ⚠️' : ''}`);
  out.push(`VARIATIONS: ${(o.variations || []).length}`);
  for (const v of o.variations || []) {
    const vp = legalPlies(v.pgn);
    out.push(`  • ${v.name}: ${vp.n} plies${vp.illegal ? ` ⚠️ ILLEGAL "${vp.illegal}"` : ''}${vp.n < 16 ? ' ⚠️ SHORT' : ''}${v.explanation ? '' : ' ⚠️ no explanation'}${(v.sources || []).length ? '' : ' ⚠️ no sources'}`);
  }
  const myPlans = plans.filter((p) => p.openingId === o.id && !/-endgame$/.test(p.id));
  const endgame = plans.filter((p) => p.openingId === o.id && /-endgame$/.test(p.id));
  out.push(`MIDDLEGAME PLANS: ${myPlans.length}  |  ENDGAME PLANS: ${endgame.length}`);
  for (const p of [...myPlans, ...endgame]) {
    const pl = p.playableLines && p.playableLines[0];
    const nMoves = pl && pl.moves ? pl.moves.length : 0;
    const anns = pl && pl.annotations ? pl.annotations.length : 0;
    const cues = pl && pl.learnCues ? pl.learnCues.length : 0;
    const flags = [];
    if (nMoves < 8) flags.push(`SHORT(${nMoves})`);
    if (anns !== nMoves) flags.push(`ann≠moves(${anns}/${nMoves})`);
    if (cues !== nMoves) flags.push(`cue≠moves(${cues}/${nMoves})`);
    if (!pl || !pl.sources || !pl.sources.length) flags.push('no-sources');
    if (pl && pl.fen && pl.moves) { const c = new Chess(pl.fen); let bad = null; for (const m of pl.moves) { try { if (!c.move(m)) { bad = m; break; } } catch { bad = m; break; } } if (bad) flags.push(`ILLEGAL "${bad}"`); }
    out.push(`  ${p.id.replace('mp-pro', '')}: ${nMoves}mv ${flags.length ? '⚠️ ' + flags.join(', ') : 'OK'}`);
  }
  const myMg = games.filter((g) => g.openingId === o.id);
  out.push(`MODEL GAMES: ${myMg.length}`);
  for (const g of myMg) {
    const gp = legalPlies(g.pgn);
    const flags = [];
    if (gp.illegal) flags.push(`ILLEGAL "${gp.illegal}"`);
    if (!g.overview || g.overview.length < 40) flags.push('thin-overview');
    if (!g.studentSide) flags.push('no-studentSide');
    out.push(`  ${g.id}: ${gp.n}plies ${g.white || '?'} vs ${g.black || '?'} ${flags.length ? '⚠️ ' + flags.join(', ') : ''}`);
  }
  const myCm = cm[o.id] || [];
  out.push(`PITFALLS: ${myCm.length}`);
  for (const m of myCm) {
    const flags = [];
    if (!m.explanation || m.explanation.length < 20) flags.push('thin-explanation');
    if (!m.shortNarration) flags.push('no-shortNarration');
    if (!m.sources || !m.sources.length) flags.push('no-sources');
    if (flags.length) out.push(`  ${m.wrongMove || '?'}→${m.correctMove || '?'}: ⚠️ ${flags.join(', ')}`);
  }
}
console.log(out.join('\n'));
console.error(`\n${out.filter((l) => l.includes('⚠️')).length} findings across ${repo.openings.filter((o) => !argv || o.id === argv).length} openings`);
