/**
 * Validation harness for WalkthroughTree data files.
 *
 * Articulates the "what makes a good opening walkthrough" rules into
 * automated checks. Encoded so any LLM (or human) producing a new
 * opening can verify their work via:
 *
 *   const issues = validateWalkthroughTree(MY_OPENING);
 *   const errors = issues.filter(i => i.severity === 'error');
 *   if (errors.length > 0) <fail>;
 *
 * What this does NOT cover:
 *   - Move QUALITY (engine-level "is this the best move?"). That's
 *     in `auditMoveQuality.ts`, which runs Stockfish in Node and is
 *     too slow for the regular test suite.
 *   - Move LEGALITY (does chess.js accept the SAN from the parent
 *     position?). That's already in `vienna.test.ts` and runs in
 *     the regular test suite — kept separate for historical reasons.
 *
 * What this DOES cover:
 *   - Tree-level fields are present (openingName, eco, intro, outro)
 *   - Every non-root node has a non-empty idea
 *   - Every node's idea references its SAN or the spoken form (e.g.
 *     "Nc3" or "knight to c3")
 *   - Branch points (children > 1) require label + forkSubtitle on
 *     every child
 *   - If narration is present: segments are non-empty, arrow/highlight
 *     squares are valid algebraic notation
 *   - leafOutros keys correspond to real leaf paths
 *   - Word count sanity (idea ~20-300 words; warns outside)
 */
import type {
  WalkthroughTree,
  WalkthroughTreeNode,
  NarrationSegment,
} from '../../types/walkthroughTree';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  /** Tree path to the offending node, joined with the SAN moves. */
  path: string[];
  message: string;
}

const SQUARE_RE = /^[a-h][1-8]$/;
const PIECE_NAMES: Record<string, string> = {
  N: 'knight',
  B: 'bishop',
  R: 'rook',
  Q: 'queen',
  K: 'king',
};

/** Convert SAN to its spoken form so we can check the prose mentions
 *  the move. "Nc3" → "knight to c3", "Bxd5" → "bishop to d5" (the
 *  capture marker doesn't change the spoken square), "O-O" stays
 *  "O-O" (we expect the literal castle notation OR "castle"/"castles"
 *  in prose, handled in the check itself). */
export function spokenForm(san: string): string {
  if (san === 'O-O' || san === 'O-O-O') return san;
  const first = san[0];
  if (first in PIECE_NAMES) {
    const rest = san.slice(1);
    const destMatch = rest.match(/[a-h][1-8]/g);
    if (destMatch && destMatch.length > 0) {
      return `${PIECE_NAMES[first]} to ${destMatch[destMatch.length - 1]}`;
    }
  }
  // Pawn move — the SAN itself is just the destination square (e.g.
  // "e4") or "exd5" for capture. Just return it.
  return san;
}

/** Does the prose mention this SAN or its spoken form? Lowercase
 *  comparison; tolerates the prose using either notation. Castle
 *  moves are recognized via "castle"/"castles"/"castling" or the
 *  literal "O-O". */
function ideaMentionsSan(idea: string, san: string): boolean {
  const lower = idea.toLowerCase();
  if (san === 'O-O' || san === 'O-O-O') {
    return /\bcastle/.test(lower) || lower.includes(san.toLowerCase());
  }
  if (lower.includes(san.toLowerCase())) return true;
  if (lower.includes(spokenForm(san).toLowerCase())) return true;
  // For pawn moves like "e4" — also accept "e-pawn" or "to e4".
  if (/^[a-h][1-8]$/.test(san)) {
    if (lower.includes(`to ${san.toLowerCase()}`)) return true;
    if (lower.includes(`-${san[0]}${san[1]}`)) return true;
  }
  return false;
}

function isValidSquare(sq: string): boolean {
  return SQUARE_RE.test(sq);
}

/** Walk the tree depth-first, collecting issues. */
function walkTree(
  node: WalkthroughTreeNode,
  pathSans: string[],
  issues: ValidationIssue[],
): void {
  // Non-root nodes have content rules.
  if (node.san !== null) {
    const here = [...pathSans, node.san];

    // Idea must be non-empty.
    if (!node.idea.trim()) {
      issues.push({
        severity: 'error',
        path: here,
        message: `node has empty idea`,
      });
    } else {
      // Idea should mention the move played.
      if (!ideaMentionsSan(node.idea, node.san)) {
        issues.push({
          severity: 'warning',
          path: here,
          message: `idea does not mention "${node.san}" or its spoken form ("${spokenForm(node.san)}")`,
        });
      }
      // Word count sanity.
      const words = node.idea.trim().split(/\s+/).length;
      if (words < 15) {
        issues.push({
          severity: 'warning',
          path: here,
          message: `idea is short (${words} words); aim for ~30-200`,
        });
      } else if (words > 300) {
        issues.push({
          severity: 'warning',
          path: here,
          message: `idea is long (${words} words); aim for ~30-200`,
        });
      }
    }

    // Narration segments.
    if (node.narration !== undefined) {
      validateNarration(node.narration, here, issues);
    }
  }

  // Branch-point rules.
  if (node.children.length > 1) {
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      const branchPath = [...pathSans, node.san ?? '(root)'];
      if (!child.label || !child.label.trim()) {
        issues.push({
          severity: 'error',
          path: branchPath,
          message: `branch child #${i} missing label`,
        });
      }
      if (!child.forkSubtitle || !child.forkSubtitle.trim()) {
        issues.push({
          severity: 'error',
          path: branchPath,
          message: `branch child #${i} missing forkSubtitle`,
        });
      }
    }
  }

  // Recurse.
  for (const child of node.children) {
    const childPath = node.san === null ? pathSans : [...pathSans, node.san];
    walkTree(child.node, childPath, issues);
  }
}

