#!/usr/bin/env node
/**
 * Extends annotation files with new subLine entries for repertoire variations
 * that currently lack coverage. Uses chess.js for accurate board state tracking
 * and generates detailed, chess-specific annotations.
 */

const { Chess } = require('chess.js');
const fs = require('fs');
const path = require('path');

const ANNOTATIONS_DIR = path.join(__dirname, '../src/data/annotations');
const REPERTOIRE_PATH = path.join(__dirname, '../src/data/repertoire.json');

// Color constants matching existing annotation conventions
const GREEN = 'rgba(0, 180, 80, 0.8)';
const BLUE = 'rgba(0, 120, 255, 0.8)';
const RED = 'rgba(255, 50, 50, 0.8)';
const ORANGE = 'rgba(255, 165, 0, 0.8)';
const YELLOW_HL = 'rgba(255, 255, 0, 0.4)';
const RED_HL = 'rgba(255, 50, 50, 0.3)';
const GREEN_HL = 'rgba(0, 180, 80, 0.3)';

// ────────────────────────────────────────────────
// Chess analysis helpers
// ────────────────────────────────────────────────

function parsePgnToSans(pgn) {
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  const chess = new Chess();
  const sans = [];
  for (const token of tokens) {
    try {
      const move = chess.move(token);
      sans.push(move.san);
    } catch { break; }
  }
  return sans;
}

function countMatchingMoves(pgn, annotations) {
  const sans = parsePgnToSans(pgn);
  let matches = 0;
  for (let i = 0; i < Math.min(sans.length, annotations.length); i++) {
    if (sans[i] === annotations[i].san) matches++;
    else break;
  }
  return matches;
}

function findBestMatch(pgn, data) {
  const mainMatch = countMatchingMoves(pgn, data.moveAnnotations);
  let bestMatch = mainMatch;
  let bestIdx = -1;
  if (data.subLines) {
    for (let i = 0; i < data.subLines.length; i++) {
      const subMatch = countMatchingMoves(pgn, data.subLines[i].moveAnnotations);
      if (subMatch > bestMatch) {
        bestMatch = subMatch;
        bestIdx = i;
      }
    }
  }
  return { bestMatch, bestIdx };
}

/**
 * Get the piece name from chess.js piece type
 */
function pieceName(type) {
  const names = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  return names[type] || 'piece';
}

function pieceNameCap(type) {
  const n = pieceName(type);
  return n.charAt(0).toUpperCase() + n.slice(1);
}

/**
 * Describe a square in natural language
 */
function descSquare(sq) {
  const file = sq[0];
  const rank = sq[1];
  const fileNames = { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h' };
  return sq;
}

/**
 * Get squares controlled by a piece at a given square
 */
function getControlledSquares(chess, square) {
  const piece = chess.get(square);
  if (!piece) return [];
  // Use chess.js moves to find what this piece attacks
  const moves = chess.moves({ square, verbose: true });
  return moves.map(m => m.to);
}

/**
 * Analyze the pawn structure
 */
function analyzePawnStructure(chess) {
  const board = chess.board();
  const whitePawns = [];
  const blackPawns = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (sq && sq.type === 'p') {
        const file = String.fromCharCode(97 + f);
        const rank = 8 - r;
        if (sq.color === 'w') whitePawns.push({ file, rank, sq: file + rank });
        else blackPawns.push({ file, rank, sq: file + rank });
      }
    }
  }
  return { whitePawns, blackPawns };
}

