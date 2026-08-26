// render-briefing.mjs — PHASE 5 of the PositionFacts calculator.
// (docs/plans/2026-08-26-position-facts-calculator.md)
//
// LAYER 2: turn the PositionFacts packet into a RANKED, board-true briefing —
// each fact a clause, ordered by the general's need-to-know hierarchy, with NO
// HARD CAP (the vital tier is never dropped; the voice flexes depth). This is
// the packet the phraser consumes: offline I DNA-phrase it by hand (Phase 6),
// live `voiceFacts` phrases the same packet. Plain board-true clauses here;
// the house voice is Layer 3.
//
// The hierarchy (a general's briefing):
//   1 STATUS      — winning/losing, decided or live (eval + WDL)
//   2 INCOMING    — the threat calculated out + what hangs (SEE)
//   3 THE MOVE    — the move played + WHY, teach-both when it's not best
//   4 FORCED?     — only-move vs quiet choice (criticality / MultiPV gap)
//   5 FORCES      — best/worst piece + why (perturbation), weak pawns, edge type
//   6 CAMPAIGN    — where it heads (structure→plan, PV trajectory)
//
// Usage: node scripts/voiced-authoring/render-briefing.mjs <videoId> [--json]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ID = process.argv[2];
const EMIT_JSON = process.argv.includes('--json');
if (!ID) { console.error('usage: node render-briefing.mjs <videoId> [--json]'); process.exit(1); }
const data = JSON.parse(readFileSync(`audit-reports/position-facts/${ID}.json`, 'utf8'));

const evalBand = (e) => e == null ? null : e >= 3 ? 'winning' : e >= 1 ? 'clearly better' : e >= 0.5 ? 'a touch better' : e > -0.5 ? 'level' : e > -1 ? 'a touch worse' : e > -3 ? 'clearly worse' : 'losing';
// Only a genuinely LOPSIDED WDL is "decided". A high draw-% in the opening is not
// "heading for a draw" — it's just early — so that read is dropped entirely.
const decided = (wdl) => wdl ? (wdl[0] >= 950 ? 'won' : wdl[2] >= 950 ? 'lost' : null) : null;
const plies = (n) => n === 1 ? 'at once' : `in ${Math.ceil(n / 2)} move${Math.ceil(n / 2) > 1 ? 's' : ''}`;
const you = (holder) => holder === 'you' ? 'you' : 'they';

// The reason → a merit/fault clause. Teach-both is enforced for bad moves:
// the clause always carries the engine's best + the refutation, per the honesty
// rules (never praise a move the engine condemns).
function moveClause(f) {
  const teachBoth = () => {
    const ref = f.refutation?.length ? ` — the line runs ${f.refutation.slice(0, 4).join(' ')}` : '';
    return `${f.best} was the move${ref}`;
  };
  switch (f.reason) {
    case 'mate': return `${f.san} — forced mate is on the board`;
    case 'only-move': return `${f.san} — the only move that holds; everything else lets it go`;
    case 'defends-threat': return `${f.san} meets the threat`;
    case 'wins-material': return `${f.san} wins material outright`;
    case 'best': return `${f.san} — the move`;
    case 'solid': return `${f.san} — sound, nothing forced`;
    case 'second-best': return `${f.san} is playable but ${f.best} was sharper`;
    case 'imprecise-defence': return `${f.san} holds but loosely; ${teachBoth()}`;
    case 'hung-piece': return `${f.san} drops material — ${teachBoth()}`;
    case 'walked-into-tactic': return `${f.san} walks into a tactic — ${teachBoth()}`;
    case 'ignored-threat': return `${f.san} leaves the threat unmet — ${teachBoth()}`;
    case 'missed-forcing-win': return `${f.san} misses the win — ${teachBoth()}`;
    case 'lost-the-thread': return `${f.san} lets the thread go — the eval swings ${f.cpLoss}cp; ${teachBoth()}`;
    default: return `${f.san}`;
  }
}

