#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const dataPath = path.join(repoRoot, 'src/data/model-games.json');

const games = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Helper: extract just piece placement from FEN (first field)
function placement(fen) {
  return fen.split(' ')[0];
}

function buildPlyMap(pgn) {
  // Returns array of { plyIndex (1-based), moveNum, color, san, fenAfter }
  const chess = new Chess();
  const tokens = pgn.trim().split(/\s+/);
  const positions = [{ plyIndex: 0, moveNum: 0, color: null, san: null, fenAfter: chess.fen() }];
  let i = 0;
  for (const tok of tokens) {
    let r;
    try { r = chess.move(tok); } catch { r = null; }
    if (!r) {
      return { ok: false, illegalAt: i + 1, illegalSan: tok, positions };
    }
    i++;
    positions.push({
      plyIndex: i,
      moveNum: Math.ceil(i / 2),
      color: i % 2 === 1 ? 'white' : 'black',
      san: tok,
      fenAfter: chess.fen(),
    });
  }
  return { ok: true, positions };
}

// For a critical moment (moveNumber, color), the "natural" anchor positions to test:
//   A) BEFORE that move was played (i.e. it's that side's turn to move it)
//   B) AFTER that move was played
//   C) AFTER both colors played (i.e. after the reply)
// We accept a match against any of A/B/C.
function anchorsForMoment(positions, moveNum, color) {
  const movePly = (moveNum - 1) * 2 + (color === 'white' ? 1 : 2);
  const beforePly = movePly - 1;
  const afterPly = movePly;
  const afterReplyPly = movePly + 1;
  return [
    { label: 'before move', ply: beforePly, p: positions[beforePly] },
    { label: 'after move',  ply: afterPly,  p: positions[afterPly]  },
    { label: 'after reply', ply: afterReplyPly, p: positions[afterReplyPly] },
  ].filter(a => a.p);
}

let totalIssues = 0;
const issuesByGame = {};

for (const g of games) {
  const issues = [];
  const parsed = buildPlyMap(g.pgn);

  if (!parsed.ok) {
    issues.push(`PGN illegal at token #${parsed.illegalAt}: "${parsed.illegalSan}"`);
  } else {
    // Check each critical moment
    for (let idx = 0; idx < (g.criticalMoments ?? []).length; idx++) {
      const cm = g.criticalMoments[idx];
      const want = placement(cm.fen);
      const anchors = anchorsForMoment(parsed.positions, cm.moveNumber, cm.color);
      let matched = null;
      for (const a of anchors) {
        if (placement(a.p.fenAfter) === want) { matched = a; break; }
      }
      if (!matched) {
        // No match against any anchor. Try ANY ply in the game.
        let anyMatch = null;
        for (const p of parsed.positions) {
          if (placement(p.fenAfter) === want) { anyMatch = p; break; }
        }
        if (anyMatch) {
          issues.push(`criticalMoments[${idx}] FEN matches ply ${anyMatch.plyIndex} (move ${anyMatch.moveNum} ${anyMatch.color}), not declared move ${cm.moveNumber} ${cm.color}`);
        } else {
          issues.push(`criticalMoments[${idx}] FEN is UNREACHABLE from the PGN (no ply in the game matches the stored piece placement). moveNumber=${cm.moveNumber} color=${cm.color}`);
        }
      }
    }
  }

  if (issues.length > 0) {
    issuesByGame[g.id] = { id: g.id, openingId: g.openingId, white: g.white, black: g.black, year: g.year, event: g.event, issues };
    totalIssues += issues.length;
  }
}

console.log(`Audited ${games.length} model games`);
console.log(`Games with issues: ${Object.keys(issuesByGame).length}`);
console.log(`Total issues: ${totalIssues}`);
console.log('');
for (const [id, info] of Object.entries(issuesByGame)) {
  console.log(`--- ${id} (${info.openingId}) ---`);
  console.log(`    ${info.white} vs ${info.black}, ${info.event} ${info.year}`);
  for (const issue of info.issues) {
    console.log(`    ✗ ${issue}`);
  }
}

// Also output JSON for downstream
fs.writeFileSync(
  path.join(repoRoot, 'audit-reports/model-games-deterministic.json'),
  JSON.stringify({ total: games.length, failing: Object.keys(issuesByGame).length, issues: issuesByGame }, null, 2),
);