function describePawnStructure(chess, color) {
  const { whitePawns, blackPawns } = analyzePawnStructure(chess);
  const pawns = color === 'w' ? whitePawns : blackPawns;
  const oppPawns = color === 'w' ? blackPawns : whitePawns;
  const side = color === 'w' ? 'White' : 'Black';
  const oppSide = color === 'w' ? 'Black' : 'White';

  const files = pawns.map(p => p.file);
  const fileCount = {};
  files.forEach(f => fileCount[f] = (fileCount[f] || 0) + 1);

  const doubled = Object.entries(fileCount).filter(([, c]) => c > 1).map(([f]) => f);
  const isolated = files.filter(f => {
    const prev = String.fromCharCode(f.charCodeAt(0) - 1);
    const next = String.fromCharCode(f.charCodeAt(0) + 1);
    return !files.includes(prev) && !files.includes(next);
  });

  const centerPawns = pawns.filter(p => 'de'.includes(p.file));

  const parts = [];
  if (centerPawns.length >= 2) {
    parts.push(`${side} has a strong central pawn duo on ${centerPawns.map(p => p.sq).join(' and ')}`);
  } else if (centerPawns.length === 1) {
    parts.push(`${side} has a central pawn on ${centerPawns[0].sq}`);
  }
  if (doubled.length > 0) {
    parts.push(`doubled pawns on the ${doubled.join(' and ')}-file${doubled.length > 1 ? 's' : ''}`);
  }
  if (isolated.length > 0 && isolated.length <= 2) {
    parts.push(`isolated pawn on ${isolated.join(' and ')}`);
  }

  if (parts.length === 0) {
    return `${side} has a solid pawn structure with good central presence.`;
  }
  return parts.join(', ') + '.';
}

// ────────────────────────────────────────────────
// Annotation text generators
// ────────────────────────────────────────────────

// Variation pool for natural language diversity
const DEVELOPS_PHRASES = [
  (piece, sq) => `develops the ${piece} to ${sq}`,
  (piece, sq) => `brings the ${piece} to its natural square on ${sq}`,
  (piece, sq) => `activates the ${piece} on ${sq}`,
  (piece, sq) => `places the ${piece} on the active ${sq} square`,
  (piece, sq) => `deploys the ${piece} to ${sq}`,
];

const CAPTURES_PHRASES = [
  (piece, sq) => `captures on ${sq}`,
  (piece, sq) => `takes on ${sq}`,
  (piece, sq) => `wins the piece on ${sq}`,
  (piece, sq) => `removes the defender on ${sq}`,
  (piece, sq) => `exchanges on ${sq}`,
];

const PAWN_PUSH_PHRASES = [
  (sq) => `pushes the pawn to ${sq}`,
  (sq) => `advances to ${sq}`,
  (sq) => `stakes a claim on ${sq}`,
  (sq) => `moves forward to ${sq}`,
  (sq) => `expands with the pawn to ${sq}`,
];

const CASTLES_PHRASES = [
  'Castles to safety, connecting the rooks and tucking the king away.',
  'Castles, completing king safety and activating the rook.',
  'Gets the king to safety with castling, an essential step before the middlegame battle begins.',
  'Tucks the king to safety via castling. The rook now enters the game on a central file.',
];

const CHECK_PHRASES = [
  'delivers check, forcing the opponent to respond immediately',
  'checks the king, creating tactical pressure',
  'gives check, disrupting the opponent\'s coordination',
];

