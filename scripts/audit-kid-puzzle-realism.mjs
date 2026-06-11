#!/usr/bin/env node
// scripts/audit-kid-puzzle-realism.mjs
// ----------------------------------------------------------------------
// REALISM / CONTINUITY validator for the hand-authored kid puzzles
// (journeyChapters + fairyTaleChapters). The structural validator
// (audit-kid-puzzles-static.mjs) only proves FEN + solution legality.
// David hit puzzles that were LEGAL but nonsensical:
//   - a "play the pin" puzzle where the opponent was ALREADY in check
//     at the start (an illegal/illogical setup), and
//   - a "give check" puzzle where MANY moves give check but only one
//     square is accepted as the answer (ambiguous solution).
// This validator catches exactly those classes:
//   1. ILLEGAL SETUP   — the side NOT to move is already in check.
//   2. AMBIGUOUS MATE  — the solution mates, but >1 legal move mates.
//   3. AMBIGUOUS CHECK — the solution is a (check-themed) check, but
//                        more than one legal move gives check.
//   4. AMBIGUOUS WIN   — the solution wins material, but another move
//                        wins at least as much (only when the goal is
//                        "capture/win", inferred from the hint).
//   5. GOAL MISMATCH   — the hint promises mate/check/capture/promote
//                        but the solution doesn't deliver it.
//
// Reports only (does not gate) — run to gather evidence, fix the data,
// then re-run to confirm clean.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const findings = [];
function flag(kind, id, msg) { findings.push({ kind, id, msg }); }

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function oppKingSquare(chess, oppColor) {
  for (const row of chess.board()) {
    for (const sq of row) {
      if (sq && sq.type === 'k' && sq.color === oppColor) return sq.square;
    }
  }
  return null;
}

// Crude material delta for the side to move after a move sequence's
// first move (captures only — enough to compare "winning" alternatives).
function captureValue(move) {
  return move.captured ? PIECE_VALUE[move.captured] : 0;
}