function briefingFor(f, prev, said) {
  const out = [];
  const push = (tier, text) => out.push({ tier, text });
  // say-once for the standing (non-per-move) facts — forces, structure, edge —
  // so they're stated when they FIRST appear/change, not re-read every ply
  // (pieceValueRead's `said` pattern). Per-move facts (status/threat/move)
  // always fire. key changes → it's re-said.
  const once = (tier, key, text) => { if (said.has(key)) return; said.add(key); push(tier, text); };

  // 1 STATUS — only when the band changes (never repeat "you're better" each ply)
  const band = evalBand(f.evalAfter);
  const prevBand = prev ? evalBand(prev.evalAfter) : null;
  const dec = decided(f.wdl);
  if (band && band !== prevBand) {
    // "decided" (pre-move WDL) may disagree with the post-move eval after a
    // blunder — only claim it when the resulting eval is still decisive.
    const tail = dec === 'won' && f.evalAfter >= 2.5 ? ' — the game is decided'
      : dec === 'lost' && f.evalAfter <= -2.5 ? ' — the game is decided against' : '';
    push(1, `Status: ${band === 'level' ? 'the position is level' : `${band}`}${tail}.`);
  }

  // 2 INCOMING FIRE — the standing threat, calculated out
  if (f.threat && f.threat.net >= 1) {
    const line = f.threat.pv?.length ? ` (${f.threat.pv.slice(0, 4).join(' ')})` : '';
    const land = f.threat.landsAt ? ` — it lands ${plies(f.threat.landsAt)}` : '';
    const mag = f.threat.net >= 9 ? 'the queen' : f.threat.net >= 5 ? 'a rook' : f.threat.net >= 3 ? 'a piece' : 'a pawn';
    push(2, `Incoming: they threaten ${mag}${line}${land}.`);
  }

  // 3 THE MOVE + WHY (teach-both baked into moveClause)
  push(3, `Move: ${moveClause(f)}.`);

  // 4 FORCED? — only the notable ends of the spectrum
  const gap = (f.candidates?.[0]?.cp ?? 0) - (f.candidates?.[1]?.cp ?? 0);
  if (f.reason !== 'only-move' && gap >= 150) push(4, `Only one move really works here (${f.best}).`);

  // 5 STATE OF FORCES — placement judgments are a MIDDLEGAME read (an opening
  // minor is idle because it isn't developed yet, not misplaced).
  const mid = f.positional?.phase && f.positional.phase !== 'opening';
  if (mid && f.forces?.theirBest) once(5, `theirBest-${f.forces.theirBest.square}`, `Their best piece is the ${f.forces.theirBest.piece} on ${f.forces.theirBest.square} — trading it eases the position.`);
  if (f.support) once(5, `leans-${f.support.square}-${f.support.leansOn.square}`, `Your ${f.support.piece} on ${f.support.square} leans on the ${f.support.leansOn.piece} on ${f.support.leansOn.square} — remove that and it's ordinary.`);
  if (mid && f.forces?.myWorst) once(5, `myWorst-${f.forces.myWorst.square}`, `Your worst piece is the ${f.forces.myWorst.piece} on ${f.forces.myWorst.square} — improving it is a plan in itself.`);
  // weak pawns (mechanical, correctly framed as targets)
  const iso = f.positional?.isolated;
  const mine = f.mover === 'W' ? 'w' : 'b', foe = f.mover === 'W' ? 'b' : 'w';
  if (iso?.[foe]?.length) once(5, `iso-foe-${iso[foe][0]}`, `Their ${iso[foe][0]} pawn is isolated — a long-term target.`);
  if (iso?.[mine]?.length) once(5, `iso-mine-${iso[mine][0]}`, `Your ${iso[mine][0]} pawn is isolated — a piece has to babysit it.`);
  // edge type (material vs positional) — only when they disagree
  if (f.split) {
    const sign = f.mover === 'W' ? 1 : -1;
    const m = f.split.material * sign, p = f.split.positional * sign;
    if (m + p >= 0.5 && p >= Math.abs(m) * 2 && p > 0.4) once(5, 'edge-positional', `The edge is where your pieces are, not material — keep them on.`);
    else if (m + p >= 0.5 && m >= Math.abs(p) * 2 && m > 0.4) once(5, 'edge-material', `The edge is material — trade down and convert.`);
  }

  // 6 THE CAMPAIGN — structure→plan + trajectory
  if (f.positional?.structure?.plan) once(6, `plan-${f.positional.structure.type}`, `Plan: ${f.positional.structure.plan}`);
  if (f.bestPv?.length >= 3 && (f.crit?.score ?? 0) >= 45) push(6, `The play continues ${f.bestPv.slice(0, 5).join(' ')}.`);

  return out;
}

const briefings = [];
let prev = null;
const said = new Set();
for (const f of data.facts) {
  const b = briefingFor(f, prev, said);
  briefings.push({ ply: f.ply, mover: f.mover, san: f.san, band: f.crit.band, score: f.crit.score, clauses: b });
  prev = f;
}

if (EMIT_JSON) {
  mkdirSync('audit-reports/position-facts', { recursive: true });
  const out = `audit-reports/position-facts/${ID}-briefing.json`;
  writeFileSync(out, JSON.stringify({ id: ID, opening: data.opening, briefings }, null, 2));
  console.log(`wrote ${out}`);
}
console.log(`# ${ID} — ${data.opening} — ranked briefing (general's hierarchy, no cap)\n`);
for (const b of briefings) {
  const bar = { quiet: '·', think: '▂', key: '▆', CRITICAL: '█' }[b.band];
  console.log(`${bar} ${b.ply}${b.mover} ${b.san}  [${b.band} ${b.score}]`);
  for (const c of b.clauses) console.log(`    ${c.tier}│ ${c.text}`);
  console.log('');
}