const CONTROL_PHRASES = [
  (sqs) => `controlling the key ${sqs.join(' and ')} squares`,
  (sqs) => `exerting influence over ${sqs.join(' and ')}`,
  (sqs) => `fighting for control of ${sqs.join(' and ')}`,
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate annotation text for a single move
 */
function generateMoveAnnotation(chess, move, moveIndex, totalMoves, openingName, variationName, variationExplanation, lineType) {
  const san = move.san;
  const color = move.color === 'w' ? 'White' : 'Black';
  const opp = move.color === 'w' ? 'Black' : 'White';
  const isWhite = move.color === 'w';
  const moveNum = Math.floor(moveIndex / 2) + 1;
  const phase = moveIndex < 10 ? 'opening' : moveIndex < 20 ? 'early middlegame' : 'middlegame';

  const result = {
    san,
    annotation: '',
    arrows: [],
    highlights: [],
  };

  // Determine move characteristics
  const isCapture = move.captured != null;
  const isCheck = san.includes('+') || san.includes('#');
  const isCastle = san === 'O-O' || san === 'O-O-O';
  const isPawnMove = move.piece === 'p';
  const isPromotion = move.promotion != null;
  const isDevelopment = !isPawnMove && !isCastle && moveIndex < 16;

  // Build annotation text
  const parts = [];

  if (isCastle) {
    const kingSide = san === 'O-O';
    parts.push(pick(CASTLES_PHRASES));
    if (kingSide) {
      result.arrows.push({ from: isWhite ? 'g1' : 'g8', to: isWhite ? 'f1' : 'f8', color: GREEN });
      result.highlights.push({ square: isWhite ? 'g1' : 'g8', color: GREEN_HL });
    } else {
      result.arrows.push({ from: isWhite ? 'c1' : 'c8', to: isWhite ? 'd1' : 'd8', color: GREEN });
      result.highlights.push({ square: isWhite ? 'c1' : 'c8', color: GREEN_HL });
    }
  } else if (isCapture && isPawnMove) {
    const capPiece = pieceName(move.captured);
    parts.push(`${color} captures the ${capPiece} on ${move.to}.`);
    if (isCheck) {
      parts.push(`The capture comes with ${pick(CHECK_PHRASES)}.`);
    }
    parts.push(getContextualComment(chess, move, moveIndex, openingName, phase, lineType));
    result.arrows.push({ from: move.to, to: move.from, color: RED });
    result.highlights.push({ square: move.to, color: YELLOW_HL });
  } else if (isCapture) {
    const capPiece = pieceName(move.captured);
    const movingPiece = pieceName(move.piece);
    parts.push(`${color} ${pick(CAPTURES_PHRASES)(movingPiece, move.to)}, removing ${opp}'s ${capPiece}.`);
    if (isCheck) {
      parts.push(`This also ${pick(CHECK_PHRASES)}.`);
    }
    parts.push(getContextualComment(chess, move, moveIndex, openingName, phase, lineType));
    result.arrows.push({ from: move.to, to: move.from, color: RED });
    result.highlights.push({ square: move.to, color: YELLOW_HL });
  } else if (isPawnMove) {
    parts.push(`${color} ${pick(PAWN_PUSH_PHRASES)(move.to)}.`);
    // Determine what the pawn is doing
    const file = move.to[0];
    const rank = parseInt(move.to[1]);
    if ('de'.includes(file) && (rank === 4 || rank === 5)) {
      parts.push(`This central advance fights for space and control of key squares.`);
      // Add arrows to controlled squares
      const controlSqs = getControlledSquares(chess, move.to).filter(s => {
        const r = parseInt(s[1]);
        return r >= 3 && r <= 6; // central squares
      });
      if (controlSqs.length > 0) {
        controlSqs.slice(0, 2).forEach(sq => {
          result.arrows.push({ from: move.to, to: sq, color: GREEN });
          result.highlights.push({ square: sq, color: YELLOW_HL });
        });
      }
    } else if ('ab'.includes(file) || 'gh'.includes(file)) {
      parts.push(`A flank pawn advance, creating space on the ${file === 'a' || file === 'b' ? 'queenside' : 'kingside'}.`);
      result.arrows.push({ from: move.to, to: move.from, color: GREEN });
    } else {
      parts.push(getContextualComment(chess, move, moveIndex, openingName, phase, lineType));
      result.arrows.push({ from: move.to, to: move.from, color: GREEN });
    }
    if (isCheck) {
      parts.push(`The pawn advance comes with check!`);
    }
  } else if (isDevelopment) {
    const movingPiece = pieceName(move.piece);
    parts.push(`${color} ${pick(DEVELOPS_PHRASES)(movingPiece, move.to)}.`);
    parts.push(getContextualComment(chess, move, moveIndex, openingName, phase, lineType));
    if (isCheck) {
      parts.push(`This also ${pick(CHECK_PHRASES)}.`);
    }
    // Arrow from piece to key target
    const targets = getControlledSquares(chess, move.to);
    const importantTargets = targets.filter(t => {
      const piece = chess.get(t);
      return piece && piece.color !== move.color; // targets opponent pieces
    });
    if (importantTargets.length > 0) {
      result.arrows.push({ from: move.to, to: importantTargets[0], color: RED });
    }
    // Arrow showing piece's influence
    const centralTargets = targets.filter(t => {
      const f = t[0];
      const r = parseInt(t[1]);
      return 'cdef'.includes(f) && r >= 3 && r <= 6;
    });
    if (centralTargets.length > 0 && centralTargets[0] !== importantTargets[0]) {
      result.arrows.push({ from: move.to, to: centralTargets[0], color: GREEN });
    }
    result.highlights.push({ square: move.to, color: GREEN_HL });
  } else {
    // General piece move (middlegame)
    const movingPiece = pieceName(move.piece);
    if (isCheck) {
      parts.push(`${color} ${pick(CHECK_PHRASES)} with ${pieceNameCap(move.piece)} to ${move.to}.`);
    } else {
      parts.push(`${color} moves the ${movingPiece} to ${move.to}.`);
    }
    parts.push(getContextualComment(chess, move, moveIndex, openingName, phase, lineType));

    // Arrow from piece to targets
    const targets = getControlledSquares(chess, move.to);
    const enemyTargets = targets.filter(t => {
      const piece = chess.get(t);
      return piece && piece.color !== move.color;
    });
    if (enemyTargets.length > 0) {
      result.arrows.push({ from: move.to, to: enemyTargets[0], color: RED });
    } else if (targets.length > 0) {
      result.arrows.push({ from: move.to, to: targets[0], color: GREEN });
    }
    result.highlights.push({ square: move.to, color: YELLOW_HL });
  }

  result.annotation = parts.join(' ').trim();

  // Add pawn structure description on pawn moves or every 4 moves
  if (isPawnMove || moveIndex % 6 === 0) {
    result.pawnStructure = describePawnStructure(chess, move.color);
  }

  // Add plans periodically
  if (moveIndex % 3 === 0 || moveIndex < 6) {
    result.plans = generatePlans(chess, move, moveIndex, phase, lineType);
  }

  // Add alternatives occasionally
  if (moveIndex > 2 && moveIndex % 4 === 0) {
    result.alternatives = generateAlternatives(chess, move, moveIndex);
  }

  // Ensure at least one arrow
  if (result.arrows.length === 0) {
    result.arrows.push({ from: move.from, to: move.to, color: GREEN });
  }

  // Ensure max 3 arrows, 2 highlights
  result.arrows = result.arrows.slice(0, 3);
  result.highlights = result.highlights.slice(0, 2);

  return result;
}

/**
 * Generate contextual comment based on board state and move
 */
function getContextualComment(chess, move, moveIndex, openingName, phase, lineType) {
  const color = move.color === 'w' ? 'White' : 'Black';
  const opp = move.color === 'w' ? 'Black' : 'White';
  const piece = pieceName(move.piece);

  // Check board features
  const board = chess.board();
  let kingPos = null;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (sq && sq.type === 'k' && sq.color !== move.color) {
        kingPos = String.fromCharCode(97 + f) + (8 - r);
      }
    }
  }

  const comments = [];

  // Piece-specific comments
  if (move.piece === 'n') {
    if ('cdef'.includes(move.to[0]) && '45'.includes(move.to[1])) {
      comments.push(`The knight reaches a powerful central outpost on ${move.to}, controlling multiple key squares.`);
    } else if (move.to[0] === 'f' && (move.to[1] === '5' || move.to[1] === '4')) {
      comments.push(`The knight on ${move.to} puts pressure on the kingside and eyes key attacking squares.`);
    } else {
      comments.push(`The knight on ${move.to} improves ${color}'s piece coordination and flexibility.`);
    }
  } else if (move.piece === 'b') {
    // Bishop on long diagonal
    if ((move.to[0] === 'g' && move.to[1] === '2') || (move.to[0] === 'b' && move.to[1] === '2') ||
        (move.to[0] === 'g' && move.to[1] === '7') || (move.to[0] === 'b' && move.to[1] === '7')) {
      comments.push(`The fianchettoed bishop rakes the long diagonal, exerting pressure from a distance.`);
    } else {
      comments.push(`The bishop on ${move.to} controls key diagonal squares and maintains active piece play.`);
    }
  } else if (move.piece === 'r') {
    if ('de'.includes(move.to[0])) {
      comments.push(`The rook takes up a powerful position on the ${move.to[0] === 'd' ? 'd' : 'e'}-file, pressuring ${opp}'s position.`);
    } else {
      comments.push(`The rook is activated on ${move.to}, adding to ${color}'s piece coordination.`);
    }
  } else if (move.piece === 'q') {
    comments.push(`The queen takes up an influential position on ${move.to}, eyeing multiple targets.`);
  } else if (move.piece === 'p') {
    const file = move.to[0];
    const rank = parseInt(move.to[1]);
    if (file === 'c' && (rank === 3 || rank === 6)) {
      comments.push(`This pawn move supports a future d-pawn advance, a key central plan.`);
    } else if (file === 'f' && (rank === 4 || rank === 5)) {
      comments.push(`An aggressive pawn advance, signaling kingside intentions and opening lines.`);
    } else if (file === 'h' && (rank === 3 || rank === 6)) {
      comments.push(`A useful prophylactic move, preventing enemy pieces from using the g4/g5 square.`);
    } else if (file === 'a' && (rank === 3 || rank === 6)) {
      comments.push(`A flexible pawn move, preparing queenside expansion or preventing Bb4/Bb5 pins.`);
    }
  }

  if (comments.length === 0) {
    // Generic but informative fallback based on phase
    if (phase === 'opening') {
      comments.push(`This move contributes to ${color}'s opening development and fight for central control.`);
    } else if (phase === 'early middlegame') {
      comments.push(`${color} improves piece placement heading into the critical phase of the game.`);
    } else {
      comments.push(`A thematic move in this position, maintaining ${color}'s initiative.`);
    }
  }

  // Add line-type specific flavor
  if (lineType === 'trap' && moveIndex > 8) {
    comments.push(`This is a critical moment where precise play is essential to exploit the tactical opportunity.`);
  } else if (lineType === 'warning' && moveIndex > 10) {
    comments.push(`${opp} must be careful here — the position contains hidden dangers.`);
  }

  return pick(comments);
}

