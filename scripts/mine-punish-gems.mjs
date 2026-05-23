#!/usr/bin/env node
// PROTOTYPE — punish-the-inaccuracy miner (TODO 3e / weapon-section restructure).
//
// For a student colour + opening, walk the main amateur path. At every
// OPPONENT-to-move position, ask the amateur DB which moves the opponent
// actually plays — and flag the COMMON ones that score BADLY for them (i.e.
// well for the student). Those are real, faced-at-your-level inaccuracies.
// The punish = the student's best reply (masters first, amateur fallback).
// Selection is pure explorer data (no engine); a later CI step confirms the
// punish with Stockfish. NOTHING is invented — every move comes from the DB.
//
// Run: node scripts/mine-punish-gems.mjs
import { Chess } from 'chess.js';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const RATINGS = '2000,2200,2500';          // amateur band the user faces
const SPEEDS = 'blitz,rapid,classical';
const FREQ_FLOOR = 0.04;                    // opponent move must be ≥4% common
const MIN_GAMES = 300;                      // …and have real sample size
const EDGE = 0.05;                          // ≥5% better student score than main
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toUci(sans) {
  const c = new Chess(); const u = [];
  for (const m of sans) { const mv = c.move(m); u.push(mv.from + mv.to + (mv.promotion ?? '')); }
  return u;
}
async function explorer(source, sans) {
  const uci = toUci(sans);
  const extra = source === 'lichess' ? `&ratings=${RATINGS}&speeds=${SPEEDS}` : '';
  const r = await fetch(`${PROXY}?source=${source}&play=${uci.join(',')}${extra}`);
  return r.ok ? r.json() : null;
}
/** Student score (win + ½draw) for a move row, from student's colour. */
function studentScore(m, studentChar) {
  const tot = m.white + m.draws + m.black;
  if (tot === 0) return 0;
  const wins = studentChar === 'w' ? m.white : m.black;
  return (wins + m.draws / 2) / tot;
}
function gamesOf(m) { return m.white + m.draws + m.black; }

async function mine(openingId, studentChar, openingSans, maxPlies = 14) {
  const gems = [];
  const line = [...openingSans];
  for (let depth = 0; depth < maxPlies; depth++) {
    const c = new Chess(); for (const m of line) c.move(m);
    const toMove = c.turn();
    const j = await explorer('lichess', line);
    await sleep(180);
    if (!j || !(j.moves || []).length) break;
    const total = (j.white || 0) + (j.draws || 0) + (j.black || 0);
    const main = j.moves[0];

    if (toMove !== studentChar) {
      // OPPONENT to move — hunt a common move that scores well for the student.
      const mainStudent = studentScore(main, studentChar);
      const candidates = j.moves
        .map((m) => ({ san: m.san, games: gamesOf(m), pct: gamesOf(m) / total, sStudent: studentScore(m, studentChar) }))
        .filter((m) => m.pct >= FREQ_FLOOR && m.games >= MIN_GAMES && m.sStudent >= mainStudent + EDGE)
        .sort((a, b) => b.sStudent - a.sStudent);
      if (candidates.length) {
        const bad = candidates[0];
        // The punish: student's best reply after the inaccuracy (masters first).
        const afterSans = [...line, bad.san];
        const pm = (await explorer('masters', afterSans)) ?? (await explorer('lichess', afterSans));
        await sleep(180);
        const punish = pm && pm.moves && pm.moves[0] ? pm.moves[0].san : null;
        gems.push({
          openingId,
          afterMoves: line.join(' '),
          inaccuracy: bad.san,
          freqPct: +(bad.pct * 100).toFixed(1),
          games: bad.games,
          studentScoreAfter: +(bad.sStudent * 100).toFixed(0),
          mainMove: main.san,
          mainStudentScore: +(mainStudent * 100).toFixed(0),
          punish,
        });
      }
    }
    // advance along the main amateur move
    line.push(main.san);
  }
  return gems;
}

(async () => {
  // Caro = Black. Seed the shared trunk, then mine White's deviations.
  const gems = await mine('caro-kann', 'b', ['e4', 'c6']);
  console.log(`\n=== ${gems.length} punish-gems mined (Caro-Kann, Black) ===\n`);
  for (const g of gems) {
    console.log(`After: ${g.afterMoves}`);
    console.log(`  White plays ${g.inaccuracy} (${g.freqPct}% / ${g.games} games) — Black scores ${g.studentScoreAfter}% vs ${g.mainStudentScore}% on the main ${g.mainMove}`);
    console.log(`  → PUNISH: ${g.punish ?? '(none found)'}\n`);
  }
})();