function validateNarration(
  segments: NarrationSegment[],
  pathSans: string[],
  issues: ValidationIssue[],
): void {
  if (segments.length === 0) {
    issues.push({
      severity: 'error',
      path: pathSans,
      message: `narration is an empty array (omit the field instead)`,
    });
    return;
  }
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    if (!seg.text.trim()) {
      issues.push({
        severity: 'error',
        path: pathSans,
        message: `narration segment #${i} text is empty`,
      });
    }
    if (seg.arrows) {
      for (let j = 0; j < seg.arrows.length; j += 1) {
        const arr = seg.arrows[j];
        if (!isValidSquare(arr.from)) {
          issues.push({
            severity: 'error',
            path: pathSans,
            message: `narration[${i}].arrows[${j}].from "${arr.from}" is not valid algebraic`,
          });
        }
        if (!isValidSquare(arr.to)) {
          issues.push({
            severity: 'error',
            path: pathSans,
            message: `narration[${i}].arrows[${j}].to "${arr.to}" is not valid algebraic`,
          });
        }
        if (arr.from === arr.to) {
          issues.push({
            severity: 'error',
            path: pathSans,
            message: `narration[${i}].arrows[${j}] has from===to (${arr.from})`,
          });
        }
      }
    }
    if (seg.highlights) {
      for (let j = 0; j < seg.highlights.length; j += 1) {
        const hl = seg.highlights[j];
        if (!isValidSquare(hl.square)) {
          issues.push({
            severity: 'error',
            path: pathSans,
            message: `narration[${i}].highlights[${j}].square "${hl.square}" is not valid algebraic`,
          });
        }
      }
    }
  }
}

function collectLeafPaths(
  node: WalkthroughTreeNode,
  pathSans: string[],
): Set<string> {
  const result = new Set<string>();
  // The path that reaches THIS node (including its own SAN, except
  // for the root which has san: null).
  const here = node.san === null ? pathSans : [...pathSans, node.san];
  if (node.children.length === 0) {
    result.add(here.join(' '));
    return result;
  }
  for (const child of node.children) {
    for (const p of collectLeafPaths(child.node, here)) {
      result.add(p);
    }
  }
  return result;
}

/** Run all structural + style validation rules against a tree. */
export function validateWalkthroughTree(
  tree: WalkthroughTree,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Tree-level fields.
  if (!tree.openingName.trim()) {
    issues.push({
      severity: 'error',
      path: [],
      message: 'openingName is empty',
    });
  }
  if (!tree.eco.trim()) {
    issues.push({ severity: 'error', path: [], message: 'eco is empty' });
  }
  if (!tree.intro.trim()) {
    issues.push({ severity: 'warning', path: [], message: 'intro is empty' });
  }
  if (!tree.outro.trim()) {
    issues.push({ severity: 'warning', path: [], message: 'outro is empty' });
  }

  // Walk the tree.
  walkTree(tree.root, [], issues);

  // leafOutros keys must correspond to real leaf paths.
  if (tree.leafOutros) {
    const leafPaths = collectLeafPaths(tree.root, []);
    for (const key of Object.keys(tree.leafOutros)) {
      if (!leafPaths.has(key)) {
        issues.push({
          severity: 'error',
          path: [key],
          message: `leafOutros key "${key}" does not match any leaf path in the tree`,
        });
      }
    }
  }

  return issues;
}

/** Pretty-print issues for console output. */
export function formatIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) return 'No issues.';
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const lines: string[] = [];
  lines.push(`${errors.length} errors, ${warnings.length} warnings`);
  for (const issue of issues) {
    const prefix = issue.severity === 'error' ? 'ERROR' : 'warn ';
    const path = issue.path.length === 0 ? '<root>' : issue.path.join(' ');
    lines.push(`  [${prefix}] ${path}: ${issue.message}`);
  }
  return lines.join('\n');
}