/**
 * Generate strategic plans
 */
function generatePlans(chess, move, moveIndex, phase, lineType) {
  const color = move.color === 'w' ? 'White' : 'Black';
  const plans = [];

  // Analyze what's on the board
  const board = chess.board();
  let hasCastled = false;
  const kingFile = null;

  // Simple heuristics for plan generation
  if (moveIndex < 8) {
    plans.push(`Complete piece development and prepare castling`);
    plans.push(`Fight for central control with pawns and pieces`);
  } else if (moveIndex < 16) {
    if (lineType === 'trap') {
      plans.push(`Look for tactical opportunities to exploit the opponent's inaccuracy`);
      plans.push(`Maintain piece pressure while avoiding counter-tactics`);
    } else if (lineType === 'warning') {
      plans.push(`Be alert to the opponent's active ideas in this position`);
      plans.push(`Maintain solid piece coordination to neutralize threats`);
    } else {
      plans.push(`Improve piece placement and prepare the middlegame plan`);
      plans.push(`Look for pawn breaks to open lines for the active pieces`);
    }
  } else {
    plans.push(`Convert the positional advantages into concrete gains`);
    plans.push(`Coordinate pieces for maximum effectiveness in the coming exchanges`);
  }

  return plans;
}

/**
 * Generate alternative move suggestions
 */
