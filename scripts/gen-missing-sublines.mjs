#!/usr/bin/env node
/**
 * Generate ALL missing subline annotations to achieve 100% coverage.
 * Handles:
 * 1. Missing variations for repertoire + gambit openings (appends to existing files)
 * 2. New separate annotation files for shared gambit entries (gambit-kings-gambit, etc.)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { Chess } from 'chess.js';

const CENTER_SQUARES = ['d4', 'd5', 'e4', 'e5'];
const EXTENDED_CENTER = ['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6'];
const KINGSIDE = ['f', 'g', 'h'];
const QUEENSIDE = ['a', 'b', 'c'];

const repertoire = JSON.parse(readFileSync('src/data/repertoire.json', 'utf-8'));
const gambits = JSON.parse(readFileSync('src/data/gambits.json', 'utf-8'));

// Shared gambit entries that need their own files
const SHARED_GAMBITS = {
  'gambit-kings-gambit': 'kings-gambit',
  'gambit-evans-gambit': 'evans-gambit',
  'gambit-budapest-gambit': 'budapest-gambit',
  'gambit-benko-gambit': 'benko-gambit',
};

let totalGenerated = 0;

// ─── PART 1: Add missing variations to existing annotation files ───

const allEntries = [...repertoire, ...gambits];

for (const entry of allEntries) {
  // Skip shared gambit entries (handled in Part 2)
  if (SHARED_GAMBITS[entry.id]) continue;

  const annoPath = `src/data/annotations/${entry.id}.json`;
  if (!existsSync(annoPath)) continue;

  const annoData = JSON.parse(readFileSync(annoPath, 'utf-8'));
  const subLines = annoData.subLines || [];

  // Ensure all existing sublines have type field
  for (const sl of subLines) {
    if (!sl.type) sl.type = 'variation';
  }

  const variations = entry.variations || [];
  const trapLines = entry.trapLines || [];
  const warningLines = entry.warningLines || [];

  // Count what's manually written vs what needs generation
  // We'll regenerate all auto-generated sublines (those from the script)
  // Keep manually-written ones (first variation, first 2 traps, first 2 warnings for repertoire)

  // For simplicity on regeneration: remove all generated sublines and recreate them
  // Keep the first variation subline if it existed before (likely hand-crafted)
  const existingVariations = subLines.filter(sl => sl.type === 'variation');
  const existingTraps = subLines.filter(sl => sl.type === 'trap');
  const existingWarnings = subLines.filter(sl => sl.type === 'warning');

  // Rebuild subLines: keep hand-crafted ones, regenerate the rest
  const newSubLines = [];
  let added = 0;

  // Keep first variation if it was manually created (pre-existing)
  if (existingVariations.length > 0) {
    newSubLines.push(existingVariations[0]);
  }

  // Generate remaining variations (from index 1 if first exists, or 0)
  const startV = existingVariations.length > 0 ? 1 : 0;
  for (let i = startV; i < variations.length; i++) {
    const v = variations[i];
    newSubLines.push({
      name: v.name,
      type: 'variation',
      moveAnnotations: generateAnnotationsForLine(v.pgn, v.name, 'variation', entry.name, v.explanation),
    });
    added++;
  }

  // Keep existing traps (likely hand-crafted from previous session)
  for (const t of existingTraps) {
    newSubLines.push(t);
  }

  // Generate missing traps
  for (let i = existingTraps.length; i < trapLines.length; i++) {
    const trap = trapLines[i];
    newSubLines.push({
      name: trap.name,
      type: 'trap',
      moveAnnotations: generateAnnotationsForLine(trap.pgn, trap.name, 'trap', entry.name, trap.explanation),
    });
    added++;
  }

  // Keep existing warnings
  for (const w of existingWarnings) {
    newSubLines.push(w);
  }

  // Generate missing warnings
  for (let i = existingWarnings.length; i < warningLines.length; i++) {
    const warning = warningLines[i];
    newSubLines.push({
      name: warning.name,
      type: 'warning',
      moveAnnotations: generateAnnotationsForLine(warning.pgn, warning.name, 'warning', entry.name, warning.explanation),
    });
    added++;
  }

  const subLinesToUse = newSubLines;

  if (added > 0) {
    annoData.subLines = subLinesToUse;
    writeFileSync(annoPath, JSON.stringify(annoData, null, 2) + '\n');
    console.log(`✓ ${entry.id}: ${added} new sublines (total: ${subLinesToUse.length})`);
    totalGenerated += added;
  }
}

// ─── PART 2: Create separate annotation files for shared gambit entries ───

for (const [gambitId, baseId] of Object.entries(SHARED_GAMBITS)) {
  const gambitEntry = gambits.find(g => g.id === gambitId);
  if (!gambitEntry) {
    console.log(`✗ ${gambitId}: not found in gambits.json`);
    continue;
  }

  // Read the base annotation file to get the main line moveAnnotations
  const basePath = `src/data/annotations/${baseId}.json`;
  const baseData = JSON.parse(readFileSync(basePath, 'utf-8'));

  // Build the new annotation file with ALL sublines for this gambit entry
  const subLines = [];
  const variations = gambitEntry.variations || [];
  const trapLines = gambitEntry.trapLines || [];
  const warningLines = gambitEntry.warningLines || [];

  // Generate all variations
  for (const v of variations) {
    subLines.push({
      name: v.name,
      type: 'variation',
      moveAnnotations: generateAnnotationsForLine(
        v.pgn, v.name, 'variation', gambitEntry.name, v.explanation
      ),
    });
  }

  // Generate all traps
  for (const trap of trapLines) {
    subLines.push({
      name: trap.name,
      type: 'trap',
      moveAnnotations: generateAnnotationsForLine(
        trap.pgn, trap.name, 'trap', gambitEntry.name, trap.explanation
      ),
    });
  }

  // Generate all warnings
  for (const warning of warningLines) {
    subLines.push({
      name: warning.name,
      type: 'warning',
      moveAnnotations: generateAnnotationsForLine(
        warning.pgn, warning.name, 'warning', gambitEntry.name, warning.explanation
      ),
    });
  }

  // Generate main line annotations too
  const mainAnnotations = generateAnnotationsForLine(
    gambitEntry.pgn, gambitEntry.name, 'mainline', gambitEntry.name, gambitEntry.description
  );

  const newAnnoData = {
    moveAnnotations: mainAnnotations,
    subLines,
  };

  const newPath = `src/data/annotations/${gambitId}.json`;
  writeFileSync(newPath, JSON.stringify(newAnnoData, null, 2) + '\n');
  console.log(`✓ ${gambitId}: created NEW file with ${subLines.length} sublines (${variations.length}v/${trapLines.length}t/${warningLines.length}w)`);
  totalGenerated += subLines.length;
}

console.log(`\nTotal sublines generated: ${totalGenerated}`);

// ═══════════════════════════════════════════════════════════════════
// Position-aware annotation generation using chess.js board analysis
// ═══════════════════════════════════════════════════════════════════

function generateAnnotationsForLine(pgn, lineName, lineType, openingName, explanation) {
  const moves = pgn.trim().replace(/\d+\.\s*/g, '').split(/\s+/).filter(m => m.length > 0);
  const chess = new Chess();
  const annotations = [];

  for (let i = 0; i < moves.length; i++) {
    const san = moves[i];
    const isWhite = i % 2 === 0;
    const side = isWhite ? 'White' : 'Black';

    // Snapshot board before the move for context
    const boardBefore = chess.board();

    let verbose;
    try {
      verbose = chess.move(san);
    } catch {
      console.warn(`  Warning: invalid move "${san}" at index ${i} in ${lineName} (${openingName})`);
      break;
    }

    const ctx = analyzeMove(verbose, chess, boardBefore, i, moves.length, side);

    let annotation;
    if (lineType === 'trap') {
      annotation = generateTrapAnnotation(san, i, moves.length, side, ctx, lineName, openingName, explanation);
    } else if (lineType === 'warning') {
      annotation = generateWarningAnnotation(san, i, moves.length, side, ctx, lineName, openingName, explanation);
    } else {
      annotation = generateVariationAnnotation(san, i, moves.length, side, ctx, lineName, openingName, explanation);
    }

    const entry = { san, annotation };

    // Add arrows for key moves
    if (i >= moves.length - 3 || ctx.isCapture || ctx.isCheck) {
      const color = lineType === 'trap' ? 'rgba(220, 50, 50, 0.8)'
        : lineType === 'warning' ? 'rgba(230, 170, 30, 0.8)'
        : 'rgba(50, 150, 220, 0.8)';
      entry.arrows = [{ from: verbose.from, to: verbose.to, color }];
    }

    annotations.push(entry);
  }

  return annotations;
}

