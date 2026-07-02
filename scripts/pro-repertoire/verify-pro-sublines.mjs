#!/usr/bin/env node
// VERIFY the pro-rep sublines in src/data/course-sublines.json are accurate and
// self-consistent — the trust backstop (David 2026-07-02: "I am TRUSTING you to
// do this job accurately"). Hard-checks, per pro subline, that:
//   1. every move in `moves` is chess.js-legal replayed from the start;
//   2. moves[atPly] === triggerMove (the deviation sits where it claims);
//   3. moves[0..atPly-1] matches the variation's own spine prefix (it branches
//      FROM the real variation, not a cold position);
//   4. atPly is an OPPONENT-to-move ply (correct side deviates);
//   5. reachesMiddlegame flag equals a fresh recompute;
//   6. games >= 1, 0 <= pct <= 100, record W+D+L === games;
//   7. dubious ⇒ evalCp < -100 AND engineBest is legal after the deviation;
//      ¬dubious ⇒ evalCp == null OR >= -100;
//   8. no obvious player-name leak in any string.
// Exits non-zero on any failure. Runs for one pro id (arg) or all pro-* ids.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { reachesMiddlegame } from '../../src/data/variationMiddlegameDepth.shared.mjs';

const root = new URL('../../', import.meta.url).pathname;
const subs = JSON.parse(readFileSync(root + 'src/data/course-sublines.json', 'utf8'));
const pro = JSON.parse(readFileSync(root + 'src/data/pro-repertoires.json', 'utf8'));
const players = pro.players.map((p) => p.name.toLowerCase());
const nameTokens = [...players.flatMap((n) => n.split(/\s+/)), 'naroditsky', 'hikaru', 'carlsen', 'caruana', 'rosen', 'gotham', 'levy', 'samay', 'aman'].filter((t) => t.length > 3);

const only = process.argv[2];
const proIds = Object.keys(subs).filter((id) => id.startsWith('pro-') && (!only || id === only));
if (proIds.length === 0) { console.error(only ? `no pro sublines for ${only}` : 'no pro-* sublines in course-sublines.json'); process.exit(1); }

function sansFromPgn(pgn) {
  const toks = pgn.trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));
  const c = new Chess(); const out = [];
  for (const t of toks) { try { out.push(c.move(t).san); } catch { return []; } }
  return out;
}

let fails = 0; let checked = 0;
for (const id of proIds) {
  const opening = pro.openings.find((o) => o.id === id);
  const studentIsWhite = opening.color === 'white';
  const perVar = subs[id];
  for (const [varIdx, list] of Object.entries(perVar)) {
    const spine = sansFromPgn(opening.variations[Number(varIdx)].pgn);
    for (const s of list) {
      checked++;
      const tag = `${id}[${varIdx}] ${s.triggerMove}@${s.atPly}`;
      const fail = (msg) => { console.error(`  ✗ ${tag}: ${msg}`); fails++; };

      // 1. legality replay
      const c = new Chess(); let legal = true;
      for (const m of s.moves) { try { c.move(m); } catch { fail(`illegal move ${m}`); legal = false; break; } }
      if (!legal) continue;

      // 2. trigger at atPly
      if (s.moves[s.atPly] !== s.triggerMove) fail(`moves[${s.atPly}]=${s.moves[s.atPly]} != triggerMove ${s.triggerMove}`);

      // 3. branches from the variation spine
      for (let i = 0; i < s.atPly; i++) {
        if (spine[i] !== s.moves[i]) { fail(`prefix diverges at ply ${i}: spine ${spine[i]} vs subline ${s.moves[i]}`); break; }
      }

      // 4. opponent-to-move at atPly (replay to just before atPly)
      const pre = new Chess(); for (let i = 0; i < s.atPly; i++) pre.move(s.moves[i]);
      const moverIsWhite = pre.turn() === 'w';
      if (moverIsWhite === studentIsWhite) fail(`deviation at atPly is the STUDENT's move, not the opponent's`);

      // 5. reachesMiddlegame honest
      const rm = reachesMiddlegame(s.moves.join(' ')).pass;
      if (rm !== s.reachesMiddlegame) fail(`reachesMiddlegame flag ${s.reachesMiddlegame} != recompute ${rm}`);

      // 6. counts
      if (!(s.games >= 1)) fail(`games ${s.games} < 1`);
      if (s.pct < 0 || s.pct > 100) fail(`pct ${s.pct} out of range`);
      if (s.record) { const sum = s.record.wins + s.record.draws + s.record.losses; if (sum !== s.games) fail(`record sum ${sum} != games ${s.games}`); }

      // 7. dubious ⇔ eval + fix
      if (s.dubious) {
        if (!(s.evalCp < -100)) fail(`dubious but evalCp ${s.evalCp} not < -100`);
        if (!s.engineBest) fail(`dubious but no engineBest fix`);
        else {
          const dev = new Chess(); for (let i = 0; i <= s.atPly; i++) dev.move(s.moves[i]);
          try { dev.move(s.engineBest); } catch { fail(`engineBest ${s.engineBest} illegal after deviation`); }
        }
      } else if (s.evalCp != null && s.evalCp < -100) {
        fail(`not flagged dubious but evalCp ${s.evalCp} < -100`);
      }

      // 8. name leak
      const blob = `${s.name}`.toLowerCase();
      for (const t of nameTokens) if (blob.includes(t)) fail(`possible player-name leak "${t}" in name`);
    }
  }
}
console.log(`\nchecked ${checked} pro sublines across ${proIds.length} opening(s) — ${fails} failure(s)`);
process.exit(fails ? 1 : 0);