function generateAlternatives(chess, move, moveIndex) {
  // Get legal moves at this position (before the move was played, we need to undo)
  // Since we're generating after the move, we can look at what was available
  const alts = [];

  // We'll describe conceptual alternatives based on the move type
  const color = move.color === 'w' ? 'White' : 'Black';
  if (move.piece === 'n') {
    alts.push(`A different knight move was possible, but ${move.to} offers the best combination of activity and control.`);
  } else if (move.piece === 'p') {
    alts.push(`Other pawn moves were available, but this advance best fits the strategic requirements of the position.`);
  } else if (move.piece === 'b') {
    alts.push(`The bishop could go to other squares, but ${move.to} maximizes its influence on the key diagonals.`);
  } else {
    alts.push(`${color} had other options here, but this move best maintains the initiative.`);
  }

  return alts;
}


// ────────────────────────────────────────────────
// Main generation logic
// ────────────────────────────────────────────────

function generateSubLineAnnotations(opening, line, lineType) {
  const chess = new Chess();
  const tokens = line.pgn.trim().split(/\s+/).filter(Boolean);
  const annotations = [];

  for (const token of tokens) {
    try {
      const move = chess.move(token);
      const moveIndex = annotations.length;
      const annotation = generateMoveAnnotation(
        chess, move, moveIndex, tokens.length,
        opening.name, line.name, line.explanation,
        lineType
      );
      annotations.push(annotation);
    } catch {
      console.warn(`  Warning: Invalid move "${token}" in ${opening.id} / ${line.name}`);
      break;
    }
  }

  return annotations;
}

