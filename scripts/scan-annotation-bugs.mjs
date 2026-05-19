#!/usr/bin/env node
/**
 * Offline semantic scanner for opening annotation files.
 *
 * Walks every annotation file under src/data/annotations/, plus the
 * legacy src/data/annotations-bundle.json, and for each annotation
 * entry runs the same semantic checks the v2 runtime audit would
 * — but offline, against the SAN tagged on the entry itself.
 *
 * Output: docs/audit-runs/2026-05-19-content-scan/findings.json
 *
 * Per-finding shape:
 * {
 *   file, path, san, annotation, kind, severity, evidence, fixHint
 * }
 *
 * Bug classes detected:
 *  - piece-mismatch-subject: text describes a piece moving that
 *    isn't the SAN-tagged piece (subject of the move only).
 *  - square-mismatch-subject: text describes the moving piece going
 *    to a square that isn't the SAN target.
 *  - color-mismatch: text starts with "White " on Black's ply or
 *    vice-versa (parity from index — half-move number).
 *  - qualifier-mismatch: "(king's|queen's) (knight|bishop|rook)"
 *    where the played piece type differs from the qualifier piece.
 *  - cross-line-drift-name: annotation text mentions a different
 *    named opening / sub-line than the file it lives in.
 *  - cross-line-drift-pgn: text references a PGN move number that
 *    doesn't match the entry's position in the sequence.
 *  - repeated-narration: same annotation text on two consecutive
 *    entries.
 *  - empty-text-on-keystone: annotation text empty on a captured
 *    keystone move (a move marked as 'keystone' or with a non-empty
 *    pawnStructure / plans entry but no idea text).
 *  - hardcoded-template-pattern: text matches one of the known
 *    template patterns in GENERIC_ANNOTATION_PATTERNS but the
 *    suppression should have been triggered yet wasn't (this is
 *    informational — confirms which templates exist).
 *
 * No false-positive filter is applied — every match is recorded;
 * triage of which ones are "real" vs "intentional future-tense plan"
 * happens in a follow-up pass driven by the findings.
 */

import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const ANNOTATIONS_DIR = 'src/data/annotations';
// annotations-bundle.json is LEGACY data not loaded at runtime — see
// src/data/annotations/index.ts comment. Scan-and-exclude is the safe
// default; pass SCAN_BUNDLE=1 to include it.
const ANNOTATIONS_BUNDLE = process.env.SCAN_BUNDLE === '1' ? 'src/data/annotations-bundle.json' : null;
const OUT_DIR = 'docs/audit-runs/2026-05-19-content-scan';
const OUT_PATH = join(OUT_DIR, 'findings.json');

// ─── SAN parsers ───────────────────────────────────────────────────

function sanPieceWord(san) {
  if (!san) return null;
  const c = san[0];
  if (c === 'K') return 'king';
  if (c === 'Q') return 'queen';
  if (c === 'R') return 'rook';
  if (c === 'B') return 'bishop';
  if (c === 'N') return 'knight';
  if (san.startsWith('O-O')) return 'king';
  if (/^[a-h]/.test(san)) return 'pawn';
  return null;
}

