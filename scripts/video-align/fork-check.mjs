#!/usr/bin/env node
/**
 * fork-check — is this line fit to be added as a variation, and what does it buy?
 *
 * A fork is only worth adding if it does three things at once: branches from a
 * line the repertoire already teaches (so the lesson walks to the fork on its
 * own), clears the gates a variation has to clear, and makes hand-written notes
 * AUDIBLE that were silent before. The last one is the whole point and is the
 * easiest to assume rather than check — a branch can be perfectly legal, deep
 * and useless.
 *
 * Usage:
 *   node scripts/video-align/fork-check.mjs <spineId>...
 *   node scripts/video-align/fork-check.mjs --pgn "<san moves>"
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';

/** How the games that reached this position actually FINISHED, from the
 *  student's side.
 *
 *  NOT an engine eval and no substitute for the soundness sweep — it cannot see
 *  a line that is losing but rarely punished. What it CAN do is catch the fork
 *  that walks into a position masters lose from, which is the failure worth
 *  catching before a line is put in front of a student. Silent when the
 *  explorer is unreachable rather than guessing. */
async function masterResults(uciPath, studentColor) {
  try {
    const r = await fetch(`${PROXY}?source=masters&play=${uciPath.join(',')}`);
    if (!r.ok) return null;
    const j = await r.json();
    const total = (j.white || 0) + (j.draws || 0) + (j.black || 0);
    if (!total) return null;
    const wins = studentColor === 'black' ? j.black : j.white;
    const losses = studentColor === 'black' ? j.white : j.black;
    return { total, score: Math.round(((wins + (j.draws || 0) / 2) / total) * 100), wins, draws: j.draws || 0, losses };
  } catch { return null; }
}
import { reachesMiddlegame } from '../../src/data/variationMiddlegameDepth.shared.mjs';

const sansOf = (p) => (p ?? '').split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));
const posKey = (fen) => fen.split(' ').slice(0, 2).join(' ');

const raw = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8'));
const rows = Array.isArray(raw) ? raw : Object.values(raw).flat();
const lines = [];
for (const r of rows) {
  if (r?.pgn) lines.push({ id: r.id, color: r.color, name: r.name, sans: sansOf(r.pgn) });
  for (const v of r?.variations ?? []) if (v?.pgn) lines.push({ id: r.id, color: r.color, name: `${r.name} / ${v.name}`, sans: sansOf(v.pgn) });
}
const taughtPositions = new Set();
for (const l of lines) { const g = new Chess(); for (const s of l.sans) { try { if (!g.move(s)) break; } catch { break; } taughtPositions.add(posKey(g.fen())); } }

const notes = [];
for (const f of readdirSync('data/video-notes').filter((x) => x.endsWith('.json'))) {
  for (const n of JSON.parse(readFileSync(`data/video-notes/${f}`, 'utf8'))) notes.push(n);
}

