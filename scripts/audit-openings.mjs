/**
 * Comprehensive opening audit script.
 * Validates PGNs, annotations, arrows, and highlights across all openings.
 *
 * Usage: node scripts/audit-openings.mjs
 */

import { Chess } from 'chess.js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'src', 'data');
const ANNOTATIONS_DIR = join(DATA_DIR, 'annotations');

const VALID_SQUARES = new Set();
for (const file of 'abcdefgh') {
  for (let rank = 1; rank <= 8; rank++) {
    VALID_SQUARES.add(`${file}${rank}`);
  }
}

const issues = [];
let totalOpenings = 0;
let totalVariations = 0;
let totalAnnotationFiles = 0;

function addIssue(source, opening, severity, message) {
  issues.push({ source, opening, severity, message });
}

// ── Validate a space-separated PGN move list ──────────────────────────────

function validatePgn(pgn, label, source) {
  const chess = new Chess();
  const moves = pgn.trim().split(/\s+/);
  const validatedMoves = [];

  for (let i = 0; i < moves.length; i++) {
    const san = moves[i];
    // Skip move numbers like "1." "2."
    if (/^\d+\.+$/.test(san)) continue;

    try {
      const result = chess.move(san);
      if (!result) {
        addIssue(source, label, 'ERROR', `Illegal move "${san}" at position ${i + 1}. FEN: ${chess.fen()}`);
        return { valid: false, moves: validatedMoves, finalFen: chess.fen() };
      }
      validatedMoves.push(result.san);
    } catch (e) {
      addIssue(source, label, 'ERROR', `Invalid move "${san}" at position ${i + 1}: ${e.message}. FEN: ${chess.fen()}`);
      return { valid: false, moves: validatedMoves, finalFen: chess.fen() };
    }
  }

  return { valid: true, moves: validatedMoves, finalFen: chess.fen() };
}

// ── Validate annotation file ──────────────────────────────────────────────