/** Analyze a move using chess.js verbose data + board state */
function analyzeMove(verbose, chess, boardBefore, idx, total, side) {
  const { from, to, piece, captured, san, flags } = verbose;
  const isCapture = !!captured;
  const isCheck = san.includes('+') || san.includes('#');
  const isCastle = san === 'O-O' || san === 'O-O-O';
  const isKingsideCastle = san === 'O-O';
  const isPromotion = flags.includes('p');

  // What piece moved (full name)
  const pieceNames = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const pieceName = pieceNames[piece] || 'piece';
  const capturedName = captured ? (pieceNames[captured] || 'piece') : null;

  // Positional analysis
  const toFile = to[0];
  const toRank = to[1];
  const fromFile = from[0];
  const fromRank = from[1];
  const isToCenter = CENTER_SQUARES.includes(to);
  const isToExtendedCenter = EXTENDED_CENTER.includes(to);
  const isKingsideMove = KINGSIDE.includes(toFile);
  const isQueensideMove = QUEENSIDE.includes(toFile);

  // Is this developing a piece from the back rank?
  const backRank = side === 'White' ? '1' : '8';
  const isDeveloping = piece !== 'p' && piece !== 'k' && fromRank === backRank && toRank !== backRank;

  // Is this a pawn advance toward center?
  const isPawnCenter = piece === 'p' && isToCenter;
  const isPawnPush = piece === 'p' && !isCapture;

  // Fianchetto detection
  const isFianchetto = piece === 'b' && (to === 'g2' || to === 'b2' || to === 'g7' || to === 'b7');

  // Pin/fork/attack detection via checking if move attacks key squares
  const isInCheck = chess.inCheck();

  // Count attackers on central squares after move
  const controlsCenter = piece !== 'k' && (isToCenter || isToExtendedCenter);

  // Determine strategic purpose
  let purpose = '';
  if (isCastle) {
    purpose = isKingsideCastle ? 'king-safety-short' : 'king-safety-long';
  } else if (isFianchetto) {
    purpose = 'fianchetto';
  } else if (isDeveloping && isToCenter) {
    purpose = 'develop-center';
  } else if (isDeveloping) {
    purpose = 'develop';
  } else if (isPawnCenter) {
    purpose = 'center-control';
  } else if (isPawnPush && isKingsideMove) {
    purpose = 'kingside-expansion';
  } else if (isPawnPush && isQueensideMove) {
    purpose = 'queenside-expansion';
  } else if (isCapture) {
    purpose = 'capture';
  } else if (isCheck) {
    purpose = 'check';
  } else if (piece === 'r' && (toFile === 'd' || toFile === 'e')) {
    purpose = 'rook-centralize';
  } else if (piece === 'q') {
    purpose = 'queen-activity';
  } else if (controlsCenter) {
    purpose = 'influence-center';
  } else {
    purpose = 'reposition';
  }

  return {
    pieceName, capturedName, from, to, toFile, toRank, fromFile, fromRank,
    isCapture, isCheck, isCastle, isKingsideCastle, isPromotion,
    isDeveloping, isPawnCenter, isPawnPush, isFianchetto,
    isKingsideMove, isQueensideMove, isToCenter, controlsCenter,
    purpose, piece, side,
  };
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

/** Explain WHY a move is played based on position context */
function explainPurpose(san, ctx) {
  const { purpose, pieceName, capturedName, to, side, isKingsideCastle } = ctx;

  switch (purpose) {
    case 'king-safety-short':
      return `${side} castles kingside to tuck the king away safely and activate the rook. Connecting the rooks is a priority.`;
    case 'king-safety-long':
      return `${side} castles queenside — this often signals aggressive intentions, as the kingside pawns can advance for an attack.`;
    case 'fianchetto':
      return `${san} — ${side} fianchettoes the bishop, placing it on the long diagonal where it controls the center from a distance. This is a key positional idea.`;
    case 'develop-center':
      return `${san} develops the ${pieceName} to a strong central post on ${to}, where it controls key squares and supports the center.`;
    case 'develop':
      return `${san} brings the ${pieceName} into the game. Development with purpose — the ${pieceName} on ${to} eyes important squares.`;
    case 'center-control':
      return `${san} stakes a claim in the center. Central pawns control space and restrict the opponent's piece activity.`;
    case 'kingside-expansion':
      return `${san} pushes on the kingside. This pawn advance gains space and can support a future attack toward the enemy king.`;
    case 'queenside-expansion':
      return `${san} expands on the queenside. Gaining space here creates potential targets and restricts the opponent's counterplay.`;
    case 'capture':
      return `${san} captures the ${capturedName}. This exchange changes the balance — ${side} reconfigures the pawn structure or gains material.`;
    case 'check':
      return `${san}! Check — ${side} forces the king to respond, gaining tempo to improve the position.`;
    case 'rook-centralize':
      return `${san} places the rook on a central file where it will be most active. Rooks belong on open or semi-open files.`;
    case 'queen-activity':
      return `${san} activates the queen. From ${to}, the queen has maximum influence across multiple diagonals and files.`;
    case 'influence-center':
      return `${san} increases ${side}'s influence over the center. Controlling the center is the foundation of a strong position.`;
    case 'reposition':
      return `${san} improves the ${pieceName}'s placement. The ${pieceName} was less effective on ${ctx.from} and moves to ${to} where it serves the plan better.`;
    default:
      return `${side} plays ${san}.`;
  }
}

function generateVariationAnnotation(san, idx, total, side, ctx, varName, openingName, explanation) {
  if (idx === 0) {
    return `The ${varName} is an important variation of the ${openingName}. ${explanation || 'Understanding this line will strengthen your repertoire.'} Let's walk through the key ideas.`;
  }

  if (idx === 1) {
    if (ctx.isCapture) return `${san} — ${side} captures the ${ctx.capturedName}, entering this variation. This exchange defines the character of the ${varName}.`;
    if (ctx.isPawnCenter) return `${side} responds with ${san}, contesting the center. This is the move that defines the ${varName}.`;
    return `${side} replies with ${san}. This is the defining move of the ${varName} — it shapes the pawn structure and determines the resulting plans.`;
  }

  // Use position-aware explanations for middle moves
  if (idx < total - 3) {
    return explainPurpose(san, ctx);
  }

  if (idx === total - 3) {
    const base = explainPurpose(san, ctx);
    return `${base} We're reaching the critical position of this variation.`;
  }

  if (idx === total - 2) {
    if (ctx.isCapture) return `${san} captures the ${ctx.capturedName}. This exchange is thematic in the ${varName} — it defines the resulting pawn structure and piece activity.`;
    if (ctx.isCheck) return `${san}! Check — this tactical motif is worth remembering. It's a key resource in the ${varName}.`;
    const base = explainPurpose(san, ctx);
    return `${base} Notice how the pieces coordinate in this position.`;
  }

  if (idx === total - 1) {
    if (ctx.isCheck) return `${san}! This is the key position of the ${varName}. ${side} has the initiative with check. Remember this pattern — it comes up frequently in practice.`;
    if (ctx.isCapture) return `${san} completes the variation. The resulting position after this capture offers ${side} clear targets and plans. Study this structure — you'll see it often.`;
    return `${san}. This is the typical position arising from the ${varName}. From here, understanding the strategic plans — piece placement, pawn breaks, and targets — is essential.`;
  }

  return explainPurpose(san, ctx);
}

function generateTrapAnnotation(san, idx, total, side, ctx, trapName, openingName, explanation) {
  if (idx === 0) {
    return `In the ${openingName}, the ${trapName} is a tactical pattern you should know. ${explanation || 'This trap punishes a common mistake.'} Let's walk through how it works.`;
  }

  if (idx < 3) {
    if (ctx.isCastle) return `${side} castles, securing the king. Meanwhile, the trap is being set.`;
    if (ctx.isCapture) return `${side} captures the ${ctx.capturedName} with ${san}. This exchange is part of the trap setup — it looks natural.`;
    if (ctx.isDeveloping) return `${san} develops the ${ctx.pieceName} to ${ctx.to}. The position looks normal, but the key moment is approaching.`;
    return `${side} plays ${san}, building the position. The trap is already in motion.`;
  }

  if (idx < total - 3) {
    if (ctx.isCapture) return `${side} captures with ${san}. This looks like a natural recapture, but it walks right into the trap.`;
    if (ctx.isCheck) return `${san}! Check — this is a critical moment in the trap. The forced response leads to trouble.`;
    if (ctx.isCastle) return `${side} castles, thinking the position is safe. But danger is lurking.`;
    const base = explainPurpose(san, ctx);
    return `${base} The opponent may not realize the trap is being set.`;
  }

  if (idx === total - 1) {
    if (ctx.isCheck) return `${san}! And this is the final blow. ${side} delivers check and wins material. This is why the ${trapName} is so dangerous — memorize this pattern!`;
    if (ctx.isCapture) return `${san}! ${side} wins the ${ctx.capturedName}. The trap is complete — the material advantage is decisive. Remember this pattern.`;
    return `${san}! The trap is sprung. ${side} has a winning position. This is the key takeaway from the ${trapName}.`;
  }

  if (idx === total - 2) {
    if (ctx.isCapture) return `${san}! The trap is revealed — ${side} wins the ${ctx.capturedName}. There's no good way to avoid material loss.`;
    if (ctx.isCheck) return `${san}! Check! The trap is sprung — the forced response leads to a lost position.`;
    return `${san}! This is the critical move that springs the trap. The opponent's position collapses.`;
  }

  if (idx === total - 3) {
    return `${san}. This is where the trap begins. The next two moves are the key sequence you need to memorize.`;
  }

  return explainPurpose(san, ctx);
}

function generateWarningAnnotation(san, idx, total, side, ctx, warningName, openingName, explanation) {
  if (idx === 0) {
    return `In the ${openingName}, the ${warningName} is a dangerous line you must be aware of. ${explanation || 'If you\'re not careful, you can end up in a difficult position.'} Let's see why.`;
  }

  if (idx < 3) {
    if (ctx.isCastle) return `${side} castles. The position looks safe so far, but this line has hidden dangers.`;
    if (ctx.isCapture) return `${san} captures the ${ctx.capturedName}. This exchange pulls you into the dangerous line — be alert.`;
    if (ctx.isDeveloping) return `${san} develops the ${ctx.pieceName}. The natural continuation, but it leads toward the warning line.`;
    return `${side} plays ${san}. This is the natural continuation that leads into the problematic position.`;
  }

  if (idx < total - 3) {
    if (ctx.isCapture) return `${san} captures the ${ctx.capturedName}. This exchange changes the character of the position — the danger is increasing.`;
    if (ctx.isCheck) return `${san}! Check forces a response. This is where the danger accelerates.`;
    if (ctx.isCastle) return `${side} castles, but the position already requires very careful play.`;
    const base = explainPurpose(san, ctx);
    return `${base} Be alert — a mistake in this position would be very costly.`;
  }

  if (idx === total - 1) {
    if (ctx.isCheck) return `${san}! This is the position you must avoid. ${side} has a dangerous attack with check. Know this pattern so you can sidestep it earlier in the line.`;
    if (ctx.isCapture) return `${san} wins the ${ctx.capturedName}. The damage is done — this is the result you want to prevent. Remember where the critical decision point was earlier.`;
    return `${san}. This is the uncomfortable position that results from this line. Now that you've seen it, you'll know to avoid the pitfall.`;
  }

  if (idx === total - 2) {
    if (ctx.isCapture) return `${san}! This capture of the ${ctx.capturedName} is what causes all the trouble in this line.`;
    if (ctx.isCheck) return `${san}! Check — the position is now very dangerous for the defending side.`;
    return `${san}. The position is now very difficult. This is the warning — don't let your opponent reach this.`;
  }

  if (idx === total - 3) {
    return `${san}. We're approaching the critical position. Pay close attention to the next moves — this is where the danger lies.`;
  }

  return explainPurpose(san, ctx);
}
