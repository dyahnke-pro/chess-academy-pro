#!/usr/bin/env node
/**
 * Merge mined traps + pitfalls into repertoire.json, bringing each
 * opening toward a target count. Idempotent (skips puzzle IDs
 * already present by source). New entries carry setupFen (middlegame
 * start) until the lead-in fetch rewrites them to walk from move 1.
 *
 * Traps  → trapLines[]    (student wins; verified >= +150cp / mate)
 * Pitfalls → warningLines[] (student loses; verified <= -150cp / mated)
 *
 *   node scripts/merge-mined-lines.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const TARGET = 6; // aim for up to this many of each per opening

const THEME_NAMES = {
  mate:'Mating Strike',mateIn1:'Mate in One',mateIn2:'Mate in Two',mateIn3:'Mate in Three',
  fork:'Fork',pin:'Pin',skewer:'Skewer',sacrifice:'Sacrifice',hangingPiece:'Hanging Piece',
  attractionDeflection:'Attraction',attraction:'Attraction',deflection:'Deflection',
  attackingF2F7:'F-pawn Strike',exposedKing:'King Hunt',kingsideAttack:'Kingside Attack',
  queensideAttack:'Queenside Attack',discoveredAttack:'Discovered Attack',doubleCheck:'Double Check',
  smotheredMate:'Smothered Mate',trappedPiece:'Trapped Piece',capturingDefender:'Removing the Defender',
};
const PRIORITY=['smotheredMate','mateIn1','mateIn2','mateIn3','mate','fork','skewer','pin','sacrifice','discoveredAttack','doubleCheck','attractionDeflection','attraction','deflection','attackingF2F7','kingsideAttack','queensideAttack','exposedKing','hangingPiece','trappedPiece','capturingDefender'];
function primaryName(themes){ for(const p of PRIORITY) if(themes.includes(p)&&THEME_NAMES[p]) return THEME_NAMES[p]; return null; }

const traps = JSON.parse(readFileSync('audit-reports/staged/mined-traps-batch-1.json','utf-8')).byOpening;
const pits = JSON.parse(readFileSync('audit-reports/staged/mined-pitfalls-batch-1.json','utf-8')).byOpening;
const rep = JSON.parse(readFileSync('src/data/repertoire.json','utf-8'));
const arr = Array.isArray(rep)?rep:Object.values(rep);

function explain(e, role){
  const word = primaryName(e.themes) || 'Tactic';
  const ev = e.finalEval;
  const themes = e.themes.filter(t=>!['opening','short','long','veryLong','middlegame','endgame','crushing','advantage','master','oneMove'].includes(t)).slice(0,4).join(', ');
  if (role==='trap') return `${word}: Stockfish confirms the student wins ${ev} after this sequence. Themes: ${themes}. From a real Lichess game (rating ${e.puzzleRating}).`;
  return `Pitfall: if the student walks into this, Stockfish confirms they end ${ev}. The opponent punishes with ${word.toLowerCase()}. Themes: ${themes}. From a real Lichess game (rating ${e.puzzleRating}).`;
}

let addedT=0, addedP=0;
for (const op of arr) {
  if (!Array.isArray(op.trapLines)) op.trapLines=[];
  if (!Array.isArray(op.warningLines)) op.warningLines=[];
  const haveTrapSrc = new Set(op.trapLines.filter(t=>t.source).map(t=>t.source));
  const haveWarnSrc = new Set(op.warningLines.filter(w=>w.source).map(w=>w.source));

  // traps
  let tIdx = op.trapLines.filter(t=>t.source?.startsWith('lichess-puzzle')).length;
  for (const e of (traps[op.id]||[])) {
    if (op.trapLines.length >= TARGET) break;
    const src = `lichess-puzzle:${e.puzzleId}`;
    if (haveTrapSrc.has(src)) continue;
    tIdx++;
    op.trapLines.push({
      name: `${primaryName(e.themes)||'Tactic'} #${tIdx}`,
      pgn: e.moveSequenceSan, setupFen: e.startFen,
      explanation: explain(e,'trap'), source: src, verifiedEval: e.finalEval,
    });
    addedT++;
  }
  // pitfalls
  let pIdx = op.warningLines.filter(w=>w.source?.startsWith('lichess-puzzle')).length;
  for (const e of (pits[op.id]||[])) {
    if (op.warningLines.length >= TARGET) break;
    const src = `lichess-puzzle:${e.puzzleId}`;
    if (haveWarnSrc.has(src)) continue;
    pIdx++;
    op.warningLines.push({
      name: `Pitfall: ${(primaryName(e.themes)||'Tactic').toLowerCase()} #${pIdx}`,
      pgn: e.moveSequenceSan, setupFen: e.startFen,
      explanation: explain(e,'pitfall'), source: src, verifiedEval: e.finalEval,
    });
    addedP++;
  }
}

writeFileSync('src/data/repertoire.json', JSON.stringify(rep, null, 2) + '\n');
console.log(`Added ${addedT} traps, ${addedP} pitfalls.`);
console.log('Coverage now:');
let gaps=[];
for (const op of arr) {
  const t=(op.trapLines||[]).length, w=(op.warningLines||[]).length;
  if (t<3||w<3) gaps.push(`  ${op.id}: ${t} traps, ${w} pitfalls`);
}
if(gaps.length===0) console.log('  ALL openings >= 3 traps + 3 pitfalls');
else { console.log('  STILL SHORT (need hand-author):'); gaps.forEach(g=>console.log(g)); }