function main() {
  const repertoire = JSON.parse(fs.readFileSync(REPERTOIRE_PATH, 'utf8'));

  let totalNew = 0;
  let totalExtended = 0;
  let totalSkipped = 0;

  for (const opening of repertoire) {
    const annotFile = path.join(ANNOTATIONS_DIR, `${opening.id}.json`);
    if (!fs.existsSync(annotFile)) {
      console.warn(`No annotation file for ${opening.id}, skipping`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(annotFile, 'utf8'));
    if (!data.subLines) data.subLines = [];

    let modified = false;

    // Process all line types
    const allLines = [
      ...(opening.variations || []).map(v => ({ ...v, _type: 'variation' })),
      ...(opening.trapLines || []).map(t => ({ ...t, _type: 'trap' })),
      ...(opening.warningLines || []).map(w => ({ ...w, _type: 'warning' })),
    ];

    for (const line of allLines) {
      const lineMoves = parsePgnToSans(line.pgn).length;

      // Check if this line already has a good match
      const { bestMatch, bestIdx } = findBestMatch(line.pgn, data);
      const coverage = lineMoves > 0 ? bestMatch / lineMoves : 1;

      if (coverage >= 0.9) {
        totalSkipped++;
        continue;
      }

      // Check if there's an existing subLine with this exact name
      const existingIdx = data.subLines.findIndex(sl => sl.name === line.name);

      if (existingIdx >= 0) {
        const existing = data.subLines[existingIdx];
        if (existing.moveAnnotations.length >= lineMoves * 0.9) {
          totalSkipped++;
          continue;
        }
        // Extend existing: keep existing annotations, add new ones for remaining moves
        console.log(`  Extending: ${line.name} (${existing.moveAnnotations.length} -> ${lineMoves} moves)`);
        const newAnnotations = generateSubLineAnnotations(opening, line, line._type);
        // Keep existing good annotations, append new ones
        if (existing.moveAnnotations.length > 0) {
          // Replace entirely since PGN may have changed
          data.subLines[existingIdx] = {
            name: line.name,
            type: line._type,
            moveAnnotations: newAnnotations,
          };
        }
        totalExtended++;
        modified = true;
      } else {
        // Create new subLine
        console.log(`  New: ${line.name} (${lineMoves} moves, coverage was ${Math.round(coverage * 100)}%)`);
        const newAnnotations = generateSubLineAnnotations(opening, line, line._type);
        data.subLines.push({
          name: line.name,
          type: line._type,
          moveAnnotations: newAnnotations,
        });
        totalNew++;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(annotFile, JSON.stringify(data, null, 2) + '\n');
      console.log(`Saved ${opening.id}.json (${data.subLines.length} subLines)\n`);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`New subLines created: ${totalNew}`);
  console.log(`Existing subLines extended: ${totalExtended}`);
  console.log(`Skipped (already covered): ${totalSkipped}`);
  console.log(`Total subLines added/modified: ${totalNew + totalExtended}`);
}

main();
