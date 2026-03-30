#!/usr/bin/env node
/**
 * Generate missing trap/warning subline annotations and add type fields.
 *
 * Usage: node scripts/generate-subline-annotations.mjs [opening-ids...]
 * If no IDs given, processes all openings.
 */

import { readFileSync, writeFileSync } from 'fs';
import { Chess } from 'chess.js';

const repertoire = JSON.parse(readFileSync('src/data/repertoire.json', 'utf-8'));
const gambits = JSON.parse(readFileSync('src/data/gambits.json', 'utf-8'));
const allEntries = [...repertoire, ...gambits];

// Get opening IDs from args, or do all
const requestedIds = process.argv.slice(2);

for (const entry of allEntries) {
  if (requestedIds.length > 0 && !requestedIds.includes(entry.id)) continue;

  const annoPath = `src/data/annotations/${entry.id}.json`;
  let annoData;
  try {
    annoData = JSON.parse(readFileSync(annoPath, 'utf-8'));
  } catch {
    // Some gambits share annotation files via index.ts mapping
    continue;
  }

  const variations = entry.variations || [];
  const trapLines = entry.trapLines || [];
  const warningLines = entry.warningLines || [];

  // Add type to existing sublines (assumed to be variations)
  const existingSubLines = annoData.subLines || [];
  for (const sl of existingSubLines) {
    if (!sl.type) sl.type = 'variation';
  }

  // Check which traps are missing
  const existingTraps = existingSubLines.filter(sl => sl.type === 'trap');
  const existingWarnings = existingSubLines.filter(sl => sl.type === 'warning');

  // Generate missing trap annotations
  for (let i = existingTraps.length; i < trapLines.length; i++) {
    const trap = trapLines[i];
    const annotations = generateAnnotationsForLine(
      trap.pgn, trap.name, 'trap', entry.name, trap.explanation
    );
    existingSubLines.push({
      name: trap.name,
      type: 'trap',
      moveAnnotations: annotations,
    });
  }

  // Generate missing warning annotations
  for (let i = existingWarnings.length; i < warningLines.length; i++) {
    const warning = warningLines[i];
    const annotations = generateAnnotationsForLine(
      warning.pgn, warning.name, 'warning', entry.name, warning.explanation
    );
    existingSubLines.push({
      name: warning.name,
      type: 'warning',
      moveAnnotations: annotations,
    });
  }

  annoData.subLines = existingSubLines;
  writeFileSync(annoPath, JSON.stringify(annoData, null, 2) + '\n');

  const newTraps = trapLines.length - existingTraps.length;
  const newWarnings = warningLines.length - existingWarnings.length;
  if (newTraps > 0 || newWarnings > 0 || existingSubLines.some(sl => sl.type)) {
    console.log(`${entry.id}: ${existingSubLines.length} sublines (${newTraps} new traps, ${newWarnings} new warnings)`);
  }
}

/**
 * Generate move-by-move annotations for a line.
 */
function generateAnnotationsForLine(pgn, lineName, lineType, openingName, explanation) {
  const moves = pgn.trim().split(/\s+/);
  const chess = new Chess();
  const annotations = [];

  for (let i = 0; i < moves.length; i++) {
    const san = moves[i];
    const isWhite = i % 2 === 0;
    const moveNum = Math.floor(i / 2) + 1;
    const side = isWhite ? 'White' : 'Black';

    // Get position info before making the move
    let annotation;

    try {
      chess.move(san);
    } catch {
      // Skip invalid moves
      break;
    }

    const position = chess.fen();
    const isCapture = san.includes('x');
    const isCheck = san.includes('+') || san.includes('#');
    const isCastle = san === 'O-O' || san === 'O-O-O';
    const isPawnMove = san[0] === san[0].toLowerCase() && !isCastle;
    const piece = getPieceName(san);

    if (lineType === 'trap') {
      annotation = generateTrapAnnotation(
        san, i, moves.length, side, moveNum, piece, isCapture, isCheck, isCastle,
        lineName, openingName, explanation
      );
    } else {
      annotation = generateWarningAnnotation(
        san, i, moves.length, side, moveNum, piece, isCapture, isCheck, isCastle,
        lineName, openingName, explanation
      );
    }

    const entry = { san, annotation };

    // Add arrows for key moves
    if (i >= moves.length - 3 || isCapture || isCheck) {
      const from = getFromSquare(san, chess, i);
      const to = getToSquare(san);
      if (from && to) {
        entry.arrows = [{
          from, to,
          color: lineType === 'trap' ? 'rgba(220, 50, 50, 0.8)' : 'rgba(230, 170, 30, 0.8)'
        }];
      }
    }

    annotations.push(entry);
  }

  return annotations;
}

function getPieceName(san) {
  if (san === 'O-O' || san === 'O-O-O') return 'king';
  const first = san[0];
  switch (first) {
    case 'K': return 'king';
    case 'Q': return 'queen';
    case 'R': return 'rook';
    case 'B': return 'bishop';
    case 'N': return 'knight';
    default: return 'pawn';
  }
}