function auditPuzzle(label, chId, p) {
  const id = `${label}/${chId}/${p.id}`;
  const sol = Array.isArray(p.solution) ? p.solution[0] : p.solution;
  if (typeof p.fen !== 'string' || typeof sol !== 'string') return;
  // Moves the puzzle explicitly accepts as correct (solution[0] +
  // any altSolutions). Extra checks/mates among these are intentional,
  // not ambiguity bugs.
  const accepted = new Set([sol, ...(p.altSolutions ?? [])]);

  let base;
  try { base = new Chess(p.fen); } catch { return; }
  const turn = base.turn();
  const opp = turn === 'w' ? 'b' : 'w';

  // 1. ILLEGAL SETUP — opponent (side not to move) already in check.
  const oppK = oppKingSquare(base, opp);
  if (oppK && base.isAttacked(oppK, turn)) {
    flag('ILLEGAL_SETUP', id, `side-not-to-move (${opp}) is already in check at start — illegal/illogical position`);
  }

  // Apply the solution.
  let solChess, solMove;
  try { solChess = new Chess(p.fen); solMove = solChess.move(sol); }
  catch { return; }
  if (!solMove) return;
  const solMates = solChess.isCheckmate();
  const solChecks = solChess.isCheck();

  // Enumerate every legal move; classify.
  const legal = base.moves({ verbose: true });
  const mateMoves = [];
  const checkMoves = [];
  let bestCapture = 0;
  const bestCaptureMoves = [];
  for (const mv of legal) {
    const t = new Chess(p.fen);
    t.move(mv.san);
    if (t.isCheckmate()) mateMoves.push(mv.san);
    else if (t.isCheck()) checkMoves.push(mv.san);
    const cv = captureValue(mv);
    if (cv > bestCapture) { bestCapture = cv; bestCaptureMoves.length = 0; bestCaptureMoves.push(mv.san); }
    else if (cv === bestCapture && cv > 0) bestCaptureMoves.push(mv.san);
  }
  const totalCheckingMoves = mateMoves.length + checkMoves.length;

  const hint = `${p.hint ?? ''} ${p.successMessage ?? ''}`.toLowerCase();
  const wantsMate = /checkmate|deliver mate|\bmate\b/.test(hint);
  // "give/deliver check", "check the king" — ACTIVE checking goals only.
  // "the king is being attacked" / "escaped check" describe being IN
  // check (escape puzzles) and must NOT expect the solution to check.
  const wantsCheck = /(give|deliver|with)\s+check|check the (king|enemy)/.test(hint) && !wantsMate;
  const mentionsCheck = /\bcheck\b/.test(hint) && !/being attacked|in check|escape|out of check/.test(hint);
  // "captures" / "takes the rook" — a real capture goal. Excludes
  // metaphors like "takes aim" (no article after "takes").
  const wantsCapture = /\bcaptur/.test(hint) || /\btakes?\s+(the|a|an|his|her|its|that)\b/.test(hint);
  const wantsPromote = /promot|becomes? a queen/.test(hint);

  // Helper — checking/mating moves that AREN'T explicitly accepted.
  const extraMates = mateMoves.filter((m) => !accepted.has(m));
  const extraChecks = [...mateMoves, ...checkMoves].filter((m) => !accepted.has(m));

  // 2. AMBIGUOUS MATE — another move mates that the puzzle doesn't accept.
  if (solMates && extraMates.length > 0) {
    flag('AMBIGUOUS_MATE', id, `solution '${sol}' mates, but these unaccepted moves also mate: ${extraMates.join(', ')}`);
  }
  // 3. AMBIGUOUS CHECK — a pure (non-capturing) "give check" puzzle where
  // another, unaccepted move also gives check.
  if (!solMates && solChecks && !solMove.captured && (wantsCheck || mentionsCheck) && extraChecks.length > 0) {
    flag('AMBIGUOUS_CHECK', id, `solution '${sol}' gives check, but these unaccepted moves also give check: ${extraChecks.join(', ')}`);
  }
  // 4. AMBIGUOUS WIN — a "capture/win" puzzle (not a mate) where another
  // capture wins at least as much material.
  if (!solMates && wantsCapture && captureValue(solMove) > 0 && bestCaptureMoves.length > 1) {
    const others = bestCaptureMoves.filter((m) => !accepted.has(m));
    if (captureValue(solMove) <= bestCapture && others.length > 0) {
      flag('AMBIGUOUS_WIN', id, `solution '${sol}' wins ${captureValue(solMove)}, but other captures win as much: ${others.join(', ')}`);
    }
  }
  // 5. GOAL MISMATCH
  if (wantsMate && !solMates) flag('GOAL_MISMATCH', id, `hint promises checkmate but '${sol}' doesn't mate`);
  if (wantsCheck && !solChecks && !solMates) flag('GOAL_MISMATCH', id, `hint says give check but '${sol}' gives no check`);
  if (wantsPromote && !solMove.promotion) flag('GOAL_MISMATCH', id, `hint mentions promotion but '${sol}' isn't a promotion`);
  if (wantsCapture && !solMove.captured) flag('GOAL_MISMATCH', id, `hint mentions capture but '${sol}' captures nothing`);
}

async function run() {
  for (const [path, label, exportName] of [
    ['src/data/journeyChapters.ts', 'journey', 'JOURNEY_CHAPTERS'],
    ['src/data/fairyTaleChapters.ts', 'fairyTale', 'FAIRY_TALE_CHAPTERS'],
  ]) {
    const mod = await import(resolve(ROOT, path));
    const chapters = mod[exportName];
    let count = 0;
    for (const ch of chapters) {
      for (const p of (ch.puzzles ?? [])) { auditPuzzle(label, ch.id, p); count++; }
    }
    console.log(`  ${label}: audited ${count} puzzles across ${chapters.length} chapters`);
  }

  console.log(`\n  total findings: ${findings.length}\n`);
  const byKind = {};
  for (const f of findings) { (byKind[f.kind] ??= []).push(f); }
  for (const [kind, list] of Object.entries(byKind)) {
    console.log(`  ── ${kind} (${list.length}) ──`);
    for (const f of list) console.log(`    ${f.id}: ${f.msg}`);
    console.log('');
  }
  if (findings.length > 0) {
    console.log('FAIL — fix the puzzles above (illegal setup / ambiguous / goal mismatch).');
    process.exit(1);
  }
  console.log('OK — every hand-authored kid puzzle is legal and unambiguous.');
}

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