async function report(label, sans) {
  console.log(`\n### ${label}`);
  const g = new Chess();
  for (const s of sans) {
    try { if (!g.move(s)) { console.log(`  ✗ ILLEGAL at ${s}`); return; } }
    catch { console.log(`  ✗ ILLEGAL at ${s}`); return; }
  }
  // Where does it leave the taught lines? A fork below ply 4 is a different
  // opening, not an alternative (CLAUDE.md, the fork rule).
  let best = { shared: -1, name: '(none)' };
  for (const l of lines) {
    let i = 0;
    while (i < sans.length && i < l.sans.length && sans[i] === l.sans[i]) i++;
    if (i > best.shared) best = { shared: i, name: l.name, color: l.color, id: l.id };
  }
  const mid = reachesMiddlegame(sans.join(' '));
  console.log(`  host    : ${best.name} [${best.id ?? '?'}, ${best.color ?? '?'}]`);
  console.log(`  branches: ply ${best.shared}${best.shared < 4 ? '  ⚠ TOO SHALLOW — a different opening, not a fork' : ''}`);
  console.log(`  plies   : ${sans.length}${sans.length < 10 ? '  ⚠ under the 10-half-move floor for an authored variation' : ''}`);
  console.log(`  middlegame: ${mid.pass ? 'yes' : 'NO — ' + (mid.reason ?? 'short')}`);

  // Which notes does this line make audible?
  const walked = new Set();
  { const w = new Chess(); for (const s of sans) { w.move(s); walked.add(posKey(w.fen())); } }
  const unlocked = [];
  for (const n of notes) {
    const ns = n.line.trim().split(/\s+/);
    const w = new Chess(); let ok = true;
    for (const s of ns) { try { if (!w.move(s)) { ok = false; break; } } catch { ok = false; break; } }
    if (!ok) continue;
    const key = posKey(w.fen());
    if (walked.has(key) && !taughtPositions.has(key)) unlocked.push(n.id);
  }
  console.log(`  unlocks : ${unlocked.length ? unlocked.join('\n            ') : '(none — this branch buys no teaching)'}`);

  // How master games that reached this line actually FINISHED — measured against
  // the FORK POINT, not against 50%.
  //
  // AN ABSOLUTE THRESHOLD IS THE WRONG TEST and flagged four sound Black lines
  // when it was first written: Black scores under 50% in every opening ever
  // played, so "under 40%" reads as a defect on lines that are simply normal for
  // the side. The question a fork has to answer is narrower — is this branch
  // WORSE than the position the lesson already walks to? The fork point is that
  // baseline, and it is free.
  const uciAll = (() => { const c = new Chess(); return sans.map((m) => { const x = c.move(m); return x.from + x.to + (x.promotion ?? ''); }); })();
  const student = best.color ?? 'white';
  const baseline = best.shared > 0 ? await masterResults(uciAll.slice(0, best.shared), student) : null;
  // HOW OFTEN IS THIS BRANCH ACTUALLY PLAYED? A fork that masters reach ten
  // times is a curiosity, not theory, and the deep tail such a branch produces
  // comes from the amateur database rather than from master practice — so both
  // the line and any score measured along it are weaker evidence than the ply
  // counts make them look. Reported next to the score so the two are judged
  // together.
  try {
    const at = await fetch(`${PROXY}?source=masters&play=${uciAll.slice(0, best.shared).join(',')}`);
    if (at.ok) {
      const j = await at.json();
      const branch = (j.moves ?? []).find((m) => m.san === sans[best.shared]);
      const n = branch ? (branch.white || 0) + (branch.draws || 0) + (branch.black || 0) : 0;
      const top = (j.moves ?? [])[0];
      console.log(`  played  : ${sans[best.shared]} in ${n} master games`
        + (top ? ` (the main move is ${top.san} in ${(top.white||0)+(top.draws||0)+(top.black||0)})` : '')
        + (n < 30 ? '  ⚠ too rare to teach as a line — leave the notes to free play' : ''));
    }
  } catch { /* the score line below already reports when the explorer is silent */ }
  // EVERY ply past the fork, not just the deepest one with games. Reporting only
  // the tail measures wherever the sample happens to run out — for one branch
  // that was the fork point itself, so the "check" compared the line to itself
  // and reported no change. The worst point on the branch is what a student
  // would actually have to survive.
  let worst = null;
  for (let depth = best.shared + 1; depth <= uciAll.length; depth++) {
    const res = await masterResults(uciAll.slice(0, depth), student);
    // 30, not 10. A twelve-game blip is noise, and taking the WORST point over
    // the whole branch turns any thin tail into a flag — which fires on lines
    // that held level for eleven plies and then ran out of games. The threshold
    // is what makes the flag mean "masters do badly here" instead of "the
    // sample got small".
    if (!res || res.total < 30) continue;
    if (!worst || res.score < worst.score) worst = { ...res, depth };
  }
  if (!worst) console.log('  masters : too few games past the fork to say anything');
  else {
    const drop = baseline ? baseline.score - worst.score : null;
    const flag = drop !== null && drop >= 12 ? `  ⚠ ${drop} points below the fork — check before teaching` : '';
    console.log(`  masters : worst at ply ${worst.depth} — ${worst.total} games, student ${worst.score}%`
      + (baseline ? ` vs ${baseline.score}% at the ply-${best.shared} fork` : '')
      + ` (+${worst.wins} =${worst.draws} -${worst.losses})${flag}`);
  }
  console.log(`  pgn     : ${sans.join(' ')}`);
}

const args = process.argv.slice(2);
if (args[0] === '--pgn') await report('(inline)', sansOf(args[1]));
else for (const id of args) {
  const path = `data/sources/opening-spines/${id}.json`;
  if (!existsSync(path)) { console.log(`\n### ${id}\n  ✗ no spine at ${path}`); continue; }
  await report(id, JSON.parse(readFileSync(path, 'utf8')).spine);
}