function sanTargetSquare(san) {
  if (!san) return null;
  if (san.startsWith('O-O-O')) return null;
  if (san === 'O-O') return null;
  const m = san.replace(/[+#]/g, '').match(/([a-h][1-8])(?:=[QRNB])?$/);
  return m ? m[1] : null;
}

/**
 * For ambiguous SANs like 'Nbd2', 'R1e1', 'Rae1', returns the
 * file/rank disambiguator as a partial from-square hint
 * (e.g. 'Nbd2' → 'b' file).
 */
function sanFromSquareHint(san) {
  if (!san || /^O-O/.test(san)) return null;
  // strip check/mate/promotion
  const core = san.replace(/[+#]/g, '').replace(/=[QRNB]$/, '');
  // Piece + optional from-file/rank + optional capture + dest
  // Examples: Nbd2, R1e1, Rae1, Qh4xe1
  const m = core.match(/^([KQRBN])([a-h])?([1-8])?x?([a-h][1-8])$/);
  if (m && (m[2] || m[3])) {
    // Has disambiguator
    const file = m[2] || '';
    const rank = m[3] || '';
    if (file && rank) return file + rank;
    return null; // partial only — we'd need actual game state to resolve
  }
  return null;
}

// ─── Subject-of-move detectors ─────────────────────────────────────

const PIECE_WORDS = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];

/**
 * Patterns that mark FUTURE-TENSE intent ("preparing to push the knight
 * to e4"), not subject-of-the-current-move. Reject the match.
 */
const FUTURE_TENSE_RX = /(?:preparing|prepares|will|plans|threatens|threatening|hopes|hoping|intends|intending|aiming|aims to|going to|wants to|may follow|could play|later|eventually|setting up|expecting|in mind|might|will\s+become|where\s+it\s+will|if\s|when\s|after\s|whenever\s|once\s)\s*(?:to\s+)?/i;

/**
 * Conditional / hypothetical markers ('if Black moves their knight',
 * 'when White plays Nc3', etc.). The match in this clause is NOT the
 * current ply's subject.
 */
const CONDITIONAL_RX = /\b(?:if|when|once|after|should|whenever|in\s+case|suppose)\s+/i;

/**
 * Proper-noun openings that contain piece words. If the matched
 * subject phrase is preceded by these, it's a name, not a piece ref.
 */
const PROPER_NOUN_OPENINGS_RX = /(?:queen'?s?\s+(?:gambit|indian|pawn|fianchetto|knight)|king'?s?\s+(?:gambit|indian|pawn|fianchetto|knight))\b/i;

/**
 * 'recaptures the pawn' / 'captures the pawn' / 'takes the knight'
 * — the second piece is the OBJECT, not the subject of the move.
 */
const CAPTURE_OBJECT_RX = /(?:recaptures?|captures?|takes?)\s+(?:on\s+[a-h][1-8]\s+with\s+the\s+)?(?:the\s+)?(king|queen|rook|bishop|knight|pawn)\b/i;

/**
 * Returns the piece word the annotation claims as the SUBJECT
 * (the thing that moved), or null. Handles qualified ("king's knight")
 * and bare ("knight") forms. Rejects future-tense and indirect refs.
 */
function findSubjectPiece(text) {
  if (!text) return null;
  // Try qualified-piece form FIRST so we don't pick up "king" from
  // "king's knight"
  const qualifiedSubj = [
    // 'White plays the king's knight to f3'
    /(?:white|black)\s+(?:plays?|moves?|develops?|brings?|pushes?|fianchettoes?|recaptures?|jumps?|advances?|drops?|posts?|hops?|swings?|relocates?|repositions?)\s+(?:the\s+)?(?:king'?s?|queen'?s?)\s+(knight|bishop|rook)\b/i,
    // 'The king's knight develops'
    /^the\s+(?:king'?s?|queen'?s?)\s+(knight|bishop|rook)\s+(?:moves?|develops?|to\s+)/i,
  ];
  for (const rx of qualifiedSubj) {
    const m = text.match(rx);
    if (m) {
      const lookback = text.slice(Math.max(0, m.index - 60), m.index);
      if (CONDITIONAL_RX.test(lookback)) return null;
      if (FUTURE_TENSE_RX.test(lookback)) return null;
      return m[1].toLowerCase();
    }
  }
  // Bare-piece subject forms — but verbs that can take an OBJECT-piece
  // ('recaptures the pawn'), possessive piece refs ("Black's knight"),
  // and object-of-verb refs ("attacking Black's knight") must be excluded
  const bareSubj = [
    // Action verbs that take a piece as SUBJECT (not object)
    // — exclude possessive ("White's knight" / "Black's bishop") with negative lookahead
    /(?<![Ww]hite'?s\s)(?<![Bb]lack'?s\s)(?:white|black)\s+(?:plays?|moves?|develops?|brings?|pushes?|fianchettoes?|jumps?|advances?|drops?|posts?|hops?|swings?|relocates?|repositions?)\s+(?:the\s+)?(king|queen|rook|bishop|knight|pawn)\b/i,
    /(?:white|black)\s+(?:plays?|moves?|develops?)\s+(?:its|their|his|her)\s+(king|queen|rook|bishop|knight|pawn)\b/i,
    /^the\s+(king|queen|rook|bishop|knight|pawn)\s+(?:moves?|develops?|jumps?|hops?|advances?|swings?)/i,
    /^(king|queen|rook|bishop|knight|pawn)\s+(?:develops?|moves?|to\s+[a-h][1-8])/i,
  ];
  for (const rx of bareSubj) {
    const m = text.match(rx);
    if (m) {
      // Lookbehind 60 chars for a conditional clause start
      const lookback = text.slice(Math.max(0, m.index - 60), m.index);
      if (CONDITIONAL_RX.test(lookback)) return null;
      if (FUTURE_TENSE_RX.test(lookback)) return null;
      // Reject if it's actually part of a proper-noun opening name
      const around = text.slice(Math.max(0, m.index - 5), m.index + m[0].length + 30);
      if (PROPER_NOUN_OPENINGS_RX.test(around)) return null;
      // Reject if the match is followed by 's (we missed a qualifier)
      const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 30);
      if (/^[\s']?s\s+(?:knight|bishop|rook)/i.test(tail)) return null;
      return m[1].toLowerCase();
    }
  }
  return null;
}

/**
 * Returns the target square the annotation claims for the SUBJECT
 * move, or null. Future-tense / non-move references rejected.
 */
function findSubjectTarget(text) {
  if (!text) return null;
  const patterns = [
    // 'White plays the knight to e4'
    /(?:white|black)\s+(?:plays?|moves?|develops?|brings?|pushes?|fianchettoes?|recaptures?)\s+(?:the\s+)?(?:(?:king'?s?|queen'?s?)\s+)?\w+\s+to\s+([a-h][1-8])/i,
    // 'Knight moves to e4' / 'The knight moves to e4'
    /^(?:the\s+)?(?:king|queen|rook|bishop|knight|pawn)\s+(?:moves?|develops?)\s+to\s+([a-h][1-8])/i,
  ];
  for (const rx of patterns) {
    const m = text.match(rx);
    if (m) {
      const lookback = text.slice(Math.max(0, m.index - 60), m.index);
      if (CONDITIONAL_RX.test(lookback)) return null;
      if (FUTURE_TENSE_RX.test(lookback)) return null;
      return m[1].toLowerCase();
    }
  }
  return null;
}

/**
 * Returns 'white' or 'black' if the text starts with a clear color
 * subject; null otherwise.
 */
function findColorSubject(text) {
  if (!text) return null;
  const m = text.match(/^\s*(white|black)\s+(?:plays?|moves?|develops?|brings?|responds?|opens?|pushes?|fianchettoes?)/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Returns the qualifier+piece ONLY if the qualifier phrase is the
 * SUBJECT of the move (not a future-tense plan).
 */
function findQualifierPiece(text) {
  if (!text) return null;
  const m = text.match(/(?:white|black)\s+(?:plays?|moves?|develops?|brings?|pushes?|fianchettoes?|recaptures?|jumps?|advances?)\s+(?:the\s+)?(king'?s?|queen'?s?)\s+(knight|bishop|rook)/i);
  if (m) {
    const lookback = text.slice(Math.max(0, m.index - 60), m.index);
    if (CONDITIONAL_RX.test(lookback)) return null;
    if (FUTURE_TENSE_RX.test(lookback)) return null;
    return { qualifier: m[1].toLowerCase().replace(/'/g, ''), piece: m[2].toLowerCase() };
  }
  return null;
}

// ─── Cross-line drift detector ─────────────────────────────────────

const KNOWN_SUBLINE_NAMES = new Set();
// Will be populated from the loaded files

// Detect "Variation X" / "X Defense" / proper-noun chess-opening fragments
// in the text that aren't the current file/subline.
function findNamedLineReferences(text) {
  if (!text) return [];
  const hits = [];
  const rx = /\b([A-Z][a-zA-Z\-']+(?:\s+(?:Defence|Defense|Gambit|Attack|Variation|Opening|System|Line|Trap)))\b/g;
  let m;
  while ((m = rx.exec(text)) !== null) {
    hits.push(m[1]);
  }
  return hits;
}

/**
 * Reusable content-check block. Runs against any prose field
 * (annotation, shortNarration, plans[i], pawnStructure, alternatives[i]).
 * Less-strict than the main annotation check — only emits findings
 * for clear contradictions (no future-tense / drift sensitivity yet).
 */
function runContentChecks(file, openingId, sublineLabel, idx, san, expectedPiece, expectedSquare, fieldName, text, findings) {
  const subjectPiece = findSubjectPiece(text);
  if (subjectPiece && subjectPiece !== expectedPiece) {
    findings.push({
      file, openingId, subline: sublineLabel, ply: idx, san,
      kind: 'piece-mismatch-subject',
      field: fieldName,
      severity: 'p1',
      textPiece: subjectPiece,
      expectedPiece,
      evidence: text.slice(0, 200),
    });
  }
  const subjectTarget = findSubjectTarget(text);
  if (subjectTarget && expectedSquare && subjectTarget !== expectedSquare) {
    findings.push({
      file, openingId, subline: sublineLabel, ply: idx, san,
      kind: 'square-mismatch-subject',
      field: fieldName,
      severity: 'p1',
      textSquare: subjectTarget,
      expectedSquare,
      evidence: text.slice(0, 200),
    });
  }
  const qual = findQualifierPiece(text);
  if (qual && qual.piece !== expectedPiece) {
    findings.push({
      file, openingId, subline: sublineLabel, ply: idx, san,
      kind: 'qualifier-mismatch',
      field: fieldName,
      severity: 'p0',
      qualifier: qual.qualifier,
      qualifierPiece: qual.piece,
      expectedPiece,
      evidence: text.slice(0, 200),
    });
  }
  const subjectColor = findColorSubject(text);
  const actualColor = ((idx % 2) === 1) ? 'white' : 'black';
  if (subjectColor && subjectColor !== actualColor) {
    findings.push({
      file, openingId, subline: sublineLabel, ply: idx, san,
      kind: 'color-mismatch',
      field: fieldName,
      severity: 'p0',
      textColor: subjectColor,
      actualColor,
      evidence: text.slice(0, 200),
    });
  }
}

// ─── File walk ──────────────────────────────────────────────────────

async function listAnnotationFiles() {
  const files = [];
  const entries = await readdir(ANNOTATIONS_DIR);
  for (const e of entries) {
    if (e.endsWith('.json')) files.push(join(ANNOTATIONS_DIR, e));
  }
  return files;
}

/**
 * Walk a single annotation file and run all checks. Returns an array
 * of findings.
 */
function scanFile(filePath, content) {
  const findings = [];
  const doc = JSON.parse(content);
  const ownOpeningId = doc.openingId;

  // Walk main moveAnnotations[]
  walkAnnotationSequence(filePath, doc.openingId, 'main', doc.moveAnnotations || [], findings);

  // Walk every subLine[]
  for (const sub of doc.subLines || []) {
    walkAnnotationSequence(filePath, doc.openingId, sub.name || sub.type || 'unnamed', sub.moveAnnotations || [], findings);
  }

  return findings;
}

function walkAnnotationSequence(file, openingId, sublineLabel, annotations, findings) {
  let prevText = '';
  // Replay the SAN sequence with chess.js to catch illegal moves
  // (data corruption / wrong PGN).
  const chess = new Chess();
  for (let i = 0; i < annotations.length; i++) {
    const a = annotations[i];
    const san = a.san;
    if (!san) continue;
    try {
      chess.move(san);
    } catch (e) {
      findings.push({
        file, openingId, subline: sublineLabel, ply: i + 1, san,
        kind: 'illegal-san-sequence',
        severity: 'p0',
        evidence: `chess.js rejected ${san}: ${e.message}`,
      });
      // Halt this sequence — further plies depend on the rejected move
      return;
    }
  }
  // Second pass for the content-level checks (now that we know the
  // sequence is legal)
  for (let i = 0; i < annotations.length; i++) {
    const a = annotations[i];
    const san = a.san;
    const text = a.annotation || '';
    const idx = i + 1; // 1-based ply
    if (!san) continue;

    const expectedPiece = sanPieceWord(san);
    const expectedSquare = sanTargetSquare(san);
    const expectedFromSquare = sanFromSquareHint(san); // partial; for ambiguous SANs only

    // Arrow consistency check — flag only if NO arrow's destination
    // matches the SAN target. Several arrows may exist (threat / control
    // / plan arrows); we just need ONE pointing at the actual move's
    // destination.
    if (a.arrows && Array.isArray(a.arrows) && a.arrows.length > 0 && expectedSquare) {
      const anyMatch = a.arrows.some((ar) => ar?.to && ar.to.toLowerCase() === expectedSquare);
      if (!anyMatch) {
        findings.push({
          file, openingId, subline: sublineLabel, ply: idx, san,
          kind: 'arrow-target-missing',
          severity: 'p0',
          arrows: a.arrows.map((ar) => `${ar.from}-${ar.to}`).join(','),
          expectedSquare,
          evidence: `no arrow points to ${expectedSquare}; arrows: ${a.arrows.map(ar=>ar.from+'->'+ar.to).join(',')}`,
        });
      }
    }

    // Also scan shortNarration, plans[], alternatives[], pawnStructure
    // for the same content bug classes.
    for (const [fieldName, fieldText] of [
      ['shortNarration', a.shortNarration],
      ['pawnStructure', a.pawnStructure],
    ]) {
      if (typeof fieldText === 'string' && fieldText.trim()) {
        runContentChecks(file, openingId, sublineLabel, idx, san, expectedPiece, expectedSquare, fieldName, fieldText, findings);
      }
    }
    if (Array.isArray(a.plans)) {
      for (let pi = 0; pi < a.plans.length; pi++) {
        const p = a.plans[pi];
        if (typeof p === 'string' && p.trim()) {
          runContentChecks(file, openingId, sublineLabel, idx, san, expectedPiece, expectedSquare, `plans[${pi}]`, p, findings);
        }
      }
    }
    if (Array.isArray(a.alternatives)) {
      for (let ai = 0; ai < a.alternatives.length; ai++) {
        const v = a.alternatives[ai];
        if (typeof v === 'string' && v.trim()) {
          runContentChecks(file, openingId, sublineLabel, idx, san, expectedPiece, expectedSquare, `alternatives[${ai}]`, v, findings);
        }
      }
    }

    if (!text || !text.trim()) {
      prevText = text;
      continue;
    }

    // 1) Piece-mismatch (subject only)
    const subjectPiece = findSubjectPiece(text);
    if (subjectPiece && subjectPiece !== expectedPiece) {
      findings.push({
        file, openingId, subline: sublineLabel, ply: idx, san,
        kind: 'piece-mismatch-subject',
        severity: 'p1',
        textPiece: subjectPiece,
        expectedPiece,
        evidence: text.slice(0, 200),
      });
    }

    // 2) Square-mismatch (subject only)
    const subjectTarget = findSubjectTarget(text);
    if (subjectTarget && expectedSquare && subjectTarget !== expectedSquare) {
      findings.push({
        file, openingId, subline: sublineLabel, ply: idx, san,
        kind: 'square-mismatch-subject',
        severity: 'p1',
        textSquare: subjectTarget,
        expectedSquare,
        evidence: text.slice(0, 200),
      });
    }

    // 3) Color mismatch
    const subjectColor = findColorSubject(text);
    const actualColor = ((idx % 2) === 1) ? 'white' : 'black';
    if (subjectColor && subjectColor !== actualColor) {
      findings.push({
        file, openingId, subline: sublineLabel, ply: idx, san,
        kind: 'color-mismatch',
        severity: 'p0',
        textColor: subjectColor,
        actualColor,
        evidence: text.slice(0, 200),
      });
    }

    // 4) Qualifier mismatch (king's knight on a non-knight, etc.)
    const qual = findQualifierPiece(text);
    if (qual && qual.piece !== expectedPiece) {
      findings.push({
        file, openingId, subline: sublineLabel, ply: idx, san,
        kind: 'qualifier-mismatch',
        severity: 'p0',
        qualifier: qual.qualifier,
        qualifierPiece: qual.piece,
        expectedPiece,
        evidence: text.slice(0, 200),
      });
    }

    // 5) Cross-line drift — text mentions a named opening / sub-line
    //    that doesn't match the current openingId or sublineLabel
    const namedRefs = findNamedLineReferences(text);
    for (const ref of namedRefs) {
      const refLower = ref.toLowerCase();
      const subLower = (sublineLabel || '').toLowerCase();
      const oidLower = (openingId || '').toLowerCase().replace(/-/g, ' ');
      // Likely OK if reference is contained in current opening name or subline name
      if (subLower.includes(refLower.split(' ')[0]) || oidLower.includes(refLower.split(' ')[0])) continue;
      // Or if it's a generic family term ("Opening", "Defense", "System", "Line")
      if (/^(?:Opening|Defense|Defence|System|Line|Attack|Variation|Trap|Gambit)$/i.test(ref.replace(/^[\w-']+\s+/i, ''))) continue;
      // Possible drift: capture
      findings.push({
        file, openingId, subline: sublineLabel, ply: idx, san,
        kind: 'cross-line-drift-name',
        severity: 'p2',
        namedReference: ref,
        evidence: text.slice(0, 200),
      });
    }

    // 6) Repeated narration on consecutive plies
    if (text === prevText) {
      findings.push({
        file, openingId, subline: sublineLabel, ply: idx, san,
        kind: 'repeated-narration',
        severity: 'p1',
        evidence: text.slice(0, 200),
      });
    }
    prevText = text;
  }
}

// ─── Bundle walker ─────────────────────────────────────────────────

function scanBundle(content) {
  const findings = [];
  const doc = JSON.parse(content);
  // bundle is { openingId: [ {san, annotation, ...} ] }
  for (const [oid, arr] of Object.entries(doc)) {
    if (!Array.isArray(arr)) continue;
    walkAnnotationSequence(ANNOTATIONS_BUNDLE, oid, 'main-bundle', arr, findings);
  }
  return findings;
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('[scan] loading annotation files...');
  const files = await listAnnotationFiles();
  console.log(`[scan] ${files.length} annotation files`);
  if (ANNOTATIONS_BUNDLE) console.log(`[scan] + annotations-bundle.json`);
  else console.log(`[scan] skipping annotations-bundle.json (legacy/unused)`);

  let allFindings = [];
  let totalFiles = 0;
  let totalEntries = 0;
  for (const f of files) {
    try {
      const content = await readFile(f, 'utf-8');
      const findings = scanFile(f, content);
      allFindings.push(...findings);
      totalFiles++;
      const doc = JSON.parse(content);
      totalEntries += (doc.moveAnnotations || []).length;
      for (const s of doc.subLines || []) totalEntries += (s.moveAnnotations || []).length;
    } catch (e) {
      console.warn(`[scan] error on ${f}: ${e.message}`);
    }
  }

  // Bundle (legacy, off by default)
  if (ANNOTATIONS_BUNDLE) {
    try {
      const bundle = await readFile(ANNOTATIONS_BUNDLE, 'utf-8');
      const findings = scanBundle(bundle);
      allFindings.push(...findings);
      const doc = JSON.parse(bundle);
      for (const arr of Object.values(doc)) if (Array.isArray(arr)) totalEntries += arr.length;
      totalFiles++;
    } catch (e) {
      console.warn(`[scan] bundle scan error: ${e.message}`);
    }
  }

  // Sort by file then ply
  allFindings.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.subline !== b.subline) return (a.subline || '').localeCompare(b.subline || '');
    return a.ply - b.ply;
  });

  const byKind = {};
  for (const f of allFindings) byKind[f.kind] = (byKind[f.kind] || 0) + 1;

  console.log('');
  console.log(`[scan] ${totalFiles} files scanned, ${totalEntries} annotation entries`);
  console.log(`[scan] ${allFindings.length} findings total`);
  for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    console.log(`         ${k}: ${v}`);
  }

  await writeFile(OUT_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalFiles,
    totalEntries,
    totalFindings: allFindings.length,
    byKind,
    findings: allFindings,
  }, null, 2));
  console.log(`[scan] wrote ${OUT_PATH}`);
}

main().catch((err) => { console.error('[scan] fatal:', err); process.exit(1); });