function getToSquare(san) {
  // Extract destination square from SAN
  const clean = san.replace(/[+#=QRBN].*$/, '');
  if (clean === 'O-O') return 'g1';
  if (clean === 'O-O-O') return 'c1';
  const match = clean.match(/([a-h][1-8])$/);
  return match ? match[1] : null;
}

function getFromSquare(san, chess, moveIdx) {
  // Try to get from the history
  const history = chess.history({ verbose: true });
  if (history.length > 0) {
    return history[history.length - 1].from;
  }
  return null;
}

function generateTrapAnnotation(san, idx, total, side, moveNum, piece, isCapture, isCheck, isCastle, trapName, openingName, explanation) {
  // Opening move context
  if (idx === 0) {
    return `In the ${openingName}, the ${trapName} is a tactical pattern you should know. ${explanation || `This trap punishes a common mistake.`} Let's walk through how it works.`;
  }

  // Early moves — set the scene
  if (idx < 3) {
    if (isCastle) return `${side} castles, preparing for the middlegame while the trap is being set.`;
    if (isCapture) return `${side} captures with ${san}. This exchange is part of the trap setup.`;
    return `${side} plays ${san}, establishing the position. The key moment is approaching.`;
  }

  // Middle moves — building tension
  if (idx < total - 3) {
    if (isCapture) return `${side} captures with ${san}. This looks natural, but it walks into the trap.`;
    if (isCheck) return `${side} gives check with ${san}! This is a critical moment in the trap.`;
    if (isCastle) return `${side} castles. The position looks safe, but danger lurks.`;
    const templates = [
      `${side} plays ${san}. This move looks reasonable but allows the trap to unfold.`,
      `${side} continues with ${san}. The trap is being set up — watch the next few moves carefully.`,
      `${san} by ${side}. The position is heading toward the critical moment.`,
      `${side} plays ${san}, developing normally. The opponent may not see what's coming.`,
    ];
    return templates[idx % templates.length];
  }

  // Last 3 moves — the payoff
  if (idx === total - 1) {
    if (isCheck) return `${san}! And this is the final blow. ${side} delivers check and wins material. This is why the ${trapName} is so dangerous — memorize this pattern!`;
    if (isCapture) return `${san}! ${side} wins material. The trap is complete. Remember this pattern — your opponents will fall for it.`;
    return `${san}! The trap is sprung. ${side} has a winning position. This is the key takeaway from the ${trapName}.`;
  }

  if (idx === total - 2) {
    if (isCapture) return `${san}! Now the trap is revealed. ${side} wins material with this capture.`;
    if (isCheck) return `${san}! Check! The trap is sprung — there's no good defense here.`;
    return `${san}! This is the critical move that springs the trap. The opponent is in serious trouble.`;
  }

  if (idx === total - 3) {
    return `${san}. This is where the trap begins. The next two moves are the key sequence you need to memorize.`;
  }

  return `${side} plays ${san}.`;
}

function generateWarningAnnotation(san, idx, total, side, moveNum, piece, isCapture, isCheck, isCastle, warningName, openingName, explanation) {
  if (idx === 0) {
    return `In the ${openingName}, the ${warningName} is a dangerous line you must be aware of. ${explanation || `If you're not careful, you can end up in a difficult position.`} Let's see why.`;
  }

  if (idx < 3) {
    if (isCastle) return `${side} castles. The position looks normal so far.`;
    if (isCapture) return `${side} captures with ${san}. This sequence leads to the dangerous line.`;
    return `${side} plays ${san}. This is the natural continuation that leads into the warning line.`;
  }

  if (idx < total - 3) {
    if (isCapture) return `${san} — this capture changes the character of the position. Be alert.`;
    if (isCheck) return `${san}! Check forces a response. This is where the danger begins.`;
    if (isCastle) return `${side} castles, but the position requires careful play.`;
    const templates = [
      `${side} plays ${san}. This is the problematic continuation you need to recognize.`,
      `${san} by ${side}. The position is becoming uncomfortable — careful defense is needed.`,
      `${side} continues with ${san}. Watch out — a mistake here would be very costly.`,
      `${san}. The position is sharp and requires precise play from this point forward.`,
    ];
    return templates[idx % templates.length];
  }

  if (idx === total - 1) {
    if (isCheck) return `${san}! This is the position you must avoid. ${side} has a dangerous attack. Know this pattern so you can sidestep it earlier.`;
    if (isCapture) return `${san}. The damage is done — this is the result you want to prevent. Remember where the critical decision point was earlier in the line.`;
    return `${san}. This is the uncomfortable position that results from this line. Now that you've seen it, you'll know to avoid the pitfall.`;
  }

  if (idx === total - 2) {
    if (isCapture) return `${san}! This is the move that causes all the trouble.`;
    if (isCheck) return `${san}! Check — and the position is very dangerous for the defending side.`;
    return `${san}. The position is now very difficult. This is the warning — don't let your opponent reach this.`;
  }

  if (idx === total - 3) {
    return `${san}. We're approaching the critical position. Pay close attention to the next moves — this is where the danger lies.`;
  }

  return `${side} plays ${san}.`;
}