function validateAnnotations(annotData, expectedMoves, openingId, source) {
  if (!annotData) return;

  const annotations = annotData.moveAnnotations;
  if (!annotations || !Array.isArray(annotations)) {
    addIssue(source, openingId, 'ERROR', 'Missing or invalid moveAnnotations array');
    return;
  }

  // Check annotation count vs move count
  if (expectedMoves && annotations.length !== expectedMoves.length) {
    addIssue(source, openingId, 'WARNING',
      `Annotation count (${annotations.length}) doesn't match move count (${expectedMoves.length})`);
  }

  for (let i = 0; i < annotations.length; i++) {
    const ann = annotations[i];
    const moveNum = i + 1;

    // Check SAN matches expected move
    if (expectedMoves && i < expectedMoves.length) {
      // Normalize: remove check/mate symbols for comparison
      const normAnn = ann.san?.replace(/[+#]/, '') ?? '';
      const normExp = expectedMoves[i]?.replace(/[+#]/, '') ?? '';
      if (normAnn && normExp && normAnn !== normExp) {
        addIssue(source, openingId, 'ERROR',
          `Move ${moveNum}: annotation SAN "${ann.san}" doesn't match expected "${expectedMoves[i]}"`);
      }
    }

    // Check annotation text exists
    if (!ann.annotation || ann.annotation.trim() === '') {
      addIssue(source, openingId, 'WARNING', `Move ${moveNum} (${ann.san}): empty annotation text`);
    }

    // Validate arrows
    if (ann.arrows && Array.isArray(ann.arrows)) {
      for (const arrow of ann.arrows) {
        if (!VALID_SQUARES.has(arrow.from)) {
          addIssue(source, openingId, 'ERROR',
            `Move ${moveNum} (${ann.san}): invalid arrow 'from' square "${arrow.from}"`);
        }
        if (!VALID_SQUARES.has(arrow.to)) {
          addIssue(source, openingId, 'ERROR',
            `Move ${moveNum} (${ann.san}): invalid arrow 'to' square "${arrow.to}"`);
        }
        if (arrow.from === arrow.to) {
          addIssue(source, openingId, 'WARNING',
            `Move ${moveNum} (${ann.san}): arrow from "${arrow.from}" to itself`);
        }
      }
    }

    // Validate highlights
    if (ann.highlights && Array.isArray(ann.highlights)) {
      for (const hl of ann.highlights) {
        if (!VALID_SQUARES.has(hl.square)) {
          addIssue(source, openingId, 'ERROR',
            `Move ${moveNum} (${ann.san}): invalid highlight square "${hl.square}"`);
        }
      }
    }
  }

  // Check subLines
  if (annotData.subLines && Array.isArray(annotData.subLines)) {
    for (let si = 0; si < annotData.subLines.length; si++) {
      const sub = annotData.subLines[si];
      if (sub.moveAnnotations) {
        for (let mi = 0; mi < sub.moveAnnotations.length; mi++) {
          const ann = sub.moveAnnotations[mi];
          const moveNum = mi + 1;

          if (ann.arrows && Array.isArray(ann.arrows)) {
            for (const arrow of ann.arrows) {
              if (!VALID_SQUARES.has(arrow.from)) {
                addIssue(source, `${openingId} (subLine ${si}: ${sub.name ?? si})`, 'ERROR',
                  `Move ${moveNum} (${ann.san}): invalid arrow 'from' square "${arrow.from}"`);
              }
              if (!VALID_SQUARES.has(arrow.to)) {
                addIssue(source, `${openingId} (subLine ${si}: ${sub.name ?? si})`, 'ERROR',
                  `Move ${moveNum} (${ann.san}): invalid arrow 'to' square "${arrow.to}"`);
              }
            }
          }

          if (ann.highlights && Array.isArray(ann.highlights)) {
            for (const hl of ann.highlights) {
              if (!VALID_SQUARES.has(hl.square)) {
                addIssue(source, `${openingId} (subLine ${si}: ${sub.name ?? si})`, 'ERROR',
                  `Move ${moveNum} (${ann.san}): invalid highlight square "${hl.square}"`);
              }
            }
          }
        }
      }
    }
  }
}

// ── Validate arrows/highlights are contextually correct ──────────────────
// Play through the PGN and at each move, verify the arrows reference squares
// that make sense (e.g., arrow from a square that has a piece on it)

function validateArrowContext(annotData, pgn, openingId, source) {
  if (!annotData?.moveAnnotations) return;

  const chess = new Chess();
  const moves = pgn.trim().split(/\s+/).filter(m => !/^\d+\.+$/.test(m));
  const annotations = annotData.moveAnnotations;

  for (let i = 0; i < Math.min(moves.length, annotations.length); i++) {
    const ann = annotations[i];

    try {
      chess.move(moves[i]);
    } catch {
      break; // PGN already flagged as invalid
    }

    // After the move is played, check arrows
    if (ann.arrows && Array.isArray(ann.arrows)) {
      for (const arrow of ann.arrows) {
        // An arrow 'from' square should typically have a piece or be an important square
        // An arrow pointing to an occupied friendly square is suspicious
        const fromPiece = chess.get(arrow.from);
        const toPiece = chess.get(arrow.to);
        const turn = chess.turn(); // whose move is next (opposite of who just moved)
        const justMoved = turn === 'w' ? 'b' : 'w';

        // Arrow from empty square to empty square is suspicious (probably wrong squares)
        if (!fromPiece && !toPiece) {
          addIssue(source, openingId, 'WARNING',
            `Move ${i + 1} (${ann.san}): arrow ${arrow.from}→${arrow.to} — both squares are empty`);
        }
      }
    }
  }
}

// ── Process repertoire.json ──────────────────────────────────────────────

function processRepertoire() {
  const filePath = join(DATA_DIR, 'repertoire.json');
  const data = JSON.parse(readFileSync(filePath, 'utf8'));

  console.log(`\n=== REPERTOIRE.JSON (${data.length} openings) ===\n`);

  for (const opening of data) {
    totalOpenings++;
    const label = `${opening.name} (${opening.id})`;

    // Validate main PGN
    const result = validatePgn(opening.pgn, label, 'repertoire.json');
    if (result.valid) {
      // Check annotation file exists and matches
      const annotFile = join(ANNOTATIONS_DIR, `${opening.id}.json`);
      if (existsSync(annotFile)) {
        totalAnnotationFiles++;
        const annotData = JSON.parse(readFileSync(annotFile, 'utf8'));
        validateAnnotations(annotData, result.moves, opening.id, 'repertoire.json');
        validateArrowContext(annotData, opening.pgn, opening.id, 'repertoire.json');
      } else {
        addIssue('repertoire.json', label, 'INFO', `No annotation file found at ${opening.id}.json`);
      }
    }

    // Validate variations
    if (opening.variations) {
      for (const variation of opening.variations) {
        totalVariations++;
        const varLabel = `${opening.name} > ${variation.name}`;
        validatePgn(variation.pgn, varLabel, 'repertoire.json');
      }
    }

    // Validate trap lines
    if (opening.trapLines) {
      for (const trap of opening.trapLines) {
        const trapLabel = `${opening.name} > TRAP: ${trap.name}`;
        validatePgn(trap.pgn, trapLabel, 'repertoire.json');
      }
    }

    // Validate warning lines
    if (opening.warningLines) {
      for (const warn of opening.warningLines) {
        const warnLabel = `${opening.name} > WARNING: ${warn.name}`;
        validatePgn(warn.pgn, warnLabel, 'repertoire.json');
      }
    }
  }
}

// ── Process gambits.json ─────────────────────────────────────────────────

function processGambits() {
  const filePath = join(DATA_DIR, 'gambits.json');
  if (!existsSync(filePath)) {
    console.log('\n=== GAMBITS.JSON — NOT FOUND ===\n');
    return;
  }
  const data = JSON.parse(readFileSync(filePath, 'utf8'));

  const gambits = Array.isArray(data) ? data : data.gambits ?? [];
  console.log(`\n=== GAMBITS.JSON (${gambits.length} gambits) ===\n`);

  for (const gambit of gambits) {
    totalOpenings++;
    const label = `GAMBIT: ${gambit.name} (${gambit.id})`;

    if (gambit.pgn) {
      const result = validatePgn(gambit.pgn, label, 'gambits.json');
      if (result.valid) {
        // Check annotation file
        const annotFile = join(ANNOTATIONS_DIR, `${gambit.id}.json`);
        if (existsSync(annotFile)) {
          totalAnnotationFiles++;
          const annotData = JSON.parse(readFileSync(annotFile, 'utf8'));
          validateAnnotations(annotData, result.moves, gambit.id, 'gambits.json');
          validateArrowContext(annotData, gambit.pgn, gambit.id, 'gambits.json');
        }
      }
    }

    if (gambit.variations) {
      for (const variation of gambit.variations) {
        totalVariations++;
        const varLabel = `GAMBIT: ${gambit.name} > ${variation.name}`;
        validatePgn(variation.pgn, varLabel, 'gambits.json');
      }
    }

    if (gambit.trapLines) {
      for (const trap of gambit.trapLines) {
        validatePgn(trap.pgn, `GAMBIT: ${gambit.name} > TRAP: ${trap.name}`, 'gambits.json');
      }
    }

    if (gambit.warningLines) {
      for (const warn of gambit.warningLines) {
        validatePgn(warn.pgn, `GAMBIT: ${gambit.name} > WARNING: ${warn.name}`, 'gambits.json');
      }
    }
  }
}

// ── Process pro-repertoires.json ─────────────────────────────────────────

function processProRepertoires() {
  const filePath = join(DATA_DIR, 'pro-repertoires.json');
  if (!existsSync(filePath)) {
    console.log('\n=== PRO-REPERTOIRES.JSON — NOT FOUND ===\n');
    return;
  }
  const data = JSON.parse(readFileSync(filePath, 'utf8'));

  const players = Array.isArray(data) ? data : data.players ?? [];
  console.log(`\n=== PRO-REPERTOIRES.JSON (${players.length} players) ===\n`);

  for (const player of players) {
    const openings = player.openings ?? player.repertoire ?? [];
    for (const opening of openings) {
      totalOpenings++;
      const label = `PRO (${player.name}): ${opening.name} (${opening.id})`;

      if (opening.pgn) {
        validatePgn(opening.pgn, label, 'pro-repertoires.json');
      }

      if (opening.variations) {
        for (const variation of opening.variations) {
          totalVariations++;
          const varLabel = `PRO (${player.name}): ${opening.name} > ${variation.name}`;
          validatePgn(variation.pgn, varLabel, 'pro-repertoires.json');
        }
      }

      if (opening.trapLines) {
        for (const trap of opening.trapLines) {
          validatePgn(trap.pgn, `PRO (${player.name}): ${opening.name} > TRAP: ${trap.name}`, 'pro-repertoires.json');
        }
      }

      if (opening.warningLines) {
        for (const warn of opening.warningLines) {
          validatePgn(warn.pgn, `PRO (${player.name}): ${opening.name} > WARNING: ${warn.name}`, 'pro-repertoires.json');
        }
      }
    }
  }
}

// ── Validate all annotation files against their PGNs ─────────────────────

function validateAllAnnotationFiles() {
  console.log(`\n=== ANNOTATION FILES STANDALONE AUDIT ===\n`);

  // Build a map of openingId -> pgn from all sources
  const pgnMap = new Map();

  const repPath = join(DATA_DIR, 'repertoire.json');
  if (existsSync(repPath)) {
    for (const op of JSON.parse(readFileSync(repPath, 'utf8'))) {
      pgnMap.set(op.id, op.pgn);
    }
  }

  const gambPath = join(DATA_DIR, 'gambits.json');
  if (existsSync(gambPath)) {
    const gData = JSON.parse(readFileSync(gambPath, 'utf8'));
    const gambits = Array.isArray(gData) ? gData : gData.gambits ?? [];
    for (const g of gambits) {
      pgnMap.set(g.id, g.pgn);
    }
  }

  // Now check each annotation file that's referenced in the index
  const indexKeys = [
    'italian-game', 'ruy-lopez', 'scotch-game', 'vienna-game', 'kings-gambit',
    'four-knights-game', 'sicilian-najdorf', 'sicilian-dragon', 'sicilian-sveshnikov',
    'sicilian-alapin', 'french-defence', 'caro-kann', 'pirc-defence',
    'scandinavian-defence', 'alekhine-defence', 'philidor-defence', 'petrov-defence',
    'queens-gambit', 'london-system', 'catalan-opening', 'trompowsky-attack',
    'qgd', 'qga', 'slav-defence', 'semi-slav', 'kings-indian-defence',
    'nimzo-indian', 'grunfeld-defence', 'dutch-defence', 'benoni-defence',
    'benko-gambit', 'queens-indian', 'budapest-gambit', 'old-indian-defence',
    'english-opening', 'reti-opening', 'kings-indian-attack', 'birds-opening',
    'two-knights-defence', 'evans-gambit', 'stafford-gambit', 'englund-gambit',
    'smith-morra-gambit', 'scotch-gambit', 'vienna-gambit', 'danish-gambit',
    'marshall-attack', 'albin-countergambit',
  ];

  for (const key of indexKeys) {
    const filePath = join(ANNOTATIONS_DIR, `${key}.json`);
    if (!existsSync(filePath)) {
      addIssue('annotations', key, 'ERROR', `Annotation file ${key}.json not found but referenced in index`);
      continue;
    }

    const annotData = JSON.parse(readFileSync(filePath, 'utf8'));
    const pgn = pgnMap.get(key);

    if (!annotData.moveAnnotations || !Array.isArray(annotData.moveAnnotations)) {
      addIssue('annotations', key, 'ERROR', 'Missing moveAnnotations array');
      continue;
    }

    // Validate the annotation SAN moves actually form a legal game
    const chess = new Chess();
    const annotations = annotData.moveAnnotations;

    for (let i = 0; i < annotations.length; i++) {
      const ann = annotations[i];
      try {
        const result = chess.move(ann.san);
        if (!result) {
          addIssue('annotations', key, 'ERROR',
            `Move ${i + 1}: annotation SAN "${ann.san}" is illegal. FEN: ${chess.fen()}`);
          break;
        }
      } catch (e) {
        addIssue('annotations', key, 'ERROR',
          `Move ${i + 1}: annotation SAN "${ann.san}" failed: ${e.message}. FEN: ${chess.fen()}`);
        break;
      }

      // Validate arrows against board state
      if (ann.arrows) {
        for (const arrow of ann.arrows) {
          if (!VALID_SQUARES.has(arrow.from)) {
            addIssue('annotations', key, 'ERROR',
              `Move ${i + 1} (${ann.san}): invalid arrow 'from' square "${arrow.from}"`);
          }
          if (!VALID_SQUARES.has(arrow.to)) {
            addIssue('annotations', key, 'ERROR',
              `Move ${i + 1} (${ann.san}): invalid arrow 'to' square "${arrow.to}"`);
          }
        }
      }

      if (ann.highlights) {
        for (const hl of ann.highlights) {
          if (!VALID_SQUARES.has(hl.square)) {
            addIssue('annotations', key, 'ERROR',
              `Move ${i + 1} (${ann.san}): invalid highlight square "${hl.square}"`);
          }
        }
      }
    }

    // Now compare annotation SAN sequence to repertoire PGN
    if (pgn) {
      const repChess = new Chess();
      const repMoves = pgn.trim().split(/\s+/).filter(m => !/^\d+\.+$/.test(m));
      const repSans = [];
      for (const m of repMoves) {
        try {
          const r = repChess.move(m);
          if (r) repSans.push(r.san);
          else break;
        } catch { break; }
      }

      // Check if annotation moves match repertoire moves
      const annSans = annotations.map(a => a.san);
      const minLen = Math.min(repSans.length, annSans.length);
      for (let i = 0; i < minLen; i++) {
        if (repSans[i] !== annSans[i]) {
          addIssue('annotations', key, 'ERROR',
            `Move ${i + 1}: repertoire has "${repSans[i]}" but annotation has "${annSans[i]}"`);
        }
      }
    }

    // Validate subLines
    if (annotData.subLines) {
      for (let si = 0; si < annotData.subLines.length; si++) {
        const sub = annotData.subLines[si];
        const subLabel = sub.name ?? `subLine-${si}`;
        if (sub.moveAnnotations) {
          const subChess = new Chess();
          for (let mi = 0; mi < sub.moveAnnotations.length; mi++) {
            const ann = sub.moveAnnotations[mi];
            try {
              const result = subChess.move(ann.san);
              if (!result) {
                addIssue('annotations', `${key} > ${subLabel}`, 'ERROR',
                  `Move ${mi + 1}: SAN "${ann.san}" is illegal. FEN: ${subChess.fen()}`);
                break;
              }
            } catch (e) {
              addIssue('annotations', `${key} > ${subLabel}`, 'ERROR',
                `Move ${mi + 1}: SAN "${ann.san}" failed: ${e.message}. FEN: ${subChess.fen()}`);
              break;
            }

            if (ann.arrows) {
              for (const arrow of ann.arrows) {
                if (!VALID_SQUARES.has(arrow.from) || !VALID_SQUARES.has(arrow.to)) {
                  addIssue('annotations', `${key} > ${subLabel}`, 'ERROR',
                    `Move ${mi + 1} (${ann.san}): invalid arrow square`);
                }
              }
            }
            if (ann.highlights) {
              for (const hl of ann.highlights) {
                if (!VALID_SQUARES.has(hl.square)) {
                  addIssue('annotations', `${key} > ${subLabel}`, 'ERROR',
                    `Move ${mi + 1} (${ann.san}): invalid highlight square "${hl.square}"`);
                }
              }
            }
          }
        }
      }
    }
  }
}

// ── Run everything ───────────────────────────────────────────────────────

console.log('Chess Academy Pro — Opening Audit');
console.log('='.repeat(60));

processRepertoire();
processGambits();
processProRepertoires();
validateAllAnnotationFiles();

// ── Print results ────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log(`AUDIT COMPLETE`);
console.log(`  Openings checked:    ${totalOpenings}`);
console.log(`  Variations checked:  ${totalVariations}`);
console.log(`  Annotation files:    ${totalAnnotationFiles}`);
console.log(`  Total issues:        ${issues.length}`);

const errors = issues.filter(i => i.severity === 'ERROR');
const warnings = issues.filter(i => i.severity === 'WARNING');
const infos = issues.filter(i => i.severity === 'INFO');

if (errors.length > 0) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`ERRORS (${errors.length}):`);
  console.log(`${'─'.repeat(60)}`);
  for (const e of errors) {
    console.log(`  [${e.source}] ${e.opening}`);
    console.log(`    → ${e.message}`);
  }
}

if (warnings.length > 0) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`WARNINGS (${warnings.length}):`);
  console.log(`${'─'.repeat(60)}`);
  for (const w of warnings) {
    console.log(`  [${w.source}] ${w.opening}`);
    console.log(`    → ${w.message}`);
  }
}

if (infos.length > 0) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`INFO (${infos.length}):`);
  console.log(`${'─'.repeat(60)}`);
  for (const info of infos) {
    console.log(`  [${info.source}] ${info.opening}`);
    console.log(`    → ${info.message}`);
  }
}

if (issues.length === 0) {
  console.log('\n✓ All openings validated successfully!');
}

// Exit with error code if there are errors
process.exit(errors.length > 0 ? 1 : 0);
